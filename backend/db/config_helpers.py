import json


def cfg_get(conn, key: str, default=None):
    """Lee un valor de app_config y lo decodifica como JSON. Retorna default si no existe."""
    cur = conn.cursor()
    cur.execute("SELECT valor FROM app_config WHERE clave = %s", (key,))
    row = cur.fetchone()
    cur.close()
    if row:
        try:
            return json.loads(row[0])
        except Exception:
            return default
    return default


def cfg_set(conn, key: str, value) -> None:
    """Guarda un valor en app_config como JSON. Usa UPSERT."""
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO app_config (clave, valor) VALUES (%s, %s) "
        "ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor",
        (key, json.dumps(value, ensure_ascii=False, default=str)),
    )
    conn.commit()
    cur.close()
