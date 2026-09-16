from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile

from backend.db.client import db_rls
from backend.middleware.auth import get_current_user
from backend.db.deps import verificar_dispositivo
from backend.models.materiales import MaterialAtributosVisualesIn, MaterialIn, MaterialUpdate
from backend.services import catalogo_service, storage_service

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


# ── Atributos visuales + foto de referencia (render de cocina con IA) ───────

_MAX_BYTES_FOTO = 8 * 1024 * 1024  # 8 MB — una foto de lámina no debería pasar de esto


@router.get("/{material_id}/visual")
def obtener_material_visual(
    material_id: int,
    conn=Depends(db_rls),
    _usuario=Depends(get_current_user),
):
    fila = catalogo_service.obtener_material_visual(conn, material_id)
    if fila is None:
        raise HTTPException(status_code=404, detail="Material no encontrado")
    return fila


@router.put("/{material_id}/atributos-visuales")
def actualizar_atributos_visuales(
    material_id: int,
    body: MaterialAtributosVisualesIn,
    request: Request,
    conn=Depends(db_rls),
    usuario=Depends(get_current_user),
):
    """Color, veta, patrón, acabado y tono — los 5 primeros son los que
    habilitan el botón de generar render (ver `apto_para_render`)."""
    ip = request.client.host if request.client else None
    return catalogo_service.actualizar_atributos_visuales(
        conn, usuario, material_id, atributos=body.model_dump(), ip=ip,
    )


@router.post("/{material_id}/foto-referencia")
async def subir_foto_referencia(
    material_id: int,
    request: Request,
    foto: UploadFile = File(...),
    conn=Depends(db_rls),
    usuario=Depends(get_current_user),
):
    """Sube la foto real de la lámina de este material — queda pendiente de
    aprobación humana (ver `/foto-referencia/aprobar`) antes de poder usarse
    para generar renders."""
    contenido = await foto.read()
    if not contenido:
        raise HTTPException(status_code=400, detail="No se recibió ninguna foto")
    if len(contenido) > _MAX_BYTES_FOTO:
        raise HTTPException(status_code=400, detail="La foto es demasiado grande")

    empresa_id = usuario["empresa_id"]
    ruta = f"{empresa_id}/{material_id}.png"
    storage_service.subir_archivo(
        "render-material-referencias", ruta, empresa_id, contenido, foto.content_type or "image/png",
    )
    ip = request.client.host if request.client else None
    return catalogo_service.guardar_foto_referencia(conn, usuario, material_id, foto_url=ruta, ip=ip)


@router.post("/{material_id}/foto-referencia/aprobar")
def aprobar_foto_referencia(
    material_id: int,
    aprobada: bool,
    request: Request,
    conn=Depends(db_rls),
    usuario=Depends(get_current_user),
):
    """Un humano del taller confirma (o revoca) que la foto es fiel al
    material real — nunca automático, ver hallazgo del Prompt Engineer sobre
    fotos borrosas/mal recortadas arruinando renders en cadena."""
    ip = request.client.host if request.client else None
    return catalogo_service.aprobar_foto_referencia(conn, usuario, material_id, aprobada=aprobada, ip=ip)
