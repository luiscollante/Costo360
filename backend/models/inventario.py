from pydantic import BaseModel, Field


class LaminaIn(BaseModel):
    material_categoria: str = Field(min_length=1, max_length=60)
    referencia:         str = Field(default="", max_length=200)
    cantidad_laminas:   int = Field(default=0, ge=0)
    ancho_cm:           float | None = Field(default=None, gt=0)
    alto_cm:            float | None = Field(default=None, gt=0)
    espesor_cm:         float | None = Field(default=None, gt=0)
    costo_unitario:     float = Field(default=0.0, ge=0)
    stock_minimo:       int = Field(default=0, ge=0)
    proveedor:          str = Field(default="", max_length=200)
    ubicacion:          str = Field(default="", max_length=200)
    notas:              str = Field(default="", max_length=2000)


class LaminaUpdate(BaseModel):
    referencia:         str | None = Field(default=None, max_length=200)
    cantidad_laminas:   int | None = Field(default=None, ge=0)
    ancho_cm:           float | None = Field(default=None, gt=0)
    alto_cm:            float | None = Field(default=None, gt=0)
    espesor_cm:         float | None = Field(default=None, gt=0)
    costo_unitario:     float | None = Field(default=None, ge=0)
    stock_minimo:       int | None = Field(default=None, ge=0)
    proveedor:          str | None = Field(default=None, max_length=200)
    ubicacion:          str | None = Field(default=None, max_length=200)
    notas:              str | None = Field(default=None, max_length=2000)
