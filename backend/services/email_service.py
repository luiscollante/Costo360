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
import os

import httpx

_TIMEOUT = 15.0
_LOGO_URL = "https://costo360-web.vercel.app/logo.png"

_ROL_NOMBRE = {"admin": "Administrador", "gerencia": "Gerencia", "operativo": "Operativo"}
_PLAN_NOMBRE = {"starter": "Starter", "pro": "Pro", "enterprise": "Enterprise"}


def _from() -> str:
    return os.environ.get("RESEND_FROM", "Costo360 <no-responder@costo360.com>")


def _enviar(destinatario: str, asunto: str, html: str) -> bool:
    key = os.environ.get("RESEND_API_KEY", "")
    if not key:
        print(f"[email] RESEND_API_KEY no configurada — no se envió '{asunto}' a {destinatario}", flush=True)
        return False
    try:
        with httpx.Client(timeout=_TIMEOUT) as c:
            r = c.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
                json={"from": _from(), "to": [destinatario], "subject": asunto, "html": html},
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
          <img src="{_LOGO_URL}" alt="Costo360" height="28" style="display:block;border:0;">
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
