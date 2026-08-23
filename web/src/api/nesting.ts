import { api } from './client'

export interface NestingRequest {
  lamina: { largo: number; ancho: number }
  piezas: { id: string; largo: number; ancho: number; cantidad?: number }[]
  perforaciones?: any[]
}

export interface NestingResult {
  svg: string
  aprovechamiento: number
  area_lamina: number
  area_usada: number
  piezas_colocadas: number
  piezas_fuera: string[]
}

export async function generarNesting(data: NestingRequest): Promise<NestingResult> {
  const res = await api.post<NestingResult>('/api/nesting/generar', data)
  return res.data
}
