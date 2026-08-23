import io
import base64
import json
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from backend.models.cotizacion import (
    CotizacionDirectaIn, CotizacionGuardarIn,
    CotizacionAIUIn, CotizacionAIUGuardarIn,
)
from backend.middleware.auth import get_current_user
from backend.db.client import db_conn
from backend.db.config_helpers import cfg_get
from backend.services.audit_service import log_accion

from calculos import calcular_cotizacion_directa, calcular_aiu
from parametros import ETAPAS_OBRA, ADICIONALES
from generador_pdf import generar_pdf_cotizacion, generar_pdf_cotizacion_aiu, generar_cuenta_cobro

router = APIRouter(prefix="/api/cotizacion", tags=["cotizacion"])


def _siguiente_numero(conn, prefijo: str) -> str:
    """Genera el siguiente número secuencial anual para un prefijo dado.
    Formato: COT-2026-0001, AIU-2026-0001, etc.
    """
    year = date.today().year
    cur = conn.cursor()
    cur.execute(
        "SELECT COUNT(*) FROM cotizaciones "
        "WHERE CAST(fecha AS TEXT) LIKE %s AND numero LIKE %s",
        (f"{year}-%", f"{prefijo}-%"),
    )
    count = cur.fetchone()[0]
    cur.close()
    return f"{prefijo}-{year}-{count + 1:04d}"


@router.post("/directa")
def cotizacion_directa(
    body: CotizacionDirectaIn,
    conn=Depends(db_conn),
    usuario=Depends(get_current_user),
):
    """
    Calcula la cotización directa completa de un proyecto en piedra natural
    o sinterizado, incluyendo material, mano de obra, zócalos, insumos,
    logística, viáticos y adicionales.

    Retorna el precio sugerido, costo total, utilidad y el desglose por
    componente (c1–c7).
    """
    # Mapear etiqueta UI → clave interna del motor
    etapa = ETAPAS_OBRA.get(body.etapa_label, "terminada")

    # Serializar modelos anidados a dicts planos para el motor
    materiales_lista = [m.model_dump() for m in body.materiales_lista]
    piezas = [p.model_dump() for p in body.piezas]

    # Calcular m2_real desde las piezas cuando se envían detalladas;
    # si no hay piezas, usar el área de placa como referencia de proyecto.
    if piezas:
        m2_real = sum(
            float(p["ml"]) * float(p["ancho_custom"]) * int(p["cantidad"])
            for p in piezas
        )
    else:
        m2_real = body.area_placa_comprada

    # Leer parámetros desde DB; cfg_get retorna None si no hay valor guardado.
    tarifas_override    = cfg_get(conn, "tarifas")
    adicionales_lista   = cfg_get(conn, "adicionales") or ADICIONALES

    # Normalizar cantidades_add: asegurar que tiene al menos una entrada por
    # cada adicional del catálogo, rellenando con 0 si faltan.
    cantidades_add = list(body.cantidades_add)
    while len(cantidades_add) < len(adicionales_lista):
        cantidades_add.append(0)

    resultado = calcular_cotizacion_directa(
        categoria=body.categoria,
        referencia=body.referencia,
        precio_m2=body.precio_m2,
        area_placa_comprada=body.area_placa_comprada,
        m2_real=m2_real,
        m2_cortados=m2_real,
        m2_usados=m2_real,
        margen_pct=body.margen_pct,
        dias=body.dias,
        personas=body.personas,
        zocalo_activo=body.zocalo_activo,
        zocalo_ml=body.zocalo_ml,
        adicionales_activos=body.adicionales_activos,
        cantidades_add=cantidades_add,
        etapa=etapa,
        adicionales_lista=adicionales_lista,
        tipo_proyecto=body.tipo_proyecto,
        nombre_cliente=body.nombre_cliente,
        # kwargs opcionales
        materiales_lista=materiales_lista,
        piezas=piezas,
        incluir_iva=body.incluir_iva,
        tarifas_override=tarifas_override,
    )

    # Inyectar bandera IVA en la respuesta para que el cliente sepa
    # si los precios ya incluyen el impuesto.
    resultado["incluir_iva"] = body.incluir_iva

    return resultado


@router.post("/guardar")
def guardar_cotizacion(
    body: CotizacionGuardarIn,
    conn=Depends(db_conn),
    usuario=Depends(get_current_user),
):
    hoy = date.today().isoformat()
    r = body.resultado
    numero = body.numero or _siguiente_numero(conn, "COT")
    cliente = body.cliente or "Sin nombre"

    cur = conn.cursor()
    cur.execute(
        "INSERT INTO cotizaciones "
        "(numero,fecha,cliente,material,tipo,m2,ml,costo,precio,margen,estado,datos_json,usuario_id) "
        "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id",
        (
            numero, hoy, cliente,
            r.get("categoria", ""), r.get("tipo_proyecto", ""),
            r.get("m2_real", 0), r.get("ml_proyecto", 0),
            r.get("costo_total", 0), r.get("precio_sugerido", 0),
            r.get("margen_pct", 0), "Pendiente",
            json.dumps(r, ensure_ascii=False, default=str),
            usuario["id"],
        ),
    )
    new_id = cur.fetchone()[0]
    conn.commit()
    cur.close()
    return {"id": new_id, "numero": numero}


@router.get("/historial")
def historial_cotizaciones(
    busqueda: str = "",
    estado: str = "",
    fecha_desde: str = "",
    fecha_hasta: str = "",
    conn=Depends(db_conn),
    usuario=Depends(get_current_user),
):
    cur = conn.cursor()
    rol = usuario.get("rol", "Operario")
    uid = usuario["id"]

    cols = "id,numero,fecha,cliente,material,tipo,ml,precio,margen,estado"

    condiciones = []
    params: list = []

    if rol == "Operario":
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
    cur.execute(
        f"SELECT {cols} FROM cotizaciones {where_sql} ORDER BY id DESC LIMIT 200",
        params,
    )

    rows = cur.fetchall()
    cur.close()
    col_names = cols.split(",")
    return [dict(zip(col_names, row)) for row in rows]


@router.get("/{cot_id}/datos")
def obtener_datos_cotizacion(
    cot_id: int,
    conn=Depends(db_conn),
    usuario=Depends(get_current_user),
):
    """Retorna datos_json de una cotización para poder editarla."""
    cur = conn.cursor()
    cur.execute(
        "SELECT datos_json, numero FROM cotizaciones WHERE id = %s",
        (cot_id,),
    )
    row = cur.fetchone()
    cur.close()
    if not row:
        raise HTTPException(status_code=404, detail="Cotización no encontrada")
    datos_json_str, numero = row
    try:
        datos = json.loads(datos_json_str) if isinstance(datos_json_str, str) else datos_json_str
    except Exception:
        raise HTTPException(status_code=500, detail="datos_json inválido")
    return {"datos": datos, "numero": numero}


@router.delete("/{cot_id}")
def eliminar_cotizacion(
    cot_id: int,
    request: Request,
    conn=Depends(db_conn),
    usuario=Depends(get_current_user),
):
    rol = usuario.get("rol", "Operario")
    uid = usuario["id"]
    cur = conn.cursor()
    if rol in ("Admin", "Gerente"):
        cur.execute("DELETE FROM cotizaciones WHERE id = %s RETURNING id", (cot_id,))
    else:
        cur.execute(
            "DELETE FROM cotizaciones WHERE id = %s AND usuario_id = %s RETURNING id",
            (cot_id, uid),
        )
    deleted = cur.fetchone()
    conn.commit()
    cur.close()
    if not deleted:
        raise HTTPException(status_code=404, detail="Cotización no encontrada o sin permiso")
    ip = request.client.host if request.client else None
    log_accion(conn, "COTIZACION_DELETE", {"cotizacion_id": cot_id}, usuario_id=uid, ip=ip)
    return {"ok": True}


@router.patch("/{cot_id}/estado")
def actualizar_estado(
    cot_id: int,
    body: dict,
    conn=Depends(db_conn),
    usuario=Depends(get_current_user),
):
    estado = body.get("estado")
    if estado not in ("Pendiente", "Aprobada", "Rechazada", "Borrador"):
        raise HTTPException(status_code=400, detail="estado inválido")
    cur = conn.cursor()
    cur.execute("UPDATE cotizaciones SET estado=%s WHERE id=%s", (estado, cot_id))
    conn.commit()
    cur.close()
    return {"ok": True}


# ── AIU ──────────────────────────────────────────────────────────────────────

@router.post("/aiu")
def cotizacion_aiu(
    body: CotizacionAIUIn,
    conn=Depends(db_conn),
    usuario=Depends(get_current_user),
):
    """Calcula cotización AIU (obra pública). IVA solo sobre Utilidad — Decreto 1372/92."""

    resultado = calcular_aiu(
        cd=body.cd,
        pct_a=body.pct_a, pct_i=body.pct_i, pct_u=body.pct_u,

        incluir_iva=body.incluir_iva,
    )
    resultado["nombre_cliente"] = body.nombre_cliente
    resultado["tipo_proyecto"]  = body.tipo_proyecto
    resultado["material"]       = body.material
    return resultado


@router.post("/aiu/guardar")
def guardar_aiu(
    body: CotizacionAIUGuardarIn,
    conn=Depends(db_conn),
    usuario=Depends(get_current_user),
):
    """Guarda una cotización AIU en el historial."""
    hoy = date.today().isoformat()
    r = body.resultado
    numero = body.numero or _siguiente_numero(conn, "AIU")
    cliente  = body.cliente or "Sin nombre"

    cur = conn.cursor()
    cur.execute(
        "INSERT INTO cotizaciones "
        "(numero,fecha,cliente,material,tipo,m2,ml,costo,precio,margen,estado,datos_json,usuario_id) "
        "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id",
        (
            numero, hoy, cliente,
            r.get("material", ""),
            r.get("tipo_proyecto", "AIU"),
            0, 0,
            r.get("cd", 0),
            r.get("precio_total", 0),
            r.get("margen_pct", 0),
            "Pendiente",
            json.dumps(r, ensure_ascii=False, default=str),
            usuario["id"],
        ),
    )
    new_id = cur.fetchone()[0]
    conn.commit()
    cur.close()
    return {"id": new_id, "numero": numero}


# ── PDF ──────────────────────────────────────────────────────────────────────

@router.get("/{cot_id}/pdf")
def descargar_pdf(
    cot_id: int,
    conn=Depends(db_conn),
    usuario=Depends(get_current_user),
):
    """Genera y descarga el PDF de una cotización guardada."""
    cur = conn.cursor()
    cur.execute(
        "SELECT numero, datos_json, cliente FROM cotizaciones WHERE id = %s",
        (cot_id,),
    )
    row = cur.fetchone()
    cur.close()
    if not row:
        raise HTTPException(status_code=404, detail="Cotización no encontrada")

    numero, datos_json_str, cliente = row
    try:
        resultado = json.loads(datos_json_str) if isinstance(datos_json_str, str) else datos_json_str
    except Exception:
        raise HTTPException(status_code=500, detail="datos_json inválido")

    empresa_saved = cfg_get(conn, "empresa") or {}
    empresa_info  = {
        "nombre":           empresa_saved.get("nombre",           "Mármoles Collante & Castro Ltda"),
        "nit":              empresa_saved.get("nit",              ""),
        "direccion":        empresa_saved.get("direccion",        ""),
        "telefono":         empresa_saved.get("telefono",         ""),
        "email":            empresa_saved.get("email",            ""),
        "ciudad":           empresa_saved.get("ciudad",           "Barranquilla"),
        "anticipo_pct":     empresa_saved.get("anticipo_pct",     60),
        "dias_entrega":     empresa_saved.get("dias_entrega",     10),
        "condiciones_pago": empresa_saved.get("condiciones_pago", "50% anticipo — 50% contra entrega"),
    }

    logo_b64 = cfg_get(conn, "logo_b64")
    logo_bytes = base64.b64decode(logo_b64) if logo_b64 else None

    if not resultado.get("nombre_cliente") and cliente:
        resultado["nombre_cliente"] = cliente

    try:
        pdf_bytes = generar_pdf_cotizacion(
            resultado=resultado,
            numero=numero,
            empresa_info=empresa_info,
            logo_bytes=logo_bytes,
            incluir_iva=resultado.get("incluir_iva", False),
            inclusiones=resultado.get("inclusiones", []),
            exclusiones=resultado.get("exclusiones", []),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generando PDF: {e}")

    nombre_archivo = f"cotizacion_{numero}.pdf".replace("/", "-")
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{nombre_archivo}"'},
    )


@router.post("/{cot_id}/cuenta-cobro")
def descargar_cuenta_cobro(
    cot_id: int,
    body: dict,
    conn=Depends(db_conn),
    usuario=Depends(get_current_user),
):
    """Genera y descarga la cuenta de cobro de una cotización guardada."""
    cur = conn.cursor()
    cur.execute(
        "SELECT numero, datos_json, cliente FROM cotizaciones WHERE id = %s",
        (cot_id,),
    )
    row = cur.fetchone()
    cur.close()
    if not row:
        raise HTTPException(status_code=404, detail="Cotización no encontrada")

    numero, datos_json_str, cliente = row
    try:
        resultado = json.loads(datos_json_str) if isinstance(datos_json_str, str) else datos_json_str
    except Exception:
        raise HTTPException(status_code=500, detail="datos_json inválido")

    empresa_saved = cfg_get(conn, "empresa") or {}
    datos_prestador = {
        "nombre":       empresa_saved.get("nombre",       "Mármoles Collante & Castro Ltda"),
        "nit":          empresa_saved.get("nit",          ""),
        "ciudad":       empresa_saved.get("ciudad",       "Barranquilla"),
        "tel":          empresa_saved.get("telefono",     ""),
        "email":        empresa_saved.get("email",        ""),
        "anticipo_pct": empresa_saved.get("anticipo_pct", 60),
    }

    datos_pagador = {
        "nombre": body.get("nombre_pagador", ""),
        "nit":    body.get("nit_pagador",    ""),
    }

    logo_b64 = cfg_get(conn, "logo_b64")
    logo_bytes = base64.b64decode(logo_b64) if logo_b64 else None

    if not resultado.get("nombre_cliente") and cliente:
        resultado["nombre_cliente"] = cliente

    # Deriva COB-YYYY-NNNN desde COT-YYYY-NNNN para trazabilidad 1:1
    numero_cc = body.get("numero_cc") or (
        "COB-" + numero[4:] if numero.startswith("COT-") else f"COB-{numero}"
    )

    try:
        pdf_bytes = generar_cuenta_cobro(
            resultado=resultado,
            datos_prestador=datos_prestador,
            datos_pagador=datos_pagador,
            numero=numero_cc,
            logo_bytes=logo_bytes,
            incluir_iva=resultado.get("incluir_iva", False),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generando cuenta de cobro: {e}")

    nombre_archivo = f"cuenta_cobro_{numero}.pdf".replace("/", "-")
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{nombre_archivo}"'},
    )


@router.get("/{cot_id}/aiu-pdf")
def descargar_aiu_pdf(
    cot_id: int,
    conn=Depends(db_conn),
    usuario=Depends(get_current_user),
):
    """Genera y descarga la oferta AIU de una cotización guardada."""
    cur = conn.cursor()
    cur.execute(
        "SELECT numero, datos_json, cliente FROM cotizaciones WHERE id = %s",
        (cot_id,),
    )
    row = cur.fetchone()
    cur.close()
    if not row:
        raise HTTPException(status_code=404, detail="Cotización no encontrada")

    numero, datos_json_str, cliente = row
    try:
        resultado = json.loads(datos_json_str) if isinstance(datos_json_str, str) else datos_json_str
    except Exception:
        raise HTTPException(status_code=500, detail="datos_json inválido")

    empresa_saved = cfg_get(conn, "empresa") or {}
    empresa_info = {
        "nombre":           empresa_saved.get("nombre",           "Mármoles Collante & Castro Ltda"),
        "nit":              empresa_saved.get("nit",              ""),
        "direccion":        empresa_saved.get("direccion",        ""),
        "telefono":         empresa_saved.get("telefono",         ""),
        "email":            empresa_saved.get("email",            ""),
        "ciudad":           empresa_saved.get("ciudad",           "Barranquilla"),
        "anticipo_pct":     empresa_saved.get("anticipo_pct",     60),
        "dias_entrega":     empresa_saved.get("dias_entrega",     10),
        "condiciones_pago": empresa_saved.get("condiciones_pago", "50% anticipo — 50% contra entrega"),
    }

    logo_b64 = cfg_get(conn, "logo_b64")
    logo_bytes = base64.b64decode(logo_b64) if logo_b64 else None

    if not resultado.get("nombre_cliente") and cliente:
        resultado["nombre_cliente"] = cliente

    try:
        pdf_bytes = generar_pdf_cotizacion_aiu(
            resultado=resultado,
            numero=numero,
            empresa_info=empresa_info,
            logo_bytes=logo_bytes,
            incluir_iva=resultado.get("incluir_iva", True),
            inclusiones=resultado.get("inclusiones", []),
            exclusiones=resultado.get("exclusiones", []),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generando PDF AIU: {e}")

    nombre_archivo = f"oferta_aiu_{numero}.pdf".replace("/", "-")
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{nombre_archivo}"'},
    )
