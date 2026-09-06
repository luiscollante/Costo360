from fastapi import APIRouter, Depends, Request

from backend.db.client import db_rls
from backend.middleware.auth import get_current_user
from backend.db.deps import verificar_dispositivo
from backend.models.retales import RetalIn, RetalUpdate
from backend.services import retales_service

router = APIRouter(prefix="/api/retales", tags=["retales"],
                   dependencies=[Depends(verificar_dispositivo)])


@router.get("")
def listar_retales(conn=Depends(db_rls), usuario=Depends(get_current_user)):
    return retales_service.listar_retales(conn, usuario)


@router.post("", status_code=201)
def crear_retal(body: RetalIn, request: Request, conn=Depends(db_rls),
                 usuario=Depends(get_current_user)):
    resultado = retales_service.crear_retal(
        conn, usuario, ip=request.client.host if request.client else None,
        **body.model_dump(),
    )
    return {"id": resultado["id"], "ok": True}


@router.put("/{retal_id}")
def actualizar_retal(retal_id: int, body: RetalUpdate, request: Request,
                      conn=Depends(db_rls), usuario=Depends(get_current_user)):
    cambios = body.model_dump(exclude_unset=True, exclude_none=True)
    retales_service.editar_retal(
        conn, usuario, retal_id,
        ip=request.client.host if request.client else None, **cambios,
    )
    return {"ok": True}


@router.delete("/{retal_id}")
def eliminar_retal(retal_id: int, request: Request, conn=Depends(db_rls),
                    usuario=Depends(get_current_user)):
    retales_service.eliminar_retal(
        conn, usuario, retal_id,
        ip=request.client.host if request.client else None,
    )
    return {"ok": True}
