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

/** Categorías del catálogo (para selects de "tipo de material"). */
export async function getCategoriasMaterial(): Promise<string[]> {
  const res = await api.get<string[]>('/api/materiales/categorias')
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

// ── Atributos visuales + foto de referencia (render de cocina con IA) ───────
// Catálogo cerrado de opciones — mismo valor que el enum real del backend
// (`backend/models/materiales.py`). Nunca texto libre: es lo que hace el
// prompt de render reproducible.

export type ColorBase =
  | 'blanco' | 'blanco_hueso' | 'gris_claro' | 'gris_oscuro' | 'negro'
  | 'beige_arena' | 'cafe' | 'verde' | 'azul_gris' | 'dorado'
  | 'rojo_terracota' | 'multicolor'
export type ColorVetas =
  | 'sin_vetas' | 'blanco' | 'gris' | 'gris_oscuro' | 'dorado' | 'beige'
  | 'cafe' | 'negro' | 'azulado' | 'oxidado'
export type DensidadVeteado = 'sin_veteado' | 'sutil' | 'moderado' | 'denso'
export type PatronVeteado = 'no_aplica' | 'lineal' | 'organico' | 'malla' | 'moteado' | 'bookmatch'
export type Acabado = 'pulido' | 'mate' | 'leather' | 'flameado'
export type TonoGeneral = 'calido' | 'frio' | 'neutro'

export const COLOR_BASE_OPCIONES: { value: ColorBase; label: string }[] = [
  { value: 'blanco', label: 'Blanco' },
  { value: 'blanco_hueso', label: 'Blanco hueso/crema' },
  { value: 'gris_claro', label: 'Gris claro' },
  { value: 'gris_oscuro', label: 'Gris oscuro' },
  { value: 'negro', label: 'Negro' },
  { value: 'beige_arena', label: 'Beige/arena' },
  { value: 'cafe', label: 'Café' },
  { value: 'verde', label: 'Verde' },
  { value: 'azul_gris', label: 'Azul/gris azulado' },
  { value: 'dorado', label: 'Dorado/ámbar' },
  { value: 'rojo_terracota', label: 'Rojo/terracota' },
  { value: 'multicolor', label: 'Multicolor' },
]
export const COLOR_VETAS_OPCIONES: { value: ColorVetas; label: string }[] = [
  { value: 'sin_vetas', label: 'Ninguna (liso)' },
  { value: 'blanco', label: 'Blanco' },
  { value: 'gris', label: 'Gris' },
  { value: 'gris_oscuro', label: 'Gris oscuro/grafito' },
  { value: 'dorado', label: 'Dorado' },
  { value: 'beige', label: 'Beige' },
  { value: 'cafe', label: 'Café' },
  { value: 'negro', label: 'Negro' },
  { value: 'azulado', label: 'Azulado' },
  { value: 'oxidado', label: 'Oxidado/óxido' },
]
export const DENSIDAD_VETEADO_OPCIONES: { value: DensidadVeteado; label: string }[] = [
  { value: 'sin_veteado', label: 'Sin veteado (liso/uniforme)' },
  { value: 'sutil', label: 'Veteado sutil/disperso' },
  { value: 'moderado', label: 'Veteado moderado' },
  { value: 'denso', label: 'Veteado denso/dramático' },
]
export const PATRON_VETEADO_OPCIONES: { value: PatronVeteado; label: string }[] = [
  { value: 'no_aplica', label: 'No aplica (liso)' },
  { value: 'lineal', label: 'Lineal/direccional' },
  { value: 'organico', label: 'Orgánico/tipo nube' },
  { value: 'malla', label: 'Tipo red o malla (venado)' },
  { value: 'moteado', label: 'Manchado/moteado' },
  { value: 'bookmatch', label: 'Movimiento tipo agua (bookmatch)' },
]
export const ACABADO_OPCIONES: { value: Acabado; label: string }[] = [
  { value: 'pulido', label: 'Pulido/brillante' },
  { value: 'mate', label: 'Mate/honed' },
  { value: 'leather', label: 'Leather/cuero' },
  { value: 'flameado', label: 'Flameado/rugoso' },
]
export const TONO_GENERAL_OPCIONES: { value: TonoGeneral; label: string }[] = [
  { value: 'calido', label: 'Cálido' },
  { value: 'frio', label: 'Frío' },
  { value: 'neutro', label: 'Neutro' },
]

export interface MaterialVisual {
  color_base: ColorBase | null
  color_vetas: ColorVetas | null
  densidad_veteado: DensidadVeteado | null
  patron_veteado: PatronVeteado | null
  acabado: Acabado | null
  tono_general: TonoGeneral | null
  foto_referencia_url: string | null
  foto_referencia_aprobada: boolean
  apto_para_render: boolean
}

export interface MaterialConVisual extends MaterialCatalogo, MaterialVisual {}

export async function getMaterialVisual(id: number): Promise<MaterialConVisual> {
  const res = await api.get<MaterialConVisual>(`/api/materiales/${id}/visual`)
  return res.data
}

export interface AtributosVisuales {
  color_base?: ColorBase | null
  color_vetas?: ColorVetas | null
  densidad_veteado?: DensidadVeteado | null
  patron_veteado?: PatronVeteado | null
  acabado?: Acabado | null
  tono_general?: TonoGeneral | null
}

export async function actualizarAtributosVisuales(
  id: number, body: AtributosVisuales,
): Promise<MaterialConVisual> {
  const res = await api.put<MaterialConVisual>(`/api/materiales/${id}/atributos-visuales`, body)
  return res.data
}

/** Sube la foto real de la lámina — queda pendiente de aprobación humana. */
export async function subirFotoReferencia(id: number, archivo: File): Promise<MaterialConVisual> {
  const form = new FormData()
  form.append('foto', archivo)
  const res = await api.postForm<MaterialConVisual>(`/api/materiales/${id}/foto-referencia`, form)
  return res.data
}

export async function aprobarFotoReferencia(id: number, aprobada: boolean): Promise<MaterialConVisual> {
  const res = await api.post<MaterialConVisual>(
    `/api/materiales/${id}/foto-referencia/aprobar`, null, { params: { aprobada } },
  )
  return res.data
}
