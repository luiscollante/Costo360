"""
Herramienta del agente sobre el dominio de Nesting (plano de corte 2D) —
Objetivo 5, Ciclo 2. A diferencia de los demás dominios (Proyectos,
Cotización, Catálogo, Inventario, Retales), Nesting no tiene tabla propia
ni ninguna escritura: `POST /api/nesting/generar` es un cálculo puro y sin
estado (algoritmo Guillotine 2D, `motor_planos.optimizar_corte_2d`) que no
persiste nada en la base de datos. Por eso esta tool NO pasa por el flujo
de confirmación de dos fases — no hay ninguna fila fantasma que evitar,
`registry.py::registrar()` solo exige `handler_confirmar` cuando
`es_destructiva=True` (mismo patrón ya usado por las tools de solo lectura
de otros dominios, ej. `retales_listar`).

Plan auditado por un Security Engineer antes de escribir esta tool — 5
correcciones incorporadas:
1. El SVG que devuelve `optimizar_corte_2d` se descarta a propósito: nunca
   entra al dict que se le devuelve al modelo. Ese dict se reinyecta al
   contexto en cada paso siguiente del turno (`runtime.py`) — meter ahí un
   SVG de cientos de KB quema contexto/dinero, no es solo un problema
   estético. Si la UI quiere mostrar el plano, llama directo a
   `POST /api/nesting/generar` desde el frontend, sin pasar por el modelo.
2. `piezas_fuera` se trunca a las primeras 8 + conteo del resto (mismo
   patrón que ya usa el SVG del motor para "piezas que no caben") — evita
   tanto inflar el contexto en turnos largos como reinyectar texto libre
   sin límite que el usuario controla (nombres de pieza) al modelo.
3. La validación de tamaño/forma vive en `motor_planos.validar_entrada_nesting`,
   compartida con el router HTTP — nunca reimplementada aquí (incluye el
   tope anti-DoS sobre la cantidad de piezas/unidades).
4. `area_libre_m2` viaja en la respuesta ya calculado y redondeado, con un
   `aviso_para_ti` explícito de usarlo literal si se propone `retales_crear`
   — nunca recalcularlo ni redondearlo distinto. La garantía real contra un
   número mal citado sigue siendo la tarjeta de confirmación de
   `retales_crear` (que ya existe, no hace falta ninguna tool nueva para
   "guardar el sobrante como retal").
5. `cantidad` se convierte con `int(...)` directo, NO con el `_como_entero`
   que sí usan otros dominios (`proyectos.py`) — hallazgo real de la Fase 5:
   `validar_entrada_nesting` ya usa `int(p.get("cantidad", 1))` para el tope
   anti-DoS y garantiza que no lanza y da >=1; usar aquí una coerción más
   estricta (que devuelve `None` para un string como `"3"`) abría una
   ventana donde una pieza pasaba la validación contada como N copias pero
   el motor real colocaba menos, sin ningún aviso al modelo.
"""
from google.genai import types as gtypes
from motor_planos import optimizar_corte_2d, validar_entrada_nesting

from backend.agente.registry import ToolSpec, registrar

_MAX_NOMBRES_MOSTRADOS = 8


def _calcular_nesting(conn, usuario: dict, args: dict) -> dict:
    lamina_largo = args.get("lamina_largo")
    lamina_ancho = args.get("lamina_ancho")
    piezas = args.get("piezas")

    error = validar_entrada_nesting(lamina_largo, lamina_ancho, piezas)
    if error:
        return {"error": error}

    piezas_motor = [
        {
            "nombre":   str(p.get("nombre") or f"Pieza {i + 1}"),
            "largo":    float(p["largo"]),
            "ancho":    float(p["ancho"]),
            # int() directo, no _como_entero(): validar_entrada_nesting ya garantizó
            # que esta misma conversión no lanza y da >=1 para cada pieza — usar una
            # coerción más estricta aquí abriría una ventana donde una pieza pasa la
            # validación (contada para el tope anti-DoS) pero el motor real coloca
            # menos copias sin ningún aviso (hallazgo real de la Fase 5).
            "cantidad": int(p.get("cantidad", 1)),
        }
        for i, p in enumerate(piezas)
    ]

    _svg, metricas = optimizar_corte_2d(float(lamina_largo), float(lamina_ancho), piezas_motor)

    area_lamina = metricas["area_placa"]
    area_usada = metricas["area_utilizada"]
    area_libre = round(area_lamina - area_usada, 4)

    piezas_fuera = metricas["piezas_no_caben"]
    piezas_fuera_mostradas = piezas_fuera[:_MAX_NOMBRES_MOSTRADOS]
    if len(piezas_fuera) > _MAX_NOMBRES_MOSTRADOS:
        piezas_fuera_mostradas = piezas_fuera_mostradas + [
            f"(+{len(piezas_fuera) - _MAX_NOMBRES_MOSTRADOS} más)"
        ]

    resultado = {
        "aprovechamiento_pct": round((area_usada / area_lamina * 100) if area_lamina > 0 else 0.0, 2),
        "area_lamina_m2":      round(area_lamina, 4),
        "area_usada_m2":       round(area_usada, 4),
        "area_libre_m2":       area_libre,
        "piezas_colocadas":    metricas["piezas_colocadas"],
        "piezas_fuera":        piezas_fuera_mostradas,
    }
    if area_libre > 0:
        resultado["aviso_para_ti"] = (
            f"Si el usuario quiere guardar el sobrante como retal, usa exactamente "
            f"{area_libre} (area_libre_m2 de esta respuesta) como m2_disponibles al "
            f"proponer retales_crear — nunca lo recalcules ni lo redondees distinto."
        )
    return resultado


registrar(ToolSpec(
    nombre="nesting_calcular",
    declaracion=gtypes.FunctionDeclaration(
        name="nesting_calcular",
        description=(
            "Calcula el plano de corte 2D (nesting) para una lámina de piedra: dado el "
            "tamaño de la lámina y la lista de piezas a cortar, corre el algoritmo de "
            "empaquetado real y devuelve el % de aprovechamiento, cuántas piezas "
            "cupieron y cuáles NO cupieron. SIEMPRE que el usuario pida calcular un "
            "nesting/plano de corte, invoca esta herramienta — NUNCA calcules el "
            "empaquetado ni estimes el % de aprovechamiento tú mismo, ni siquiera para "
            "un caso que parezca simple (pocas piezas, medidas redondas): el algoritmo "
            "real considera rotación de piezas y encaje exacto que un cálculo mental no "
            "puede replicar, y un número inventado puede hacer que el taller crea que le "
            "rinde una lámina que en realidad no le alcanza. Es un cálculo puro y "
            "efímero — no guarda nada en la base de datos, no crea ningún registro, se "
            "puede llamar tantas veces como el usuario quiera probar combinaciones "
            "distintas. El plano visual se muestra directamente en la página de "
            "Nesting; nunca intentes describir ni repetir el dibujo en tu respuesta de "
            "texto, solo las métricas de esta herramienta. Si al usuario le falta dar "
            "una dimensión de la lámina o de alguna pieza, dile explícitamente qué "
            "falta — nunca asumas un valor."
        ),
        parameters={
            "type": "OBJECT",
            "properties": {
                "lamina_largo": {"type": "NUMBER", "description": "Largo de la lámina, en metros"},
                "lamina_ancho": {"type": "NUMBER", "description": "Ancho de la lámina, en metros"},
                "piezas": {
                    "type": "ARRAY",
                    "description": (
                        "Piezas a cortar de esta lámina. Cada una necesita nombre, largo, "
                        "ancho en metros, y cuántas copias idénticas se necesitan."
                    ),
                    "items": {
                        "type": "OBJECT",
                        "properties": {
                            "nombre":   {"type": "STRING", "description": "ej. 'Mesón principal', 'Salpicadero'"},
                            "largo":    {"type": "NUMBER"},
                            "ancho":    {"type": "NUMBER"},
                            "cantidad": {"type": "INTEGER", "description": "Copias idénticas; si no se menciona, usa 1."},
                        },
                        "required": ["nombre", "largo", "ancho"],
                    },
                },
            },
            "required": ["lamina_largo", "lamina_ancho", "piezas"],
        },
    ),
    handler=_calcular_nesting,
    es_destructiva=False,
    requiere_capacidad=None,
))
