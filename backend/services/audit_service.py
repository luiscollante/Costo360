from psycopg2.extras import Json


def log_accion(
    conn,
    accion: str,
    metadata: dict = None,
    usuario_id: int = None,
    ip: str = None,
) -> None:
    """Registra una acción en audit_log. Nunca lanza excepción — el log no debe cortar el request principal."""
    try:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO audit_log (accion, metadata, usuario_id, ip) "
                "VALUES (%s, %s, %s, %s)",
                (accion, Json(metadata or {}), usuario_id, ip),
            )
        conn.commit()
    except Exception:
        try:
            conn.rollback()
        except Exception:
            pass
