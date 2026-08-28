from fastapi import APIRouter, Depends, Query
from backend.db.client import db_rls
from backend.middleware.auth import get_current_user

router = APIRouter(prefix="/api/materiales", tags=["materiales"])


@router.get("")
def listar_materiales(
    categoria: str = Query(default=""),
    conn=Depends(db_rls),
    _usuario=Depends(get_current_user),
):
    try:
        cur = conn.cursor()
        if categoria:
            cur.execute(
                "SELECT id, categoria, referencia, precio_m2, precio_lamina, "
                "ancho_lamina_cm, alto_lamina_cm, proveedor "
                "FROM catalogo_materiales "
                "WHERE activo = TRUE AND LOWER(categoria) = LOWER(%s) "
                "ORDER BY referencia",
                (categoria,),
            )
        else:
            cur.execute(
                "SELECT id, categoria, referencia, precio_m2, precio_lamina, "
                "ancho_lamina_cm, alto_lamina_cm, proveedor "
                "FROM catalogo_materiales "
                "WHERE activo = TRUE "
                "ORDER BY categoria, referencia"
            )
        rows = cur.fetchall()
    except Exception as e:
        print(f"[materiales] ERROR: {e}", flush=True)
        return []

    return [
        {
            "id":              r[0],
            "categoria":       r[1],
            "referencia":      r[2],
            "precio_m2":       float(r[3] or 0),
            "precio_lamina":   float(r[4]) if r[4] else None,
            "ancho_lamina_cm": float(r[5]) if r[5] else None,
            "alto_lamina_cm":  float(r[6]) if r[6] else None,
            "proveedor":       r[7],
        }
        for r in rows
    ]


@router.get("/categorias")
def listar_categorias(
    conn=Depends(db_rls),
    _usuario=Depends(get_current_user),
):
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT DISTINCT categoria FROM catalogo_materiales "
            "WHERE activo = TRUE ORDER BY categoria"
        )
        return [r[0] for r in cur.fetchall()]
    except Exception as e:
        print(f"[materiales] ERROR en categorias: {e}", flush=True)
        return []
