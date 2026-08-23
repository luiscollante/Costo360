import { api } from '@/api/client'

export interface Lamina {
  id: number
  material_categoria: string
  referencia: string
  cantidad_laminas: number
  ancho_cm: number | null
  alto_cm: number | null
  espesor_cm: number | null
  costo_unitario: number
  stock_minimo: number
  proveedor: string
  ubicacion: string
  notas: string
  actualizado_en: string | null
}

export interface LaminaIn {
  material_categoria: string
  referencia?: string
  cantidad_laminas?: number
  ancho_cm?: number | null
  alto_cm?: number | null
  espesor_cm?: number | null
  costo_unitario?: number
  stock_minimo?: number
  proveedor?: string
  ubicacion?: string
  notas?: string
}

export interface LaminaUpdate {
  referencia?: string
  cantidad_laminas?: number
  ancho_cm?: number | null
  alto_cm?: number | null
  espesor_cm?: number | null
  costo_unitario?: number
  stock_minimo?: number
  proveedor?: string
  ubicacion?: string
  notas?: string
}

export async function listarInventario(): Promise<Lamina[]> {
  const { data } = await api.get<Lamina[]>('/api/inventario')
  return data
}

export async function crearLamina(body: LaminaIn): Promise<{ id: number; ok: boolean }> {
  const { data } = await api.post<{ id: number; ok: boolean }>('/api/inventario', body)
  return data
}

export async function actualizarLamina(id: number, body: LaminaUpdate): Promise<{ ok: boolean }> {
  const { data } = await api.put<{ ok: boolean }>(`/api/inventario/${id}`, body)
  return data
}

export async function eliminarLamina(id: number): Promise<{ ok: boolean }> {
  const { data } = await api.delete<{ ok: boolean }>(`/api/inventario/${id}`)
  return data
}
