from typing import Literal

from pydantic import BaseModel, Field

# Catálogo cerrado de atributos visuales — ver diccionario enum→frase real en
# `backend/services/render_service.py`. Nunca texto libre: es lo que hace el
# prompt de render reproducible (mismo valor de enum = misma frase siempre),
# diseño validado por el Prompt Engineer del ciclo de planificación
# 2026-09-16.
ColorBase = Literal[
    "blanco", "blanco_hueso", "gris_claro", "gris_oscuro", "negro",
    "beige_arena", "cafe", "verde", "azul_gris", "dorado",
    "rojo_terracota", "multicolor",
]
ColorVetas = Literal[
    "sin_vetas", "blanco", "gris", "gris_oscuro", "dorado", "beige",
    "cafe", "negro", "azulado", "oxidado",
]
DensidadVeteado = Literal["sin_veteado", "sutil", "moderado", "denso"]
PatronVeteado = Literal["no_aplica", "lineal", "organico", "malla", "moteado", "bookmatch"]
Acabado = Literal["pulido", "mate", "leather", "flameado"]
TonoGeneral = Literal["calido", "frio", "neutro"]


class MaterialIn(BaseModel):
    categoria:       str = Field(min_length=1, max_length=60)
    referencia:      str = Field(min_length=1, max_length=200)
    precio_m2:       float = Field(ge=0)
    precio_lamina:   float | None = Field(default=None, ge=0)
    ancho_lamina_cm: float | None = Field(default=None, ge=0)
    alto_lamina_cm:  float | None = Field(default=None, ge=0)
    proveedor:       str = ""


class MaterialUpdate(BaseModel):
    categoria:     str | None = Field(default=None, min_length=1, max_length=60)
    referencia:    str | None = Field(default=None, min_length=1, max_length=200)
    precio_m2:     float | None = Field(default=None, ge=0)
    proveedor:     str | None = None
    activo:        bool | None = None


class MaterialAtributosVisualesIn(BaseModel):
    """Los 5 obligatorios (para que un material quede "apto para render") +
    2 opcionales — ver reglas de negocio del ciclo de render con IA. Ninguno
    tiene default silencioso: si el asesor no los completa, el material
    simplemente no habilita el botón de generar render."""
    color_base:       ColorBase | None = None
    color_vetas:      ColorVetas | None = None
    densidad_veteado: DensidadVeteado | None = None
    patron_veteado:   PatronVeteado | None = None
    acabado:          Acabado | None = None
    tono_general:     TonoGeneral | None = None
