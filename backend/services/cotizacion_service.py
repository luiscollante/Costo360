"""
Lógica de negocio de Cotización compartida entre el router HTTP normal y las
tools del Agente de IA (Objetivo 5, Ciclo 2) — misma fuente de verdad para
los dos caminos, nunca una reimplementación aparte del SQL (hallazgo de la
auditoría de seguridad: ver `agente/tools/proyectos.py` para el mismo
patrón ya aplicado en Ciclo 1).
"""
import json
from datetime import date, datetime
from decimal import Decimal

from fastapi import HTTPException

from backend.db.deps import scope_propio
from backend.db.config_helpers import cfg_get
from backend.services.audit_service import log_accion
from backend.motor import calculos
from parametros import ETAPAS_OBRA, ADICIONALES

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


def calcular_directa(conn, usuario: dict, entrada: dict) -> dict:
    """Calcula (SIN guardar nada) una cotización directa completa. Extraída de
    `routers/cotizacion.py::cotizacion_directa` (antes inline en el handler)
    para que el router HTTP normal y las tools del agente compartan la MISMA
    lógica — mismo patrón que el resto de este archivo.

    `entrada` trae las mismas claves que `CotizacionDirectaIn`; `piezas`, si
    viene, ya debe estar en el formato canónico que espera el motor (`ml`,
    `ancho_custom`, `cantidad`, `unidad_venta`, `nombre` — igual que produce
    `PiezaItem.model_dump()` en el wizard humano). El agente adapta su propio
    formato de piezas (`largo`/`ancho`) a este ANTES de llamar aquí — ver
    `agente/tools/cotizacion.py::_normalizar_piezas_agente`."""
    etapa = ETAPAS_OBRA.get(entrada.get("etapa_label", ""), "terminada")

    materiales_lista = entrada.get("materiales_lista") or []
    piezas = entrada.get("piezas") or []

    if piezas:
        m2_real = sum(
            float(p["ml"]) * float(p["ancho_custom"]) * int(p["cantidad"])
            for p in piezas
        )
    else:
        m2_real = entrada.get("area_placa_comprada", 0)

    emp = usuario["empresa_id"]
    tarifas_override = cfg_get(conn, emp, "tarifas")
    adicionales_lista = cfg_get(conn, emp, "adicionales") or ADICIONALES

    cantidades_add = list(entrada.get("cantidades_add") or [])
    while len(cantidades_add) < len(adicionales_lista):
        cantidades_add.append(0)

    resultado = calculos.calcular_cotizacion_directa(
        categoria=entrada.get("categoria", "Mármol"),
        referencia=entrada.get("referencia", ""),
        precio_m2=entrada.get("precio_m2", 0),
        area_placa_comprada=entrada.get("area_placa_comprada", 0),
        m2_real=m2_real,
        m2_cortados=m2_real,
        m2_usados=m2_real,
        margen_pct=entrada.get("margen_pct", 40.0),
        dias=entrada.get("dias", 2),
        personas=entrada.get("personas", 2),
        zocalo_activo=entrada.get("zocalo_activo", False),
        zocalo_ml=entrada.get("zocalo_ml", 0.0),
        adicionales_activos=entrada.get("adicionales_activos", False),
        cantidades_add=cantidades_add,
        etapa=etapa,
        adicionales_lista=adicionales_lista,
        tipo_proyecto=entrada.get("tipo_proyecto", ""),
        nombre_cliente=entrada.get("nombre_cliente", ""),
        materiales_lista=materiales_lista,
        piezas=piezas,
        incluir_iva=entrada.get("incluir_iva", False),
        tarifas_override=tarifas_override,
    )
    resultado["incluir_iva"] = entrada.get("incluir_iva", False)
    return resultado


def siguiente_numero_folio(conn, empresa_id, prefijo: str) -> str:
    """Folio secuencial anual por empresa (contador atómico `folio_seq`, sin
    carrera). Usado por `/cotizacion/directa`→`/guardar` y por `/aiu/guardar`
    en `routers/cotizacion.py` — una sola función, nunca una copia por ruta."""
    year = date.today().year
    cur = conn.cursor()
    cur.execute(
        """INSERT INTO folio_seq (empresa_id, prefijo, anio, ultimo)
        VALUES (%s, %s, %s, 1)
        ON CONFLICT (empresa_id, prefijo, anio)
        DO UPDATE SET ultimo = folio_seq.ultimo + 1
        RETURNING ultimo""",
        (empresa_id, prefijo, year),
    )
    n = cur.fetchone()[0]
    cur.close()
    return f"{prefijo}-{year}-{n:04d}"


def guardar_cotizacion(conn, usuario: dict, resultado: dict, *, numero: str = "",
                        cliente: str = "", ip: str | None = None,
                        metadata_extra: dict | None = None) -> dict:
    """Persiste un `resultado` ya calculado (por `calcular_directa`) como una
    cotización nueva. Extraída de `routers/cotizacion.py::guardar_cotizacion`
    — a diferencia del router original, agrega `log_accion`, que hoy no
    existe ahí (brecha de auditoría real cerrada de una vez para los dos
    caminos, wizard humano y agente)."""
    hoy = date.today().isoformat()
    numero = numero or siguiente_numero_folio(conn, usuario["empresa_id"], "COT")
    cliente = cliente or "Sin nombre"

    cur = conn.cursor()
    cur.execute(
        "INSERT INTO cotizaciones "
        "(empresa_id,numero,fecha,cliente,material,tipo,m2,ml,costo,precio,margen,estado,datos_json,usuario_id) "
        "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id",
        (
            usuario["empresa_id"],
            numero, hoy, cliente,
            resultado.get("categoria", ""), resultado.get("tipo_proyecto", ""),
            resultado.get("m2_real", 0), resultado.get("ml_proyecto", 0),
            resultado.get("costo_total", 0), resultado.get("precio_sugerido", 0),
            resultado.get("margen_pct", 0), "Pendiente",
            json.dumps(resultado, ensure_ascii=False, default=str),
            usuario["id"],
        ),
    )
    new_id = cur.fetchone()[0]
    cur.close()

    metadata = {"cotizacion_id": new_id, "numero": numero}
    if metadata_extra:
        metadata.update(metadata_extra)
    log_accion(conn, "COTIZACION_CREATE", metadata,
               empresa_id=usuario["empresa_id"], usuario_id=usuario["id"], ip=ip)
    return {"id": new_id, "numero": numero}


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
