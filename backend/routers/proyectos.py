"""
Módulo de gestión de proyectos — Objetivo 6 / Fase 2.D (Ciclo A, bloque G1).

CRUD de proyectos, hitos, tareas, registro de horas, comentarios y
notificaciones. Todo bajo `db_rls` (RLS aísla por taller) + `get_current_user`,
con `verificar_dispositivo` a nivel de router.

Aislamiento jerárquico interno (D6 — "el operativo ve todo, edita solo lo suyo"):
- gestor = `admin` / `gerencia` (capacidad `puede_ver_dashboard`): crea/edita/
  borra proyectos, mueve el Kanban de proyectos, crea/edita/completa hitos,
  edita/borra cualquier tarea, borra horas/comentarios de cualquiera.
- no-gestor (`operativo`): ve todo; solo puede editar/mover tareas donde es
  `responsable_id`, registrar sus horas en esas tareas, comentar cualquier
  tarea, y autoasignarse una tarea SIN responsable.

El barrido diario de automatizaciones va en `routers/proyectos_cron.py` (bloque
G2), en un router aparte SIN dependencias de sesión (hallazgo S7).
"""
import re
from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from backend.db.client import db_rls
from backend.db.deps import verificar_dispositivo
from backend.middleware.auth import get_current_user
from backend.models.proyectos import (
    ProyectoIn, ProyectoUpdate, EstadoProyectoIn,
    HitoIn, HitoUpdate, EstadoHitoIn,
    TareaIn, TareaUpdate, TareaMoverIn, ResponsableIn,
    HoraIn, ComentarioIn,
)
from backend.services.audit_service import log_accion

router = APIRouter(prefix="/api/proyectos", tags=["proyectos"],
                   dependencies=[Depends(verificar_dispositivo)])

_UUID_RE = r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"

# ORDER BY solo desde lista blanca (hallazgo S9) — nunca interpolando valor del cliente.
_ORDEN_PROYECTOS = {
    "reciente": "updated_at desc",
    "entrega":  "fecha_fin asc nulls last, updated_at desc",
    "avance":   "progreso_pct desc, updated_at desc",
    "nombre":   "nombre asc",
}


# ── Helpers ─────────────────────────────────────────────────────────────────

def _es_gestor(usuario) -> bool:
    return bool(usuario.get("puede_ver_dashboard"))


def _ensure_gestor(usuario) -> None:
    if not _es_gestor(usuario):
        raise HTTPException(status_code=403,
                            detail="Requiere rol de administración o gerencia")


def _f(v):
    return float(v) if isinstance(v, Decimal) else v


def _d(v):
    return v.isoformat() if isinstance(v, date) else v


def _proyecto_row(r) -> dict:
    return {
        "id": r[0], "nombre": r[1], "descripcion": r[2], "cliente": r[3],
        "material": r[4], "estado": r[5], "fecha_inicio": _d(r[6]),
        "fecha_fin": _d(r[7]), "progreso_pct": r[8], "tareas_total": r[9],
        "tareas_hechas": r[10], "archivado": r[11], "en_riesgo": r[12],
        "created_at": r[13].isoformat() if r[13] else None,
        "updated_at": r[14].isoformat() if r[14] else None,
    }


_PROY_COLS = ("id,nombre,descripcion,cliente,material,estado,fecha_inicio,fecha_fin,"
              "progreso_pct,tareas_total,tareas_hechas,archivado,en_riesgo,created_at,updated_at")


def _hito_row(r) -> dict:
    return {
        "id": r[0], "project_id": r[1], "titulo": r[2], "descripcion": r[3],
        "fecha_inicio": _d(r[4]), "fecha_limite": _d(r[5]), "estado": r[6],
        "created_at": r[7].isoformat() if r[7] else None,
        "updated_at": r[8].isoformat() if r[8] else None,
    }


_HITO_COLS = "id,project_id,titulo,descripcion,fecha_inicio,fecha_limite,estado,created_at,updated_at"


def _tarea_row(r) -> dict:
    return {
        "id": r[0], "project_id": r[1], "titulo": r[2], "descripcion": r[3],
        "estado": r[4], "prioridad": r[5], "responsable_id": str(r[6]) if r[6] else None,
        "fecha_limite": _d(r[7]), "horas_estimadas": _f(r[8]), "milestone_id": r[9],
        "orden": r[10],
        "created_at": r[11].isoformat() if r[11] else None,
        "updated_at": r[12].isoformat() if r[12] else None,
    }


_TAREA_COLS = ("id,project_id,titulo,descripcion,estado,prioridad,responsable_id,"
               "fecha_limite,horas_estimadas,milestone_id,orden,created_at,updated_at")


def _hora_row(r) -> dict:
    return {"id": r[0], "task_id": r[1], "project_id": r[2],
            "usuario_id": str(r[3]) if r[3] else None, "user_name": r[4],
            "horas": _f(r[5]), "fecha": _d(r[6]), "nota": r[7],
            "created_at": r[8].isoformat() if r[8] else None}


def _recalc_progreso(conn, project_id: int) -> None:
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


def _tarea_para_editar(conn, tarea_id: int):
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


def _puede_editar_tarea(usuario, tarea) -> bool:
    return _es_gestor(usuario) or tarea["responsable_id"] == usuario["id"]


# ── /resumen — franja de la cabecera del tablero (hallazgo U11) ──────────────

@router.get("/resumen")
def resumen(conn=Depends(db_rls), _usuario=Depends(get_current_user)):
    cur = conn.cursor()
    cur.execute(
        "select "
        " (select count(*) from pm_projects where estado = 'activo'),"
        " (select count(*) from pm_tasks where estado = 'en_progreso'),"
        " (select coalesce(sum(horas), 0) from pm_time_entries)"
    )
    activos, en_progreso, horas = cur.fetchone()
    cur.close()
    return {"proyectos_activos": activos, "tareas_en_progreso": en_progreso,
            "horas_registradas": _f(horas)}


# ── /usuarios — para el selector de responsable (Ciclo B) ────────────────────

@router.get("/usuarios")
def usuarios_del_taller(conn=Depends(db_rls), _usuario=Depends(get_current_user)):
    cur = conn.cursor()
    cur.execute(
        "select id, nombre_completo, cargo_visible, rol_codigo from usuarios "
        "where activo = true order by nombre_completo"
    )
    rows = cur.fetchall()
    cur.close()
    return [{"id": str(r[0]), "nombre": r[1] or "", "cargo": r[2], "rol": r[3]}
            for r in rows]


# ── Notificaciones ──────────────────────────────────────────────────────────

@router.get("/notificaciones")
def listar_notificaciones(conn=Depends(db_rls), _usuario=Depends(get_current_user)):
    cur = conn.cursor()
    cur.execute(
        "select id, titulo, mensaje, tipo, project_id, task_id, leida, created_at "
        "from pm_notifications order by leida asc, created_at desc limit 50"
    )
    rows = cur.fetchall()
    cur.close()
    return [{"id": r[0], "titulo": r[1], "mensaje": r[2], "tipo": r[3],
             "project_id": r[4], "task_id": r[5], "leida": r[6],
             "created_at": r[7].isoformat() if r[7] else None} for r in rows]


@router.patch("/notificaciones/leer-todas")
def marcar_todas_leidas(conn=Depends(db_rls), _usuario=Depends(get_current_user)):
    cur = conn.cursor()
    cur.execute("update pm_notifications set leida = true where leida = false")
    n = cur.rowcount
    cur.close()
    return {"marcadas": n}


@router.patch("/notificaciones/{notif_id}/leida")
def marcar_leida(notif_id: int, conn=Depends(db_rls), _usuario=Depends(get_current_user)):
    cur = conn.cursor()
    cur.execute("update pm_notifications set leida = true where id = %s returning id", (notif_id,))
    ok = cur.fetchone()
    cur.close()
    if not ok:
        raise HTTPException(status_code=404, detail="Notificación no encontrada")
    return {"ok": True}


# ── Tareas por id ───────────────────────────────────────────────────────────

_NO_GESTOR_WHITELIST = {"titulo", "descripcion", "estado", "prioridad", "orden",
                        "horas_estimadas", "fecha_limite"}


@router.put("/tareas/{tarea_id}")
def editar_tarea(tarea_id: int, body: TareaUpdate,
                 conn=Depends(db_rls), usuario=Depends(get_current_user)):
    tarea = _tarea_para_editar(conn, tarea_id)
    if not _puede_editar_tarea(usuario, tarea):
        raise HTTPException(status_code=403, detail="Solo puedes editar tus tareas asignadas")

    cambios = body.model_dump(exclude_unset=True)
    if not _es_gestor(usuario):
        prohibidos = set(cambios) - _NO_GESTOR_WHITELIST
        if prohibidos:
            raise HTTPException(
                status_code=403,
                detail=f"No puedes cambiar: {', '.join(sorted(prohibidos))}",
            )

    if not cambios:
        raise HTTPException(status_code=400, detail="Sin cambios")

    # milestone_id (solo gestor puede llegar aquí con él): validar pertenencia (S13).
    if "milestone_id" in cambios and cambios["milestone_id"] is not None:
        cur = conn.cursor()
        cur.execute("select 1 from pm_milestones where id = %s and project_id = %s",
                    (cambios["milestone_id"], tarea["project_id"]))
        if cur.fetchone() is None:
            cur.close()
            raise HTTPException(status_code=400, detail="El hito no pertenece a este proyecto")
        cur.close()

    sets, vals = [], []
    for campo, valor in cambios.items():
        sets.append(f"{campo} = %s")
        vals.append(valor)
    vals.append(tarea_id)
    cur = conn.cursor()
    cur.execute(f"update pm_tasks set {', '.join(sets)} where id = %s "
                f"returning {_TAREA_COLS}", vals)
    row = cur.fetchone()
    cur.close()
    if "estado" in cambios:
        _recalc_progreso(conn, tarea["project_id"])
    return _tarea_row(row)


@router.patch("/tareas/{tarea_id}")
def mover_tarea(tarea_id: int, body: TareaMoverIn,
                conn=Depends(db_rls), usuario=Depends(get_current_user)):
    tarea = _tarea_para_editar(conn, tarea_id)
    if not _puede_editar_tarea(usuario, tarea):
        raise HTTPException(status_code=403, detail="Solo puedes mover tus tareas asignadas")
    cur = conn.cursor()
    if body.orden is not None:
        cur.execute("update pm_tasks set estado = %s, orden = %s where id = %s returning "
                    + _TAREA_COLS, (body.estado, body.orden, tarea_id))
    else:
        cur.execute("update pm_tasks set estado = %s where id = %s returning "
                    + _TAREA_COLS, (body.estado, tarea_id))
    row = cur.fetchone()
    cur.close()
    _recalc_progreso(conn, tarea["project_id"])
    return _tarea_row(row)


@router.patch("/tareas/{tarea_id}/responsable")
def asignar_responsable(tarea_id: int, body: ResponsableIn,
                        conn=Depends(db_rls), usuario=Depends(get_current_user)):
    """Gestor: asigna a cualquier usuario del taller, o desasigna (None).
    No-gestor: solo puede autoasignarse (su propio id) y solo si la tarea está
    SIN responsable (hallazgo S1)."""
    tarea = _tarea_para_editar(conn, tarea_id)
    nuevo = body.responsable_id

    if not _es_gestor(usuario):
        if nuevo != usuario["id"]:
            raise HTTPException(status_code=403, detail="Solo puedes asignarte a ti mismo")
        if tarea["responsable_id"] is not None:
            raise HTTPException(status_code=403,
                                detail="La tarea ya tiene responsable")

    cur = conn.cursor()
    if nuevo is not None:
        if not re.match(_UUID_RE, nuevo):
            cur.close()
            raise HTTPException(status_code=422, detail="responsable_id inválido")
        cur.execute("select 1 from usuarios where id = %s and activo = true", (nuevo,))
        if cur.fetchone() is None:
            cur.close()
            raise HTTPException(status_code=400, detail="El usuario no pertenece a este taller")
    cur.execute("update pm_tasks set responsable_id = %s where id = %s returning " + _TAREA_COLS,
                (nuevo, tarea_id))
    row = cur.fetchone()
    cur.close()
    return _tarea_row(row)


@router.delete("/tareas/{tarea_id}", status_code=204)
def borrar_tarea(tarea_id: int, request: Request,
                 conn=Depends(db_rls), usuario=Depends(get_current_user)):
    _ensure_gestor(usuario)
    tarea = _tarea_para_editar(conn, tarea_id)
    cur = conn.cursor()
    cur.execute("delete from pm_tasks where id = %s", (tarea_id,))
    cur.close()
    _recalc_progreso(conn, tarea["project_id"])
    ip = request.client.host if request.client else None
    log_accion(conn, "PM_TAREA_DELETE", {"tarea_id": tarea_id, "project_id": tarea["project_id"]},
               empresa_id=usuario["empresa_id"], usuario_id=usuario["id"], ip=ip)


# ── Registro de horas ───────────────────────────────────────────────────────

@router.get("/tareas/{tarea_id}/horas")
def listar_horas_tarea(tarea_id: int, conn=Depends(db_rls), _usuario=Depends(get_current_user)):
    cur = conn.cursor()
    cur.execute("select id, task_id, project_id, usuario_id, user_name, horas, fecha, nota, created_at "
                "from pm_time_entries where task_id = %s order by fecha desc, id desc", (tarea_id,))
    rows = cur.fetchall()
    cur.close()
    return [_hora_row(r) for r in rows]


@router.post("/tareas/{tarea_id}/horas", status_code=201)
def registrar_horas(tarea_id: int, body: HoraIn,
                    conn=Depends(db_rls), usuario=Depends(get_current_user)):
    tarea = _tarea_para_editar(conn, tarea_id)
    if not _puede_editar_tarea(usuario, tarea):
        raise HTTPException(status_code=403,
                            detail="Solo puedes registrar horas en tus tareas asignadas")
    cur = conn.cursor()
    cur.execute(
        "insert into pm_time_entries "
        "(empresa_id, task_id, project_id, usuario_id, user_name, horas, fecha, nota) "
        "values (%s,%s,%s,%s,%s,%s,%s,%s) "
        "returning id, task_id, project_id, usuario_id, user_name, horas, fecha, nota, created_at",
        (usuario["empresa_id"], tarea_id, tarea["project_id"], usuario["id"],
         usuario["nombre_completo"], body.horas, body.fecha or date.today(), body.nota),
    )
    row = cur.fetchone()
    cur.close()
    return _hora_row(row)


@router.delete("/horas/{entry_id}", status_code=204)
def borrar_horas(entry_id: int, conn=Depends(db_rls), usuario=Depends(get_current_user)):
    cur = conn.cursor()
    cur.execute("select usuario_id from pm_time_entries where id = %s", (entry_id,))
    row = cur.fetchone()
    if row is None:
        cur.close()
        raise HTTPException(status_code=404, detail="Registro no encontrado")
    autor = str(row[0]) if row[0] else None
    if not _es_gestor(usuario) and autor != usuario["id"]:
        cur.close()
        raise HTTPException(status_code=403, detail="Solo puedes borrar tus registros")
    cur.execute("delete from pm_time_entries where id = %s", (entry_id,))
    cur.close()


# ── Comentarios ─────────────────────────────────────────────────────────────

@router.get("/tareas/{tarea_id}/comentarios")
def listar_comentarios(tarea_id: int, conn=Depends(db_rls), _usuario=Depends(get_current_user)):
    cur = conn.cursor()
    cur.execute("select id, task_id, autor_id, autor_nombre, contenido, created_at "
                "from pm_comments where task_id = %s order by created_at asc, id asc", (tarea_id,))
    rows = cur.fetchall()
    cur.close()
    return [{"id": r[0], "task_id": r[1], "autor_id": str(r[2]) if r[2] else None,
             "autor_nombre": r[3], "contenido": r[4],
             "created_at": r[5].isoformat() if r[5] else None} for r in rows]


@router.post("/tareas/{tarea_id}/comentarios", status_code=201)
def crear_comentario(tarea_id: int, body: ComentarioIn,
                     conn=Depends(db_rls), usuario=Depends(get_current_user)):
    cur = conn.cursor()
    cur.execute("select 1 from pm_tasks where id = %s", (tarea_id,))
    if cur.fetchone() is None:
        cur.close()
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    cur.execute(
        "insert into pm_comments (empresa_id, task_id, autor_id, autor_nombre, contenido) "
        "values (%s,%s,%s,%s,%s) "
        "returning id, task_id, autor_id, autor_nombre, contenido, created_at",
        (usuario["empresa_id"], tarea_id, usuario["id"],
         usuario["nombre_completo"], body.contenido),
    )
    r = cur.fetchone()
    cur.close()
    return {"id": r[0], "task_id": r[1], "autor_id": str(r[2]) if r[2] else None,
            "autor_nombre": r[3], "contenido": r[4],
            "created_at": r[5].isoformat() if r[5] else None}


@router.delete("/comentarios/{comentario_id}", status_code=204)
def borrar_comentario(comentario_id: int, conn=Depends(db_rls), usuario=Depends(get_current_user)):
    cur = conn.cursor()
    cur.execute("select autor_id from pm_comments where id = %s", (comentario_id,))
    row = cur.fetchone()
    if row is None:
        cur.close()
        raise HTTPException(status_code=404, detail="Comentario no encontrado")
    autor = str(row[0]) if row[0] else None
    if not _es_gestor(usuario) and autor != usuario["id"]:
        cur.close()
        raise HTTPException(status_code=403, detail="Solo puedes borrar tus comentarios")
    cur.execute("delete from pm_comments where id = %s", (comentario_id,))
    cur.close()


# ── Hitos por id ────────────────────────────────────────────────────────────

@router.put("/hitos/{hito_id}")
def editar_hito(hito_id: int, body: HitoUpdate,
                conn=Depends(db_rls), usuario=Depends(get_current_user)):
    _ensure_gestor(usuario)
    cambios = body.model_dump(exclude_unset=True)
    if not cambios:
        raise HTTPException(status_code=400, detail="Sin cambios")
    sets, vals = [], []
    for campo, valor in cambios.items():
        sets.append(f"{campo} = %s")
        vals.append(valor)
    vals.append(hito_id)
    cur = conn.cursor()
    cur.execute(f"update pm_milestones set {', '.join(sets)} where id = %s "
                f"returning {_HITO_COLS}", vals)
    row = cur.fetchone()
    cur.close()
    if row is None:
        raise HTTPException(status_code=404, detail="Hito no encontrado")
    return _hito_row(row)


@router.patch("/hitos/{hito_id}/estado")
def cambiar_estado_hito(hito_id: int, body: EstadoHitoIn,
                        conn=Depends(db_rls), usuario=Depends(get_current_user)):
    _ensure_gestor(usuario)
    cur = conn.cursor()
    cur.execute("select project_id, estado from pm_milestones where id = %s for update", (hito_id,))
    row = cur.fetchone()
    if row is None:
        cur.close()
        raise HTTPException(status_code=404, detail="Hito no encontrado")
    project_id, estado_actual = row
    cur.execute("update pm_milestones set estado = %s where id = %s returning " + _HITO_COLS,
                (body.estado, hito_id))
    hito = _hito_row(cur.fetchone())

    desbloqueadas = 0
    if body.estado == "completado" and estado_actual != "completado":
        cur.execute(
            "update pm_tasks set estado = 'por_hacer' "
            "where milestone_id = %s and estado = 'bloqueada' returning id",
            (hito_id,),
        )
        desbloqueadas = len(cur.fetchall())
    cur.close()
    if desbloqueadas:
        _recalc_progreso(conn, project_id)
    return {**hito, "tareas_desbloqueadas": desbloqueadas}


# ── Proyectos ───────────────────────────────────────────────────────────────

@router.get("")
def listar_proyectos(
    estado: str = Query(default=""),
    archivado: bool | None = Query(default=None),
    q: str = Query(default="", max_length=120),
    orden: str = Query(default="reciente"),
    limit: int = Query(default=25, ge=1, le=100),
    offset: int = Query(default=0, ge=0, le=100_000),
    conn=Depends(db_rls),
    _usuario=Depends(get_current_user),
):
    order_sql = _ORDEN_PROYECTOS.get(orden, _ORDEN_PROYECTOS["reciente"])
    cond, params = [], []
    if estado:
        cond.append("estado = %s")
        params.append(estado)
    if archivado is not None:
        cond.append("archivado = %s")
        params.append(archivado)
    if q.strip():
        cond.append("(nombre ILIKE %s OR cliente ILIKE %s OR material ILIKE %s)")
        like = f"%{q.strip()}%"
        params += [like, like, like]
    where_sql = f"where {' and '.join(cond)}" if cond else ""
    params += [limit + 1, offset]
    cur = conn.cursor()
    cur.execute(
        f"select {_PROY_COLS} from pm_projects {where_sql} "
        f"order by {order_sql} limit %s offset %s",
        params,
    )
    rows = cur.fetchall()
    cur.close()
    hay_mas = len(rows) > limit
    return {"items": [_proyecto_row(r) for r in rows[:limit]], "hay_mas": hay_mas}


@router.post("", status_code=201)
def crear_proyecto(body: ProyectoIn, conn=Depends(db_rls), usuario=Depends(get_current_user)):
    _ensure_gestor(usuario)
    cur = conn.cursor()
    cur.execute(
        "insert into pm_projects "
        "(empresa_id, nombre, descripcion, cliente, material, estado, fecha_inicio, fecha_fin) "
        "values (%s,%s,%s,%s,%s,%s,%s,%s) returning " + _PROY_COLS,
        (usuario["empresa_id"], body.nombre, body.descripcion, body.cliente,
         body.material, body.estado, body.fecha_inicio, body.fecha_fin),
    )
    row = cur.fetchone()
    cur.close()
    return _proyecto_row(row)


@router.get("/{project_id}")
def obtener_proyecto(project_id: int, conn=Depends(db_rls), _usuario=Depends(get_current_user)):
    cur = conn.cursor()
    cur.execute(f"select {_PROY_COLS} from pm_projects where id = %s", (project_id,))
    row = cur.fetchone()
    cur.close()
    if row is None:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    return _proyecto_row(row)


@router.put("/{project_id}")
def editar_proyecto(project_id: int, body: ProyectoUpdate,
                    conn=Depends(db_rls), usuario=Depends(get_current_user)):
    _ensure_gestor(usuario)
    cambios = body.model_dump(exclude_unset=True)
    if not cambios:
        raise HTTPException(status_code=400, detail="Sin cambios")
    sets, vals = [], []
    for campo, valor in cambios.items():
        sets.append(f"{campo} = %s")
        vals.append(valor)
    vals.append(project_id)
    cur = conn.cursor()
    cur.execute(f"update pm_projects set {', '.join(sets)} where id = %s returning {_PROY_COLS}", vals)
    row = cur.fetchone()
    cur.close()
    if row is None:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    return _proyecto_row(row)


@router.patch("/{project_id}/estado")
def mover_proyecto(project_id: int, body: EstadoProyectoIn,
                   conn=Depends(db_rls), usuario=Depends(get_current_user)):
    _ensure_gestor(usuario)
    archivado = body.estado == "archivado"
    cur = conn.cursor()
    cur.execute("update pm_projects set estado = %s, archivado = %s where id = %s "
                f"returning {_PROY_COLS}", (body.estado, archivado, project_id))
    row = cur.fetchone()
    cur.close()
    if row is None:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    return _proyecto_row(row)


@router.delete("/{project_id}", status_code=204)
def borrar_proyecto(project_id: int, request: Request,
                    conn=Depends(db_rls), usuario=Depends(get_current_user)):
    _ensure_gestor(usuario)
    cur = conn.cursor()
    cur.execute("delete from pm_projects where id = %s returning id", (project_id,))
    ok = cur.fetchone()
    cur.close()
    if not ok:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    ip = request.client.host if request.client else None
    log_accion(conn, "PM_PROYECTO_DELETE", {"project_id": project_id},
               empresa_id=usuario["empresa_id"], usuario_id=usuario["id"], ip=ip)


# ── Tareas / hitos / horas de un proyecto ───────────────────────────────────

@router.get("/{project_id}/tareas")
def listar_tareas(project_id: int, conn=Depends(db_rls), _usuario=Depends(get_current_user)):
    cur = conn.cursor()
    cur.execute(f"select {_TAREA_COLS} from pm_tasks where project_id = %s "
                "order by orden asc, id asc", (project_id,))
    rows = cur.fetchall()
    cur.close()
    return [_tarea_row(r) for r in rows]


@router.post("/{project_id}/tareas", status_code=201)
def crear_tarea(project_id: int, body: TareaIn,
                conn=Depends(db_rls), usuario=Depends(get_current_user)):
    _ensure_gestor(usuario)  # hallazgo S2: crear tareas = solo gestor
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
    _recalc_progreso(conn, project_id)
    return _tarea_row(row)


@router.get("/{project_id}/hitos")
def listar_hitos(project_id: int, conn=Depends(db_rls), _usuario=Depends(get_current_user)):
    cur = conn.cursor()
    cur.execute(f"select {_HITO_COLS} from pm_milestones where project_id = %s "
                "order by fecha_limite asc nulls last, id asc", (project_id,))
    rows = cur.fetchall()
    cur.close()
    return [_hito_row(r) for r in rows]


@router.post("/{project_id}/hitos", status_code=201)
def crear_hito(project_id: int, body: HitoIn,
               conn=Depends(db_rls), usuario=Depends(get_current_user)):
    _ensure_gestor(usuario)
    cur = conn.cursor()
    cur.execute("select 1 from pm_projects where id = %s", (project_id,))
    if cur.fetchone() is None:
        cur.close()
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    cur.execute(
        "insert into pm_milestones "
        "(empresa_id, project_id, titulo, descripcion, fecha_inicio, fecha_limite) "
        "values (%s,%s,%s,%s,%s,%s) returning " + _HITO_COLS,
        (usuario["empresa_id"], project_id, body.titulo, body.descripcion,
         body.fecha_inicio, body.fecha_limite),
    )
    row = cur.fetchone()
    cur.close()
    return _hito_row(row)


@router.get("/{project_id}/horas")
def listar_horas_proyecto(project_id: int, conn=Depends(db_rls), _usuario=Depends(get_current_user)):
    cur = conn.cursor()
    cur.execute("select id, task_id, project_id, usuario_id, user_name, horas, fecha, nota, created_at "
                "from pm_time_entries where project_id = %s order by fecha desc, id desc", (project_id,))
    rows = cur.fetchall()
    cur.close()
    return [_hora_row(r) for r in rows]
