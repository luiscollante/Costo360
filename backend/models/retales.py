"""backend/models/retales.py — movidos desde backend/routers/retales.py."""
from typing import Optional

from pydantic import BaseModel, field_validator

_ESTADOS_RETAL = ("Disponible", "Reservado", "Usado")


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

    @field_validator("estado")
    @classmethod
    def _validar_estado(cls, v):
        if v is not None and v not in _ESTADOS_RETAL:
            raise ValueError(f"estado inválido, debe ser uno de {_ESTADOS_RETAL}")
        return v
