"""
Acceso a Supabase Storage para las fotos/imágenes del render de cocina con
IA — los dos buckets creados en la migración 0011 (`render-material-
referencias`, `render-cliente-fotos`), ambos privados.

Usa la SERVICE_ROLE key (el backend ya es el único punto de confianza para
todo acceso a datos de usuario en este proyecto — el navegador nunca habla
con Supabase directo, mismo criterio que `rls_connection` para Postgres).
La política de RLS de `storage.objects` en la migración queda como defensa
en profundidad; el aislamiento real por empresa lo hace este módulo, exigiendo
siempre que la ruta empiece con `{empresa_id}/` antes de cualquier operación.

Ningún archivo se sirve con URL pública fija — siempre una URL firmada de
vida corta, generada bajo demanda.
"""
import os

import httpx
from fastapi import HTTPException

_TIMEOUT = 30.0


def _base_url() -> str:
    url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    if not url:
        raise HTTPException(status_code=503, detail="Almacenamiento no configurado en este entorno")
    return url


def _service_key() -> str:
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not key:
        raise HTTPException(status_code=503, detail="Almacenamiento no configurado en este entorno")
    return key


def _headers() -> dict:
    key = _service_key()
    return {"Authorization": f"Bearer {key}", "apikey": key}


def _verificar_ruta_empresa(ruta: str, empresa_id: str) -> None:
    """Nunca confiar en que quien llama ya prefijó bien la ruta — mismo
    principio que "el backend decide, no el cliente" ya aplicado en el resto
    del proyecto (ver confirmations.py)."""
    if not ruta.startswith(f"{empresa_id}/"):
        raise HTTPException(status_code=403, detail="Ruta de archivo fuera del alcance de tu empresa")


def subir_archivo(bucket: str, ruta: str, empresa_id: str, contenido: bytes, content_type: str) -> None:
    _verificar_ruta_empresa(ruta, empresa_id)
    with httpx.Client(timeout=_TIMEOUT) as c:
        r = c.post(
            f"{_base_url()}/storage/v1/object/{bucket}/{ruta}",
            headers={**_headers(), "Content-Type": content_type, "x-upsert": "true"},
            content=contenido,
        )
    if r.status_code not in (200, 201):
        raise HTTPException(status_code=502, detail="No se pudo guardar el archivo")


def url_firmada(bucket: str, ruta: str, empresa_id: str, expira_segundos: int = 300) -> str:
    _verificar_ruta_empresa(ruta, empresa_id)
    with httpx.Client(timeout=_TIMEOUT) as c:
        r = c.post(
            f"{_base_url()}/storage/v1/object/sign/{bucket}/{ruta}",
            headers=_headers(),
            json={"expiresIn": expira_segundos},
        )
    if r.status_code != 200:
        raise HTTPException(status_code=502, detail="No se pudo generar el enlace del archivo")
    signed_path = r.json().get("signedURL", "")
    return f"{_base_url()}/storage/v1{signed_path}"


def borrar_archivo(bucket: str, ruta: str, empresa_id: str) -> None:
    _verificar_ruta_empresa(ruta, empresa_id)
    with httpx.Client(timeout=_TIMEOUT) as c:
        r = c.request(
            "DELETE", f"{_base_url()}/storage/v1/object/{bucket}/{ruta}",
            headers=_headers(),
        )
    if r.status_code not in (200, 204):
        raise HTTPException(status_code=502, detail="No se pudo borrar el archivo")
