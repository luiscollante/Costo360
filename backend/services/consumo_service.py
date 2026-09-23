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
- Bloqueo duro por función (no de toda la app) al superar el tope, con aviso
  temprano al 80% y un colchón de gracia del 20% (el bloqueo real ocurre al
  120% del tope nominal, no exacto al 100%) para no cortar a alguien a mitad
  de una tarea importante.
- El taller ve su propio consumo en lenguaje simple ("te quedan
  aproximadamente X interacciones/minutos este mes"), nunca cifras técnicas
  en dólares — ver `resumen_consumo`.
"""
from fastapi import HTTPException

from backend.db.config_helpers import cfg_get

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

# ElevenLabs (créditos/mes/empresa): acotado por el pool COMPARTIDO real
# entre TODOS los clientes de Costo360 (10.000 créditos/mes hoy, plan
# gratuito) — deliberadamente conservador. Revisar y subir el plan de
# ElevenLabs en cuanto haya más de 1-2 clientes activos usando la voz
# seguido; estos topes no alcanzan a proteger contra ESO, solo evitan que
# UNA empresa se coma todo el pool ella sola.
_TOPES_VOZ_CREDITOS_DEFAULT = {"starter": 0, "pro": 500, "enterprise": 2_000}

_TOPE_GRACIA = 1.20   # 20% de colchón antes del bloqueo real (decisión del fundador)
_AVISO_TEMPRANO = 0.80

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


def tope_voz_creditos(conn, usuario) -> float:
    cfg = _config_empresa(conn, usuario["empresa_id"])
    if "voz_tope_creditos" in cfg:
        return float(cfg["voz_tope_creditos"])
    return _tope_plan(_TOPES_VOZ_CREDITOS_DEFAULT, usuario.get("plan_codigo", ""), api="elevenlabs_voz")


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

def _gasto_mes_cop(conn, empresa_id, api: str) -> float:
    cur = conn.cursor()
    cur.execute(
        "SELECT COALESCE(SUM(costo_usd), 0) FROM consumo_api "
        "WHERE empresa_id = %s AND api = %s AND creado_en >= date_trunc('month', now())",
        (empresa_id, api),
    )
    return float(cur.fetchone()[0] or 0) * TRM_COP_USD


def _gasto_mes_creditos(conn, empresa_id, api: str) -> float:
    cur = conn.cursor()
    cur.execute(
        "SELECT COALESCE(SUM(cantidad), 0) FROM consumo_api "
        "WHERE empresa_id = %s AND api = %s AND creado_en >= date_trunc('month', now())",
        (empresa_id, api),
    )
    segundos = float(cur.fetchone()[0] or 0)
    return segundos * _CREDITOS_POR_SEGUNDO


# ── Chequeo antes de llamar a la API real ────────────────────────────────────

def verificar_tope_gemini(conn, usuario) -> None:
    tope = tope_gemini_cop(conn, usuario)
    gasto = _gasto_mes_cop(conn, usuario["empresa_id"], "gemini_cost")
    if gasto >= tope * _TOPE_GRACIA:
        raise HTTPException(
            status_code=429,
            detail="Se acabaron las interacciones de Cost de este mes para tu empresa. "
                   "Vuelven a estar disponibles el primer día del próximo mes.",
        )


def verificar_tope_voz(conn, usuario) -> None:
    tope = tope_voz_creditos(conn, usuario)
    gasto = _gasto_mes_creditos(conn, usuario["empresa_id"], "elevenlabs_voz")
    if gasto >= tope * _TOPE_GRACIA:
        raise HTTPException(
            status_code=429,
            detail="Se acabaron los minutos de voz de este mes para tu empresa. "
                   "Vuelven a estar disponibles el primer día del próximo mes.",
        )


# ── Resumen amigable para el taller ("te quedan aproximadamente X...") ──────

def resumen_consumo(conn, usuario) -> dict:
    tope_gemini = tope_gemini_cop(conn, usuario)
    gasto_gemini = _gasto_mes_cop(conn, usuario["empresa_id"], "gemini_cost")
    costo_conv_cop = _COSTO_PROMEDIO_CONVERSACION_USD * TRM_COP_USD
    restante_cop = max(tope_gemini - gasto_gemini, 0)
    interacciones_restantes = int(restante_cop // costo_conv_cop) if costo_conv_cop else 0

    tope_voz = tope_voz_creditos(conn, usuario)
    gasto_voz = _gasto_mes_creditos(conn, usuario["empresa_id"], "elevenlabs_voz")
    restante_creditos = max(tope_voz - gasto_voz, 0)
    minutos_restantes = round(restante_creditos / _CREDITOS_POR_MINUTO, 1) if _CREDITOS_POR_MINUTO else 0

    return {
        "cost": {
            "restante_estimado": interacciones_restantes,
            "unidad": "interacciones",
            "porcentaje_usado": round(gasto_gemini / tope_gemini * 100, 1) if tope_gemini else 100.0,
        },
        "voz": {
            "restante_estimado": minutos_restantes,
            "unidad": "minutos",
            "porcentaje_usado": round(gasto_voz / tope_voz * 100, 1) if tope_voz else 100.0,
        },
    }
