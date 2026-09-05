"""
Lógica de negocio de Catálogo de materiales, compartida entre el router HTTP
normal y las tools del Agente de IA (Objetivo 5, Ciclo 2) — misma fuente de
verdad para los dos caminos, nunca una reimplementación aparte del SQL (mismo
patrón que `cotizacion_service.py` / `proyectos_service.py`).
"""
import psycopg2
from fastapi import HTTPException

from backend.services.audit_service import log_accion

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


def listar_materiales(conn, categoria: str = "") -> list[dict]:
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
        print(f"[catalogo] ERROR: {e}", flush=True)
        return []
    return [_row(r) for r in rows]


def listar_categorias(conn) -> list[str]:
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT DISTINCT categoria FROM catalogo_materiales "
            "WHERE activo = TRUE ORDER BY categoria"
        )
        return [r[0] for r in cur.fetchall()]
    except Exception as e:
        print(f"[catalogo] ERROR en categorias: {e}", flush=True)
        return []


def obtener_material(conn, material_id: int) -> dict | None:
    """Lectura de una fila puntual, para la vista previa de una propuesta de
    confirmación del agente. Expone `base_id` (a diferencia de `_row`, que el
    listado humano no necesita) para que la tool de borrado pueda distinguir
    un override (borrarlo solo "restablece" la fila base) de un material
    genuinamente propio del taller (borrarlo es irreversible de verdad)."""
    cur = conn.cursor()
    cur.execute(
        f"SELECT {_COLS}, base_id FROM catalogo_materiales WHERE id = %s AND activo = TRUE",
        (material_id,),
    )
    row = cur.fetchone()
    if row is None:
        return None
    fila = _row(row[:-1])
    fila["base_id"] = row[-1]
    return fila


def buscar_material_propio(conn, categoria: str, referencia: str) -> dict | None:
    """SOLO para el chequeo previo de colisión de `crear_material` desde el
    agente — replica el target del índice único `catalogo_mat_empresa_uniq`
    (empresa_id = empresa_actual() AND lower(categoria)/lower(referencia)).
    El router HTTP no la necesita: el usuario humano ya ve el catálogo en
    pantalla antes de enviar el formulario."""
    cur = conn.cursor()
    cur.execute(
        f"SELECT {_COLS} FROM catalogo_materiales "
        "WHERE empresa_id = (SELECT public.empresa_actual()) "
        "  AND LOWER(categoria) = LOWER(%s) AND LOWER(referencia) = LOWER(%s) "
        "  AND activo = TRUE",
        (categoria, referencia),
    )
    row = cur.fetchone()
    return _row(row) if row else None


def crear_material(conn, usuario, *, categoria: str, referencia: str, precio_m2: float,
                    precio_lamina: float | None = None, ancho_lamina_cm: float | None = None,
                    alto_lamina_cm: float | None = None, proveedor: str = "",
                    ip: str | None = None, metadata_extra: dict | None = None) -> dict:
    """Agrega un material NUEVO al catálogo del taller. Si ya existe (misma
    categoría+referencia, sin distinguir mayúsculas) se actualiza el precio en
    vez de duplicar."""
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
        (emp, categoria.strip(), referencia.strip(), precio_m2,
         precio_lamina, ancho_lamina_cm, alto_lamina_cm, proveedor.strip()),
    )
    resultado = _row(cur.fetchone())
    metadata = {"material_id": resultado["id"], "categoria": resultado["categoria"],
                "referencia": resultado["referencia"], "precio_m2": resultado["precio_m2"]}
    if metadata_extra:
        metadata.update(metadata_extra)
    log_accion(conn, "MATERIAL_CREATE", metadata,
               empresa_id=usuario["empresa_id"], usuario_id=usuario["id"], ip=ip)
    return resultado


def editar_material(conn, usuario, material_id: int, *, categoria: str | None = None,
                     referencia: str | None = None, precio_m2: float | None = None,
                     proveedor: str | None = None, activo: bool | None = None,
                     ip: str | None = None, metadata_extra: dict | None = None) -> dict:
    """Edita un material del catálogo del taller.

    - Fila propia del taller → UPDATE directo.
    - Fila base de Costo360  → NO se toca; se crea (o actualiza) una fila propia
      del taller que la sombrea (`base_id`). El cambio solo aplica a este taller.
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

    precio_anterior = float(base[4] or 0)
    nueva_cat = (categoria or base[2]).strip()
    nueva_ref = (referencia or base[3]).strip()
    nuevo_precio = precio_anterior if precio_m2 is None else precio_m2

    try:
        if base[1] is not None:
            # Fila propia → UPDATE directo (RLS ya aísla por empresa).
            campos = ["categoria = %s", "referencia = %s", "precio_m2 = %s"]
            valores = [nueva_cat, nueva_ref, nuevo_precio]
            if proveedor is not None:
                campos.append("proveedor = %s")
                valores.append(proveedor.strip())
            if activo is not None:
                campos.append("activo = %s")
                valores.append(activo)
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

    resultado = _row(row)
    metadata = {
        "material_id": material_id, "categoria": nueva_cat, "referencia": nueva_ref,
        "precio_m2_anterior": precio_anterior, "precio_m2_nuevo": float(nuevo_precio),
        "fue_override": base[1] is None,
    }
    if metadata_extra:
        metadata.update(metadata_extra)
    log_accion(conn, "MATERIAL_UPDATE", metadata,
               empresa_id=usuario["empresa_id"], usuario_id=usuario["id"], ip=ip)
    return resultado


def eliminar_material(conn, usuario, material_id: int, *, ip: str | None = None,
                       metadata_extra: dict | None = None) -> dict:
    """Quita un material del catálogo del taller. Si era un override de una fila
    base de Costo360, la base vuelve a mostrarse (equivale a 'restablecer').
    RLS impide borrar filas base o de otro taller."""
    cur = conn.cursor()
    cur.execute(
        "SELECT categoria, referencia, precio_m2, base_id FROM catalogo_materiales WHERE id = %s",
        (material_id,),
    )
    previa = cur.fetchone()
    cur.execute("DELETE FROM catalogo_materiales WHERE id = %s", (material_id,))
    if cur.rowcount == 0:
        raise HTTPException(status_code=404, detail="Material no encontrado o no eliminable")

    categoria, referencia, precio_m2, base_id = previa if previa else (None, None, None, None)
    metadata = {
        "material_id": material_id, "categoria": categoria, "referencia": referencia,
        "precio_m2": float(precio_m2 or 0), "era_override": base_id is not None,
    }
    if metadata_extra:
        metadata.update(metadata_extra)
    log_accion(conn, "MATERIAL_DELETE", metadata,
               empresa_id=usuario["empresa_id"], usuario_id=usuario["id"], ip=ip)
    return {
        "id": material_id, "categoria": categoria, "referencia": referencia,
        "precio_m2": float(precio_m2 or 0), "era_override": base_id is not None,
    }
