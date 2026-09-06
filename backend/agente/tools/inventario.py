"""
Herramientas del agente sobre el dominio de Inventario de láminas —
Objetivo 5, Ciclo 2. Cada handler reutiliza `services/inventario_service.py`
(la MISMA lógica que usa el router HTTP normal) — nunca reimplementa una
validación ni una regla de negocio por su cuenta (mismo patrón que
`agente/tools/catalogo.py`).

Plan auditado dos veces por un Security Engineer antes de escribir estas
tools:
- Los parámetros de identidad van tipados INTEGER — nunca texto libre.
  `inventario_crear_lamina`/`inventario_editar_lamina` además validan sus
  datos con los MISMOS modelos Pydantic del router (`LaminaIn`/
  `LaminaUpdate`) antes de tocar el service.
- Si el usuario no dio un id exacto, la tool le dice al modelo que use
  primero `inventario_listar_laminas` y espere a que el humano confirme.
- `cantidad_laminas` y `costo_unitario` informan disponibilidad real y
  cálculos de costo — un error aquí es una decisión operativa mal
  informada (comprar de más, prometer una entrega imposible), más lenta
  en notarse que un error de cotización pero igual de real. Por eso
  `inventario_crear_lamina` (a diferencia de crear una tarea o una
  cotización) SIEMPRE propone, nunca ejecuta directo — el bloqueante real
  que encontró el Security Engineer en la primera ronda: dejar que el
  modelo cree filas de inventario sin confirmación abría la puerta a que
  invocara la tool varias veces en un solo turno y creara stock fantasma
  sin que el usuario viera nada hasta que ya estaba hecho.
- `inventario_eliminar_lamina` técnicamente es un soft-delete
  (`activo=FALSE`, el dato sobrevive en la base) pero se trata como un
  borrado real: hoy no existe ningún endpoint humano para "reactivar" una
  lámina, así que en la práctica es indistinguible de perder el dato. El
  aviso al modelo es explícito: nunca decir que esto es reversible.
- `inventario_editar_lamina` rechaza editar una lámina ya inactiva (fue
  "eliminada") — mismo chequeo que ya hace `eliminar_lamina` para sí misma.
"""
from google.genai import types as gtypes

from backend.agente import confirmations
from backend.agente.registry import ToolSpec, registrar
from backend.agente.tools.proyectos import _como_entero
from backend.models.inventario import LaminaIn, LaminaUpdate
from backend.services import inventario_service

_AVISO_ANTIENCADENAMIENTO = (
    "Si el usuario no te dio un id exacto de lámina, usa primero "
    "inventario_listar_laminas y muéstrale las coincidencias — nunca elijas tú "
    "cuál es ni la uses directo en otra tool en el mismo turno."
)


def _listar_laminas(conn, usuario: dict, args: dict) -> dict:
    laminas = inventario_service.listar_inventario(conn, args.get("material_categoria") or "")
    return {"laminas": laminas}


registrar(ToolSpec(
    nombre="inventario_listar_laminas",
    declaracion=gtypes.FunctionDeclaration(
        name="inventario_listar_laminas",
        description=(
            "Lista las láminas en inventario del taller (cantidad, medidas, costo, "
            "proveedor, ubicación). Admite filtrar por categoría de material."
        ),
        parameters={
            "type": "OBJECT",
            "properties": {"material_categoria": {"type": "STRING", "description": "ej. Mármol, Granito, Sinterizado"}},
        },
    ),
    handler=_listar_laminas,
    es_destructiva=False,
))


def _crear_lamina(conn, usuario: dict, args: dict) -> dict:
    categoria = (args.get("material_categoria") or "").strip()
    if not categoria:
        return {"error": "material_categoria es obligatorio"}
    try:
        body = LaminaIn(
            material_categoria=categoria,
            referencia=args.get("referencia") or "",
            cantidad_laminas=args.get("cantidad_laminas", 0),
            ancho_cm=args.get("ancho_cm"),
            alto_cm=args.get("alto_cm"),
            espesor_cm=args.get("espesor_cm"),
            costo_unitario=args.get("costo_unitario", 0.0),
            stock_minimo=args.get("stock_minimo", 0),
            proveedor=args.get("proveedor") or "",
            ubicacion=args.get("ubicacion") or "",
            notas=args.get("notas") or "",
        )
    except Exception:
        return {"error": (
            "Datos inválidos: cantidad_laminas, stock_minimo y costo_unitario deben ser "
            ">= 0; ancho_cm/alto_cm/espesor_cm deben ser > 0 si se envían."
        )}

    propuesta = confirmations.crear_propuesta(
        conn, usuario,
        herramienta="inventario_crear_lamina",
        payload=body.model_dump(),
        filas_afectadas=[body.model_dump()],
        es_destructiva=False,
    )
    return {
        "propuesta_creada": propuesta,
        "aviso_para_ti": (
            "Esto crea una fila NUEVA de inventario — cantidad y costo alimentan "
            "directamente decisiones de '¿tengo stock?' y '¿cuánto me cuesta reponer?'. "
            "Muéstrale al usuario los datos exactos que vas a registrar antes de que "
            "decida. Tú NUNCA puedes confirmar esto por tu cuenta, ni siquiera si el "
            "usuario ya te dio todos los datos en el mismo mensaje."
        ),
    }


def _confirmar_crear_lamina(conn, usuario: dict, payload: dict) -> dict:
    resultado = inventario_service.crear_lamina(
        conn, usuario, metadata_extra={"origen": "agente"}, **payload,
    )
    return {"lamina_creada": resultado}


registrar(ToolSpec(
    nombre="inventario_crear_lamina",
    declaracion=gtypes.FunctionDeclaration(
        name="inventario_crear_lamina",
        description=(
            "Prepara la creación de una lámina nueva en el inventario del taller. NUNCA "
            "la ejecuta de inmediato: siempre crea una propuesta que el usuario debe "
            "confirmar en pantalla, sin excepción — igual que al editar una lámina "
            "existente."
        ),
        parameters={
            "type": "OBJECT",
            "properties": {
                "material_categoria": {"type": "STRING", "description": "ej. Mármol, Granito, Sinterizado"},
                "referencia": {"type": "STRING"},
                "cantidad_laminas": {"type": "INTEGER"},
                "ancho_cm": {"type": "NUMBER"},
                "alto_cm": {"type": "NUMBER"},
                "espesor_cm": {"type": "NUMBER"},
                "costo_unitario": {"type": "NUMBER"},
                "stock_minimo": {"type": "INTEGER"},
                "proveedor": {"type": "STRING"},
                "ubicacion": {"type": "STRING"},
                "notas": {"type": "STRING"},
            },
            "required": ["material_categoria"],
        },
    ),
    handler=_crear_lamina,
    es_destructiva=False,
    handler_confirmar=_confirmar_crear_lamina,
))


def _editar_lamina(conn, usuario: dict, args: dict) -> dict:
    lamina_id = _como_entero(args.get("lamina_id"))
    if lamina_id is None:
        return {"error": "lamina_id debe ser un número entero"}
    try:
        body = LaminaUpdate(
            referencia=args.get("referencia"),
            cantidad_laminas=args.get("cantidad_laminas"),
            ancho_cm=args.get("ancho_cm"),
            alto_cm=args.get("alto_cm"),
            espesor_cm=args.get("espesor_cm"),
            costo_unitario=args.get("costo_unitario"),
            stock_minimo=args.get("stock_minimo"),
            proveedor=args.get("proveedor"),
            ubicacion=args.get("ubicacion"),
            notas=args.get("notas"),
        )
    except Exception:
        return {"error": (
            "Datos inválidos: cantidad_laminas, stock_minimo y costo_unitario deben ser "
            ">= 0; ancho_cm/alto_cm/espesor_cm deben ser > 0 si se envían."
        )}

    actual = inventario_service.obtener_lamina(conn, lamina_id)
    if actual is None:
        return {"error": f"No existe ninguna lámina con id {lamina_id} en este taller"}
    if actual["activo"] is False:
        return {"error": (
            f"La lámina {lamina_id} fue eliminada del inventario — no se puede editar. "
            "Si el usuario quiere que vuelva a existir, dile que hoy no hay una función "
            "de reactivación disponible en la aplicación."
        )}

    cambios = body.model_dump(exclude_unset=True, exclude_none=True)
    if not cambios:
        return {"error": "No diste ningún campo para cambiar"}

    payload = {"lamina_id": lamina_id, **cambios}
    propuestos = {f"{campo}_propuesto": valor for campo, valor in cambios.items()}
    propuesta = confirmations.crear_propuesta(
        conn, usuario,
        herramienta="inventario_editar_lamina",
        payload=payload,
        filas_afectadas=[{**actual, **propuestos}],
        es_destructiva=False,
    )
    return {
        "propuesta_creada": propuesta,
        "aviso_para_ti": (
            "Cantidad y costo de una lámina alimentan decisiones reales de stock y "
            "reposición — un error aquí no se nota ahora, se nota después. Muéstrale al "
            "usuario el valor actual y el propuesto de cada campo, lado a lado, antes de "
            "que decida. Tú NUNCA puedes confirmar esto por tu cuenta."
        ),
    }


def _confirmar_editar_lamina(conn, usuario: dict, payload: dict) -> dict:
    lamina_id = payload.pop("lamina_id")
    resultado = inventario_service.editar_lamina(
        conn, usuario, lamina_id, metadata_extra={"origen": "agente"}, **payload,
    )
    return {"lamina_editada": resultado}


registrar(ToolSpec(
    nombre="inventario_editar_lamina",
    declaracion=gtypes.FunctionDeclaration(
        name="inventario_editar_lamina",
        description=(
            "Prepara una edición de una lámina existente (cantidad, costo, medidas, "
            "proveedor, ubicación, notas). NUNCA la ejecuta de inmediato: siempre crea "
            f"una propuesta que el usuario debe confirmar en pantalla. {_AVISO_ANTIENCADENAMIENTO}"
        ),
        parameters={
            "type": "OBJECT",
            "properties": {
                "lamina_id": {"type": "INTEGER", "description": "id numérico de la lámina"},
                "referencia": {"type": "STRING"},
                "cantidad_laminas": {"type": "INTEGER"},
                "ancho_cm": {"type": "NUMBER"},
                "alto_cm": {"type": "NUMBER"},
                "espesor_cm": {"type": "NUMBER"},
                "costo_unitario": {"type": "NUMBER"},
                "stock_minimo": {"type": "INTEGER"},
                "proveedor": {"type": "STRING"},
                "ubicacion": {"type": "STRING"},
                "notas": {"type": "STRING"},
            },
            "required": ["lamina_id"],
        },
    ),
    handler=_editar_lamina,
    es_destructiva=False,
    handler_confirmar=_confirmar_editar_lamina,
))


def _preparar_eliminar_lamina(conn, usuario: dict, args: dict) -> dict:
    lamina_id = _como_entero(args.get("lamina_id"))
    if lamina_id is None:
        return {"error": "lamina_id debe ser un número entero"}
    fila = inventario_service.obtener_lamina(conn, lamina_id)
    if fila is None:
        return {"error": f"No existe ninguna lámina con id {lamina_id} en este taller"}
    if fila["activo"] is False:
        return {"error": f"La lámina {lamina_id} ya está eliminada del inventario"}

    propuesta = confirmations.crear_propuesta(
        conn, usuario,
        herramienta="inventario_eliminar_lamina",
        payload={"lamina_id": lamina_id},
        filas_afectadas=[fila],
        es_destructiva=True,
    )
    return {
        "propuesta_creada": propuesta,
        "aviso_para_ti": (
            "Aunque técnicamente esto no borra la fila de la base de datos, hoy no existe "
            "ninguna forma de reactivar una lámina eliminada desde la aplicación — para el "
            "usuario, es como si se perdiera de verdad. NUNCA le digas que esto es "
            "reversible o que 'no se pierde nada'. Dile que revise la tarjeta de "
            "confirmación antes de decidir. Tú NUNCA puedes confirmar ni ejecutar el "
            "borrado por tu cuenta."
        ),
    }


def _confirmar_eliminar_lamina(conn, usuario: dict, payload: dict) -> dict:
    resultado = inventario_service.eliminar_lamina(
        conn, usuario, payload["lamina_id"], metadata_extra={"origen": "agente"},
    )
    return {"lamina_eliminada": resultado}


registrar(ToolSpec(
    nombre="inventario_eliminar_lamina",
    declaracion=gtypes.FunctionDeclaration(
        name="inventario_eliminar_lamina",
        description=(
            "Prepara la eliminación de una lámina del inventario del taller. Aunque por "
            "dentro es reversible en la base de datos, hoy no hay forma de reactivarla "
            "desde la aplicación, así que trátalo como un borrado real e irreversible. "
            "NUNCA borra de inmediato: crea una propuesta que el usuario debe confirmar "
            f"explícitamente en pantalla. {_AVISO_ANTIENCADENAMIENTO}"
        ),
        parameters={
            "type": "OBJECT",
            "properties": {"lamina_id": {"type": "INTEGER", "description": "id numérico de la lámina a eliminar"}},
            "required": ["lamina_id"],
        },
    ),
    handler=_preparar_eliminar_lamina,
    es_destructiva=True,
    handler_confirmar=_confirmar_eliminar_lamina,
))
