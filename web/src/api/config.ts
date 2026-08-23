import { api } from '@/api/client'

export interface ConfigEmpresa {
  nombre: string
  nit: string
  direccion: string
  telefono: string
  email: string
  ciudad: string
  banco_nombre: string
  banco_cuenta: string
  banco_tipo: string
  banco_titular: string
  anticipo_pct: number
  dias_entrega: number
  condiciones_pago: string
}

export async function getConfigEmpresa(): Promise<ConfigEmpresa> {
  const { data } = await api.get<ConfigEmpresa>('/api/config/empresa')
  return data
}

export async function putConfigEmpresa(body: Partial<ConfigEmpresa>): Promise<{ ok: boolean }> {
  const { data } = await api.put<{ ok: boolean }>('/api/config/empresa', body)
  return data
}

export interface LogoData {
  logo_b64: string | null
  content_type: string
}

export async function getLogo(): Promise<LogoData> {
  const { data } = await api.get<LogoData>('/api/config/logo')
  return data
}

export async function uploadLogo(file: File): Promise<{ ok: boolean }> {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.postForm<{ ok: boolean }>('/api/config/logo', form)
  return data
}
