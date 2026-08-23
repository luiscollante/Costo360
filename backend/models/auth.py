from pydantic import BaseModel


class LoginRequest(BaseModel):
    username: str
    password: str


class UsuarioOut(BaseModel):
    id: int
    username: str
    rol: str
    nombre_completo: str


class TokenOut(BaseModel):
    token: str
    usuario: UsuarioOut
