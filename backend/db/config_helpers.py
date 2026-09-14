"""
Lectura/escritura de `app_config` — Fase 2.A.

`app_config` ahora tiene PK compuesta `(empresa_id, clave)` y `valor` es `jsonb`.
Bajo `db_rls` la fila queda además aislada por empresa vía RLS, pero se pasa
`empresa_id` explícito (hallazgos D2/D7):
- `cfg_get`: psycopg2 ya devuelve `dict`/`list` para `jsonb` — NO hacer `json.loads`
  sobre eso (era el bug que hacía "desaparecer" toda la config guardada).
- `cfg_set`: UPSERT sobre `(empresa_id, clave)`, sin `conn.commit()` (lo hace la
  dependencia `db_rls`).
"""
import json

from psycopg2.extras import Json

_dumps = lambda v: json.dumps(v, ensure_ascii=False, default=str)


def cfg_get(conn, empresa_id, key: str, default=None):
    cur = conn.cursor()
    cur.execute(
        "SELECT valor FROM app_config WHERE empresa_id = %s AND clave = %s",
        (empresa_id, key),
    )
    row = cur.fetchone()
    cur.close()
    if not row:
        return default
    # psycopg2 ya deserializa `jsonb` a su tipo Python nativo (dict/list/str/
    # int/float/bool/None) -- para un valor JSON que es un STRING (como el
    # logo en base64), eso significa que row[0] YA es el string final, no un
    # string-que-contiene-JSON. Un json.loads() aquí encima rompe (el base64
    # no es JSON válido), la excepción se traga, y la funcion devuelve
    # `default` en silencio -- exactamente el bug que hacía "desaparecer" el
    # logo subido aunque la fila sí existiera en la base de datos.
    return row[0]


def cfg_set(conn, empresa_id, key: str, value) -> None:
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO app_config (empresa_id, clave, valor) VALUES (%s, %s, %s) "
        "ON CONFLICT (empresa_id, clave) DO UPDATE "
        "SET valor = EXCLUDED.valor, actualizado = now()",
        (empresa_id, key, Json(value, dumps=_dumps)),
    )
    cur.close()
