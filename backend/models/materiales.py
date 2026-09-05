from pydantic import BaseModel, Field


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
