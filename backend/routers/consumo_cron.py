"""
Consumo de IA — revisión diaria de alertas + lectura para el Centro de Control
(ciclo /goal 2026-09-24).

1. `GET /api/consumo/cron/revision` — cron nativo de Vercel (una vez al día,
   plan Hobby). Mismo patrón que `agente_cron.py`: sin sesión de usuario,
   `CRON_SECRET` en tiempo constante, `db_service` (BYPASSRLS). Re-evalúa todo
   lo consumido este mes (red de seguridad si un aviso en tiempo real se
   perdió) y consulta el saldo REAL de la cuenta de ElevenLabs.

2. `GET /api/admin/consumo` — solo lectura para el Centro de Control del
   fundador (app local). Autenticado con `ADMIN_API_TOKEN` (header
   `X-Admin-Token`, comparación en tiempo constante). El Centro de Control lo
   llama desde su backend Python, nunca desde el navegador.
"""
import hmac
import logging
import os

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from fastapi.responses import JSONResponse

from backend.db.client import db_service
from backend.middleware.rate_limiter import limiter
from backend.routers.agente_cron import verificar_secreto_cron
from backend.services import alertas_service, consumo_service, render_service

_log = logging.getLogger("consumo.cron")

router = APIRouter(tags=["consumo-cron"])


@router.get("/api/consumo/cron/revision")
@limiter.limit("6/hour")
def revision_diaria(request: Request, _secreto=Depends(verificar_secreto_cron), conn=Depends(db_service)):
    try:
        resumen = alertas_service.revision_completa(conn)
    except Exception:
        _log.exception("revisión diaria de consumo falló")
        raise HTTPException(status_code=500, detail="Error en la revisión de consumo")
    return JSONResponse({"ok": True, **resumen}, headers={"Cache-Control": "no-store"})


def verificar_token_admin(x_admin_token: str | None = Header(default=None)) -> None:
    esperado = os.environ.get("ADMIN_API_TOKEN", "")
    if not esperado:
        raise HTTPException(status_code=503, detail="Acceso de administración no configurado")
    if not x_admin_token or not hmac.compare_digest(x_admin_token.encode(), esperado.encode()):
        raise HTTPException(status_code=401, detail="Token inválido")


@router.get("/api/admin/consumo")
@limiter.limit("60/hour")
def consumo_plataforma(request: Request, _tok=Depends(verificar_token_admin), conn=Depends(db_service)):
    """Consumo del mes de todas las empresas activas, por servicio, más los
    últimos avisos enviados. Sin datos de clientes finales de los talleres."""
    cur = conn.cursor()
    cur.execute("SELECT id, nombre, plan_codigo FROM empresas WHERE activa ORDER BY nombre")
    empresas = []
    for empresa_id, nombre, plan in cur.fetchall():
        tope_g = consumo_service.tope_gemini_cop(conn, {"empresa_id": empresa_id, "plan_codigo": plan})
        gasto_g = consumo_service.gasto_mes_gemini_cop(conn, empresa_id)
        tope_r = render_service.obtener_tope_mensual(conn, empresa_id)
        gasto_r = render_service.gasto_mensual(conn, empresa_id)
        tope_v = consumo_service.tope_voz_mensajes_usuario(conn, empresa_id, plan)
        cur.execute("SELECT id, nombre_completo FROM usuarios WHERE empresa_id = %s AND activo ORDER BY nombre_completo",
                    (empresa_id,))
        usuarios = []
        for usuario_id, nombre_u in cur.fetchall():
            usados = consumo_service.mensajes_voz_mes_usuario(conn, usuario_id)
            usuarios.append({"nombre": nombre_u or "Sin nombre", "voz_mensajes": round(usados, 1),
                             "voz_tope": tope_v, "voz_pct": consumo_service.porcentaje(usados, tope_v)})
        empresas.append({
            "nombre": nombre, "plan": plan,
            "cost_gasto_cop": round(gasto_g), "cost_tope_cop": tope_g,
            "cost_pct": consumo_service.porcentaje(gasto_g, tope_g),
            "render_gasto_usd": round(gasto_r, 2), "render_tope_usd": tope_r,
            "render_pct": consumo_service.porcentaje(gasto_r, tope_r),
            "usuarios": usuarios,
        })
    cur.execute("SELECT ambito, api, umbral, detalle, creado_en FROM alerta_consumo_enviada "
                "ORDER BY creado_en DESC LIMIT 30")
    alertas = [{"ambito": a, "api": b, "umbral": u, "detalle": d, "creado_en": c.isoformat()}
               for a, b, u, d, c in cur.fetchall()]
    return JSONResponse({"empresas": empresas, "alertas": alertas}, headers={"Cache-Control": "no-store"})
