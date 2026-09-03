"""
Modelos Pydantic del módulo de gestión de proyectos (Objetivo 6 / Fase 2.D).

Los `*In` son para crear; los `*Update` para editar (todo opcional). Los estados
válidos se validan además contra el CHECK de la BD; aquí se acotan con `Literal`
para dar un 422 claro antes de tocar SQL (hallazgo S9).
"""
from datetime import date
from typing import Literal, Optional

from pydantic import BaseModel, Field

EstadoProyecto = Literal[
    "planificacion", "activo", "en_revision", "completado",
    "en_pausa", "cancelado", "archivado",
]
EstadoTarea = Literal["bloqueada", "por_hacer", "en_progreso", "revision", "completada"]
Prioridad = Literal["baja", "media", "alta", "urgente"]
EstadoHito = Literal["pendiente", "en_progreso", "completado"]


# ── Proyectos ───────────────────────────────────────────────────────────────

class ProyectoIn(BaseModel):
    nombre:       str = Field(min_length=1, max_length=200)
    descripcion:  str = Field(default="", max_length=4000)
    cliente:      str = Field(default="", max_length=200)
    material:     str = Field(default="", max_length=120)
    estado:       EstadoProyecto = "activo"
    fecha_inicio: Optional[date] = None
    fecha_fin:    Optional[date] = None


class ProyectoUpdate(BaseModel):
    nombre:       Optional[str] = Field(default=None, min_length=1, max_length=200)
    descripcion:  Optional[str] = Field(default=None, max_length=4000)
    cliente:      Optional[str] = Field(default=None, max_length=200)
    material:     Optional[str] = Field(default=None, max_length=120)
    fecha_inicio: Optional[date] = None
    fecha_fin:    Optional[date] = None


class EstadoProyectoIn(BaseModel):
    estado: EstadoProyecto


# ── Hitos ───────────────────────────────────────────────────────────────────

class HitoIn(BaseModel):
    titulo:       str = Field(min_length=1, max_length=200)
    descripcion:  str = Field(default="", max_length=4000)
    fecha_inicio: Optional[date] = None
    fecha_limite: Optional[date] = None


class HitoUpdate(BaseModel):
    titulo:       Optional[str] = Field(default=None, min_length=1, max_length=200)
    descripcion:  Optional[str] = Field(default=None, max_length=4000)
    fecha_inicio: Optional[date] = None
    fecha_limite: Optional[date] = None


class EstadoHitoIn(BaseModel):
    estado: EstadoHito


# ── Tareas ──────────────────────────────────────────────────────────────────

class TareaIn(BaseModel):
    titulo:          str = Field(min_length=1, max_length=200)
    descripcion:     str = Field(default="", max_length=4000)
    prioridad:       Prioridad = "media"
    responsable_id:  Optional[str] = None          # uuid de usuarios; validado en BD
    fecha_limite:    Optional[date] = None
    horas_estimadas: Optional[float] = Field(default=None, ge=0)
    milestone_id:    Optional[int] = None


class TareaUpdate(BaseModel):
    """Edición de tarea. Un no-gestor responsable solo puede tocar la lista
    blanca (titulo, descripcion, estado, prioridad, orden, horas_estimadas,
    fecha_limite); el backend rechaza el resto (hallazgo S1)."""
    titulo:          Optional[str] = Field(default=None, min_length=1, max_length=200)
    descripcion:     Optional[str] = Field(default=None, max_length=4000)
    estado:          Optional[EstadoTarea] = None
    prioridad:       Optional[Prioridad] = None
    responsable_id:  Optional[str] = None
    fecha_limite:    Optional[date] = None
    horas_estimadas: Optional[float] = Field(default=None, ge=0)
    milestone_id:    Optional[int] = None
    orden:           Optional[int] = None


class TareaMoverIn(BaseModel):
    """Mover una tarjeta en el Kanban de tareas."""
    estado: EstadoTarea
    orden:  Optional[int] = None


class ResponsableIn(BaseModel):
    # None = desasignar (solo gestor). uuid = asignar a ese usuario del taller.
    responsable_id: Optional[str] = None


# ── Registro de horas ───────────────────────────────────────────────────────

class HoraIn(BaseModel):
    horas: float = Field(gt=0)
    fecha: Optional[date] = None
    nota:  str = Field(default="", max_length=1000)


# ── Comentarios ─────────────────────────────────────────────────────────────

class ComentarioIn(BaseModel):
    contenido: str = Field(min_length=1, max_length=4000)
