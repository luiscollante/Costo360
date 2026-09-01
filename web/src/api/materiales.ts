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
  categoria?: string
  referencia?: string
  precio_m2?: number
  proveedor?: string
  activo?: boolean
}

/**
 * Edita un material del catálogo del taller (categoría, nombre o precio).
 * Si la fila es base de Costo360, el backend crea un "override" propio del
 * taller — el cambio solo afecta a este taller. Cualquier usuario del taller
 * puede editar.
 */
export async function editarMaterial(id: number, body: MaterialCambios): Promise<MaterialCatalogo> {
  const res = await api.put<MaterialCatalogo>(`/api/materiales/${id}`, body)
  return res.data
}

/**
 * Quita un material del catálogo del taller. Si era un override de una fila
 * base, la base vuelve a mostrarse (restablece al valor de Costo360).
 */
export async function eliminarMaterial(id: number): Promise<void> {
  await api.delete(`/api/materiales/${id}`)
}
