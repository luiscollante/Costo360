"""
Cron diario del cobro mensual recurrente (08:00 Colombia = 13:00 UTC).
GET con `Authorization: Bearer CRON_SECRET` (lo manda Vercel Cron solo). El
secreto se valida ANTES de tomar conexión. Conexión `db_service` (postgres):
ni la app ni los usuarios pueden escribir cobros ni el interruptor.
Arranca APAGADO: `config_sistema.cobros_recurrentes_activos = false`.
"""
import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse

from backend.db.client import db_service
from backend.middleware.rate_limiter import limiter
from backend.routers.agente_cron import verificar_secreto_cron
from backend.routers.pagos import avisar_cobro
from backend.services import cobro_recurrente_service as cobros

_log = logging.getLogger(__name__)
router = APIRouter(tags=["pagos-cron"])


@router.get("/api/pagos/cron/cobros")
@limiter.limit("6/hour")
def cron_cobros(request: Request, _secreto=Depends(verificar_secreto_cron), conn=Depends(db_service)):
    try:
        resumen = cobros.ejecutar_cron(conn)
    except Exception:
        _log.exception("cron de cobros falló")
        raise HTTPException(status_code=500, detail="Error en el cron de cobros")
    for ev in resumen["eventos"]:
        avisar_cobro(ev)
    for av in resumen.get("avisos_previos", []):
        try:
            from backend.services import email_service
            if resumen.get("ambiente") != "sandbox":
                email_service.enviar_aviso_cobro_proximo(av)
        except Exception:
            _log.warning("no se pudo enviar un aviso previo de cobro")
    cuerpo = {k: v for k, v in resumen.items() if k not in ("eventos", "avisos_previos")}
    cuerpo["eventos"] = [e.get("tipo") for e in resumen["eventos"]]
    cuerpo["avisos_previos"] = len(resumen.get("avisos_previos", []))
    return JSONResponse({"ok": True, **cuerpo}, headers={"Cache-Control": "no-store"})
