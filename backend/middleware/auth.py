from fastapi import HTTPException, Header, Depends
from typing import Optional
from backend.db.client import db_conn
from backend.services.auth_service import validar_sesion


def get_current_user(
    x_session_token: Optional[str] = Header(None),
    conn=Depends(db_conn),
):
    """
    Lee el token de sesión desde el header X-Session-Token.
    El header Authorization queda reservado para Cloud Run IAM.
    """
    if not x_session_token:
        raise HTTPException(status_code=401, detail="Token de sesión requerido")
    token = x_session_token.strip()
    usuario = validar_sesion(token, conn)
    if not usuario:
        raise HTTPException(status_code=401, detail="Sesión expirada o inválida")
    # Sliding window: actualiza ultimo_uso con un throttle de 1 minuto
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE sesiones SET ultimo_uso = NOW() "
                "WHERE token = %s "
                "  AND (ultimo_uso IS NULL OR ultimo_uso < NOW() - INTERVAL '1 minute')",
                (token,),
            )
        conn.commit()
    except Exception:
        pass
    return usuario
