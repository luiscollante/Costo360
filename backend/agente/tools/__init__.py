"""
Registra todas las tools disponibles al importar este paquete — se importa
una vez desde `agente/router.py` al arrancar el backend.
"""
from backend.agente.tools import proyectos as _proyectos  # noqa: F401
