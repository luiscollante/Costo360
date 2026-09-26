"""Carga acotada de la clave autorizada. No exporta el resto del .env."""
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

def gemini_key():
    explicit = os.getenv('ATENCION_GEMINI_API_KEY')
    if explicit is not None:
        return explicit
    from dotenv import dotenv_values
    values = dotenv_values(ROOT / 'backend' / '.env', interpolate=False)
    return values.get('GEMINI_AGENTE_API_KEY') or values.get('GEMINI_API_KEY') or ''
