import os
import pandas as pd
from datetime import datetime
import psycopg2
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

DATABASE_URL = os.getenv("DATABASE_URL")

FILES_TO_PROCESS = [
    r"C:\Users\wases\OneDrive\Escritorio\marmoles c&c\FACTURAS DE COMPRA 2024\REPORTE FINANCIERO\COMPRAS 2024 terminado.xlsx",
    r"C:\Users\wases\OneDrive\Escritorio\marmoles c&c\FACTURAS DE COMPRA 2025\REPORTE FINANCIERO\COMPRAS 2025.xlsx",
    r"C:\Users\wases\OneDrive\Escritorio\marmoles c&c\FACTURAS DE COMPRA 2026\REPORTE FINANCIERO\COMPRAS 2026.xlsx"
]

MESES = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE']

def clean_column_names(df):
    # Asegurar que no hay problemas de encoding en los nombres de las columnas
    cols = df.columns.tolist()
    new_cols = []
    for c in cols:
        c = str(c).strip()
        if 'Categor' in c:
            new_cols.append('Categoria')
        elif 'Descripc' in c:
            new_cols.append('Descripcion')
        else:
            new_cols.append(c)
    df.columns = new_cols
    return df

def main():
    if not DATABASE_URL:
        print("ERROR: DATABASE_URL no encontrada en el archivo .env")
        return

    print("Conectando a la base de datos Supabase...")
    conn = psycopg2.connect(DATABASE_URL)
    
    total_insertadas = 0
    total_errores = 0
    
    with conn.cursor() as cur:
        # Opcional: limpiar la tabla antes de insertar si se quiere reiniciar todo el historial, 
        # pero para ser seguros solo borraremos las que provengan de estos archivos excel
        # para evitar duplicados si corremos el script varias veces.
        cur.execute("DELETE FROM facturas_compra WHERE archivo_origen LIKE '%.xlsx'")
        conn.commit()

    for file_path in FILES_TO_PROCESS:
        if not os.path.exists(file_path):
            print(f"La ruta {file_path} no existe. Saltando...")
            continue
            
        print(f"\nProcesando archivo: {file_path}")
        try:
            df = pd.read_excel(file_path, header=1)
            df = clean_column_names(df)
            
            # Limpiar filas donde no hay Fecha o Proveedor
            df = df.dropna(subset=['Fecha', 'Proveedor'])
            
            for index, row in df.iterrows():
                try:
                    fecha = pd.to_datetime(row['Fecha'])
                    mes_str = MESES[fecha.month - 1]
                    
                    proveedor = str(row['Proveedor'])
                    categoria = str(row.get('Categoria', 'General'))
                    descripcion = str(row.get('Descripcion', 'N/A'))
                    
                    cantidad = float(row.get('Cantidad', 1))
                    if pd.isna(cantidad): cantidad = 1
                    
                    precio = float(row.get('Precio unitario', 0))
                    if pd.isna(precio): precio = 0
                        
                    descuento = float(row.get('Descuento', 0))
                    if pd.isna(descuento): descuento = 0
                        
                    # Cálculos
                    subtotal = (cantidad * precio) - descuento
                    
                    iva = float(row.get('IVA', 0))
                    if pd.isna(iva): iva = 0
                        
                    total = subtotal + iva
                    
                    archivo_origen = os.path.basename(file_path)
                    
                    with conn.cursor() as cur:
                        cur.execute("""
                            INSERT INTO facturas_compra 
                            (fecha, mes, proveedor, categoria, descripcion, subtotal, iva, total, archivo_origen)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                        """, (
                            fecha, mes_str, proveedor, categoria, descripcion, subtotal, iva, total, archivo_origen
                        ))
                    conn.commit()
                    total_insertadas += 1
                except Exception as e:
                    print(f"Error en fila {index} del archivo {os.path.basename(file_path)}: {e}")
                    conn.rollback()
                    total_errores += 1
                    
            print(f"-> Excel {os.path.basename(file_path)} procesado exitosamente.")
        except Exception as e:
            print(f"Error cargando archivo {file_path}: {e}")

    conn.close()
    print(f"\nProceso finalizado.")
    print(f"Facturas insertadas en Supabase: {total_insertadas}")
    print(f"Errores (filas con formato incorrecto): {total_errores}")

if __name__ == "__main__":
    main()
