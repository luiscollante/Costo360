"""
Alta de empresas — Fase 2.A. Operado por el fundador (no expuesto en la app).

Protegido por `X-Bootstrap-Secret` (env `BOOTSTRAP_SECRET`, ≥32 bytes). Si la env
está vacía, el endpoint queda desactivado (503). Comparación en tiempo constante,
rate-limit. Medio plazo se reemplaza por una tabla `platform_admins` + sesión real
(hallazgo S9).

Secuencia con compensación (la Admin API no es transaccional): INSERT empresas +
invitación → commit → crear auth.users (dispara handle_new_user) → si falla,
DELETE empresas (cascada borra la invitación).
"""
import hmac
import os

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel, field_validator

from backend.db.client import db_service
from backend.middleware.rate_limiter import limiter
from backend.services import supabase_admin

router = APIRouter(prefix="/api/bootstrap", tags=["bootstrap"])

_PLANES = {"starter", "pro", "enterprise"}


class EmpresaBootstrapIn(BaseModel):
    nombre: str
    nit: str | None = None
    plan_codigo: str
    admin_email: str
    admin_nombre: str = ""

    @field_validator("plan_codigo")
    @classmethod
    def _plan_valido(cls, v: str) -> str:
        if v not in _PLANES:
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
    email = body.admin_email.strip().lower()

    cur = conn.cursor()
    cur.execute(
        "INSERT INTO empresas (nombre, nit, plan_codigo) VALUES (%s, %s, %s) RETURNING id",
        (body.nombre, (body.nit or "").strip() or None, body.plan_codigo),
    )
    empresa_id = cur.fetchone()[0]
    cur.execute(
        "INSERT INTO invitaciones (email, empresa_id, rol_codigo) VALUES (%s, %s, 'admin')",
        (email, empresa_id),
    )
    cur.close()
    conn.commit()  # commit ANTES de la Admin API (no transaccional)

    user_id = None
    try:
        user = supabase_admin.crear_usuario(
            email,
            {
                "empresa_id": str(empresa_id),
                "rol_codigo": "admin",
                "nombre_completo": body.admin_nombre.strip(),
            },
        )
        user_id = user.get("id") or user.get("user", {}).get("id")
        enlace = supabase_admin.generar_enlace(email, "recovery")
    except Exception as e:
        print(f"[bootstrap] fallo al aprovisionar {email}: {e}", flush=True)
        # Compensación: si el auth.users llegó a crearse, borrarlo (cascada limpia
        # `usuarios`); luego borrar la empresa (cascada limpia la invitación).
        if user_id:
            try:
                supabase_admin.eliminar_usuario(user_id)
            except Exception:
                pass
        cur = conn.cursor()
        cur.execute("DELETE FROM empresas WHERE id = %s", (empresa_id,))
        cur.close()
        conn.commit()
        raise HTTPException(
            status_code=502,
            detail="No se pudo crear el usuario administrador. Intenta de nuevo.",
        )

    return {
        "empresa_id": str(empresa_id),
        "admin_email": email,
        "enlace_para_definir_contrasena": enlace,
    }
