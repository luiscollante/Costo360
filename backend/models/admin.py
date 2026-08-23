import re
from pydantic import BaseModel, Field, field_validator
from typing import Optional


class UsuarioListItem(BaseModel):
    id: int
    username: str
    rol: str
    nombre_completo: str


class UsuarioCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)
    pin: str = Field(..., min_length=4, max_length=10)
    rol: str = "Operario"
    nombre_completo: str = ""

    @field_validator("username")
    @classmethod
    def username_valido(cls, v: str) -> str:
        if not re.match(r"^[a-zA-Z0-9_]+$", v):
            raise ValueError("El usuario solo puede contener letras, números y _")
        return v.strip().lower()


class UsuarioUpdate(BaseModel):
    nombre_completo: Optional[str] = None
    rol: Optional[str] = None
    password: Optional[str] = Field(None, min_length=6)
