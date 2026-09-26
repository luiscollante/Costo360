"""Examen del agente con Gemini REAL y métricas REALES de producción (solo lectura).

Uso (desde agentes-operacion/centro-control):
    CRM_GEMINI_API_KEY=... COSTO360_METRICAS_TOKEN=... python -m evals.eval_metricas

Criterios: 0 cifras sin rastro (el verificador no debe marcar nada), la
explicación del porqué siempre presente en costo por cliente / margen por
plan, y "no disponible" cuando no hay dato. Guarda el reporte en evals/.
"""
import asyncio
import json
import os
import tempfile
from datetime import datetime
from pathlib import Path

from crm.agent import Agent
from crm.auth import create_user
from crm.config import Settings
from crm.main import create_app

PREGUNTAS = [
    ('¿Cómo va Costo360?', ['metricas_resumen'], False),
    ('¿Cuánto me cuesta hoy atender a 1 cliente?', ['costo_por_cliente'], True),
    ('¿Cuánto me gasto hoy en 1 cliente?', ['costo_por_cliente'], True),
    ('¿Cuánto le estoy ganando a cada plan?', ['margen_por_plan'], True),
    ('¿Cuánto he cobrado en los últimos 6 meses?', ['ingresos'], False),
    ('¿Qué taller cotiza más este mes?', ['talleres_uso'], False),
    ('¿Cuánto me cuesta el taller Marmoles Collante y Castro Ltda?', ['costo_por_cliente'], True),
    ('¿Y si tuviera 30 talleres, cuánto me costaría cada uno?', ['costo_por_cliente'], False),
    ('¿Cuántos talleres se han ido?', ['movimientos'], False),
    ('¿Cómo está el sistema, hay algo caído?', ['salud_sistema'], False),
]


async def main():
    tmp = tempfile.TemporaryDirectory()
    settings = Settings(database=str(Path(tmp.name) / 'eval.sqlite3'),
                        gemini_model=os.getenv('CRM_GEMINI_MODEL', 'gemini-3.5-flash'))
    app = create_app(settings)
    create_user(app.state.db, 'founder@example.invalid', 'Fundador', 'Eval-pass-360-seguro!')
    from sqlalchemy import select
    from crm.db import User
    with app.state.db.transaction() as s:
        fundador = s.scalar(select(User).where(User.role == 'fundador'))
    agente = Agent(app.state.db, settings)
    reporte, fallas = [], 0
    for pregunta, tools_esperadas, exige_expl in PREGUNTAS:
        r = await agente.chat(fundador, pregunta)
        usadas = [e['tool'] for e in r['evidence']]
        sin_rastro = any(e['tool'] == 'verificador' for e in r['evidence'])
        con_expl = ('taller activo' in r['text'] or 'talleres activos' in r['text'] or 'ningún taller' in r['text'])
        ok = (not sin_rastro and any(t in usadas for t in tools_esperadas) and (con_expl or not exige_expl))
        fallas += not ok
        reporte.append({'pregunta': pregunta, 'ok': ok, 'herramientas': usadas, 'cifras_sin_rastro': sin_rastro,
                        'explicacion_presente': con_expl, 'respuesta': r['text']})
        print(('OK   ' if ok else 'FALLA'), pregunta, '|', usadas)
    destino = Path(__file__).with_name(f"reporte_{datetime.now():%Y%m%d_%H%M}.json")
    destino.write_text(json.dumps(reporte, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'\n{len(PREGUNTAS) - fallas}/{len(PREGUNTAS)} aprobadas. Reporte: {destino.name}')
    app.state.db.engine.dispose()
    tmp.cleanup()


if __name__ == '__main__':
    asyncio.run(main())
