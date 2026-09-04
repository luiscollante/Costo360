"""
Sesión única con aviso real (Regla 5) — Fase 2.A.

Máquina de estados sobre `public.sesion_activa` (1 fila por usuario):
  estado ∈ {'activa', 'takeover_pendiente'}
  device_actual  = dispositivo que HOY tiene la sesión
  retador        = dispositivo que pidió tomarla
  retador_desde  = cuándo lo pidió

Flujo: B inicia sesión → `claim` → si hay otro dispositivo activo, estado pasa a
`takeover_pendiente`. A (titular) recibe el aviso por polling de `heartbeat` (o por
Realtime en el frontend) y decide: `keep` (se queda) o `handoff` (cede). Si A no
responde en `_TIMEOUT_S`, el `heartbeat` cede automáticamente a B. B puede `claim?
force=true` de inmediato (decisión del fundador 2026-09-03: sin período de espera
para forzar — antes eran `_GRACE_S` segundos).

Todas las transiciones son un `UPDATE ... WHERE estado=<esperado>` condicional con
chequeo de `rowcount` (evita TOCTOU — hallazgo S6/D10). `claim` toma `FOR UPDATE`
sobre la fila para serializar reclamos concurrentes del mismo usuario.

NOTA (hallazgo S5): la expulsión de un dispositivo se hace cumplir con el chequeo
`X-Device-Id` en `verificar_dispositivo` (409 SESSION_SUPERSEDED en las rutas de
datos), NO revocando el token en Supabase — GoTrue no permite revocar la sesión de
UN dispositivo concreto sin cerrar las de todos. El `device.id` es de 128 bits
aleatorios y nunca se registra en logs, así que el 409 no es evadible en la
práctica. Es una "sesión única cooperativa": con el titular offline, la cesión a B
es silenciosa por diseño.
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Body, Depends, Header, HTTPException, Request
from pydantic import BaseModel
from psycopg2.extras import Json

from backend.db.client import db_service
from backend.middleware.auth import get_current_user
from backend.middleware.rate_limiter import limiter

router = APIRouter(prefix="/api/auth/session", tags=["session"])

_GRACE_S = 0        # B puede forzar de inmediato (decisión del fundador 2026-09-03)
_TIMEOUT_S = 90     # si el titular no responde en 90 s, el heartbeat cede a B
_UUSO_THROTTLE_S = 60


class DeviceIn(BaseModel):
    id: str
    label: str = ""
    plataforma: str = ""
    user_agent: str = ""


def _dev(d: DeviceIn) -> dict:
    return {
        "id": d.id[:64], "label": d.label[:80],
        "plataforma": d.plataforma[:40], "user_agent": d.user_agent[:200],
    }


def _age_s(ts) -> float:
    if ts is None:
        return 1e9
    return (datetime.now(timezone.utc) - ts).total_seconds()


@router.post("/claim")
@limiter.limit("30/minute")
def claim(
    request: Request,
    device: DeviceIn = Body(..., embed=True),
    force: bool = False,
    usuario=Depends(get_current_user),
    conn=Depends(db_service),
):
    uid = usuario["id"]
    dev = _dev(device)
    cur = conn.cursor()
    cur.execute(
        "SELECT estado, device_actual, retador, retador_desde "
        "FROM sesion_activa WHERE usuario_id = %s FOR UPDATE",
        (uid,),
    )
    row = cur.fetchone()

    if row is None:
        # Crear la fila. ON CONFLICT DO NOTHING cierra la carrera de dos primeros
        # `claim` concurrentes (el FOR UPDATE de arriba no bloquea lo que no existe).
        cur.execute(
            "INSERT INTO sesion_activa (usuario_id, device_actual, estado, iniciada_en, ultimo_uso) "
            "VALUES (%s, %s, 'activa', now(), now()) ON CONFLICT (usuario_id) DO NOTHING",
            (uid, Json(dev)),
        )
        if cur.rowcount == 1:
            cur.close()
            return {"status": "active"}
        # Otro dispositivo ganó la creación → re-leer y seguir la máquina normal.
        cur.execute(
            "SELECT estado, device_actual, retador, retador_desde "
            "FROM sesion_activa WHERE usuario_id = %s FOR UPDATE",
            (uid,),
        )
        row = cur.fetchone()

    estado, device_actual, retador, retador_desde = row
    actual_id = (device_actual or {}).get("id")
    actual_label = (device_actual or {}).get("label") or "otro dispositivo"

    if actual_id == dev["id"]:
        cur.execute(
            "UPDATE sesion_activa SET estado='activa', device_actual=%s, retador=NULL, "
            "retador_desde=NULL, ultimo_uso=now() WHERE usuario_id=%s",
            (Json(dev), uid),
        )
        cur.close()
        return {"status": "active"}

    if estado == "takeover_pendiente":
        ret_id = (retador or {}).get("id")
        if force and ret_id == dev["id"]:
            if _age_s(retador_desde) <= _GRACE_S:
                cur.close()
                raise HTTPException(status_code=425, detail="Espera unos segundos antes de forzar")
            cur.execute(
                "UPDATE sesion_activa SET estado='activa', device_actual=%s, retador=NULL, "
                "retador_desde=NULL, resuelto_en=now(), ultimo_uso=now() "
                "WHERE usuario_id=%s AND estado='takeover_pendiente' AND retador->>'id'=%s",
                (Json(dev), uid, dev["id"]),
            )
            ok = cur.rowcount
            cur.close()
            if ok:
                return {"status": "active"}
            raise HTTPException(status_code=409, detail="El otro dispositivo mantuvo la sesión")

        if _age_s(retador_desde) > _TIMEOUT_S:
            # el retador anterior se quedó sin responder; este toma el relevo
            cur.execute(
                "UPDATE sesion_activa SET retador=%s, retador_desde=now() WHERE usuario_id=%s",
                (Json(dev), uid),
            )
            cur.close()
            return {"status": "pending", "prev_device": actual_label}

        if ret_id == dev["id"]:
            cur.close()
            return {"status": "pending", "prev_device": actual_label}

        cur.close()
        return {"status": "busy"}

    cur.execute(
        "UPDATE sesion_activa SET estado='takeover_pendiente', retador=%s, retador_desde=now() "
        "WHERE usuario_id=%s AND estado='activa'",
        (Json(dev), uid),
    )
    ok = cur.rowcount
    cur.close()
    if not ok:
        raise HTTPException(status_code=409, detail="El estado de la sesión cambió; reintenta")
    return {"status": "pending", "prev_device": actual_label}


@router.post("/keep")
def keep(usuario=Depends(get_current_user), x_device_id: str | None = Header(None),
         conn=Depends(db_service)):
    """El titular actual conserva la sesión y rechaza el intento pendiente."""
    cur = conn.cursor()
    cur.execute(
        "UPDATE sesion_activa SET estado='activa', retador=NULL, retador_desde=NULL, "
        "resuelto_en=now(), ultimo_uso=now() "
        "WHERE usuario_id=%s AND estado='takeover_pendiente' AND device_actual->>'id'=%s",
        (usuario["id"], x_device_id or ""),
    )
    ok = cur.rowcount
    cur.close()
    if not ok:
        raise HTTPException(status_code=409, detail="No hay un intento pendiente que puedas mantener")
    return {"status": "kept"}


@router.post("/handoff")
def handoff(usuario=Depends(get_current_user), x_device_id: str | None = Header(None),
            conn=Depends(db_service)):
    """El titular actual cede la sesión al dispositivo retador."""
    cur = conn.cursor()
    cur.execute(
        "UPDATE sesion_activa SET device_actual=retador, estado='activa', retador=NULL, "
        "retador_desde=NULL, resuelto_en=now(), ultimo_uso=now() "
        "WHERE usuario_id=%s AND estado='takeover_pendiente' AND device_actual->>'id'=%s "
        "RETURNING device_actual",
        (usuario["id"], x_device_id or ""),
    )
    row = cur.fetchone()
    cur.close()
    if not row:
        raise HTTPException(status_code=409, detail="No hay un intento pendiente que puedas ceder")
    return {"status": "handed_off"}


@router.post("/heartbeat")
def heartbeat(usuario=Depends(get_current_user), x_device_id: str | None = Header(None),
              conn=Depends(db_service)):
    """
    El cliente lo llama en bucle (cada ~20-30 s). Resuelve el timeout perezoso
    (cede a B si el titular nunca respondió), refresca `ultimo_uso` con throttle, y
    devuelve el estado para que el frontend reaccione (mostrar aviso / "tu sesión
    se movió").
    """
    uid = usuario["id"]
    cur = conn.cursor()
    cur.execute(
        "UPDATE sesion_activa SET device_actual=retador, estado='activa', retador=NULL, "
        "retador_desde=NULL, resuelto_en=now() "
        "WHERE usuario_id=%s AND estado='takeover_pendiente' "
        "AND retador_desde + make_interval(secs => %s) < now()",
        (uid, _TIMEOUT_S),
    )
    cur.execute(
        "SELECT estado, device_actual, retador FROM sesion_activa WHERE usuario_id=%s",
        (uid,),
    )
    row = cur.fetchone()
    if row is None:
        cur.close()
        return {"estado": "none", "mine": False, "am_i_retador": False}

    estado, device_actual, retador = row
    actual_id = (device_actual or {}).get("id")
    mine = bool(x_device_id and x_device_id == actual_id)
    if mine:
        cur.execute(
            "UPDATE sesion_activa SET ultimo_uso=now() WHERE usuario_id=%s "
            "AND (ultimo_uso IS NULL OR ultimo_uso < now() - make_interval(secs => %s))",
            (uid, _UUSO_THROTTLE_S),
        )
    cur.close()
    return {
        "estado": estado,
        "mine": mine,
        "device_actual": (device_actual or {}).get("label"),
        "retador": (retador or {}).get("label") if estado == "takeover_pendiente" else None,
        "am_i_retador": bool(x_device_id and retador and x_device_id == (retador or {}).get("id")),
    }


@router.post("/logout")
def logout(usuario=Depends(get_current_user), conn=Depends(db_service)):
    cur = conn.cursor()
    cur.execute("DELETE FROM sesion_activa WHERE usuario_id=%s", (usuario["id"],))
    cur.close()
    return {"ok": True}
