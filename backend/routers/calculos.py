from fastapi import APIRouter, Depends
from backend.models.cotizacion import TotalesPiezasIn, MermaIn
from backend.services.cotizacion_service import calcular_totales, calcular_merma
from backend.middleware.auth import get_current_user

router = APIRouter(prefix="/api/calculos", tags=["calculos"])


@router.post("/totales")
def totales(body: TotalesPiezasIn, usuario=Depends(get_current_user)):
    piezas = [p.model_dump() for p in body.piezas]
    return calcular_totales(piezas)


@router.post("/merma")
def merma(body: MermaIn, usuario=Depends(get_current_user)):
    piezas = [p.model_dump() for p in body.piezas]
    return calcular_merma(piezas, body.categoria)
