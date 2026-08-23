import base64
from io import BytesIO
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from PIL import Image
from backend.db.client import db_conn
from backend.db.config_helpers import cfg_get, cfg_set
from backend.middleware.auth import get_current_user
from backend.db.deps import require_admin_or_gerente
from backend.services.audit_service import log_accion

router = APIRouter(prefix="/api/config", tags=["config"])

_EMPRESA_DEFAULTS = {
    "nombre":            "Mármoles Collante & Castro Ltda",
    "nit":               "",
    "direccion":         "",
    "telefono":          "",
    "email":             "",
    "ciudad":            "Barranquilla",
    "banco_nombre":      "",
    "banco_cuenta":      "",
    "banco_tipo":        "Cuenta Corriente",
    "banco_titular":     "",
    "anticipo_pct":      60,
    "dias_entrega":      10,
    "condiciones_pago":  "50% anticipo — 50% contra entrega",
}


@router.get("/empresa")
def get_empresa(conn=Depends(db_conn), usuario=Depends(get_current_user)):
    """Configuración de empresa. Fusiona con defaults si aún no se ha configurado."""
    saved = cfg_get(conn, "empresa") or {}
    return {**_EMPRESA_DEFAULTS, **saved}


@router.put("/empresa")
def set_empresa(
    request: Request,
    body: dict,
    conn=Depends(db_conn),
    usuario=Depends(require_admin_or_gerente),
):
    cfg_set(conn, "empresa", body)
    ip = request.client.host if request.client else None
    log_accion(conn, "EMPRESA_UPDATE", {"campos": list(body.keys())},
               usuario_id=usuario["id"], ip=ip)
    return {"ok": True}


@router.get("/logo")
def get_logo(conn=Depends(db_conn), _=Depends(get_current_user)):
    """Devuelve el logo de empresa en base64."""
    logo_b64 = cfg_get(conn, "empresa_logo_b64")
    content_type = cfg_get(conn, "empresa_logo_content_type") or "image/jpeg"
    return {"logo_b64": logo_b64, "content_type": content_type}


@router.post("/logo")
async def upload_logo(
    file: UploadFile = File(...),
    conn=Depends(db_conn),
    _=Depends(require_admin_or_gerente),
):
    """Sube el logo de empresa. Solo Admin o Gerente. Máximo 2 MB, JPEG o PNG."""
    _MAX = 2 * 1024 * 1024
    content = await file.read(_MAX + 1)
    if len(content) > _MAX:
        raise HTTPException(status_code=400, detail="El logo no puede superar 2 MB")

    # Verificar firma de bytes reales (no Content-Type del request)
    if content[:3] == b"\xff\xd8\xff":
        img_format, content_type = "JPEG", "image/jpeg"
    elif content[:4] == b"\x89PNG":
        img_format, content_type = "PNG", "image/png"
    else:
        raise HTTPException(status_code=400, detail="Solo se aceptan imágenes JPEG o PNG")

    # Re-codificar con Pillow para neutralizar payloads embebidos
    try:
        img = Image.open(BytesIO(content))
        buf = BytesIO()
        if img_format == "JPEG":
            img.convert("RGB").save(buf, format="JPEG", quality=85)
        else:
            img.convert("RGBA").save(buf, format="PNG", optimize=True)
        clean_bytes = buf.getvalue()
    except Exception:
        raise HTTPException(status_code=400, detail="No se pudo procesar la imagen")

    logo_b64 = base64.b64encode(clean_bytes).decode("utf-8")
    cfg_set(conn, "empresa_logo_b64", logo_b64)
    cfg_set(conn, "empresa_logo_content_type", content_type)
    return {"ok": True}
