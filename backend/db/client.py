"""
Conexión a Postgres (Supabase) — Fase 2.A.

Dos dependencias FastAPI, con roles y garantías distintas:

- `db_service()` — conexión tal cual del pool. El rol de `DATABASE_URL` es `postgres`,
  que en Supabase tiene BYPASSRLS. Se usa SOLO para: verificar el perfil en
  `get_current_user`, aprovisionamiento (`/api/bootstrap/*`), gestión de usuarios
  (`routers/admin.py`) y la lógica de `sesion_activa`. Estos endpoints validan el
  permiso en Python antes de escribir. NUNCA usar `db_service` para datos de negocio.

- `db_rls(user=Depends(get_current_user))` — conexión del pool + por transacción:
  fija `request.jwt.claims` (con `sub` y `role`) y hace `SET LOCAL ROLE authenticated`,
  de modo que `auth.uid()` resuelva y las políticas RLS apliquen (el rol
  `authenticated` NO tiene BYPASSRLS). Verifica que el cambio de rol realmente ocurrió
  y aborta con 500 si no (hallazgo C2: `SET LOCAL` es un no-op silencioso fuera de
  transacción).

Requisito: todo el trabajo de BD de un request bajo `db_rls` ocurre en UNA sola
transacción — sin `conn.commit()` intermedios (el commit final lo hace la dependencia).

`DATABASE_URL` debe apuntar al **session pooler** (puerto 5432) del proyecto nuevo,
no al transaction pooler (6543): `SET LOCAL` no sobrevive a un `commit()` allí.
"""
import json
import os

from fastapi import Depends, HTTPException
from sqlalchemy import create_engine

from backend.middleware.auth import get_current_user

_engine = None


def get_engine():
    global _engine
    if _engine is None:
        url = os.environ.get("DATABASE_URL", "")
        if not url:
            raise RuntimeError("DATABASE_URL no está configurada")
        _engine = create_engine(
            url,
            pool_size=5,
            max_overflow=5,
            pool_pre_ping=True,
            pool_recycle=300,
            connect_args={"connect_timeout": 10},
        )
    return _engine


def db_service():
    """Conexión de servicio (rol postgres, BYPASSRLS). Solo auth/aprovisionamiento/admin/sesión."""
    conn = get_engine().raw_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        try:
            conn.rollback()
        except Exception:
            pass
        raise
    finally:
        try:
            conn.rollback()
        except Exception:
            pass
        conn.close()


def _claims_json(user: dict) -> str:
    # Reconstrucción MÍNIMA — nunca se pasa el payload crudo del JWT ni user_metadata
    # a una policy / función SECURITY DEFINER (hallazgo II.4 de la auditoría).
    return json.dumps({"sub": user["id"], "role": "authenticated"})


def db_rls(user: dict = Depends(get_current_user)):
    """Conexión con RLS activo bajo el JWT del usuario. Para todos los routers de datos."""
    conn = get_engine().raw_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("select set_config('request.jwt.claims', %s, true)", (_claims_json(user),))
            cur.execute("set local role authenticated")
            cur.execute("select current_user, current_setting('request.jwt.claims', true)")
            rol_actual, claims = cur.fetchone()
        if rol_actual != "authenticated" or not claims:
            raise HTTPException(
                status_code=500,
                detail="El aislamiento por empresa no se activó; petición abortada",
            )
        yield conn
        conn.commit()
    except Exception:
        try:
            conn.rollback()
        except Exception:
            pass
        raise
    finally:
        try:
            conn.rollback()
        except Exception:
            pass
        conn.close()


# Alias temporal para routers de datos aún no migrados. B3 los pasa a `db_rls`/`db_service`
# uno a uno y elimina este alias.
db_conn = db_service
