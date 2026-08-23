import sys
sys.path.insert(0, "./backend")
sys.path.insert(0, "./backend/motor")
from calculos import calcular_cotizacion_directa
from parametros import ADICIONALES

try:
    res = calcular_cotizacion_directa(
        categoria="Mármol",
        referencia="Mesón cocina",
        precio_m2=280000,
        area_placa_comprada=5.12,
        m2_real=3.5 * 0.6,
        m2_cortados=3.5 * 0.6,
        m2_usados=3.5 * 0.6,
        margen_pct=40,
        dias=1,
        personas=2,
        zocalo_activo=False,
        zocalo_ml=0,
        adicionales_activos=False,
        cantidades_add=[0] * len(ADICIONALES),
        etapa="Casa terminada (limpia)",
        adicionales_lista=ADICIONALES,
        tipo_proyecto="Mesón cocina",
        nombre_cliente="Sin nombre",
        materiales_lista=[],
        piezas=[{"nombre": "Mesón cocina", "ml": 3.5, "ancho_custom": 0.6, "cantidad": 1, "categoria": "Mármol", "unidad_venta": "ml"}],
        incluir_iva=True,
    )
    print("SUCCESS")
    print(res)
except Exception as e:
    import traceback
    traceback.print_exc()
