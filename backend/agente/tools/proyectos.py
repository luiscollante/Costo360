"""
Herramientas del agente sobre el dominio de Proyectos — piloto del
Objetivo 5, Ciclo 1. Cada handler reutiliza `services/proyectos_service.py`
(la MISMA lógica que usa el router HTTP normal) — nunca reimplementa una
validación ni una regla de negocio por su cuenta.
"""
from fastapi import HTTPException
from google.genai import types as gtypes

from backend.agente import confirmations
from backend.agente.registry import ToolSpec, registrar
from backend.models.proyectos import TareaIn
from backend.services import proyectos_service


def _listar_tareas(conn, usuario: dict, args: dict) -> dict:
    project_id = args.get("project_id")
    if not isinstance(project_id, int):
        return {"error": "project_id debe ser un número entero"}
    try:
        tareas = proyectos_service.listar_tareas(conn, project_id)
    except HTTPException as e:
        return {"error": e.detail}
    return {"tareas": tareas}


registrar(ToolSpec(
    nombre="proyectos_listar_tareas",
    declaracion=gtypes.FunctionDeclaration(
        name="proyectos_listar_tareas",
        description="Lista las tareas de un proyecto de Costo360, con su estado, prioridad y responsable.",
        parameters={
            "type": "OBJECT",
            "properties": {"project_id": {"type": "INTEGER", "description": "id numérico del proyecto"}},
            "required": ["project_id"],
        },
    ),
    handler=_listar_tareas,
    es_destructiva=False,
))


def _crear_tarea(conn, usuario: dict, args: dict) -> dict:
    project_id = args.get("project_id")
    titulo = (args.get("titulo") or "").strip()
    if not isinstance(project_id, int) or not titulo:
        return {"error": "Se necesita project_id (entero) y un título no vacío"}
    try:
        body = TareaIn(
            titulo=titulo,
            descripcion=args.get("descripcion") or "",
            prioridad=args.get("prioridad") or "media",
        )
    except Exception:
        return {"error": "prioridad inválida — usa baja, media, alta o urgente"}
    try:
        tarea = proyectos_service.crear_tarea(conn, usuario, project_id, body)
    except HTTPException as e:
        return {"error": e.detail}
    return {"tarea_creada": tarea}


registrar(ToolSpec(
    nombre="proyectos_crear_tarea",
    declaracion=gtypes.FunctionDeclaration(
        name="proyectos_crear_tarea",
        description=(
            "Crea una tarea nueva dentro de un proyecto existente de Costo360. "
            "Solo lo puede hacer un usuario con rol de administración o gerencia."
        ),
        parameters={
            "type": "OBJECT",
            "properties": {
                "project_id": {"type": "INTEGER", "description": "id numérico del proyecto"},
                "titulo": {"type": "STRING", "description": "título corto de la tarea"},
                "descripcion": {"type": "STRING", "description": "descripción opcional"},
                "prioridad": {"type": "STRING", "enum": ["baja", "media", "alta", "urgente"]},
            },
            "required": ["project_id", "titulo"],
        },
    ),
    handler=_crear_tarea,
    es_destructiva=False,
    requiere_capacidad="puede_ver_dashboard",  # proxy de "es gestor" (misma regla que ensure_gestor)
))


def _preparar_borrar_tarea(conn, usuario: dict, args: dict) -> dict:
    """SOLO lee y propone — nunca borra. La tool no tiene forma de ejecutar
    el borrado real; eso vive en `_confirmar_borrar_tarea`, alcanzable
    únicamente desde el endpoint HTTP de confirmación."""
    tarea_id = args.get("tarea_id")
    if not isinstance(tarea_id, int):
        return {"error": "tarea_id debe ser un número entero"}
    try:
        proyectos_service.ensure_gestor(usuario)
    except HTTPException as e:
        return {"error": e.detail}
    cur = conn.cursor()
    cur.execute("select id, titulo, project_id from pm_tasks where id = %s", (tarea_id,))
    row = cur.fetchone()
    cur.close()
    if row is None:
        return {"error": f"No existe ninguna tarea con id {tarea_id} en este taller"}
    fila = {"tipo": "tarea", "id": row[0], "titulo": row[1], "project_id": row[2]}
    propuesta = confirmations.crear_propuesta(
        conn, usuario,
        herramienta="proyectos_borrar_tarea",
        payload={"tarea_id": tarea_id},
        filas_afectadas=[fila],
        es_destructiva=True,
    )
    return {
        "propuesta_creada": propuesta,
        "aviso_para_ti": (
            "Ya quedó preparada la propuesta. Dile al usuario que revise la "
            "tarjeta de confirmación antes de decidir — tú NUNCA puedes "
            "confirmar ni ejecutar el borrado por tu cuenta."
        ),
    }


def _confirmar_borrar_tarea(conn, usuario: dict, payload: dict) -> dict:
    """Invocado EXCLUSIVAMENTE por `agente/confirmations.py::confirmar_propuesta`
    (a su vez, solo alcanzable desde el endpoint HTTP de confirmación).
    `proyectos_service.borrar_tarea` vuelve a leer la tarea bajo esta misma
    conexión antes de tocarla (re-verificación real, no ciega al snapshot)."""
    tarea = proyectos_service.borrar_tarea(
        conn, usuario, payload["tarea_id"],
        metadata_extra={"origen": "agente"},
    )
    return {"tarea_borrada": tarea}


registrar(ToolSpec(
    nombre="proyectos_borrar_tarea",
    declaracion=gtypes.FunctionDeclaration(
        name="proyectos_borrar_tarea",
        description=(
            "Prepara el borrado de una tarea de un proyecto de Costo360. "
            "NUNCA borra de inmediato: crea una propuesta que el usuario debe "
            "confirmar explícitamente en la pantalla. Solo gestores."
        ),
        parameters={
            "type": "OBJECT",
            "properties": {"tarea_id": {"type": "INTEGER", "description": "id numérico de la tarea a borrar"}},
            "required": ["tarea_id"],
        },
    ),
    handler=_preparar_borrar_tarea,
    es_destructiva=True,
    requiere_capacidad="puede_ver_dashboard",
    handler_confirmar=_confirmar_borrar_tarea,
))
