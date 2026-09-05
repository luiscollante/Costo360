"""
Lógica de negocio de Cotización compartida entre el router HTTP normal y las
tools del Agente de IA (Objetivo 5, Ciclo 2) — misma fuente de verdad para
los dos caminos, nunca una reimplementación aparte del SQL (hallazgo de la
auditoría de seguridad: ver `agente/tools/proyectos.py` para el mismo
patrón ya aplicado en Ciclo 1).
"""
from datetime import date, datetime
from decimal import Decimal

from fastapi import HTTPException

from backend.db.deps import scope_propio
from backend.services.audit_service import log_accion
from backend.motor import calculos

_ESTADOS_VALIDOS = ("Pendiente", "Aprobada", "Rechazada", "Borrador")


def _json_seguro(v):
    """`precio`/`margen` llegan de Postgres como `Decimal` y `fecha` como
    `date` — ninguno de los dos es serializable a JSON tal cual, y estas filas
    viajan tanto al frontend como (sin pasar por FastAPI, que sí sabe
    convertirlos solo) al `FunctionResponse` que el motor del agente le
    manda a Gemini."""
    if isinstance(v, Decimal):
        return float(v)
    if isinstance(v, (date, datetime)):
        return str(v)
    return v


def _fila_segura(cols: list[str], row) -> dict:
    return {k: _json_seguro(v) for k, v in zip(cols, row)}


def calcular_totales(piezas: list) -> dict:
    piezas_raw = [
        {
            "nombre": p.get("nombre", ""),
            "largo": float(p.get("largo", 0)),
            "ancho": float(p.get("ancho", 0.60)),
            "cantidad": int(p.get("cantidad", 1)),
            "unidad_venta": p.get("unidad_venta", "ml"),
            "ml": float(p.get("largo", 0)) * int(p.get("cantidad", 1)),
            "precio_unitario": float(p.get("precio_unitario", 0)),
        }
        for p in piezas
    ]
    return calculos.calcular_totales_piezas(piezas_raw)


def calcular_merma(piezas: list, categoria: str) -> dict:
    piezas_raw = [
        {
            "nombre": p.get("nombre", ""),
            "largo": float(p.get("largo", 0)),
            "ancho": float(p.get("ancho", 0.60)),
            "cantidad": int(p.get("cantidad", 1)),
            "unidad_venta": p.get("unidad_venta", "ml"),
            "ml": float(p.get("largo", 0)) * int(p.get("cantidad", 1)),
        }
        for p in piezas
    ]
    return calculos.calcular_merma_inteligente(piezas_raw, categoria)


def borrar_cotizacion(conn, usuario: dict, cot_id: int, *, ip: str | None = None,
                       metadata_extra: dict | None = None) -> dict:
    restringido, uid = scope_propio(usuario)
    cur = conn.cursor()
    if restringido:
        cur.execute(
            "DELETE FROM cotizaciones WHERE id = %s AND usuario_id = %s "
            "RETURNING id, numero, cliente, precio, fecha, estado",
            (cot_id, uid),
        )
    else:
        cur.execute(
            "DELETE FROM cotizaciones WHERE id = %s "
            "RETURNING id, numero, cliente, precio, fecha, estado",
            (cot_id,),
        )
    row = cur.fetchone()
    cur.close()
    if row is None:
        raise HTTPException(status_code=404, detail="Cotización no encontrada o sin permiso")
    metadata = {"cotizacion_id": cot_id}
    if metadata_extra:
        metadata.update(metadata_extra)
    log_accion(conn, "COTIZACION_DELETE", metadata,
               empresa_id=usuario["empresa_id"], usuario_id=usuario["id"], ip=ip)
    return _fila_segura(["id", "numero", "cliente", "precio", "fecha", "estado"], row)


def cambiar_estado_cotizacion(conn, usuario: dict, cot_id: int, estado: str, *,
                               ip: str | None = None, metadata_extra: dict | None = None) -> dict:
    if estado not in _ESTADOS_VALIDOS:
        raise HTTPException(status_code=400, detail="estado inválido")
    restringido, uid = scope_propio(usuario)
    cur = conn.cursor()
    if restringido:
        cur.execute(
            "UPDATE cotizaciones SET estado = %s WHERE id = %s AND usuario_id = %s "
            "RETURNING id, numero, cliente, precio, estado",
            (estado, cot_id, uid),
        )
    else:
        cur.execute(
            "UPDATE cotizaciones SET estado = %s WHERE id = %s "
            "RETURNING id, numero, cliente, precio, estado",
            (estado, cot_id),
        )
    row = cur.fetchone()
    cur.close()
    if row is None:
        raise HTTPException(status_code=404, detail="Cotización no encontrada o sin permiso")
    metadata = {"cotizacion_id": cot_id, "estado_nuevo": estado}
    if metadata_extra:
        metadata.update(metadata_extra)
    log_accion(conn, "COTIZACION_ESTADO", metadata,
               empresa_id=usuario["empresa_id"], usuario_id=usuario["id"], ip=ip)
    return _fila_segura(["id", "numero", "cliente", "precio", "estado"], row)


def listar_historial(conn, usuario: dict, *, busqueda: str = "", estado: str = "",
                      fecha_desde: str = "", fecha_hasta: str = "", limite: int = 200) -> list[dict]:
    restringido, uid = scope_propio(usuario)
    cur = conn.cursor()
    cols = "id,numero,fecha,cliente,material,tipo,ml,precio,margen,estado"
    condiciones, params = [], []
    if restringido:
        condiciones.append("usuario_id = %s")
        params.append(uid)
    if busqueda:
        condiciones.append("(cliente ILIKE %s OR numero ILIKE %s OR material ILIKE %s)")
        params += [f"%{busqueda}%", f"%{busqueda}%", f"%{busqueda}%"]
    if estado:
        condiciones.append("estado = %s")
        params.append(estado)
    if fecha_desde:
        condiciones.append("fecha::date >= %s")
        params.append(fecha_desde)
    if fecha_hasta:
        condiciones.append("fecha::date <= %s")
        params.append(fecha_hasta)
    where_sql = f"WHERE {' AND '.join(condiciones)}" if condiciones else ""
    cur.execute(f"SELECT {cols} FROM cotizaciones {where_sql} ORDER BY id DESC LIMIT %s",
                params + [limite])
    rows = cur.fetchall()
    cur.close()
    col_names = cols.split(",")
    return [_fila_segura(col_names, row) for row in rows]


def obtener_cotizacion_datos(conn, usuario: dict, cot_id: int) -> dict | None:
    """`datos_json` completo (piezas, materiales, desglose de costos) — para
    ver el detalle a fondo, a diferencia de `obtener_cotizacion_resumen`."""
    import json
    restringido, uid = scope_propio(usuario)
    cur = conn.cursor()
    if restringido:
        cur.execute(
            "SELECT datos_json, numero FROM cotizaciones WHERE id = %s AND usuario_id = %s",
            (cot_id, uid),
        )
    else:
        cur.execute("SELECT datos_json, numero FROM cotizaciones WHERE id = %s", (cot_id,))
    row = cur.fetchone()
    cur.close()
    if row is None:
        return None
    datos_json_str, numero = row
    datos = json.loads(datos_json_str) if isinstance(datos_json_str, str) else datos_json_str
    return {"datos": datos, "numero": numero}


def obtener_cotizacion_resumen(conn, usuario: dict, cot_id: int) -> dict | None:
    """Fila resumida (para tarjetas de confirmación y respuestas de tools) —
    nunca el `datos_json` completo, que puede ser grande."""
    restringido, uid = scope_propio(usuario)
    cur = conn.cursor()
    if restringido:
        cur.execute(
            "SELECT id, numero, cliente, precio, fecha, estado FROM cotizaciones "
            "WHERE id = %s AND usuario_id = %s",
            (cot_id, uid),
        )
    else:
        cur.execute(
            "SELECT id, numero, cliente, precio, fecha, estado FROM cotizaciones WHERE id = %s",
            (cot_id,),
        )
    row = cur.fetchone()
    cur.close()
    if row is None:
        return None
    return _fila_segura(["id", "numero", "cliente", "precio", "fecha", "estado"], row)
