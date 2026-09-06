"""backend/models/retales.py — movidos desde backend/routers/retales.py.

`estado` NO se valida aquí con un `field_validator`: eso corre durante el
parseo automático del body por FastAPI, ANTES del handler, y convierte un
valor inválido en un 422 con forma de lista de errores en vez del 400 con
`detail` de texto plano que el frontend y el contrato HTTP actual esperan
(hallazgo real de la auditoría de Fase 5). Mismo patrón que
`cotizacion_service.cambiar_estado_cotizacion`: la validación de un campo
tipo enum vive en la capa de servicio, no en el modelo Pydantic.
"""
from typing import Optional

from pydantic import BaseModel

ESTADOS_RETAL = ("Disponible", "Reservado", "Usado")


class RetalIn(BaseModel):
    material_categoria: str
    referencia: str = ""
    m2_disponibles: float
    m2_original: Optional[float] = None
    notas: str = ""
    precio_recuperacion: float = 0.0
    precio_mercado_m2: float = 0.0


class RetalUpdate(BaseModel):
    m2_disponibles: Optional[float] = None
    estado: Optional[str] = None
    notas: Optional[str] = None
    precio_recuperacion: Optional[float] = None
    precio_mercado_m2: Optional[float] = None
