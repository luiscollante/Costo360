"""
Métricas del negocio para el agente de operaciones del Centro de Control
(Ciclo 2, 2026-09-26). Solo GET, solo lectura, token PROPIO
(`METRICAS_API_TOKEN`, distinto de `ADMIN_API_TOKEN`: si se filtra el del
CRM no se leen las finanzas y viceversa). Sin datos personales: ni NIT, ni
correos, ni teléfonos, ni direcciones.
"""
import hmac
import logging
import os

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request
from fastapi.responses import JSONResponse

from backend.db.client import db_service
from backend.middleware.rate_limiter import limiter
from backend.services import metricas_service as m

_log = logging.getLogger(__name__)
router = APIRouter(prefix="/api/admin/metricas", tags=["metricas-admin"])


def verificar_token_metricas(x_metricas_token: str | None = Header(default=None)) -> None:
    esperado = os.environ.get("METRICAS_API_TOKEN", "")
    if not esperado:
        raise HTTPException(status_code=503, detail="Métricas no configuradas")
    if not x_metricas_token or not hmac.compare_digest(x_metricas_token.encode(), esperado.encode()):
        raise HTTPException(status_code=401, detail="Token inválido")


def _conn_lectura(conn=Depends(db_service)):
    m.preparar_solo_lectura(conn)
    return conn


def _responder(nombre: str, fn, *args) -> JSONResponse:
    try:
        cuerpo = fn(*args)
    except Exception:
        _log.exception("métrica %s falló", nombre)
        raise HTTPException(status_code=500, detail=f"No se pudo calcular '{nombre}'")
    _log.info("métrica consultada: %s", nombre)
    return JSONResponse(cuerpo, headers={"Cache-Control": "no-store"})


_DEPS = [Depends(verificar_token_metricas)]


@router.get("/resumen", dependencies=_DEPS)
@limiter.limit("30/minute")
def resumen(request: Request, conn=Depends(_conn_lectura)):
    return _responder("resumen", m.resumen, conn)


@router.get("/costo-por-cliente", dependencies=_DEPS)
@limiter.limit("30/minute")
def costo_por_cliente(request: Request, empresa: str | None = Query(None, min_length=1, max_length=120),
                      conn=Depends(_conn_lectura)):
    return _responder("costo-por-cliente", m.costo_por_cliente, conn, empresa)


@router.get("/margen-por-plan", dependencies=_DEPS)
@limiter.limit("30/minute")
def margen_por_plan(request: Request, conn=Depends(_conn_lectura)):
    return _responder("margen-por-plan", m.margen_por_plan, conn)


@router.get("/ingresos", dependencies=_DEPS)
@limiter.limit("30/minute")
def ingresos(request: Request, meses: int = Query(6, ge=1, le=13), conn=Depends(_conn_lectura)):
    return _responder("ingresos", m.ingresos, conn, meses)


@router.get("/talleres", dependencies=_DEPS)
@limiter.limit("30/minute")
def talleres(request: Request, orden: str = Query("cotizaciones", pattern="^(cotizaciones|costo_ia)$"),
             conn=Depends(_conn_lectura)):
    return _responder("talleres", m.talleres_uso, conn, orden)


@router.get("/movimientos", dependencies=_DEPS)
@limiter.limit("30/minute")
def movimientos(request: Request, meses: int = Query(3, ge=1, le=13), conn=Depends(_conn_lectura)):
    return _responder("movimientos", m.movimientos, conn, meses)


@router.get("/salud", dependencies=_DEPS)
@limiter.limit("30/minute")
def salud(request: Request, conn=Depends(_conn_lectura)):
    return _responder("salud", m.salud, conn)
