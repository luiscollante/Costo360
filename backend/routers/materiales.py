from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from backend.db.client import db_rls
from backend.middleware.auth import get_current_user
from backend.db.deps import require_dashboard, verificar_dispositivo

router = APIRouter(prefix="/api/materiales", tags=["materiales"],
                   dependencies=[Depends(verificar_dispositivo)])

# Columnas comunes de salida. `es_propio` = la fila pertenece a este taller
# (empresa_id no es NULL) → editable/borrable desde la pantalla de catálogo.
_COLS = (
    "id, categoria, referencia, precio_m2, precio_lamina, "
    "ancho_lamina_cm, alto_lamina_cm, proveedor, (empresa_id IS NOT NULL) AS es_propio"
)


def _row(r):
    return {
        "id":              r[0],
        "categoria":       r[1],
        "referencia":      r[2],
        "precio_m2":       float(r[3] or 0),
        "precio_lamina":   float(r[4]) if r[4] else None,
        "ancho_lamina_cm": float(r[5]) if r[5] else None,
        "alto_lamina_cm":  float(r[6]) if r[6] else None,
        "proveedor":       r[7],
        "es_propio":       bool(r[8]),
    }


@router.get("")
def listar_materiales(
    categoria: str = Query(default=""),
    conn=Depends(db_rls),
    _usuario=Depends(get_current_user),
):
    """Catálogo visible: filas base de Costo360 + las propias del taller (RLS)."""
    try:
        cur = conn.cursor()
        if categoria:
            cur.execute(
                f"SELECT {_COLS} FROM catalogo_materiales "
                "WHERE activo = TRUE AND LOWER(categoria) = LOWER(%s) "
                "ORDER BY es_propio DESC, referencia",
                (categoria,),
            )
        else:
            cur.execute(
                f"SELECT {_COLS} FROM catalogo_materiales "
                "WHERE activo = TRUE ORDER BY categoria, es_propio DESC, referencia"
            )
        rows = cur.fetchall()
    except Exception as e:
        print(f"[materiales] ERROR: {e}", flush=True)
        return []
    return [_row(r) for r in rows]


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


# ── Materiales propios del taller (R10) ──────────────────────────────────────

class MaterialIn(BaseModel):
    categoria:       str = Field(min_length=1, max_length=60)
    referencia:      str = Field(min_length=1, max_length=200)
    precio_m2:       float = Field(ge=0)
    precio_lamina:   float | None = Field(default=None, ge=0)
    ancho_lamina_cm: float | None = Field(default=None, ge=0)
    alto_lamina_cm:  float | None = Field(default=None, ge=0)
    proveedor:       str = ""


class MaterialUpdate(BaseModel):
    referencia:    str | None = Field(default=None, min_length=1, max_length=200)
    precio_m2:     float | None = Field(default=None, ge=0)
    proveedor:     str | None = None
    activo:        bool | None = None


@router.post("", status_code=201)
def crear_material(
    body: MaterialIn,
    conn=Depends(db_rls),
    usuario=Depends(get_current_user),
):
    """Agrega un material al catálogo del taller. Lo usa cualquier usuario al
    elegir 'Otro' en una cotización. Si ya existe (misma categoría+referencia,
    sin distinguir mayúsculas) se actualiza el precio en vez de duplicar."""
    emp = usuario["empresa_id"]
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO catalogo_materiales "
        "(empresa_id, categoria, referencia, precio_m2, precio_lamina, "
        " ancho_lamina_cm, alto_lamina_cm, proveedor, activo) "
        "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, TRUE) "
        "ON CONFLICT (empresa_id, lower(categoria), lower(referencia)) "
        "  WHERE empresa_id IS NOT NULL "
        "DO UPDATE SET precio_m2 = EXCLUDED.precio_m2, "
        "  proveedor = EXCLUDED.proveedor, activo = TRUE "
        f"RETURNING {_COLS}",
        (emp, body.categoria, body.referencia.strip(), body.precio_m2,
         body.precio_lamina, body.ancho_lamina_cm, body.alto_lamina_cm,
         body.proveedor.strip()),
    )
    return _row(cur.fetchone())


@router.put("/{material_id}")
def editar_material(
    material_id: int,
    body: MaterialUpdate,
    conn=Depends(db_rls),
    _usuario=Depends(require_dashboard),
):
    """Edita un material PROPIO del taller (RLS bloquea las filas base y las de
    otro taller). Solo Admin/Gerencia."""
    campos, valores = [], []
    for col in ("referencia", "precio_m2", "proveedor", "activo"):
        v = getattr(body, col)
        if v is not None:
            campos.append(f"{col} = %s")
            valores.append(v.strip() if isinstance(v, str) else v)
    if not campos:
        raise HTTPException(status_code=400, detail="Nada que actualizar")
    valores.append(material_id)
    cur = conn.cursor()
    cur.execute(
        f"UPDATE catalogo_materiales SET {', '.join(campos)} "
        f"WHERE id = %s RETURNING {_COLS}",
        valores,
    )
    row = cur.fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Material no encontrado o no editable")
    return _row(row)


@router.delete("/{material_id}", status_code=204)
def eliminar_material(
    material_id: int,
    conn=Depends(db_rls),
    _usuario=Depends(require_dashboard),
):
    """Elimina un material PROPIO del taller. Solo Admin/Gerencia."""
    cur = conn.cursor()
    cur.execute("DELETE FROM catalogo_materiales WHERE id = %s", (material_id,))
    if cur.rowcount == 0:
        raise HTTPException(status_code=404, detail="Material no encontrado o no eliminable")
