from fastapi import APIRouter, Depends, HTTPException

from backend.db.client import db_rls
from backend.db.config_helpers import cfg_set
from backend.db.deps import require_dashboard, verificar_dispositivo
from backend.middleware.auth import get_current_user
from backend.services.parametros_service import obtener_parametros, validar_invariantes_tarifas

router = APIRouter(prefix="/api/parametros", tags=["parametros"],
                   dependencies=[Depends(verificar_dispositivo)])


@router.get("")
def get_parametros(conn=Depends(db_rls), usuario=Depends(require_dashboard)):
    """Parámetros activos: overrides de la empresa (app_config) fusionados con los defaults del motor.
    Requiere acceso de Admin/Gerencia — el rol operativo no ve Parámetros y no lo consume
    para cotizar (el motor lee las tarifas de la BD directamente en routers/cotizacion.py)."""
    return obtener_parametros(conn, usuario["empresa_id"])


@router.put("")
def set_parametros(body: dict, conn=Depends(db_rls), usuario=Depends(get_current_user)):
    """Guarda parámetros personalizados de la empresa. Requiere acceso de Admin/Gerencia.

    Sigue siendo un reemplazo directo (no pasa por editar/agregar/quitar_tarifa
    fila por fila): este endpoint es el que ya usa la pantalla de edición
    manual, que siempre manda el objeto tarifas/adicionales COMPLETO ya armado
    por el usuario en el navegador — no hay ninguna fila puntual que
    desambiguar aquí, a diferencia de las tools del agente. Sí valida el
    mismo invariante de forma (etiqueta_pdf/inductor válidos, al menos una
    fila de % de merma por categoría) que las tools del agente ya garantizan
    — hallazgo real de la Fase 5: sin esto, este camino podía reintroducir
    los mismos 2 bugs financieros que se cerraron para el agente."""
    if not usuario.get("puede_ver_dashboard"):
        raise HTTPException(status_code=403, detail="No tienes permiso para editar parámetros")
    if "tarifas" in body:
        error = validar_invariantes_tarifas(body["tarifas"])
        if error:
            raise HTTPException(status_code=400, detail=error)
    emp = usuario["empresa_id"]
    for key in ("tarifas", "adicionales"):
        if key in body:
            cfg_set(conn, emp, key, body[key])
    return {"ok": True}
