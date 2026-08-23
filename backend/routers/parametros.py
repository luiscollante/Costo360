from fastapi import APIRouter, Depends, HTTPException
from backend.db.client import db_conn
from backend.db.config_helpers import cfg_get, cfg_set
from backend.middleware.auth import get_current_user

from parametros import TARIFAS, ADICIONALES

router = APIRouter(prefix="/api/parametros", tags=["parametros"])


@router.get("")
def get_parametros(conn=Depends(db_conn), usuario=Depends(get_current_user)):
    """Retorna parámetros activos. Fusiona overrides de app_config con defaults del motor."""
    return {
        "tarifas":     cfg_get(conn, "tarifas")     or TARIFAS,
        "adicionales": cfg_get(conn, "adicionales") or ADICIONALES,
    }


@router.put("")
def set_parametros(body: dict, conn=Depends(db_conn), usuario=Depends(get_current_user)):
    """Guarda parámetros personalizados. Solo Admin o Gerente."""
    if usuario.get("rol") not in ("Admin", "Gerente"):
        raise HTTPException(status_code=403, detail="Solo Admin puede editar parámetros")
    for key in ("tarifas", "adicionales"):
        if key in body:
            cfg_set(conn, key, body[key])
    return {"ok": True}
