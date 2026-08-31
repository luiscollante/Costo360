import { api } from './client'

export interface MaterialCatalogo {
  id: number
  categoria: string
  referencia: string
  precio_m2: number
  precio_lamina: number | null
  ancho_lamina_cm: number | null
  alto_lamina_cm: number | null
  proveedor: string
  es_propio: boolean
}

export async function getMaterialesPorCategoria(categoria: string): Promise<MaterialCatalogo[]> {
  const res = await api.get<MaterialCatalogo[]>('/api/materiales', { params: { categoria } })
  return res.data
}

export async function getMaterialesTodos(): Promise<MaterialCatalogo[]> {
  const res = await api.get<MaterialCatalogo[]>('/api/materiales')
  return res.data
}

export interface MaterialNuevo {
  categoria: string
  referencia: string
  precio_m2: number
  proveedor?: string
}

/** Agrega (o actualiza el precio de) un material al catálogo del propio taller. */
export async function crearMaterial(body: MaterialNuevo): Promise<MaterialCatalogo> {
  const res = await api.post<MaterialCatalogo>('/api/materiales', body)
  return res.data
}

export interface MaterialCambios {
  referencia?: string
  precio_m2?: number
  proveedor?: string
  activo?: boolean
}

/** Edita un material propio del taller (solo Admin/Gerencia). */
export async function editarMaterial(id: number, body: MaterialCambios): Promise<MaterialCatalogo> {
  const res = await api.put<MaterialCatalogo>(`/api/materiales/${id}`, body)
  return res.data
}

/** Elimina un material propio del taller (solo Admin/Gerencia). */
export async function eliminarMaterial(id: number): Promise<void> {
  await api.delete(`/api/materiales/${id}`)
}
