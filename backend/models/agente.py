"""
Modelos Pydantic del Agente de IA — Objetivo 5, Ciclo 1.
"""
from pydantic import BaseModel, Field
from typing import Literal


class MensajeHistorial(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(max_length=4000)


class TurnoIn(BaseModel):
    mensaje: str = Field(min_length=1, max_length=2000)
    historial: list[MensajeHistorial] = Field(default_factory=list, max_length=20)


class PropuestaOut(BaseModel):
    propuesta_id: str
    herramienta: str
    payload: dict
    filas_afectadas: list[dict]
    es_destructiva: bool
    estado: str
    expira_en: str
