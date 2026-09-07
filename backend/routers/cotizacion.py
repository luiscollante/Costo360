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
from backend.db.client import db_rls
from backend.db.deps import scope_propio, verificar_dispositivo
from backend.db.config_helpers import cfg_get
from backend.services import cotizacion_service

from calculos import calcular_aiu
from generador_pdf import generar_pdf_cotizacion, generar_pdf_cotizacion_aiu, generar_cuenta_cobro

router = APIRouter(prefix="/api/cotizacion", tags=["cotizacion"],
                   dependencies=[Depends(verificar_dispositivo)])


@router.post("/directa")
def cotizacion_directa(
    body: CotizacionDirectaIn,
    conn=Depends(db_rls),
    usuario=Depends(get_current_user),
):
    """
    Calcula la cotización directa completa de un proyecto en piedra natural
    o sinterizado. Retorna el precio sugerido, costo total, utilidad y el
    desglose por componente (c1–c7).
    """
    entrada = body.model_dump()
    entrada["materiales_lista"] = [m.model_dump() for m in body.materiales_lista]
    entrada["piezas"] = [p.model_dump() for p in body.piezas]
    return cotizacion_service.calcular_directa(conn, usuario, entrada)


@router.post("/guardar")
def guardar_cotizacion(
    body: CotizacionGuardarIn,
    conn=Depends(db_rls),
    usuario=Depends(get_current_user),
):
    return cotizacion_service.guardar_cotizacion(
        conn, usuario, body.resultado, numero=body.numero, cliente=body.cliente,
    )


@router.get("/historial")
def historial_cotizaciones(
    busqueda: str = "",
    estado: str = "",
    fecha_desde: str = "",
    fecha_hasta: str = "",
    conn=Depends(db_rls),
    usuario=Depends(get_current_user),
):
    return cotizacion_service.listar_historial(
        conn, usuario, busqueda=busqueda, estado=estado,
        fecha_desde=fecha_desde, fecha_hasta=fecha_hasta,
    )


@router.get("/{cot_id}/datos")
def obtener_datos_cotizacion(
    cot_id: int,
    conn=Depends(db_rls),
    usuario=Depends(get_current_user),
):
    """Retorna datos_json de una cotización para poder editarla."""
    resultado = cotizacion_service.obtener_cotizacion_datos(conn, usuario, cot_id)
    if resultado is None:
        raise HTTPException(status_code=404, detail="Cotización no encontrada")
    return resultado


@router.delete("/{cot_id}")
def eliminar_cotizacion(
    cot_id: int,
    request: Request,
    conn=Depends(db_rls),
    usuario=Depends(get_current_user),
):
    ip = request.client.host if request.client else None
    cotizacion_service.borrar_cotizacion(conn, usuario, cot_id, ip=ip)
    return {"ok": True}


@router.patch("/{cot_id}/estado")
def actualizar_estado(
    cot_id: int,
    body: dict,
    request: Request,
    conn=Depends(db_rls),
    usuario=Depends(get_current_user),
):
    ip = request.client.host if request.client else None
    cotizacion_service.cambiar_estado_cotizacion(conn, usuario, cot_id, body.get("estado"), ip=ip)
    return {"ok": True}


# ── AIU ──────────────────────────────────────────────────────────────────────

@router.post("/aiu")
def cotizacion_aiu(
    body: CotizacionAIUIn,
    conn=Depends(db_rls),
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
    conn=Depends(db_rls),
    usuario=Depends(get_current_user),
):
    """Guarda una cotización AIU en el historial."""
    hoy = date.today().isoformat()
    r = body.resultado
    numero = body.numero or cotizacion_service.siguiente_numero_folio(conn, usuario["empresa_id"], "AIU")
    cliente = body.cliente or "Sin nombre"

    cur = conn.cursor()
    cur.execute(
        "INSERT INTO cotizaciones "
        "(empresa_id,numero,fecha,cliente,material,tipo,m2,ml,costo,precio,margen,estado,datos_json,usuario_id) "
        "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id",
        (
            usuario["empresa_id"],
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
    cur.close()
    return {"id": new_id, "numero": numero}


# ── PDF ──────────────────────────────────────────────────────────────────────

def _empresa_info(conn, empresa_id) -> dict:
    saved = cfg_get(conn, empresa_id, "empresa") or {}
    return {
        "nombre":           saved.get("nombre", ""),
        "nit":              saved.get("nit", ""),
        "direccion":        saved.get("direccion", ""),
        "telefono":         saved.get("telefono", ""),
        "email":            saved.get("email", ""),
        "ciudad":           saved.get("ciudad", ""),
        "anticipo_pct":     saved.get("anticipo_pct", 60),
        "dias_entrega":     saved.get("dias_entrega", 10),
        "condiciones_pago": saved.get("condiciones_pago", "50% anticipo — 50% contra entrega"),
    }


def _logo_bytes(conn, empresa_id):
    logo_b64 = cfg_get(conn, empresa_id, "empresa_logo_b64")
    return base64.b64decode(logo_b64) if logo_b64 else None


def _cargar_cotizacion(conn, cot_id, uid=None):
    cur = conn.cursor()
    if uid is not None:
        cur.execute(
            "SELECT numero, datos_json, cliente FROM cotizaciones WHERE id = %s AND usuario_id = %s",
            (cot_id, uid),
        )
    else:
        cur.execute("SELECT numero, datos_json, cliente FROM cotizaciones WHERE id = %s", (cot_id,))
    row = cur.fetchone()
    cur.close()
    if not row:
        raise HTTPException(status_code=404, detail="Cotización no encontrada")
    numero, datos_json_str, cliente = row
    try:
        resultado = json.loads(datos_json_str) if isinstance(datos_json_str, str) else datos_json_str
    except Exception:
        raise HTTPException(status_code=500, detail="datos_json inválido")
    if not resultado.get("nombre_cliente") and cliente:
        resultado["nombre_cliente"] = cliente
    return numero, resultado, cliente


@router.get("/{cot_id}/pdf")
def descargar_pdf(cot_id: int, conn=Depends(db_rls), usuario=Depends(get_current_user)):
    """Genera y descarga el PDF de una cotización guardada."""
    emp = usuario["empresa_id"]
    restringido, uid = scope_propio(usuario)
    numero, resultado, _ = _cargar_cotizacion(conn, cot_id, uid if restringido else None)
    try:
        pdf_bytes = generar_pdf_cotizacion(
            resultado=resultado,
            numero=numero,
            empresa_info=_empresa_info(conn, emp),
            logo_bytes=_logo_bytes(conn, emp),
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
    conn=Depends(db_rls),
    usuario=Depends(get_current_user),
):
    """Genera y descarga la cuenta de cobro de una cotización guardada."""
    emp = usuario["empresa_id"]
    restringido, uid = scope_propio(usuario)
    numero, resultado, _ = _cargar_cotizacion(conn, cot_id, uid if restringido else None)
    info = _empresa_info(conn, emp)
    datos_prestador = {
        "nombre":       info["nombre"],
        "nit":          info["nit"],
        "ciudad":       info["ciudad"],
        "tel":          info["telefono"],
        "email":        info["email"],
        "anticipo_pct": info["anticipo_pct"],
    }
    datos_pagador = {
        "nombre": body.get("nombre_pagador", ""),
        "nit":    body.get("nit_pagador", ""),
    }
    numero_cc = body.get("numero_cc") or (
        "COB-" + numero[4:] if numero.startswith("COT-") else f"COB-{numero}"
    )
    try:
        pdf_bytes = generar_cuenta_cobro(
            resultado=resultado,
            datos_prestador=datos_prestador,
            datos_pagador=datos_pagador,
            numero=numero_cc,
            logo_bytes=_logo_bytes(conn, emp),
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
def descargar_aiu_pdf(cot_id: int, conn=Depends(db_rls), usuario=Depends(get_current_user)):
    """Genera y descarga la oferta AIU de una cotización guardada."""
    emp = usuario["empresa_id"]
    restringido, uid = scope_propio(usuario)
    numero, resultado, _ = _cargar_cotizacion(conn, cot_id, uid if restringido else None)
    try:
        pdf_bytes = generar_pdf_cotizacion_aiu(
            resultado=resultado,
            numero=numero,
            empresa_info=_empresa_info(conn, emp),
            logo_bytes=_logo_bytes(conn, emp),
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
