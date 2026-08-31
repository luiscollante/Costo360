"""
Auth — Fase 2.A. El login/registro/recuperación los maneja Supabase Auth en el
frontend (correo+contraseña, Google, enlaces de invitación y de restablecimiento).
El backend solo verifica el JWT y expone el perfil.

Los endpoints de sesión única viven en `routers/session.py` (`/api/auth/session/*`).
"""
from fastapi import APIRouter, Depends

from backend.middleware.auth import get_current_user
from backend.models.auth import UsuarioOut

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.get("/me", response_model=UsuarioOut)
def me(usuario=Depends(get_current_user)):
    return UsuarioOut(
        id=usuario["id"],
        empresa_id=usuario["empresa_id"],
        rol_codigo=usuario["rol_codigo"],
        nombre_completo=usuario["nombre_completo"],
        cargo_visible=usuario["cargo_visible"],
        empresa_nombre=usuario["empresa_nombre"],
        puede_ver_dashboard=usuario["puede_ver_dashboard"],
        puede_usar_modo_bi_senior=usuario["puede_usar_modo_bi_senior"],
        puede_pedir_datos_agregados_agente=usuario["puede_pedir_datos_agregados_agente"],
        puede_gestionar_usuarios=usuario["puede_gestionar_usuarios"],
    )
