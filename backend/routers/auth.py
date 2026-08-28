"""
Auth — Fase 2.A. El login/registro/recuperación los maneja Supabase Auth en el
frontend (correo+contraseña, Google, enlaces de invitación y de restablecimiento).
El backend solo verifica el JWT y expone el perfil.

`logout` y los endpoints de sesión única (`/session/*`) se agregan en el bloque B5.
"""
from fastapi import APIRouter, Depends

from backend.middleware.auth import get_current_user
from backend.models.auth import UsuarioOut

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.get("/me", response_model=UsuarioOut)
def me(usuario=Depends(get_current_user)):
    return UsuarioOut(**{k: v for k, v in usuario.items() if k != "activo"})
