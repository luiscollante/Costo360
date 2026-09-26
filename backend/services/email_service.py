"""
Envío de correo transaccional vía Resend — arregla el hallazgo de hoy: el link
para definir contraseña se generaba (`supabase_admin.generar_enlace`) pero
nunca se enviaba a nadie, solo quedaba en la respuesta HTTP del endpoint.

Patrón: HTTP directo con `httpx` (mismo estilo que `services/supabase_admin.py`,
sin sumar el SDK completo de Resend). Todas las funciones de envío son
best-effort — si `RESEND_API_KEY` no está configurada o la llamada falla,
solo se registra el error y se devuelve `False`; el aprovisionamiento de la
cuenta (que ya generó el link) nunca debe fallar por esto, y el link sigue
devolviéndose también en la respuesta del endpoint como respaldo manual.
"""
import base64
import os
from functools import lru_cache
from pathlib import Path

import httpx

_TIMEOUT = 15.0
# Logo INCRUSTADO en el correo (imagen en línea, `cid:`), no enlazado por URL:
# un enlace externo depende de que el cliente de correo descargue imágenes y el
# PNG original tenía tanto margen transparente que a 28 px de alto el logo era
# casi invisible (hallazgo del fundador, 2026-09-24 — falta de identidad de
# marca). `email_logo.png` es el mismo logo recortado sin margen, a 2x.
_LOGO_CID = "costo360-logo"
_LOGO_PATH = Path(__file__).resolve().parents[1] / "static" / "email_logo.png"


@lru_cache(maxsize=1)
def _logo_adjunto() -> dict | None:
    try:
        contenido = base64.b64encode(_LOGO_PATH.read_bytes()).decode()
    except OSError:
        print("[email] no se encontró static/email_logo.png — correo sin logo", flush=True)
        return None
    return {"filename": "costo360.png", "content": contenido, "content_id": _LOGO_CID}

_ROL_NOMBRE = {"admin": "Administrador", "gerencia": "Gerencia", "operativo": "Operativo"}
_PLAN_NOMBRE = {"starter": "Starter", "pro": "Pro", "enterprise": "Enterprise"}


def _from() -> str:
    # `.get(..., default)` no aplica el default si la env existe pero está vacía
    # (backend/.env deja `RESEND_FROM=` vacío a propósito cuando no se usa) — por
    # eso se comprueba el valor ya leído, no solo la presencia de la clave.
    return os.environ.get("RESEND_FROM", "").strip() or "Costo360 <no-responder@costo360.com>"


def _enviar(destinatario: str, asunto: str, html: str, *, timeout: float = _TIMEOUT) -> bool:
    key = os.environ.get("RESEND_API_KEY", "")
    if not key:
        print(f"[email] RESEND_API_KEY no configurada — no se envió '{asunto}' a {destinatario}", flush=True)
        return False
    try:
        payload = {"from": _from(), "to": [destinatario], "subject": asunto, "html": html}
        logo = _logo_adjunto()
        if logo:
            payload["attachments"] = [logo]
        with httpx.Client(timeout=timeout) as c:
            r = c.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
                json=payload,
            )
        r.raise_for_status()
        return True
    except Exception as e:
        print(f"[email] fallo al enviar '{asunto}' a {destinatario}: {e}", flush=True)
        return False


def _shell(preheader: str, cuerpo_html: str) -> str:
    return f"""<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5E8D2;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;">{preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5E8D2;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border:1px solid #E5D5BA;border-radius:12px;overflow:hidden;max-width:480px;">
        <tr><td style="background:#00472B;padding:28px 32px;">
          <img src="cid:{_LOGO_CID}" alt="Costo360" width="200" height="52" style="display:block;border:0;width:200px;height:auto;max-width:100%;">
        </td></tr>
        <tr><td style="padding:32px;">
          {cuerpo_html}
        </td></tr>
        <tr><td style="background:#FDFBF7;padding:20px 32px;border-top:1px solid #E5D5BA;">
          <p style="margin:0;font-size:12px;color:#8A8A8A;">Costo360 — cotización para talleres de piedra natural en Colombia.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""


def _boton(enlace: str, texto: str) -> str:
    return (
        f'<p style="margin:24px 0;text-align:center;">'
        f'<a href="{enlace}" style="background:#00472B;color:#FFFFFF;text-decoration:none;'
        f'padding:14px 28px;border-radius:8px;font-size:15px;font-weight:600;display:inline-block;">'
        f'{texto}</a></p>'
    )


def enviar_bienvenida_empresa(email: str, nombre_admin: str, nombre_empresa: str, plan_codigo: str, enlace: str) -> bool:
    """Empresa nueva dada de alta (bootstrap) — el admin recibe su primer acceso."""
    plan = _PLAN_NOMBRE.get(plan_codigo, plan_codigo.capitalize())
    saludo = f"Hola{', ' + nombre_admin if nombre_admin else ''}:"
    cuerpo = f"""
      <p style="margin:0 0 16px;font-size:15px;color:#1A1A1A;">{saludo}</p>
      <p style="margin:0 0 16px;font-size:15px;color:#1A1A1A;line-height:1.5;">
        Tu cuenta de <strong>{nombre_empresa}</strong> en Costo360 ya está lista, con el plan
        <strong>{plan}</strong>. Para entrar, primero define tu contraseña — el enlace es de un
        solo uso y vence pronto, hazlo apenas puedas:
      </p>
      {_boton(enlace, "Definir mi contraseña")}
      <p style="margin:0;font-size:14px;color:#5F5F5F;line-height:1.5;">
        Ya puedes cargar tu catálogo de materiales y hacer tu primera cotización. Cualquier duda,
        responde este correo.
      </p>
    """
    asunto = "Tu cuenta de Costo360 ya está lista"
    return _enviar(email, asunto, _shell(f"{asunto} ({nombre_empresa})", cuerpo))


def enviar_invitacion_usuario(email: str, nombre_invitado: str, nombre_empresa: str, rol_codigo: str, enlace: str) -> bool:
    """Usuario invitado dentro de una empresa que ya existe (admin.py)."""
    rol = _ROL_NOMBRE.get(rol_codigo, rol_codigo.capitalize())
    saludo = f"Hola{', ' + nombre_invitado if nombre_invitado else ''}:"
    cuerpo = f"""
      <p style="margin:0 0 16px;font-size:15px;color:#1A1A1A;">{saludo}</p>
      <p style="margin:0 0 16px;font-size:15px;color:#1A1A1A;line-height:1.5;">
        Te invitaron a unirte a la cuenta de <strong>{nombre_empresa}</strong> en Costo360, con el
        rol <strong>{rol}</strong>. Define tu contraseña con el siguiente botón — el enlace es de
        un solo uso y vence pronto:
      </p>
      {_boton(enlace, "Definir mi contraseña")}
    """
    asunto = f"Te invitaron a {nombre_empresa} en Costo360"
    return _enviar(email, asunto, _shell(asunto, cuerpo))


# ── Cobro mensual recurrente (ciclo /goal 2026-09-26) ────────────────────────

def _pesos(v) -> str:
    return "$" + f"{round(float(v or 0)):,}".replace(",", ".")


def _parrafo(texto: str) -> str:
    return f'<p style="margin:0 0 16px;font-size:15px;color:#1A1A1A;line-height:1.5;">{texto}</p>'


def enviar_aviso_cobro_proximo(av: dict) -> bool:
    import html
    empresa = html.escape(av["empresa"])
    cuerpo = (_parrafo(f"Hola, equipo de <strong>{empresa}</strong>:")
              + _parrafo(f"Te recordamos que el <strong>{av['fecha']}</strong> se cobrará automáticamente tu "
                         f"plan <strong>{html.escape(av['plan'])}</strong> por <strong>{_pesos(av['monto'])}</strong> "
                         "con la tarjeta que tienes registrada. No tienes que hacer nada."))
    asunto = "Tu próximo cobro de Costo360"
    return _enviar(av["email"], asunto, _shell(asunto, cuerpo))


def enviar_evento_cobro(ev: dict) -> bool:
    """Recibo, aviso de rechazo o de suspensión al administrador del taller.
    En sandbox no se escribe a clientes reales."""
    import html
    if not ev.get("email") or ev.get("ambiente") == "sandbox":
        return False
    empresa = html.escape(ev.get("empresa") or "")
    base = _parrafo(f"Hola, equipo de <strong>{empresa}</strong>:")
    tipo = ev.get("tipo")
    if tipo == "aprobado":
        asunto = "Recibo de tu pago mensual de Costo360"
        cuerpo = base + _parrafo(f"Recibimos tu pago de <strong>{_pesos(ev['monto'])}</strong> correspondiente al "
                                 f"periodo que inicia el <strong>{ev['periodo']}</strong>. "
                                 + (f"Tu próximo cobro será el <strong>{ev['proximo_cobro']}</strong>. " if ev.get("proximo_cobro") else "")
                                 + "¡Gracias por seguir con nosotros!")
    elif tipo == "fallido":
        asunto = "No pudimos cobrar tu plan de Costo360"
        sig = (f"Lo intentaremos de nuevo el <strong>{ev['reintento']}</strong>." if ev.get("reintento")
               else "Si no se resuelve, tu cuenta pasará a modo de solo lectura al cumplirse 7 días.")
        cuerpo = base + _parrafo("Tu banco rechazó el cobro mensual de Costo360. " + sig
                                 + " Si tu tarjeta cambió, actualízala desde la aplicación.")
    elif tipo == "suspendida":
        asunto = "Tu cuenta de Costo360 está en modo de solo lectura"
        cuerpo = base + _parrafo("No pudimos cobrar tu plan durante 7 días, así que tu cuenta quedó en modo de solo "
                                 "lectura: tus datos siguen intactos. Al ponerte al día con el pago, todo vuelve a la normalidad.")
    else:
        return False
    return _enviar(ev["email"], asunto, _shell(asunto, cuerpo))
