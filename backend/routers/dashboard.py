from fastapi import APIRouter, Depends, Query

from backend.db.client import db_rls
from backend.db.deps import require_dashboard

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

_GRANULARIDADES = {
    # trunc: función de truncado de fecha · formato: máscara TO_CHAR · ventana: intervalo hacia atrás
    "diaria":  {"trunc": "day",   "formato": "YYYY-MM-DD", "ventana": "30 days"},
    "semanal": {"trunc": "week",  "formato": "YYYY-\"S\"IW", "ventana": "12 weeks"},
    "mensual": {"trunc": "month", "formato": "YYYY-MM",    "ventana": "6 months"},
}


@router.get("/resumen")
def dashboard_resumen(
    granularidad: str = Query(default="mensual"),
    conn=Depends(db_rls),
    usuario=Depends(require_dashboard),
):
    """
    Métricas del mes actual + historial + top materiales + últimas 5 cotizaciones,
    para TODA la empresa. Solo roles con `puede_ver_dashboard` (admin/gerencia) —
    Regla 6. El aislamiento por empresa lo aplica RLS (`db_rls`).
    """
    cur = conn.cursor()

    def _q(sql: str, params: tuple = ()):
        cur.execute(sql, params)
        return cur.fetchone()

    def _qa(sql: str, params: tuple = ()):
        cur.execute(sql, params)
        return cur.fetchall()

    # ── Mes actual ───────────────────────────────────────────────────────────────
    cot_mes = _q(
        """SELECT COUNT(*) FROM cotizaciones
        WHERE DATE_TRUNC('month', fecha::date) = DATE_TRUNC('month', CURRENT_DATE)"""
    )[0]

    fact_mes = _q(
        """SELECT COALESCE(SUM(precio), 0) FROM cotizaciones
        WHERE DATE_TRUNC('month', fecha::date) = DATE_TRUNC('month', CURRENT_DATE)
        AND estado = 'Aprobada'"""
    )[0]

    margen_mes = _q(
        """SELECT COALESCE(AVG(margen), 0) FROM cotizaciones
        WHERE DATE_TRUNC('month', fecha::date) = DATE_TRUNC('month', CURRENT_DATE)"""
    )[0]

    # ── Por estado ───────────────────────────────────────────────────────────────
    rows_estado = _qa(
        """SELECT estado, COUNT(*) FROM cotizaciones
        WHERE DATE_TRUNC('month', fecha::date) = DATE_TRUNC('month', CURRENT_DATE)
        GROUP BY estado"""
    )
    por_estado = {r[0]: r[1] for r in rows_estado}

    # ── Historial por periodo (día/semana/mes, según granularidad) ────────────
    gran = _GRANULARIDADES.get(granularidad, _GRANULARIDADES["mensual"])
    rows_hist = _qa(
        f"""SELECT TO_CHAR(DATE_TRUNC('{gran["trunc"]}', fecha::date), '{gran["formato"]}') AS periodo,
               COUNT(*) AS cotizaciones,
               COALESCE(SUM(CASE WHEN estado='Aprobada' THEN precio ELSE 0 END), 0) AS facturado,
               COALESCE(AVG(margen), 0) AS margen_prom
        FROM cotizaciones
        WHERE fecha::date >= (CURRENT_DATE - INTERVAL '{gran["ventana"]}')
        GROUP BY periodo
        ORDER BY periodo"""
    )
    historial = [
        {
            "periodo": r[0],
            "cotizaciones": r[1],
            "facturado": float(r[2]),
            "margen_prom": round(float(r[3]), 1),
        }
        for r in rows_hist
    ]

    # ── Top 5 materiales (90 días) ────────────────────────────────────────────
    rows_mat = _qa(
        """SELECT material, COUNT(*) AS cnt, COALESCE(SUM(precio), 0) AS revenue
        FROM cotizaciones
        WHERE fecha::date >= (CURRENT_DATE - INTERVAL '90 days')
        AND material != ''
        GROUP BY material
        ORDER BY revenue DESC
        LIMIT 5"""
    )
    top_materiales = [
        {"material": r[0], "cotizaciones": r[1], "revenue": float(r[2])}
        for r in rows_mat
    ]

    # ── Últimas 5 cotizaciones ────────────────────────────────────────────────
    rows_ult = _qa(
        """SELECT id, numero, fecha, cliente, material, precio, margen, estado
        FROM cotizaciones
        ORDER BY id DESC LIMIT 5"""
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
        "granularidad":      granularidad if granularidad in _GRANULARIDADES else "mensual",
        "historial":         historial,
        "top_materiales":    top_materiales,
        "ultimas":           ultimas,
    }
