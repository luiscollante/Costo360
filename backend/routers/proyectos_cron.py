"""
Barrido diario de automatizaciones del módulo de gestión de proyectos
(Objetivo 6 / Fase 2.D, Ciclo A, bloque G2).

Router APARTE, SIN dependencias de sesión (`verificar_dispositivo`/
`get_current_user`) — un cron no tiene usuario (hallazgo S7). Se autentica con el
header `X-Cron-Secret` comparado en tiempo constante contra `CRON_SECRET`
(hallazgo S8). Corre con `db_service` (rol postgres, BYPASSRLS) y hace el trabajo
de forma **set-based, sin bucle por empresa**: cada sentencia filtra
`empresa_id IN (SELECT id FROM empresas WHERE activa)` y las notificaciones toman
`empresa_id` de la FK NOT NULL de la fila de origen (hallazgo S4). Idempotente
por `dedupe_key` + `ON CONFLICT ... WHERE dedupe_key IS NOT NULL DO NOTHING`
(hallazgo S5).

El disparo real (cron del hosting / GitHub Action / cron-job.org apuntando a este
endpoint con el secreto) se cablea cuando el backend se despliegue — ver
`backend/ENV_SETUP.md`. `zona = America/Bogota` para el cálculo de "hoy".
"""
import hmac
import logging
import os
from datetime import datetime

from fastapi import APIRouter, Depends, Header, HTTPException, Request

from backend.db.client import db_service
from backend.middleware.rate_limiter import limiter

_log = logging.getLogger("proyectos.cron")

try:
    from zoneinfo import ZoneInfo
    _BOGOTA = ZoneInfo("America/Bogota")
except Exception:  # pragma: no cover
    _BOGOTA = None

router = APIRouter(prefix="/api/proyectos/cron", tags=["proyectos-cron"])


def _verificar_secreto(x_cron_secret: str | None) -> None:
    esperado = os.environ.get("CRON_SECRET", "")
    if not esperado:
        # Fail-closed: sin secreto configurado, el endpoint no opera (S8).
        raise HTTPException(status_code=503, detail="Automatización no configurada")
    if not x_cron_secret:
        raise HTTPException(status_code=401, detail="Falta X-Cron-Secret")
    if not hmac.compare_digest(x_cron_secret.encode(), esperado.encode()):
        raise HTTPException(status_code=401, detail="Secreto inválido")


def ejecutar_barrido(cur, hoy) -> dict:
    """Corre las 5 automatizaciones para TODAS las empresas activas. Recibe un
    cursor y NO hace commit (lo hace el wrapper `db_service`) — hallazgo S12.
    Devuelve un resumen de conteos."""
    res = {"desbloqueadas": 0, "recordatorios": 0, "hitos_riesgo": 0,
           "proyectos_riesgo": 0, "archivados": 0}

    # 1. Desbloquear tareas cuyo hito ya está completado + avisar.
    cur.execute(
        """
        with desb as (
            update pm_tasks t set estado = 'por_hacer'
            from pm_milestones m
            where t.milestone_id = m.id
              and t.empresa_id = m.empresa_id
              and t.estado = 'bloqueada'
              and m.estado = 'completado'
              and t.empresa_id in (select id from empresas where activa)
            returning t.id, t.empresa_id, t.project_id, t.titulo
        ),
        ins as (
            insert into pm_notifications
                (empresa_id, titulo, mensaje, tipo, project_id, task_id, dedupe_key)
            select d.empresa_id, 'Tarea desbloqueada automáticamente',
                   '"' || d.titulo || '" pasó a Por hacer: su hito ya está completado.',
                   'desbloqueo', d.project_id, d.id, 'desbloqueo-' || d.id
            from desb d
            on conflict (empresa_id, dedupe_key) where dedupe_key is not null do nothing
        )
        select count(*) from desb
        """
    )
    res["desbloqueadas"] = cur.fetchone()[0]

    # 2. Recordatorios: tareas no completadas que vencen en <= 2 días, en
    #    proyectos activos.
    cur.execute(
        """
        insert into pm_notifications
            (empresa_id, titulo, mensaje, tipo, project_id, task_id, dedupe_key)
        select t.empresa_id,
               case when t.fecha_limite < %(hoy)s then 'Tarea vencida'
                    else 'Tarea próxima a vencer' end,
               '"' || t.titulo || '" ' ||
               case when t.fecha_limite < %(hoy)s then 'venció el ' else 'vence el ' end ||
               to_char(t.fecha_limite, 'YYYY-MM-DD') || '.',
               'recordatorio', t.project_id, t.id,
               'recordatorio-' || t.id || '-' || to_char(%(hoy)s::date, 'YYYY-MM-DD')
        from pm_tasks t
        join pm_projects p on p.id = t.project_id and p.empresa_id = t.empresa_id
        where t.estado <> 'completada'
          and t.fecha_limite is not null
          and t.fecha_limite <= %(hoy)s::date + 2
          and p.estado in ('planificacion', 'activo', 'en_revision')
          and t.empresa_id in (select id from empresas where activa)
        on conflict (empresa_id, dedupe_key) where dedupe_key is not null do nothing
        """,
        {"hoy": hoy},
    )
    res["recordatorios"] = cur.rowcount

    # 3. Hitos en riesgo: vencen en <= 2 días, no completados, proyecto activo.
    cur.execute(
        """
        insert into pm_notifications
            (empresa_id, titulo, mensaje, tipo, project_id, dedupe_key)
        select m.empresa_id, 'Hito en riesgo',
               'El hito "' || m.titulo || '" vence el ' ||
               to_char(m.fecha_limite, 'YYYY-MM-DD') ||
               coalesce(' con ' || nullif(oc.n, 0) || ' tarea(s) sin completar', '') || '.',
               'riesgo', m.project_id,
               'riesgo-hito-' || m.id || '-' || to_char(%(hoy)s::date, 'YYYY-MM-DD')
        from pm_milestones m
        join pm_projects p on p.id = m.project_id and p.empresa_id = m.empresa_id
        left join lateral (
            select count(*) n from pm_tasks x
            where x.milestone_id = m.id and x.empresa_id = m.empresa_id
              and x.estado <> 'completada'
        ) oc on true
        where m.estado <> 'completado'
          and m.fecha_limite is not null
          and m.fecha_limite <= %(hoy)s::date + 2
          and p.estado in ('planificacion', 'activo', 'en_revision')
          and m.empresa_id in (select id from empresas where activa)
        on conflict (empresa_id, dedupe_key) where dedupe_key is not null do nothing
        """,
        {"hoy": hoy},
    )
    res["hitos_riesgo"] = cur.rowcount

    # 4a. Marcar/desmarcar `en_riesgo` de los proyectos.
    cur.execute(
        """
        update pm_projects p set en_riesgo = nuevo.riesgo
        from (
            select id,
                   (fecha_fin is not null and fecha_fin <= %(hoy)s::date + 7
                    and progreso_pct < 60
                    and estado in ('planificacion', 'activo', 'en_revision')) as riesgo
            from pm_projects
            where empresa_id in (select id from empresas where activa)
        ) nuevo
        where p.id = nuevo.id and p.en_riesgo is distinct from nuevo.riesgo
        """,
        {"hoy": hoy},
    )

    # 4b. Avisar de los proyectos en riesgo.
    cur.execute(
        """
        insert into pm_notifications
            (empresa_id, titulo, mensaje, tipo, project_id, dedupe_key)
        select p.empresa_id, 'Proyecto en riesgo',
               '"' || p.nombre || '" entrega el ' || to_char(p.fecha_fin, 'YYYY-MM-DD') ||
               ' con solo ' || p.progreso_pct || '% de avance.',
               'riesgo', p.id,
               'riesgo-proyecto-' || p.id || '-' || to_char(%(hoy)s::date, 'YYYY-MM-DD')
        from pm_projects p
        where p.fecha_fin is not null
          and p.fecha_fin <= %(hoy)s::date + 7
          and p.progreso_pct < 60
          and p.estado in ('planificacion', 'activo', 'en_revision')
          and p.empresa_id in (select id from empresas where activa)
        on conflict (empresa_id, dedupe_key) where dedupe_key is not null do nothing
        """,
        {"hoy": hoy},
    )
    res["proyectos_riesgo"] = cur.rowcount

    # 5. Archivar proyectos completados hace más de 30 días.
    cur.execute(
        """
        update pm_projects set estado = 'archivado', archivado = true
        where estado = 'completado'
          and updated_at < now() - interval '30 days'
          and empresa_id in (select id from empresas where activa)
        """
    )
    res["archivados"] = cur.rowcount

    return res


@router.post("/barrido-diario")
@limiter.limit("6/hour")
def barrido_diario(
    request: Request,
    x_cron_secret: str | None = Header(default=None),
    conn=Depends(db_service),
):
    _verificar_secreto(x_cron_secret)
    hoy = (datetime.now(_BOGOTA).date() if _BOGOTA else datetime.utcnow().date())
    cur = conn.cursor()
    try:
        resumen = ejecutar_barrido(cur, hoy)
    except Exception:
        # `db_service` hará rollback + re-raise; aquí solo logueamos y devolvemos
        # un 500 genérico sin filtrar el detalle (hallazgo S15).
        _log.exception("barrido-diario falló")
        raise HTTPException(status_code=500, detail="Error ejecutando el barrido")
    finally:
        cur.close()
    # El commit lo hace `db_service` al salir sin excepción (hallazgo S12).
    return {"ok": True, "fecha": hoy.isoformat(), **resumen}
