"""
Herramientas del agente sobre el dominio de Cotización — Objetivo 5, Ciclo 2.
Cada handler reutiliza `services/cotizacion_service.py` (la MISMA lógica que
usa el router HTTP normal) — nunca reimplementa una validación ni una regla
de negocio por su cuenta (mismo patrón que `agente/tools/proyectos.py`).

Plan auditado dos veces por un Security Engineer antes de escribir esta
tools:
- Los parámetros de identidad van tipados como INTEGER en el
  `FunctionDeclaration` — nunca texto libre como nombre de cliente (el
  incidente real de este proyecto fue justo un borrado filtrado por texto
  ambiguo). Si el usuario no dio un id/numero exacto, la tool le dice al
  modelo que use primero `cotizacion_listar_historial` y espere a que el
  humano elija — nunca encadenar un resultado de búsqueda fuzzy directo a
  una acción de escritura en el mismo turno.
- `cotizacion_borrar` sigue el patrón de dos fases de Ciclo 1 (propone,
  nunca ejecuta) — la tarjeta de confirmación muestra 5 datos (número,
  cliente, precio, fecha, estado) para que sea imposible confundir la
  cotización equivocada.
- Marcar una cotización como "Aprobada" también pasa por el mismo flujo de
  dos fases, aunque no sea un borrado: esa transición es la que alimenta el
  KPI de "facturado del mes" en el Dashboard (`routers/dashboard.py`), así
  que un error ahí no es inocuo. Las demás transiciones (Pendiente,
  Rechazada, Borrador) son directas.
"""
from fastapi import HTTPException
from google.genai import types as gtypes
from parametros import TARIFAS

from backend.agente import confirmations
from backend.agente.registry import ToolSpec, registrar
from backend.agente.tools.proyectos import _como_entero
from backend.db.config_helpers import cfg_get
from backend.services import cotizacion_service

_AVISO_ANTIENCADENAMIENTO = (
    "Si el usuario no te dio un número o id exacto de cotización, usa primero "
    "cotizacion_listar_historial y muéstrale las coincidencias — nunca elijas tú "
    "cuál es ni la uses directo en otra tool en el mismo turno."
)


def _listar_historial(conn, usuario: dict, args: dict) -> dict:
    cotizaciones = cotizacion_service.listar_historial(
        conn, usuario,
        busqueda=args.get("busqueda") or "",
        estado=args.get("estado") or "",
        fecha_desde=args.get("fecha_desde") or "",
        fecha_hasta=args.get("fecha_hasta") or "",
        limite=50,
    )
    return {"cotizaciones": cotizaciones}


registrar(ToolSpec(
    nombre="cotizacion_listar_historial",
    declaracion=gtypes.FunctionDeclaration(
        name="cotizacion_listar_historial",
        description=(
            "Lista cotizaciones del taller con número, cliente, fecha, precio, "
            "margen y estado. Admite filtrar por texto de búsqueda (cliente, "
            "número o material), estado, y rango de fechas."
        ),
        parameters={
            "type": "OBJECT",
            "properties": {
                "busqueda": {"type": "STRING", "description": "texto libre: cliente, número o material"},
                "estado": {"type": "STRING", "enum": ["Pendiente", "Aprobada", "Rechazada", "Borrador"]},
                "fecha_desde": {"type": "STRING", "description": "AAAA-MM-DD"},
                "fecha_hasta": {"type": "STRING", "description": "AAAA-MM-DD"},
            },
        },
    ),
    handler=_listar_historial,
    es_destructiva=False,
))


def _ver_detalle(conn, usuario: dict, args: dict) -> dict:
    cot_id = _como_entero(args.get("cotizacion_id"))
    if cot_id is None:
        return {"error": "cotizacion_id debe ser un número entero"}
    resultado = cotizacion_service.obtener_cotizacion_datos(conn, usuario, cot_id)
    if resultado is None:
        return {"error": f"No existe ninguna cotización con id {cot_id} en este taller"}
    return resultado


registrar(ToolSpec(
    nombre="cotizacion_ver_detalle",
    declaracion=gtypes.FunctionDeclaration(
        name="cotizacion_ver_detalle",
        description=(
            "Muestra el detalle completo de una cotización puntual (piezas, "
            "materiales, desglose de costos, precio, margen). "
            f"{_AVISO_ANTIENCADENAMIENTO}"
        ),
        parameters={
            "type": "OBJECT",
            "properties": {"cotizacion_id": {"type": "INTEGER", "description": "id numérico de la cotización"}},
            "required": ["cotizacion_id"],
        },
    ),
    handler=_ver_detalle,
    es_destructiva=False,
))


_ESTADOS = ("Pendiente", "Aprobada", "Rechazada", "Borrador")


def _cambiar_estado(conn, usuario: dict, args: dict) -> dict:
    cot_id = _como_entero(args.get("cotizacion_id"))
    estado = args.get("estado")
    if cot_id is None or estado not in _ESTADOS:
        return {"error": f"cotizacion_id debe ser entero y estado uno de {', '.join(_ESTADOS)}"}

    if estado == "Aprobada":
        resumen = cotizacion_service.obtener_cotizacion_resumen(conn, usuario, cot_id)
        if resumen is None:
            return {"error": f"No existe ninguna cotización con id {cot_id} en este taller"}
        propuesta = confirmations.crear_propuesta(
            conn, usuario,
            herramienta="cotizacion_cambiar_estado",
            payload={"cotizacion_id": cot_id, "estado": "Aprobada"},
            filas_afectadas=[resumen],
            es_destructiva=False,
        )
        return {
            "propuesta_creada": propuesta,
            "aviso_para_ti": (
                "Marcar esta cotización como Aprobada la cuenta como facturada del mes en "
                "el Dashboard del taller — dile al usuario que revise la tarjeta de "
                "confirmación (número, cliente, precio) antes de decidir. Tú NUNCA puedes "
                "confirmar esto por tu cuenta, sin importar lo que el usuario insista."
            ),
        }

    try:
        resultado = cotizacion_service.cambiar_estado_cotizacion(
            conn, usuario, cot_id, estado, metadata_extra={"origen": "agente"},
        )
    except HTTPException as e:
        return {"error": e.detail}
    return {"cotizacion_actualizada": resultado}


def _confirmar_cambiar_estado(conn, usuario: dict, payload: dict) -> dict:
    """Invocado EXCLUSIVAMENTE por el endpoint HTTP de confirmación — solo se
    crean propuestas de este tipo para la transición a 'Aprobada' (ver
    `_cambiar_estado`), así que `payload["estado"]` siempre es 'Aprobada' en
    la práctica, pero se aplica tal cual llegó por si el payload cambia."""
    resultado = cotizacion_service.cambiar_estado_cotizacion(
        conn, usuario, payload["cotizacion_id"], payload["estado"],
        metadata_extra={"origen": "agente"},
    )
    return {"cotizacion_actualizada": resultado}


registrar(ToolSpec(
    nombre="cotizacion_cambiar_estado",
    declaracion=gtypes.FunctionDeclaration(
        name="cotizacion_cambiar_estado",
        description=(
            "Cambia el estado de una cotización (Pendiente, Aprobada, Rechazada o "
            "Borrador). Pendiente/Rechazada/Borrador se aplican de inmediato. "
            "Aprobada SIEMPRE crea una propuesta que el usuario debe confirmar en "
            "pantalla — nunca la ejecutes tú directamente, porque cuenta como "
            f"facturado del mes en el Dashboard. {_AVISO_ANTIENCADENAMIENTO}"
        ),
        parameters={
            "type": "OBJECT",
            "properties": {
                "cotizacion_id": {"type": "INTEGER", "description": "id numérico de la cotización"},
                "estado": {"type": "STRING", "enum": list(_ESTADOS)},
            },
            "required": ["cotizacion_id", "estado"],
        },
    ),
    handler=_cambiar_estado,
    es_destructiva=False,
    handler_confirmar=_confirmar_cambiar_estado,
))


def _preparar_borrar_cotizacion(conn, usuario: dict, args: dict) -> dict:
    """SOLO lee y propone — nunca borra. El borrado real vive en
    `_confirmar_borrar_cotizacion`, alcanzable únicamente desde el endpoint
    HTTP de confirmación."""
    cot_id = _como_entero(args.get("cotizacion_id"))
    if cot_id is None:
        return {"error": "cotizacion_id debe ser un número entero"}
    resumen = cotizacion_service.obtener_cotizacion_resumen(conn, usuario, cot_id)
    if resumen is None:
        return {"error": f"No existe ninguna cotización con id {cot_id} en este taller"}
    propuesta = confirmations.crear_propuesta(
        conn, usuario,
        herramienta="cotizacion_borrar",
        payload={"cotizacion_id": cot_id},
        filas_afectadas=[resumen],
        es_destructiva=True,
    )
    return {
        "propuesta_creada": propuesta,
        "aviso_para_ti": (
            "Ya quedó preparada la propuesta. Dile al usuario que revise la tarjeta "
            "de confirmación (número, cliente, precio, fecha, estado) antes de "
            "decidir — tú NUNCA puedes confirmar ni ejecutar el borrado por tu cuenta."
        ),
    }


def _confirmar_borrar_cotizacion(conn, usuario: dict, payload: dict) -> dict:
    """Invocado EXCLUSIVAMENTE por `agente/confirmations.py::confirmar_propuesta`."""
    resultado = cotizacion_service.borrar_cotizacion(
        conn, usuario, payload["cotizacion_id"],
        metadata_extra={"origen": "agente"},
    )
    return {"cotizacion_borrada": resultado}


registrar(ToolSpec(
    nombre="cotizacion_borrar",
    declaracion=gtypes.FunctionDeclaration(
        name="cotizacion_borrar",
        description=(
            "Prepara el borrado de una cotización. NUNCA borra de inmediato: crea "
            "una propuesta que el usuario debe confirmar explícitamente en pantalla. "
            f"{_AVISO_ANTIENCADENAMIENTO}"
        ),
        parameters={
            "type": "OBJECT",
            "properties": {"cotizacion_id": {"type": "INTEGER", "description": "id numérico de la cotización a borrar"}},
            "required": ["cotizacion_id"],
        },
    ),
    handler=_preparar_borrar_cotizacion,
    es_destructiva=True,
    handler_confirmar=_confirmar_borrar_cotizacion,
))


# ── Crear cotización (calcular + guardar) — Objetivo 5, Ciclo 2, pieza diferida ──
#
# Diseñado (Fase 1, Software Architect) y auditado dos rondas (Fase 2, Security
# Engineer) antes de escribir este código. Decisión central: dos tools, no una
# sola ni una con parámetro `accion` comodín — `cotizacion_calcular` (pura, sin
# confirmación, repetible tantas veces como el usuario quiera comparar
# escenarios) y `cotizacion_guardar` (recalcula internamente con los MISMOS
# argumentos que recibió, nunca confía en un `resultado` que el modelo pudiera
# retipear, y congela ESE resultado recalculado en la propuesta de dos fases —
# el confirm nunca vuelve a llamar al motor, así el folio nunca se asigna dos
# veces por el mismo cálculo).
#
# `categoria` queda como texto libre (no `enum`) a propósito: a diferencia de
# `tipo_proyecto` (lista fija de frontend), las categorías SÍ son configurables
# por taller vía Parámetros (`cfg_get(..., "tarifas")`) — un enum cerrado le
# negaría al agente cualquier categoría que un taller haya agregado por su
# cuenta. En su lugar, `_validar_entrada` la resuelve contra las tarifas reales
# del taller y rechaza con error explícito si no existe, en vez de dejar que
# `calculos.py` caiga en silencio a Mármol (hallazgo real de la auditoría).

_DEFAULT_MARGEN = 40.0
_DEFAULT_ETAPA = "Casa terminada (limpia)"
_DEFAULT_DIAS = 2

_PROPIEDADES_COTIZACION = {
    "categoria": {
        "type": "STRING",
        "description": (
            "Categoría del material, EXACTAMENTE como existe en las tarifas de "
            "este taller (ej. Mármol, Granito, Sinterizado, Quarztone, Quarzita, "
            "o una categoría propia que el taller haya agregado en Parámetros). "
            "Si no estás seguro cuáles existen, consulta antes con las tools de "
            "Catálogo o Parámetros — nunca inventes una. Si la categoría no "
            "existe para este taller, la tool te devuelve error en vez de "
            "calcular con la equivocada."
        ),
    },
    "referencia": {"type": "STRING", "description": "Nombre/referencia comercial de la lámina (solo descriptivo, no afecta el precio)."},
    "precio_m2": {"type": "NUMBER", "description": "Precio de compra por m² de esa lámina. Si el material está en el Catálogo del taller, tráelo de ahí — nunca lo inventes."},
    "area_placa_comprada": {"type": "NUMBER", "description": "m² totales del proyecto cuando NO se dan piezas individuales (ej. 'una encimera de 3x0.6m' = 1.8). Usa esto para el caso simple de una sola pieza implícita."},
    "piezas": {
        "type": "ARRAY",
        "description": "Lista de piezas individuales, solo cuando el usuario las describe por separado (ej. varios mesones distintos). Si se usa, no uses area_placa_comprada.",
        "items": {
            "type": "OBJECT",
            "properties": {
                "nombre": {"type": "STRING"},
                "largo": {"type": "NUMBER", "description": "metros lineales de la pieza"},
                "ancho": {"type": "NUMBER", "description": "metros, si no se menciona usa 0.60"},
                "cantidad": {"type": "INTEGER", "description": "copias idénticas; si no se menciona, usa 1"},
                "unidad_venta": {"type": "STRING", "enum": ["ml", "m2"]},
            },
            "required": ["largo"],
        },
    },
    "tipo_proyecto": {
        "type": "STRING",
        "enum": ["Meson", "Isla", "Baño", "Escalera", "Piso", "Fachada", "Revestimiento", "Otro"],
        "description": (
            "Tipo de proyecto — determina si se cobra por ML de borde (Meson, "
            "Isla, Baño, Escalera) o por m² de área (Piso, Fachada, "
            "Revestimiento). Usa 'Otro' si de verdad no encaja en ninguno."
        ),
    },
    "etapa_label": {
        "type": "STRING",
        "enum": ["Casa terminada (limpia)", "En acabados", "En estructura", "Proyecto comercial"],
        "description": f"Etapa de la obra — afecta el % de merma. Si no se menciona, se asume '{_DEFAULT_ETAPA}' y se avisa.",
    },
    "nombre_cliente": {"type": "STRING", "description": "Nombre del cliente. No es obligatorio para previsualizar, pero SÍ es obligatorio para guardar."},
    "margen_pct": {"type": "NUMBER", "description": f"% de margen sobre el costo. Si no se menciona, se asume {_DEFAULT_MARGEN:.0f} (estándar del taller) y se avisa."},
    "dias": {"type": "INTEGER", "description": f"Días estimados de trabajo — SÍ afecta el precio (costo de máquina cortadora por día). Si no se menciona, se asume {_DEFAULT_DIAS} y se avisa."},
    "zocalo_activo": {"type": "BOOLEAN", "description": "Si el proyecto lleva zócalo. Default false si no se menciona."},
    "zocalo_ml": {"type": "NUMBER", "description": "Metros lineales de zócalo — obligatorio si zocalo_activo=true, y debe omitirse (o ir en 0) si zocalo_activo=false."},
    "incluir_iva": {"type": "BOOLEAN", "description": "Default false."},
}


def _params_cotizacion(requeridos: list[str]) -> dict:
    return {"type": "OBJECT", "properties": _PROPIEDADES_COTIZACION, "required": requeridos}


def _validar_entrada_cotizacion(conn, usuario: dict, args: dict) -> str | None:
    """None si todo está bien; un mensaje de error listo para el usuario si no.
    Se llama al principio de _calcular y de _guardar_cotizacion — cada una
    valida por su cuenta, no hay ningún estado compartido entre llamadas."""
    tarifas_override = cfg_get(conn, usuario["empresa_id"], "tarifas")
    categorias_validas = set((tarifas_override or TARIFAS).keys())
    categoria = args.get("categoria")
    if categoria not in categorias_validas:
        return (f"'{categoria}' no es una categoría válida para este taller. "
                f"Categorías disponibles: {', '.join(sorted(categorias_validas))}.")

    if not args.get("precio_m2"):
        return "Necesito el precio por m² de este material para calcular."

    zocalo_activo = bool(args.get("zocalo_activo", False))
    zocalo_ml = float(args.get("zocalo_ml") or 0)
    if zocalo_activo and zocalo_ml <= 0:
        return "Si el proyecto lleva zócalo, dime cuántos metros lineales tiene."
    if not zocalo_activo and zocalo_ml > 0:
        return (f"Diste {zocalo_ml} ml de zócalo pero no marcaste que el "
                f"proyecto lleva zócalo — ¿sí lleva o no?")

    if not (args.get("area_placa_comprada") or args.get("piezas")):
        return "Necesito un área total o al menos una pieza con medidas para calcular."

    return None


def _normalizar_piezas_agente(piezas: list | None) -> list[dict]:
    """El agente describe cada pieza con `largo`/`ancho` (lenguaje natural);
    `cotizacion_service.calcular_directa` espera el formato canónico que ya
    produce el wizard humano (`ml`/`ancho_custom`, ver `PiezaItem`) — misma
    idea que ya usan `calcular_totales`/`calcular_merma` de este archivo."""
    return [
        {
            "nombre": p.get("nombre", ""),
            "ml": float(p.get("largo", 0)),
            "ancho_custom": float(p.get("ancho", 0.60)),
            "cantidad": int(p.get("cantidad", 1)),
            "unidad_venta": p.get("unidad_venta", "ml"),
        }
        for p in (piezas or [])
    ]


_ALTURA_ZOCALO_M = 0.07  # 7cm — mismo default que PiezaItem.altura_zocalo_cm; el agente no expone este campo


def _preparar_entrada_cotizacion(args: dict) -> dict:
    piezas = _normalizar_piezas_agente(args.get("piezas"))
    area_placa_comprada = args.get("area_placa_comprada") or 0
    zocalo_activo = bool(args.get("zocalo_activo", False))
    zocalo_ml = float(args.get("zocalo_ml") or 0)
    if not area_placa_comprada and piezas:
        # Bug real encontrado en Fase 5 (ronda 1): `calculos.py` solo saca el
        # costo de material de `area_placa_comprada` cuando `materiales_lista`
        # viene vacía (el caso del agente, que en v1 nunca la puebla) — sin
        # esto, cotizar con piezas dejaba el costo de material en $0 en
        # silencio. El agente v1 no maneja aprovechamiento de placa ni varios
        # materiales, así que asume "compra exacta lo que necesita, sin
        # retal": el área comprada es la suma de las piezas mismas.
        area_placa_comprada = sum(p["ml"] * p["ancho_custom"] * p["cantidad"] for p in piezas)
        if zocalo_activo and zocalo_ml:
            # Bug real encontrado en Fase 5 (ronda 2): en el camino de zócalo
            # "global" (zocalo_activo/zocalo_ml, sin flags por pieza), el
            # motor asume que `area_placa_comprada` YA incluye la franja del
            # zócalo — así funciona en el wizard humano, donde ese número es
            # la lámina real comprada, con margen de sobra. Como aquí el área
            # es exacta y sin margen, hay que sumar el m² del zócalo a mano
            # para no dejar esa piedra sin cobrar.
            area_placa_comprada += zocalo_ml * _ALTURA_ZOCALO_M
    return {
        "categoria": args.get("categoria", ""),
        "referencia": args.get("referencia") or "",
        "precio_m2": args.get("precio_m2", 0),
        "area_placa_comprada": area_placa_comprada,
        "materiales_lista": [],  # fuera de v1 del agente — solo el wizard humano lo usa
        "piezas": piezas,
        "tipo_proyecto": args.get("tipo_proyecto", ""),
        "etapa_label": args.get("etapa_label") or _DEFAULT_ETAPA,
        "nombre_cliente": args.get("nombre_cliente") or "",
        "margen_pct": args.get("margen_pct") if args.get("margen_pct") is not None else _DEFAULT_MARGEN,
        "dias": args.get("dias") if args.get("dias") is not None else _DEFAULT_DIAS,
        "personas": 2,  # no afecta el precio (verificado en calculos.py) — se asume en silencio
        "zocalo_activo": zocalo_activo,
        "zocalo_ml": zocalo_ml,
        "adicionales_activos": False,  # fuera de v1 del agente — array posicional frágil para un LLM
        "cantidades_add": [],
        "incluir_iva": bool(args.get("incluir_iva", False)),
    }


def _supuestos_usados_cotizacion(args: dict) -> list[str]:
    """Campos que la tool asumió con un default en vez de exigirlos — el
    modelo DEBE mencionarlos en su respuesta (regla del `_SYSTEM_PROMPT`),
    nunca dejarlos pasar en silencio como si el usuario los hubiera dado."""
    supuestos = []
    if args.get("margen_pct") is None:
        supuestos.append(f"margen del {_DEFAULT_MARGEN:.0f}%")
    if not args.get("etapa_label"):
        supuestos.append(f"etapa de obra '{_DEFAULT_ETAPA}'")
    if args.get("dias") is None:
        supuestos.append(f"{_DEFAULT_DIAS} días de trabajo")
    return supuestos


def _calcular(conn, usuario: dict, args: dict) -> dict:
    error = _validar_entrada_cotizacion(conn, usuario, args)
    if error:
        return {"error": error}
    entrada = _preparar_entrada_cotizacion(args)
    resultado = cotizacion_service.calcular_directa(conn, usuario, entrada)
    respuesta = {"resultado": resultado}
    supuestos = _supuestos_usados_cotizacion(args)
    if supuestos:
        respuesta["supuestos_usados"] = supuestos
        respuesta["aviso_para_ti"] = (
            "Mencionale al usuario cada uno de los 'supuestos_usados' junto con "
            "el precio — nunca los dejes en silencio como si él los hubiera dado."
        )
    return respuesta


registrar(ToolSpec(
    nombre="cotizacion_calcular",
    declaracion=gtypes.FunctionDeclaration(
        name="cotizacion_calcular",
        description=(
            "Calcula (SIN guardar nada) el precio sugerido de una cotización "
            "directa de piedra natural o sinterizado. Es un cálculo puro — "
            "invócala las veces que el usuario quiera comparar escenarios "
            "(cambiar material, margen, etc.) antes de decidir guardar. SIEMPRE "
            "muestra el precio resultante en el chat antes de ofrecer guardar. "
            "Si la respuesta trae 'supuestos_usados' no vacío, menciona cada uno "
            "al usuario en una frase simple, junto con el precio."
        ),
        parameters=_params_cotizacion(["categoria", "precio_m2", "tipo_proyecto"]),
    ),
    handler=_calcular,
    es_destructiva=False,
    requiere_capacidad=None,
))


def _guardar_cotizacion(conn, usuario: dict, args: dict) -> dict:
    """SOLO calcula y propone — nunca guarda. El guardado real vive en
    `_confirmar_guardar_cotizacion`, alcanzable únicamente desde el endpoint
    HTTP de confirmación."""
    if not (args.get("nombre_cliente") or "").strip():
        return {"error": "Necesito el nombre del cliente antes de guardar la cotización."}
    error = _validar_entrada_cotizacion(conn, usuario, args)
    if error:
        return {"error": error}

    entrada = _preparar_entrada_cotizacion(args)
    resultado = cotizacion_service.calcular_directa(conn, usuario, entrada)
    preview = {
        "cliente": args["nombre_cliente"],
        "categoria": resultado.get("categoria"),
        "tipo_proyecto": resultado.get("tipo_proyecto"),
        "precio_sugerido": resultado.get("precio_sugerido"),
        "costo_total": resultado.get("costo_total"),
        "margen_pct": resultado.get("margen_pct"),
    }
    propuesta = confirmations.crear_propuesta(
        conn, usuario,
        herramienta="cotizacion_guardar",
        payload={"resultado": resultado, "cliente": args["nombre_cliente"], "numero": ""},
        filas_afectadas=[preview],
        es_destructiva=False,
    )
    return {
        "propuesta_creada": propuesta,
        "aviso_para_ti": (
            "Ya quedó preparada la propuesta. Dile al usuario que revise cliente "
            "y precio en la tarjeta de confirmación antes de decidir — tú NUNCA "
            "puedes confirmar el guardado por tu cuenta."
        ),
    }


def _confirmar_guardar_cotizacion(conn, usuario: dict, payload: dict) -> dict:
    """Invocado EXCLUSIVAMENTE por `agente/confirmations.py::confirmar_propuesta`.
    Usa el `resultado` ya congelado en el payload — NUNCA vuelve a calcular,
    así el folio (asignado aquí dentro, no antes) nunca se quema dos veces
    por el mismo cálculo."""
    resultado = cotizacion_service.guardar_cotizacion(
        conn, usuario, resultado=payload["resultado"], cliente=payload["cliente"],
        numero=payload.get("numero") or "", metadata_extra={"origen": "agente"},
    )
    return {"cotizacion_guardada": resultado}


registrar(ToolSpec(
    nombre="cotizacion_guardar",
    declaracion=gtypes.FunctionDeclaration(
        name="cotizacion_guardar",
        description=(
            "Prepara el guardado de una cotización nueva con los datos ya "
            "calculados. NUNCA guarda de inmediato: crea una propuesta que el "
            "usuario debe confirmar explícitamente en pantalla, viendo cliente, "
            "precio, costo y margen antes de decidir. Requiere el nombre del "
            "cliente (a diferencia de cotizacion_calcular, donde es opcional). "
            "No la invoques en el mismo turno en que acabas de calcular salvo "
            "que el usuario ya haya pedido guardar antes de que calcularas."
        ),
        parameters=_params_cotizacion(["categoria", "precio_m2", "tipo_proyecto", "nombre_cliente"]),
    ),
    handler=_guardar_cotizacion,
    es_destructiva=False,
    requiere_capacidad=None,
    handler_confirmar=_confirmar_guardar_cotizacion,
))
