import { api } from '@/api/client'

export interface Plan {
  codigo: string
  nombre: string
  precio_mensual_cop: number
  cupo_usuarios: number
}

export async function listarPlanes(): Promise<Plan[]> {
  const { data } = await api.get<Plan[]>('/api/pagos/planes')
  return data
}

export interface IniciarPagoIn {
  nombre_empresa: string
  nit?: string
  plan_codigo: string
  admin_email: string
  admin_nombre: string
}

export interface IniciarPagoOut {
  reference: string
  amount_in_cents: number
  currency: string
  public_key: string
  signature_integrity: string
}

export async function iniciarPago(body: IniciarPagoIn): Promise<IniciarPagoOut> {
  const { data } = await api.post<IniciarPagoOut>('/api/pagos/iniciar', body)
  return data
}

export interface CobrarPagoIn {
  reference: string
  token: string
  acceptance_token: string
  accept_personal_auth: string
}

export interface CobrarPagoOut {
  estado_transaccion: string
  transaction_id: string
}

export async function cobrarPago(body: CobrarPagoIn): Promise<CobrarPagoOut> {
  // Timeout más largo que el default de `api` (10 s): este endpoint hace 2
  // llamadas HTTPS a Wompi (crear payment_source + cobrar) más las escrituras
  // en la BD -- en el sandbox real se vio superar los 10 s alguna vez.
  const { data } = await api.post<CobrarPagoOut>('/api/pagos/cobrar', body, { timeout: 30_000 })
  return data
}

export type EstadoSolicitud = 'pendiente' | 'pagado' | 'fallido' | 'expirado'

export async function consultarEstado(reference: string): Promise<EstadoSolicitud> {
  const { data } = await api.get<{ estado: EstadoSolicitud }>(`/api/pagos/estado/${reference}`)
  return data.estado
}
