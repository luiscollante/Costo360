import os
from sqlalchemy import create_engine

_engine = None


def get_engine():
    global _engine
    if _engine is None:
        url = os.environ.get("DATABASE_URL", "")
        _engine = create_engine(
            url,
            pool_size=5,
            max_overflow=5,
            pool_pre_ping=True,
            pool_recycle=300,
            connect_args={"connect_timeout": 10},
        )
    return _engine


def db_conn():
    """Dependencia FastAPI que entrega una conexión del pool y la devuelve al terminar."""
    conn = get_engine().raw_connection()
    try:
        yield conn
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
