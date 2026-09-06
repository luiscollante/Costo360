from fastapi import APIRouter, Depends, Request
from backend.db.client import db_rls
from backend.middleware.auth import get_current_user
from backend.db.deps import verificar_dispositivo
from backend.models.inventario import LaminaIn, LaminaUpdate
from backend.services import inventario_service

router = APIRouter(prefix="/api/inventario", tags=["inventario"],
                   dependencies=[Depends(verificar_dispositivo)])


@router.get("")
def listar_inventario(conn=Depends(db_rls), _usuario=Depends(get_current_user)):
    return inventario_service.listar_inventario(conn)


@router.post("", status_code=201)
def crear_lamina(body: LaminaIn, request: Request, conn=Depends(db_rls), usuario=Depends(get_current_user)):
    ip = request.client.host if request.client else None
    resultado = inventario_service.crear_lamina(
        conn, usuario, material_categoria=body.material_categoria, referencia=body.referencia,
        cantidad_laminas=body.cantidad_laminas, ancho_cm=body.ancho_cm, alto_cm=body.alto_cm,
        espesor_cm=body.espesor_cm, costo_unitario=body.costo_unitario,
        stock_minimo=body.stock_minimo, proveedor=body.proveedor, ubicacion=body.ubicacion,
        notas=body.notas, ip=ip,
    )
    return {"id": resultado["id"], "ok": True}


@router.put("/{lamina_id}")
def actualizar_lamina(
    lamina_id: int,
    body: LaminaUpdate,
    request: Request,
    conn=Depends(db_rls),
    usuario=Depends(get_current_user),
):
    ip = request.client.host if request.client else None
    cambios = body.model_dump(exclude_unset=True)
    inventario_service.editar_lamina(conn, usuario, lamina_id, ip=ip, **cambios)
    return {"ok": True}


@router.delete("/{lamina_id}")
def eliminar_lamina(
    lamina_id: int,
    request: Request,
    conn=Depends(db_rls),
    usuario=Depends(get_current_user),
):
    ip = request.client.host if request.client else None
    inventario_service.eliminar_lamina(conn, usuario, lamina_id, ip=ip)
    return {"ok": True}
