from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
import psycopg2

from backend.db.client import db_rls
from backend.middleware.auth import get_current_user
from backend.db.deps import verificar_dispositivo

router = APIRouter(prefix="/api/materiales", tags=["materiales"],
                   dependencies=[Depends(verificar_dispositivo)])

# Columnas comunes de salida. `es_propio` = la fila pertenece a este taller
# (empresa_id no es NULL) → editable/borrable desde la pantalla de catálogo.
_COLS = (
    "id, categoria, referencia, precio_m2, precio_lamina, "
    "ancho_lamina_cm, alto_lamina_cm, proveedor, (empresa_id IS NOT NULL) AS es_propio"
)

# Filas base (de Costo360) que este taller YA sombreó con un override propio.
# Se excluyen del listado para no mostrar el material dos veces.
_NO_SOMBREADA = (
    "NOT (empresa_id IS NULL AND EXISTS ("
    "  SELECT 1 FROM catalogo_materiales o "
    "  WHERE o.empresa_id = (SELECT public.empresa_actual()) "
    "    AND o.base_id = catalogo_materiales.id))"
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
    """Catálogo visible: filas propias del taller + las base de Costo360 que el
    taller no haya personalizado todavía (RLS + copy-on-write, ver 0006)."""
    try:
        cur = conn.cursor()
        if categoria:
            cur.execute(
                f"SELECT {_COLS} FROM catalogo_materiales "
                f"WHERE activo = TRUE AND LOWER(categoria) = LOWER(%s) AND {_NO_SOMBREADA} "
                "ORDER BY es_propio DESC, referencia",
                (categoria,),
            )
        else:
            cur.execute(
                f"SELECT {_COLS} FROM catalogo_materiales "
                f"WHERE activo = TRUE AND {_NO_SOMBREADA} "
                "ORDER BY categoria, es_propio DESC, referencia"
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
    categoria:     str | None = Field(default=None, min_length=1, max_length=60)
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
    """Agrega un material NUEVO al catálogo del taller. Lo usa cualquier usuario
    al elegir 'Otro' en una cotización o con 'Agregar material' en el catálogo.
    Si ya existe (misma categoría+referencia, sin distinguir mayúsculas) se
    actualiza el precio en vez de duplicar."""
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
        (emp, body.categoria.strip(), body.referencia.strip(), body.precio_m2,
         body.precio_lamina, body.ancho_lamina_cm, body.alto_lamina_cm,
         body.proveedor.strip()),
    )
    return _row(cur.fetchone())


@router.put("/{material_id}")
def editar_material(
    material_id: int,
    body: MaterialUpdate,
    conn=Depends(db_rls),
    _usuario=Depends(get_current_user),
):
    """Edita un material del catálogo del taller (categoría, nombre, precio).

    - Fila propia del taller → UPDATE directo.
    - Fila base de Costo360  → NO se toca; se crea (o actualiza) una fila propia
      del taller que la sombrea (`base_id`). El cambio solo aplica a este taller.
      Cualquier usuario del taller (incl. operativo) puede hacerlo; RLS impide
      tocar el catálogo de otro taller.
    """
    cur = conn.cursor()
    cur.execute(
        "SELECT id, empresa_id, categoria, referencia, precio_m2, precio_lamina, "
        "       ancho_lamina_cm, alto_lamina_cm, proveedor "
        "FROM catalogo_materiales WHERE id = %s AND activo = TRUE",
        (material_id,),
    )
    base = cur.fetchone()
    if base is None:
        raise HTTPException(status_code=404, detail="Material no encontrado")

    nueva_cat = (body.categoria or base[2]).strip()
    nueva_ref = (body.referencia or base[3]).strip()
    nuevo_precio = base[4] if body.precio_m2 is None else body.precio_m2

    try:
        if base[1] is not None:
            # Fila propia → UPDATE directo (RLS ya aísla por empresa).
            campos = ["categoria = %s", "referencia = %s", "precio_m2 = %s"]
            valores = [nueva_cat, nueva_ref, nuevo_precio]
            if body.proveedor is not None:
                campos.append("proveedor = %s")
                valores.append(body.proveedor.strip())
            if body.activo is not None:
                campos.append("activo = %s")
                valores.append(body.activo)
            valores.append(material_id)
            cur.execute(
                f"UPDATE catalogo_materiales SET {', '.join(campos)} "
                f"WHERE id = %s RETURNING {_COLS}",
                valores,
            )
        else:
            # Fila base → copy-on-write: crear/actualizar el override del taller.
            cur.execute(
                "INSERT INTO catalogo_materiales "
                "(empresa_id, base_id, categoria, referencia, precio_m2, "
                " precio_lamina, ancho_lamina_cm, alto_lamina_cm, proveedor, activo) "
                "VALUES ((SELECT public.empresa_actual()), %s, %s, %s, %s, %s, %s, %s, %s, TRUE) "
                "ON CONFLICT (empresa_id, base_id) WHERE base_id IS NOT NULL "
                "DO UPDATE SET categoria = EXCLUDED.categoria, "
                "  referencia = EXCLUDED.referencia, precio_m2 = EXCLUDED.precio_m2, "
                "  activo = TRUE "
                f"RETURNING {_COLS}",
                (base[0], nueva_cat, nueva_ref, nuevo_precio,
                 base[5], base[6], base[7], base[8]),
            )
        row = cur.fetchone()
    except psycopg2.errors.UniqueViolation:
        raise HTTPException(
            status_code=409,
            detail="Ya tienes un material con ese nombre en esa categoría.",
        )
    if row is None:
        raise HTTPException(status_code=404, detail="Material no encontrado o no editable")
    return _row(row)


@router.delete("/{material_id}", status_code=204)
def eliminar_material(
    material_id: int,
    conn=Depends(db_rls),
    _usuario=Depends(get_current_user),
):
    """Quita un material del catálogo del taller. Si era un override de una fila
    base de Costo360, la base vuelve a mostrarse (equivale a 'restablecer').
    RLS impide borrar filas base o de otro taller."""
    cur = conn.cursor()
    cur.execute("DELETE FROM catalogo_materiales WHERE id = %s", (material_id,))
    if cur.rowcount == 0:
        raise HTTPException(status_code=404, detail="Material no encontrado o no eliminable")
