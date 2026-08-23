"""
Seed inicial de parametros en app_config.
Inserta los valores por defecto del motor como punto de partida editable.
Ejecutar una sola vez: python seed_parametros.py
"""
import json
import psycopg2

import os

DB_URL = os.environ.get("DATABASE_URL", "")

TARIFAS = {
    "Mármol": [
        {"nombre_interno": "Mano obra borde",      "inductor": "por_ml",              "valor":  60_000, "etiqueta_pdf": "c2_mano_obra"},
        {"nombre_interno": "Mano obra área",        "inductor": "por_m2_mano_obra",    "valor":  35_000, "etiqueta_pdf": "c2_mano_obra"},
        {"nombre_interno": "Instalación zócalo",    "inductor": "por_ml_zocalo",       "valor":  12_000, "etiqueta_pdf": "c3_zocalos"},
        {"nombre_interno": "Desgaste disco",        "inductor": "por_m2",              "valor":   2_200, "etiqueta_pdf": "c4_insumos"},
        {"nombre_interno": "Uso máquina cortadora", "inductor": "por_dia",             "valor":  20_000, "etiqueta_pdf": "c4_insumos"},
        {"nombre_interno": "Consumibles",           "inductor": "por_m2",              "valor":   8_500, "etiqueta_pdf": "c4_insumos"},
        {"nombre_interno": "Riesgo rotura",         "inductor": "porcentaje_material", "valor":   0.02,  "etiqueta_pdf": "c4_insumos"},
        {"nombre_interno": "Merma / desperdicio",   "inductor": "merma_pct",           "valor":   0.08,  "etiqueta_pdf": ""},
    ],
    "Granito": [
        {"nombre_interno": "Mano obra borde",      "inductor": "por_ml",              "valor":  55_000, "etiqueta_pdf": "c2_mano_obra"},
        {"nombre_interno": "Mano obra área",        "inductor": "por_m2_mano_obra",    "valor":  32_000, "etiqueta_pdf": "c2_mano_obra"},
        {"nombre_interno": "Instalación zócalo",    "inductor": "por_ml_zocalo",       "valor":  14_000, "etiqueta_pdf": "c3_zocalos"},
        {"nombre_interno": "Desgaste disco",        "inductor": "por_m2",              "valor":   6_000, "etiqueta_pdf": "c4_insumos"},
        {"nombre_interno": "Uso máquina cortadora", "inductor": "por_dia",             "valor":  25_000, "etiqueta_pdf": "c4_insumos"},
        {"nombre_interno": "Consumibles",           "inductor": "por_m2",              "valor":  10_000, "etiqueta_pdf": "c4_insumos"},
        {"nombre_interno": "Riesgo rotura",         "inductor": "porcentaje_material", "valor":   0.01,  "etiqueta_pdf": "c4_insumos"},
        {"nombre_interno": "Merma / desperdicio",   "inductor": "merma_pct",           "valor":   0.06,  "etiqueta_pdf": ""},
    ],
    "Sinterizado": [
        {"nombre_interno": "Mano obra borde",      "inductor": "por_ml",              "valor":  85_000, "etiqueta_pdf": "c2_mano_obra"},
        {"nombre_interno": "Mano obra área",        "inductor": "por_m2_mano_obra",    "valor":  52_000, "etiqueta_pdf": "c2_mano_obra"},
        {"nombre_interno": "Instalación zócalo",    "inductor": "por_ml_zocalo",       "valor":  20_000, "etiqueta_pdf": "c3_zocalos"},
        {"nombre_interno": "Desgaste disco",        "inductor": "por_m2",              "valor":  18_000, "etiqueta_pdf": "c4_insumos"},
        {"nombre_interno": "Uso máquina cortadora", "inductor": "por_dia",             "valor":  32_000, "etiqueta_pdf": "c4_insumos"},
        {"nombre_interno": "Consumibles",           "inductor": "por_m2",              "valor":  25_000, "etiqueta_pdf": "c4_insumos"},
        {"nombre_interno": "Riesgo rotura",         "inductor": "porcentaje_material", "valor":   0.08,  "etiqueta_pdf": "c4_insumos"},
        {"nombre_interno": "Merma / desperdicio",   "inductor": "merma_pct",           "valor":   0.15,  "etiqueta_pdf": ""},
    ],
    "Quarztone": [
        {"nombre_interno": "Mano obra borde",      "inductor": "por_ml",              "valor":  65_000, "etiqueta_pdf": "c2_mano_obra"},
        {"nombre_interno": "Mano obra área",        "inductor": "por_m2_mano_obra",    "valor":  38_000, "etiqueta_pdf": "c2_mano_obra"},
        {"nombre_interno": "Instalación zócalo",    "inductor": "por_ml_zocalo",       "valor":  16_000, "etiqueta_pdf": "c3_zocalos"},
        {"nombre_interno": "Desgaste disco",        "inductor": "por_m2",              "valor":   5_200, "etiqueta_pdf": "c4_insumos"},
        {"nombre_interno": "Uso máquina cortadora", "inductor": "por_dia",             "valor":  27_000, "etiqueta_pdf": "c4_insumos"},
        {"nombre_interno": "Consumibles",           "inductor": "por_m2",              "valor":   9_000, "etiqueta_pdf": "c4_insumos"},
        {"nombre_interno": "Riesgo rotura",         "inductor": "porcentaje_material", "valor":   0.01,  "etiqueta_pdf": "c4_insumos"},
        {"nombre_interno": "Merma / desperdicio",   "inductor": "merma_pct",           "valor":   0.07,  "etiqueta_pdf": ""},
    ],
    "Quarzita": [
        {"nombre_interno": "Mano obra borde",      "inductor": "por_ml",              "valor":  70_000, "etiqueta_pdf": "c2_mano_obra"},
        {"nombre_interno": "Mano obra área",        "inductor": "por_m2_mano_obra",    "valor":  42_000, "etiqueta_pdf": "c2_mano_obra"},
        {"nombre_interno": "Instalación zócalo",    "inductor": "por_ml_zocalo",       "valor":  15_000, "etiqueta_pdf": "c3_zocalos"},
        {"nombre_interno": "Desgaste disco",        "inductor": "por_m2",              "valor":   8_000, "etiqueta_pdf": "c4_insumos"},
        {"nombre_interno": "Uso máquina cortadora", "inductor": "por_dia",             "valor":  28_000, "etiqueta_pdf": "c4_insumos"},
        {"nombre_interno": "Consumibles",           "inductor": "por_m2",              "valor":  15_000, "etiqueta_pdf": "c4_insumos"},
        {"nombre_interno": "Riesgo rotura",         "inductor": "porcentaje_material", "valor":   0.05,  "etiqueta_pdf": "c4_insumos"},
        {"nombre_interno": "Merma / desperdicio",   "inductor": "merma_pct",           "valor":   0.10,  "etiqueta_pdf": ""},
    ],
}

AIU_DEFAULTS = {"a": 2.0, "i": 2.0, "u": 5.0}


def seed():
    conn = psycopg2.connect(DB_URL)
    with conn.cursor() as cur:
        for clave, valor in [
            ("tarifas",      TARIFAS),
            ("aiu_defaults", AIU_DEFAULTS),
        ]:
            cur.execute(
                """
                INSERT INTO app_config (clave, valor)
                VALUES (%s, %s)
                ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor
                """,
                (clave, json.dumps(valor, ensure_ascii=False)),
            )
            print(f"  OK: {clave}")
    conn.commit()
    conn.close()
    print("Seed completado.")


if __name__ == "__main__":
    seed()
