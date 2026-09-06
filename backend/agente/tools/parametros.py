"""
Herramientas del agente sobre el dominio de Parámetros (tarifas de costo y
adicionales) — Objetivo 5, Ciclo 2. Dominio de MAYOR riesgo financiero del
ciclo: estos valores alimentan directamente el motor de cálculo de cada
cotización futura del taller — un error aquí no afecta una fila, afecta
todas las cotizaciones hasta que alguien lo note.

Todas las tools de escritura reutilizan `services/parametros_service.py` (la
MISMA lógica que usa el router HTTP), nunca reimplementan una validación por
su cuenta. Plan auditado dos veces (Software Architect + Security Engineer)
antes de escribir esto:

- **7 tools, nunca un comodín con un parámetro `accion`** — mismo criterio ya
  documentado en `registry.py` (un tool comodín que interprete texto libre
  río abajo fue la causa del incidente histórico de este proyecto).
- **TODAS las escrituras SIEMPRE proponen, sin excepción, incluso "agregar"**
  — a diferencia de `catalogo_crear_material` (que a veces ejecuta directo),
  aquí `cfg_set` reemplaza el JSON COMPLETO de `tarifas`/`adicionales` en
  cada escritura, nunca una fila aislada con su propio id — el radio de un
  error de lectura previa se propagaría a TODAS las categorías de material.
- **No hay ningún id numérico de fila en este dominio** — la identidad es
  `(material, nombre_interno)` para tarifas y `concepto` para adicionales,
  texto libre. `parametros_service._buscar_indice` es el único punto de
  desambiguación: coincidencia EXACTA normalizada, nunca un índice de lista
  (un índice de una respuesta anterior se invalida en silencio si otra fila
  cambia entre medias) — 0 o 2+ coincidencias falla cerrado.
- **Conversión %-vs-fracción SIEMPRE en el handler, nunca en el modelo ni en
  el servicio.** El modelo siempre habla en puntos de porcentaje (5 = 5%);
  el handler divide entre 100 antes de llamar al service si el inductor es
  de tipo % (`porcentaje_material`/`merma_pct`).
- **Candado de concurrencia barato:** cada propuesta guarda la "marca" de
  concurrencia (`app_config.actualizado`) vigente al proponer; al confirmar,
  `parametros_service` la vuelve a comparar contra la real — si alguien más
  guardó Parámetros (desde la pantalla manual o desde otra propuesta) en el
  medio, la confirmación falla con 409 en vez de pisar ese cambio en
  silencio.
- **`quitar_tarifa` bloquea, no solo advierte,** borrar la última fila de %
  de merma de una categoría — sin ella el motor cae a un valor de fábrica
  sin ningún aviso (hallazgo real de la auditoría de seguridad).
"""
from google.genai import types as gtypes

from backend.agente import confirmations
from backend.agente.registry import ToolSpec, registrar
from backend.models.parametros import (
    AdicionalAgregarIn,
    AdicionalEditarIn,
    AdicionalQuitarIn,
    TarifaAgregarIn,
    TarifaEditarIn,
    TarifaQuitarIn,
)
from backend.services import parametros_service

_AVISO_ANTIENCADENAMIENTO = (
    "Usa primero parametros_ver para confirmar el nombre EXACTO — nunca elijas tú "
    "cuál fila es por un nombre parecido ni la uses directo en otra tool en el mismo turno."
)


def _valor_a_fraccion(inductor: str, valor_puntos: float) -> float:
    """El modelo siempre entrega puntos de % (5 = 5%) — nunca la fracción de
    almacenamiento. Convierte aquí, en el handler, nunca en el service ni
    confiando en que el modelo divida mentalmente."""
    if inductor in parametros_service.INDUCTORES_PORCENTAJE:
        return valor_puntos / 100.0
    return valor_puntos


def _ver_parametros(conn, usuario: dict, args: dict) -> dict:
    return parametros_service.obtener_parametros(conn, usuario["empresa_id"])


registrar(ToolSpec(
    nombre="parametros_ver",
    declaracion=gtypes.FunctionDeclaration(
        name="parametros_ver",
        description=(
            "Muestra las tarifas de costo de producción (por categoría de material) y los "
            "adicionales opcionales (por etapa de obra) configurados por el taller. Usa "
            "SIEMPRE esta tool antes de editar/agregar/quitar cualquier tarifa o adicional, "
            "para conocer el nombre EXACTO de la fila — nunca adivines un nombre parecido. "
            "Los valores de inductor 'porcentaje_material' o 'merma_pct' vienen como fracción "
            "(0.05 = 5%) — conviértelos a porcentaje al hablarle al usuario."
        ),
        parameters={"type": "OBJECT", "properties": {}},
    ),
    handler=_ver_parametros,
    es_destructiva=False,
    requiere_capacidad="puede_ver_dashboard",
))


# ─── Tarifas ────────────────────────────────────────────────────────────────

def _tarifa_editar(conn, usuario: dict, args: dict) -> dict:
    try:
        body = TarifaEditarIn(
            material=args.get("material", ""),
            nombre_interno=args.get("nombre_interno", ""),
            nuevo_valor=args.get("nuevo_valor"),
            nuevo_nombre_interno=args.get("nuevo_nombre_interno"),
        )
    except Exception as e:
        return {"error": f"Datos inválidos: {e}"}
    if body.nuevo_valor is None and body.nuevo_nombre_interno is None:
        return {"error": "No diste ningún campo para cambiar (nuevo_valor o nuevo_nombre_interno)"}

    actual, marca = parametros_service.obtener_fila_tarifa(conn, usuario["empresa_id"], body.material, body.nombre_interno)

    nuevo_valor_fraccion = None
    if body.nuevo_valor is not None:
        if actual["inductor"] in parametros_service.INDUCTORES_PORCENTAJE and body.nuevo_valor >= 100:
            return {"error": "Un valor de % debe ser menor a 100 (ej. 5 para 5%)"}
        nuevo_valor_fraccion = _valor_a_fraccion(actual["inductor"], body.nuevo_valor)

    propuestos = {}
    if nuevo_valor_fraccion is not None:
        campo = "valor_pct" if actual["inductor"] in parametros_service.INDUCTORES_PORCENTAJE else "valor_cop"
        propuestos[f"{campo}_propuesto"] = round(nuevo_valor_fraccion * 100, 1) if campo == "valor_pct" else nuevo_valor_fraccion
    if body.nuevo_nombre_interno is not None:
        propuestos["nombre_interno_propuesto"] = body.nuevo_nombre_interno

    fila_mostrada = {
        **actual,
        "valor_pct" if actual["inductor"] in parametros_service.INDUCTORES_PORCENTAJE else "valor_cop": (
            round(actual["valor"] * 100, 1) if actual["inductor"] in parametros_service.INDUCTORES_PORCENTAJE else actual["valor"]
        ),
        **propuestos,
    }
    fila_mostrada.pop("valor", None)

    payload = {
        "material": body.material, "nombre_interno": body.nombre_interno,
        "nuevo_valor": nuevo_valor_fraccion, "nuevo_nombre_interno": body.nuevo_nombre_interno,
        "marca_esperada": marca,
    }
    propuesta = confirmations.crear_propuesta(
        conn, usuario, herramienta="parametros_tarifa_editar", payload=payload,
        filas_afectadas=[fila_mostrada], es_destructiva=False,
    )
    return {
        "propuesta_creada": propuesta,
        "aviso_para_ti": (
            "Esta tarifa alimenta el cálculo de TODA cotización futura de este material — "
            "muéstrale al usuario el valor actual y el propuesto antes de que decida. Tú "
            "NUNCA puedes confirmar esto por tu cuenta."
        ),
    }


def _confirmar_tarifa_editar(conn, usuario: dict, payload: dict) -> dict:
    resultado = parametros_service.editar_tarifa(
        conn, usuario, material=payload["material"], nombre_interno=payload["nombre_interno"],
        nuevo_valor=payload.get("nuevo_valor"), nuevo_nombre_interno=payload.get("nuevo_nombre_interno"),
        marca_esperada=payload.get("marca_esperada"), metadata_extra={"origen": "agente"},
    )
    return {"tarifa_editada": resultado}


registrar(ToolSpec(
    nombre="parametros_tarifa_editar",
    declaracion=gtypes.FunctionDeclaration(
        name="parametros_tarifa_editar",
        description=(
            "Prepara la edición de una fila de tarifa existente (su valor y/o su nombre). "
            "Si la fila es de tipo porcentaje (inductor porcentaje_material o merma_pct, "
            "revisa con parametros_ver), pasa nuevo_valor como el número de por ciento tal "
            "cual lo diría una persona (5 para 5%) — NUNCA la fracción decimal (0.05); la "
            f"tool hace esa conversión. NUNCA la ejecuta de inmediato. {_AVISO_ANTIENCADENAMIENTO}"
        ),
        parameters={
            "type": "OBJECT",
            "properties": {
                "material": {"type": "STRING", "enum": list(parametros_service.CATEGORIAS_MATERIAL)},
                "nombre_interno": {"type": "STRING", "description": "nombre EXACTO tal como aparece en parametros_ver"},
                "nuevo_valor": {"type": "NUMBER", "description": "COP si no es %; puntos de % (5=5%) si sí es %"},
                "nuevo_nombre_interno": {"type": "STRING"},
            },
            "required": ["material", "nombre_interno"],
        },
    ),
    handler=_tarifa_editar,
    es_destructiva=False,
    requiere_capacidad="puede_ver_dashboard",
    handler_confirmar=_confirmar_tarifa_editar,
))


def _tarifa_agregar(conn, usuario: dict, args: dict) -> dict:
    try:
        body = TarifaAgregarIn(
            material=args.get("material", ""),
            nombre_interno=args.get("nombre_interno", ""),
            inductor=args.get("inductor", ""),
            valor=args.get("valor", 0),
            etiqueta_pdf=args.get("etiqueta_pdf") or "",
        )
    except Exception as e:
        return {"error": f"Datos inválidos: {e}"}

    valor_fraccion = _valor_a_fraccion(body.inductor, body.valor)
    campo = "valor_pct" if body.inductor in parametros_service.INDUCTORES_PORCENTAJE else "valor_cop"
    fila_mostrada = {
        "material": body.material, "nombre_interno": body.nombre_interno, "inductor": body.inductor,
        campo: round(valor_fraccion * 100, 1) if campo == "valor_pct" else valor_fraccion,
    }
    payload = {
        "material": body.material, "nombre_interno": body.nombre_interno, "inductor": body.inductor,
        "valor": valor_fraccion, "etiqueta_pdf": body.etiqueta_pdf,
    }
    propuesta = confirmations.crear_propuesta(
        conn, usuario, herramienta="parametros_tarifa_agregar", payload=payload,
        filas_afectadas=[fila_mostrada], es_destructiva=False,
    )
    return {
        "propuesta_creada": propuesta,
        "aviso_para_ti": (
            "Esto agrega una fila de costo NUEVA que se sumará a TODA cotización futura de "
            "este material — muéstrale al usuario los datos exactos antes de que decida. Tú "
            "NUNCA puedes confirmar esto por tu cuenta."
        ),
    }


def _confirmar_tarifa_agregar(conn, usuario: dict, payload: dict) -> dict:
    resultado = parametros_service.agregar_tarifa(
        conn, usuario, material=payload["material"], nombre_interno=payload["nombre_interno"],
        inductor=payload["inductor"], valor=payload["valor"], etiqueta_pdf=payload.get("etiqueta_pdf", ""),
        metadata_extra={"origen": "agente"},
    )
    return {"tarifa_agregada": resultado}


registrar(ToolSpec(
    nombre="parametros_tarifa_agregar",
    declaracion=gtypes.FunctionDeclaration(
        name="parametros_tarifa_agregar",
        description=(
            "Prepara agregar una fila de tarifa NUEVA a una categoría de material. "
            "'inductor' es un catálogo CERRADO de 7 valores — nunca inventes uno nuevo, el "
            "motor de cálculo solo sabe interpretar exactamente esos 7. Si eliges "
            "porcentaje_material o merma_pct, pasa 'valor' como puntos de % (5 para 5%), "
            "nunca la fracción. NUNCA ejecuta de inmediato: siempre crea una propuesta, "
            "incluso si el usuario ya te dio todos los datos en un solo mensaje."
        ),
        parameters={
            "type": "OBJECT",
            "properties": {
                "material": {"type": "STRING", "enum": list(parametros_service.CATEGORIAS_MATERIAL)},
                "nombre_interno": {"type": "STRING", "description": "nombre nuevo, no puede repetir uno existente en esa categoría"},
                "inductor": {"type": "STRING", "enum": list(parametros_service.INDUCTORES_VALIDOS)},
                "valor": {"type": "NUMBER", "description": "COP si no es %; puntos de % (5=5%) si sí es %"},
            },
            "required": ["material", "nombre_interno", "inductor", "valor"],
        },
    ),
    handler=_tarifa_agregar,
    es_destructiva=False,
    requiere_capacidad="puede_ver_dashboard",
    handler_confirmar=_confirmar_tarifa_agregar,
))


def _tarifa_quitar(conn, usuario: dict, args: dict) -> dict:
    try:
        body = TarifaQuitarIn(material=args.get("material", ""), nombre_interno=args.get("nombre_interno", ""))
    except Exception as e:
        return {"error": f"Datos inválidos: {e}"}

    actual, marca = parametros_service.obtener_fila_tarifa(conn, usuario["empresa_id"], body.material, body.nombre_interno)
    campo = "valor_pct" if actual["inductor"] in parametros_service.INDUCTORES_PORCENTAJE else "valor_cop"
    fila_mostrada = {**actual, campo: round(actual["valor"] * 100, 1) if campo == "valor_pct" else actual["valor"]}
    fila_mostrada.pop("valor", None)

    payload = {"material": body.material, "nombre_interno": body.nombre_interno, "marca_esperada": marca}
    propuesta = confirmations.crear_propuesta(
        conn, usuario, herramienta="parametros_tarifa_quitar", payload=payload,
        filas_afectadas=[fila_mostrada], es_destructiva=True,
    )
    return {
        "propuesta_creada": propuesta,
        "aviso_para_ti": (
            "Esto quita una fila de costo de TODA cotización futura de este material. Dile al "
            "usuario que revise la tarjeta de confirmación antes de decidir. Tú NUNCA puedes "
            "confirmar ni ejecutar esto por tu cuenta."
        ),
    }


def _confirmar_tarifa_quitar(conn, usuario: dict, payload: dict) -> dict:
    resultado = parametros_service.quitar_tarifa(
        conn, usuario, material=payload["material"], nombre_interno=payload["nombre_interno"],
        marca_esperada=payload.get("marca_esperada"), metadata_extra={"origen": "agente"},
    )
    return {"tarifa_quitada": resultado}


registrar(ToolSpec(
    nombre="parametros_tarifa_quitar",
    declaracion=gtypes.FunctionDeclaration(
        name="parametros_tarifa_quitar",
        description=(
            "Prepara quitar una fila de tarifa existente. Si es la única fila de % de merma "
            "de esa categoría, la confirmación fallará explicando por qué — no se puede "
            "borrar la única referencia de merma de un material, edítala en vez de borrarla. "
            f"NUNCA la ejecuta de inmediato. {_AVISO_ANTIENCADENAMIENTO}"
        ),
        parameters={
            "type": "OBJECT",
            "properties": {
                "material": {"type": "STRING", "enum": list(parametros_service.CATEGORIAS_MATERIAL)},
                "nombre_interno": {"type": "STRING"},
            },
            "required": ["material", "nombre_interno"],
        },
    ),
    handler=_tarifa_quitar,
    es_destructiva=True,
    requiere_capacidad="puede_ver_dashboard",
    handler_confirmar=_confirmar_tarifa_quitar,
))


# ─── Adicionales ────────────────────────────────────────────────────────────

def _adicional_editar(conn, usuario: dict, args: dict) -> dict:
    try:
        body = AdicionalEditarIn(
            concepto=args.get("concepto", ""), nuevo_concepto=args.get("nuevo_concepto"),
            unidad=args.get("unidad"), terminada=args.get("terminada"), acabados=args.get("acabados"),
            estructura=args.get("estructura"), comercial=args.get("comercial"),
        )
    except Exception as e:
        return {"error": f"Datos inválidos: {e}"}

    actual, marca = parametros_service.obtener_fila_adicional(conn, usuario["empresa_id"], body.concepto)
    cambios = body.model_dump(exclude={"concepto"}, exclude_unset=True, exclude_none=True)
    if not cambios:
        return {"error": "No diste ningún campo para cambiar"}

    propuestos = {}
    for campo in ("unidad", "terminada", "acabados", "estructura", "comercial"):
        if campo in cambios:
            propuestos[f"{campo}_propuesto"] = cambios[campo]
    if "nuevo_concepto" in cambios:
        propuestos["concepto_propuesto"] = cambios["nuevo_concepto"]

    payload = {"concepto": body.concepto, **{k: v for k, v in cambios.items()}, "marca_esperada": marca}
    propuesta = confirmations.crear_propuesta(
        conn, usuario, herramienta="parametros_adicional_editar", payload=payload,
        filas_afectadas=[{**actual, **propuestos}], es_destructiva=False,
    )
    return {
        "propuesta_creada": propuesta,
        "aviso_para_ti": (
            "Muéstrale al usuario el valor actual y el propuesto de cada campo antes de que "
            "decida. Tú NUNCA puedes confirmar esto por tu cuenta."
        ),
    }


def _confirmar_adicional_editar(conn, usuario: dict, payload: dict) -> dict:
    concepto = payload.pop("concepto")
    marca_esperada = payload.pop("marca_esperada", None)
    resultado = parametros_service.editar_adicional(
        conn, usuario, concepto=concepto, marca_esperada=marca_esperada,
        metadata_extra={"origen": "agente"}, **payload,
    )
    return {"adicional_editado": resultado}


registrar(ToolSpec(
    nombre="parametros_adicional_editar",
    declaracion=gtypes.FunctionDeclaration(
        name="parametros_adicional_editar",
        description=(
            "Prepara la edición de un adicional existente (concepto, unidad, o cualquiera de "
            "sus 4 precios por etapa de obra: terminada, acabados, estructura, comercial). "
            f"NUNCA la ejecuta de inmediato. {_AVISO_ANTIENCADENAMIENTO}"
        ),
        parameters={
            "type": "OBJECT",
            "properties": {
                "concepto": {"type": "STRING", "description": "concepto EXACTO tal como aparece en parametros_ver"},
                "nuevo_concepto": {"type": "STRING"},
                "unidad": {"type": "STRING"},
                "terminada": {"type": "NUMBER"},
                "acabados": {"type": "NUMBER"},
                "estructura": {"type": "NUMBER"},
                "comercial": {"type": "NUMBER"},
            },
            "required": ["concepto"],
        },
    ),
    handler=_adicional_editar,
    es_destructiva=False,
    requiere_capacidad="puede_ver_dashboard",
    handler_confirmar=_confirmar_adicional_editar,
))


def _adicional_agregar(conn, usuario: dict, args: dict) -> dict:
    try:
        body = AdicionalAgregarIn(
            concepto=args.get("concepto", ""), unidad=args.get("unidad", ""),
            terminada=args.get("terminada", 0), acabados=args.get("acabados", 0),
            estructura=args.get("estructura", 0), comercial=args.get("comercial", 0),
        )
    except Exception as e:
        return {"error": f"Datos inválidos: {e}"}

    payload = body.model_dump()
    propuesta = confirmations.crear_propuesta(
        conn, usuario, herramienta="parametros_adicional_agregar", payload=payload,
        filas_afectadas=[payload], es_destructiva=False,
    )
    return {
        "propuesta_creada": propuesta,
        "aviso_para_ti": (
            "Esto agrega un adicional NUEVO — muéstrale al usuario los datos exactos antes de "
            "que decida. Tú NUNCA puedes confirmar esto por tu cuenta."
        ),
    }


def _confirmar_adicional_agregar(conn, usuario: dict, payload: dict) -> dict:
    resultado = parametros_service.agregar_adicional(conn, usuario, metadata_extra={"origen": "agente"}, **payload)
    return {"adicional_agregado": resultado}


registrar(ToolSpec(
    nombre="parametros_adicional_agregar",
    declaracion=gtypes.FunctionDeclaration(
        name="parametros_adicional_agregar",
        description=(
            "Prepara agregar un adicional NUEVO (una línea de costo opcional, ej. 'Fregadero "
            "instalación bajo cubierta') con sus 4 precios por etapa de obra. NUNCA ejecuta de "
            "inmediato: siempre crea una propuesta, incluso si el usuario ya te dio todos los "
            "datos en un solo mensaje."
        ),
        parameters={
            "type": "OBJECT",
            "properties": {
                "concepto": {"type": "STRING"},
                "unidad": {"type": "STRING", "description": "ej. und, ml, viaje, glb"},
                "terminada": {"type": "NUMBER"},
                "acabados": {"type": "NUMBER"},
                "estructura": {"type": "NUMBER"},
                "comercial": {"type": "NUMBER"},
            },
            "required": ["concepto", "unidad", "terminada", "acabados", "estructura", "comercial"],
        },
    ),
    handler=_adicional_agregar,
    es_destructiva=False,
    requiere_capacidad="puede_ver_dashboard",
    handler_confirmar=_confirmar_adicional_agregar,
))


def _adicional_quitar(conn, usuario: dict, args: dict) -> dict:
    try:
        body = AdicionalQuitarIn(concepto=args.get("concepto", ""))
    except Exception as e:
        return {"error": f"Datos inválidos: {e}"}

    actual, marca = parametros_service.obtener_fila_adicional(conn, usuario["empresa_id"], body.concepto)
    payload = {"concepto": body.concepto, "marca_esperada": marca}
    propuesta = confirmations.crear_propuesta(
        conn, usuario, herramienta="parametros_adicional_quitar", payload=payload,
        filas_afectadas=[actual], es_destructiva=True,
    )
    return {
        "propuesta_creada": propuesta,
        "aviso_para_ti": (
            "Dile al usuario que revise la tarjeta de confirmación antes de decidir. Tú NUNCA "
            "puedes confirmar ni ejecutar esto por tu cuenta."
        ),
    }


def _confirmar_adicional_quitar(conn, usuario: dict, payload: dict) -> dict:
    resultado = parametros_service.quitar_adicional(
        conn, usuario, concepto=payload["concepto"], marca_esperada=payload.get("marca_esperada"),
        metadata_extra={"origen": "agente"},
    )
    return {"adicional_quitado": resultado}


registrar(ToolSpec(
    nombre="parametros_adicional_quitar",
    declaracion=gtypes.FunctionDeclaration(
        name="parametros_adicional_quitar",
        description=(
            "Prepara quitar un adicional existente. NUNCA la ejecuta de inmediato: crea una "
            f"propuesta que el usuario debe confirmar explícitamente. {_AVISO_ANTIENCADENAMIENTO}"
        ),
        parameters={
            "type": "OBJECT",
            "properties": {"concepto": {"type": "STRING", "description": "concepto EXACTO a quitar"}},
            "required": ["concepto"],
        },
    ),
    handler=_adicional_quitar,
    es_destructiva=True,
    requiere_capacidad="puede_ver_dashboard",
    handler_confirmar=_confirmar_adicional_quitar,
))
