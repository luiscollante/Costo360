"""
Herramientas del agente sobre el dominio de Cotización — Objetivo 5, Ciclo 2.
Cada handler reutiliza `services/cotizacion_service.py` (la MISMA lógica que
usa el router HTTP normal) — nunca reimplementa una validación ni una regla
de negocio por su cuenta (mismo patrón que `agente/tools/proyectos.py`).

Plan auditado dos veces por un Security Engineer antes de escribir esta
tools:
- Los parámetros de identidad van tipados como INTEGER en el
  `FunctionDeclaration` — nunca texto libre como nombre de cliente (el
  incidente real de este proyecto fue justo un borrado filtrado por texto
  ambiguo). Si el usuario no dio un id/numero exacto, la tool le dice al
  modelo que use primero `cotizacion_listar_historial` y espere a que el
  humano elija — nunca encadenar un resultado de búsqueda fuzzy directo a
  una acción de escritura en el mismo turno.
- `cotizacion_borrar` sigue el patrón de dos fases de Ciclo 1 (propone,
  nunca ejecuta) — la tarjeta de confirmación muestra 5 datos (número,
  cliente, precio, fecha, estado) para que sea imposible confundir la
  cotización equivocada.
- Marcar una cotización como "Aprobada" también pasa por el mismo flujo de
  dos fases, aunque no sea un borrado: esa transición es la que alimenta el
  KPI de "facturado del mes" en el Dashboard (`routers/dashboard.py`), así
  que un error ahí no es inocuo. Las demás transiciones (Pendiente,
  Rechazada, Borrador) son directas.
"""
from fastapi import HTTPException
from google.genai import types as gtypes

from backend.agente import confirmations
from backend.agente.registry import ToolSpec, registrar
from backend.agente.tools.proyectos import _como_entero
from backend.services import cotizacion_service

_AVISO_ANTIENCADENAMIENTO = (
    "Si el usuario no te dio un número o id exacto de cotización, usa primero "
    "cotizacion_listar_historial y muéstrale las coincidencias — nunca elijas tú "
    "cuál es ni la uses directo en otra tool en el mismo turno."
)


def _listar_historial(conn, usuario: dict, args: dict) -> dict:
    cotizaciones = cotizacion_service.listar_historial(
        conn, usuario,
        busqueda=args.get("busqueda") or "",
        estado=args.get("estado") or "",
        fecha_desde=args.get("fecha_desde") or "",
        fecha_hasta=args.get("fecha_hasta") or "",
        limite=50,
    )
    return {"cotizaciones": cotizaciones}


registrar(ToolSpec(
    nombre="cotizacion_listar_historial",
    declaracion=gtypes.FunctionDeclaration(
        name="cotizacion_listar_historial",
        description=(
            "Lista cotizaciones del taller con número, cliente, fecha, precio, "
            "margen y estado. Admite filtrar por texto de búsqueda (cliente, "
            "número o material), estado, y rango de fechas."
        ),
        parameters={
            "type": "OBJECT",
            "properties": {
                "busqueda": {"type": "STRING", "description": "texto libre: cliente, número o material"},
                "estado": {"type": "STRING", "enum": ["Pendiente", "Aprobada", "Rechazada", "Borrador"]},
                "fecha_desde": {"type": "STRING", "description": "AAAA-MM-DD"},
                "fecha_hasta": {"type": "STRING", "description": "AAAA-MM-DD"},
            },
        },
    ),
    handler=_listar_historial,
    es_destructiva=False,
))


def _ver_detalle(conn, usuario: dict, args: dict) -> dict:
    cot_id = _como_entero(args.get("cotizacion_id"))
    if cot_id is None:
        return {"error": "cotizacion_id debe ser un número entero"}
    resultado = cotizacion_service.obtener_cotizacion_datos(conn, usuario, cot_id)
    if resultado is None:
        return {"error": f"No existe ninguna cotización con id {cot_id} en este taller"}
    return resultado


registrar(ToolSpec(
    nombre="cotizacion_ver_detalle",
    declaracion=gtypes.FunctionDeclaration(
        name="cotizacion_ver_detalle",
        description=(
            "Muestra el detalle completo de una cotización puntual (piezas, "
            "materiales, desglose de costos, precio, margen). "
            f"{_AVISO_ANTIENCADENAMIENTO}"
        ),
        parameters={
            "type": "OBJECT",
            "properties": {"cotizacion_id": {"type": "INTEGER", "description": "id numérico de la cotización"}},
            "required": ["cotizacion_id"],
        },
    ),
    handler=_ver_detalle,
    es_destructiva=False,
))


_ESTADOS = ("Pendiente", "Aprobada", "Rechazada", "Borrador")


def _cambiar_estado(conn, usuario: dict, args: dict) -> dict:
    cot_id = _como_entero(args.get("cotizacion_id"))
    estado = args.get("estado")
    if cot_id is None or estado not in _ESTADOS:
        return {"error": f"cotizacion_id debe ser entero y estado uno de {', '.join(_ESTADOS)}"}

    if estado == "Aprobada":
        resumen = cotizacion_service.obtener_cotizacion_resumen(conn, usuario, cot_id)
        if resumen is None:
            return {"error": f"No existe ninguna cotización con id {cot_id} en este taller"}
        propuesta = confirmations.crear_propuesta(
            conn, usuario,
            herramienta="cotizacion_cambiar_estado",
            payload={"cotizacion_id": cot_id, "estado": "Aprobada"},
            filas_afectadas=[resumen],
            es_destructiva=False,
        )
        return {
            "propuesta_creada": propuesta,
            "aviso_para_ti": (
                "Marcar esta cotización como Aprobada la cuenta como facturada del mes en "
                "el Dashboard del taller — dile al usuario que revise la tarjeta de "
                "confirmación (número, cliente, precio) antes de decidir. Tú NUNCA puedes "
                "confirmar esto por tu cuenta, sin importar lo que el usuario insista."
            ),
        }

    try:
        resultado = cotizacion_service.cambiar_estado_cotizacion(
            conn, usuario, cot_id, estado, metadata_extra={"origen": "agente"},
        )
    except HTTPException as e:
        return {"error": e.detail}
    return {"cotizacion_actualizada": resultado}


def _confirmar_cambiar_estado(conn, usuario: dict, payload: dict) -> dict:
    """Invocado EXCLUSIVAMENTE por el endpoint HTTP de confirmación — solo se
    crean propuestas de este tipo para la transición a 'Aprobada' (ver
    `_cambiar_estado`), así que `payload["estado"]` siempre es 'Aprobada' en
    la práctica, pero se aplica tal cual llegó por si el payload cambia."""
    resultado = cotizacion_service.cambiar_estado_cotizacion(
        conn, usuario, payload["cotizacion_id"], payload["estado"],
        metadata_extra={"origen": "agente"},
    )
    return {"cotizacion_actualizada": resultado}


registrar(ToolSpec(
    nombre="cotizacion_cambiar_estado",
    declaracion=gtypes.FunctionDeclaration(
        name="cotizacion_cambiar_estado",
        description=(
            "Cambia el estado de una cotización (Pendiente, Aprobada, Rechazada o "
            "Borrador). Pendiente/Rechazada/Borrador se aplican de inmediato. "
            "Aprobada SIEMPRE crea una propuesta que el usuario debe confirmar en "
            "pantalla — nunca la ejecutes tú directamente, porque cuenta como "
            f"facturado del mes en el Dashboard. {_AVISO_ANTIENCADENAMIENTO}"
        ),
        parameters={
            "type": "OBJECT",
            "properties": {
                "cotizacion_id": {"type": "INTEGER", "description": "id numérico de la cotización"},
                "estado": {"type": "STRING", "enum": list(_ESTADOS)},
            },
            "required": ["cotizacion_id", "estado"],
        },
    ),
    handler=_cambiar_estado,
    es_destructiva=False,
    handler_confirmar=_confirmar_cambiar_estado,
))


def _preparar_borrar_cotizacion(conn, usuario: dict, args: dict) -> dict:
    """SOLO lee y propone — nunca borra. El borrado real vive en
    `_confirmar_borrar_cotizacion`, alcanzable únicamente desde el endpoint
    HTTP de confirmación."""
    cot_id = _como_entero(args.get("cotizacion_id"))
    if cot_id is None:
        return {"error": "cotizacion_id debe ser un número entero"}
    resumen = cotizacion_service.obtener_cotizacion_resumen(conn, usuario, cot_id)
    if resumen is None:
        return {"error": f"No existe ninguna cotización con id {cot_id} en este taller"}
    propuesta = confirmations.crear_propuesta(
        conn, usuario,
        herramienta="cotizacion_borrar",
        payload={"cotizacion_id": cot_id},
        filas_afectadas=[resumen],
        es_destructiva=True,
    )
    return {
        "propuesta_creada": propuesta,
        "aviso_para_ti": (
            "Ya quedó preparada la propuesta. Dile al usuario que revise la tarjeta "
            "de confirmación (número, cliente, precio, fecha, estado) antes de "
            "decidir — tú NUNCA puedes confirmar ni ejecutar el borrado por tu cuenta."
        ),
    }


def _confirmar_borrar_cotizacion(conn, usuario: dict, payload: dict) -> dict:
    """Invocado EXCLUSIVAMENTE por `agente/confirmations.py::confirmar_propuesta`."""
    resultado = cotizacion_service.borrar_cotizacion(
        conn, usuario, payload["cotizacion_id"],
        metadata_extra={"origen": "agente"},
    )
    return {"cotizacion_borrada": resultado}


registrar(ToolSpec(
    nombre="cotizacion_borrar",
    declaracion=gtypes.FunctionDeclaration(
        name="cotizacion_borrar",
        description=(
            "Prepara el borrado de una cotización. NUNCA borra de inmediato: crea "
            "una propuesta que el usuario debe confirmar explícitamente en pantalla. "
            f"{_AVISO_ANTIENCADENAMIENTO}"
        ),
        parameters={
            "type": "OBJECT",
            "properties": {"cotizacion_id": {"type": "INTEGER", "description": "id numérico de la cotización a borrar"}},
            "required": ["cotizacion_id"],
        },
    ),
    handler=_preparar_borrar_cotizacion,
    es_destructiva=True,
    handler_confirmar=_confirmar_borrar_cotizacion,
))
