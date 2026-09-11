"""
Barrido de limpieza de la Bóveda del Agente — Objetivo 5, Ciclo 3
(rediseño tras la revisión en vivo del fundador).

Mismo patrón que `routers/proyectos_cron.py`: router APARTE, sin sesión de
usuario (`X-Cron-Secret` en tiempo constante contra `CRON_SECRET`), corre
con `db_service` (rol postgres, BYPASSRLS) y hace el trabajo SET-BASED (una
sentencia DELETE por plan conocido, nunca un bucle por empresa).

Nota de diseño (auditoría de este ciclo): la retención que Cost RESPETA en
la práctica es la que aplica `bitacora.consultar()` en cada consulta bajo
demanda (nunca ve ni usa una acción fuera de plazo, sin importar si este
barrido ya la borró físicamente o no). Este cron solo libera espacio en
disco — corre una vez al día porque el plan gratuito de Vercel Cron no
permite más frecuencia, y no hace falta más: la garantía funcional para el
usuario no depende de esta cadencia.

Disparador real (ciclo `/goal` de conexión del cron, 2026-09-10): el cron
nativo de Vercel invoca SIEMPRE por GET, y manda automáticamente
`Authorization: Bearer <CRON_SECRET>` cuando existe una variable de entorno
con ese nombre exacto (ya configurada en producción) — ver
`backend/vercel.json`. Se acepta también `X-Cron-Secret` como alternativa
manual (mismo secreto), por si en el futuro se prueba a mano o se conecta
un servicio externo distinto.

Reusa `bitacora.RETENCION_DIAS`/`RETENCION_DEFAULT_DIAS` — un solo lugar
con el mapa plan→días, nunca una copia en SQL que pudiera desincronizarse.

A propósito, sin filtrar por `empresas.activa` (a diferencia de
`proyectos_cron.py`): un taller inactivo no necesita que Cost siga
"recordando" nada — se limpia con el mismo criterio que uno activo
(decisión del fundador, auditoría de este ciclo).
"""
import hmac
import logging
import os

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from fastapi.responses import JSONResponse

from backend.agente.bitacora import RETENCION_DEFAULT_DIAS, RETENCION_DIAS
from backend.db.client import db_service
from backend.middleware.rate_limiter import limiter

_log = logging.getLogger("agente.cron")

router = APIRouter(prefix="/api/agente/cron", tags=["agente-cron"])


def verificar_secreto_cron(
    authorization: str | None = Header(default=None),
    x_cron_secret: str | None = Header(default=None),
) -> None:
    """Se resuelve ANTES de `db_service` para que un secreto ausente/inválido
    no tome una conexión del pool. Acepta el secreto por CUALQUIERA de dos
    headers, mismo `CRON_SECRET`, comparación en tiempo constante en ambos
    casos: `Authorization: Bearer <secreto>` (lo que Vercel Cron manda
    automático) o `X-Cron-Secret: <secreto>` (alternativa manual/externa)."""
    esperado = os.environ.get("CRON_SECRET", "")
    if not esperado:
        raise HTTPException(status_code=503, detail="Automatización no configurada")

    recibido = x_cron_secret
    if authorization and authorization.startswith("Bearer "):
        recibido = authorization[len("Bearer "):]

    if not recibido:
        raise HTTPException(status_code=401, detail="Falta el secreto del cron")
    if not hmac.compare_digest(recibido.encode(), esperado.encode()):
        raise HTTPException(status_code=401, detail="Secreto inválido")


def limpiar_historial(cur) -> dict:
    """Recibe un cursor y NO hace commit (lo hace el wrapper `db_service`)."""
    cur.execute("set local statement_timeout = '60s'")
    cur.execute("set local lock_timeout = '5s'")

    borradas = 0
    for plan_codigo, dias in RETENCION_DIAS.items():
        cur.execute(
            "delete from agente_historial_acciones h using empresas e "
            "where h.empresa_id = e.id and e.plan_codigo = %s "
            "and h.creado_en < now() - make_interval(days => %s)",
            (plan_codigo, dias),
        )
        borradas += cur.rowcount

    # Cualquier plan_codigo NO listado en RETENCION_DIAS (dato corrupto, o un
    # plan nuevo agregado sin actualizar ese mapa) usa el default conservador
    # — mismo criterio que `bitacora.dias_retencion()`.
    cur.execute(
        "delete from agente_historial_acciones h using empresas e "
        "where h.empresa_id = e.id and e.plan_codigo != all(%s) "
        "and h.creado_en < now() - make_interval(days => %s)",
        (list(RETENCION_DIAS.keys()), RETENCION_DEFAULT_DIAS),
    )
    borradas += cur.rowcount

    return {"filas_borradas": borradas}


@router.get("/limpiar-historial")
@limiter.limit("6/hour")
def limpiar_historial_endpoint(
    request: Request,
    _secreto=Depends(verificar_secreto_cron),
    conn=Depends(db_service),
):
    cur = conn.cursor()
    try:
        resumen = limpiar_historial(cur)
    except Exception:
        _log.exception("limpiar-historial falló")
        raise HTTPException(status_code=500, detail="Error ejecutando la limpieza")
    finally:
        cur.close()
    # Defensa en profundidad (auditoría de este ciclo): nunca servir una
    # respuesta cacheada en vez de ejecutar el barrido de verdad.
    return JSONResponse({"ok": True, **resumen}, headers={"Cache-Control": "no-store"})
