"""
backend/models/parametros.py — defensa en profundidad para las tools del agente
sobre Parámetros (Objetivo 5, Ciclo 2). Los argumentos de una tool-call de
Gemini nunca pasan por FastAPI, así que cada handler de tool valida
manualmente con estos modelos antes de tocar `parametros_service`.

`etiqueta_pdf` es un catálogo CERRADO de 4 valores (3 buckets reales +
cadena vacía para filas sin bucket, ej. merma_pct) — un valor fuera de este
set no rompe nada visiblemente, pero hace que `calculos.py` DESCARTE esa
regla completa de `costo_total` en silencio (`if bucket not in acumulados:
continue`), un bug de costeo silencioso encontrado en la auditoría de
seguridad, no un detalle cosmético de PDF.
"""
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator, model_validator

from backend.services.parametros_service import (
    CATEGORIAS_MATERIAL,
    INDUCTORES_PORCENTAJE,
    INDUCTORES_VALIDOS,
)

EtiquetaPdf = Literal["c2_mano_obra", "c3_zocalos", "c4_insumos", ""]


class TarifaAgregarIn(BaseModel):
    material: str = Field(min_length=1, max_length=40)
    nombre_interno: str = Field(min_length=1, max_length=120)
    inductor: str
    valor: float = Field(ge=0, le=50_000_000)  # puntos de % si inductor es %, COP si no
    etiqueta_pdf: EtiquetaPdf = ""

    @field_validator("material")
    @classmethod
    def _material_valido(cls, v):
        if v not in CATEGORIAS_MATERIAL:
            raise ValueError(f"material debe ser una de: {', '.join(CATEGORIAS_MATERIAL)}")
        return v

    @field_validator("inductor")
    @classmethod
    def _inductor_valido(cls, v):
        if v not in INDUCTORES_VALIDOS:
            raise ValueError(f"inductor debe ser uno de: {', '.join(INDUCTORES_VALIDOS)}")
        return v

    @model_validator(mode="after")
    def _rango_porcentaje(self):
        if self.inductor in INDUCTORES_PORCENTAJE and self.valor >= 100:
            raise ValueError("Un valor de % debe ser menor a 100 (ej. 5 para 5%)")
        return self


class TarifaEditarIn(BaseModel):
    material: str = Field(min_length=1, max_length=40)
    nombre_interno: str = Field(min_length=1, max_length=120)
    nuevo_valor: Optional[float] = Field(default=None, ge=0, le=50_000_000)
    nuevo_nombre_interno: Optional[str] = Field(default=None, min_length=1, max_length=120)
    # El tope de <100 para filas % no puede validarse aquí — el inductor de la
    # fila objetivo se conoce solo tras leerla en el handler (el mismo número
    # puede ser COP válido para una fila y % inválido para otra).

    @field_validator("material")
    @classmethod
    def _material_valido(cls, v):
        if v not in CATEGORIAS_MATERIAL:
            raise ValueError(f"material debe ser una de: {', '.join(CATEGORIAS_MATERIAL)}")
        return v


class TarifaQuitarIn(BaseModel):
    material: str = Field(min_length=1, max_length=40)
    nombre_interno: str = Field(min_length=1, max_length=120)

    @field_validator("material")
    @classmethod
    def _material_valido(cls, v):
        if v not in CATEGORIAS_MATERIAL:
            raise ValueError(f"material debe ser una de: {', '.join(CATEGORIAS_MATERIAL)}")
        return v


class AdicionalAgregarIn(BaseModel):
    concepto: str = Field(min_length=1, max_length=200)
    unidad: str = Field(min_length=1, max_length=20)
    terminada: float = Field(ge=0, le=50_000_000)
    acabados: float = Field(ge=0, le=50_000_000)
    estructura: float = Field(ge=0, le=50_000_000)
    comercial: float = Field(ge=0, le=50_000_000)


class AdicionalEditarIn(BaseModel):
    concepto: str = Field(min_length=1, max_length=200)
    nuevo_concepto: Optional[str] = Field(default=None, min_length=1, max_length=200)
    unidad: Optional[str] = Field(default=None, min_length=1, max_length=20)
    terminada: Optional[float] = Field(default=None, ge=0, le=50_000_000)
    acabados: Optional[float] = Field(default=None, ge=0, le=50_000_000)
    estructura: Optional[float] = Field(default=None, ge=0, le=50_000_000)
    comercial: Optional[float] = Field(default=None, ge=0, le=50_000_000)


class AdicionalQuitarIn(BaseModel):
    concepto: str = Field(min_length=1, max_length=200)
