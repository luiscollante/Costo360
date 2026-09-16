"""
Modelos Pydantic del render de cocina con IA.
"""
from pydantic import BaseModel, Field


class RenderCocinaIn(BaseModel):
    material_id: int
    superficie: str = Field(min_length=1, max_length=40)
    nota_libre: str | None = Field(default=None, max_length=120)
    foto_cliente_consentimiento: bool = False
