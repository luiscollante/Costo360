export type MaterialCategory = "Mármol" | "Granito" | "Sinterizado" | "Quarztone" | "Quarzita";

export const PROPIEDADES_MATERIAL: Record<MaterialCategory, { merma_base: number; label: string; defaultPrice: number }> = {
  "Mármol": { merma_base: 0.08, label: "Mármol Clásico", defaultPrice: 280000 },
  "Granito": { merma_base: 0.06, label: "Granito Premium", defaultPrice: 320000 },
  "Sinterizado": { merma_base: 0.15, label: "Piedra Sinterizada", defaultPrice: 550000 },
  "Quarztone": { merma_base: 0.07, label: "Quarztone (Cuarzo)", defaultPrice: 450000 },
  "Quarzita": { merma_base: 0.10, label: "Quarzita Natural", defaultPrice: 650000 },
};

export const TARIFAS: Record<MaterialCategory, { prod_ml: number; prod_m2: number; disco: number; consumibles: number; riesgo: number }> = {
  "Mármol": { prod_ml: 60000, prod_m2: 35000, disco: 2200, consumibles: 8500, riesgo: 0.02 },
  "Granito": { prod_ml: 55000, prod_m2: 32000, disco: 6000, consumibles: 10000, riesgo: 0.01 },
  "Sinterizado": { prod_ml: 85000, prod_m2: 52000, disco: 18000, consumibles: 25000, riesgo: 0.08 },
  "Quarztone": { prod_ml: 65000, prod_m2: 38000, disco: 5200, consumibles: 9000, riesgo: 0.01 },
  "Quarzita": { prod_ml: 70000, prod_m2: 42000, disco: 8000, consumibles: 15000, riesgo: 0.05 },
};

export interface CalculoInput {
  categoria: MaterialCategory;
  area_m2: number;
  desperdicio_pct: number; // Porcentaje de merma que elige el usuario (reemplaza merma_base si es diferente)
  margen_pct: number;      // 0 a 100
  precio_m2: number;
  aiu_activo: boolean;
}

export interface CalculoOutput {
  costo_material: number;
  costo_mano_obra: number;
  costo_insumos: number;
  costo_directo: number;
  aiu_desglose: {
    admin: number;
    imprevistos: number;
    utilidad: number;
    iva_utilidad: number;
    total_aiu: number;
  };
  margen_comercial: number; // El valor en pesos de la utilidad comercial
  precio_sugerido: number;
}

export function calcularCotizacion(input: CalculoInput): CalculoOutput {
  const { categoria, area_m2, desperdicio_pct, margen_pct, precio_m2, aiu_activo } = input;
  const tarifas = TARIFAS[categoria];

  // 1. Costo Material (Área neta + Desperdicio)
  const factorDesperdicio = desperdicio_pct / 100;
  const areaBruta = area_m2 * (1 + factorDesperdicio);
  const costo_material = areaBruta * precio_m2;

  // 2. Costo Mano de Obra
  // Asumimos modelo de mesones estándar donde ML = m2 / 0.60
  const ml_estimado = area_m2 / 0.60;
  const costo_mano_obra = ml_estimado * tarifas.prod_ml;

  // 3. Costo Insumos
  // (m2_real * disco) + (m2_real * consumibles) + (costo_material * riesgo)
  const costo_disco = area_m2 * tarifas.disco;
  const costo_consumibles = area_m2 * tarifas.consumibles;
  const costo_riesgo = costo_material * tarifas.riesgo;
  const costo_insumos = costo_disco + costo_consumibles + costo_riesgo;

  // Costo Directo Total
  const costo_directo = costo_material + costo_mano_obra + costo_insumos;

  // 4. Cálculo AIU (Si aplica)
  let admin = 0;
  let imprevistos = 0;
  let utilidad_aiu = 0;
  let iva_utilidad = 0;
  let total_aiu = 0;

  if (aiu_activo) {
    admin = costo_directo * 0.02; // 2% A
    imprevistos = costo_directo * 0.02; // 2% I
    utilidad_aiu = costo_directo * 0.05; // 5% U
    iva_utilidad = utilidad_aiu * 0.19; // 19% IVA sobre U
    total_aiu = admin + imprevistos + utilidad_aiu + iva_utilidad;
  }

  // Costo Total Operativo
  const costo_total = costo_directo + total_aiu;

  // 5. Precio Sugerido (Margen Neto Comercial)
  const margen_decimal = Math.max(0.01, Math.min(margen_pct / 100, 0.99));
  const precio_sugerido = costo_total / (1 - margen_decimal);
  
  // Utilidad comercial en COP
  const margen_comercial = precio_sugerido - costo_total;

  return {
    costo_material,
    costo_mano_obra,
    costo_insumos,
    costo_directo,
    aiu_desglose: {
      admin,
      imprevistos,
      utilidad: utilidad_aiu,
      iva_utilidad,
      total_aiu,
    },
    margen_comercial,
    precio_sugerido,
  };
}
