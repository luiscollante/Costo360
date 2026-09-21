"""
Motor único de aprovisionamiento de empresas — Paso 2 del ciclo de pagos/demos.

Antes esta lógica vivía solo dentro de `routers/bootstrap.py` (alta manual del
fundador). Se extrae aquí para que el webhook de pago (Wompi, próximo paso) y
las cuentas demo usen exactamente el mismo camino — nunca duplicar la
secuencia de compensación en 2 lugares que podrían desincronizarse.

Secuencia (la Admin API de Supabase no es transaccional):
INSERT empresas + invitación → commit → crear auth.users (dispara
handle_new_user) → generar enlace de recovery → correo de bienvenida →
si algo de eso falla, compensación: borrar el auth.users si llegó a crearse,
luego borrar la empresa (cascada limpia la invitación).
"""
from backend.services import email_service, supabase_admin

PLANES_VALIDOS = {"starter", "pro", "enterprise"}
ORIGENES_VALIDOS = {"demo_fundador", "pago_wompi"}


class AprovisionamientoError(Exception):
    """El aprovisionamiento falló y ya se compensó (no queda estado a medias)."""


def aprovisionar_empresa(
    conn,
    *,
    nombre_empresa: str,
    nit: str | None,
    plan_codigo: str,
    admin_email: str,
    admin_nombre: str,
    origen: str,
) -> dict:
    """
    Crea la empresa + su usuario administrador + le envía el correo de
    bienvenida. `conn` debe ser una conexión `db_service` (BYPASSRLS) — la
    empresa todavía no existe, no hay ningún `empresa_id` contra el cual
    aplicar RLS. `origen` queda registrado para trazabilidad/reportes
    ('demo_fundador' | 'pago_wompi').

    Devuelve {"empresa_id": str, "admin_email": str, "enlace": str}.
    Lanza `AprovisionamientoError` si falla — ya compensado, nunca deja un
    auth.users huérfano ni una empresa sin administrador.
    """
    if plan_codigo not in PLANES_VALIDOS:
        raise AprovisionamientoError(f"plan_codigo inválido: {plan_codigo}")
    if origen not in ORIGENES_VALIDOS:
        raise AprovisionamientoError(f"origen inválido: {origen}")

    email = admin_email.strip().lower()
    nombre_empresa = nombre_empresa.strip()
    nit_limpio = (nit or "").strip() or None
    admin_nombre = admin_nombre.strip()

    cur = conn.cursor()
    cur.execute(
        "INSERT INTO empresas (nombre, nit, plan_codigo) VALUES (%s, %s, %s) RETURNING id",
        (nombre_empresa, nit_limpio, plan_codigo),
    )
    empresa_id = cur.fetchone()[0]
    cur.execute(
        "INSERT INTO invitaciones (email, empresa_id, rol_codigo) VALUES (%s, %s, 'admin')",
        (email, empresa_id),
    )
    cur.close()
    conn.commit()  # commit ANTES de la Admin API (no transaccional)

    user_id = None
    try:
        user = supabase_admin.crear_usuario(
            email,
            {
                "empresa_id": str(empresa_id),
                "rol_codigo": "admin",
                "nombre_completo": admin_nombre,
            },
        )
        user_id = user.get("id") or user.get("user", {}).get("id")
        enlace = supabase_admin.generar_enlace(email, "recovery")
        email_service.enviar_bienvenida_empresa(
            email, admin_nombre, nombre_empresa, plan_codigo, enlace
        )
    except Exception as e:
        print(f"[aprovisionamiento] fallo ({origen}) al aprovisionar {email}: {e}", flush=True)
        if user_id:
            try:
                supabase_admin.eliminar_usuario(user_id)
            except Exception:
                pass
        cur = conn.cursor()
        cur.execute("DELETE FROM empresas WHERE id = %s", (empresa_id,))
        cur.close()
        conn.commit()
        raise AprovisionamientoError("No se pudo crear el usuario administrador") from e

    return {
        "empresa_id": str(empresa_id),
        "admin_email": email,
        "enlace": enlace,
    }
