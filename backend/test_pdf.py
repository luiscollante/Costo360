import os
import sys

# Ensure backend modules can be imported
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from motor.generador_pdf import generar_pdf_cotizacion

def test_pdf():
    # Dummy data
    resultado = {
        "categoria": "Sinterizado",
        "precio_m2": 250000,
        "m2_real": 5.5,
        "ml_proyecto": 12.0,
        "precio_por_ml": 80000,
        "precio_por_m2_venta": 350000,
        "c1_material_placa": 1500000,
        "c2": 500000,
        "c3": 100000,
        "c4": 80000,
        "c5": 50000,
        "c6": 30000,
        "c7": 20000,
        "costo_total": 2280000,
        "precio_sugerido": 3500000,
        "margen_pct": 35,
        "utilidad": 1220000,
        "nombre_cliente": "Cliente Prueba",
        "_estado_guardado": {
            "piezas": [
                {"nombre": "Meson 1", "cantidad": 1, "ml": 2.5, "ancho_custom": 0.60}
            ]
        }
    }
    empresa_info = {
        "nombre": "Empresa Test",
        "nit": "900.123.456-7",
        "telefono": "3001234567",
        "email": "test@empresa.com",
        "ciudad": "Barranquilla"
    }
    
    try:
        pdf_bytes = generar_pdf_cotizacion(resultado, "COT-2026-0001", empresa_info)
        with open("test_cotizacion.pdf", "wb") as f:
            f.write(pdf_bytes)
        print("PDF generated successfully! Size:", len(pdf_bytes))
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_pdf()
