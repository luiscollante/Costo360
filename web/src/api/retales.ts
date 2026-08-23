import { api } from '@/api/client'

export interface Retal {
  id: number
  material_categoria: string
  referencia: string
  m2_disponibles: number
  m2_original: number
  origen_numero: string
  origen_cliente: string
  fecha_ingreso: string
  estado: string
  notas: string
  precio_recuperacion: number
  precio_mercado_m2: number
}

export interface RetalIn {
  material_categoria: string
  referencia?: string
  m2_disponibles: number
  notas?: string
  precio_recuperacion?: number
  precio_mercado_m2?: number
}

export interface RetalUpdate {
  m2_disponibles?: number
  estado?: string
  notas?: string
  precio_recuperacion?: number
  precio_mercado_m2?: number
}

export async function listarRetales(): Promise<Retal[]> {
  const { data } = await api.get<Retal[]>('/api/retales')
  return data
}

export async function crearRetal(body: RetalIn): Promise<{ id: number; ok: boolean }> {
  const { data } = await api.post<{ id: number; ok: boolean }>('/api/retales', body)
  return data
}

export async function actualizarRetal(id: number, body: RetalUpdate): Promise<{ ok: boolean }> {
  const { data } = await api.put<{ ok: boolean }>(`/api/retales/${id}`, body)
  return data
}

export async function eliminarRetal(id: number): Promise<{ ok: boolean }> {
  const { data } = await api.delete<{ ok: boolean }>(`/api/retales/${id}`)
  return data
}
