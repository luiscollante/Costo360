"""
Consumo de APIs de IA por empresa (Gemini/Cost, ElevenLabs/Voz) — ciclo
pedido por el fundador (2026-09-16) para que ninguna empresa (sobre todo una
grande, con varios usuarios activos) genere un pico de gasto real sin aviso
ni freno a fin de mes.

Mismo patrón ya probado en `render_service.py` (tope mensual configurable por
empresa vía `app_config`, chequeo antes de cada llamada real, registro
auditable), pero generalizado a una sola tabla (`consumo_api`) para
cualquier API medible, en vez de una tabla por API — es la
"estandarización" que pidió el fundador. `render_cocina`/`render_config` NO
se migran a este módulo (ya funcionan, ya están probados); esto cubre las 2
APIs que hoy NO tienen ningún control real: Gemini (Cost) y ElevenLabs (voz).

Reglas de negocio decididas con el fundador (2026-09-16):
- Medición con TOKENS/segundos reales, nunca un conteo aproximado de turnos
  — el gasto acumulado debe ser el costo real, no un estimado.
- El taller ve su propio consumo en lenguaje simple ("te quedan
  aproximadamente X interacciones/mensajes de voz este mes"), nunca cifras
  técnicas en dólares — ver `resumen_consumo`.

Cambio 2026-09-23/24 (decisión del fundador): durante la fase de medición con
clientes reales NUNCA se bloquea a nadie al pasar su cupo — se eliminó el
bloqueo al 120% (`verificar_tope_*`). Los topes quedan solo como referencia
para avisarle al fundador (Telegram + correo, `alertas_service.py`) y que
recargue a tiempo. La voz pasa a cupo POR USUARIO, medido en "mensajes de
voz" (pregunta ≤30 s + respuesta completa de Cost, nunca cortada).
"""
from backend.db.config_helpers import cfg_get

# Inicio del mes en hora de Colombia — `date_trunc('month', now())` a secas
# corre en UTC y reiniciaba el mes el día anterior a las 7 p. m. (auditoría
# del ciclo de alertas). Usar SIEMPRE esta expresión en sumas mensuales.
INICIO_MES_SQL = "(date_trunc('month', now() at time zone 'America/Bogota') at time zone 'America/Bogota')"

_CLAVE_CONFIG = "consumo_ia_config"

# ── Tarifas reales — un solo lugar, nunca un número suelto en runtime.py/voz.py ──
# Gemini 3.5 Flash (el modelo real que usa Cost — ver `agente/runtime.py`,
# `_MODELO = "gemini-3.5-flash"`. NO es el stack "Claude Sonnet 5 + Fable +
# Gemini orquestador" que asume `docs/PLAN_COSTOS_COMPLETO_COSTO360.md` — el
# costo real es ~7,5x más barato que lo que ese documento presupuesta. Precio
# verificado 2026-09: $1,50/$9,00 USD por millón de tokens entrada/salida.
_PRECIO_GEMINI_IN_USD_M = 1.50
_PRECIO_GEMINI_OUT_USD_M = 9.00

# ElevenLabs cobra por crédito; ~1.000 créditos ≈ 1 minuto de audio (TTS y
# STT). Mismo criterio de "estimación real, no inventada" que el resto del
# proyecto — si ElevenLabs cambia esta relación, ajustar aquí, un solo lugar.
_CREDITOS_POR_MINUTO = 1000.0
_CREDITOS_POR_SEGUNDO = _CREDITOS_POR_MINUTO / 60.0
_USD_POR_CREDITO = 0.0
# ^ ElevenLabs no vende créditos sueltos a precio fijo en USD (es parte de un
# plan mensual) — para no inventar un precio falso, el costo de la voz se
# mide y se topea en CRÉDITOS directamente, no convertido a USD. `costo_usd`
# en `consumo_api` queda en 0 para 'elevenlabs_voz' a propósito (ver
# `registrar_consumo_voz`); el tope real de esta API vive en
# `_TOPES_VOZ_CREDITOS_DEFAULT`, no en `_TOPES_GEMINI_COP_DEFAULT`.

TRM_COP_USD = 3048.12  # misma referencia que docs/PLAN_COSTOS_COMPLETO_COSTO360.md

# ── Topes mensuales por defecto, por plan — editables sin redeploy vía
# `app_config` (clave 'consumo_ia_config'), igual que 'render_config'. Estos
# son el PUNTO DE PARTIDA, no un número definitivo: el fundador los puede
# subir o bajar por empresa en cualquier momento sin tocar código.
#
# Gemini (COP/mes/empresa): calculado con el colchón de seguridad ya
# encontrado en la hoja "09_Simulacion_Consumo_Exagerado" del desglose de
# costos (factor ~11,7x sobre el consumo "normal" de 30 conversaciones/mes),
# reescalado al precio REAL de Gemini Flash (no al de Claude+Fable que asume
# el modelo financiero de la universidad) — por eso el monto es mucho más
# chico en pesos de lo que sugeriría ese documento, sin perder el mismo
# margen de seguridad relativo.
#
# Starter en $0 bloqueaba a Cost desde la primera conversación pese a que la
# landing ya lo anuncia como incluido desde Starter (decisión del fundador,
# 2026-09-22, ver docs/PLANES_LANDING.md). $20.000 = la misma proporción por
# usuario que Pro ($55.000 / 3 usuarios ≈ $18.333, redondeado), para una
# cuenta de 1 solo administrador. Punto de partida, no definitivo -- editable
# sin redeploy vía `app_config` igual que los demás topes.
_TOPES_GEMINI_COP_DEFAULT = {"starter": 20_000, "pro": 55_000, "enterprise": 550_000}

# Voz (mensajes de voz/mes POR USUARIO, decisión del fundador 2026-09-23 —
# "quienes mueven los hilos son las personas"). Starter incluye voz para
# enganchar. Provisionales hasta calibrar con uso real; editables sin
# redeploy vía `app_config` (clave 'voz_tope_mensajes_usuario').
_TOPES_VOZ_MENSAJES_USUARIO_DEFAULT = {"starter": 5, "pro": 10, "enterprise": 15}

# Un "mensaje de voz" = pregunta hablada (≤30 s, ~500 créditos) + respuesta
# de Cost (longitud variable, nunca cortada; ~500 créditos en promedio).
# ESTIMADO provisional — calibrar contra el descuento real en la cuenta de
# ElevenLabs y ajustar aquí, un solo lugar.
_CREDITOS_POR_MENSAJE_VOZ = 1000.0

# Costo/consumo promedio por unidad "amigable" — solo para traducir el gasto
# real a un lenguaje simple ("te quedan X interacciones/minutos"), nunca para
# la medición real (que siempre usa tokens/segundos reales de cada evento).
_COSTO_PROMEDIO_CONVERSACION_USD = 0.05  # ~24.500 tok entrada + 1.500 salida, típico
_SEGUNDOS_PROMEDIO_INTERACCION_VOZ = 35.0

# ── Estimación de segundos de audio (ElevenLabs no siempre devuelve la
# duración exacta en la respuesta cruda) — declarada explícitamente como
# estimación, mismo criterio que `_COSTO_ESTIMADO_USD` en render_service.py.
_CARACTERES_POR_SEGUNDO_TTS = 13.0  # habla natural en español, ~168 palabras/min,
                                    # ajustado por voice_settings.speed=0.92 de voz.py
_KBPS_AUDIO_MICROFONO = 24.0        # webm/opus típico de MediaRecorder del navegador


def estimar_segundos_tts(texto: str) -> float:
    """Duración estimada de un audio generado por ElevenLabs a partir del
    texto que se le mandó — fallback declarado (no hay duración exacta en la
    respuesta cruda del endpoint text-to-speech)."""
    return len(texto) / _CARACTERES_POR_SEGUNDO_TTS


def estimar_segundos_stt(bytes_audio: int) -> float:
    """Duración estimada de un audio grabado por el micrófono, a partir de su
    tamaño en bytes — fallback declarado (decodificar la duración exacta de
    webm/opus arbitrario necesitaría una dependencia nueva, ej. ffprobe)."""
    return bytes_audio * 8 / (_KBPS_AUDIO_MICROFONO * 1000)


def _tope_plan(mapa: dict, plan_codigo: str, *, api: str) -> float:
    """Mismo criterio que `agente/bitacora.py::dias_retencion`: un plan_codigo
    desconocido cae al valor MÁS conservador (nunca "sin límite" por error),
    logueado para que se note."""
    tope = mapa.get(plan_codigo)
    if tope is not None:
        return tope
    print(
        f"[consumo_service] ADVERTENCIA: plan_codigo desconocido '{plan_codigo}' "
        f"para '{api}' — usando el tope más conservador (0) en vez de dejar sin límite.",
        flush=True,
    )
    return 0


def _config_empresa(conn, empresa_id) -> dict:
    return cfg_get(conn, empresa_id, _CLAVE_CONFIG, {}) or {}


def tope_gemini_cop(conn, usuario) -> float:
    cfg = _config_empresa(conn, usuario["empresa_id"])
    if "gemini_tope_cop" in cfg:
        return float(cfg["gemini_tope_cop"])
    return _tope_plan(_TOPES_GEMINI_COP_DEFAULT, usuario.get("plan_codigo", ""), api="gemini_cost")


def tope_voz_mensajes_usuario(conn, empresa_id, plan_codigo: str) -> float:
    cfg = _config_empresa(conn, empresa_id)
    if "voz_tope_mensajes_usuario" in cfg:
        return float(cfg["voz_tope_mensajes_usuario"])
    return _tope_plan(_TOPES_VOZ_MENSAJES_USUARIO_DEFAULT, plan_codigo, api="elevenlabs_voz")


# ── Registro de consumo real ─────────────────────────────────────────────────

def registrar_consumo_gemini(conn, usuario, *, tokens_in: int, tokens_out: int) -> None:
    costo_usd = (tokens_in / 1_000_000 * _PRECIO_GEMINI_IN_USD_M
                 + tokens_out / 1_000_000 * _PRECIO_GEMINI_OUT_USD_M)
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO consumo_api (empresa_id, usuario_id, api, unidad_medida, cantidad, costo_usd) "
        "VALUES (%s, %s, 'gemini_cost', 'tokens', %s, %s)",
        (usuario["empresa_id"], usuario["id"], tokens_in + tokens_out, costo_usd),
    )


def registrar_consumo_voz(conn, usuario, *, segundos_audio: float) -> None:
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO consumo_api (empresa_id, usuario_id, api, unidad_medida, cantidad, costo_usd) "
        "VALUES (%s, %s, 'elevenlabs_voz', 'segundos_audio', %s, 0)",
        (usuario["empresa_id"], usuario["id"], segundos_audio),
    )


# ── Gasto acumulado del mes ──────────────────────────────────────────────────

def gasto_mes_gemini_cop(conn, empresa_id) -> float:
    cur = conn.cursor()
    cur.execute(
        "SELECT COALESCE(SUM(costo_usd), 0) FROM consumo_api "
        f"WHERE empresa_id = %s AND api = 'gemini_cost' AND creado_en >= {INICIO_MES_SQL}",
        (empresa_id,),
    )
    return float(cur.fetchone()[0] or 0) * TRM_COP_USD


def mensajes_voz_mes_usuario(conn, usuario_id) -> float:
    """Mensajes de voz equivalentes gastados por UN usuario este mes."""
    cur = conn.cursor()
    cur.execute(
        "SELECT COALESCE(SUM(cantidad), 0) FROM consumo_api "
        f"WHERE usuario_id = %s AND api = 'elevenlabs_voz' AND creado_en >= {INICIO_MES_SQL}",
        (usuario_id,),
    )
    return segundos_a_mensajes_voz(float(cur.fetchone()[0] or 0))


def segundos_a_mensajes_voz(segundos: float) -> float:
    return segundos * _CREDITOS_POR_SEGUNDO / _CREDITOS_POR_MENSAJE_VOZ


def porcentaje(gasto: float, tope: float) -> float:
    """Tope 0 (plan desconocido) → 0% en vez de dividir por cero. Sin bloqueo,
    un porcentaje 'infinito' solo dispararía avisos falsos."""
    return round(gasto / tope * 100, 1) if tope > 0 else 0.0


# ── Resumen amigable para el taller ("te quedan aproximadamente X...") ──────

def resumen_consumo(conn, usuario) -> dict:
    tope_gemini = tope_gemini_cop(conn, usuario)
    gasto_gemini = gasto_mes_gemini_cop(conn, usuario["empresa_id"])
    costo_conv_cop = _COSTO_PROMEDIO_CONVERSACION_USD * TRM_COP_USD
    restante_cop = max(tope_gemini - gasto_gemini, 0)
    interacciones_restantes = int(restante_cop // costo_conv_cop) if costo_conv_cop else 0

    tope_voz = tope_voz_mensajes_usuario(conn, usuario["empresa_id"], usuario.get("plan_codigo", ""))
    usados_voz = mensajes_voz_mes_usuario(conn, usuario["id"])

    return {
        "cost": {
            "restante_estimado": interacciones_restantes,
            "unidad": "interacciones",
            "porcentaje_usado": porcentaje(gasto_gemini, tope_gemini),
        },
        "voz": {
            "restante_estimado": int(max(tope_voz - usados_voz, 0)),
            "unidad": "mensajes de voz",
            "porcentaje_usado": porcentaje(usados_voz, tope_voz),
        },
    }
