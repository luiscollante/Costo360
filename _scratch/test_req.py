import json
import urllib.request

url = "http://localhost:8000/api/cotizacion/directa"
payload = {
  "categoria": "Mármol",
  "referencia": "Mesón cocina",
  "precio_m2": 280000,
  "area_placa_comprada": 5.12,
  "materiales_lista": [],
  "piezas": [
    {
      "nombre": "Mesón cocina",
      "ml": 3.5,
      "ancho_custom": 0.6,
      "cantidad": 1,
      "categoria": "Mármol",
      "unidad_venta": "ml",
      "zoc_trasero": False,
      "zoc_izq": False,
      "zoc_der": False,
      "altura_zocalo_cm": 7
    }
  ],
  "tipo_proyecto": "Mesón cocina",
  "etapa_label": "Casa terminada (limpia)",
  "nombre_cliente": "Sin nombre",
  "margen_pct": 40,
  "dias": 1,
  "personas": 2,
  "zocalo_activo": False,
  "zocalo_ml": 0,
  "incluir_iva": True
}

req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers={'Content-Type': 'application/json'})
try:
    response = urllib.request.urlopen(req)
    print(response.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print(e.code)
    print(e.read().decode('utf-8'))
