from fastapi import APIRouter, Depends, HTTPException, Query, Request

from backend.db.client import db_rls
from backend.middleware.auth import get_current_user
from backend.db.deps import verificar_dispositivo
from backend.models.materiales import MaterialIn, MaterialUpdate
from backend.services import catalogo_service

router = APIRouter(prefix="/api/materiales", tags=["materiales"],
                   dependencies=[Depends(verificar_dispositivo)])


@router.get("")
def listar_materiales(
    categoria: str = Query(default=""),
    conn=Depends(db_rls),
    _usuario=Depends(get_current_user),
):
    """Catálogo visible: filas propias del taller + las base de Costo360 que el
    taller no haya personalizado todavía (RLS + copy-on-write, ver 0006)."""
    return catalogo_service.listar_materiales(conn, categoria)


@router.get("/categorias")
def listar_categorias(
    conn=Depends(db_rls),
    _usuario=Depends(get_current_user),
):
    return catalogo_service.listar_categorias(conn)


# ── Materiales propios del taller (R10) ──────────────────────────────────────

@router.post("", status_code=201)
def crear_material(
    body: MaterialIn,
    request: Request,
    conn=Depends(db_rls),
    usuario=Depends(get_current_user),
):
    """Agrega un material NUEVO al catálogo del taller. Lo usa cualquier usuario
    al elegir 'Otro' en una cotización o con 'Agregar material' en el catálogo.
    Si ya existe (misma categoría+referencia, sin distinguir mayúsculas) se
    actualiza el precio en vez de duplicar."""
    ip = request.client.host if request.client else None
    return catalogo_service.crear_material(
        conn, usuario, categoria=body.categoria, referencia=body.referencia,
        precio_m2=body.precio_m2, precio_lamina=body.precio_lamina,
        ancho_lamina_cm=body.ancho_lamina_cm, alto_lamina_cm=body.alto_lamina_cm,
        proveedor=body.proveedor, ip=ip,
    )


@router.put("/{material_id}")
def editar_material(
    material_id: int,
    body: MaterialUpdate,
    request: Request,
    conn=Depends(db_rls),
    usuario=Depends(get_current_user),
):
    """Edita un material del catálogo del taller (categoría, nombre, precio).

    - Fila propia del taller → UPDATE directo.
    - Fila base de Costo360  → NO se toca; se crea (o actualiza) una fila propia
      del taller que la sombrea (`base_id`). El cambio solo aplica a este taller.
      Cualquier usuario del taller (incl. operativo) puede hacerlo; RLS impide
      tocar el catálogo de otro taller.
    """
    ip = request.client.host if request.client else None
    return catalogo_service.editar_material(
        conn, usuario, material_id, categoria=body.categoria, referencia=body.referencia,
        precio_m2=body.precio_m2, proveedor=body.proveedor, activo=body.activo, ip=ip,
    )


@router.delete("/{material_id}", status_code=204)
def eliminar_material(
    material_id: int,
    request: Request,
    conn=Depends(db_rls),
    usuario=Depends(get_current_user),
):
    """Quita un material del catálogo del taller. Si era un override de una fila
    base de Costo360, la base vuelve a mostrarse (equivale a 'restablecer').
    RLS impide borrar filas base o de otro taller."""
    ip = request.client.host if request.client else None
    catalogo_service.eliminar_material(conn, usuario, material_id, ip=ip)
