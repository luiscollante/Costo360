"""
Registro de herramientas (tools) del Agente de IA — Objetivo 5, Ciclo 1.

Cada entrada mapea 1:1 a una acción de negocio concreta — nunca un tool
comodín que reciba una descripción en lenguaje libre y la interprete río
abajo (es exactamente el patrón que causó el incidente real de este
proyecto: un DELETE filtrado por un campo de texto ambiguo). Los
parámetros de identidad (`tarea_id`, `project_id`) van tipados como
entero en el `FunctionDeclaration`, nunca como texto libre.

Doble candado de seguridad (auditoría Fase 2 del Objetivo 5):
  1. `tools_para_usuario()` filtra el catálogo ANTES de construirlo — un
     usuario sin una capacidad ni siquiera ve el schema de una tool fuera
     de su alcance, así que el modelo no puede alucinar una llamada a algo
     que no está en su lista de herramientas disponibles ese turno.
  2. El `handler` de una tool `es_destructiva=True` NUNCA ejecuta la
     acción real — solo lee y propone (`agente/confirmations.py`). La
     ejecución real vive en `handler_confirmar`, invocado EXCLUSIVAMENTE
     por el endpoint HTTP de confirmación (`agente/router.py`), nunca por
     el modelo — el modelo no tiene ninguna tool para confirmar.
"""
from dataclasses import dataclass
from typing import Callable, Optional

from google.genai import types as gtypes


@dataclass(frozen=True)
class ToolSpec:
    nombre: str
    declaracion: gtypes.FunctionDeclaration
    # (conn, usuario, args_del_modelo) -> dict que se le devuelve al modelo
    # como FunctionResponse. Para es_destructiva=True, este handler SOLO lee
    # y crea una propuesta — nunca ejecuta la acción real.
    handler: Callable[..., dict]
    es_destructiva: bool = False
    # Capacidad booleana requerida en `usuario` (una de las 4 de roles_catalogo)
    # para que esta tool aparezca en el catálogo del modelo. None = disponible
    # para cualquier usuario autenticado del taller.
    requiere_capacidad: Optional[str] = None
    # SOLO para es_destructiva=True: (conn, usuario, payload_de_la_propuesta)
    # -> dict de resultado. Invocado únicamente por el endpoint de
    # confirmación — nunca alcanzable desde el loop del modelo.
    handler_confirmar: Optional[Callable[..., dict]] = None
    # Ciclo 3 — bitácora/deshacer: True SOLO en tools que EDITAN un campo ya
    # existente (nunca un alta ni un borrado), donde `filas_afectadas` de la
    # propuesta ya trae el valor "antes". Si una tool mixta (p. ej.
    # `catalogo_crear_material`) tiene una rama de alta que nunca pasa por
    # `confirmar_propuesta`, esta bandera es inofensiva ahí: la bitácora de
    # esa rama se escribe a mano con `es_deshacible=False` desde el propio
    # handler de escritura directa, nunca desde este camino.
    es_deshacible: bool = False
    # SOLO para es_deshacible=True: (conn, usuario, fila_antes: dict,
    # payload_aplicado: dict) -> dict de resultado. Reaplica el valor
    # "antes" con la MISMA función de servicio que usó `handler_confirmar` —
    # nunca reconstruye la fila a mano. Invocado únicamente desde el
    # endpoint HTTP de deshacer, nunca por el modelo.
    handler_deshacer: Optional[Callable[..., dict]] = None


_REGISTRO: dict[str, ToolSpec] = {}


def registrar(spec: ToolSpec) -> None:
    if spec.es_destructiva and spec.handler_confirmar is None:
        raise ValueError(f"Tool destructiva '{spec.nombre}' sin handler_confirmar")
    if spec.es_deshacible and spec.handler_deshacer is None:
        raise ValueError(f"Tool deshacible '{spec.nombre}' sin handler_deshacer")
    _REGISTRO[spec.nombre] = spec


def tools_para_usuario(usuario: dict) -> list[ToolSpec]:
    return [
        spec for spec in _REGISTRO.values()
        if not spec.requiere_capacidad or usuario.get(spec.requiere_capacidad)
    ]


def obtener(nombre: str) -> Optional[ToolSpec]:
    return _REGISTRO.get(nombre)
