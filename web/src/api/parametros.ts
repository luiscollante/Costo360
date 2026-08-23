import { api } from './client'

export interface TarifaItem {
  nombre_interno: string
  inductor: string
  valor: number
  etiqueta_pdf: string
}

export interface ViaticosZona {
  hospedaje: number
  almuerzo: number
  alimentacion: number
  transporte_local: number
}

export interface AdicionalItem {
  concepto: string
  unidad: string
  terminada: number
  acabados: number
  estructura: number
  comercial: number
}

export interface ParametrosData {
  tarifas: Record<string, TarifaItem[]>
  logistica: {
    precio_gasolina: number
    flete_externo: number
  }
  viaticos: {
    pueblo: ViaticosZona
    ciudad: ViaticosZona
  }
  adicionales: AdicionalItem[]
}

export async function getParametros(): Promise<ParametrosData> {
  const { data } = await api.get<ParametrosData>('/api/parametros')
  return data
}

export async function setParametros(data: Partial<ParametrosData>): Promise<void> {
  await api.put('/api/parametros', data)
}
