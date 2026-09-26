"""
Métricas del negocio para el agente de operaciones (Ciclo 2, 2026-09-26).

Regla central: el modelo de IA NUNCA calcula. Toda suma, reparto, porcentaje
y explicación se arma aquí, con consultas fijas (sin SQL del modelo) dentro
de una transacción READ ONLY con timeout. Cada respuesta lleva el mismo
sobre: fuente, corte (hora Colombia), datos, no_disponible, advertencias y,
cuando aplica, una `explicacion` ya redactada que el agente debe citar
literal (pedido del fundador: el costo por cliente siempre dice por qué).

Criterios confirmados por el fundador (2026-09-26):
- Taller activo = empresa activa, no excluida, con suscripción 'activa' Y con
  uso en el mes (cotización creada o consumo de Cost/render).
- Costos fijos repartidos entre los talleres activos EN PROPORCIÓN AL PRECIO
  de su plan.
- Renders cuentan como costo variable del taller que los genera.
- Precios sin IVA; el único cobro adicional es la comisión de Wompi.
- Cuentas internas (metricas.empresas_excluidas) y pagos de sandbox
  (metricas.pagos_excluidos) nunca cuentan.
"""
from datetime import datetime
from zoneinfo import ZoneInfo

from backend.services.consumo_service import INICIO_MES_SQL, TRM_COP_USD

_BOGOTA = ZoneInfo("America/Bogota")
_HOY_SQL = "(now() at time zone 'America/Bogota')::date"
_EXCLUIDA = "NOT EXISTS (SELECT 1 FROM metricas.empresas_excluidas x WHERE x.empresa_id = e.id)"
_PAGO_VALIDO = "NOT EXISTS (SELECT 1 FROM metricas.pagos_excluidos px WHERE px.transaction_id = p.transaction_id)"
_RENDER_OK = "estado = 'completado'"

ADVERTENCIAS_FIJAS = [
    "El cobro mensual automático puede estar apagado (interruptor cobros_recurrentes_activos): "
    "'ingreso contratado' puede no coincidir con lo cobrado.",
    "La voz (ElevenLabs) no tiene costo en dólares registrado: no está incluida en el costo de IA.",
    "El ingreso cobrado es el valor bruto del plan: aún no descuenta la comisión de Wompi.",
]


def preparar_solo_lectura(conn) -> None:
    """Transacción de solo lectura con timeout, verificada (no se confía en
    que el SET haya tenido efecto)."""
    cur = conn.cursor()
    cur.execute("SET TRANSACTION READ ONLY")
    cur.execute("SET LOCAL statement_timeout = '3s'")
    cur.execute("SELECT current_setting('transaction_read_only')")
    if cur.fetchone()[0] != "on":
        raise RuntimeError("La transacción de métricas no quedó en solo lectura")
    cur.close()


def _corte() -> str:
    return datetime.now(_BOGOTA).strftime("%Y-%m-%d %H:%M (hora Colombia)")


def _pesos(v) -> str:
    n = round(float(v or 0))
    return ("-$" if n < 0 else "$") + f"{abs(n):,}".replace(",", ".")


def _sobre(fuente: str, datos: dict, explicacion: str | None = None,
           no_disponible: list | None = None, advertencias: list | None = None) -> dict:
    return {"ok": True, "fuente": fuente, "corte": _corte(), "datos": datos,
            "explicacion": explicacion, "no_disponible": no_disponible or [],
            "advertencias": (advertencias or []) + ADVERTENCIAS_FIJAS}


def _q(conn, sql: str, params=None) -> list[tuple]:
    cur = conn.cursor()
    cur.execute(sql, params)
    filas = cur.fetchall()
    cur.close()
    return filas


# ── Piezas base ─────────────────────────────────────────────────────────────

def _fijos(conn) -> tuple[float, list[dict]]:
    filas = _q(conn,
        "SELECT concepto, proveedor, moneda, monto FROM metricas.costos_fijos "
        f"WHERE vigente_desde <= {_HOY_SQL} AND (vigente_hasta IS NULL OR vigente_hasta >= {_HOY_SQL}) "
        "ORDER BY id")
    detalle, total = [], 0.0
    for concepto, proveedor, moneda, monto in filas:
        cop = float(monto) * (TRM_COP_USD if moneda == "USD" else 1)
        total += cop
        detalle.append({"proveedor": proveedor, "concepto": concepto, "moneda": moneda,
                        "monto": float(monto), "cop": round(cop)})
    return round(total), detalle


def _talleres(conn) -> list[dict]:
    """Una fila por taller no excluido con su uso y costo variable del mes."""
    filas = _q(conn, f"""
        WITH cot AS (SELECT empresa_id, count(*) n FROM cotizaciones
                     WHERE creado_en >= {INICIO_MES_SQL} GROUP BY empresa_id),
             ia AS (SELECT empresa_id, sum(costo_usd) usd, count(*) n FROM consumo_api
                    WHERE creado_en >= {INICIO_MES_SQL} GROUP BY empresa_id),
             rend AS (SELECT empresa_id, sum(costo_usd) usd, count(*) n FROM render_cocina
                      WHERE creado_en >= {INICIO_MES_SQL} AND {_RENDER_OK} GROUP BY empresa_id)
        SELECT e.id, left(regexp_replace(e.nombre, '[\\r\\n]+', ' ', 'g'), 80), e.plan_codigo, pl.precio_mensual_cop,
               e.activa, s.estado, coalesce(cot.n, 0), coalesce(ia.usd, 0), coalesce(ia.n, 0),
               coalesce(rend.usd, 0), coalesce(rend.n, 0), e.creado_en >= {INICIO_MES_SQL}
        FROM empresas e
        LEFT JOIN planes pl ON pl.codigo = e.plan_codigo
        LEFT JOIN suscripciones_wompi s ON s.empresa_id = e.id
        LEFT JOIN cot ON cot.empresa_id = e.id
        LEFT JOIN ia ON ia.empresa_id = e.id
        LEFT JOIN rend ON rend.empresa_id = e.id
        WHERE {_EXCLUIDA}
        ORDER BY e.nombre""")
    out = []
    for (eid, nombre, plan, precio, activa, sus, cots, ia_usd, ia_n, r_usd, r_n, nuevo) in filas:
        pagando = bool(activa) and sus == "activa"
        con_uso = cots > 0 or ia_n > 0 or r_n > 0
        out.append({
            "empresa_id": str(eid), "nombre": nombre, "plan": plan or "sin plan", "precio_plan_cop": round(float(precio or 0)),
            "activa": bool(activa), "suscripcion": sus or "sin suscripción",
            "pagando": pagando, "con_uso_mes": con_uso, "taller_activo": pagando and con_uso,
            "cotizaciones_mes": int(cots), "usos_cost_mes": int(ia_n), "renders_mes": int(r_n),
            "costo_ia_cop_mes": round((float(ia_usd) + float(r_usd)) * TRM_COP_USD),
            "nuevo_este_mes": bool(nuevo),
        })
    return out


def _reparto(talleres: list[dict], fijos: float) -> dict[str, float]:
    """Fijo asignado a cada taller activo, proporcional al precio de su plan."""
    activos = [t for t in talleres if t["taller_activo"]]
    if not activos:
        return {}
    peso = sum(t["precio_plan_cop"] for t in activos)
    if peso <= 0:  # sin precios válidos: reparto igual, nunca se pierde un taller activo
        return {t["empresa_id"]: fijos / len(activos) for t in activos}
    return {t["empresa_id"]: fijos * t["precio_plan_cop"] / peso for t in activos}


def _explicar_reparto(n_activos: int, fijos: float) -> str:
    if n_activos == 0:
        return (f"Hoy no hay ningún taller activo (que pague y use la app este mes), así que tus {_pesos(fijos)} "
                "de costos fijos no se pueden repartir: el costo por cliente no existe todavía. "
                f"Con el primer taller activo, ese taller cargaría los {_pesos(fijos)} completos, y la cifra "
                "irá bajando a medida que entren más talleres.")
    base = (f"Se calculó con {n_activos} taller{'es' if n_activos != 1 else ''} activo{'s' if n_activos != 1 else ''} "
            f"(pagan y usan la app este mes). Tus costos fijos de {_pesos(fijos)} al mes se reparten entre ellos "
            "en proporción al precio de su plan.")
    if n_activos < 10:
        base += (f" Con tan pocos talleres cada uno carga una parte grande del fijo; por eso la cifra se ve alta "
                 f"y no es un error: hoy cada taller carga en promedio {_pesos(fijos / n_activos)} de fijo; "
                 f"con 10 talleres activos serían unos {_pesos(fijos / 10)}.")
    return base


# ── Endpoints ───────────────────────────────────────────────────────────────

def resumen(conn) -> dict:
    fijos, _ = _fijos(conn)
    talleres = _talleres(conn)
    cobrado = _q(conn, f"""
        SELECT count(*), coalesce(sum(p.monto_cop), 0) FROM pagos_procesados p
        JOIN solicitudes_pago sp ON sp.reference = p.reference
        JOIN empresas e ON e.id = sp.empresa_id
        WHERE p.estado_wompi = 'APPROVED' AND sp.estado = 'pagado'
          AND p.procesado_en >= {INICIO_MES_SQL} AND {_PAGO_VALIDO} AND {_EXCLUIDA}""")[0]
    mensual = _q(conn, f"""
        SELECT count(*), coalesce(sum(c.monto_cop), 0) FROM cobros_recurrentes c JOIN empresas e ON e.id = c.empresa_id
        WHERE c.estado = 'aprobado' AND c.ambiente = 'produccion' AND c.resuelto_en >= {INICIO_MES_SQL} AND {_EXCLUIDA}""")[0]
    cobrado = (int(cobrado[0]) + int(mensual[0]), float(cobrado[1]) + float(mensual[1]))
    bajas = _q(conn, f"""
        SELECT count(*) FROM eventos_empresa ev JOIN empresas e ON e.id = ev.empresa_id
        WHERE ev.creado_en >= {INICIO_MES_SQL} AND {_EXCLUIDA}
          AND (ev.tipo = 'desactivada' OR (ev.tipo = 'suscripcion_estado' AND ev.detalle = 'cancelada'))""")[0][0]
    activos = [t for t in talleres if t["taller_activo"]]
    contratado = sum(t["precio_plan_cop"] for t in talleres if t["pagando"])
    costo_ia = sum(t["costo_ia_cop_mes"] for t in talleres)
    datos = {
        "talleres_registrados": len(talleres),
        "talleres_activos": len(activos),
        "talleres_pagando_sin_uso": sum(1 for t in talleres if t["pagando"] and not t["con_uso_mes"]),
        "talleres_nuevos_mes": sum(1 for t in talleres if t["nuevo_este_mes"]),
        "talleres_cancelados_mes": int(bajas),
        "ingreso_contratado_mensual_cop": contratado,
        "ingreso_cobrado_mes_cop": round(float(cobrado[1])),
        "pagos_cobrados_mes": int(cobrado[0]),
        "costo_ia_mes_cop": costo_ia,
        "costos_fijos_mes_cop": fijos,
        "resultado_mes_cop": round(float(cobrado[1])) - fijos - costo_ia,
        "tasa_cop_usd": TRM_COP_USD,
    }
    expl = (f"Resultado del mes = cobrado {_pesos(datos['ingreso_cobrado_mes_cop'])} − fijos {_pesos(fijos)} "
            f"− IA {_pesos(costo_ia)} = {_pesos(datos['resultado_mes_cop'])}. "
            f"Talleres activos: {len(activos)} de {len(talleres)} registrados (sin contar cuentas internas).")
    return _sobre("backend: empresas, suscripciones_wompi, pagos_procesados, consumo_api, render_cocina, "
                  "metricas.costos_fijos", datos, expl)


def costo_por_cliente(conn, empresa: str | None = None) -> dict:
    fijos, detalle = _fijos(conn)
    talleres = _talleres(conn)
    reparto = _reparto(talleres, fijos)
    activos = [t for t in talleres if t["taller_activo"]]
    expl = _explicar_reparto(len(activos), fijos)
    fuente = "backend: metricas.costos_fijos + uso del mes (cotizaciones, consumo_api, render_cocina)"
    if empresa:
        clave = empresa.strip().lower()
        coincidencias = [t for t in talleres if t["empresa_id"] == clave or t["nombre"].lower() == clave]
        if len(coincidencias) > 1:
            return _sobre(fuente, {"empresa": empresa, "coincidencias": len(coincidencias)},
                          "Hay más de un taller con ese nombre; pide el costo por su identificador.",
                          no_disponible=["costo_total_cop"])
        t = coincidencias[0] if coincidencias else None
        if t is None:
            return _sobre(fuente, {"empresa": empresa}, "No encontré ese taller entre los registrados.",
                          no_disponible=["costo_total_cop"])
        if t["empresa_id"] not in reparto:
            motivo = ("no paga una suscripción activa" if not t["pagando"] else "no ha usado la app este mes")
            return _sobre(fuente, {"taller": t["nombre"], "plan": t["plan"],
                                   "costo_ia_cop_mes": t["costo_ia_cop_mes"], "costos_fijos_mes_cop": fijos},
                          f"{t['nombre']} no cuenta como taller activo porque {motivo}, así que no se le asigna "
                          f"parte de los costos fijos. Su costo variable de IA este mes es {_pesos(t['costo_ia_cop_mes'])}.",
                          no_disponible=["fijo_asignado_cop"])
        fijo = round(reparto[t["empresa_id"]])
        datos = {"taller": t["nombre"], "plan": t["plan"], "precio_plan_cop": t["precio_plan_cop"],
                 "fijo_asignado_cop": fijo, "costo_ia_cop_mes": t["costo_ia_cop_mes"],
                 "costo_total_cop": fijo + t["costo_ia_cop_mes"],
                 "ganancia_cop": t["precio_plan_cop"] - fijo - t["costo_ia_cop_mes"],
                 "talleres_activos_usados": len(activos), "costos_fijos_mes_cop": fijos}
        expl = (f"{t['nombre']} ({t['plan']}) te cuesta {_pesos(datos['costo_total_cop'])} este mes: "
                f"{_pesos(fijo)} de su parte de los costos fijos + {_pesos(t['costo_ia_cop_mes'])} de IA medida. " + expl)
        return _sobre(fuente, datos, expl)
    if not activos:
        return _sobre(fuente, {"talleres_activos_usados": 0, "costos_fijos_mes_cop": fijos,
                               "detalle_fijos": detalle}, expl, no_disponible=["costo_promedio_por_cliente_cop"])
    total = sum(reparto.values()) + sum(t["costo_ia_cop_mes"] for t in activos)
    datos = {"costo_promedio_por_cliente_cop": round(total / len(activos)),
             "fijo_promedio_por_cliente_cop": round(fijos / len(activos)),
             "ia_promedio_por_cliente_cop": round(sum(t["costo_ia_cop_mes"] for t in activos) / len(activos)),
             "talleres_activos_usados": len(activos), "costos_fijos_mes_cop": fijos, "detalle_fijos": detalle}
    return _sobre(fuente, datos, f"En promedio atender a 1 cliente te cuesta {_pesos(datos['costo_promedio_por_cliente_cop'])} "
                                 "al mes. " + expl)


def margen_por_plan(conn) -> dict:
    fijos, _ = _fijos(conn)
    talleres = _talleres(conn)
    reparto = _reparto(talleres, fijos)
    planes = _q(conn, "SELECT codigo, nombre, precio_mensual_cop FROM planes ORDER BY precio_mensual_cop")
    filas, sin_datos = [], []
    for codigo, nombre, precio in planes:
        del_plan = [t for t in talleres if t["plan"] == codigo and t["taller_activo"]]
        if not del_plan:
            sin_datos.append(nombre)
            filas.append({"plan": nombre, "precio_cop": round(float(precio)), "talleres_activos": 0,
                          "margen_por_taller_cop": None})
            continue
        fijo = sum(reparto[t["empresa_id"]] for t in del_plan) / len(del_plan)
        ia = sum(t["costo_ia_cop_mes"] for t in del_plan) / len(del_plan)
        margen = float(precio) - fijo - ia
        filas.append({"plan": nombre, "precio_cop": round(float(precio)), "talleres_activos": len(del_plan),
                      "fijo_por_taller_cop": round(fijo), "ia_promedio_cop": round(ia),
                      "margen_por_taller_cop": round(margen),
                      "margen_pct": round(margen / float(precio) * 100, 1) if float(precio) > 0 else None})
    n = sum(1 for t in talleres if t["taller_activo"])
    expl = _explicar_reparto(n, fijos)
    if sin_datos:
        expl += f" Sin talleres activos (margen no disponible): {', '.join(sin_datos)}."
    return _sobre("backend: planes + reparto de metricas.costos_fijos + uso del mes", {"planes": filas}, expl,
                  no_disponible=[f"margen {p}" for p in sin_datos])


def ingresos(conn, meses: int) -> dict:
    filas = _q(conn, f"""
        SELECT to_char(date_trunc('month', p.procesado_en at time zone 'America/Bogota'), 'YYYY-MM') mes,
               count(*), coalesce(sum(p.monto_cop), 0)
        FROM pagos_procesados p
        JOIN solicitudes_pago sp ON sp.reference = p.reference
        JOIN empresas e ON e.id = sp.empresa_id
        WHERE p.estado_wompi = 'APPROVED' AND sp.estado = 'pagado' AND {_PAGO_VALIDO} AND {_EXCLUIDA}
          AND p.procesado_en >= ({INICIO_MES_SQL} - make_interval(months => %s))
        GROUP BY 1
        UNION ALL
        SELECT to_char(date_trunc('month', c.resuelto_en at time zone 'America/Bogota'), 'YYYY-MM'),
               count(*), coalesce(sum(c.monto_cop), 0)
        FROM cobros_recurrentes c JOIN empresas e ON e.id = c.empresa_id
        WHERE c.estado = 'aprobado' AND c.ambiente = 'produccion' AND {_EXCLUIDA}
          AND c.resuelto_en >= ({INICIO_MES_SQL} - make_interval(months => %s))
        GROUP BY 1""", (meses - 1, meses - 1))
    acumulado: dict = {}
    for m, n, v in filas:
        a = acumulado.setdefault(m, [0, 0.0])
        a[0] += int(n)
        a[1] += float(v)
    filas = [(m, n, v) for m, (n, v) in sorted(acumulado.items())]
    datos = {"meses": [{"mes": m, "pagos": int(n), "cobrado_cop": round(float(v))} for m, n, v in filas],
             "total_cobrado_cop": round(sum(float(v) for _, _, v in filas))}
    expl = None if filas else ("No hay cobros reales en el periodo: los pagos registrados hasta ahora fueron "
                               "pruebas del sandbox de Wompi y están excluidos.")
    return _sobre("backend: pagos_procesados APPROVED + cobros_recurrentes aprobados (sin sandbox ni cuentas internas)", datos, expl)


def talleres_uso(conn, orden: str) -> dict:
    talleres = _talleres(conn)
    clave = {"cotizaciones": "cotizaciones_mes", "costo_ia": "costo_ia_cop_mes"}.get(orden, "cotizaciones_mes")
    talleres.sort(key=lambda t: t[clave], reverse=True)
    visibles = [{k: v for k, v in t.items() if k != "empresa_id"} for t in talleres[:50]]
    return _sobre("backend: empresas + uso del mes", {"total": len(talleres), "talleres": visibles})


def movimientos(conn, meses: int) -> dict:
    filas = _q(conn, f"""
        SELECT to_char(date_trunc('month', ev.creado_en at time zone 'America/Bogota'), 'YYYY-MM'), ev.tipo,
               coalesce(ev.detalle, ''), count(*)
        FROM eventos_empresa ev JOIN empresas e ON e.id = ev.empresa_id
        WHERE {_EXCLUIDA} AND ev.creado_en >= ({INICIO_MES_SQL} - make_interval(months => %s))
          AND ev.tipo NOT IN ('pago_aprobado', 'pago_rechazado')
        GROUP BY 1, 2, 3 ORDER BY 1, 2""", (meses - 1,))
    desde = _q(conn, "SELECT min(creado_en)::date FROM eventos_empresa WHERE origen = 'trigger'")[0][0]
    datos = {"movimientos": [{"mes": m, "tipo": t, "detalle": d, "cantidad": int(n)} for m, t, d, n in filas],
             "historial_desde": str(desde) if desde else "2026-09-26"}
    return _sobre("backend: eventos_empresa", datos,
                  f"El registro de cancelaciones y cambios existe desde {datos['historial_desde']}; "
                  "lo anterior no se conoce.")


def salud(conn) -> dict:
    t0 = datetime.now()
    _q(conn, "SELECT 1")
    latencia = round((datetime.now() - t0).total_seconds() * 1000)
    ultimo = _q(conn, "SELECT max(creado_en) FROM consumo_api")[0][0]
    vencidos = _q(conn, f"""SELECT count(*) FROM suscripciones_wompi s JOIN empresas e ON e.id = s.empresa_id
                           WHERE s.estado IN ('activa', 'en_mora') AND s.proxima_fecha_cobro < {_HOY_SQL} AND {_EXCLUIDA}""")[0][0]
    alertas = _q(conn, f"SELECT count(*) FROM alerta_consumo_enviada WHERE creado_en >= {INICIO_MES_SQL}")[0][0]
    datos = {"base_datos_ms": latencia,
             "ultimo_uso_ia": ultimo.astimezone(_BOGOTA).strftime("%Y-%m-%d %H:%M") if ultimo else None,
             "suscripciones_con_cobro_vencido": int(vencidos), "alertas_consumo_mes": int(alertas)}
    return _sobre("backend: estado en vivo", datos)
