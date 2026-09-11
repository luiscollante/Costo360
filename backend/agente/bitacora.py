"""
Bóveda del Agente de IA — Objetivo 5, Ciclo 3 (rediseñado tras la revisión en
vivo del fundador: ya NO es una pantalla de usuario, es memoria interna que
Cost consulta bajo demanda en la conversación, nunca inyectada de forma
automática en cada mensaje — así el costo de la API depende de cuántas veces
se pregunta, no de cuántos días se retiene).

`registrar_ejecucion()` se llama desde dos lugares, siempre con la MISMA
conexión de la transacción que hizo la escritura real (nunca en un
`commit()` aparte):
  1. `confirmations.py::confirmar_propuesta`, tras invocar `handler_confirmar`.
  2. Los 3 handlers de escritura directa que ya existían antes de este ciclo
     (`proyectos_crear_tarea`, la rama de alta de `catalogo_crear_material`,
     la rama no-Aprobada de `cotizacion_cambiar_estado`), justo antes de
     retornar — todos con `es_deshacible=False` (son altas o transiciones sin
     snapshot "antes", nunca ediciones de un campo existente).

`deshacer_accion()` ya NO es alcanzable por un endpoint HTTP directo — solo
la invoca `_confirmar_deshacer` en `agente/tools/bitacora.py`, tras la MISMA
confirmación de dos fases que cualquier otra escritura sensible del sistema
(auditoría de este rediseño: exponerlo como botón sin que el modelo esté en
el loop de decisión era, de hecho, MENOS estricto que esto).
"""
from fastapi import HTTPException
from psycopg2.extras import Json

from backend.agente import registry

# Retención por plan (auditoría de este ciclo): un plan_codigo desconocido
# (dato corrupto, o un plan nuevo agregado después sin actualizar este mapa)
# cae al valor MÁS conservador — nunca "para siempre" en silencio, ni 0 días
# por error de programación (borraría todo). Se loguea para que se note.
# Públicas a propósito: `routers/agente_cron.py` las reusa para el barrido
# de limpieza — un solo lugar con el mapa, nunca una copia separada en SQL
# que pudiera desincronizarse de este criterio.
RETENCION_DIAS = {"starter": 1, "pro": 30, "enterprise": 90}
RETENCION_DEFAULT_DIAS = 1

# Tope duro de filas por consulta — el modelo nunca recibe el historial
# completo, solo un resumen acotado. Es este tope, no el plazo de
# retención, el que controla el costo real de la API (auditoría de este
# ciclo: con consulta bajo demanda, más días guardados no implica más
# tokens gastados salvo que también se devolvieran más filas).
_LIMITE_MAXIMO_FILAS = 15


def dias_retencion(plan_codigo: str) -> int:
    dias = RETENCION_DIAS.get(plan_codigo)
    if dias is not None:
        return dias
    print(
        f"[bitacora] ADVERTENCIA: plan_codigo desconocido '{plan_codigo}' — "
        f"usando la retención más conservadora ({RETENCION_DEFAULT_DIAS} día) "
        "en vez de fallar o de conservar indefinidamente.",
        flush=True,
    )
    return RETENCION_DEFAULT_DIAS


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


def consultar(conn, usuario: dict, dias_atras: int, herramienta: str | None,
              limite: int) -> dict:
    """
    Bajo demanda, invocada SOLO por la tool `agente_bitacora_consultar` — el
    modelo la llama cuando el usuario pregunta por historial o antes de
    intentar deshacer algo, nunca se precarga en el contexto de cada turno.

    Dos topes duros aparte de RLS (defensa en profundidad, auditoría de este
    ciclo): `usuario_id = %s` explícito (no confiar solo en la policy), y
    `creado_en > ahora - retención del plan` — Cost NUNCA ve ni usa una
    acción fuera del plazo prometido al taller, sin importar si el barrido
    diario de limpieza ya la borró físicamente o todavía no.
    """
    plan = usuario.get("plan_codigo") or "starter"
    tope_dias = dias_retencion(plan)
    dias_atras = max(1, min(dias_atras, tope_dias))
    limite = max(1, min(limite, _LIMITE_MAXIMO_FILAS))

    filtro_herramienta = ""
    params: list = [usuario["empresa_id"], usuario["id"], dias_atras]
    if herramienta is not None:
        # El argumento de una tool-call es tan hostil como un input de
        # usuario — nunca se interpola en el SQL, y se valida contra el
        # registro real de tools antes de usarse como filtro.
        if registry.obtener(herramienta) is None:
            return {"error": f"'{herramienta}' no es el nombre de una herramienta real"}
        filtro_herramienta = "and herramienta = %s"
        params.append(herramienta)
    params.append(limite)

    cur = conn.cursor()
    cur.execute(
        "select id, herramienta, filas_afectadas, es_deshacible, creado_en, deshecha_en "
        "from agente_historial_acciones "
        "where empresa_id = %s and usuario_id = %s "
        "and creado_en > now() - make_interval(days => %s) "
        f"{filtro_herramienta} "
        "order by creado_en desc limit %s",
        params,
    )
    filas = cur.fetchall()
    cur.close()
    return {
        "acciones": [
            {
                "historial_id": str(r[0]), "herramienta": r[1],
                "resumen": (r[2][0] if r[2] else {}),
                "es_deshacible": r[3] and r[5] is None,
                "creado_en": r[4].isoformat(),
                "deshecha_en": r[5].isoformat() if r[5] else None,
            }
            for r in filas
        ],
        "retencion_dias_del_plan": tope_dias,
    }


def deshacer_accion(conn, usuario: dict, historial_id: str) -> dict:
    """
    UPDATE atómico condicionado a `deshecha_en IS NULL AND es_deshacible` con
    RETURNING — mismo patrón que `confirmations.confirmar_propuesta`: un
    doble clic (o una doble confirmación) nunca deshace dos veces, la
    segunda petición ve 0 filas y responde 409.
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


def obtener_fila(conn, usuario: dict, historial_id: str) -> dict | None:
    """Lectura puntual para `_preparar_deshacer` — arma la tarjeta de
    confirmación ANTES de intentar el UPDATE atómico de `deshacer_accion`."""
    cur = conn.cursor()
    cur.execute(
        "select herramienta, filas_afectadas, es_deshacible, deshecha_en, creado_en "
        "from agente_historial_acciones where id = %s and usuario_id = %s",
        (historial_id, usuario["id"]),
    )
    row = cur.fetchone()
    cur.close()
    if row is None:
        return None
    return {
        "herramienta": row[0], "filas_afectadas": row[1], "es_deshacible": row[2],
        "deshecha_en": row[3], "creado_en": row[4],
    }
