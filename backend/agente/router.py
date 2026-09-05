"""
Endpoints del Agente de IA — Objetivo 5, Ciclo 1.

`POST /stream` es el único endpoint que llama al modelo — no declara
`Depends(db_rls)` a nivel de ruta a propósito: cada tool-call abre su
propia conexión corta dentro de `runtime.ejecutar_turno` (ver ese
archivo). Si aquí se declarara `conn=Depends(db_rls)`, FastAPI mantendría
esa conexión abierta durante TODO el streaming — exactamente el
bloqueante de seguridad que la auditoría del Objetivo 5 obligó a cerrar.

`POST /propuestas/{id}/confirmar` es el único camino real de ejecución de
una acción destructiva. No es una tool del modelo — es un endpoint HTTP
normal, llamado directamente por el frontend cuando el usuario pulsa
"Confirmar" en la tarjeta de propuesta. El modelo no tiene ningún código
que pueda invocar esta ruta por su cuenta.
"""
from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse

from backend.agente import confirmations, runtime
from backend.agente import tools as _tools  # noqa: F401 — registra las tools al importar
from backend.db.client import db_rls
from backend.db.deps import verificar_dispositivo
from backend.middleware.auth import get_current_user
from backend.middleware.rate_limiter import limiter
from backend.models.agente import PropuestaOut, TurnoIn

router = APIRouter(prefix="/api/agente", tags=["agente"],
                   dependencies=[Depends(verificar_dispositivo)])


@router.post("/stream")
@limiter.limit("20/minute")
async def stream(request: Request, body: TurnoIn, usuario=Depends(get_current_user)):
    import uuid
    thread_id = str(uuid.uuid4())
    historial = [h.model_dump() for h in body.historial]

    async def generador():
        async for evento in runtime.ejecutar_turno(usuario, body.mensaje, historial, thread_id):
            yield evento

    return StreamingResponse(generador(), media_type="text/event-stream")


@router.get("/propuestas/{propuesta_id}", response_model=PropuestaOut)
def obtener_propuesta(propuesta_id: str, conn=Depends(db_rls), usuario=Depends(get_current_user)):
    return confirmations.obtener_propuesta(conn, usuario, propuesta_id)


@router.post("/propuestas/{propuesta_id}/confirmar")
@limiter.limit("10/hour")
def confirmar(request: Request, propuesta_id: str, conn=Depends(db_rls), usuario=Depends(get_current_user)):
    return confirmations.confirmar_propuesta(conn, usuario, propuesta_id)


@router.post("/propuestas/{propuesta_id}/descartar", status_code=204)
def descartar(propuesta_id: str, conn=Depends(db_rls), usuario=Depends(get_current_user)):
    confirmations.descartar_propuesta(conn, usuario, propuesta_id)
