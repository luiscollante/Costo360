"""
Registra todas las tools disponibles al importar este paquete — se importa
una vez desde `agente/router.py` al arrancar el backend.
"""
from backend.agente.tools import proyectos as _proyectos  # noqa: F401
from backend.agente.tools import cotizacion as _cotizacion  # noqa: F401
from backend.agente.tools import catalogo as _catalogo  # noqa: F401
