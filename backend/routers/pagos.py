"""
Pagos con Wompi — checkout, cobro y webhook de confirmación (Paso 3 del
ciclo de aprovisionamiento automático). Ciclo /goal formal, plan auditado
por un Security Engineer antes de escribir este archivo.

3 endpoints, todos públicos (sin sesión de usuario — nadie tiene cuenta
todavía en este flujo):
  POST /api/pagos/iniciar        — arma el checkout (el monto SIEMPRE se
                                    resuelve aquí desde `planes`, nunca se
                                    confía en lo que mande el navegador).
  POST /api/pagos/cobrar         — el frontend ya tokenizó la tarjeta
                                    contra Wompi directo (nunca pasa por
                                    aquí); este endpoint crea el
                                    payment_source y dispara el primer cobro.
  POST /api/pagos/webhook/wompi  — Wompi confirma el resultado real del
                                    pago; SOLO aquí se aprovisiona la
                                    empresa. Nunca confiar en la respuesta
                                    síncrona de /cobrar como la verdad
                                    final (así lo indica la propia
                                    documentación de Wompi).
"""
import re
import uuid
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, field_validator

_RE_EMAIL = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")

from backend.db.client import db_service
from backend.middleware.rate_limiter import limiter
from backend.services import cobro_recurrente_service, wompi_service
from backend.services.aprovisionamiento_service import (
    PLANES_VALIDOS,
    AprovisionamientoError,
    aprovisionar_empresa,
)

router = APIRouter(prefix="/api/pagos", tags=["pagos"])


# ══════════════════════════════════════════════════════════════════════════
# GET /planes
# ══════════════════════════════════════════════════════════════════════════

@router.get("/planes")
@limiter.limit("30/minute")
def listar_planes(request: Request, conn=Depends(db_service)):
    """Público -- el checkout todavía no tiene sesión de usuario. Mismos datos
    que ya son públicos en la landing (precio de cada plan)."""
    cur = conn.cursor()
    cur.execute(
        "SELECT codigo, nombre, precio_mensual_cop, cupo_usuarios FROM planes ORDER BY precio_mensual_cop"
    )
    filas = cur.fetchall()
    cur.close()
    return [
        {"codigo": codigo, "nombre": nombre, "precio_mensual_cop": float(precio), "cupo_usuarios": cupo}
        for codigo, nombre, precio, cupo in filas
    ]


# ══════════════════════════════════════════════════════════════════════════
# GET /estado/{reference}
# ══════════════════════════════════════════════════════════════════════════

@router.get("/estado/{reference}")
@limiter.limit("60/minute")
def estado_pago(request: Request, reference: str, conn=Depends(db_service)):
    """Público -- el frontend hace polling de esto mientras espera la
    confirmación asíncrona del webhook. Nunca devuelve el enlace de acceso
    (eso solo llega por correo) -- solo el estado, para pintar la pantalla."""
    cur = conn.cursor()
    cur.execute("SELECT estado FROM solicitudes_pago WHERE reference = %s", (reference,))
    row = cur.fetchone()
    cur.close()
    if row is None:
        raise HTTPException(status_code=404, detail="Solicitud de pago no encontrada")
    return {"estado": row[0]}


# ══════════════════════════════════════════════════════════════════════════
# POST /iniciar
# ══════════════════════════════════════════════════════════════════════════

class IniciarPagoIn(BaseModel):
    nombre_empresa: str
    nit: str | None = None
    plan_codigo: str
    admin_email: str
    admin_nombre: str = ""

    @field_validator("plan_codigo")
    @classmethod
    def _plan_valido(cls, v: str) -> str:
        if v not in PLANES_VALIDOS:
            raise ValueError("plan_codigo inválido")
        return v

    @field_validator("nombre_empresa")
    @classmethod
    def _nombre_no_vacio(cls, v: str) -> str:
        v = v.strip()
        if not v or len(v) > 200:
            raise ValueError("nombre de empresa inválido")
        return v

    @field_validator("admin_email")
    @classmethod
    def _email_valido(cls, v: str) -> str:
        v = v.strip().lower()
        if not _RE_EMAIL.fullmatch(v) or len(v) > 254:
            raise ValueError("correo inválido")
        return v


@router.post("/iniciar", status_code=201)
@limiter.limit("5/hour")
def iniciar_pago(request: Request, body: IniciarPagoIn, conn=Depends(db_service)):
    cur = conn.cursor()
    cur.execute("SELECT precio_mensual_cop FROM planes WHERE codigo = %s", (body.plan_codigo,))
    row = cur.fetchone()
    if row is None:
        cur.close()
        raise HTTPException(status_code=422, detail="Plan no encontrado")
    monto_cop = row[0]  # SIEMPRE del catálogo -- nunca del cliente

    # Verificado en vivo (2026-09-20): sin este chequeo, alguien con un correo
    # ya registrado (p. ej. una cuenta demo previa) podía pagar de verdad y
    # solo ENTONCES enterarse de que el aprovisionamiento falla -- nunca cobrar
    # antes de saber que la cuenta se puede crear.
    cur.execute("SELECT 1 FROM auth.users WHERE lower(email) = %s", (body.admin_email,))
    if cur.fetchone() is not None:
        cur.close()
        raise HTTPException(
            status_code=409,
            detail="Ya existe una cuenta de Costo360 con este correo. Inicia sesión o usa otro correo.",
        )

    reference = f"costo360-{uuid.uuid4().hex}"
    cur.execute(
        "INSERT INTO solicitudes_pago "
        "(reference, plan_codigo, nombre_empresa, nit, admin_email, admin_nombre, monto_cop) "
        "VALUES (%s, %s, %s, %s, %s, %s, %s)",
        (
            reference, body.plan_codigo, body.nombre_empresa,
            (body.nit or "").strip() or None,
            body.admin_email.lower(), body.admin_nombre.strip(), monto_cop,
        ),
    )
    cur.close()
    conn.commit()

    try:
        return {
            "reference": reference,
            "amount_in_cents": wompi_service.amount_in_cents(monto_cop),
            "currency": "COP",
            "public_key": wompi_service.llave_publica(),
            "signature_integrity": wompi_service.firma_integridad(reference, monto_cop),
        }
    except RuntimeError:
        # Las 4 llaves de Wompi todavía no están configuradas en este
        # entorno -- la solicitud ya quedó guardada (queda "pendiente" hasta
        # que expire), pero no hay nada que devolverle al frontend para
        # armar el checkout.
        raise HTTPException(status_code=503, detail="Los pagos no están habilitados en este entorno todavía")


# ══════════════════════════════════════════════════════════════════════════
# POST /cobrar
# ══════════════════════════════════════════════════════════════════════════

class CobrarIn(BaseModel):
    reference: str
    token: str
    acceptance_token: str
    accept_personal_auth: str


@router.post("/cobrar")
@limiter.limit("10/hour")
def cobrar(request: Request, body: CobrarIn, conn=Depends(db_service)):
    cur = conn.cursor()
    cur.execute(
        "SELECT admin_email, monto_cop, estado, payment_source_id FROM solicitudes_pago WHERE reference = %s",
        (body.reference,),
    )
    row = cur.fetchone()
    if row is None:
        cur.close()
        raise HTTPException(status_code=404, detail="Solicitud de pago no encontrada")
    email, monto_cop, estado, payment_source_id_previo = row
    if estado != "pendiente":
        cur.close()
        raise HTTPException(status_code=409, detail="Esta solicitud ya fue procesada")
    if payment_source_id_previo:
        # Ya se disparó un cobro para esta reference (el campo se guarda ANTES
        # de cobrar, ver abajo) -- el webhook todavía no confirmó el resultado.
        # Verificado en vivo (2026-09-20): el frontend puede agotar su timeout
        # mientras Wompi sigue procesando y el cobro igual queda APPROVED del
        # lado de Wompi -- sin este bloqueo, un reintento del usuario dispara
        # un SEGUNDO cobro real por la misma solicitud.
        cur.close()
        raise HTTPException(
            status_code=409,
            detail="Ya se envió un cobro para esta solicitud. Espera un momento a que se confirme antes de reintentar.",
        )

    try:
        fuente = wompi_service.crear_payment_source(
            body.token, email, body.acceptance_token, body.accept_personal_auth
        )
        payment_source_id = str(fuente.get("id"))
    except Exception as e:
        cur.close()
        print(f"[pagos] fallo al crear payment_source para {body.reference}: {e}", flush=True)
        raise HTTPException(status_code=502, detail="No se pudo validar el medio de pago. Intenta de nuevo.")

    # Se guarda ANTES de cobrar -- si el webhook llega antes de que esta
    # función termine de responder, ya lo encuentra.
    cur.execute(
        "UPDATE solicitudes_pago SET payment_source_id = %s WHERE reference = %s AND estado = 'pendiente'",
        (payment_source_id, body.reference),
    )
    cur.close()
    conn.commit()

    try:
        transaccion = wompi_service.cobrar_con_payment_source(
            body.reference, monto_cop, payment_source_id, email, recurrente=False
        )
    except Exception as e:
        print(f"[pagos] fallo al cobrar {body.reference}: {e}", flush=True)
        raise HTTPException(status_code=502, detail="No se pudo procesar el cobro. Intenta de nuevo.")

    # La confirmación real llega por el webhook -- esto es solo para que el
    # frontend muestre "procesando"/"aprobado" mientras tanto.
    return {"estado_transaccion": transaccion.get("status"), "transaction_id": transaccion.get("id")}


# ══════════════════════════════════════════════════════════════════════════
# POST /webhook/wompi
# ══════════════════════════════════════════════════════════════════════════

@router.post("/webhook/wompi")
async def webhook_wompi(request: Request, conn=Depends(db_service)):
    payload = await request.json()

    if not wompi_service.verificar_checksum_evento(payload):
        # Nunca se procesa nada sin firma válida -- esto NO es Wompi.
        raise HTTPException(status_code=401, detail="Firma inválida")

    transaction = (payload.get("data") or {}).get("transaction") or {}
    transaction_id = transaction.get("id")
    reference = transaction.get("reference")
    estado_wompi = transaction.get("status")
    monto_recibido = transaction.get("amount_in_cents")
    if not transaction_id or not reference or not estado_wompi:
        # Evento sin la forma esperada -- se responde 200 igual (para que
        # Wompi no reintente algo que nunca vamos a poder procesar), pero se
        # deja registrado para revisión manual.
        print("[pagos] webhook con forma inesperada (sin id, referencia o estado) -- revisar", flush=True)
        return {"ok": True}

    if reference.startswith("REC-"):
        # Cobro MENSUAL recurrente: camino propio, nunca el de alta de empresa
        # (auditoría: un APPROVED mensual por el camino de alta intentaría
        # crear otra empresa). Idempotencia y validación de monto/moneda en
        # `aplicar_resultado`; solo cambia estados desde 'pendiente'.
        evento = cobro_recurrente_service.aplicar_resultado(
            conn, reference, transaction_id, estado_wompi, monto_recibido, transaction.get("currency"))
        conn.commit()
        if evento:
            avisar_cobro(evento)
        return {"ok": True}

    cur = conn.cursor()
    # Idempotencia real: INSERT primero, con UNIQUE en transaction_id. Si ya
    # existe, este es un reintento del MISMO pago -- no se reprocesa nada.
    cur.execute(
        "INSERT INTO pagos_procesados (transaction_id, reference, monto_cop, estado_wompi) "
        "VALUES (%s, %s, %s, %s) ON CONFLICT (transaction_id) DO NOTHING RETURNING transaction_id",
        (transaction_id, reference, (monto_recibido or 0) / 100, estado_wompi),
    )
    ya_procesado = cur.fetchone() is None
    cur.close()
    conn.commit()
    if ya_procesado:
        return {"ok": True}

    if estado_wompi != "APPROVED":
        cur = conn.cursor()
        cur.execute(
            "UPDATE solicitudes_pago SET estado = 'fallido', resuelta_en = now() "
            "WHERE reference = %s AND estado = 'pendiente'",
            (reference,),
        )
        cur.close()
        conn.commit()
        return {"ok": True}

    cur = conn.cursor()
    cur.execute(
        "SELECT nombre_empresa, nit, plan_codigo, admin_email, admin_nombre, monto_cop, "
        "       estado, payment_source_id "
        "FROM solicitudes_pago WHERE reference = %s FOR UPDATE",
        (reference,),
    )
    row = cur.fetchone()
    if row is None:
        cur.close()
        print(f"[pagos] webhook APPROVED sin solicitud_pago para reference={reference} -- revisar a mano", flush=True)
        return {"ok": True}

    nombre_empresa, nit, plan_codigo, admin_email, admin_nombre, monto_cop, estado, payment_source_id = row
    if estado != "pendiente":
        cur.close()
        return {"ok": True}

    monto_esperado = wompi_service.amount_in_cents(monto_cop)
    if monto_recibido is not None and int(monto_recibido) != monto_esperado:
        cur.close()
        print(
            f"[pagos] MONTO NO COINCIDE para reference={reference}: "
            f"esperado={monto_esperado} recibido={monto_recibido} -- revisar a mano, NO se aprovisiona",
            flush=True,
        )
        return {"ok": True}
    cur.close()

    try:
        resultado = aprovisionar_empresa(
            conn,
            nombre_empresa=nombre_empresa,
            nit=nit,
            plan_codigo=plan_codigo,
            admin_email=admin_email,
            admin_nombre=admin_nombre,
            origen="pago_wompi",
        )
    except AprovisionamientoError as e:
        print(f"[pagos] pago APPROVED pero aprovisionamiento falló para reference={reference}: {e} -- revisar a mano, YA SE COBRÓ", flush=True)
        # Sin esto la solicitud quedaba 'pendiente' para siempre -- el
        # frontend nunca sale de "seguimos confirmando" y Wompi no reintenta
        # el webhook porque ya respondimos 200. Se marca 'fallido' para que la
        # pantalla al menos muestre un resultado claro; el dinero ya cobrado
        # y sin cuenta creada queda para revisión manual (log de arriba).
        cur = conn.cursor()
        cur.execute(
            "UPDATE solicitudes_pago SET estado = 'fallido', resuelta_en = now() "
            "WHERE reference = %s AND estado = 'pendiente'",
            (reference,),
        )
        cur.close()
        conn.commit()
        return {"ok": True}

    cur = conn.cursor()
    cur.execute(
        "UPDATE solicitudes_pago SET estado = 'pagado', empresa_id = %s, resuelta_en = now() "
        "WHERE reference = %s",
        (resultado["empresa_id"], reference),
    )

    if payment_source_id:
        metodo = transaction.get("payment_method") or {}
        extra = metodo.get("extra") or {}
        cur.execute(
            "INSERT INTO medios_pago_guardados (empresa_id, payment_source_id, marca, ultimos_4) "
            "VALUES (%s, %s, %s, %s) ON CONFLICT (empresa_id) DO NOTHING",
            (resultado["empresa_id"], payment_source_id, extra.get("brand"), extra.get("last_four")),
        )
        # Ciclo mensual anclado al día del primer pago, en hora Colombia (antes:
        # date.today()+30 en UTC, que corría el ciclo cada mes).
        hoy = cobro_recurrente_service.hoy_bogota()
        cur.execute(
            "INSERT INTO suscripciones_wompi (empresa_id, plan_codigo, payment_source_id, proxima_fecha_cobro, "
            "dia_ancla, ambiente) VALUES (%s, %s, %s, %s, %s, %s) ON CONFLICT (empresa_id) DO NOTHING",
            (resultado["empresa_id"], plan_codigo, payment_source_id,
             cobro_recurrente_service.siguiente_fecha(hoy, hoy.day), hoy.day, wompi_service.ambiente()),
        )

    cur.close()
    conn.commit()
    return {"ok": True}


def avisar_cobro(evento: dict) -> None:
    """Aviso al fundador (Telegram + correo) y al taller. Nunca lanza: un aviso
    caído no puede revertir un cobro ya comiteado."""
    try:
        from backend.services import alertas_service, email_service
        titulo, texto = cobro_recurrente_service.texto_evento(evento)
        alertas_service._notificar(titulo, texto)
        email_service.enviar_evento_cobro(evento)
    except Exception:
        print("[pagos] no se pudo enviar el aviso de cobro", flush=True)
