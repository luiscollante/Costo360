"""
Lógica de negocio de Inventario de láminas, compartida entre el router HTTP
normal y las tools del Agente de IA (Objetivo 5, Ciclo 2) — misma fuente de
verdad para los dos caminos, nunca una reimplementación aparte del SQL (mismo
patrón que `cotizacion_service.py` / `catalogo_service.py`).
"""
from fastapi import HTTPException

from backend.services.audit_service import log_accion

_COLS = (
    "id,material_categoria,referencia,cantidad_laminas,ancho_cm,alto_cm,espesor_cm,"
    "costo_unitario,stock_minimo,proveedor,ubicacion,notas,activo,actualizado_en"
)


def _row_to_dict(row) -> dict:
    return {
        "id":                row[0],
        "material_categoria": row[1],
        "referencia":        row[2] or "",
        "cantidad_laminas":  row[3],
        "ancho_cm":          float(row[4]) if row[4] is not None else None,
        "alto_cm":           float(row[5]) if row[5] is not None else None,
        "espesor_cm":        float(row[6]) if row[6] is not None else None,
        "costo_unitario":    float(row[7]),
        "stock_minimo":      row[8],
        "proveedor":         row[9] or "",
        "ubicacion":         row[10] or "",
        "notas":             row[11] or "",
        "activo":            bool(row[12]),
        "actualizado_en":    row[13].isoformat() if row[13] else None,
    }


def listar_inventario(conn, material_categoria: str = "") -> list[dict]:
    cur = conn.cursor()
    if material_categoria:
        cur.execute(
            f"SELECT {_COLS} FROM inventario_laminas "
            "WHERE activo = TRUE AND LOWER(material_categoria) = LOWER(%s) "
            "ORDER BY material_categoria, referencia",
            (material_categoria,),
        )
    else:
        cur.execute(
            f"SELECT {_COLS} FROM inventario_laminas "
            "WHERE activo = TRUE ORDER BY material_categoria, referencia"
        )
    rows = cur.fetchall()
    cur.close()
    return [_row_to_dict(r) for r in rows]


def obtener_lamina(conn, lamina_id: int) -> dict | None:
    """Lectura de una fila puntual SIN filtrar `activo` — para la vista previa
    de una propuesta de confirmación del agente, que necesita distinguir
    "no existe" de "ya está inactiva"."""
    cur = conn.cursor()
    cur.execute(f"SELECT {_COLS} FROM inventario_laminas WHERE id = %s", (lamina_id,))
    row = cur.fetchone()
    cur.close()
    return _row_to_dict(row) if row else None


def crear_lamina(conn, usuario, *, material_categoria: str, referencia: str = "",
                  cantidad_laminas: int = 0, ancho_cm: float | None = None,
                  alto_cm: float | None = None, espesor_cm: float | None = None,
                  costo_unitario: float = 0.0, stock_minimo: int = 0,
                  proveedor: str = "", ubicacion: str = "", notas: str = "",
                  ip: str | None = None, metadata_extra: dict | None = None) -> dict:
    cur = conn.cursor()
    cur.execute(
        f"""INSERT INTO inventario_laminas
        (empresa_id, material_categoria, referencia, cantidad_laminas, ancho_cm, alto_cm, espesor_cm,
         costo_unitario, stock_minimo, proveedor, ubicacion, notas, usuario_id)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        RETURNING {_COLS}""",
        (
            usuario["empresa_id"],
            material_categoria, referencia, cantidad_laminas,
            ancho_cm, alto_cm, espesor_cm,
            costo_unitario, stock_minimo,
            proveedor, ubicacion, notas,
            usuario["id"],
        ),
    )
    resultado = _row_to_dict(cur.fetchone())
    metadata = {
        "lamina_id": resultado["id"], "material_categoria": material_categoria,
        "referencia": referencia, "cantidad_laminas": cantidad_laminas,
        "costo_unitario": costo_unitario,
    }
    if metadata_extra:
        metadata.update(metadata_extra)
    log_accion(conn, "LAMINA_CREATE", metadata,
               empresa_id=usuario["empresa_id"], usuario_id=usuario["id"], ip=ip)
    return resultado


def editar_lamina(conn, usuario, lamina_id: int, *, ip: str | None = None,
                   metadata_extra: dict | None = None, **cambios) -> dict:
    actual = obtener_lamina(conn, lamina_id)
    if actual is None:
        raise HTTPException(status_code=404, detail="Lámina no encontrada")
    if actual["activo"] is False:
        raise HTTPException(status_code=409, detail="Esta lámina fue eliminada del inventario, no se puede editar")

    campos = ["actualizado_en = NOW()"]
    vals = []
    for campo, valor in cambios.items():
        campos.append(f"{campo} = %s")
        vals.append(valor)
    if len(campos) == 1:
        raise HTTPException(status_code=400, detail="Sin campos para actualizar")

    vals.append(lamina_id)
    cur = conn.cursor()
    cur.execute(
        f"UPDATE inventario_laminas SET {', '.join(campos)} WHERE id = %s RETURNING {_COLS}",
        vals,
    )
    row = cur.fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Lámina no encontrada")
    resultado = _row_to_dict(row)

    metadata = {"lamina_id": lamina_id, "campos_editados": list(cambios.keys())}
    if "cantidad_laminas" in cambios:
        metadata["cantidad_laminas_anterior"] = actual["cantidad_laminas"]
        metadata["cantidad_laminas_nuevo"] = cambios["cantidad_laminas"]
    if "costo_unitario" in cambios:
        metadata["costo_unitario_anterior"] = actual["costo_unitario"]
        metadata["costo_unitario_nuevo"] = cambios["costo_unitario"]
    if metadata_extra:
        metadata.update(metadata_extra)
    log_accion(conn, "LAMINA_UPDATE", metadata,
               empresa_id=usuario["empresa_id"], usuario_id=usuario["id"], ip=ip)
    return resultado


def eliminar_lamina(conn, usuario, lamina_id: int, *, ip: str | None = None,
                     metadata_extra: dict | None = None) -> dict:
    actual = obtener_lamina(conn, lamina_id)
    if actual is None:
        raise HTTPException(status_code=404, detail="Lámina no encontrada")
    if actual["activo"] is False:
        raise HTTPException(status_code=409, detail="Esta lámina ya está eliminada del inventario")

    cur = conn.cursor()
    cur.execute(
        "UPDATE inventario_laminas SET activo = FALSE, actualizado_en = NOW() WHERE id = %s",
        (lamina_id,),
    )
    if cur.rowcount == 0:
        raise HTTPException(status_code=404, detail="Lámina no encontrada")

    metadata = {
        "lamina_id": lamina_id, "material_categoria": actual["material_categoria"],
        "referencia": actual["referencia"], "cantidad_laminas": actual["cantidad_laminas"],
        "costo_unitario": actual["costo_unitario"],
    }
    if metadata_extra:
        metadata.update(metadata_extra)
    log_accion(conn, "LAMINA_DELETE", metadata,
               empresa_id=usuario["empresa_id"], usuario_id=usuario["id"], ip=ip)
    return {**actual, "activo": False}
