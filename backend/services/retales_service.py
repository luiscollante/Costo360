"""
Lógica de negocio de Retales (sobrantes de lámina), compartida entre el
router HTTP normal y las tools del Agente de IA (Objetivo 5, Ciclo 2) —
misma fuente de verdad para los dos caminos, nunca una reimplementación
aparte del SQL (mismo patrón que `cotizacion_service.py`/`catalogo_service.py`/
`inventario_service.py`).

A diferencia de Inventario/Catálogo, Retales tiene aislamiento POR USUARIO
además de por empresa (`scope_propio`): un operativo solo ve/edita/borra
SUS PROPIOS retales, un gestor ve/edita/borra los de todo el taller. Cada
función de este módulo aplica `scope_propio` internamente — ninguna acepta
un parámetro para que el llamador (router o tool) elija de quién quiere
leer/escribir. Así el aislamiento se cierra una sola vez aquí, nunca
depende de que cada tool "recuerde" filtrar.

A diferencia de Inventario (`activo=FALSE`, soft-delete), `eliminar_retal`
es un DELETE físico de Postgres — no hay ninguna columna de estado que
sobreviva. Trátese como irreversible también a nivel de base de datos.
"""
from datetime import date

from fastapi import HTTPException

from backend.db.deps import scope_propio
from backend.services.audit_service import log_accion

_COLS = (
    "id,material_categoria,referencia,m2_disponibles,m2_original,"
    "origen_numero,origen_cliente,fecha_ingreso,estado,notas,"
    "COALESCE(precio_recuperacion,0) AS precio_recuperacion,"
    "COALESCE(precio_mercado_m2,0) AS precio_mercado_m2"
)


def _row_to_dict(row) -> dict:
    return {
        "id":                  row[0],
        "material_categoria":  row[1],
        "referencia":          row[2] or "",
        "m2_disponibles":      float(row[3]),
        "m2_original":         float(row[4]),
        "origen_numero":       row[5] or "",
        "origen_cliente":      row[6] or "",
        "fecha_ingreso":       str(row[7]),
        "estado":              row[8],
        "notas":               row[9] or "",
        "precio_recuperacion": float(row[10]),
        "precio_mercado_m2":   float(row[11]),
    }


def listar_retales(conn, usuario: dict) -> list[dict]:
    restringido, uid = scope_propio(usuario)
    cur = conn.cursor()
    if restringido:
        cur.execute(
            f"SELECT {_COLS} FROM inventario_retales WHERE usuario_id = %s "
            "ORDER BY estado ASC, fecha_ingreso DESC",
            (uid,),
        )
    else:
        cur.execute(
            f"SELECT {_COLS} FROM inventario_retales ORDER BY estado ASC, fecha_ingreso DESC"
        )
    rows = cur.fetchall()
    cur.close()
    return [_row_to_dict(r) for r in rows]


def obtener_retal(conn, usuario: dict, retal_id: int) -> dict | None:
    """Lectura de una fila puntual — CON `scope_propio` aplicado. A diferencia
    de `inventario_service.obtener_lamina` (que deliberadamente ignora
    `activo` porque solo distingue "no existe" de "ya está inactiva", un
    chequeo de ESTADO), aquí el chequeo es de PROPIEDAD — si se relajara, un
    operativo podría usar la vista previa de una propuesta de editar/eliminar
    para leer los datos de un retal ajeno con solo adivinar un id, aunque la
    escritura final se bloqueara igual al confirmar. Usada tanto para armar
    la vista previa de una propuesta como para el re-lectura de confirmación
    (cierra TOCTOU)."""
    restringido, uid = scope_propio(usuario)
    cur = conn.cursor()
    if restringido:
        cur.execute(
            f"SELECT {_COLS} FROM inventario_retales WHERE id = %s AND usuario_id = %s",
            (retal_id, uid),
        )
    else:
        cur.execute(f"SELECT {_COLS} FROM inventario_retales WHERE id = %s", (retal_id,))
    row = cur.fetchone()
    cur.close()
    return _row_to_dict(row) if row else None


def crear_retal(conn, usuario, *, material_categoria: str, referencia: str = "",
                 m2_disponibles: float, m2_original: float | None = None,
                 notas: str = "", precio_recuperacion: float = 0.0,
                 precio_mercado_m2: float = 0.0, ip: str | None = None,
                 metadata_extra: dict | None = None) -> dict:
    m2_orig = m2_original if m2_original is not None else m2_disponibles
    hoy = date.today().isoformat()
    cur = conn.cursor()
    cur.execute(
        f"""INSERT INTO inventario_retales
        (empresa_id, material_categoria, referencia, m2_disponibles, m2_original,
         fecha_ingreso, estado, notas, precio_recuperacion, precio_mercado_m2, usuario_id)
        VALUES (%s,%s,%s,%s,%s,%s,'Disponible',%s,%s,%s,%s)
        RETURNING {_COLS}""",
        (
            usuario["empresa_id"],
            material_categoria, referencia, m2_disponibles, m2_orig,
            hoy, notas, precio_recuperacion, precio_mercado_m2,
            usuario["id"],
        ),
    )
    resultado = _row_to_dict(cur.fetchone())
    metadata = {
        "retal_id": resultado["id"], "material_categoria": material_categoria,
        "referencia": referencia, "m2_disponibles": m2_disponibles,
    }
    if metadata_extra:
        metadata.update(metadata_extra)
    log_accion(conn, "RETAL_CREATE", metadata,
               empresa_id=usuario["empresa_id"], usuario_id=usuario["id"], ip=ip)
    return resultado


def editar_retal(conn, usuario, retal_id: int, *, ip: str | None = None,
                  metadata_extra: dict | None = None, **cambios) -> dict:
    actual = obtener_retal(conn, usuario, retal_id)
    if actual is None:
        raise HTTPException(status_code=404, detail="Retal no encontrado o sin permiso")
    if not cambios:
        raise HTTPException(status_code=400, detail="Sin campos para actualizar")

    restringido, uid = scope_propio(usuario)
    campos = []
    vals = []
    for campo, valor in cambios.items():
        campos.append(f"{campo} = %s")
        vals.append(valor)
    vals.append(retal_id)
    where = "WHERE id = %s"
    if restringido:
        where += " AND usuario_id = %s"
        vals.append(uid)

    cur = conn.cursor()
    cur.execute(
        f"UPDATE inventario_retales SET {', '.join(campos)} {where} RETURNING {_COLS}",
        vals,
    )
    row = cur.fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Retal no encontrado o sin permiso")
    resultado = _row_to_dict(row)

    metadata = {"retal_id": retal_id, "campos_editados": list(cambios.keys())}
    if "m2_disponibles" in cambios:
        metadata["m2_disponibles_anterior"] = actual["m2_disponibles"]
        metadata["m2_disponibles_nuevo"] = cambios["m2_disponibles"]
    if "estado" in cambios:
        metadata["estado_anterior"] = actual["estado"]
        metadata["estado_nuevo"] = cambios["estado"]
    if metadata_extra:
        metadata.update(metadata_extra)
    log_accion(conn, "RETAL_UPDATE", metadata,
               empresa_id=usuario["empresa_id"], usuario_id=usuario["id"], ip=ip)
    return resultado


def eliminar_retal(conn, usuario, retal_id: int, *, ip: str | None = None,
                    metadata_extra: dict | None = None) -> dict:
    """DELETE físico real — no hay `activo` que apagar. `actual` se lee ANTES
    de borrar (bajo la conexión de este turno) para poder auditar qué se
    perdió y para el TOCTOU-check de confirmación."""
    actual = obtener_retal(conn, usuario, retal_id)
    if actual is None:
        raise HTTPException(status_code=404, detail="Retal no encontrado o sin permiso")

    restringido, uid = scope_propio(usuario)
    cur = conn.cursor()
    if restringido:
        cur.execute(
            "DELETE FROM inventario_retales WHERE id = %s AND usuario_id = %s RETURNING id",
            (retal_id, uid),
        )
    else:
        cur.execute("DELETE FROM inventario_retales WHERE id = %s RETURNING id", (retal_id,))
    if cur.fetchone() is None:
        raise HTTPException(status_code=404, detail="Retal no encontrado o sin permiso")

    metadata = {
        "retal_id": retal_id, "material_categoria": actual["material_categoria"],
        "referencia": actual["referencia"], "m2_disponibles": actual["m2_disponibles"],
        "estado": actual["estado"],
    }
    if metadata_extra:
        metadata.update(metadata_extra)
    log_accion(conn, "RETAL_DELETE", metadata,
               empresa_id=usuario["empresa_id"], usuario_id=usuario["id"], ip=ip)
    return actual
