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

# Atributos visuales — separados de _COLS porque no todas las pantallas los
# necesitan (el listado normal del catálogo no los muestra), pero el render
# con IA sí. Ver `models/materiales.py` para el catálogo cerrado de valores.
_COLS_VISUALES = (
    "color_base, color_vetas, densidad_veteado, patron_veteado, acabado, "
    "tono_general, foto_referencia_url, foto_referencia_aprobada"
)

_ATRIBUTOS_VISUALES_OBLIGATORIOS = (
    "color_base", "color_vetas", "densidad_veteado", "patron_veteado", "acabado",
)


def _row_visuales(r):
    return {
        "color_base":               r[0],
        "color_vetas":              r[1],
        "densidad_veteado":         r[2],
        "patron_veteado":           r[3],
        "acabado":                  r[4],
        "tono_general":             r[5],
        "foto_referencia_url":      r[6],
        "foto_referencia_aprobada": bool(r[7]),
    }

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


# ── Atributos visuales + foto de referencia (render de cocina con IA) ───────

def obtener_material_visual(conn, material_id: int) -> dict | None:
    """Fila completa (comercial + visual) para el flujo de render — incluye
    `apto_para_render` (los 5 atributos obligatorios completos) y si la foto
    de referencia ya fue aprobada por un humano del taller."""
    cur = conn.cursor()
    cur.execute(
        f"SELECT {_COLS}, {_COLS_VISUALES} FROM catalogo_materiales "
        "WHERE id = %s AND activo = TRUE",
        (material_id,),
    )
    row = cur.fetchone()
    if row is None:
        return None
    n = len(_COLS.split(", "))
    fila = _row(row[:n])
    visuales = _row_visuales(row[n:])
    fila.update(visuales)
    fila["apto_para_render"] = all(visuales[c] for c in _ATRIBUTOS_VISUALES_OBLIGATORIOS)
    return fila


def actualizar_atributos_visuales(conn, usuario, material_id: int, *, atributos: dict,
                                   ip: str | None = None) -> dict:
    """Guarda color/veta/patrón/acabado/tono de un material — mismo
    copy-on-write que `editar_material`: fila propia se actualiza directo,
    fila base de Costo360 se sombrea con un override del taller. Cambiar
    estos campos NO toca `foto_referencia_aprobada` (son independientes:
    podés corregir el color sin tener que re-aprobar la foto)."""
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

    campos_visuales = [
        "color_base", "color_vetas", "densidad_veteado", "patron_veteado",
        "acabado", "tono_general",
    ]
    valores_visuales = [atributos.get(c) for c in campos_visuales]

    if base[1] is not None:
        set_clause = ", ".join(f"{c} = %s" for c in campos_visuales)
        cur.execute(
            f"UPDATE catalogo_materiales SET {set_clause} "
            f"WHERE id = %s RETURNING {_COLS}, {_COLS_VISUALES}",
            (*valores_visuales, material_id),
        )
    else:
        cols_insert = ", ".join(campos_visuales)
        placeholders = ", ".join(["%s"] * len(campos_visuales))
        updates = ", ".join(f"{c} = EXCLUDED.{c}" for c in campos_visuales)
        cur.execute(
            "INSERT INTO catalogo_materiales "
            "(empresa_id, base_id, categoria, referencia, precio_m2, "
            f" precio_lamina, ancho_lamina_cm, alto_lamina_cm, proveedor, activo, {cols_insert}) "
            f"VALUES ((SELECT public.empresa_actual()), %s, %s, %s, %s, %s, %s, %s, %s, TRUE, {placeholders}) "
            "ON CONFLICT (empresa_id, base_id) WHERE base_id IS NOT NULL "
            f"DO UPDATE SET categoria = EXCLUDED.categoria, referencia = EXCLUDED.referencia, "
            f"  precio_m2 = EXCLUDED.precio_m2, activo = TRUE, {updates} "
            f"RETURNING {_COLS}, {_COLS_VISUALES}",
            (base[0], base[2], base[3], base[4], base[5], base[6], base[7], base[8],
             *valores_visuales),
        )
    row = cur.fetchone()
    n = len(_COLS.split(", "))
    resultado = _row(row[:n])
    resultado.update(_row_visuales(row[n:]))

    log_accion(conn, "MATERIAL_ATRIBUTOS_VISUALES_UPDATE",
               {"material_id": material_id, **atributos},
               empresa_id=usuario["empresa_id"], usuario_id=usuario["id"], ip=ip)
    return resultado


def guardar_foto_referencia(conn, usuario, material_id: int, *, foto_url: str,
                             ip: str | None = None) -> dict:
    """Guarda la foto real de la lámina — sube `foto_referencia_aprobada` a
    FALSE a propósito (una foto nueva siempre necesita que alguien la
    apruebe de nuevo, nunca hereda la aprobación de la foto anterior)."""
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

    if base[1] is not None:
        cur.execute(
            "UPDATE catalogo_materiales "
            "SET foto_referencia_url = %s, foto_referencia_aprobada = FALSE "
            f"WHERE id = %s RETURNING {_COLS}, {_COLS_VISUALES}",
            (foto_url, material_id),
        )
    else:
        cur.execute(
            "INSERT INTO catalogo_materiales "
            "(empresa_id, base_id, categoria, referencia, precio_m2, precio_lamina, "
            " ancho_lamina_cm, alto_lamina_cm, proveedor, activo, "
            " foto_referencia_url, foto_referencia_aprobada) "
            "VALUES ((SELECT public.empresa_actual()), %s, %s, %s, %s, %s, %s, %s, %s, TRUE, %s, FALSE) "
            "ON CONFLICT (empresa_id, base_id) WHERE base_id IS NOT NULL "
            "DO UPDATE SET foto_referencia_url = EXCLUDED.foto_referencia_url, "
            "  foto_referencia_aprobada = FALSE, activo = TRUE "
            f"RETURNING {_COLS}, {_COLS_VISUALES}",
            (base[0], base[2], base[3], base[4], base[5], base[6], base[7], base[8], foto_url),
        )
    row = cur.fetchone()
    n = len(_COLS.split(", "))
    resultado = _row(row[:n])
    resultado.update(_row_visuales(row[n:]))

    log_accion(conn, "MATERIAL_FOTO_REFERENCIA_UPDATE",
               {"material_id": material_id, "foto_referencia_url": foto_url},
               empresa_id=usuario["empresa_id"], usuario_id=usuario["id"], ip=ip)
    return resultado


def aprobar_foto_referencia(conn, usuario, material_id: int, *, aprobada: bool,
                             ip: str | None = None) -> dict:
    """Un humano del taller confirma (o revoca) que la foto de referencia es
    fiel al material real — paso separado de subir la foto a propósito (ver
    hallazgo del Prompt Engineer: una foto borrosa/mal recortada arruina
    todos los renders futuros de ese material)."""
    cur = conn.cursor()
    cur.execute(
        "SELECT empresa_id, foto_referencia_url FROM catalogo_materiales "
        "WHERE id = %s AND activo = TRUE",
        (material_id,),
    )
    base = cur.fetchone()
    if base is None:
        raise HTTPException(status_code=404, detail="Material no encontrado")
    if base[1] is None:
        raise HTTPException(status_code=400, detail="Este material todavía no tiene foto de referencia")
    if base[0] is None:
        raise HTTPException(status_code=400, detail="Solo se puede aprobar la foto de un material propio del taller")

    cur.execute(
        "UPDATE catalogo_materiales SET foto_referencia_aprobada = %s "
        f"WHERE id = %s RETURNING {_COLS}, {_COLS_VISUALES}",
        (aprobada, material_id),
    )
    row = cur.fetchone()
    n = len(_COLS.split(", "))
    resultado = _row(row[:n])
    resultado.update(_row_visuales(row[n:]))

    log_accion(conn, "MATERIAL_FOTO_REFERENCIA_APROBAR",
               {"material_id": material_id, "aprobada": aprobada},
               empresa_id=usuario["empresa_id"], usuario_id=usuario["id"], ip=ip)
    return resultado
