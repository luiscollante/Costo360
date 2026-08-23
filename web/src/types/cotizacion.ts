export interface MaterialItem {
  id?: string
  cat: string
  ref: string
  precio_m2: number
  area_placa: number
  largo?: number
  ancho?: number
  cantLaminas?: number
}

export interface PiezaItem {
  nombre: string
  ml: number
  ancho_custom: number
  cantidad: number
  categoria: string
  unidad_venta: string
  placa_idx?: number
}

export interface CotizacionDirectaIn {
  // Material
  categoria: string
  referencia: string
  precio_m2: number
  area_placa_comprada: number
  materiales_lista: MaterialItem[]
  piezas: PiezaItem[]
  // Proyecto
  tipo_proyecto: string
  etapa_label: string
  nombre_cliente: string
  margen_pct: number
  dias: number
  personas: number
  zocalo_activo: boolean
  zocalo_ml: number

  incluir_iva: boolean
}

export interface CotizacionResult {
  precio_sugerido: number
  costo_total: number
  utilidad: number
  margen_pct: number
  aprovechamiento: number
  c1_material: number
  c2_mano_obra: number
  c3_zocalos: number
  c4_insumos: number
  c5_logistica: number
  c6_viaticos: number
  c7_adicionales: number
  retal: number
  m2_real: number
  categoria: string
}

// ── AIU ──────────────────────────────────────────────────────────────────────

export interface ItemAIU {
  id: string
  desc: string
  und: string
  cant: number
  punit: number
}

export interface AIUIn {
  cd: number
  pct_a: number
  pct_i: number
  pct_u: number

  incluir_iva: boolean
  nombre_cliente: string
  tipo_proyecto: string
  material: string
}

export interface ResultadoAIU {
  cd: number
  pct_a: number
  pct_i: number
  pct_u: number
  val_a: number
  val_i: number
  val_u: number
  val_iva: number
  logistica: number
  viaticos: number
  precio_total: number
  margen_pct: number
  nombre_cliente: string
  tipo_proyecto: string
  material: string
  incluir_iva?: boolean
  // Enriched before save
  _estado_guardado?: { aiu_items?: ItemAIU[]; nombre_cliente?: string }
  ciudad_proyecto?: string
  telefono_cliente?: string
  email_cliente?: string
  inclusiones?: string[]
  exclusiones?: string[]
}
