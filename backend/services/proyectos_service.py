"""
Servicio de Proyectos — lógica de negocio compartida entre el router HTTP
normal (`routers/proyectos.py`) y el Agente de IA (Objetivo 5, Ciclo 1).

Extraído de `routers/proyectos.py` sin cambiar una sola línea de lógica —
solo se movió de "función anidada en el router" a "función de módulo que
recibe `conn`/`usuario` como parámetro". El router pasa a ser un adaptador
delgado sobre estas funciones (ver `routers/proyectos.py`).

Por qué existe este archivo (decisión de arquitectura del Objetivo 5,
auditada en Fase 2): el Agente de IA reutiliza esta MISMA lógica en vez de
reimplementarla, para que cualquier regla de negocio nueva que se agregue
aquí (una validación, un chequeo de permiso) se aplique automáticamente
también al agente, sin que nadie tenga que acordarse de replicarla en dos
sitios. La propagación de RLS no depende de este archivo: depende de que
quien llame a estas funciones pase una `conn` que ya salió de `db_rls`/
`rls_connection` con el JWT del usuario real — nunca `db_service`.
"""
from fastapi import HTTPException

from backend.models.proyectos import TareaIn
from backend.services.audit_service import log_accion


def _f(v):
    return float(v) if v is not None else None


def _d(v):
    return v.isoformat() if v is not None else None


_TAREA_COLS = ("id,project_id,titulo,descripcion,estado,prioridad,responsable_id,"
               "fecha_limite,horas_estimadas,milestone_id,orden,created_at,updated_at")


def _tarea_row(r) -> dict:
    return {
        "id": r[0], "project_id": r[1], "titulo": r[2], "descripcion": r[3],
        "estado": r[4], "prioridad": r[5], "responsable_id": str(r[6]) if r[6] else None,
        "fecha_limite": _d(r[7]), "horas_estimadas": _f(r[8]), "milestone_id": r[9],
        "orden": r[10],
        "created_at": r[11].isoformat() if r[11] else None,
        "updated_at": r[12].isoformat() if r[12] else None,
    }


def es_gestor(usuario) -> bool:
    return bool(usuario.get("puede_ver_dashboard"))


def ensure_gestor(usuario) -> None:
    if not es_gestor(usuario):
        raise HTTPException(status_code=403,
                            detail="Requiere rol de administración o gerencia")


def recalc_progreso(conn, project_id: int) -> None:
    """Recalcula el % de avance del proyecto. Propaga excepciones — es lógica
    central, no puede fallar en silencio (hallazgo S10). NO toca commit/rollback."""
    cur = conn.cursor()
    cur.execute(
        "select count(*), count(*) filter (where estado = 'completada') "
        "from pm_tasks where project_id = %s",
        (project_id,),
    )
    total, hechas = cur.fetchone()
    pct = round(hechas * 100 / total) if total else 0
    cur.execute(
        "update pm_projects set tareas_total = %s, tareas_hechas = %s, progreso_pct = %s "
        "where id = %s",
        (total, hechas, pct, project_id),
    )
    cur.close()


def tarea_para_editar(conn, tarea_id: int) -> dict:
    """Carga la tarea con FOR UPDATE (evalúa el permiso contra la BD, no contra
    el payload — hallazgo S1). RLS ya la acota a la empresa. 404 si no existe."""
    cur = conn.cursor()
    cur.execute(
        "select id, project_id, responsable_id, estado from pm_tasks where id = %s for update",
        (tarea_id,),
    )
    row = cur.fetchone()
    cur.close()
    if row is None:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    return {"id": row[0], "project_id": row[1],
            "responsable_id": str(row[2]) if row[2] else None, "estado": row[3]}


def puede_editar_tarea(usuario, tarea) -> bool:
    return es_gestor(usuario) or tarea["responsable_id"] == usuario["id"]


# ── Las 3 acciones del piloto del Agente de IA (Ciclo 1) ────────────────────

def listar_tareas(conn, project_id: int, limite: int = 500) -> list[dict]:
    cur = conn.cursor()
    cur.execute(f"select {_TAREA_COLS} from pm_tasks where project_id = %s "
                f"order by orden asc, id asc limit {limite}", (project_id,))
    rows = cur.fetchall()
    cur.close()
    return [_tarea_row(r) for r in rows]


def crear_tarea(conn, usuario: dict, project_id: int, body: TareaIn) -> dict:
    ensure_gestor(usuario)  # hallazgo S2: crear tareas = solo gestor
    cur = conn.cursor()
    cur.execute("select 1 from pm_projects where id = %s", (project_id,))
    if cur.fetchone() is None:
        cur.close()
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    estado = "por_hacer"
    if body.milestone_id is not None:
        cur.execute("select estado from pm_milestones where id = %s and project_id = %s",
                    (body.milestone_id, project_id))
        m = cur.fetchone()
        if m is None:
            cur.close()
            raise HTTPException(status_code=400, detail="El hito no pertenece a este proyecto")
        if m[0] != "completado":
            estado = "bloqueada"

    if body.responsable_id is not None:
        cur.execute("select 1 from usuarios where id = %s and activo = true", (body.responsable_id,))
        if cur.fetchone() is None:
            cur.close()
            raise HTTPException(status_code=400, detail="El responsable no pertenece a este taller")

    cur.execute("select coalesce(max(orden) + 1, 0) from pm_tasks where project_id = %s", (project_id,))
    orden = cur.fetchone()[0]

    cur.execute(
        "insert into pm_tasks "
        "(empresa_id, project_id, titulo, descripcion, estado, prioridad, "
        " responsable_id, fecha_limite, horas_estimadas, milestone_id, orden) "
        "values (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) returning " + _TAREA_COLS,
        (usuario["empresa_id"], project_id, body.titulo, body.descripcion, estado,
         body.prioridad, body.responsable_id, body.fecha_limite, body.horas_estimadas,
         body.milestone_id, orden),
    )
    row = cur.fetchone()
    cur.close()
    recalc_progreso(conn, project_id)
    return _tarea_row(row)


def borrar_tarea(conn, usuario: dict, tarea_id: int, *, ip: str = None,
                 metadata_extra: dict | None = None) -> dict:
    """Devuelve la tarea borrada (para que el llamador —router o agente— pueda
    mostrarla/loguearla). `metadata_extra` permite al agente marcar el origen
    de la acción (`{"origen": "agente", "propuesta_id": ...}`) sin cambiar el
    camino que ya usa el router HTTP normal."""
    ensure_gestor(usuario)
    tarea = tarea_para_editar(conn, tarea_id)
    cur = conn.cursor()
    cur.execute("delete from pm_tasks where id = %s", (tarea_id,))
    cur.close()
    recalc_progreso(conn, tarea["project_id"])
    metadata = {"tarea_id": tarea_id, "project_id": tarea["project_id"]}
    if metadata_extra:
        metadata.update(metadata_extra)
    log_accion(conn, "PM_TAREA_DELETE", metadata,
               empresa_id=usuario["empresa_id"], usuario_id=usuario["id"], ip=ip)
    return tarea
