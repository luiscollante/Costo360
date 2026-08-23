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
}

export async function getMaterialesPorCategoria(categoria: string): Promise<MaterialCatalogo[]> {
  const res = await api.get<MaterialCatalogo[]>('/api/materiales', {
    params: { categoria },
  })
  return res.data
}
