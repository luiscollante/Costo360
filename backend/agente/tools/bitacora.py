"""
Herramientas del agente sobre su propia Bóveda — Objetivo 5, Ciclo 3
(rediseño tras la revisión en vivo del fundador).

Dos tools, ninguna alcanzable sin pasar por el patrón de seguridad ya
establecido en todo el proyecto:
- `agente_bitacora_consultar`: solo lectura, acotada (nunca vuelca el
  historial completo al contexto — el modelo consulta bajo demanda, nunca
  se le inyecta esto en cada turno).
- `agente_bitacora_deshacer`: SIEMPRE crea una propuesta de dos fases —
  "deshacer" cambia un valor real, así que lleva la misma tarjeta de
  confirmación que cualquier otra escritura sensible del sistema. El humano
  confirma, y solo entonces `bitacora.deshacer_accion` (ya auditada) se
  ejecuta de verdad. El modelo nunca tiene ninguna forma de deshacer algo
  sin ese clic explícito.
"""
from google.genai import types as gtypes

from backend.agente import bitacora, confirmations
from backend.agente.registry import ToolSpec, registrar
from backend.agente.tools.proyectos import _como_entero

_AVISO_AMBIGUEDAD = (
    "Si el usuario pide deshacer algo de forma ambigua ('lo último', 'ese cambio') y "
    "agente_bitacora_consultar te muestra más de una acción reciente que podría ser esa, "
    "muéstraselas TODAS con su fecha y qué cambiaron, y esperá a que el humano te diga cuál "
    "— nunca elijas vos ni encadenes directo a agente_bitacora_deshacer en el mismo turno."
)


def _consultar(conn, usuario: dict, args: dict) -> dict:
    dias_atras = _como_entero(args.get("dias_atras")) or 7
    limite = _como_entero(args.get("limite")) or 10
    herramienta = args.get("herramienta") or None
    return bitacora.consultar(conn, usuario, dias_atras, herramienta, limite)


registrar(ToolSpec(
    nombre="agente_bitacora_consultar",
    declaracion=gtypes.FunctionDeclaration(
        name="agente_bitacora_consultar",
        description=(
            "Busca en TU PROPIA bitácora (la Bóveda) qué acciones ejecutaste de verdad para "
            "este usuario — úsala cuando pregunte algo como '¿qué cambiaste ayer?', '¿qué "
            "hiciste con la tarifa de X?', o ANTES de intentar deshacer algo (para encontrar "
            "el historial_id exacto). NUNCA inventes ni 'recuerdes' de memoria qué hiciste en "
            "un turno anterior — si no estás seguro, consultá esta tool primero. Cada taller "
            "solo guarda su historial por un número limitado de días según su plan; si no "
            "encontrás algo, puede que ya haya expirado. " + _AVISO_AMBIGUEDAD
        ),
        parameters={
            "type": "OBJECT",
            "properties": {
                "dias_atras": {"type": "INTEGER", "description": "cuántos días hacia atrás buscar (por defecto 7)"},
                "herramienta": {"type": "STRING", "description": "opcional: nombre técnico exacto de una herramienta para filtrar, si lo sabés"},
                "limite": {"type": "INTEGER", "description": "máximo de resultados (por defecto 10)"},
            },
        },
    ),
    handler=_consultar,
    es_destructiva=False,
))


def _preparar_deshacer(conn, usuario: dict, args: dict) -> dict:
    historial_id = args.get("historial_id")
    if not historial_id:
        return {"error": "Necesito el historial_id exacto — usá primero agente_bitacora_consultar para encontrarlo, nunca lo inventes ni lo aceptes como texto libre del usuario."}

    fila = bitacora.obtener_fila(conn, usuario, historial_id)
    if fila is None:
        return {"error": "No encontré ninguna acción tuya con ese id"}
    if fila["deshecha_en"] is not None:
        return {"error": "Esa acción ya se había deshecho antes"}
    if not fila["es_deshacible"]:
        return {"error": "Esa acción no se puede deshacer (fue una creación o un borrado, no la edición de un valor existente)"}

    resumen = dict(fila["filas_afectadas"][0]) if fila["filas_afectadas"] else {}
    resumen["herramienta"] = fila["herramienta"]
    resumen["fecha_original"] = fila["creado_en"].isoformat()

    propuesta = confirmations.crear_propuesta(
        conn, usuario,
        herramienta="agente_bitacora_deshacer",
        payload={"historial_id": historial_id},
        filas_afectadas=[resumen],
        es_destructiva=False,
    )
    return {
        "propuesta_creada": propuesta,
        "aviso_para_ti": (
            "Muéstrale al usuario exactamente qué se revertiría (el campo, el valor actual y "
            "al que volvería) antes de que decida. Tú NUNCA puedes confirmar esto por tu cuenta."
        ),
    }


def _confirmar_deshacer(conn, usuario: dict, payload: dict) -> dict:
    return bitacora.deshacer_accion(conn, usuario, payload["historial_id"])


registrar(ToolSpec(
    nombre="agente_bitacora_deshacer",
    declaracion=gtypes.FunctionDeclaration(
        name="agente_bitacora_deshacer",
        description=(
            "Prepara deshacer una acción anterior tuya (una edición de campo, nunca una "
            "creación ni un borrado) — SIEMPRE crea una propuesta que el usuario debe "
            "confirmar en pantalla, nunca la ejecuta de inmediato. Necesitás el historial_id "
            "exacto de agente_bitacora_consultar, llamada en este mismo turno — nunca lo "
            "inventes ni asumas cuál es. " + _AVISO_AMBIGUEDAD
        ),
        parameters={
            "type": "OBJECT",
            "properties": {
                "historial_id": {"type": "STRING", "description": "id exacto obtenido de agente_bitacora_consultar"},
            },
            "required": ["historial_id"],
        },
    ),
    handler=_preparar_deshacer,
    es_destructiva=False,
    handler_confirmar=_confirmar_deshacer,
))
