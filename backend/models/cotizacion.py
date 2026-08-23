from pydantic import BaseModel
from typing import Any, Dict, Literal, List


class PiezaIn(BaseModel):
    nombre: str = ""
    largo: float
    ancho: float = 0.60
    cantidad: int = 1
    unidad_venta: Literal["ml", "m2"] = "ml"
    precio_unitario: float = 0.0


class TotalesPiezasIn(BaseModel):
    piezas: List[PiezaIn]


class MermaIn(BaseModel):
    piezas: List[PiezaIn]
    categoria: str = "Mármol"


# ── Modelos para Cotización Directa ──────────────────────────────────────────

class MaterialItem(BaseModel):
    cat: str
    ref: str
    precio_m2: float
    area_placa: float


class PiezaItem(BaseModel):
    nombre: str = ""
    ml: float
    ancho_custom: float = 0.60
    cantidad: int = 1
    categoria: str = "Mármol"
    unidad_venta: str = "ml"
    zoc_trasero: bool = False
    zoc_izq: bool = False
    zoc_der: bool = False
    altura_zocalo_cm: float = 7.0


class CotizacionDirectaIn(BaseModel):
    # Material
    categoria: str = "Mármol"
    referencia: str = ""
    precio_m2: float = 220000
    area_placa_comprada: float = 5.94
    materiales_lista: List[MaterialItem] = []
    piezas: List[PiezaItem] = []
    # Proyecto
    tipo_proyecto: str = "Meson"
    etapa_label: str = "Casa terminada (limpia)"
    nombre_cliente: str = ""
    margen_pct: float = 40.0
    dias: int = 2
    personas: int = 2
    zocalo_activo: bool = False
    zocalo_ml: float = 0.0

    # Adicionales
    adicionales_activos: bool = False
    cantidades_add: List[float] = []

    # Opciones
    incluir_iva: bool = False


class CotizacionGuardarIn(BaseModel):
    numero: str = ""
    cliente: str = ""
    resultado: Dict[str, Any]


class CotizacionAIUIn(BaseModel):
    cd: float
    pct_a: float = 2.0
    pct_i: float = 2.0
    pct_u: float = 5.0

    incluir_iva: bool = True
    nombre_cliente: str = ""
    tipo_proyecto: str = ""
    material: str = ""


class CotizacionAIUGuardarIn(BaseModel):
    numero: str = ""
    cliente: str = ""
    resultado: Dict[str, Any]
