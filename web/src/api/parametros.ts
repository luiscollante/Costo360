import { api } from './client'

export interface TarifaItem {
  nombre_interno: string
  inductor: string
  valor: number
  etiqueta_pdf: string
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
  adicionales: AdicionalItem[]
}

export async function getParametros(): Promise<ParametrosData> {
  const { data } = await api.get<ParametrosData>('/api/parametros')
  return data
}

export async function setParametros(data: Partial<ParametrosData>): Promise<void> {
  await api.put('/api/parametros', data)
}
