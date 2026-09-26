"""Cobro mensual recurrente: fechas, reintentos, idempotencia y validación del
resultado de Wompi (con una base simulada que respeta 'solo desde pendiente')."""
from datetime import date
from unittest.mock import patch

import pytest

from backend.services import cobro_recurrente_service as c


# ── Fechas ──────────────────────────────────────────────────────────────────

@pytest.mark.parametrize("periodo,ancla,esperado", [
    (date(2026, 1, 31), 31, date(2026, 2, 28)),
    (date(2028, 1, 31), 31, date(2028, 2, 29)),   # bisiesto
    (date(2026, 2, 28), 31, date(2026, 3, 31)),   # vuelve al ancla
    (date(2026, 4, 30), 30, date(2026, 5, 30)),
    (date(2026, 12, 15), 15, date(2027, 1, 15)),  # cambio de año
    (date(2026, 9, 29), 29, date(2026, 10, 29)),
])
def test_siguiente_fecha(periodo, ancla, esperado):
    assert c.siguiente_fecha(periodo, ancla) == esperado


def test_calendario_de_reintentos_del_fundador():
    p = date(2026, 10, 10)
    assert [c.fecha_reintento(p, n) for n in (1, 2, 3)] == [date(2026, 10, 11), date(2026, 10, 13), date(2026, 10, 15)]
    assert c.fecha_reintento(p, 4) is None
    assert c.DIAS_GRACIA == 7 and c.MAX_INTENTOS == 4


# ── Base simulada para aplicar_resultado ────────────────────────────────────

class FakeCursor:
    def __init__(self, db):
        self.db, self.rowcount, self._res = db, 0, None

    def execute(self, sql, params=()):
        s = " ".join(sql.split())
        cobro = self.db["cobro"]
        self.rowcount = 0
        if s.startswith("SELECT c.id"):
            self._res = None if params[0] != cobro["reference"] else (
                1, "emp-1", cobro["periodo"], cobro["intento"], cobro["monto"], cobro["estado"],
                cobro["tx"], cobro["ambiente"], 31, "Taller Uno", "admin@taller.test")
        elif s.startswith("UPDATE cobros_recurrentes SET transaction_id"):
            if cobro["tx"] is None:
                cobro["tx"] = params[0]
        elif s.startswith("UPDATE cobros_recurrentes SET estado = 'aprobado'"):
            if cobro["estado"] == "pendiente":
                cobro["estado"], self.rowcount = "aprobado", 1
        elif s.startswith("UPDATE cobros_recurrentes SET estado = 'fallido'"):
            if cobro["estado"] == "pendiente":
                cobro["estado"], self.rowcount = "fallido", 1
                self.db["fallidos"] += 1
        elif s.startswith("UPDATE cobros_recurrentes SET estado = 'revision_manual'"):
            if cobro["estado"] == "pendiente":
                cobro["estado"], self.rowcount = "revision_manual", 1
        elif s.startswith("SELECT count(*) FROM cobros_recurrentes"):
            self._res = (self.db["fallidos"],)
        elif s.startswith("UPDATE suscripciones_wompi"):
            self.db["subs_updates"].append(params)
        elif s.startswith("INSERT INTO metricas.pagos_excluidos"):
            self.db["excluidos"].append(params[0])

    def fetchone(self):
        return self._res

    def close(self):
        pass


class FakeConn:
    def __init__(self, **cobro):
        self.db = {"cobro": {"reference": "REC-abc", "periodo": date(2026, 10, 31), "intento": 1, "monto": 375000,
                             "estado": "pendiente", "tx": None, "ambiente": "produccion", **cobro},
                   "fallidos": 0, "subs_updates": [], "excluidos": []}

    def cursor(self):
        return FakeCursor(self.db)


CENTS = 37500000


def test_aprobado_avanza_al_mes_siguiente_con_ancla():
    conn = FakeConn()
    ev = c.aplicar_resultado(conn, "REC-abc", "tx1", "APPROVED", CENTS, "COP")
    assert ev["tipo"] == "aprobado" and conn.db["cobro"]["estado"] == "aprobado"
    assert conn.db["subs_updates"][-1][0] == date(2026, 11, 30)  # ancla 31 → 30 de noviembre


def test_webhook_repetido_no_hace_nada_la_segunda_vez():
    conn = FakeConn()
    c.aplicar_resultado(conn, "REC-abc", "tx1", "APPROVED", CENTS, "COP")
    assert c.aplicar_resultado(conn, "REC-abc", "tx1", "APPROVED", CENTS, "COP") is None
    assert len(conn.db["subs_updates"]) == 1


def test_rechazo_tardio_no_revierte_un_mes_aprobado():
    conn = FakeConn()
    c.aplicar_resultado(conn, "REC-abc", "tx1", "APPROVED", CENTS, "COP")
    assert c.aplicar_resultado(conn, "REC-abc", "tx1", "DECLINED", CENTS, "COP") is None
    assert conn.db["cobro"]["estado"] == "aprobado"


def test_transaction_id_distinto_se_ignora():
    conn = FakeConn(tx="tx-original")
    assert c.aplicar_resultado(conn, "REC-abc", "tx-falso", "APPROVED", CENTS, "COP") is None
    assert conn.db["cobro"]["estado"] == "pendiente"


@pytest.mark.parametrize("monto,moneda", [(CENTS - 100, "COP"), (None, "COP"), (CENTS, "USD"), (CENTS, None)])
def test_monto_o_moneda_invalidos_van_a_revision_sin_avanzar_fecha(monto, moneda):
    conn = FakeConn()
    ev = c.aplicar_resultado(conn, "REC-abc", "tx1", "APPROVED", monto, moneda)
    assert ev["tipo"] == "revision_manual" and conn.db["subs_updates"] == []


def test_rechazo_programa_reintento_y_mora():
    conn = FakeConn()
    ev = c.aplicar_resultado(conn, "REC-abc", "tx1", "DECLINED", CENTS, "COP")
    assert ev["tipo"] == "fallido" and ev["reintento"] == "2026-11-01"
    periodo, reintento, _ = conn.db["subs_updates"][-1]
    assert periodo == date(2026, 10, 31) and reintento == date(2026, 11, 1)


def test_pending_no_cambia_estado():
    conn = FakeConn()
    assert c.aplicar_resultado(conn, "REC-abc", "tx1", "PENDING", None, None) is None
    assert conn.db["cobro"]["estado"] == "pendiente" and conn.db["cobro"]["tx"] == "tx1"


def test_referencia_desconocida():
    assert c.aplicar_resultado(FakeConn(), "REC-otra", "tx1", "APPROVED", CENTS, "COP") is None


def test_sandbox_se_excluye_de_metricas():
    conn = FakeConn(ambiente="sandbox")
    c.aplicar_resultado(conn, "REC-abc", "tx1", "APPROVED", CENTS, "COP")
    assert conn.db["excluidos"] == ["tx1"]


# ── Cron: interruptor y "nunca reintentar en caliente" ──────────────────────

def test_interruptor_apagado_no_hace_nada():
    with patch.object(c, "activo", return_value=False), patch.object(c, "cobrar_vencidas") as cobrar:
        assert c.ejecutar_cron(object())["activo"] is False
    cobrar.assert_not_called()


def test_timeout_de_wompi_deja_pendiente_sin_reintentar():
    reclamos = iter([{"reference": "REC-1", "monto": 150000, "ps_id": "ps", "email": "a@b.test",
                      "empresa_id": "e", "empresa": "T", "periodo": "2026-10-01"}, None])
    with patch.object(c, "_reclamar_siguiente", side_effect=lambda conn: next(reclamos)), \
         patch.object(c.wompi_service, "cobrar_con_payment_source", side_effect=TimeoutError) as cobrar, \
         patch.object(c, "aplicar_resultado") as aplicar, patch.object(c, "dry_run", return_value=False):
        eventos = []
        c.cobrar_vencidas(object(), eventos)
    assert cobrar.call_count == 1 and aplicar.call_count == 0 and eventos == []


def test_dry_run_no_llama_a_wompi():
    reclamos = iter([{"reference": "REC-1", "monto": 150000, "ps_id": "ps", "email": "a@b.test",
                      "empresa_id": "e", "empresa": "T", "periodo": "2026-10-01"}, None])
    with patch.object(c, "_reclamar_siguiente", side_effect=lambda conn: next(reclamos)), \
         patch.object(c.wompi_service, "cobrar_con_payment_source") as cobrar, patch.object(c, "dry_run", return_value=True):
        eventos = []
        c.cobrar_vencidas(object(), eventos)
    cobrar.assert_not_called()
    assert eventos[0]["tipo"] == "dry_run"


def test_texto_de_aviso_marca_sandbox():
    titulo, _ = c.texto_evento({"tipo": "aprobado", "empresa": "T", "monto": 150000, "periodo": "2026-10-01",
                                "ambiente": "sandbox"})
    assert "PRUEBA" in titulo


def test_aprobado_sin_transaction_id_no_avanza():
    conn = FakeConn()
    assert c.aplicar_resultado(conn, "REC-abc", None, "APPROVED", CENTS, "COP") is None
    assert conn.db["subs_updates"] == [] and conn.db["cobro"]["estado"] == "pendiente"


def test_carrera_entre_crons_no_genera_aviso_falso():
    reclamos = iter([{"omitido": True, "silencioso": True, "empresa_id": "e", "empresa": "T"}, None])
    with patch.object(c, "_reclamar_siguiente", side_effect=lambda conn: next(reclamos)):
        eventos = []
        c.cobrar_vencidas(object(), eventos)
    assert eventos == []


def test_dry_run_no_envia_avisos_previos():
    with patch.object(c, "dry_run", return_value=True):
        assert c.avisos_previos(object()) == []


def test_aviso_aprobado_incluye_proximo_cobro():
    conn = FakeConn()
    ev = c.aplicar_resultado(conn, "REC-abc", "tx1", "APPROVED", CENTS, "COP")
    assert ev["proximo_cobro"] == "2026-11-30"
    _, texto = c.texto_evento(ev)
    assert "Próximo cobro: 2026-11-30" in texto
