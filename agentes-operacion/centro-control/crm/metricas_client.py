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

# Tool → (ruta del backend, parámetros permitidos con su validador)
CONSULTAS = {
    'metricas_resumen': ('/resumen', {}),
    'costo_por_cliente': ('/costo-por-cliente', {'empresa': lambda v: isinstance(v, str) and 1 <= len(v.strip()) <= 120}),
    'margen_por_plan': ('/margen-por-plan', {}),
    'ingresos': ('/ingresos', {'meses': lambda v: isinstance(v, int) and not isinstance(v, bool) and 1 <= v <= 13}),
    'talleres_uso': ('/talleres', {'orden': lambda v: v in ('cotizaciones', 'costo_ia')}),
    'movimientos': ('/movimientos', {'meses': lambda v: isinstance(v, int) and not isinstance(v, bool) and 1 <= v <= 13}),
    'salud_sistema': ('/salud', {}),
}

_TTL = 60
_cache: dict[tuple, tuple[float, dict]] = {}
_lock = threading.Lock()


def _limpiar(valor):
    if isinstance(valor, str):
        texto = re.sub(r'[\r\n\t]+', ' ', valor)
        texto = re.sub(r'https?://\S+|www\.\S+|\S+@\S+', '[omitido]', texto)
        return texto[:400]
    if isinstance(valor, dict):
        return {k: _limpiar(v) for k, v in valor.items()}
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
        params[clave] = valor.strip() if isinstance(valor, str) else valor
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
                      headers={'X-Metricas-Token': token}, timeout=8)
    except httpx.HTTPError:
        return {'ok': False, 'error': 'No pude conectar con el servidor de Costo360. Dato no disponible.'}
    if r.status_code != 200:
        return {'ok': False, 'error': f'El servidor de Costo360 respondió {r.status_code}. Dato no disponible.'}
    cuerpo = _limpiar(r.json())
    with _lock:
        _cache[clave_cache] = (time.monotonic(), cuerpo)
    return cuerpo
