import os
import sys
import time
from datetime import datetime
import psycopg2
from dotenv import load_dotenv

_REPO_ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
if _REPO_ROOT not in sys.path:
    sys.path.insert(0, _REPO_ROOT)

from backend.services.ia_facturas import extract_pdf_data_ai

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

DATABASE_URL = os.getenv("DATABASE_URL")

BASE_DIR = r"C:\Users\wases\OneDrive\Escritorio\marmoles c&c"
YEARS = [2024, 2025, 2026]

def extract_pdf_data(pdf_path):
    with open(pdf_path, 'rb') as f:
        pdf_data = f.read()
    data = extract_pdf_data_ai(pdf_data)
    if data is None:
        print(f"Error parseando PDF con Gemini {pdf_path}")
    return data

def main():
    if not DATABASE_URL:
        print("ERROR: DATABASE_URL no encontrada en el archivo .env")
        return

    print("Conectando a la base de datos Supabase...")
    conn = psycopg2.connect(DATABASE_URL)
    
    total_insertadas = 0
    total_errores = 0
    
    for year in YEARS:
        year_dir = os.path.join(BASE_DIR, f"FACTURAS DE COMPRA {year}")
        if not os.path.exists(year_dir):
            print(f"La carpeta {year_dir} no existe. Saltando...")
            continue
            
        print(f"\nProcesando carpeta: {year_dir}")
        
        for root_dir, dirs, files in os.walk(year_dir):
            for file in files:
                if file.lower().endswith('.pdf'):
                    file_path = os.path.join(root_dir, file)
                    print(f"Procesando: {file}")
                    
                    data = extract_pdf_data(file_path)
                    if data:
                        try:
                            fecha_obj = datetime.strptime(data['fecha'], '%Y-%m-%d')
                            meses = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE']
                            mes_str = meses[fecha_obj.month - 1]

                            with conn.cursor() as cur:
                                cur.execute("""
                                    INSERT INTO facturas_compra
                                    (fecha, mes, proveedor, numero_factura, categoria, descripcion, subtotal, iva, total, archivo_origen)
                                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                                """, (
                                    fecha_obj, mes_str, data['proveedor'], data.get('numero_factura') or None, data['categoria'],
                                    data['descripcion'], data['subtotal'], data['iva'], data['total'], file
                                ))
                            conn.commit()
                            total_insertadas += 1
                            print(" -> Insertado OK")
                        except Exception as e:
                            print(f" -> Error insertando: {e}")
                            conn.rollback()
                            total_errores += 1
                    else:
                        print(" -> Error en extracción IA")
                        total_errores += 1
                        
                    # Pausa pequeña para no saturar la API de Gemini (Rate Limit)
                    time.sleep(2)

    conn.close()
    print(f"\nProceso finalizado.")
    print(f"Facturas insertadas en Supabase: {total_insertadas}")
    print(f"Errores (IA o BD): {total_errores}")

if __name__ == "__main__":
    main()
