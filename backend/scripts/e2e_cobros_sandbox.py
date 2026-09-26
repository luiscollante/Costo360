"""Prueba de punta a punta del cobro mensual en SANDBOX de Wompi, sobre una
empresa de prueba nueva (aprobado por el fundador 2026-09-26).

Fases (argumento): preparar | aprobado | rechazado | limpiar
Guarda los ids creados en e2e_estado.json para limpiar SOLO por id exacto.
"""
import json
import os
import sys
import threading
import time
import uuid
from datetime import timedelta
from pathlib import Path

import httpx
from dotenv import load_dotenv

load_dotenv("backend/.env")
from backend.db.client import get_engine  # noqa: E402
from backend.services import cobro_recurrente_service as c, wompi_service as w  # noqa: E402

ESTADO = Path(__file__).with_name("e2e_estado.json")
assert os.environ["WOMPI_PUBLIC_KEY"].startswith("pub_test_"), "SOLO en sandbox"


def conn():
    return get_engine().raw_connection()


def q(sql, params=(), commit=True, fetch=True):
    cn = conn()
    try:
        cur = cn.cursor()
        cur.execute(sql, params)
        out = cur.fetchall() if fetch and cur.description else None
        if commit:
            cn.commit()
        return out
    finally:
        cn.close()


def estado():
    return json.loads(ESTADO.read_text()) if ESTADO.exists() else {}


def guardar(d):
    ESTADO.write_text(json.dumps(d, indent=2))


def payment_source(numero: str, email: str) -> str:
    pub = os.environ["WOMPI_PUBLIC_KEY"]
    base = w._base()
    merchant = httpx.get(f"{base}/merchants/{pub}", timeout=15).json()["data"]
    acept = merchant["presigned_acceptance"]["acceptance_token"]
    personal = merchant["presigned_personal_data_auth"]["acceptance_token"]
    tok = httpx.post(f"{base}/tokens/cards", headers={"Authorization": f"Bearer {pub}"}, timeout=15, json={
        "number": numero, "cvc": "123", "exp_month": "12", "exp_year": "29", "card_holder": "Prueba Cobros"}).json()
    return w.crear_payment_source(tok["data"]["id"], email, acept, personal)["id"]


def preparar():
    d = estado()
    assert not d, "ya existe una prueba preparada; limpia primero"
    email = f"prueba-cobros-{uuid.uuid4().hex[:6]}@costo360.test"
    r = httpx.post(os.environ["SUPABASE_URL"].rstrip("/") + "/auth/v1/admin/users", timeout=15,
                   headers={"apikey": os.environ["SUPABASE_SERVICE_ROLE_KEY"],
                            "Authorization": "Bearer " + os.environ["SUPABASE_SERVICE_ROLE_KEY"]},
                   json={"email": email, "email_confirm": True, "password": uuid.uuid4().hex + "Aa1!"})
    r.raise_for_status()
    user_id = r.json()["id"]
    empresa_id = q("INSERT INTO empresas (nombre, plan_codigo, activa) VALUES ('PRUEBA COBROS', 'starter', true) RETURNING id")[0][0]
    d = {"user_id": user_id, "empresa_id": str(empresa_id), "email": email}
    guardar(d)
    q("INSERT INTO usuarios (id, empresa_id, rol_codigo, nombre_completo) VALUES (%s, %s, 'admin', 'Prueba Cobros')",
      (user_id, empresa_id), fetch=False)
    q("INSERT INTO metricas.empresas_excluidas (empresa_id, motivo) VALUES (%s, 'Prueba e2e de cobros')", (empresa_id,), fetch=False)
    ps = payment_source("4242424242424242", email)
    d["ps_ok"] = ps
    guardar(d)
    hoy = c.hoy_bogota()
    q("INSERT INTO suscripciones_wompi (empresa_id, plan_codigo, payment_source_id, proxima_fecha_cobro, dia_ancla, ambiente) "
      "VALUES (%s, 'starter', %s, %s, %s, 'sandbox')", (empresa_id, ps, hoy, hoy.day), fetch=False)
    print("preparado:", {k: v for k, v in d.items() if k != "ps_ok"})


def interruptor(valor: bool):
    q("UPDATE config_sistema SET valor = %s::jsonb, actualizado_en = now() WHERE clave = 'cobros_recurrentes_activos'",
      (json.dumps(valor),), fetch=False)


def correr_cron():
    cn = conn()
    try:
        return c.ejecutar_cron(cn)
    finally:
        cn.close()


def cobros(empresa_id):
    return q("SELECT periodo, intento, estado, estado_wompi, transaction_id IS NOT NULL, monto_cop FROM cobros_recurrentes "
             "WHERE empresa_id = %s ORDER BY id", (empresa_id,))


def sub(empresa_id):
    return q("SELECT estado, proxima_fecha_cobro, proximo_reintento, en_mora_desde FROM suscripciones_wompi WHERE empresa_id = %s",
             (empresa_id,))[0]


def esperar_resuelto(empresa_id, segundos=90):
    fin = time.time() + segundos
    while time.time() < fin:
        filas = cobros(empresa_id)
        if filas and filas[-1][2] != "pendiente":
            return filas
        time.sleep(5)
    return cobros(empresa_id)


def aprobado():
    d = estado()
    e = d["empresa_id"]
    interruptor(True)
    try:
        # Dos crons A LA VEZ: debe salir exactamente un cobro.
        resultados = []
        hilos = [threading.Thread(target=lambda: resultados.append(correr_cron())) for _ in range(2)]
        [h.start() for h in hilos]
        [h.join() for h in hilos]
        print("crons concurrentes:", [(r.get("cobros_intentados"), [x.get("tipo") for x in r["eventos"]]) for r in resultados])
        print("cobros tras 2 crons:", cobros(e))
        print("resultado (webhook o respuesta inmediata):", esperar_resuelto(e))
        print("tercer cron (no debe cobrar):", correr_cron()["cobros_intentados"], cobros(e))
        print("suscripción:", sub(e))
    finally:
        interruptor(False)


def rechazado():
    d = estado()
    e = d["empresa_id"]
    ps = payment_source("4111111111111111", d["email"])
    ayer = c.hoy_bogota() - timedelta(days=1)
    q("UPDATE suscripciones_wompi SET payment_source_id = %s, proxima_fecha_cobro = %s, estado = 'activa', "
      "proximo_reintento = NULL, en_mora_desde = NULL WHERE empresa_id = %s", (ps, ayer, e), fetch=False)
    interruptor(True)
    try:
        correr_cron()
        print("intento 1:", esperar_resuelto(e)[-1], sub(e))
        # proximo_reintento = ayer + 1 = hoy → el cron reintenta hoy mismo
        correr_cron()
        print("intento 2:", esperar_resuelto(e)[-1], sub(e))
        # Simula el día 7 de mora → suspensión
        q("UPDATE suscripciones_wompi SET en_mora_desde = %s WHERE empresa_id = %s", (c.hoy_bogota() - timedelta(days=7), e), fetch=False)
        r = correr_cron()
        print("suspensión:", [x.get("tipo") for x in r["eventos"]], sub(e))
    finally:
        interruptor(False)


def limpiar():
    d = estado()
    if not d:
        print("nada que limpiar")
        return
    e = d["empresa_id"]
    interruptor(False)
    tx = [r[0] for r in q("SELECT transaction_id FROM cobros_recurrentes WHERE empresa_id = %s AND transaction_id IS NOT NULL", (e,))]
    n = q("SELECT count(*) FROM empresas WHERE id = %s AND nombre = 'PRUEBA COBROS'", (e,))[0][0]
    assert n == 1, "la empresa de prueba no coincide; no se borra nada"
    for sql in ("DELETE FROM cobros_recurrentes WHERE empresa_id = %s",
                "DELETE FROM suscripciones_wompi WHERE empresa_id = %s",
                "DELETE FROM metricas.empresas_excluidas WHERE empresa_id = %s",
                "DELETE FROM eventos_empresa WHERE empresa_id = %s",
                "DELETE FROM usuarios WHERE empresa_id = %s",
                "DELETE FROM empresas WHERE id = %s AND nombre = 'PRUEBA COBROS'"):
        q(sql, (e,), fetch=False)
    for t in tx:
        q("DELETE FROM metricas.pagos_excluidos WHERE transaction_id = %s", (t,), fetch=False)
    httpx.delete(os.environ["SUPABASE_URL"].rstrip("/") + f"/auth/v1/admin/users/{d['user_id']}", timeout=15,
                 headers={"apikey": os.environ["SUPABASE_SERVICE_ROLE_KEY"],
                          "Authorization": "Bearer " + os.environ["SUPABASE_SERVICE_ROLE_KEY"]}).raise_for_status()
    ESTADO.unlink()
    print("limpio; interruptor:", q("SELECT valor FROM config_sistema WHERE clave='cobros_recurrentes_activos'")[0][0])


if __name__ == "__main__":
    {"preparar": preparar, "aprobado": aprobado, "rechazado": rechazado, "limpiar": limpiar}[sys.argv[1]]()
