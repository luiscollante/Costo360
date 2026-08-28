from fastapi import APIRouter, Depends, HTTPException

from backend.db.client import db_rls
from backend.db.config_helpers import cfg_get, cfg_set
from backend.middleware.auth import get_current_user

from parametros import TARIFAS, ADICIONALES

router = APIRouter(prefix="/api/parametros", tags=["parametros"])


@router.get("")
def get_parametros(conn=Depends(db_rls), usuario=Depends(get_current_user)):
    """Parámetros activos: overrides de la empresa (app_config) fusionados con los defaults del motor."""
    emp = usuario["empresa_id"]
    return {
        "tarifas":     cfg_get(conn, emp, "tarifas")     or TARIFAS,
        "adicionales": cfg_get(conn, emp, "adicionales") or ADICIONALES,
    }


@router.put("")
def set_parametros(body: dict, conn=Depends(db_rls), usuario=Depends(get_current_user)):
    """Guarda parámetros personalizados de la empresa. Requiere acceso de Admin/Gerencia."""
    if not usuario.get("puede_ver_dashboard"):
        raise HTTPException(status_code=403, detail="No tienes permiso para editar parámetros")
    emp = usuario["empresa_id"]
    for key in ("tarifas", "adicionales"):
        if key in body:
            cfg_set(conn, emp, key, body[key])
    return {"ok": True}
