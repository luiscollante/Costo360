from fastapi import APIRouter, Depends
from backend.db.client import db_conn
from backend.middleware.auth import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/resumen")
def dashboard_resumen(conn=Depends(db_conn), usuario=Depends(get_current_user)):
    """
    Métricas del mes actual + historial 6 meses + top materiales + últimas 5 cotizaciones.
    Operario ve solo sus datos; Admin/Gerente ven todo.
    """
    cur = conn.cursor()
    rol = usuario.get("rol", "Operario")
    uid = usuario["id"]
    solo_propio = rol == "Operario"

    def _q(sql: str, params: tuple = ()):
        cur.execute(sql, params)
        return cur.fetchone()

    def _qa(sql: str, params: tuple = ()):
        cur.execute(sql, params)
        return cur.fetchall()

    uid_filter   = "AND usuario_id = %s" if solo_propio else ""
    uid_param    = (uid,)               if solo_propio else ()
    uid_where    = "WHERE usuario_id = %s" if solo_propio else ""
    uid_wparam   = (uid,)               if solo_propio else ()

    # ── Mes actual ───────────────────────────────────────────────────────────────
    cot_mes = _q(
        f"""SELECT COUNT(*) FROM cotizaciones
        WHERE DATE_TRUNC('month', fecha::date) = DATE_TRUNC('month', CURRENT_DATE)
        {uid_filter}""",
        uid_param,
    )[0]

    fact_mes = _q(
        f"""SELECT COALESCE(SUM(precio), 0) FROM cotizaciones
        WHERE DATE_TRUNC('month', fecha::date) = DATE_TRUNC('month', CURRENT_DATE)
        AND estado = 'Aprobada'
        {uid_filter}""",
        uid_param,
    )[0]

    margen_mes = _q(
        f"""SELECT COALESCE(AVG(margen), 0) FROM cotizaciones
        WHERE DATE_TRUNC('month', fecha::date) = DATE_TRUNC('month', CURRENT_DATE)
        {uid_filter}""",
        uid_param,
    )[0]

    # ── Por estado ───────────────────────────────────────────────────────────────
    rows_estado = _qa(
        f"""SELECT estado, COUNT(*) FROM cotizaciones
        WHERE DATE_TRUNC('month', fecha::date) = DATE_TRUNC('month', CURRENT_DATE)
        {uid_filter}
        GROUP BY estado""",
        uid_param,
    )
    por_estado = {r[0]: r[1] for r in rows_estado}

    # ── Historial mensual 6 meses ─────────────────────────────────────────────
    rows_hist = _qa(
        f"""SELECT TO_CHAR(fecha::date, 'YYYY-MM') AS mes,
               COUNT(*) AS cotizaciones,
               COALESCE(SUM(CASE WHEN estado='Aprobada' THEN precio ELSE 0 END), 0) AS facturado,
               COALESCE(AVG(margen), 0) AS margen_prom
        FROM cotizaciones
        WHERE fecha::date >= (CURRENT_DATE - INTERVAL '6 months')
        {uid_filter}
        GROUP BY mes
        ORDER BY mes""",
        uid_param,
    )
    historial = [
        {
            "mes": r[0],
            "cotizaciones": r[1],
            "facturado": float(r[2]),
            "margen_prom": round(float(r[3]), 1),
        }
        for r in rows_hist
    ]

    # ── Top 5 materiales (90 días) ────────────────────────────────────────────
    rows_mat = _qa(
        f"""SELECT material, COUNT(*) AS cnt, COALESCE(SUM(precio), 0) AS revenue
        FROM cotizaciones
        WHERE fecha::date >= (CURRENT_DATE - INTERVAL '90 days')
        AND material != ''
        {uid_filter}
        GROUP BY material
        ORDER BY revenue DESC
        LIMIT 5""",
        uid_param,
    )
    top_materiales = [
        {"material": r[0], "cotizaciones": r[1], "revenue": float(r[2])}
        for r in rows_mat
    ]

    # ── Últimas 5 cotizaciones ────────────────────────────────────────────────
    rows_ult = _qa(
        f"""SELECT id, numero, fecha, cliente, material, precio, margen, estado
        FROM cotizaciones
        {uid_where}
        ORDER BY id DESC LIMIT 5""",
        uid_wparam,
    )
    ultimas = [
        {
            "id": r[0], "numero": r[1], "fecha": str(r[2]),
            "cliente": r[3] or "—", "material": r[4] or "—",
            "precio": float(r[5]), "margen": round(float(r[6]), 1),
            "estado": r[7],
        }
        for r in rows_ult
    ]

    cur.close()
    return {
        "cotizaciones_mes":  int(cot_mes),
        "facturacion_mes":   float(fact_mes),
        "margen_promedio":   round(float(margen_mes), 1),
        "por_estado":        por_estado,
        "historial_mensual": historial,
        "top_materiales":    top_materiales,
        "ultimas":           ultimas,
    }
