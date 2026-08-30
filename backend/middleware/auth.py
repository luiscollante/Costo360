"""
Autenticación — Fase 2.A: Supabase Auth (JWT ES256 verificado por JWKS).

`get_current_user`:
  1. Lee `Authorization: Bearer <access_token>`.
  2. Verifica el JWT contra el JWKS del proyecto (algoritmo asimétrico ES256), validando
     `exp`, `aud='authenticated'`, `iss=<SUPABASE_URL>/auth/v1`. Nunca lee `alg` del header.
  3. Con `sub` (UUID del usuario) carga el perfil desde `public.usuarios` JOIN
     `roles_catalogo` usando una conexión de SERVICIO (rol postgres, BYPASSRLS) — sin caché,
     así un `activo=false` o un cambio de rol surten efecto en el request siguiente.
  4. Devuelve un dict con `id`, `empresa_id`, `rol_codigo`, `nombre_completo`, `cargo_visible`,
     `activo` y las 4 capacidades del catálogo de roles.

Sin fila en `usuarios` (usuario autenticado pero no aprovisionado, p. ej. OAuth de un no
invitado) → 403. `activo=false` → 403.
"""
import os
import re

from fastapi import Header, HTTPException

import jwt
from jwt import PyJWKClient

_UUID_RE = re.compile(
    r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
)

_jwk_client: PyJWKClient | None = None


def _supabase_url() -> str:
    url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    if not url:
        raise RuntimeError("SUPABASE_URL no está configurada")
    return url


def _issuer() -> str:
    return _supabase_url() + "/auth/v1"


def _get_jwk_client() -> PyJWKClient:
    global _jwk_client
    if _jwk_client is None:
        _jwk_client = PyJWKClient(
            _supabase_url() + "/auth/v1/.well-known/jwks.json",
            cache_keys=True,
            lifespan=3600,
        )
    return _jwk_client


def _verify_jwt(token: str) -> dict:
    signing_key = _get_jwk_client().get_signing_key_from_jwt(token)
    payload = jwt.decode(
        token,
        signing_key.key,
        algorithms=["ES256"],
        audience="authenticated",
        issuer=_issuer(),
        leeway=30,
        options={"require": ["exp", "sub"]},
    )
    if payload.get("role") != "authenticated":
        raise jwt.InvalidTokenError("role no es 'authenticated'")
    return payload


_PERFIL_SQL = """
    select u.empresa_id, u.rol_codigo, u.nombre_completo, u.cargo_visible, u.activo,
           r.puede_ver_dashboard, r.puede_usar_modo_bi_senior,
           r.puede_pedir_datos_agregados_agente, r.puede_gestionar_usuarios,
           sa.device_actual ->> 'id' as device_actual_id, sa.estado as sesion_estado
    from public.usuarios u
    join public.roles_catalogo r on r.codigo = u.rol_codigo
    left join public.sesion_activa sa on sa.usuario_id = u.id
    where u.id = %s
"""


def _load_perfil(sub: str):
    # Import perezoso para no crear ciclo con db.client.
    from backend.db.client import get_engine

    conn = get_engine().raw_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(_PERFIL_SQL, (sub,))
            row = cur.fetchone()
        conn.rollback()
        return row
    finally:
        conn.close()


def get_current_user(authorization: str | None = Header(None)):
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Falta el token de acceso")
    token = authorization[7:].strip()

    try:
        payload = _verify_jwt(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")

    sub = payload.get("sub")
    if not sub or not _UUID_RE.match(sub):
        raise HTTPException(status_code=401, detail="Token sin sujeto válido")

    row = _load_perfil(sub)
    if row is None:
        raise HTTPException(status_code=403, detail="Tu cuenta no tiene un perfil asignado")
    if not row[4]:
        raise HTTPException(status_code=403, detail="Tu cuenta está inactiva")

    return {
        "id": sub,
        "empresa_id": str(row[0]),
        "rol_codigo": row[1],
        "nombre_completo": row[2] or "",
        "cargo_visible": row[3],
        "activo": row[4],
        "puede_ver_dashboard": row[5],
        "puede_usar_modo_bi_senior": row[6],
        "puede_pedir_datos_agregados_agente": row[7],
        "puede_gestionar_usuarios": row[8],
        # Sesión única (Regla 5) — el dispositivo que hoy tiene la sesión, y su estado.
        "_session_device_id": row[9],
        "_session_estado": row[10],
    }
