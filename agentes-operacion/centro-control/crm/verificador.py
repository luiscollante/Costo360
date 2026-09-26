"""Verificador de cifras: toda cifra de la respuesta debe salir de un
resultado de herramienta de ESE turno (o del mensaje del usuario). Lo que no
tenga rastro se marca de forma visible; nunca se borra ni se corrige a mano.
"""
import re

# $1.234.567 · 1.234.567 · 32,5 · 32.5 · 1500 · -$262.249  (formato colombiano primero)
_NUM = re.compile(r'(?<![\w.,])-?\$?\s?\d{1,3}(?:\.\d{3})+(?:,\d+)?(?![\d])|(?<![\w.,])-?\$?\s?\d+(?:[.,]\d+)?(?![\d])')
_FECHA = re.compile(r'\b\d{4}-\d{2}(?:-\d{2})?\b|\b\d{1,2}:\d{2}\b|\b\d{1,2}/\d{1,2}(?:/\d{2,4})?\b')


def _a_numero(token: str) -> float | None:
    t = token.replace('$', '').replace(' ', '')
    neg = t.startswith('-')
    t = t.lstrip('-')
    if re.fullmatch(r'\d{1,3}(?:\.\d{3})+(?:,\d+)?', t):
        t = t.replace('.', '').replace(',', '.')
    else:
        t = t.replace(',', '.')
    try:
        v = float(t)
    except ValueError:
        return None
    return -v if neg else v


def numeros_de_texto(texto: str) -> list[tuple[str, float]]:
    limpio = _FECHA.sub(' ', texto)
    out = []
    for m in _NUM.finditer(limpio):
        v = _a_numero(m.group(0))
        if v is not None:
            out.append((m.group(0).strip(), v))
    return out


def numeros_de_datos(dato, acumulado: set | None = None) -> set[float]:
    acumulado = set() if acumulado is None else acumulado
    if isinstance(dato, bool):
        return acumulado
    if isinstance(dato, (int, float)):
        acumulado.add(float(dato))
    elif isinstance(dato, str):
        for _, v in numeros_de_texto(dato):
            acumulado.add(v)
    elif isinstance(dato, dict):
        for v in dato.values():
            numeros_de_datos(v, acumulado)
    elif isinstance(dato, list):
        for v in dato:
            numeros_de_datos(v, acumulado)
    return acumulado


def _rastreable(v: float, fuentes: set[float]) -> bool:
    if abs(v) <= 12:  # conteos pequeños, ordinales y "1 cliente" de la pregunta
        return True
    for f in fuentes:
        if f == v or (f and abs(f - v) / abs(f) <= 0.005):
            return True
        # redondeos a miles/millones ("$262 mil", "1,2 millones")
        if f and abs(v) < abs(f) and (abs(f / 1000 - v) / abs(f / 1000) <= 0.01 or abs(f / 1e6 - v) / abs(f / 1e6) <= 0.05):
            return True
    return False


def verificar(texto: str, resultados: list, mensaje_usuario: str = '') -> list[str]:
    """Devuelve las cifras del texto que no tienen rastro."""
    fuentes = numeros_de_datos(resultados)
    fuentes |= {v for _, v in numeros_de_texto(mensaje_usuario)}
    return [tok for tok, v in numeros_de_texto(texto) if not _rastreable(v, fuentes)]


def asegurar_explicaciones(texto: str, resultados_metricas: list[dict]) -> str:
    """Pedido del fundador: el costo por cliente/plan siempre dice por qué.
    Si el modelo omitió la explicación armada por el backend, se anexa tal cual."""
    for r in resultados_metricas:
        expl = (r or {}).get('explicacion') if isinstance(r, dict) else None
        if r.get('_tool') in ('costo_por_cliente', 'margen_por_plan') and expl:
            # basta con que aparezca un fragmento distintivo de la explicación
            muestra = expl[:60]
            if muestra not in texto:
                texto += '\n\nPor qué este valor: ' + expl
    return texto
