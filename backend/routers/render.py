"""
Render de cocina con IA — proxy sobre OpenAI (`gpt-image-2.5-sunburst`), con
persistencia real (a diferencia de `voz.py`, acá el resultado se guarda,
vinculado siempre a una cotización real).

La clave de OpenAI vive solo en el backend (`OPENAI_API_KEY`), nunca llega
al navegador — mismo criterio que ElevenLabs en `voz.py`.
"""
from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile

from backend.db.client import db_rls
from backend.db.deps import verificar_dispositivo
from backend.middleware.auth import get_current_user
from backend.middleware.rate_limiter import limiter
from backend.services import render_service

router = APIRouter(prefix="/api/render", tags=["render"],
                    dependencies=[Depends(verificar_dispositivo)])

_MAX_BYTES_FOTO = 10 * 1024 * 1024  # 10 MB, mismo tope anti-abuso que voz.py con audio


@router.post("/cotizaciones/{cotizacion_id}", status_code=201)
@limiter.limit("10/hour")
async def generar_render(
    request: Request,
    cotizacion_id: int,
    material_id: int = Form(...),
    superficie: str = Form(...),
    nota_libre: str | None = Form(default=None),
    foto_cliente_consentimiento: bool = Form(default=False),
    foto_cliente: UploadFile | None = File(default=None),
    conn=Depends(db_rls),
    usuario=Depends(get_current_user),
):
    """Genera un render nuevo. Si `foto_cliente` viene adjunta, se edita esa
    foto real (Ruta B del plan); si no, se genera una cocina de muestra con
    el material aplicado (Ruta A, degradada — solo si el material tiene foto
    de referencia aprobada el resultado es confiable de verdad)."""
    foto_bytes = None
    foto_content_type = None
    if foto_cliente is not None:
        foto_bytes = await foto_cliente.read()
        if not foto_bytes:
            foto_bytes = None
        elif len(foto_bytes) > _MAX_BYTES_FOTO:
            raise HTTPException(status_code=400, detail="La foto es demasiado grande")
        else:
            foto_content_type = foto_cliente.content_type or "image/png"

    return render_service.generar_render(
        conn, usuario,
        cotizacion_id=cotizacion_id, material_id=material_id, superficie=superficie,
        foto_cliente=foto_bytes, foto_cliente_content_type=foto_content_type,
        foto_cliente_consentimiento=foto_cliente_consentimiento, nota_libre=nota_libre,
    )


@router.get("/cotizaciones/{cotizacion_id}")
def listar_renders(
    cotizacion_id: int,
    conn=Depends(db_rls),
    usuario=Depends(get_current_user),
):
    return render_service.listar_renders(conn, usuario["empresa_id"], cotizacion_id)


@router.delete("/{render_id}", status_code=204)
def borrar_render(
    render_id: int,
    conn=Depends(db_rls),
    usuario=Depends(get_current_user),
):
    render_service.borrar_render(conn, usuario, render_id)


@router.get("/gasto")
def gasto_mensual(
    conn=Depends(db_rls),
    usuario=Depends(get_current_user),
):
    return render_service.gasto_info(conn, usuario["empresa_id"])
