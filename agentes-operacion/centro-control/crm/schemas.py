from datetime import date
from decimal import Decimal
from typing import Annotated, Literal
from uuid import UUID
import re
from pydantic import BaseModel, ConfigDict, Field, field_validator

Text = Annotated[str, Field(min_length=1, max_length=160)]
Note = Annotated[str, Field(max_length=3000)]
Money = Annotated[Decimal, Field(ge=0, le=1_000_000_000, max_digits=12, decimal_places=2)]
Plan = Literal['Por definir', 'Starter', 'Pro', 'Enterprise']

class Input(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True, allow_inf_nan=False)

class Empresa(Input):
    nombre: Text
    nit: Annotated[str, Field(max_length=25)] = ''
    ciudad: Annotated[str, Field(max_length=100)] = ''
    estado: Literal['Prospecto', 'Cliente', 'Inactivo'] = 'Prospecto'
    origen: Literal['Referido', 'Web', 'Redes', 'Prospección', 'Evento', 'Otro'] = 'Otro'
    segmento: Annotated[str, Field(max_length=120)] = ''
    notas: Note = ''

class Contacto(Input):
    empresa_id: UUID
    nombre: Text
    cargo: Annotated[str, Field(max_length=100)] = ''
    email: Annotated[str, Field(max_length=254)] = ''
    telefono: Annotated[str, Field(max_length=40)] = ''
    permiso_contacto: Literal['Sin registrar', 'Autorizado', 'No contactar'] = 'Sin registrar'
    notas: Note = ''

    @field_validator('email')
    @classmethod
    def email_valid(cls, v):
        if v and not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', v):
            raise ValueError('Correo electrónico inválido.')
        return v.casefold()

class Oportunidad(Input):
    empresa_id: UUID
    titulo: Text
    plan: Plan = 'Por definir'
    etapa: Literal['Nuevo', 'Contactado', 'Demostración', 'Propuesta', 'Negociación', 'Ganada', 'Perdida'] = 'Nuevo'
    valor_mensual: Money = Decimal('0')
    proximo_paso: Annotated[str, Field(max_length=500)] = ''
    fecha_seguimiento: date | None = None
    motivo_perdida: Annotated[str, Field(max_length=500)] = ''
    notas: Note = ''

class Actividad(Input):
    empresa_id: UUID
    titulo: Text
    tipo: Literal['Nota', 'Llamada', 'Correo', 'Reunión', 'Demostración', 'WhatsApp'] = 'Nota'
    fecha: date
    detalle: Note = ''

class Tarea(Input):
    empresa_id: UUID | None = None
    titulo: Text
    responsable: Text = 'Fundador'
    vence: date
    prioridad: Literal['Baja', 'Media', 'Alta'] = 'Media'
    estado: Literal['Pendiente', 'En curso', 'Hecha'] = 'Pendiente'
    notas: Note = ''

class Ticket(Input):
    empresa_id: UUID
    titulo: Text
    prioridad: Literal['Baja', 'Media', 'Alta'] = 'Media'
    estado: Literal['Abierto', 'En atención', 'Resuelto'] = 'Abierto'
    descripcion: Note = ''

class Proveedor(Input):
    nombre: Text
    categoria: Literal['Tecnología', 'Profesional', 'Administrativo', 'Otro'] = 'Tecnología'
    contacto: Annotated[str, Field(max_length=254)] = ''
    notas: Note = ''

class Compra(Input):
    proveedor_id: UUID
    concepto: Text
    importe: Money
    fecha: date
    estado: Literal['Prevista', 'Aprobada', 'Pagada', 'Cancelada'] = 'Prevista'
    notas: Note = ''

class Suscripcion(Input):
    empresa_id: UUID
    plan: Literal['Starter', 'Pro', 'Enterprise']
    importe_mensual: Money
    inicio: date
    renovacion: date
    estado: Literal['Prueba', 'Activa', 'Pausada', 'Cancelada'] = 'Prueba'
    notas: Note = ''

SCHEMAS = {
    'empresas': Empresa, 'contactos': Contacto, 'oportunidades': Oportunidad,
    'actividades': Actividad, 'tareas': Tarea, 'tickets': Ticket,
    'proveedores': Proveedor, 'compras': Compra, 'suscripciones': Suscripcion,
}
PARENTS = {k: ('empresa_id', 'empresas') for k in ['contactos', 'oportunidades', 'actividades', 'tareas', 'tickets', 'suscripciones']}
PARENTS['compras'] = ('proveedor_id', 'proveedores')

class Change(Input):
    data: dict
    version: int = Field(ge=1)

class ProposalIn(Input):
    kind: str
    action: Literal['crear', 'editar', 'archivar', 'restaurar']
    record_id: UUID | None = None
    version: int | None = Field(default=None, ge=1)
    data: dict = Field(default_factory=dict)

class Login(Input):
    email: Annotated[str, Field(min_length=3, max_length=254)]
    password: Annotated[str, Field(min_length=1, max_length=256)]
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=False)

class Chat(Input):
    message: Annotated[str, Field(min_length=1, max_length=4000)]
