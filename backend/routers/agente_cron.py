"""
Barrido de limpieza de la Bóveda del Agente — Objetivo 5, Ciclo 3
(rediseño tras la revisión en vivo del fundador).

Mismo patrón que `routers/proyectos_cron.py`: router APARTE, sin sesión de
usuario (`X-Cron-Secret` en tiempo constante contra `CRON_SECRET`), corre
con `db_service` (rol postgres, BYPASSRLS) y hace el trabajo SET-BASED (una
sentencia DELETE por plan conocido, nunca un bucle por empresa).

Nota de diseño (auditoría de este ciclo): la retención que Cost RESPETA en
la práctica es la que aplica `bitacora.consultar()` en cada consulta bajo
demanda (nunca ve ni usa una acción fuera de plazo, sin importar si este
barrido ya la borró físicamente o no). Este cron solo libera espacio en
disco — corre una vez al día porque el plan gratuito de Vercel Cron no
permite más frecuencia, y no hace falta más: la garantía funcional para el
usuario no depende de esta cadencia.

Reusa `bitacora.RETENCION_DIAS`/`RETENCION_DEFAULT_DIAS` — un solo lugar
con el mapa plan→días, nunca una copia en SQL que pudiera desincronizarse.

A propósito, sin filtrar por `empresas.activa` (a diferencia de
`proyectos_cron.py`): un taller inactivo no necesita que Cost siga
"recordando" nada — se limpia con el mismo criterio que uno activo
(decisión del fundador, auditoría de este ciclo).
"""
import hmac
import logging
import os

from fastapi import APIRouter, Depends, Header, HTTPException, Request

from backend.agente.bitacora import RETENCION_DEFAULT_DIAS, RETENCION_DIAS
from backend.db.client import db_service
from backend.middleware.rate_limiter import limiter

_log = logging.getLogger("agente.cron")

router = APIRouter(prefix="/api/agente/cron", tags=["agente-cron"])


def verificar_secreto_cron(x_cron_secret: str | None = Header(default=None)) -> None:
    """Mismo patrón que `proyectos_cron.verificar_secreto_cron` — se resuelve
    ANTES de `db_service` para que un secreto ausente/inválido no tome una
    conexión del pool."""
    esperado = os.environ.get("CRON_SECRET", "")
    if not esperado:
        raise HTTPException(status_code=503, detail="Automatización no configurada")
    if not x_cron_secret:
        raise HTTPException(status_code=401, detail="Falta X-Cron-Secret")
    if not hmac.compare_digest(x_cron_secret.encode(), esperado.encode()):
        raise HTTPException(status_code=401, detail="Secreto inválido")


def limpiar_historial(cur) -> dict:
    """Recibe un cursor y NO hace commit (lo hace el wrapper `db_service`)."""
    cur.execute("set local statement_timeout = '60s'")
    cur.execute("set local lock_timeout = '5s'")

    borradas = 0
    for plan_codigo, dias in RETENCION_DIAS.items():
        cur.execute(
            "delete from agente_historial_acciones h using empresas e "
            "where h.empresa_id = e.id and e.plan_codigo = %s "
            "and h.creado_en < now() - make_interval(days => %s)",
            (plan_codigo, dias),
        )
        borradas += cur.rowcount

    # Cualquier plan_codigo NO listado en RETENCION_DIAS (dato corrupto, o un
    # plan nuevo agregado sin actualizar ese mapa) usa el default conservador
    # — mismo criterio que `bitacora.dias_retencion()`.
    cur.execute(
        "delete from agente_historial_acciones h using empresas e "
        "where h.empresa_id = e.id and e.plan_codigo != all(%s) "
        "and h.creado_en < now() - make_interval(days => %s)",
        (list(RETENCION_DIAS.keys()), RETENCION_DEFAULT_DIAS),
    )
    borradas += cur.rowcount

    return {"filas_borradas": borradas}


@router.post("/limpiar-historial")
@limiter.limit("6/hour")
def limpiar_historial_endpoint(
    request: Request,
    _secreto=Depends(verificar_secreto_cron),
    conn=Depends(db_service),
):
    cur = conn.cursor()
    try:
        resumen = limpiar_historial(cur)
    except Exception:
        _log.exception("limpiar-historial falló")
        raise HTTPException(status_code=500, detail="Error ejecutando la limpieza")
    finally:
        cur.close()
    return {"ok": True, **resumen}
