"""
Ciclo de vida de una propuesta de acción del Agente de IA — Objetivo 5.

El modelo SOLO puede crear propuestas (`crear_propuesta`, invocada desde
un `handler` de tool marcada `es_destructiva=True`). Confirmar/descartar
es un endpoint HTTP separado (`agente/router.py`), llamado directamente
por el frontend cuando el usuario pulsa un botón real — nunca por el
modelo, ni siquiera nominalmente (bloqueante de seguridad cerrado en la
auditoría de Fase 2: "confirmar_accion no debe ser una tool del modelo").
"""
import json

from fastapi import HTTPException
from psycopg2.extras import Json

from backend.agente import registry

# Corto a propósito: acota la ventana de exposición si una sesión se ve
# comprometida mientras hay una propuesta destructiva pendiente (hallazgo
# de la auditoría de seguridad — Regla 5 ya quitó el período de gracia de
# sesión única por decisión del fundador, así que este es el otro lado de
# esa misma superficie de riesgo).
_EXPIRA_MINUTOS = 15


def crear_propuesta(conn, usuario: dict, herramienta: str, payload: dict,
                    filas_afectadas: list[dict], es_destructiva: bool) -> dict:
    cur = conn.cursor()
    cur.execute(
        "insert into agente_acciones_pendientes "
        "(empresa_id, usuario_id, herramienta, payload, filas_afectadas, es_destructiva, expira_en) "
        "values (%s, %s, %s, %s, %s, %s, now() + make_interval(mins => %s)) "
        "returning id, herramienta, payload, filas_afectadas, es_destructiva, estado, expira_en",
        (usuario["empresa_id"], usuario["id"], herramienta, Json(payload),
         Json(filas_afectadas), es_destructiva, _EXPIRA_MINUTOS),
    )
    row = cur.fetchone()
    cur.close()
    return _propuesta_dict(row)


def _propuesta_dict(row) -> dict:
    return {
        "propuesta_id": str(row[0]), "herramienta": row[1], "payload": row[2],
        "filas_afectadas": row[3], "es_destructiva": row[4], "estado": row[5],
        "expira_en": row[6].isoformat(),
    }


def obtener_propuesta(conn, usuario: dict, propuesta_id: str) -> dict:
    """RLS ya aísla por empresa Y usuario_id — si no es del usuario actual,
    esta consulta simplemente no la ve (nunca un 403 que confirme que existe
    la fila de otro usuario)."""
    cur = conn.cursor()
    cur.execute(
        "select id, herramienta, payload, filas_afectadas, es_destructiva, estado, expira_en "
        "from agente_acciones_pendientes where id = %s",
        (propuesta_id,),
    )
    row = cur.fetchone()
    cur.close()
    if row is None:
        raise HTTPException(status_code=404, detail="Propuesta no encontrada")
    return _propuesta_dict(row)


def confirmar_propuesta(conn, usuario: dict, propuesta_id: str) -> dict:
    """
    Único camino real de ejecución de una acción destructiva. Nunca
    invocado por el modelo.

    UPDATE atómico condicionado a `estado = 'pendiente' AND expira_en > now()`
    con RETURNING: cierra la carrera de doble confirmación (dos clics, dos
    pestañas) — si dos peticiones llegan a la vez, solo una obtiene la fila;
    la otra ve 0 filas y responde 409. La resolución de expiración es
    perezosa, en la misma sentencia (mismo patrón que `sesion_activa`/
    heartbeat, sin depender de un cron aparte).
    """
    cur = conn.cursor()
    cur.execute(
        "update agente_acciones_pendientes set estado = 'confirmada' "
        "where id = %s and usuario_id = %s and estado = 'pendiente' and expira_en > now() "
        "returning herramienta, payload",
        (propuesta_id, usuario["id"]),
    )
    row = cur.fetchone()
    if row is None:
        cur.execute(
            "update agente_acciones_pendientes set estado = 'expirada' "
            "where id = %s and usuario_id = %s and estado = 'pendiente' and expira_en <= now()",
            (propuesta_id, usuario["id"]),
        )
        cur.close()
        raise HTTPException(
            status_code=409,
            detail="Esta propuesta ya no está disponible (expiró, se confirmó o se descartó antes).",
        )
    cur.close()
    herramienta, payload = row
    spec = registry.obtener(herramienta)
    if spec is None or spec.handler_confirmar is None:
        raise HTTPException(status_code=500, detail="Herramienta de confirmación no disponible")
    # `handler_confirmar` es la función de servicio real (p. ej.
    # `proyectos_service.borrar_tarea`), que vuelve a leer la fila objetivo
    # bajo esta misma conexión (`db_rls` del usuario actual) antes de
    # tocarla — mitiga la condición de carrera "TOCTOU" entre proponer y
    # confirmar sin necesitar código de comparación aparte.
    return spec.handler_confirmar(conn, usuario, payload)


def descartar_propuesta(conn, usuario: dict, propuesta_id: str) -> None:
    cur = conn.cursor()
    cur.execute(
        "update agente_acciones_pendientes set estado = 'descartada' "
        "where id = %s and usuario_id = %s and estado = 'pendiente'",
        (propuesta_id, usuario["id"]),
    )
    afectadas = cur.rowcount
    cur.close()
    if afectadas == 0:
        raise HTTPException(status_code=409, detail="Esta propuesta ya no está pendiente.")
