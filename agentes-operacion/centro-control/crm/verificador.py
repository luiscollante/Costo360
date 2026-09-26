"""Verificador de cifras: toda cifra de la respuesta debe salir de un
resultado de herramienta de métricas de ESE turno (o del mensaje del
usuario). Lo que no tenga rastro se marca de forma visible; nunca se borra ni
se corrige a mano.
"""
import re

_MESES = 'enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre'
# Fechas y horas: no son cifras de negocio.
_FECHA = re.compile(
    r'\b\d{4}-\d{2}(?:-\d{2})?(?:T\d{2}:\d{2}(?::\d{2})?)?\b|\b\d{1,2}:\d{2}\b|\b\d{1,2}/\d{1,2}(?:/\d{2,4})?\b'
    rf'|\b\d{{1,2}}\s+de\s+(?:{_MESES})(?:\s+(?:de|del)\s+\d{{4}})?\b|\b(?:{_MESES})\s+(?:de|del)\s+\d{{4}}\b'
    r'|\b(?:20[2-3]\d)\b', re.IGNORECASE)
# Número con su contexto: signo/$ antes; %, mil, millones después.
_NUM = re.compile(
    r'(?P<pre>-?\$?\s?)(?P<n>\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:[.,]\d+)?)'
    r'(?P<suf>\s?%|\s+mil(?:lones|lón|lon)?\b|\s?M\b)?', re.IGNORECASE)


def _a_numero(pre: str, n: str, suf: str) -> float | None:
    if re.fullmatch(r'\d{1,3}(?:\.\d{3})+(?:,\d+)?', n):
        n = n.replace('.', '').replace(',', '.')
    else:
        n = n.replace(',', '.')
    try:
        v = float(n)
    except ValueError:
        return None
    s = (suf or '').strip().lower()
    if s.startswith('mill') or s == 'm':
        v *= 1_000_000
    elif s == 'mil':
        v *= 1_000
    return -v if pre.strip().startswith('-') else v


def numeros_de_texto(texto: str) -> list[tuple[str, float, bool]]:
    """(token, valor, es_cifra_de_negocio). Cifra de negocio = lleva $, %, mil o millones."""
    limpio = _FECHA.sub(' ', texto)
    out = []
    for m in _NUM.finditer(limpio):
        inicio = m.start() + len(m.group(0)) - len(m.group(0).lstrip())
        if inicio > 0 and (limpio[inicio - 1].isalnum() or limpio[inicio - 1] in '.,'):
            continue
        v = _a_numero(m.group('pre'), m.group('n'), m.group('suf'))
        if v is None:
            continue
        negocio = '$' in m.group('pre') or bool(m.group('suf'))
        out.append((m.group(0).strip(), v, negocio))
    return out


def numeros_de_datos(dato, acumulado: set | None = None) -> set[float]:
    acumulado = set() if acumulado is None else acumulado
    if isinstance(dato, bool):
        return acumulado
    if isinstance(dato, (int, float)):
        acumulado.add(float(dato))
    elif isinstance(dato, str):
        for _, v, _ in numeros_de_texto(dato):
            acumulado.add(v)
    elif isinstance(dato, dict):
        for v in dato.values():
            numeros_de_datos(v, acumulado)
    elif isinstance(dato, list):
        for v in dato:
            numeros_de_datos(v, acumulado)
    return acumulado


def _rastreable(v: float, negocio: bool, fuentes: set[float]) -> bool:
    # Conteos pequeños sueltos ("1 cliente", "3 planes") no son cifras de dinero.
    if not negocio and abs(v) <= 12 and float(v).is_integer():
        return True
    for f in fuentes:
        if f == v:
            return True
        if f and abs(f - v) / abs(f) <= 0.005:  # redondeo
            return True
        # "262 mil" o "1,2 millones" escritos a partir de una cifra exacta
        if f and abs(f) >= 1000 and abs(f - v) / abs(f) <= 0.05 and v % 1000 == 0:
            return True
    return False


def verificar(texto: str, resultados: list, mensaje_usuario: str = '') -> list[str]:
    """Devuelve las cifras del texto que no tienen rastro en las métricas del turno."""
    fuentes = numeros_de_datos([r for r in resultados if isinstance(r, dict) and r.get('_tool')])
    fuentes |= {v for _, v, _ in numeros_de_texto(mensaje_usuario)}
    return [tok for tok, v, negocio in numeros_de_texto(texto) if not _rastreable(v, negocio, fuentes)]


def asegurar_explicaciones(texto: str, resultados_metricas: list[dict]) -> str:
    """Pedido del fundador: el costo por cliente/plan siempre dice por qué.
    Si el modelo omitió la explicación armada por el backend, se anexa tal
    cual; si la consulta falló, se dice que no está disponible."""
    for r in resultados_metricas:
        if not isinstance(r, dict) or r.get('_tool') not in ('costo_por_cliente', 'margen_por_plan'):
            continue
        expl = r.get('explicacion')
        if not expl:
            if r.get('ok') is False and 'no disponible' not in texto.lower():
                texto += '\n\nPor qué este valor: no disponible (la consulta de costos falló en este turno).'
            continue
        # fragmento distintivo: la frase que dice con cuántos talleres se calculó
        m = re.search(r'(\d+|ningún) taller(?:es)? activo', expl)
        muestra = m.group(0) if m else expl[:60]
        if muestra not in texto:
            texto += '\n\nPor qué este valor: ' + expl
    return texto
