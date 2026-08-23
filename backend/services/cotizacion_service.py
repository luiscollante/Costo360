from backend.motor import calculos


def calcular_totales(piezas: list) -> dict:
    piezas_raw = [
        {
            "nombre": p.get("nombre", ""),
            "largo": float(p.get("largo", 0)),
            "ancho": float(p.get("ancho", 0.60)),
            "cantidad": int(p.get("cantidad", 1)),
            "unidad_venta": p.get("unidad_venta", "ml"),
            "ml": float(p.get("largo", 0)) * int(p.get("cantidad", 1)),
            "precio_unitario": float(p.get("precio_unitario", 0)),
        }
        for p in piezas
    ]
    return calculos.calcular_totales_piezas(piezas_raw)


def calcular_merma(piezas: list, categoria: str) -> dict:
    piezas_raw = [
        {
            "nombre": p.get("nombre", ""),
            "largo": float(p.get("largo", 0)),
            "ancho": float(p.get("ancho", 0.60)),
            "cantidad": int(p.get("cantidad", 1)),
            "unidad_venta": p.get("unidad_venta", "ml"),
            "ml": float(p.get("largo", 0)) * int(p.get("cantidad", 1)),
        }
        for p in piezas
    ]
    return calculos.calcular_merma_inteligente(piezas_raw, categoria)
