"""
Cierre de la escritura directa por PostgREST (migraciones 0017a/0017b) y
revalidación de rol al confirmar/deshacer acciones de Cost.
"""
import os
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

from backend.agente import bitacora, confirmations, registry
from backend.agente.registry import ToolSpec


def _spec(**kw):
    base = dict(nombre="t_prueba", declaracion=None, handler=lambda *a: {},
                es_destructiva=True, requiere_capacidad="puede_editar_parametros",
                handler_confirmar=lambda *a: {"ok": True})
    base.update(kw)
    return ToolSpec(**base)


def test_usuario_puede_respeta_capacidad():
    spec = _spec()
    assert registry.usuario_puede(spec, {"puede_editar_parametros": True})
    assert not registry.usuario_puede(spec, {"puede_editar_parametros": False})
    assert registry.usuario_puede(_spec(requiere_capacidad=None), {})


def _conn_con_fila(fila):
    cur = MagicMock()
    cur.fetchone.return_value = fila
    conn = MagicMock()
    conn.cursor.return_value = cur
    return conn


def test_confirmar_rechaza_rol_sin_capacidad(monkeypatch):
    spec = _spec()
    monkeypatch.setattr(registry, "obtener", lambda n: spec)
    conn = _conn_con_fila(("t_prueba", {}, []))
    with pytest.raises(HTTPException) as e:
        confirmations.confirmar_propuesta(conn, {"id": "u1", "puede_editar_parametros": False}, "p1")
    assert e.value.status_code == 403


def test_confirmar_acepta_tool_no_destructiva_con_handler(monkeypatch):
    # Regresión 2026-09-26: cotizacion_guardar es es_destructiva=False pero
    # pide confirmación; exigir es_destructiva rompió "guardar" desde Cost.
    spec = _spec(es_destructiva=False, requiere_capacidad=None)
    monkeypatch.setattr(registry, "obtener", lambda n: spec)
    monkeypatch.setattr(confirmations.bitacora, "registrar_ejecucion", lambda *a, **k: None)
    conn = _conn_con_fila(("t_prueba", {}, []))
    assert confirmations.confirmar_propuesta(conn, {"id": "u1"}, "p1") == {"ok": True}


def test_confirmar_rechaza_tool_sin_handler(monkeypatch):
    spec = _spec(es_destructiva=False, handler_confirmar=None)
    monkeypatch.setattr(registry, "obtener", lambda n: spec)
    conn = _conn_con_fila(("t_prueba", {}, []))
    with pytest.raises(HTTPException):
        confirmations.confirmar_propuesta(conn, {"id": "u1", "puede_editar_parametros": True}, "p1")


def test_deshacer_rechaza_rol_sin_capacidad(monkeypatch):
    spec = _spec(es_deshacible=True, handler_deshacer=lambda *a: {"ok": True})
    monkeypatch.setattr(registry, "obtener", lambda n: spec)
    conn = _conn_con_fila(("t_prueba", {}, [{"id": "x"}]))
    with pytest.raises(HTTPException) as e:
        bitacora.deshacer_accion(conn, {"id": "u1", "puede_editar_parametros": False}, "h1")
    assert e.value.status_code == 403


# ---------------------------------------------------------------------------
# Regresión contra la base real (se salta sin DATABASE_URL): ninguna tabla de
# public puede quedar escribible por authenticated/anon después de 0017b.
# ---------------------------------------------------------------------------
@pytest.mark.skipif(not os.environ.get("DATABASE_URL"), reason="requiere DATABASE_URL")
def test_ninguna_tabla_escribible_por_postgrest():
    import psycopg2
    with psycopg2.connect(os.environ["DATABASE_URL"]) as conn, conn.cursor() as cur:
        cur.execute("select exists(select 1 from pg_roles where rolname='cost_servidor')")
        if not cur.fetchone()[0]:
            pytest.skip("0017a aún no aplicada")
        cur.execute(
            "select table_name, grantee, privilege_type from information_schema.role_table_grants "
            "where table_schema='public' and grantee in ('authenticated','anon','PUBLIC') "
            "and privilege_type in ('INSERT','UPDATE','DELETE','TRUNCATE')"
        )
        abiertas = cur.fetchall()
    assert abiertas == [], f"Tablas escribibles por PostgREST: {abiertas}"
