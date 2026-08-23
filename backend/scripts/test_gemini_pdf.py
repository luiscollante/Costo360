import os
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

def test_pdf():
    pdf_path = r"C:\Users\wases\OneDrive\Escritorio\marmoles c&c\FACTURAS DE COMPRA 2026\FACTURAS DE COMPRA ENERO 2026\GRANITOS Y MARMOLES S.A.S 05 DE ENERO.pdf"
    
    try:
        # File needs to be uploaded or read as bytes. Gemini supports uploading files or passing inline data.
        # But for large PDFs, uploading is better, or passing as base64 inline.
        with open(pdf_path, 'rb') as f:
            pdf_data = f.read()
            
        print("Enviando PDF a Gemini...")
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[
                types.Part.from_bytes(data=pdf_data, mime_type='application/pdf'),
                """Extrae los siguientes datos de esta factura de compra y devuélvelos ESTRICTAMENTE en formato JSON, sin markdown ni explicaciones adicionales:
                {
                    "fecha": "YYYY-MM-DD",
                    "proveedor": "Nombre del proveedor",
                    "subtotal": 0.0,
                    "iva": 0.0,
                    "total": 0.0,
                    "categoria": "Categoría inferida (ej. Materiales, Herramientas, Servicios, Otros)",
                    "descripcion": "Descripción breve de los items"
                }"""
            ]
        )
        print(response.text)
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    test_pdf()
