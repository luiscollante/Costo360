import sys
import os

# Permite que los archivos del motor se importen entre sí con nombres simples
# (ej: `from parametros import ...` funciona dentro del contenedor Docker)
sys.path.insert(0, os.path.dirname(__file__))
