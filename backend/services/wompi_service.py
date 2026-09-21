"""
Integración con Wompi — checkout, tokenización y cobro recurrente.

4 llaves distintas, cada una con un propósito (nunca confundirlas):
  WOMPI_PUBLIC_KEY     — va al frontend, identifica el comercio.
  WOMPI_PRIVATE_KEY    — solo backend, autoriza cobrar de verdad.
  WOMPI_EVENTS_SECRET  — solo backend, verifica que un aviso de pago es
                         realmente de Wompi (checksum del webhook).
  WOMPI_INTEGRITY_SECRET — solo backend, firma el monto antes de mandar al
                         cliente a pagar (para que nadie lo manipule desde
                         el navegador).

Flujo real (confirmado contra la documentación oficial de Wompi y auditado
por un Security Engineer antes de escribir esto):
  1. El frontend tokeniza la tarjeta directo contra Wompi (nunca toca
     nuestro backend) -> obtiene un `token`.
  2. Backend crea el payment_source con ese token (`crear_payment_source`).
  3. Backend hace el PRIMER cobro con ese payment_source
     (`cobrar_con_payment_source`, sin `recurrent`).
  4. Si el webhook confirma `APPROVED`, el payment_source queda guardado
     como reutilizable -- los cobros mensuales siguientes sí llevan
     `recurrent: true` (Credential On File, sin 3D Secure de nuevo).
"""
import hashlib
import hmac
import os

import httpx

_TIMEOUT = 20.0
_BASE_SANDBOX = "https://sandbox.wompi.co/v1"
_BASE_PROD = "https://production.wompi.co/v1"


def _es_sandbox() -> bool:
    return os.environ.get("WOMPI_PUBLIC_KEY", "").startswith("pub_test_")


def _base() -> str:
    return _BASE_SANDBOX if _es_sandbox() else _BASE_PROD


def _llave(nombre_env: str) -> str:
    v = os.environ.get(nombre_env, "")
    if not v:
        raise RuntimeError(f"{nombre_env} no está configurada")
    return v


def _headers_privados() -> dict:
    return {"Authorization": f"Bearer {_llave('WOMPI_PRIVATE_KEY')}", "Content-Type": "application/json"}


def llave_publica() -> str:
    return _llave("WOMPI_PUBLIC_KEY")


def amount_in_cents(monto_cop) -> int:
    """Wompi expide el monto en 'centavos' aunque el COP no los use en la
    práctica -- $150.000 se manda como 15000000. Redondeo explícito: nunca
    dejar que un float con error de representación cambie el monto real."""
    from decimal import ROUND_HALF_UP, Decimal
    return int((Decimal(str(monto_cop)) * 100).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def firma_integridad(reference: str, monto_cop, moneda: str = "COP") -> str:
    """SHA256(reference + amount_in_cents + moneda + integrity_secret).
    Se calcula SIEMPRE aquí (backend) -- nunca en el navegador, o cualquiera
    podría firmar un monto manipulado."""
    secreto = _llave("WOMPI_INTEGRITY_SECRET")
    cadena = f"{reference}{amount_in_cents(monto_cop)}{moneda}{secreto}"
    return hashlib.sha256(cadena.encode("utf-8")).hexdigest()


def verificar_checksum_evento(payload: dict) -> bool:
    """
    Verifica que un evento de webhook sea realmente de Wompi.

    Algoritmo real de Wompi: tomar los valores de los campos listados en
    `payload["signature"]["properties"]` (en ESE orden, son rutas tipo
    "transaction.id" dentro de payload["data"]), concatenarlos, agregar
    `payload["timestamp"]` (campo del NIVEL RAÍZ del payload, hermano de
    "signature" -- NO anidado dentro de "signature", a diferencia de
    "properties"/"checksum" -- verificado empíricamente contra un webhook real
    simulado, la confusión inicial hacía que el checksum nunca coincidiera),
    agregar el secreto de eventos, y sacar SHA256. Comparación en tiempo
    constante contra `payload["signature"]["checksum"]` (evita timing attacks).
    """
    firma = payload.get("signature") or {}
    properties = firma.get("properties") or []
    timestamp = payload.get("timestamp")
    checksum_recibido = firma.get("checksum")
    if not properties or timestamp is None or not checksum_recibido:
        return False

    data = payload.get("data") or {}
    partes = []
    for ruta in properties:
        valor = data
        for parte in ruta.split("."):
            if not isinstance(valor, dict) or parte not in valor:
                return False
            valor = valor[parte]
        partes.append(str(valor))

    secreto = _llave("WOMPI_EVENTS_SECRET")
    cadena = "".join(partes) + str(timestamp) + secreto
    checksum_calculado = hashlib.sha256(cadena.encode("utf-8")).hexdigest()
    return hmac.compare_digest(checksum_calculado, str(checksum_recibido))


def crear_payment_source(token: str, email: str, acceptance_token: str, accept_personal_auth: str) -> dict:
    """Crea la fuente de pago reutilizable a partir de un token de tarjeta
    (el token lo generó el frontend directo contra Wompi -- la tarjeta nunca
    tocó nuestro backend). Devuelve el JSON de Wompi (incluye `id`)."""
    with httpx.Client(timeout=_TIMEOUT) as c:
        r = c.post(
            f"{_base()}/payment_sources",
            headers=_headers_privados(),
            json={
                "type": "CARD",
                "token": token,
                "customer_email": email,
                "acceptance_token": acceptance_token,
                "accept_personal_auth": accept_personal_auth,
            },
        )
    r.raise_for_status()
    return r.json().get("data", {})


def cobrar_con_payment_source(
    reference: str, monto_cop, payment_source_id: str, email: str, *, recurrente: bool = False
) -> dict:
    """
    Ejecuta un cobro real contra un payment_source ya existente.
    `recurrente=False` para el primer cobro (permite 3D Secure si el emisor
    lo exige); `recurrente=True` para los cobros mensuales siguientes
    (Credential On File, sin 3D Secure -- el titular no está presente).
    """
    body = {
        "amount_in_cents": amount_in_cents(monto_cop),
        "currency": "COP",
        "customer_email": email,
        "reference": reference,
        "payment_source_id": payment_source_id,
        # Wompi exige estos 2 campos también al cobrar con payment_source_id
        # (no solo en el checkout widget) -- verificado empíricamente contra el
        # sandbox real, la documentación no lo deja claro. "installments": 1
        # porque no ofrecemos cuotas para una suscripción mensual.
        "payment_method": {"installments": 1},
        "signature": firma_integridad(reference, monto_cop, "COP"),
    }
    if recurrente:
        body["recurrent"] = True
    with httpx.Client(timeout=_TIMEOUT) as c:
        r = c.post(f"{_base()}/transactions", headers=_headers_privados(), json=body)
    r.raise_for_status()
    return r.json().get("data", {})
