import { api } from './client'

export type RolCodigo = 'admin' | 'gerencia' | 'operativo'

export interface Usuario {
  id: string
  empresa_id: string
  rol_codigo: RolCodigo
  nombre_completo: string
  cargo_visible: string | null
  puede_ver_dashboard: boolean
  puede_usar_modo_bi_senior: boolean
  puede_pedir_datos_agregados_agente: boolean
  puede_gestionar_usuarios: boolean
}

export async function getMe(): Promise<Usuario> {
  const { data } = await api.get<Usuario>('/api/auth/me')
  return data
}
