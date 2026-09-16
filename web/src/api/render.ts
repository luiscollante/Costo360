import { api } from './client'

export interface RenderCocina {
  id: number
  cotizacion_id: number
  material_id: number | null
  material_referencia_snapshot: string
  superficie: string
  estado: 'generando' | 'completado' | 'fallido'
  imagen_url: string | null
  foto_cliente_url: null
  error_detalle: string | null
  creado_en: string | null
}

export interface GastoRender {
  gasto_usd: number
  tope_usd: number
  porcentaje: number
}

export type SuperficieCocina = 'mesón/encimera' | 'isla' | 'salpicadero/backsplash'

export interface GenerarRenderIn {
  material_id: number
  superficie: SuperficieCocina
  nota_libre?: string
  foto_cliente_consentimiento?: boolean
  foto_cliente?: File | null
}

/** Genera un render nuevo — tarda varios segundos (llamada real a OpenAI),
 * el timeout del cliente HTTP se estira acá para no cortar la espera. */
export async function generarRender(cotizacionId: number, body: GenerarRenderIn): Promise<RenderCocina> {
  const form = new FormData()
  form.append('material_id', String(body.material_id))
  form.append('superficie', body.superficie)
  if (body.nota_libre) form.append('nota_libre', body.nota_libre)
  form.append('foto_cliente_consentimiento', String(body.foto_cliente_consentimiento ?? false))
  if (body.foto_cliente) form.append('foto_cliente', body.foto_cliente)
  const res = await api.postForm<RenderCocina>(
    `/api/render/cotizaciones/${cotizacionId}`, form, { timeout: 90_000 },
  )
  return res.data
}

export async function listarRenders(cotizacionId: number): Promise<RenderCocina[]> {
  const res = await api.get<RenderCocina[]>(`/api/render/cotizaciones/${cotizacionId}`)
  return res.data
}

export async function borrarRender(renderId: number): Promise<void> {
  await api.delete(`/api/render/${renderId}`)
}

export async function gastoRenderMensual(): Promise<GastoRender> {
  const res = await api.get<GastoRender>('/api/render/gasto')
  return res.data
}
