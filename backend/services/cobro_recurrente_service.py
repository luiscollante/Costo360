"""
Cobro mensual recurrente con Wompi (ciclo /goal 2026-09-26).

Principio central: NUNCA cobrar dos veces el mismo mes.
  1. El cobro se registra (estado 'pendiente', reference REC-<uuid4>) y se
     COMITEA antes de llamar a Wompi. El índice único parcial de 0019 impide
     un segundo cobro vivo del mismo (empresa, periodo).
  2. Si la llamada a Wompi falla o se corta, el cobro queda 'pendiente' y
     NUNCA se reintenta en caliente: la conciliación le pregunta a Wompi por
     esa referencia exacta.
  3. Un cobro solo cambia de estado desde 'pendiente' (UPDATE ... WHERE
     estado='pendiente'), así un aviso tardío o repetido nunca revierte ni
     duplica nada.
  4. Aprobar exige monto exacto, moneda COP y que el transaction_id coincida.

Reglas del fundador: reintentos +1/+3/+5 días del periodo; suspensión al día
7 de mora (solo lectura, Etapa 2); reactivar paga el mes vencido y conserva
el día ancla. Todo "hoy" en hora Colombia. Todas las funciones reciben una
conexión `db_service` (postgres): ni la app ni los usuarios escriben aquí.
"""
import calendar
import json
import logging
import os
import time
import uuid
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from backend.services import wompi_service

_log = logging.getLogger(__name__)
_BOGOTA = ZoneInfo("America/Bogota")
REINTENTOS_DIAS = (1, 3, 5)
DIAS_GRACIA = 7
MAX_INTENTOS = 1 + len(REINTENTOS_DIAS)
LOTE_MAX = 3              # Vercel Hobby corta la función a ~60 s
PRESUPUESTO_SEG = 30      # presupuesto GLOBAL de la corrida (conciliar + cobrar)
CONCILIAR_MAX = 3
TIMEOUT_COBRO_SEG = 12
PENDIENTE_MIN_CONCILIAR = 30
PENDIENTE_HORAS_REVISION = 48
ESTADOS_FINALES_OK = {"APPROVED"}
ESTADOS_FINALES_FALLO = {"DECLINED", "ERROR", "VOIDED"}


# ── Piezas puras ────────────────────────────────────────────────────────────

def hoy_bogota() -> date:
    return datetime.now(_BOGOTA).date()


def siguiente_fecha(periodo: date, ancla: int) -> date:
    """Mismo día del mes siguiente, recortado a fin de mes (31 → 28/29 en feb → 31 en mar)."""
    anio, mes = (periodo.year + 1, 1) if periodo.month == 12 else (periodo.year, periodo.month + 1)
    return date(anio, mes, min(ancla, calendar.monthrange(anio, mes)[1]))


def fecha_reintento(periodo: date, fallos: int) -> date | None:
    """Tras el fallo N (1..3) se reintenta periodo + 1/3/5 días; después, ninguno."""
    return periodo + timedelta(days=REINTENTOS_DIAS[fallos - 1]) if 1 <= fallos <= len(REINTENTOS_DIAS) else None


def dry_run() -> bool:
    return os.environ.get("COBROS_DRY_RUN", "") == "1"


def activo(conn) -> bool:
    cur = conn.cursor()
    cur.execute("SELECT valor FROM config_sistema WHERE clave = 'cobros_recurrentes_activos'")
    fila = cur.fetchone()
    cur.close()
    return bool(fila) and fila[0] is True


# ── Aplicar el resultado de Wompi (webhook y conciliación) ──────────────────

def aplicar_resultado(conn, reference: str, transaction_id: str | None, estado_wompi: str,
                      amount_in_cents, currency: str | None) -> dict | None:
    """Idempotente. Devuelve un evento para avisar (o None si no cambió nada).
    NO hace commit: lo hace quien llama, y los avisos van después."""
    cur = conn.cursor()
    cur.execute(
        "SELECT c.id, c.empresa_id, c.periodo, c.intento, c.monto_cop, c.estado, c.transaction_id, c.ambiente, "
        "       s.dia_ancla, e.nombre, "
        "       (SELECT au.email FROM usuarios u JOIN auth.users au ON au.id = u.id WHERE u.empresa_id = c.empresa_id AND u.rol_codigo = 'admin' LIMIT 1) "
        "FROM cobros_recurrentes c "
        "JOIN suscripciones_wompi s ON s.empresa_id = c.empresa_id "
        "JOIN empresas e ON e.id = c.empresa_id "
        "WHERE c.reference = %s FOR UPDATE OF c, s", (reference,))
    fila = cur.fetchone()
    if fila is None:
        cur.close()
        _log.warning("cobro recurrente: referencia desconocida")
        return None
    cid, empresa_id, periodo, intento, monto, estado, tx_guardado, amb, ancla, nombre, email = fila
    if tx_guardado and transaction_id and tx_guardado != transaction_id:
        cur.close()
        _log.warning("cobro recurrente %s: transaction_id no coincide; se ignora", cid)
        return None
    if estado != "pendiente":
        cur.close()
        return None
    if transaction_id and not tx_guardado:
        cur.execute("UPDATE cobros_recurrentes SET transaction_id = %s WHERE id = %s AND transaction_id IS NULL",
                    (transaction_id, cid))
    evento = {"empresa": nombre, "empresa_id": str(empresa_id), "periodo": str(periodo), "monto": float(monto),
              "intento": intento, "ambiente": amb, "email": email}

    if estado_wompi in ESTADOS_FINALES_OK:
        if not (transaction_id or tx_guardado):
            cur.close()
            return None
        esperado = wompi_service.amount_in_cents(monto)
        if amount_in_cents is None or int(amount_in_cents) != esperado or (currency or "") != "COP":
            cur.execute("UPDATE cobros_recurrentes SET estado = 'revision_manual', estado_wompi = %s, "
                        "detalle = 'monto o moneda no coinciden', resuelto_en = now() "
                        "WHERE id = %s AND estado = 'pendiente'", (estado_wompi, cid))
            cur.close()
            return {**evento, "tipo": "revision_manual", "motivo": "El monto o la moneda no coinciden."}
        cur.execute("UPDATE cobros_recurrentes SET estado = 'aprobado', estado_wompi = %s, resuelto_en = now() "
                    "WHERE id = %s AND estado = 'pendiente'", (estado_wompi, cid))
        if cur.rowcount != 1:
            cur.close()
            return None
        proxima = siguiente_fecha(periodo, ancla or periodo.day)
        cur.execute(
            "UPDATE suscripciones_wompi SET estado = 'activa', proxima_fecha_cobro = %s, proximo_reintento = NULL, "
            "en_mora_desde = NULL WHERE empresa_id = %s",
            (proxima, empresa_id))
        _excluir_sandbox(cur, amb, transaction_id)
        cur.close()
        return {**evento, "tipo": "aprobado", "proximo_cobro": str(proxima)}

    if estado_wompi in ESTADOS_FINALES_FALLO:
        cur.execute("UPDATE cobros_recurrentes SET estado = 'fallido', estado_wompi = %s, resuelto_en = now() "
                    "WHERE id = %s AND estado = 'pendiente'", (estado_wompi, cid))
        if cur.rowcount != 1:
            cur.close()
            return None
        cur.execute("SELECT count(*) FROM cobros_recurrentes WHERE empresa_id = %s AND periodo = %s AND estado = 'fallido'",
                    (empresa_id, periodo))
        fallos = cur.fetchone()[0]
        reintento = fecha_reintento(periodo, fallos)
        cur.execute(
            "UPDATE suscripciones_wompi SET estado = CASE WHEN estado = 'suspendida' THEN estado ELSE 'en_mora' END, "
            "en_mora_desde = coalesce(en_mora_desde, %s), proximo_reintento = %s WHERE empresa_id = %s",
            (periodo, reintento, empresa_id))
        _excluir_sandbox(cur, amb, transaction_id)
        cur.close()
        return {**evento, "tipo": "fallido", "fallos": fallos, "reintento": str(reintento) if reintento else None}

    cur.close()  # PENDING u otro: se queda pendiente; la conciliación lo retoma
    return None


def _excluir_sandbox(cur, amb: str, transaction_id: str | None) -> None:
    if amb == "sandbox" and transaction_id:
        cur.execute("INSERT INTO metricas.pagos_excluidos (transaction_id, motivo) VALUES (%s, %s) "
                    "ON CONFLICT DO NOTHING", (transaction_id, "Sandbox de Wompi (cobro recurrente de prueba)"))


# ── Cron diario ─────────────────────────────────────────────────────────────

def conciliar(conn, eventos: list, limite_tiempo: float | None = None) -> int:
    """Cobros 'pendiente' con más de 30 min: se le pregunta a Wompi. Más de
    48 h sin resolver → revisión manual (nunca se reintenta: podría cobrar doble)."""
    cur = conn.cursor()
    cur.execute(
        "SELECT reference, transaction_id, creado_en < now() - make_interval(hours => %s) "
        "FROM cobros_recurrentes WHERE estado = 'pendiente' AND creado_en < now() - make_interval(mins => %s) "
        "ORDER BY creado_en LIMIT %s", (PENDIENTE_HORAS_REVISION, PENDIENTE_MIN_CONCILIAR, CONCILIAR_MAX))
    pendientes = cur.fetchall()
    cur.close()
    n = 0
    for reference, tx_id, vencido in pendientes:
        if limite_tiempo is not None and time.monotonic() > limite_tiempo:
            break
        try:
            if tx_id:
                txs = [wompi_service.consultar_transaccion(tx_id)]
            else:
                txs = wompi_service.buscar_por_referencia(reference)
        except Exception:
            _log.warning("conciliación: Wompi no respondió")
            txs = None
        finales = [t for t in (txs or []) if t.get("status") in ESTADOS_FINALES_OK | ESTADOS_FINALES_FALLO]
        aprobadas = [t for t in finales if t.get("status") in ESTADOS_FINALES_OK]
        elegida = aprobadas[0] if aprobadas else (finales[0] if finales else None)
        if elegida is not None:
            ev = aplicar_resultado(conn, reference, elegida.get("id"), elegida.get("status"),
                                   elegida.get("amount_in_cents"), elegida.get("currency"))
            conn.commit()
            if ev:
                eventos.append(ev)
                n += 1
        elif txs == [] and not tx_id and vencido:
            # Wompi confirma que NO existe transacción con esa referencia tras 48 h:
            # el cobro nunca salió; se marca fallido para que siga el calendario.
            ev = aplicar_resultado(conn, reference, None, "ERROR", None, None)
            conn.commit()
            if ev:
                eventos.append({**ev, "motivo": "Wompi nunca recibió el cobro."})
        elif vencido:
            cur = conn.cursor()
            cur.execute("UPDATE cobros_recurrentes SET estado = 'revision_manual', detalle = 'sin respuesta de Wompi en 48 h', "
                        "resuelto_en = now() WHERE reference = %s AND estado = 'pendiente' RETURNING empresa_id", (reference,))
            fila = cur.fetchone()
            cur.close()
            conn.commit()
            if fila:
                eventos.append({"tipo": "revision_manual", "empresa_id": str(fila[0]),
                                "motivo": "Sin respuesta de Wompi en 48 horas."})
    return n


def suspender_vencidas(conn, eventos: list) -> int:
    hoy = hoy_bogota()
    cur = conn.cursor()
    cur.execute(
        "UPDATE suscripciones_wompi s SET estado = 'suspendida', proximo_reintento = NULL "
        "FROM empresas e WHERE e.id = s.empresa_id AND s.estado = 'en_mora' AND s.en_mora_desde IS NOT NULL "
        "AND %s >= s.en_mora_desde + %s "
        "AND NOT EXISTS (SELECT 1 FROM cobros_recurrentes c WHERE c.empresa_id = s.empresa_id "
        "                AND c.estado IN ('pendiente', 'revision_manual')) "
        "RETURNING s.empresa_id, e.nombre", (hoy, DIAS_GRACIA))
    filas = cur.fetchall()
    cur.close()
    conn.commit()
    for empresa_id, nombre in filas:
        eventos.append({"tipo": "suspendida", "empresa_id": str(empresa_id), "empresa": nombre})
    return len(filas)


def _reclamar_siguiente(conn):
    """Crea (y comitea) UN cobro pendiente para la próxima suscripción vencida.
    Devuelve los datos para cobrar, o None si no hay más."""
    hoy = hoy_bogota()
    amb = wompi_service.ambiente()
    cur = conn.cursor()
    cur.execute(
        "SELECT s.empresa_id, s.proxima_fecha_cobro, s.plan_codigo, s.payment_source_id, p.precio_mensual_cop, "
        "       e.nombre, (SELECT au.email FROM usuarios u JOIN auth.users au ON au.id = u.id WHERE u.empresa_id = s.empresa_id AND u.rol_codigo = 'admin' LIMIT 1) "
        "FROM suscripciones_wompi s JOIN planes p ON p.codigo = s.plan_codigo JOIN empresas e ON e.id = s.empresa_id "
        # 'suspendida' solo vuelve a cobrarse si se programó un reintento
        # (actualización de tarjeta o "pagar ahora"): así paga el mes vencido.
        "WHERE (s.estado IN ('activa', 'en_mora') OR (s.estado = 'suspendida' AND s.proximo_reintento IS NOT NULL)) "
        "  AND s.proxima_fecha_cobro <= %s "
        "  AND (s.proximo_reintento IS NULL OR s.proximo_reintento <= %s) AND s.ambiente = %s "
        "  AND NOT EXISTS (SELECT 1 FROM cobros_recurrentes c WHERE c.empresa_id = s.empresa_id "
        "                  AND c.periodo = s.proxima_fecha_cobro AND c.estado IN ('pendiente', 'aprobado', 'revision_manual')) "
        "  AND (SELECT count(*) FROM cobros_recurrentes c WHERE c.empresa_id = s.empresa_id "
        "       AND c.periodo = s.proxima_fecha_cobro) < %s "
        "ORDER BY s.proxima_fecha_cobro FOR UPDATE OF s SKIP LOCKED LIMIT 1",
        (hoy, hoy, amb, MAX_INTENTOS))
    fila = cur.fetchone()
    if fila is None:
        cur.close()
        conn.commit()
        return None
    empresa_id, periodo, plan, ps_id, precio, nombre, email = fila
    cur.execute("SELECT max(precio_mensual_cop) FROM planes")
    tope = cur.fetchone()[0]
    if not precio or precio <= 0 or precio > tope or not ps_id or not email:
        cur.close()
        conn.rollback()
        _log.warning("cobro recurrente omitido: datos incompletos o monto fuera de rango")
        return {"omitido": True, "empresa_id": str(empresa_id), "empresa": nombre}
    cur.execute("SELECT coalesce(max(intento), 0) + 1 FROM cobros_recurrentes WHERE empresa_id = %s AND periodo = %s",
                (empresa_id, periodo))
    intento = cur.fetchone()[0]
    reference = f"REC-{uuid.uuid4()}"
    cur.execute(
        "INSERT INTO cobros_recurrentes (empresa_id, periodo, intento, reference, plan_codigo, monto_cop, ambiente) "
        "VALUES (%s, %s, %s, %s, %s, %s, %s) ON CONFLICT DO NOTHING RETURNING id",
        (empresa_id, periodo, intento, reference, plan, precio, amb))
    creado = cur.fetchone()
    cur.close()
    conn.commit()
    if creado is None:  # otro cron lo tomó en paralelo: no es un error, no se avisa
        return {"omitido": True, "silencioso": True, "empresa_id": str(empresa_id), "empresa": nombre}
    return {"reference": reference, "monto": precio, "ps_id": ps_id, "email": email,
            "empresa_id": str(empresa_id), "empresa": nombre, "periodo": str(periodo)}


def cobrar_vencidas(conn, eventos: list, limite_tiempo: float | None = None) -> int:
    limite = limite_tiempo if limite_tiempo is not None else time.monotonic() + PRESUPUESTO_SEG
    n = 0
    while n < LOTE_MAX and time.monotonic() < limite:
        cobro = _reclamar_siguiente(conn)
        if cobro is None:
            break
        n += 1
        if cobro.get("omitido"):
            if cobro.get("silencioso"):
                continue
            eventos.append({"tipo": "omitido", "empresa_id": cobro["empresa_id"], "empresa": cobro["empresa"]})
            continue
        if dry_run():
            eventos.append({"tipo": "dry_run", "empresa": cobro["empresa"], "periodo": cobro["periodo"],
                            "monto": float(cobro["monto"])})
            continue
        try:
            tx = wompi_service.cobrar_con_payment_source(
                cobro["reference"], cobro["monto"], cobro["ps_id"], cobro["email"], recurrente=True,
                timeout=TIMEOUT_COBRO_SEG)
        except Exception:
            # Nunca se reintenta aquí: Wompi pudo haber cobrado. La conciliación decide.
            _log.warning("cobro recurrente: Wompi no respondió; queda pendiente para conciliar")
            continue
        ev = aplicar_resultado(conn, cobro["reference"], tx.get("id"), tx.get("status") or "PENDING",
                               tx.get("amount_in_cents"), tx.get("currency"))
        conn.commit()
        if ev:
            eventos.append(ev)
    return n


def avisos_previos(conn) -> list[dict]:
    """Suscripciones activas que se cobran en 3 días. Se marca ANTES de enviar
    (a lo sumo un aviso por periodo)."""
    if dry_run():
        return []
    objetivo = hoy_bogota() + timedelta(days=3)
    cur = conn.cursor()
    cur.execute(
        "UPDATE suscripciones_wompi s SET aviso_enviado_para = s.proxima_fecha_cobro "
        "FROM empresas e, planes p WHERE e.id = s.empresa_id AND p.codigo = s.plan_codigo "
        "AND s.estado = 'activa' AND s.proxima_fecha_cobro = %s "
        "AND s.aviso_enviado_para IS DISTINCT FROM s.proxima_fecha_cobro "
        "RETURNING s.empresa_id, e.nombre, p.nombre, p.precio_mensual_cop, s.proxima_fecha_cobro, "
        "(SELECT au.email FROM usuarios u JOIN auth.users au ON au.id = u.id WHERE u.empresa_id = s.empresa_id AND u.rol_codigo = 'admin' LIMIT 1)",
        (objetivo,))
    filas = cur.fetchall()
    cur.close()
    conn.commit()
    return [{"empresa": n, "plan": pl, "monto": float(m), "fecha": str(f), "email": em}
            for _, n, pl, m, f, em in filas if em]


def ejecutar_cron(conn) -> dict:
    """Orden: conciliar → suspender → cobrar → avisos previos. Devuelve el resumen y los eventos."""
    eventos: list = []
    if not activo(conn):
        return {"activo": False, "eventos": []}
    limite = time.monotonic() + PRESUPUESTO_SEG
    conciliados = conciliar(conn, eventos, limite)
    suspendidas = suspender_vencidas(conn, eventos)
    cobrados = cobrar_vencidas(conn, eventos, limite)
    previos = avisos_previos(conn)
    return {"activo": True, "dry_run": dry_run(), "ambiente": wompi_service.ambiente(),
            "conciliados": conciliados, "suspendidas": suspendidas, "cobros_intentados": cobrados,
            "avisos_previos": previos, "eventos": eventos}


# ── Avisos (siempre DESPUÉS del commit; un aviso caído nunca revierte un cobro) ──

def _pesos(v) -> str:
    return "$" + f"{round(float(v or 0)):,}".replace(",", ".")


def texto_evento(ev: dict) -> tuple[str, str]:
    empresa = (ev.get("empresa") or ev.get("empresa_id", "")[:8])[:60]
    prueba = " (PRUEBA sandbox)" if ev.get("ambiente") == "sandbox" else ""
    tipo = ev.get("tipo")
    if tipo == "aprobado":
        prox = f" Próximo cobro: {ev['proximo_cobro']}." if ev.get("proximo_cobro") else ""
        return ("💳 Cobro mensual aprobado" + prueba, f"{empresa}: {_pesos(ev['monto'])} del periodo {ev['periodo']}.{prox}")
    if tipo == "fallido":
        sig = f" Próximo reintento: {ev['reintento']}." if ev.get("reintento") else " Sin más reintentos: pasará a suspensión al cumplir 7 días."
        return ("⚠️ Cobro mensual rechazado" + prueba, f"{empresa}: intento {ev['intento']} rechazado.{sig}")
    if tipo == "suspendida":
        return ("⛔ Taller suspendido por falta de pago", f"{empresa} pasó a solo lectura tras 7 días de mora.")
    if tipo == "revision_manual":
        return ("🔎 Cobro para revisar a mano", f"{empresa}: {ev.get('motivo', '')}")
    if tipo == "omitido":
        return ("⚠️ Cobro omitido", f"{empresa}: faltan datos (tarjeta, correo o precio del plan). Revisar.")
    if tipo == "dry_run":
        return ("🧪 Cobro simulado (dry run)", f"{empresa}: {_pesos(ev['monto'])} del periodo {ev['periodo']} (no se llamó a Wompi).")
    return ("ℹ️ Cobro mensual", json.dumps(ev, ensure_ascii=False)[:300])
