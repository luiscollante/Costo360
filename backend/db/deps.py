"""
Dependencias de autorización — Fase 2.A.

El aislamiento POR EMPRESA lo garantiza RLS bajo `db_rls`. Estas dependencias
cubren:
- permisos por CAPACIDAD del catálogo de roles (`roles_catalogo`), y
- el aislamiento JERÁRQUICO dentro de la misma empresa (Regla 2): un rol
  `operativo` solo ve sus propias filas; `admin`/`gerencia` (con
  `puede_ver_dashboard`) ven todo lo de su empresa.
"""
from fastapi import Depends, HTTPException

from backend.middleware.auth import get_current_user


def require_gestion_usuarios(usuario=Depends(get_current_user)):
    if not usuario.get("puede_gestionar_usuarios"):
        raise HTTPException(status_code=403, detail="Requiere permiso de gestión de usuarios")
    return usuario


def require_dashboard(usuario=Depends(get_current_user)):
    if not usuario.get("puede_ver_dashboard"):
        raise HTTPException(status_code=403, detail="Requiere acceso a Dashboard / BI")
    return usuario


def require_datos_agregados_agente(usuario=Depends(get_current_user)):
    if not usuario.get("puede_pedir_datos_agregados_agente"):
        raise HTTPException(status_code=403, detail="Requiere permiso para consultar datos agregados")
    return usuario


def scope_propio(usuario) -> tuple[bool, str | None]:
    """
    (restringido, uuid) para el aislamiento jerárquico interno (Regla 2).
    restringido=True  → el usuario solo ve sus propias filas (usuario_id = uuid).
    restringido=False → ve todo lo de su empresa (uuid es None).
    """
    if usuario.get("puede_ver_dashboard"):
        return False, None
    return True, usuario["id"]
