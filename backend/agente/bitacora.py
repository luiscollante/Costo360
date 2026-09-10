"""
Bitácora de acciones EJECUTADAS del Agente de IA — Objetivo 5, Ciclo 3.

Se llama desde dos lugares, siempre con la MISMA conexión de la transacción
que hizo la escritura real (nunca en un `commit()` aparte):
  1. `confirmations.py::confirmar_propuesta`, tras invocar `handler_confirmar`.
  2. Los 3 handlers de escritura directa que ya existían antes de este ciclo
     (`proyectos_crear_tarea`, la rama de alta de `catalogo_crear_material`,
     la rama no-Aprobada de `cotizacion_cambiar_estado`), justo antes de
     retornar — todos con `es_deshacible=False` (son altas o transiciones sin
     snapshot "antes", nunca ediciones de un campo existente).
"""
from fastapi import HTTPException
from psycopg2.extras import Json

from backend.agente import registry

# Modo BI del Centro del Agente (decisión del fundador, Ciclo 3: mismo
# permiso `puede_pedir_datos_agregados_agente` que ya existía sin usar en
# `roles_catalogo` desde la migración 0001). Nunca expone una fila
# individual: agrupa por usuario y omite cualquier grupo con menos de este
# umbral de filas — sin esto, un usuario con 1 sola acción quedaría
# identificado igual que si el admin viera su bitácora fila por fila,
# justo lo que la Regla 1 de este ciclo quiso evitar.
UMBRAL_K_ANONIMATO = 5


def registrar_ejecucion(conn, usuario: dict, herramienta: str, payload: dict,
                        filas_afectadas: list[dict], es_deshacible: bool) -> None:
    cur = conn.cursor()
    cur.execute(
        "insert into agente_historial_acciones "
        "(empresa_id, usuario_id, herramienta, payload, filas_afectadas, es_deshacible) "
        "values (%s, %s, %s, %s, %s, %s)",
        (usuario["empresa_id"], usuario["id"], herramienta, Json(payload),
         Json(filas_afectadas), es_deshacible),
    )
    cur.close()


def listar_historial(conn, usuario: dict, limite: int = 50) -> list[dict]:
    """RLS ya aísla por empresa Y usuario_id — cada usuario ve SOLO lo suyo,
    sin importar su rol (decisión del fundador, Ciclo 3: ni admin ni
    gerencia ven la bitácora de otro por este camino — el modo BI agregado
    de abajo es la única ventana cruzada, y nunca fila por fila)."""
    cur = conn.cursor()
    cur.execute(
        "select id, herramienta, payload, filas_afectadas, es_deshacible, "
        "creado_en, deshecha_en from agente_historial_acciones "
        "order by creado_en desc limit %s",
        (limite,),
    )
    filas = cur.fetchall()
    cur.close()
    return [
        {
            "id": str(r[0]), "herramienta": r[1], "payload": r[2], "filas_afectadas": r[3],
            "es_deshacible": r[4], "creado_en": r[5].isoformat(),
            "deshecha_en": r[6].isoformat() if r[6] else None,
        }
        for r in filas
    ]


def obtener_agregado(conn, usuario: dict) -> dict:
    """
    Modo BI del Centro del Agente — SOLO alcanzable con
    `puede_pedir_datos_agregados_agente` (verificado en el router antes de
    llegar aquí). Corre bajo `db_service` (bypassa RLS a propósito, como
    `require_dashboard`) — por eso TODO filtra por `empresa_id` a mano en
    cada consulta, nunca se confía en RLS para el aislamiento aquí.
    """
    emp = usuario["empresa_id"]
    cur = conn.cursor()
    cur.execute(
        "select herramienta, count(*), count(*) filter (where deshecha_en is not null) "
        "from agente_historial_acciones where empresa_id = %s "
        "group by herramienta order by count(*) desc",
        (emp,),
    )
    por_herramienta = [
        {"herramienta": r[0], "total": r[1], "deshechas": r[2]} for r in cur.fetchall()
    ]

    cur.execute(
        "select h.usuario_id, u.nombre_completo, count(*) as total "
        "from agente_historial_acciones h join usuarios u on u.id = h.usuario_id "
        "where h.empresa_id = %s group by h.usuario_id, u.nombre_completo "
        "having count(*) >= %s order by total desc",
        (emp, UMBRAL_K_ANONIMATO),
    )
    por_usuario = [
        {"usuario_id": str(r[0]), "nombre": r[1], "total": r[2]} for r in cur.fetchall()
    ]

    cur.execute(
        "select count(*), coalesce(sum(total), 0) from ("
        "  select usuario_id, count(*) as total from agente_historial_acciones "
        "  where empresa_id = %s group by usuario_id having count(*) < %s"
        ") t",
        (emp, UMBRAL_K_ANONIMATO),
    )
    usuarios_agrupados, acciones_agrupadas = cur.fetchone()
    cur.close()
    return {
        "por_herramienta": por_herramienta,
        "por_usuario": por_usuario,
        "usuarios_agrupados": usuarios_agrupados,
        "acciones_agrupadas": acciones_agrupadas,
        "umbral_k_anonimato": UMBRAL_K_ANONIMATO,
    }


def deshacer_accion(conn, usuario: dict, historial_id: str) -> dict:
    """
    UPDATE atómico condicionado a `deshecha_en IS NULL AND es_deshacible` con
    RETURNING — mismo patrón que `confirmations.confirmar_propuesta`: un
    doble clic nunca deshace dos veces, la segunda petición ve 0 filas y
    responde 409.
    """
    cur = conn.cursor()
    cur.execute(
        "update agente_historial_acciones set deshecha_en = now(), deshecha_por = %s "
        "where id = %s and usuario_id = %s and deshecha_en is null and es_deshacible "
        "returning herramienta, payload, filas_afectadas",
        (usuario["id"], historial_id, usuario["id"]),
    )
    row = cur.fetchone()
    cur.close()
    if row is None:
        raise HTTPException(
            status_code=409,
            detail="Esta acción ya no se puede deshacer (ya se deshizo antes, o no es deshacible).",
        )
    herramienta, payload, filas_afectadas = row
    spec = registry.obtener(herramienta)
    if spec is None or spec.handler_deshacer is None:
        raise HTTPException(status_code=500, detail="Herramienta de deshacer no disponible")
    if not filas_afectadas:
        raise HTTPException(status_code=500, detail="Esta acción no tiene snapshot para deshacer")
    # `handler_deshacer` vuelve a leer la fila objetivo bajo esta misma
    # conexión antes de revertirla (mismo patrón TOCTOU que `handler_confirmar`).
    return spec.handler_deshacer(conn, usuario, filas_afectadas[0], payload)
