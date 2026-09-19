"""
Cliente mínimo de la Admin API de Supabase Auth (GoTrue) — Fase 2.A.

Se usa con la `service_role` key (solo en el backend). `httpx` directo contra
`${SUPABASE_URL}/auth/v1/admin/...` para no sumar el SDK completo.

El aprovisionamiento crea el `auth.users` con `app_metadata` en un solo paso
(`crear_usuario`), lo que dispara el trigger `handle_new_user` (que valida contra
`invitaciones` y crea la fila en `public.usuarios`). Luego se genera un enlace de
"recovery" para que la persona defina su contraseña.
"""
import os

import httpx

_TIMEOUT = 15.0


def _base() -> str:
    url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    if not url:
        raise RuntimeError("SUPABASE_URL no está configurada")
    return url + "/auth/v1"


def _headers() -> dict:
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not key:
        raise RuntimeError("SUPABASE_SERVICE_ROLE_KEY no está configurada")
    return {"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json"}


def crear_usuario(email: str, app_metadata: dict, *, email_confirm: bool = True) -> dict:
    """Crea el auth.users con app_metadata (dispara handle_new_user). Sin contraseña."""
    with httpx.Client(timeout=_TIMEOUT) as c:
        r = c.post(
            f"{_base()}/admin/users",
            headers=_headers(),
            json={"email": email, "email_confirm": email_confirm, "app_metadata": app_metadata},
        )
    r.raise_for_status()
    return r.json()


def generar_enlace(email: str, tipo: str = "recovery") -> str:
    """
    Genera un enlace de acción (recovery / invite / magiclink). Devuelve el action_link.

    Sin `redirect_to`, Supabase manda a la persona al "Site URL" configurado en
    el proyecto (la raíz del sitio) en vez de a `/reset-password`, que es la
    única pantalla que sabe leer el enlace y pedir la contraseña nueva —
    encontrado al probar el correo real por primera vez.

    IMPORTANTE: en este endpoint REST crudo (a diferencia del SDK de JS),
    `redirect_to` va en el nivel superior del body, NO anidado bajo `options`
    — verificado a mano contra la API real: `options.redirect_to` y
    `options.redirectTo` se ignoran en silencio y Supabase cae de vuelta al
    Site URL por defecto, sin ningún error.
    """
    # `.get(clave, default)` no aplica el default si la clave existe pero vacía
    # (mismo bug ya encontrado en `email_service._from` con RESEND_FROM=).
    frontend = (os.environ.get("FRONTEND_URL", "").strip() or "http://localhost:5173").rstrip("/")
    with httpx.Client(timeout=_TIMEOUT) as c:
        r = c.post(
            f"{_base()}/admin/generate_link",
            headers=_headers(),
            json={
                "type": tipo,
                "email": email,
                "redirect_to": f"{frontend}/reset-password",
            },
        )
    r.raise_for_status()
    data = r.json()
    return data.get("action_link") or data.get("properties", {}).get("action_link", "")


def eliminar_usuario(user_id: str) -> None:
    """Borra el auth.users → la FK con ON DELETE CASCADE borra la fila de public.usuarios."""
    with httpx.Client(timeout=_TIMEOUT) as c:
        r = c.delete(f"{_base()}/admin/users/{user_id}", headers=_headers())
    r.raise_for_status()


def cerrar_sesiones(user_id: str) -> None:
    """
    Best-effort: intenta revocar las sesiones activas del usuario en Supabase.
    La protección real ante desactivación/degradación es la re-lectura sin caché
    de `activo`/`rol_codigo` en `get_current_user` en cada request (todo el acceso
    a datos pasa por el backend). Se tolera que el endpoint no exista.
    """
    try:
        with httpx.Client(timeout=_TIMEOUT) as c:
            r = c.post(f"{_base()}/admin/users/{user_id}/logout", headers=_headers())
        if r.status_code not in (200, 204, 404, 405):
            r.raise_for_status()
    except Exception:
        pass
