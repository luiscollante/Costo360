"""
Alta de empresas — Fase 2.A. Operado por el fundador (no expuesto en la app).

Protegido por `X-Bootstrap-Secret` (env `BOOTSTRAP_SECRET`, ≥32 bytes). Si la env
está vacía, el endpoint queda desactivado (503). Comparación en tiempo constante,
rate-limit. Medio plazo se reemplaza por una tabla `platform_admins` + sesión real
(hallazgo S9).

Envoltorio delgado sobre `services.aprovisionamiento_service.aprovisionar_empresa`
(origen='demo_fundador') — la lógica real (compensación incluida) vive ahí, para
que el webhook de pago (Wompi) use exactamente el mismo camino.
"""
import hmac
import os

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel, field_validator

from backend.db.client import db_service
from backend.middleware.rate_limiter import limiter
from backend.services.aprovisionamiento_service import (
    PLANES_VALIDOS,
    AprovisionamientoError,
    aprovisionar_empresa,
)

router = APIRouter(prefix="/api/bootstrap", tags=["bootstrap"])


class EmpresaBootstrapIn(BaseModel):
    nombre: str
    nit: str | None = None
    plan_codigo: str
    admin_email: str
    admin_nombre: str = ""

    @field_validator("plan_codigo")
    @classmethod
    def _plan_valido(cls, v: str) -> str:
        if v not in PLANES_VALIDOS:
            raise ValueError("plan_codigo inválido")
        return v

    @field_validator("nombre")
    @classmethod
    def _nombre_no_vacio(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("nombre requerido")
        return v.strip()


def _check_secret(x_bootstrap_secret: str | None = Header(None)):
    expected = os.environ.get("BOOTSTRAP_SECRET", "")
    if not expected:
        raise HTTPException(status_code=503, detail="El alta de empresas no está habilitada en este entorno")
    if not x_bootstrap_secret or not hmac.compare_digest(x_bootstrap_secret, expected):
        raise HTTPException(status_code=401, detail="Secreto de bootstrap inválido")


@router.post("/empresa", status_code=201)
@limiter.limit("10/hour")
def crear_empresa(
    request: Request,
    body: EmpresaBootstrapIn,
    _=Depends(_check_secret),
    conn=Depends(db_service),
):
    try:
        resultado = aprovisionar_empresa(
            conn,
            nombre_empresa=body.nombre,
            nit=body.nit,
            plan_codigo=body.plan_codigo,
            admin_email=body.admin_email,
            admin_nombre=body.admin_nombre,
            origen="demo_fundador",
        )
    except AprovisionamientoError:
        raise HTTPException(
            status_code=502,
            detail="No se pudo crear el usuario administrador. Intenta de nuevo.",
        )

    return {
        "empresa_id": resultado["empresa_id"],
        "admin_email": resultado["admin_email"],
        "enlace_para_definir_contrasena": resultado["enlace"],
    }
