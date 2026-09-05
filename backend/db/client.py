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
from contextlib import contextmanager

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
            pool_recycle=900,  # proceso long-lived con tráfico esporádico
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


@contextmanager
def rls_connection(user: dict):
    """
    Conexión CORTA con RLS activo bajo el JWT del usuario — abre, comitea/revierte
    y cierra al salir del `with`. Es el mismo mecanismo de `db_rls` de abajo,
    extraído para poder reutilizarse fuera del ciclo de vida de `Depends()` de
    FastAPI.

    Uso previsto: el orquestador del Agente de IA (Objetivo 5) NUNCA debe
    mantener una única conexión abierta durante todo un turno conversacional
    (razonamiento del modelo + varias tool-calls puede tardar varios segundos,
    muy por encima de lo que el pool `pool_size=5, max_overflow=5` está
    dimensionado a sostener — hallazgo bloqueante de la auditoría de seguridad
    del Objetivo 5). En su lugar, cada tool-call individual abre su propia
    conexión corta con `with rls_connection(usuario) as conn: ...`, exactamente
    igual de rápida que cualquier CRUD normal de hoy, y la cierra antes de que
    el control vuelva al modelo para su siguiente paso de razonamiento.
    """
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


def db_rls(user: dict = Depends(get_current_user)):
    """Conexión con RLS activo bajo el JWT del usuario. Para todos los routers de datos."""
    with rls_connection(user) as conn:
        yield conn
