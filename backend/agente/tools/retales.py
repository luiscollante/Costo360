"""
Herramientas del agente sobre el dominio de Retales (sobrantes de lámina) —
Objetivo 5, Ciclo 2. Cada handler reutiliza `services/retales_service.py`
(la MISMA lógica que usa el router HTTP normal) — nunca reimplementa una
validación ni una regla de negocio por su cuenta (mismo patrón que
`agente/tools/inventario.py`/`catalogo.py`).

Plan auditado por un Security Engineer antes de escribir estas tools
(1 bloqueante real cerrado antes de ejecutar: la primera versión de
`retales_editar` aplicaba directo los cambios "de bajo riesgo" como notas o
`estado -> 'Disponible'/'Reservado'` — el auditor señaló que reactivar un
retal ya marcado 'Usado' es justo la transición riesgosa, no la segura, y
que introducir una clasificación campo-por-campo era una superficie de bug
nueva sin precedente en el resto del proyecto. Corregido: `retales_editar`
SIEMPRE propone, sin excepción, igual que `inventario_editar_lamina`/
`catalogo_editar_material`):
- Los parámetros de identidad van tipados INTEGER — nunca texto libre.
- Si el usuario no dio un id exacto, la tool le dice al modelo que use
  primero `retales_listar` y espere a que el humano confirme.
- Retales tiene una capa de aislamiento que ningún otro dominio de Cost
  tiene todavía: además de aislar por empresa, `scope_propio` aísla por
  USUARIO (un operativo solo ve/edita/borra SUS PROPIOS retales, un gestor
  ve los de todo el taller). Ninguna tool de este archivo expone un
  parámetro de alcance al modelo (nunca `usuario_id`, `ver_todos`, etc.) —
  `retales_service` resuelve `scope_propio(usuario)` siempre internamente,
  tomando `usuario` de la sesión autenticada real.
- `retales_eliminar` es un DELETE físico real de Postgres — a diferencia de
  `inventario_eliminar_lamina` (soft-delete, `activo=FALSE`, el dato
  sobrevive), aquí no queda ningún rastro recuperable en la base de datos.
  El aviso al modelo es explícito: nunca decir que esto es reversible, ni
  siquiera técnicamente.
- `retales_crear` SIEMPRE propone, nunca ejecuta directo — mismo criterio
  que `inventario_crear_lamina`: el riesgo análogo a "stock fantasma" aquí
  es "m² de retal fantasma" (filas duplicadas de sobrante que sobreestiman
  lo realmente disponible si el modelo invocara la tool más de una vez).
"""
from google.genai import types as gtypes

from backend.agente import confirmations
from backend.agente.registry import ToolSpec, registrar
from backend.agente.tools.proyectos import _como_entero
from backend.models.retales import ESTADOS_RETAL, RetalIn, RetalUpdate
from backend.services import retales_service

_AVISO_ANTIENCADENAMIENTO = (
    "Si el usuario no te dio un id exacto de retal, usa primero retales_listar "
    "y muéstrale las coincidencias — nunca elijas tú cuál es ni la uses directo "
    "en otra tool en el mismo turno."
)


def _listar_retales(conn, usuario: dict, args: dict) -> dict:
    return {"retales": retales_service.listar_retales(conn, usuario)}


registrar(ToolSpec(
    nombre="retales_listar",
    declaracion=gtypes.FunctionDeclaration(
        name="retales_listar",
        description=(
            "Lista los retales (sobrantes de lámina reutilizables) visibles para el "
            "usuario actual — cantidad de m² disponibles, material, estado "
            "(Disponible/Reservado/Usado), precios. Si el usuario es operativo, solo "
            "ve SUS PROPIOS retales, nunca los de otros usuarios del taller — esto no "
            "es configurable desde esta tool."
        ),
        parameters={"type": "OBJECT", "properties": {}},
    ),
    handler=_listar_retales,
    es_destructiva=False,
))


def _crear_retal(conn, usuario: dict, args: dict) -> dict:
    categoria = (args.get("material_categoria") or "").strip()
    if not categoria:
        return {"error": "material_categoria es obligatorio"}
    if args.get("m2_disponibles") is None:
        return {"error": "m2_disponibles es obligatorio"}
    try:
        body = RetalIn(
            material_categoria=categoria,
            referencia=args.get("referencia") or "",
            m2_disponibles=args["m2_disponibles"],
            m2_original=args.get("m2_original"),
            notas=args.get("notas") or "",
            precio_recuperacion=args.get("precio_recuperacion", 0.0),
            precio_mercado_m2=args.get("precio_mercado_m2", 0.0),
        )
    except Exception:
        return {"error": "Datos inválidos: m2_disponibles/m2_original/precios deben ser números"}

    propuesta = confirmations.crear_propuesta(
        conn, usuario,
        herramienta="retales_crear",
        payload=body.model_dump(),
        filas_afectadas=[body.model_dump()],
        es_destructiva=False,
    )
    return {
        "propuesta_creada": propuesta,
        "aviso_para_ti": (
            "Esto crea una fila NUEVA de retal — los m² disponibles alimentan "
            "directamente si un trabajo futuro puede reutilizar este sobrante. "
            "Muéstrale al usuario los datos exactos antes de que decida. Tú NUNCA "
            "puedes confirmar esto por tu cuenta, ni siquiera si el usuario ya te dio "
            "todos los datos en el mismo mensaje."
        ),
    }


def _confirmar_crear_retal(conn, usuario: dict, payload: dict) -> dict:
    resultado = retales_service.crear_retal(
        conn, usuario, metadata_extra={"origen": "agente"}, **payload,
    )
    return {"retal_creado": resultado}


registrar(ToolSpec(
    nombre="retales_crear",
    declaracion=gtypes.FunctionDeclaration(
        name="retales_crear",
        description=(
            "Prepara el registro de un retal nuevo (sobrante de lámina). NUNCA lo "
            "ejecuta de inmediato: siempre crea una propuesta que el usuario debe "
            "confirmar en pantalla, sin excepción."
        ),
        parameters={
            "type": "OBJECT",
            "properties": {
                "material_categoria": {"type": "STRING", "description": "ej. Mármol, Granito, Sinterizado"},
                "referencia": {"type": "STRING"},
                "m2_disponibles": {"type": "NUMBER"},
                "m2_original": {"type": "NUMBER", "description": "si no se da, se usa m2_disponibles"},
                "notas": {"type": "STRING"},
                "precio_recuperacion": {"type": "NUMBER"},
                "precio_mercado_m2": {"type": "NUMBER"},
            },
            "required": ["material_categoria", "m2_disponibles"],
        },
    ),
    handler=_crear_retal,
    es_destructiva=False,
    handler_confirmar=_confirmar_crear_retal,
))


def _editar_retal(conn, usuario: dict, args: dict) -> dict:
    retal_id = _como_entero(args.get("retal_id"))
    if retal_id is None:
        return {"error": "retal_id debe ser un número entero"}
    try:
        body = RetalUpdate(
            m2_disponibles=args.get("m2_disponibles"),
            estado=args.get("estado"),
            notas=args.get("notas"),
            precio_recuperacion=args.get("precio_recuperacion"),
            precio_mercado_m2=args.get("precio_mercado_m2"),
        )
    except Exception:
        return {"error": (
            "Datos inválidos: estado debe ser Disponible/Reservado/Usado; "
            "m2_disponibles y los precios deben ser números."
        )}

    if body.estado is not None and body.estado not in ESTADOS_RETAL:
        return {"error": f"estado debe ser uno de {', '.join(ESTADOS_RETAL)}"}

    actual = retales_service.obtener_retal(conn, usuario, retal_id)
    if actual is None:
        return {"error": f"No existe ningún retal con id {retal_id} para este usuario"}

    cambios = body.model_dump(exclude_unset=True, exclude_none=True)
    if not cambios:
        return {"error": "No diste ningún campo para cambiar"}

    payload = {"retal_id": retal_id, **cambios}
    propuestos = {f"{campo}_propuesto": valor for campo, valor in cambios.items()}
    propuesta = confirmations.crear_propuesta(
        conn, usuario,
        herramienta="retales_editar",
        payload=payload,
        filas_afectadas=[{**actual, **propuestos}],
        es_destructiva=False,
    )
    return {
        "propuesta_creada": propuesta,
        "aviso_para_ti": (
            "Los m², el precio, o el estado de un retal alimentan decisiones reales de "
            "qué sobrante sigue disponible para reutilizar — un cambio de estado a "
            "'Disponible' sobre uno que estaba 'Usado' puede hacer que el mismo material "
            "se prometa dos veces. Muéstrale al usuario el valor actual y el propuesto de "
            "cada campo antes de que decida. Tú NUNCA puedes confirmar esto por tu cuenta."
        ),
    }


def _confirmar_editar_retal(conn, usuario: dict, payload: dict) -> dict:
    retal_id = payload.pop("retal_id")
    resultado = retales_service.editar_retal(
        conn, usuario, retal_id, metadata_extra={"origen": "agente"}, **payload,
    )
    return {"retal_editado": resultado}


registrar(ToolSpec(
    nombre="retales_editar",
    declaracion=gtypes.FunctionDeclaration(
        name="retales_editar",
        description=(
            "Prepara una edición de un retal existente (m² disponibles, estado, precios, "
            "notas). NUNCA la ejecuta de inmediato: siempre crea una propuesta que el "
            f"usuario debe confirmar en pantalla, sin excepción. {_AVISO_ANTIENCADENAMIENTO}"
        ),
        parameters={
            "type": "OBJECT",
            "properties": {
                "retal_id": {"type": "INTEGER", "description": "id numérico del retal"},
                "m2_disponibles": {"type": "NUMBER"},
                "estado": {"type": "STRING", "enum": list(ESTADOS_RETAL)},
                "notas": {"type": "STRING"},
                "precio_recuperacion": {"type": "NUMBER"},
                "precio_mercado_m2": {"type": "NUMBER"},
            },
            "required": ["retal_id"],
        },
    ),
    handler=_editar_retal,
    es_destructiva=False,
    handler_confirmar=_confirmar_editar_retal,
))


def _preparar_eliminar_retal(conn, usuario: dict, args: dict) -> dict:
    retal_id = _como_entero(args.get("retal_id"))
    if retal_id is None:
        return {"error": "retal_id debe ser un número entero"}
    fila = retales_service.obtener_retal(conn, usuario, retal_id)
    if fila is None:
        return {"error": f"No existe ningún retal con id {retal_id} para este usuario"}

    propuesta = confirmations.crear_propuesta(
        conn, usuario,
        herramienta="retales_eliminar",
        payload={"retal_id": retal_id},
        filas_afectadas=[fila],
        es_destructiva=True,
    )
    return {
        "propuesta_creada": propuesta,
        "aviso_para_ti": (
            "A diferencia de una lámina de Inventario, esto es un borrado FÍSICO real "
            "de la base de datos — no queda ningún rastro recuperable, ni siquiera "
            "'inactivo'. NUNCA le digas al usuario que esto es reversible, ni siquiera "
            "técnicamente. Dile que revise la tarjeta de confirmación antes de decidir. "
            "Tú NUNCA puedes confirmar ni ejecutar el borrado por tu cuenta."
        ),
    }


def _confirmar_eliminar_retal(conn, usuario: dict, payload: dict) -> dict:
    resultado = retales_service.eliminar_retal(
        conn, usuario, payload["retal_id"], metadata_extra={"origen": "agente"},
    )
    return {"retal_eliminado": resultado}


registrar(ToolSpec(
    nombre="retales_eliminar",
    declaracion=gtypes.FunctionDeclaration(
        name="retales_eliminar",
        description=(
            "Prepara la eliminación de un retal. Es un BORRADO FÍSICO REAL de la base "
            "de datos — no queda ningún rastro, ni siquiera 'inactivo'. NUNCA borra de "
            "inmediato: crea una propuesta que el usuario debe confirmar explícitamente "
            f"en pantalla. {_AVISO_ANTIENCADENAMIENTO}"
        ),
        parameters={
            "type": "OBJECT",
            "properties": {"retal_id": {"type": "INTEGER", "description": "id numérico del retal a eliminar"}},
            "required": ["retal_id"],
        },
    ),
    handler=_preparar_eliminar_retal,
    es_destructiva=True,
    handler_confirmar=_confirmar_eliminar_retal,
))
