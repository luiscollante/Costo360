"""
Normalización de texto para la voz de Cost (ElevenLabs) — convierte el
markdown/formato crudo que genera el modelo en texto hablable: quita marcado
markdown, redacta IDs/timestamps que nunca deberían sonar, y traduce
unidades/moneda del dominio (m², ml, cm, %, montos COP) a su forma hablada.

Diseñado en consulta con un especialista de voz (2026-09-16) a partir de un
bug real reportado por el fundador: "$1.339.000" se escuchaba como "mil
trescientos treinta y nueve" — ElevenLabs no resuelve de forma confiable un
monto con más de un punto de separador de miles cuando se le manda tal cual.
La solución elegida es deletrear el monto completo en palabras (determinista,
no depende del parser interno de un proveedor externo) en vez de solo
reformatear los separadores — ver `cop_a_letras`.

El orden de las 4 etapas de `normalizar_para_voz` importa — ver cada función.
"""
import re

_UNIDADES = [
    "", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve",
    "diez", "once", "doce", "trece", "catorce", "quince", "dieciséis", "diecisiete",
    "dieciocho", "diecinueve", "veinte", "veintiuno", "veintidós", "veintitrés",
    "veinticuatro", "veinticinco", "veintiséis", "veintisiete", "veintiocho", "veintinueve",
]
_DECENAS = {30: "treinta", 40: "cuarenta", 50: "cincuenta", 60: "sesenta", 70: "setenta",
            80: "ochenta", 90: "noventa"}
_CENTENAS = {100: "ciento", 200: "doscientos", 300: "trescientos", 400: "cuatrocientos",
             500: "quinientos", 600: "seiscientos", 700: "setecientos", 800: "ochocientos",
             900: "novecientos"}
_MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto",
          "septiembre", "octubre", "noviembre", "diciembre"]


def _menos_de_mil(n: int, *, apocope: bool = False) -> str:
    """n entre 0 y 999 en palabras. `apocope=True` usa "un"/"veintiún" en vez
    de "uno"/"veintiuno" cuando esta cifra antecede directo a un sustantivo
    (mil, millón, pesos) — regla real del español, no cosmética: "veintiuno
    mil" suena mal, "veintiún mil" es lo correcto."""
    if n <= 0:
        return ""
    if n == 100:
        return "cien"
    if n < 30:
        if apocope and n == 1:
            return "un"
        if apocope and n == 21:
            return "veintiún"
        return _UNIDADES[n]
    if n < 100:
        decena, unidad = divmod(n, 10)
        base = _DECENAS[decena * 10]
        if unidad == 0:
            return base
        palabra_unidad = "un" if (apocope and unidad == 1) else _UNIDADES[unidad]
        return f"{base} y {palabra_unidad}"
    centena, resto = divmod(n, 100)
    base = _CENTENAS[centena * 100]
    if resto == 0:
        return base
    return f"{base} {_menos_de_mil(resto, apocope=apocope)}"


def numero_a_palabras(n: int) -> str:
    """Entero en palabras — sin límite de magnitud real para el dominio
    (montos de cotización nunca llegan a billones). "millón"/"millones" lleva
    "de" delante del sustantivo SOLO cuando es el último grupo hablado antes
    de él (ej. "un millón de pesos" pero "dos millones novecientos catorce
    mil pesos", sin "de", porque ahí "millones" no queda pegado a "pesos")."""
    if n == 0:
        return "cero"
    if n < 0:
        return f"menos {numero_a_palabras(-n)}"
    millones, resto = divmod(n, 1_000_000)
    miles, unidades = divmod(resto, 1000)
    es_ultimo_grupo_millones = bool(millones) and not miles and not unidades
    partes = []
    if millones:
        prefijo = "un" if millones == 1 else _menos_de_mil(millones, apocope=True)
        sufijo = "millón" if millones == 1 else "millones"
        de = " de" if es_ultimo_grupo_millones else ""
        partes.append(f"{prefijo} {sufijo}{de}")
    if miles:
        if miles == 1:
            partes.append("mil")
        else:
            partes.append(f"{_menos_de_mil(miles, apocope=True)} mil")
    if unidades:
        partes.append(_menos_de_mil(unidades, apocope=True))
    return " ".join(partes)


def cop_a_letras(monto: int) -> str:
    """Monto entero en pesos colombianos, deletreado completo — ver el
    docstring del módulo para la razón de deletrear en vez de reformatear
    separadores."""
    return f"{numero_a_palabras(monto)} pesos"


def _fecha_hablada(anio: str, mes: str, dia: str) -> str:
    try:
        nombre_mes = _MESES[int(mes) - 1]
    except (ValueError, IndexError):
        return f"{dia}/{mes}/{anio}"
    return f"{int(dia)} de {nombre_mes} de {anio}"


def _stage_markdown(texto: str) -> str:
    """Markdown crudo -> texto plano hablable. Va primero: los marcadores
    pueden quedar pegados a montos/unidades (ej. "**$2.914.000**") y romper
    las regex de la etapa de unidades si no se limpian antes."""
    texto = re.sub(r"(?m)^#{1,6}\s*", "", texto)
    texto = re.sub(r"\*\*(.+?)\*\*", r"\1", texto)
    texto = re.sub(r"__(.+?)__", r"\1", texto)
    texto = re.sub(r"(?<!\w)\*(.+?)\*(?!\w)", r"\1", texto)
    texto = re.sub(r"(?<!\w)_(.+?)_(?!\w)", r"\1", texto)
    texto = re.sub(r"`([^`]+)`", r"\1", texto)
    texto = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", texto)
    texto = re.sub(r"(?m)^\s*>\s?", "", texto)
    texto = re.sub(r"(?m)^\s*[-*_]{3,}\s*$", "", texto)
    # Listas (con o sin marcador explícito): cada línea pasa a ser su propia
    # oración con punto final — es lo que le da a ElevenLabs una pausa real
    # entre ítems en vez de leerlos pegados.
    lineas = []
    for linea in texto.split("\n"):
        m = re.match(r"^\s*(?:\d+[.)]|[-*•])\s+(.*)$", linea)
        contenido = (m.group(1) if m else linea).rstrip()
        if contenido and contenido[-1] not in ".?!:":
            contenido += "."
        lineas.append(contenido)
    texto = "\n".join(lineas)
    # Guion/raya usado como separador dentro de una línea (ej. "Nombre –
    # $precio") -> coma, para que suene como una pausa real y no como un
    # signo "menos" suelto. Va DESPUÉS del recorte de viñetas de arriba para
    # no comerse el guion inicial de una lista antes de que ese paso lo lea.
    texto = re.sub(r"\s[-–—]\s", ", ", texto)
    return texto


def _stage_ids_fechas(texto: str) -> str:
    """Antes de las reglas numéricas de la etapa C: un UUID o timestamp trae
    dígitos y guiones que esas regex podrían intentar "leer" parcialmente si
    se procesan después."""
    texto = re.sub(
        r"\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b",
        "", texto,
    )
    texto = re.sub(
        r"\b(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?\b",
        lambda m: _fecha_hablada(*m.groups()), texto,
    )
    texto = re.sub(r"\b(\d{4})-(\d{2})-(\d{2})\b", lambda m: _fecha_hablada(*m.groups()), texto)
    return texto


_RE_DINERO = re.compile(r"\$\s?(\d{1,3}(?:\.\d{3})+|\d+)\b")


def _sub_dinero(m: re.Match) -> str:
    try:
        monto = int(m.group(1).replace(".", ""))
    except ValueError:
        return m.group(0)
    return cop_a_letras(monto)


def _stage_unidades(texto: str) -> str:
    """Orden interno crítico: dinero primero (consume sus propios puntos de
    miles antes de que la regla de decimales residuales los vea), "/m²" antes
    que la cantidad bare de m² (para no dejar un "por" suelto), y los
    decimales residuales al final — ver el docstring del módulo."""
    texto = _RE_DINERO.sub(_sub_dinero, texto)
    # "COP" suele quedar pegado justo después de un monto ya convertido a
    # palabras ("...pesos COP/m²") — "pesos" ya dice la moneda, "COP" ahí es
    # puro ruido que ElevenLabs leería como la palabra inglesa "cop".
    texto = re.sub(r"\bCOP\b", "", texto)
    texto = re.sub(r"/\s*m[²2]\b", " por metro cuadrado", texto)
    texto = re.sub(r"(\d+(?:[.,]\d+)?)\s*m[²2]\b", r"\1 metros cuadrados", texto)
    texto = re.sub(r"(\d+(?:[.,]\d+)?)\s*ml\b", r"\1 metros lineales", texto)
    texto = re.sub(r"(\d+(?:[.,]\d+)?)\s*cm\b", r"\1 centímetros", texto)
    texto = re.sub(r"\bund\b", "unidad", texto)
    texto = re.sub(r"\bglb\b", "global", texto)
    texto = re.sub(r"(\d+(?:[.,]\d+)?)\s*%", r"\1 por ciento", texto)
    # Decimales sueltos que sobrevivieron a las reglas de arriba (ej. "3.4"
    # de un m² ya expandido). Los guardas evitan comerse un número agrupado
    # en miles sin "$" delante (ej. "1.339.000" bare) — se deja intacto en
    # vez de partirlo a la mitad.
    texto = re.sub(r"(?<!\.)\b(\d+)\.(\d+)\b(?!\.\d)", r"\1 punto \2", texto)
    return texto


def _stage_limpieza(texto: str) -> str:
    # Salto de línea después de una línea ya puntuada -> un espacio (sin
    # duplicar el punto); salto de línea "suelto" -> punto + espacio.
    texto = re.sub(r"([.?!:])\s*\n+\s*", r"\1 ", texto)
    texto = re.sub(r"\s*\n+\s*", ". ", texto)
    texto = re.sub(r"[ \t]+", " ", texto)
    texto = re.sub(r"\.{2,}", ".", texto)
    texto = re.sub(r"\s+([.,;:?!])", r"\1", texto)
    return texto.strip()


def normalizar_para_voz(texto: str) -> str:
    """Convierte el texto crudo (markdown) que genera Cost en texto listo
    para mandarle a ElevenLabs. El orden de las 4 etapas importa — ver el
    docstring del módulo y de cada etapa."""
    texto = _stage_markdown(texto)
    texto = _stage_ids_fechas(texto)
    texto = _stage_unidades(texto)
    texto = _stage_limpieza(texto)
    return texto
