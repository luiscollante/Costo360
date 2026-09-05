"""
Lógica de negocio de Cotización compartida entre el router HTTP normal y las
tools del Agente de IA (Objetivo 5, Ciclo 2) — misma fuente de verdad para
los dos caminos, nunca una reimplementación aparte del SQL (hallazgo de la
auditoría de seguridad: ver `agente/tools/proyectos.py` para el mismo
patrón ya aplicado en Ciclo 1).
"""
from fastapi import HTTPException, Request

from backend.db.deps import scope_propio
from backend.services.audit_service import log_accion

_ESTADOS_VALIDOS = ("Pendiente", "Aprobada", "Rechazada", "Borrador")


def borrar_cotizacion(conn, usuario: dict, cot_id: int, *, ip: str | None = None,
                       metadata_extra: dict | None = None) -> dict:
    restringido, uid = scope_propio(usuario)
    cur = conn.cursor()
    if restringido:
        cur.execute(
            "DELETE FROM cotizaciones WHERE id = %s AND usuario_id = %s "
            "RETURNING id, numero, cliente, precio, fecha, estado",
            (cot_id, uid),
        )
    else:
        cur.execute(
            "DELETE FROM cotizaciones WHERE id = %s "
            "RETURNING id, numero, cliente, precio, fecha, estado",
            (cot_id,),
        )
    row = cur.fetchone()
    cur.close()
    if row is None:
        raise HTTPException(status_code=404, detail="Cotización no encontrada o sin permiso")
    metadata = {"cotizacion_id": cot_id}
    if metadata_extra:
        metadata.update(metadata_extra)
    log_accion(conn, "COTIZACION_DELETE", metadata,
               empresa_id=usuario["empresa_id"], usuario_id=usuario["id"], ip=ip)
    return {
        "id": row[0], "numero": row[1], "cliente": row[2],
        "precio": row[3], "fecha": str(row[4]), "estado": row[5],
    }


def cambiar_estado_cotizacion(conn, usuario: dict, cot_id: int, estado: str, *,
                               ip: str | None = None, metadata_extra: dict | None = None) -> dict:
    if estado not in _ESTADOS_VALIDOS:
        raise HTTPException(status_code=400, detail="estado inválido")
    restringido, uid = scope_propio(usuario)
    cur = conn.cursor()
    if restringido:
        cur.execute(
            "UPDATE cotizaciones SET estado = %s WHERE id = %s AND usuario_id = %s "
            "RETURNING id, numero, cliente, precio, estado",
            (estado, cot_id, uid),
        )
    else:
        cur.execute(
            "UPDATE cotizaciones SET estado = %s WHERE id = %s "
            "RETURNING id, numero, cliente, precio, estado",
            (estado, cot_id),
        )
    row = cur.fetchone()
    cur.close()
    if row is None:
        raise HTTPException(status_code=404, detail="Cotización no encontrada o sin permiso")
    metadata = {"cotizacion_id": cot_id, "estado_nuevo": estado}
    if metadata_extra:
        metadata.update(metadata_extra)
    log_accion(conn, "COTIZACION_ESTADO", metadata,
               empresa_id=usuario["empresa_id"], usuario_id=usuario["id"], ip=ip)
    return {"id": row[0], "numero": row[1], "cliente": row[2], "precio": row[3], "estado": row[4]}


def obtener_cotizacion_resumen(conn, usuario: dict, cot_id: int) -> dict | None:
    """Fila resumida (para tarjetas de confirmación y respuestas de tools) —
    nunca el `datos_json` completo, que puede ser grande."""
    restringido, uid = scope_propio(usuario)
    cur = conn.cursor()
    if restringido:
        cur.execute(
            "SELECT id, numero, cliente, precio, fecha, estado FROM cotizaciones "
            "WHERE id = %s AND usuario_id = %s",
            (cot_id, uid),
        )
    else:
        cur.execute(
            "SELECT id, numero, cliente, precio, fecha, estado FROM cotizaciones WHERE id = %s",
            (cot_id,),
        )
    row = cur.fetchone()
    cur.close()
    if row is None:
        return None
    return {
        "id": row[0], "numero": row[1], "cliente": row[2],
        "precio": row[3], "fecha": str(row[4]), "estado": row[5],
    }
