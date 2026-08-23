from fastapi import Depends, HTTPException
from backend.middleware.auth import get_current_user


def require_admin(usuario=Depends(get_current_user)):
    if usuario.get("rol") != "Admin":
        raise HTTPException(status_code=403, detail="Se requiere rol Admin")
    return usuario


def require_admin_or_gerente(usuario=Depends(get_current_user)):
    if usuario.get("rol") not in ("Admin", "Gerente"):
        raise HTTPException(status_code=403, detail="Se requiere rol Admin o Gerente")
    return usuario
