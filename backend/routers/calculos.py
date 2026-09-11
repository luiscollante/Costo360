from fastapi import APIRouter, Depends
from backend.models.cotizacion import TotalesPiezasIn
from backend.services.cotizacion_service import calcular_totales
from backend.middleware.auth import get_current_user
from backend.db.deps import verificar_dispositivo

router = APIRouter(prefix="/api/calculos", tags=["calculos"],
                   dependencies=[Depends(verificar_dispositivo)])


@router.post("/totales")
def totales(body: TotalesPiezasIn, usuario=Depends(get_current_user)):
    piezas = [p.model_dump() for p in body.piezas]
    return calcular_totales(piezas)
