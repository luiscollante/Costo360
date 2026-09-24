"""
Alertas de consumo de IA al fundador — Telegram + correo (ciclo /goal 2026-09-24).

Decisión del fundador: durante la fase de medición con clientes reales NUNCA
se bloquea a nadie por pasar su cupo; en cambio, el fundador recibe un aviso
en tiempo real cuando una empresa (Cost/Gemini, render/OpenAI), un usuario
(voz/ElevenLabs) o la cuenta general de cada proveedor cruza 70/80/100/150/200%
del cupo del mes, para recargar antes de que nadie se quede sin servicio.

Garantías de diseño (auditoría del plan):
- Conexión PROPIA de servicio (rol postgres, BYPASSRLS) en transacción aparte:
  la del request corre como `authenticated` bajo RLS, solo ve una empresa, y
  un fallo aquí nunca debe envenenar la transacción del usuario.
- Deduplicación con `alerta_consumo_enviada` (UNIQUE ámbito/api/umbral/mes +
  ON CONFLICT DO NOTHING): solo se envía si el INSERT insertó de verdad.
- Best-effort total: cualquier error se registra y se traga; nunca rompe la
  respuesta al usuario. El cron diario (`routers/consumo_cron.py`) re-evalúa
  todo como red de seguridad por si un aviso se perdió.
- Privacidad: el mensaje solo lleva el nombre de la empresa y del usuario del
  taller, nunca datos de los clientes finales del taller.
"""
import html
import logging
import os
from contextlib import contextmanager

import httpx

from backend.db.client import get_engine
from backend.services import consumo_service, email_service, render_service

_log = logging.getLogger("alertas")

UMBRALES = (70, 80, 100, 150, 200)
_TIMEOUT = 3.0

# Presupuestos mensuales GLOBALES (toda la plataforma) — decisión del fundador
# 2026-09-23. Gemini y OpenAI no exponen un saldo consultable simple, así que
# se compara el gasto REAL medido contra este presupuesto. Editables por env.
_PRESUPUESTO_GEMINI_COP = float(os.environ.get("PRESUPUESTO_GEMINI_COP", "200000"))
_PRESUPUESTO_OPENAI_USD = float(os.environ.get("PRESUPUESTO_OPENAI_USD", "20"))

_NOMBRE_API = {
    "gemini_cost": "Cost (chat con IA)",
    "elevenlabs_voz": "voz de Cost",
    "openai_render": "renders de cocina",
    "elevenlabs_cuenta": "cuenta de ElevenLabs",
}


@contextmanager
def _conexion_servicio():
    conn = get_engine().raw_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        try:
            conn.rollback()
        except Exception:
            pass
        raise
    finally:
        conn.close()


# ── Canales ──────────────────────────────────────────────────────────────────

def _destinatarios_correo() -> list[str]:
    crudo = os.environ.get("ALERTAS_EMAILS", "atencion@costo360.com,collante110@gmail.com")
    return [e.strip() for e in crudo.split(",") if e.strip()]


def _enviar_telegram(texto: str) -> bool:
    token = os.environ.get("TELEGRAM_BOT_TOKEN", "")
    chat_id = os.environ.get("TELEGRAM_CHAT_ID", "")
    if not token or not chat_id:
        _log.warning("Telegram no configurado — aviso no enviado por Telegram")
        return False
    try:
        with httpx.Client(timeout=_TIMEOUT) as c:
            r = c.post(f"https://api.telegram.org/bot{token}/sendMessage",
                       json={"chat_id": chat_id, "text": texto})
        r.raise_for_status()
        return True
    except Exception as e:
        # Nunca loguear la URL (lleva el token del bot).
        _log.warning("Fallo al enviar aviso por Telegram: %s", type(e).__name__)
        return False


def _enviar_correo(asunto: str, texto: str) -> None:
    cuerpo = email_service._shell(
        asunto,
        f"<p style='margin:0;font-size:15px;line-height:1.6;color:#1F2A24;'>"
        f"{html.escape(texto).replace(chr(10), '<br>')}</p>",
    )
    for dest in _destinatarios_correo():
        email_service._enviar(dest, asunto, cuerpo)


def _notificar(titulo: str, texto: str) -> None:
    _enviar_telegram(f"{titulo}\n\n{texto}")
    _enviar_correo(titulo, texto)


# ── Núcleo: cruzar umbrales con deduplicación ────────────────────────────────

def _registrar_umbrales(cur, ambito: str, api: str, pct: float, detalle: str) -> int | None:
    """Inserta todos los umbrales cruzados que aún no se habían avisado este mes.
    Devuelve el umbral MÁS ALTO recién insertado (para mandar un solo mensaje
    aunque el salto cruce varios umbrales de una vez), o None si no hay nada nuevo."""
    nuevo = None
    for umbral in UMBRALES:
        if pct < umbral:
            break
        cur.execute(
            "INSERT INTO alerta_consumo_enviada (ambito, api, umbral, periodo, detalle) "
            "VALUES (%s, %s, %s, date_trunc('month', now() at time zone 'America/Bogota')::date, %s) "
            "ON CONFLICT (ambito, api, umbral, periodo) DO NOTHING RETURNING umbral",
            (ambito, api, umbral, detalle),
        )
        if cur.fetchone() is not None:
            nuevo = umbral
    return nuevo


def _mensaje(sujeto: str, api: str, umbral: int, detalle: str) -> tuple[str, str]:
    icono = "🔴" if umbral >= 100 else "⚠️"
    servicio = _NOMBRE_API.get(api, api)
    if umbral >= 100:
        titulo = f"{icono} {sujeto} superó el {umbral}% de su cupo de {servicio}"
        cierre = ("No se le bloqueó el servicio (fase de medición). "
                  "Revisa si hace falta recargar la cuenta del proveedor.")
    else:
        titulo = f"{icono} {sujeto} llegó al {umbral}% de su cupo de {servicio}"
        cierre = "Aún tiene servicio. Es buen momento para revisar el saldo del proveedor."
    return titulo, f"{detalle}\n\n{cierre}"


def _evaluar(cur, ambito: str, sujeto: str, api: str, gasto: float, tope: float, detalle: str) -> None:
    pct = consumo_service.porcentaje(gasto, tope)
    umbral = _registrar_umbrales(cur, ambito, api, pct, detalle)
    if umbral is not None:
        titulo, texto = _mensaje(sujeto, api, umbral, f"{detalle} ({pct:.0f}% usado este mes).")
        _notificar(titulo, texto)


def _empresa(cur, empresa_id):
    cur.execute("SELECT nombre, plan_codigo FROM empresas WHERE id = %s", (empresa_id,))
    fila = cur.fetchone()
    return (fila[0], fila[1]) if fila else ("Empresa sin nombre", "")


def _evaluar_empresa_gemini(conn, cur, empresa_id) -> None:
    nombre, plan = _empresa(cur, empresa_id)
    tope = consumo_service.tope_gemini_cop(conn, {"empresa_id": empresa_id, "plan_codigo": plan})
    gasto = consumo_service.gasto_mes_gemini_cop(conn, empresa_id)
    _evaluar(cur, f"empresa:{empresa_id}", f"{nombre} (plan {plan})", "gemini_cost", gasto, tope,
             f"Gasto en Cost: ${gasto:,.0f} de ${tope:,.0f} COP".replace(",", "."))


def _evaluar_usuario_voz(conn, cur, usuario_id, pendiente: float = 0.0) -> None:
    cur.execute(
        "SELECT u.nombre_completo, u.empresa_id, e.nombre, e.plan_codigo "
        "FROM usuarios u JOIN empresas e ON e.id = u.empresa_id WHERE u.id = %s",
        (usuario_id,),
    )
    fila = cur.fetchone()
    if not fila:
        return
    nombre_usuario, empresa_id, nombre_empresa, plan = fila
    tope = consumo_service.tope_voz_mensajes_usuario(conn, empresa_id, plan)
    usados = consumo_service.mensajes_voz_mes_usuario(conn, usuario_id) + pendiente
    _evaluar(cur, f"usuario:{usuario_id}", f"{nombre_usuario or 'Un usuario'} de {nombre_empresa} (plan {plan})",
             "elevenlabs_voz", usados, tope, f"Mensajes de voz: {usados:.1f} de {tope:.0f}")


def _evaluar_empresa_render(conn, cur, empresa_id, pendiente: float = 0.0) -> None:
    nombre, plan = _empresa(cur, empresa_id)
    tope = render_service.obtener_tope_mensual(conn, empresa_id)
    gasto = render_service.gasto_mensual(conn, empresa_id) + pendiente
    _evaluar(cur, f"empresa:{empresa_id}", f"{nombre} (plan {plan})", "openai_render", gasto, tope,
             f"Gasto en renders: USD {gasto:.2f} de USD {tope:.2f}")


def _evaluar_global_gemini(conn, cur) -> None:
    cur.execute(
        "SELECT COALESCE(SUM(costo_usd), 0) FROM consumo_api "
        f"WHERE api = 'gemini_cost' AND creado_en >= {consumo_service.INICIO_MES_SQL}"
    )
    gasto = float(cur.fetchone()[0] or 0) * consumo_service.TRM_COP_USD
    _evaluar(cur, "global", "Costo360 (todas las empresas)", "gemini_cost", gasto, _PRESUPUESTO_GEMINI_COP,
             f"Gasto total en Gemini: ${gasto:,.0f} de ${_PRESUPUESTO_GEMINI_COP:,.0f} COP".replace(",", "."))


def _evaluar_global_render(conn, cur, pendiente: float = 0.0) -> None:
    cur.execute(
        "SELECT COALESCE(SUM(costo_usd), 0) FROM render_cocina "
        f"WHERE creado_en >= {consumo_service.INICIO_MES_SQL}"
    )
    gasto = float(cur.fetchone()[0] or 0) + pendiente
    _evaluar(cur, "global", "Costo360 (todas las empresas)", "openai_render", gasto, _PRESUPUESTO_OPENAI_USD,
             f"Gasto total en OpenAI: USD {gasto:.2f} de USD {_PRESUPUESTO_OPENAI_USD:.2f}")


def evaluar_cuenta_elevenlabs(cur) -> dict | None:
    """Saldo REAL de la cuenta compartida de ElevenLabs (/v1/user/subscription).
    Solo desde el cron — no en cada request (suma un viaje de red)."""
    key = os.environ.get("ELEVENLABS_API_KEY", "")
    if not key:
        return None
    try:
        with httpx.Client(timeout=10.0) as c:
            r = c.get("https://api.elevenlabs.io/v1/user/subscription", headers={"xi-api-key": key})
        r.raise_for_status()
        data = r.json()
    except Exception as e:
        _log.warning("No se pudo consultar la suscripción de ElevenLabs: %s", type(e).__name__)
        return None
    usados = float(data.get("character_count") or 0)
    limite = float(data.get("character_limit") or 0)
    _evaluar(cur, "global", "La cuenta de ElevenLabs de Costo360", "elevenlabs_cuenta", usados, limite,
             f"Créditos usados: {usados:,.0f} de {limite:,.0f}".replace(",", "."))
    return {"usados": usados, "limite": limite}


# ── Puntos de entrada (best-effort, nunca lanzan) ────────────────────────────

def tras_consumo_gemini(empresa_id) -> None:
    try:
        with _conexion_servicio() as conn:
            cur = conn.cursor()
            _evaluar_empresa_gemini(conn, cur, empresa_id)
            _evaluar_global_gemini(conn, cur)
    except Exception:
        _log.exception("Evaluación de alertas (Gemini) falló — se reintenta en el cron diario")


def tras_consumo_voz(usuario_id, *, pendiente_segundos: float = 0.0) -> None:
    """`pendiente_segundos`: el evento recién registrado en la transacción del
    request, que esta conexión aparte todavía no ve (sin comitear)."""
    try:
        pendiente = consumo_service.segundos_a_mensajes_voz(pendiente_segundos)
        with _conexion_servicio() as conn:
            _evaluar_usuario_voz(conn, conn.cursor(), usuario_id, pendiente)
    except Exception:
        _log.exception("Evaluación de alertas (voz) falló — se reintenta en el cron diario")


def tras_consumo_render(empresa_id, *, pendiente_usd: float = 0.0) -> None:
    try:
        with _conexion_servicio() as conn:
            cur = conn.cursor()
            _evaluar_empresa_render(conn, cur, empresa_id, pendiente_usd)
            _evaluar_global_render(conn, cur, pendiente_usd)
    except Exception:
        _log.exception("Evaluación de alertas (render) falló — se reintenta en el cron diario")


def revision_completa(conn) -> dict:
    """Barrido del cron diario: re-evalúa todo lo que tuvo consumo este mes."""
    cur = conn.cursor()
    cur.execute(f"SELECT DISTINCT empresa_id FROM consumo_api WHERE api = 'gemini_cost' AND creado_en >= {consumo_service.INICIO_MES_SQL}")
    empresas_gemini = [r[0] for r in cur.fetchall()]
    cur.execute(f"SELECT DISTINCT usuario_id FROM consumo_api WHERE api = 'elevenlabs_voz' AND usuario_id IS NOT NULL AND creado_en >= {consumo_service.INICIO_MES_SQL}")
    usuarios_voz = [r[0] for r in cur.fetchall()]
    cur.execute(f"SELECT DISTINCT empresa_id FROM render_cocina WHERE creado_en >= {consumo_service.INICIO_MES_SQL}")
    empresas_render = [r[0] for r in cur.fetchall()]

    for e in empresas_gemini:
        _evaluar_empresa_gemini(conn, cur, e)
    for u in usuarios_voz:
        _evaluar_usuario_voz(conn, cur, u)
    for e in empresas_render:
        _evaluar_empresa_render(conn, cur, e)
    _evaluar_global_gemini(conn, cur)
    _evaluar_global_render(conn, cur)
    cuenta = evaluar_cuenta_elevenlabs(cur)
    return {"empresas_gemini": len(empresas_gemini), "usuarios_voz": len(usuarios_voz),
            "empresas_render": len(empresas_render), "elevenlabs": cuenta}
