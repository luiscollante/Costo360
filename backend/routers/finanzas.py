import os
import shutil
import uuid
from fastapi import APIRouter, Depends, HTTPException, Header, UploadFile, File
from backend.db.deps import require_admin_or_gerente
from pydantic import BaseModel
from typing import List, Optional
from datetime import date, datetime
# DESCONECTADO en la Fase 2.A (2026-08-27). Este router opera sobre `facturas_compra`,
# una tabla que NO pertenece a Costo360 (sobra de otro proyecto, confirmado por el
# fundador) y que no existe en el esquema multi-tenant. `main.py` ya no lo registra.
# Se conserva el archivo por si sirve de referencia a los agentes de operación; NO
# importa limpio contra el `backend/db/*` de la Fase 2.A. Ver docs/PLAN_FASE_2A.md (R7).
from backend.db.client import db_conn  # noqa: F401  (símbolo eliminado — router inactivo)
from backend.services.etl_service import process_emails, procesar_adjunto, TEMP_DIR
from google import genai

router = APIRouter(prefix="/api/finanzas", tags=["finanzas"])

class FacturaOut(BaseModel):
    id: int
    fecha: date
    mes: str
    proveedor: str
    categoria: str
    descripcion: str
    total: float
    iva: float

@router.get("/facturas", response_model=List[FacturaOut])
def get_facturas(skip: int = 0, limit: int = 100, conn=Depends(db_conn), usuario=Depends(require_admin_or_gerente)):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT id, fecha, mes, proveedor, categoria, descripcion, total, iva
            FROM facturas_compra
            ORDER BY fecha DESC
            OFFSET %s LIMIT %s
        """, (skip, limit))
        rows = cur.fetchall()
        
    return [
        FacturaOut(
            id=row[0], fecha=row[1], mes=row[2], proveedor=row[3],
            categoria=row[4], descripcion=row[5], total=float(row[6]), iva=float(row[7])
        ) for row in rows
    ]

@router.get("/kpis")
def get_kpis(year: Optional[str] = None, month: Optional[str] = None, categoria: Optional[str] = None, conn=Depends(db_conn), usuario=Depends(require_admin_or_gerente)):
    with conn.cursor() as cur:
        filters = []
        params = []
        
        if year and year != "Todos":
            filters.append("EXTRACT(YEAR FROM fecha) = %s")
            params.append(int(year))
            
        if month and month != "Todos":
            filters.append("mes = %s")
            params.append(month.upper())
            
        if categoria and categoria != "Todas":
            filters.append("categoria = %s")
            params.append(categoria)
            
        where_clause = f"WHERE {' AND '.join(filters)}" if filters else ""
        
        # 1. Global KPIs
        cur.execute(f"SELECT COALESCE(SUM(total), 0), COALESCE(SUM(iva), 0), COUNT(id) FROM facturas_compra {where_clause}", tuple(params))
        globales = cur.fetchone()
        total_gastado = float(globales[0])
        total_iva = float(globales[1])
        total_facturas = int(globales[2])
        promedio_por_factura = total_gastado / total_facturas if total_facturas > 0 else 0
        
        # 2. Tendencia mensual
        cur.execute(f"SELECT mes, SUM(total), SUM(subtotal), SUM(iva) FROM facturas_compra {where_clause} GROUP BY mes", tuple(params))
        mensual = cur.fetchall()
        
        # 3. Categorías
        cur.execute(f"SELECT categoria, SUM(total) FROM facturas_compra {where_clause} GROUP BY categoria", tuple(params))
        categorias = cur.fetchall()
        
        # 4. Proveedores
        cur.execute(f"SELECT proveedor, SUM(total) FROM facturas_compra {where_clause} GROUP BY proveedor ORDER BY SUM(total) DESC LIMIT 10", tuple(params))
        proveedores = cur.fetchall()
        
        # Extraer todas las categorías únicas para llenar el select del frontend
        cur.execute("SELECT DISTINCT categoria FROM facturas_compra ORDER BY categoria")
        categorias_unicas = [r[0] for r in cur.fetchall()]
        
    return {
        "kpis_globales": {
            "total_gastado": total_gastado,
            "total_iva_pagado": total_iva,
            "total_facturas": total_facturas,
            "promedio_por_factura": promedio_por_factura
        },
        "tendencia_mensual": [{"mes": r[0], "total": float(r[1]), "subtotal": float(r[2]), "iva": float(r[3])} for r in mensual],
        "distribucion_categorias": [{"categoria": r[0], "total": float(r[1])} for r in categorias],
        "gastos_por_proveedor": [{"proveedor": r[0], "total": float(r[1])} for r in proveedores],
        "categorias_disponibles": categorias_unicas
    }

@router.get("/insights")
def get_ai_insights(year: Optional[str] = None, month: Optional[str] = None, categoria: Optional[str] = None, conn=Depends(db_conn), usuario=Depends(require_admin_or_gerente)):
    kpis = get_kpis(year, month, categoria, conn, usuario)
    api_key = os.getenv("GEMINI_API_KEY")
    if api_key:
        try:
            client = genai.Client(api_key=api_key)
            prompt = f"""
            Eres el CFO (Director Financiero) experto de la empresa Marmoles Collante y Castro.
            Analiza los siguientes datos de gastos y compras y redacta 3 insights o conclusiones ejecutivas,
            indicando si la tendencia es buena o mala, y recomendaciones.
            Datos: {kpis}
            """
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt,
            )
            return {"insights": response.text, "fuente": "Gemini AI"}
        except Exception as e:
            print(f"Error AI: {e}")
            pass
            
    insights = "Resumen de Compras: "
    if kpis['tendencia_mensual']:
        mes_mayor = max(kpis['tendencia_mensual'], key=lambda x: x['total'])
        insights += f"El mes con mayores gastos fue {mes_mayor['mes']} con un total de ${mes_mayor['total']:,.2f}. "
    if kpis['distribucion_categorias']:
        cat_mayor = max(kpis['distribucion_categorias'], key=lambda x: x['total'])
        insights += f"La categoría que representa el mayor gasto de la empresa es {cat_mayor['categoria']}. "
        
    insights += "Se recomienda optimizar proveedores en la categoría principal para mejorar los márgenes de utilidad bruta."
    
    return {"insights": insights, "fuente": "Algoritmo Estadístico (No IA)"}

@router.get("/cron/etl")
def run_etl_cron(authorization: str = Header(None), conn=Depends(db_conn)):
    cron_secret = os.getenv("CRON_SECRET")
    if not cron_secret:
        raise HTTPException(status_code=500, detail="CRON_SECRET no configurado — el endpoint queda deshabilitado por seguridad")
    if not authorization or authorization != f"Bearer {cron_secret}":
        raise HTTPException(status_code=401, detail="Unauthorized CRON request")

    return process_emails(conn)

@router.post("/etl/run")
def run_etl_manual(usuario=Depends(require_admin_or_gerente), conn=Depends(db_conn)):
    try:
        return process_emails(conn)
    except Exception as e:
        return {"status": "error", "message": str(e), "facturas_guardadas": 0}

@router.post("/etl/adjunto")
async def recibir_adjunto_n8n(
    file: UploadFile = File(...),
    x_n8n_secret: str = Header(None, alias="X-N8N-Secret"),
    conn=Depends(db_conn),
):
    """Recibe un adjunto (XML, ZIP o PDF) ya descargado por el agente de n8n que
    vigila los correos, y lo procesa con la misma lógica anti-duplicados y de
    extracción que usa la sincronización IMAP propia."""
    secreto = os.getenv("N8N_SHARED_SECRET")
    if not secreto:
        raise HTTPException(status_code=500, detail="N8N_SHARED_SECRET no configurado — el endpoint queda deshabilitado por seguridad")
    if not x_n8n_secret or x_n8n_secret != secreto:
        raise HTTPException(status_code=401, detail="Unauthorized")

    contenido = await file.read()
    if not contenido:
        raise HTTPException(status_code=400, detail="Archivo vacío")

    resultado = {"guardadas": 0, "duplicadas": 0, "errores": 0}
    temp_dir = os.path.join(TEMP_DIR, f"n8n_{uuid.uuid4().hex}")
    try:
        hubo_error = procesar_adjunto(conn, resultado, file.filename or "adjunto", contenido, temp_dir)
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)

    status = "error" if hubo_error and resultado["guardadas"] == 0 and resultado["duplicadas"] == 0 else "success"
    return {"status": status, **resultado}
