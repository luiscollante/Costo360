"""
Herramientas del agente sobre el dominio de Catálogo de materiales —
Objetivo 5, Ciclo 2. Cada handler reutiliza `services/catalogo_service.py`
(la MISMA lógica que usa el router HTTP normal) — nunca reimplementa una
validación ni una regla de negocio por su cuenta (mismo patrón que
`agente/tools/cotizacion.py`).

Plan auditado dos veces por un Security Engineer antes de escribir estas
tools:
- Los parámetros de identidad van tipados INTEGER — nunca texto libre.
  `catalogo_crear_material`/`catalogo_editar_material` además validan sus
  datos con los MISMOS modelos Pydantic del router (`MaterialIn`/
  `MaterialUpdate`) antes de tocar el service — los argumentos de una
  tool-call nunca pasan por FastAPI, así que sin esto un precio negativo o
  un texto gigante llegarían crudos a la base de datos.
- Si el usuario no dio un id exacto, la tool le dice al modelo que use
  primero `catalogo_listar_materiales` y espere a que el humano confirme
  cuál es — nunca encadenar un resultado de búsqueda fuzzy directo a una
  acción de escritura en el mismo turno (mismo incidente real que motivó
  esta regla en Proyectos y Cotización: un borrado por texto ambiguo).
- El precio de un material alimenta CUALQUIER cotización futura que lo use
  — un error aquí es silencioso y se nota semanas después, no al momento.
  Por eso `catalogo_editar_material` SIEMPRE pasa por confirmación (nunca
  ejecuta directo, ni para cambios triviales), mostrando precio actual y
  propuesto lado a lado. `catalogo_crear_material` hace lo mismo solo
  cuando en la práctica sería una actualización de precio disfrazada de
  "crear" (ya existe un material propio con esa categoría+referencia).
- `catalogo_eliminar_material` siempre crea una propuesta (nunca ejecuta
  directo), pero el aviso al usuario distingue si la fila es un override de
  una fila base de Costo360 (borrarla solo "restablece" el original, no se
  pierde nada) o un material genuinamente propio del taller (borrado real
  e irreversible) — la fila afectada incluye el dato crudo `es_override`
  para que la tarjeta de confirmación no dependa solo del cálculo.
"""
from google.genai import types as gtypes

from backend.agente import confirmations
from backend.agente.registry import ToolSpec, registrar
from backend.agente.tools.proyectos import _como_entero
from backend.models.materiales import MaterialIn, MaterialUpdate
from backend.services import catalogo_service

_AVISO_ANTIENCADENAMIENTO = (
    "Si el usuario no te dio un id exacto de material (o una categoría+referencia "
    "exactas), usa primero catalogo_listar_materiales y muéstrale las coincidencias — "
    "nunca elijas tú cuál es ni la uses directo en otra tool en el mismo turno."
)


def _listar_materiales(conn, usuario: dict, args: dict) -> dict:
    materiales = catalogo_service.listar_materiales(conn, args.get("categoria") or "")
    return {"materiales": materiales}


registrar(ToolSpec(
    nombre="catalogo_listar_materiales",
    declaracion=gtypes.FunctionDeclaration(
        name="catalogo_listar_materiales",
        description=(
            "Lista los materiales del catálogo del taller (propios + los de Costo360 "
            "que el taller no haya personalizado), con precio por m², proveedor y si "
            "es propio del taller. Admite filtrar por categoría."
        ),
        parameters={
            "type": "OBJECT",
            "properties": {"categoria": {"type": "STRING", "description": "ej. Mármol, Granito, Sinterizado"}},
        },
    ),
    handler=_listar_materiales,
    es_destructiva=False,
))


def _listar_categorias(conn, usuario: dict, args: dict) -> dict:
    return {"categorias": catalogo_service.listar_categorias(conn)}


registrar(ToolSpec(
    nombre="catalogo_listar_categorias",
    declaracion=gtypes.FunctionDeclaration(
        name="catalogo_listar_categorias",
        description="Lista las categorías de material que existen en el catálogo del taller.",
        parameters={"type": "OBJECT", "properties": {}},
    ),
    handler=_listar_categorias,
    es_destructiva=False,
))


def _crear_material(conn, usuario: dict, args: dict) -> dict:
    categoria = (args.get("categoria") or "").strip()
    referencia = (args.get("referencia") or "").strip()
    if not categoria or not referencia:
        return {"error": "categoria y referencia son obligatorios"}
    try:
        body = MaterialIn(
            categoria=categoria,
            referencia=referencia,
            precio_m2=args.get("precio_m2"),
            precio_lamina=args.get("precio_lamina"),
            ancho_lamina_cm=args.get("ancho_lamina_cm"),
            alto_lamina_cm=args.get("alto_lamina_cm"),
            proveedor=args.get("proveedor") or "",
        )
    except Exception:
        return {"error": "Datos inválidos: precio_m2 debe ser un número >= 0"}

    existente = catalogo_service.buscar_material_propio(conn, body.categoria, body.referencia)
    if existente is None:
        resultado = catalogo_service.crear_material(
            conn, usuario, categoria=body.categoria, referencia=body.referencia,
            precio_m2=body.precio_m2, precio_lamina=body.precio_lamina,
            ancho_lamina_cm=body.ancho_lamina_cm, alto_lamina_cm=body.alto_lamina_cm,
            proveedor=body.proveedor, metadata_extra={"origen": "agente"},
        )
        return {"material_creado": resultado}

    propuesta = confirmations.crear_propuesta(
        conn, usuario,
        herramienta="catalogo_crear_material",
        payload={"categoria": body.categoria, "referencia": body.referencia,
                  "precio_m2": body.precio_m2, "precio_lamina": body.precio_lamina,
                  "ancho_lamina_cm": body.ancho_lamina_cm, "alto_lamina_cm": body.alto_lamina_cm,
                  "proveedor": body.proveedor},
        filas_afectadas=[{**existente, "precio_m2_propuesto": body.precio_m2}],
        es_destructiva=False,
    )
    return {
        "propuesta_creada": propuesta,
        "aviso_para_ti": (
            "Ya existe un material tuyo con esa categoría y referencia — esto en realidad "
            "actualizaría su precio, no crea uno nuevo. Muéstrale al usuario el precio "
            "actual y el propuesto antes de que decida. Tú NUNCA puedes confirmar esto "
            "por tu cuenta."
        ),
    }


def _confirmar_crear_material(conn, usuario: dict, payload: dict) -> dict:
    resultado = catalogo_service.crear_material(
        conn, usuario, metadata_extra={"origen": "agente"}, **payload,
    )
    return {"material_creado": resultado}


registrar(ToolSpec(
    nombre="catalogo_crear_material",
    declaracion=gtypes.FunctionDeclaration(
        name="catalogo_crear_material",
        description=(
            "Agrega un material nuevo al catálogo del taller. Si ya existe un material "
            "propio con esa categoría y referencia, en vez de crear uno duplicado prepara "
            "una propuesta para actualizar su precio (nunca lo hace directo). "
            f"{_AVISO_ANTIENCADENAMIENTO}"
        ),
        parameters={
            "type": "OBJECT",
            "properties": {
                "categoria": {"type": "STRING", "description": "ej. Mármol, Granito, Sinterizado"},
                "referencia": {"type": "STRING", "description": "nombre/referencia del material"},
                "precio_m2": {"type": "NUMBER", "description": "precio por metro cuadrado"},
                "precio_lamina": {"type": "NUMBER"},
                "ancho_lamina_cm": {"type": "NUMBER"},
                "alto_lamina_cm": {"type": "NUMBER"},
                "proveedor": {"type": "STRING"},
            },
            "required": ["categoria", "referencia", "precio_m2"],
        },
    ),
    handler=_crear_material,
    es_destructiva=False,
    handler_confirmar=_confirmar_crear_material,
))


def _editar_material(conn, usuario: dict, args: dict) -> dict:
    material_id = _como_entero(args.get("material_id"))
    if material_id is None:
        return {"error": "material_id debe ser un número entero"}
    try:
        body = MaterialUpdate(
            categoria=args.get("categoria"),
            referencia=args.get("referencia"),
            precio_m2=args.get("precio_m2"),
            proveedor=args.get("proveedor"),
            activo=args.get("activo"),
        )
    except Exception:
        return {"error": "Datos inválidos: precio_m2 debe ser un número >= 0 si se envía"}

    actual = catalogo_service.obtener_material(conn, material_id)
    if actual is None:
        return {"error": f"No existe ningún material con id {material_id} en este taller"}

    cambios = body.model_dump(exclude_unset=True, exclude_none=True)
    payload = {"material_id": material_id, **cambios}
    # Un "<campo>_propuesto" por cada campo que de verdad cambia — no solo precio_m2 —
    # para que la tarjeta de confirmación muestre siempre el antes/después real de
    # CUALQUIER edición, no solo la de precio (hallazgo de la Fase 5).
    propuestos = {f"{campo}_propuesto": valor for campo, valor in cambios.items()}
    propuesta = confirmations.crear_propuesta(
        conn, usuario,
        herramienta="catalogo_editar_material",
        payload=payload,
        filas_afectadas=[{**actual, **propuestos}],
        es_destructiva=False,
    )
    return {
        "propuesta_creada": propuesta,
        "aviso_para_ti": (
            "El precio de un material alimenta cualquier cotización futura que lo use — "
            "un error aquí no se nota ahora, se nota semanas después. Muéstrale al usuario "
            "el precio actual y el propuesto, lado a lado, antes de que decida. Tú NUNCA "
            "puedes confirmar esto por tu cuenta."
        ),
    }


def _confirmar_editar_material(conn, usuario: dict, payload: dict) -> dict:
    material_id = payload.pop("material_id")
    resultado = catalogo_service.editar_material(
        conn, usuario, material_id, metadata_extra={"origen": "agente"}, **payload,
    )
    return {"material_editado": resultado}


registrar(ToolSpec(
    nombre="catalogo_editar_material",
    declaracion=gtypes.FunctionDeclaration(
        name="catalogo_editar_material",
        description=(
            "Prepara una edición de un material existente (precio, nombre, categoría, "
            "proveedor, activo/inactivo). NUNCA la ejecuta de inmediato: siempre crea una "
            "propuesta que el usuario debe confirmar en pantalla. NUNCA uses esta tool si el "
            "usuario dice 'borra', 'elimina' o 'quita' un material — eso es "
            f"catalogo_eliminar_material, no un cambio de precio. {_AVISO_ANTIENCADENAMIENTO}"
        ),
        parameters={
            "type": "OBJECT",
            "properties": {
                "material_id": {"type": "INTEGER", "description": "id numérico del material"},
                "categoria": {"type": "STRING"},
                "referencia": {"type": "STRING"},
                "precio_m2": {"type": "NUMBER"},
                "proveedor": {"type": "STRING"},
                "activo": {"type": "BOOLEAN"},
            },
            "required": ["material_id"],
        },
    ),
    handler=_editar_material,
    es_destructiva=False,
    handler_confirmar=_confirmar_editar_material,
))


def _preparar_eliminar_material(conn, usuario: dict, args: dict) -> dict:
    material_id = _como_entero(args.get("material_id"))
    if material_id is None:
        return {"error": "material_id debe ser un número entero"}
    fila = catalogo_service.obtener_material(conn, material_id)
    if fila is None:
        return {"error": f"No existe ningún material con id {material_id} en este taller"}
    es_override = fila.get("base_id") is not None
    propuesta = confirmations.crear_propuesta(
        conn, usuario,
        herramienta="catalogo_eliminar_material",
        payload={"material_id": material_id},
        filas_afectadas=[{**fila, "es_override": es_override}],
        es_destructiva=True,
    )
    aviso = (
        "Esto restablece el material a su valor original de Costo360 — no se pierde nada "
        "propio del taller. Aun así, dile al usuario que revise la tarjeta antes de decidir."
        if es_override else
        "Esto BORRA de forma permanente un material propio del taller — no hay forma de "
        "recuperar el precio después. Dile esto al usuario antes de que decida. Tú NUNCA "
        "puedes confirmar ni ejecutar el borrado por tu cuenta."
    )
    return {"propuesta_creada": propuesta, "aviso_para_ti": aviso}


def _confirmar_eliminar_material(conn, usuario: dict, payload: dict) -> dict:
    resultado = catalogo_service.eliminar_material(
        conn, usuario, payload["material_id"], metadata_extra={"origen": "agente"},
    )
    return {"material_borrado": resultado}


registrar(ToolSpec(
    nombre="catalogo_eliminar_material",
    declaracion=gtypes.FunctionDeclaration(
        name="catalogo_eliminar_material",
        description=(
            "Prepara el borrado de un material del catálogo del taller — úsala siempre que "
            "el usuario diga 'borra', 'elimina' o 'quita' un material, sin importar qué "
            "precio tenga o haya tenido antes; nunca interpretes 'borrar' como volver a un "
            "precio anterior (eso sería catalogo_editar_material, una tool distinta). NUNCA "
            "borra de inmediato: crea una propuesta que el usuario debe confirmar "
            f"explícitamente en pantalla. {_AVISO_ANTIENCADENAMIENTO}"
        ),
        parameters={
            "type": "OBJECT",
            "properties": {"material_id": {"type": "INTEGER", "description": "id numérico del material a borrar"}},
            "required": ["material_id"],
        },
    ),
    handler=_preparar_eliminar_material,
    es_destructiva=True,
    handler_confirmar=_confirmar_eliminar_material,
))
