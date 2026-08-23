from fastapi import APIRouter, Depends, HTTPException, Header, Request
from typing import Optional
from backend.db.client import db_conn
from backend.services.auth_service import (
    buscar_usuario, verificar_password, crear_sesion, eliminar_sesion,
)
from backend.models.auth import LoginRequest, TokenOut, UsuarioOut
from backend.middleware.auth import get_current_user
from backend.middleware.rate_limiter import limiter
from backend.services.audit_service import log_accion
from datetime import timedelta
from pydantic import BaseModel

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=TokenOut)
@limiter.limit("5/minute")
def login(request: Request, body: LoginRequest, conn=Depends(db_conn)):
    ip = request.client.host if request.client else None
    usuario = buscar_usuario(body.username, conn)
    if not usuario or not verificar_password(body.password, usuario["password_hash"]):
        log_accion(conn, "LOGIN_FAILED", {"username": body.username}, ip=ip)
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")
    token = crear_sesion(usuario["id"], conn)
    log_accion(conn, "LOGIN_OK", {"username": usuario["username"], "rol": usuario["rol"]},
               usuario_id=usuario["id"], ip=ip)
    return TokenOut(
        token=token,
        usuario=UsuarioOut(
            id=usuario["id"],
            username=usuario["username"],
            rol=usuario["rol"],
            nombre_completo=usuario["nombre_completo"],
        ),
    )


class RecoverRequest(BaseModel):
    username: str
    pin: str


@router.post("/recover")
@limiter.limit("5/hour")
def recuperar_via_pin(request: Request, body: RecoverRequest, conn=Depends(db_conn)):
    """Verifica PIN de recuperación y retorna token de sesión de 15 minutos."""
    from backend.services.auth_service import hash_password, verificar_password
    ip = request.client.host if request.client else None
    username = body.username.strip().lower()

    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, pin_recuperacion, pin_bloqueado FROM usuarios WHERE username = %s",
            (username,),
        )
        row = cur.fetchone()

    if not row:
        raise HTTPException(status_code=401, detail="Credenciales inválidas")

    uid, pin_hash, pin_bloqueado = row
    if pin_bloqueado:
        raise HTTPException(status_code=429, detail="PIN bloqueado. Contacta al administrador.")

    if not pin_hash or not verificar_password(body.pin, pin_hash):
        log_accion(conn, "PIN_FAILED", {"username": username}, ip=ip)
        with conn.cursor() as cur:
            cur.execute(
                "SELECT COUNT(*) FROM audit_log "
                "WHERE accion = 'PIN_FAILED' "
                "  AND metadata->>'username' = %s "
                "  AND timestamp > NOW() - INTERVAL '1 hour'",
                (username,),
            )
            count = cur.fetchone()[0]
        if count >= 5:
            with conn.cursor() as cur:
                cur.execute("UPDATE usuarios SET pin_bloqueado = TRUE WHERE id = %s", (uid,))
            conn.commit()
            raise HTTPException(status_code=429, detail="PIN bloqueado por demasiados intentos")
        raise HTTPException(status_code=401, detail="PIN incorrecto")

    token = crear_sesion(uid, conn, device_hint="recovery", expires_delta=timedelta(minutes=15))
    log_accion(conn, "PIN_RECOVERY_OK", {"username": username}, usuario_id=uid, ip=ip)
    return {"token": token, "expires_in_minutes": 15}


@router.get("/me", response_model=UsuarioOut)
def me(usuario=Depends(get_current_user)):
    return UsuarioOut(**usuario)


@router.post("/logout")
def logout(x_session_token: Optional[str] = Header(None), conn=Depends(db_conn)):
    if x_session_token:
        eliminar_sesion(x_session_token.strip(), conn)
    return {"ok": True}


@router.post("/logout-all")
def logout_all(usuario=Depends(get_current_user), conn=Depends(db_conn)):
    """Invalida todas las sesiones activas del usuario (cierre en todos los dispositivos)."""
    with conn.cursor() as cur:
        cur.execute("DELETE FROM sesiones WHERE usuario_id = %s", (usuario["id"],))
    conn.commit()
    return {"ok": True}
