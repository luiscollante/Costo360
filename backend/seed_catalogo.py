"""
Recarga autoritativa de `catalogo_materiales` desde `seed_materiales.json`.

`catalogo_materiales` es un catálogo COMPARTIDO entre todas las empresas (sin
`empresa_id`). El JSON es la fuente de verdad → se hace DELETE + INSERT masivo,
idempotente por definición. Corre con el rol de servicio (`get_engine`, BYPASSRLS),
que es lo único que puede escribir esta tabla (`force rls`, solo policy de SELECT).

Uso (con `backend/.env` apuntando al proyecto nuevo):
    python -m backend.seed_catalogo
"""
import json
import os

from backend.db.client import get_engine


def seed() -> int:
    path = os.path.join(os.path.dirname(__file__), "seed_materiales.json")
    with open(path, encoding="utf-8") as f:
        items = json.load(f)

    conn = get_engine().raw_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM public.catalogo_materiales")
            for it in items:
                cur.execute(
                    "INSERT INTO public.catalogo_materiales "
                    "(categoria, referencia, precio_m2, precio_lamina, "
                    " ancho_lamina_cm, alto_lamina_cm, proveedor) "
                    "VALUES (%s, %s, %s, %s, %s, %s, %s)",
                    (
                        it.get("categoria", ""), it.get("referencia", ""),
                        it.get("precio_m2", 0), it.get("precio_lamina"),
                        it.get("ancho_lamina_cm"), it.get("alto_lamina_cm"),
                        it.get("proveedor", ""),
                    ),
                )
        conn.commit()
    finally:
        conn.close()

    print(f"[seed_catalogo] {len(items)} materiales recargados")
    return len(items)


if __name__ == "__main__":
    seed()
