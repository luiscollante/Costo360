"""Cliente de SOLO LECTURA de las métricas del negocio (backend de Costo360).

No importa nada del agente: el chat del Centro de Control y el bot de
Telegram (Ciclo 3) lo reutilizan tal cual. Todas las cifras llegan ya
calculadas por el backend; aquí solo se consulta, se cachea 60 s y se limpia
el texto libre (nombres de talleres) para que no pueda dictar instrucciones.
"""
import re
import threading
import time

import httpx

def _entero(v):
    """Gemini a veces manda 6.0 en vez de 6: se acepta si es entero exacto."""
    return not isinstance(v, bool) and isinstance(v, (int, float)) and float(v).is_integer() and 1 <= v <= 13


# Tool → (ruta del backend, parámetros permitidos con su validador)
CONSULTAS = {
    'metricas_resumen': ('/resumen', {}),
    'costo_por_cliente': ('/costo-por-cliente', {'empresa': lambda v: isinstance(v, str) and 1 <= len(v.strip()) <= 120}),
    'margen_por_plan': ('/margen-por-plan', {}),
    'ingresos': ('/ingresos', {'meses': _entero}),
    'talleres_uso': ('/talleres', {'orden': lambda v: v in ('cotizaciones', 'costo_ia')}),
    'movimientos': ('/movimientos', {'meses': _entero}),
    'salud_sistema': ('/salud', {}),
}

_TTL = 60
_cache: dict[tuple, tuple[float, dict]] = {}
_lock = threading.Lock()


_CORTOS = {'nombre', 'taller', 'empresa'}  # texto que escribe un tercero: corto


def _limpiar(valor, clave=''):
    if isinstance(valor, str):
        texto = re.sub(r'[\r\n\t]+', ' ', valor)
        texto = re.sub(r'https?://\S+|www\.\S+|\S+@\S+', '[omitido]', texto)
        return texto[:80] if clave in _CORTOS else texto[:400]
    if isinstance(valor, dict):
        return {k: _limpiar(v, k) for k, v in valor.items()}
    if isinstance(valor, list):
        return [_limpiar(v) for v in valor]
    return valor


def consultar(settings, nombre: str, args: dict) -> dict:
    """Devuelve el sobre del backend o un error explícito (nunca inventa)."""
    if nombre not in CONSULTAS:
        return {'ok': False, 'error': 'Consulta no permitida.'}
    ruta, permitidos = CONSULTAS[nombre]
    params = {}
    for clave, valor in (args or {}).items():
        if clave not in permitidos or not permitidos[clave](valor):
            return {'ok': False, 'error': f'Parámetro no permitido o inválido: {clave}.'}
        params[clave] = valor.strip() if isinstance(valor, str) else int(valor)
    token = getattr(settings, 'metricas_token', '')
    if not token:
        return {'ok': False, 'error': 'Las métricas del negocio no están configuradas (falta el token).'}
    clave_cache = (nombre, tuple(sorted(params.items())))
    with _lock:
        guardado = _cache.get(clave_cache)
        if guardado and time.monotonic() - guardado[0] < _TTL:
            return guardado[1]
    try:
        r = httpx.get(settings.costo360_api.rstrip('/') + '/api/admin/metricas' + ruta, params=params,
                      headers={'X-Metricas-Token': token}, timeout=4)
    except httpx.HTTPError:
        return {'ok': False, 'error': 'No pude conectar con el servidor de Costo360. Dato no disponible.'}
    if r.status_code != 200:
        return {'ok': False, 'error': f'El servidor de Costo360 respondió {r.status_code}. Dato no disponible.'}
    cuerpo = _limpiar(r.json())
    with _lock:
        _cache[clave_cache] = (time.monotonic(), cuerpo)
    return cuerpo
