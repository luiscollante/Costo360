"""
Registro de auditoría — Fase 2.A.

`audit_log` ahora exige `empresa_id NOT NULL` y su policy de INSERT exige
`empresa_id = empresa_actual()`. Además el request completo va en UNA transacción
bajo `db_rls`, así que `log_accion` NO puede tocar `commit`/`rollback` de la
conexión compartida (hallazgo D1: un `rollback()` aquí borraba el trabajo real del
endpoint). Se aísla con SAVEPOINT: si el INSERT falla, se revierte solo el
savepoint y el request sigue su curso.
"""
from psycopg2.extras import Json


def log_accion(conn, accion: str, metadata: dict = None, *, empresa_id,
               usuario_id=None, ip: str = None) -> None:
    try:
        with conn.cursor() as cur:
            cur.execute("SAVEPOINT sp_audit")
            cur.execute(
                "INSERT INTO audit_log (empresa_id, usuario_id, accion, metadata, ip) "
                "VALUES (%s, %s, %s, %s, %s)",
                (empresa_id, usuario_id, accion, Json(metadata or {}), ip),
            )
            cur.execute("RELEASE SAVEPOINT sp_audit")
    except Exception:
        try:
            with conn.cursor() as cur:
                cur.execute("ROLLBACK TO SAVEPOINT sp_audit")
        except Exception:
            pass
