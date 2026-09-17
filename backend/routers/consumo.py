"""
Consumo mensual de APIs de IA por empresa (Gemini/Cost, ElevenLabs/Voz) —
ciclo pedido por el fundador (2026-09-16). Mismo espíritu que
`GET /api/render/gasto`, pero en lenguaje simple: nunca cifras técnicas en
dólares, siempre "te quedan aproximadamente X interacciones/minutos".
"""
from fastapi import APIRouter, Depends

from backend.db.client import db_rls
from backend.db.deps import verificar_dispositivo
from backend.middleware.auth import get_current_user
from backend.services import consumo_service

router = APIRouter(prefix="/api/consumo", tags=["consumo"],
                    dependencies=[Depends(verificar_dispositivo)])


@router.get("/resumen")
def resumen(conn=Depends(db_rls), usuario=Depends(get_current_user)):
    return consumo_service.resumen_consumo(conn, usuario)
