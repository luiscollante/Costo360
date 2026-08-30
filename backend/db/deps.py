"""
Dependencias de autorización — Fase 2.A.

El aislamiento POR EMPRESA lo garantiza RLS bajo `db_rls`. Estas dependencias
cubren:
- permisos por CAPACIDAD del catálogo de roles (`roles_catalogo`), y
- el aislamiento JERÁRQUICO dentro de la misma empresa (Regla 2): un rol
  `operativo` solo ve sus propias filas; `admin`/`gerencia` (con
  `puede_ver_dashboard`) ven todo lo de su empresa.
"""
from fastapi import Depends, Header, HTTPException

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


def verificar_dispositivo(
    usuario=Depends(get_current_user),
    x_device_id: str | None = Header(None),
):
    """
    Sesión única (Regla 5). Compara el `X-Device-Id` del cliente contra el
    dispositivo que hoy tiene la sesión (`sesion_activa.device_actual`).
    - Sin fila de `sesion_activa` → aún no se reclamó (justo tras login): se permite.
    - Coincide → se permite (incluye al titular durante un `takeover_pendiente`:
      "no se cierra en silencio", el titular sigue trabajando hasta que decida).
    - No coincide → 409 SESSION_SUPERSEDED. El cliente muestra "tu sesión se movió".
    Los endpoints `/api/auth/session/*` NO usan esta dependencia.
    """
    dev = usuario.get("_session_device_id")
    if dev is None:
        return usuario
    if x_device_id and x_device_id == dev:
        return usuario
    # Distinguir "aún esperando confirmación" (este dispositivo es el retador de un
    # takeover en curso) de "te expulsaron". El frontend solo cierra sesión ante
    # SESSION_SUPERSEDED; SESSION_PENDING deja que `SessionGuard` siga en "esperando".
    if usuario.get("_session_estado") == "takeover_pendiente":
        raise HTTPException(
            status_code=409,
            detail={"code": "SESSION_PENDING",
                    "message": "Esperando confirmación en el otro dispositivo"},
        )
    raise HTTPException(
        status_code=409,
        detail={"code": "SESSION_SUPERSEDED",
                "message": "Tu sesión está activa en otro dispositivo"},
    )


def scope_propio(usuario) -> tuple[bool, str | None]:
    """
    (restringido, uuid) para el aislamiento jerárquico interno (Regla 2).
    restringido=True  → el usuario solo ve sus propias filas (usuario_id = uuid).
    restringido=False → ve todo lo de su empresa (uuid es None).
    """
    if usuario.get("puede_ver_dashboard"):
        return False, None
    return True, usuario["id"]
