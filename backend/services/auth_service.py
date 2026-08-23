import hashlib
import hmac
import os
import uuid
from datetime import datetime, timedelta

_SALT_LEGACY = b"cc_marmoles_2026_salt"


def hash_password(password: str) -> str:
    """Hash de contraseña o PIN con PBKDF2-SHA256 y salt aleatorio por valor."""
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 200_000)
    return f"{salt.hex()}${dk.hex()}"


def verificar_password(password: str, hash_almacenado: str) -> bool:
    partes = hash_almacenado.split("$")
    if len(partes) == 2:
        salt_hex, key_hex = partes
        try:
            salt_bytes = bytes.fromhex(salt_hex)
        except ValueError:
            return False
        dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt_bytes, 200_000)
        return hmac.compare_digest(dk.hex(), key_hex)
    dk_legacy = hashlib.pbkdf2_hmac("sha256", password.encode(), _SALT_LEGACY, 200_000)
    return hmac.compare_digest(dk_legacy.hex(), hash_almacenado)


def buscar_usuario(username: str, conn) -> dict | None:
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, username, password_hash, rol, nombre_completo "
                "FROM usuarios WHERE username = %s",
                (username.strip().lower(),),
            )
            row = cur.fetchone()
        if row:
            return {
                "id": row[0], "username": row[1], "password_hash": row[2],
                "rol": row[3], "nombre_completo": row[4] or "",
            }
        return None
    except Exception:
        return None


def crear_sesion(
    usuario_id: int,
    conn,
    device_hint: str = "",
    expires_delta: timedelta | None = None,
) -> str:
    token = str(uuid.uuid4())
    if expires_delta is None:
        expires_delta = timedelta(hours=48)
    expires_at = datetime.utcnow() + expires_delta
    ultimo_uso = datetime.utcnow()
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO sesiones (token, usuario_id, expires_at, device_hint, ultimo_uso) "
            "VALUES (%s, %s, %s, %s, %s)",
            (token, usuario_id, expires_at, device_hint, ultimo_uso),
        )
    conn.commit()
    return token


def validar_sesion(token: str, conn) -> dict | None:
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT u.id, u.username, u.rol, u.nombre_completo "
                "FROM sesiones s JOIN usuarios u ON s.usuario_id = u.id "
                "WHERE s.token = %s "
                "  AND s.expires_at > NOW() "
                "  AND s.ultimo_uso > NOW() - INTERVAL '8 hours'",
                (token,),
            )
            row = cur.fetchone()
        if row:
            return {"id": row[0], "username": row[1], "rol": row[2], "nombre_completo": row[3] or ""}
        return None
    except Exception:
        return None


def eliminar_sesion(token: str, conn) -> None:
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM sesiones WHERE token = %s", (token,))
        conn.commit()
    except Exception:
        pass
