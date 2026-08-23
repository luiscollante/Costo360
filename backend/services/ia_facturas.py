import os
import json
from datetime import datetime

from google import genai
from google.genai import types

_PROMPT = """Extrae los siguientes datos de esta factura de compra y devuélvelos ESTRICTAMENTE en formato JSON válido, sin usar markdown (sin ```json) ni explicaciones adicionales, usa este formato:
{
    "fecha": "YYYY-MM-DD",
    "proveedor": "Nombre del proveedor",
    "numero_factura": "Número o código único de la factura (CUFE, folio, consecutivo); cadena vacía si no es legible",
    "subtotal": 0.0,
    "iva": 0.0,
    "total": 0.0,
    "categoria": "Categoría inferida (ej. Materiales, Herramientas, Servicios, Otros)",
    "descripcion": "Descripción breve de los items"
}"""


def _client():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None
    return genai.Client(api_key=api_key)


def _clean_json_text(text):
    text = text.strip()
    if text.startswith("```json"):
        text = text[7:]
    if text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    return text.strip()


def _validar_datos(data):
    """Sanea el output del modelo antes de que llegue a un INSERT — nunca confiar el
    tipo/rango de lo que devuelve un LLM directamente en la base de datos."""
    try:
        fecha_val = data.get("fecha")
        datetime.strptime(fecha_val, "%Y-%m-%d")
    except (TypeError, ValueError):
        return None

    try:
        subtotal = float(data.get("subtotal", 0) or 0)
        iva = float(data.get("iva", 0) or 0)
        total = float(data.get("total", 0) or 0)
    except (TypeError, ValueError):
        return None

    if subtotal < 0 or iva < 0 or total < 0:
        return None

    proveedor = str(data.get("proveedor") or "Desconocido").strip()[:255]
    numero_factura = str(data.get("numero_factura") or "").strip()[:255]
    categoria = str(data.get("categoria") or "General").strip()[:100]
    descripcion = str(data.get("descripcion") or "Compra de materiales/servicios").strip()

    return {
        "fecha": fecha_val,
        "proveedor": proveedor,
        "numero_factura": numero_factura,
        "subtotal": subtotal,
        "iva": iva,
        "total": total,
        "categoria": categoria,
        "descripcion": descripcion,
    }


def extract_pdf_data_ai(pdf_bytes):
    """Lee una factura en PDF con Gemini (capa gratuita) y devuelve un dict con los
    mismos campos que extract_ubl_data, o None si no se pudo extraer/validar."""
    client = _client()
    if client is None:
        return None
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[
                types.Part.from_bytes(data=pdf_bytes, mime_type="application/pdf"),
                _PROMPT,
            ],
        )
        data = json.loads(_clean_json_text(response.text))
    except Exception as e:
        print(f"Error extrayendo PDF con Gemini: {e}")
        return None

    return _validar_datos(data)
