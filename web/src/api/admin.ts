import { api } from '@/api/client'

export type RolInvitable = 'gerencia' | 'operativo'

export interface UsuarioItem {
  id: string
  email: string
  rol_codigo: 'admin' | 'gerencia' | 'operativo'
  nombre_completo: string
  cargo_visible: string | null
  activo: boolean
  creado_en: string
}

export interface InvitacionItem {
  id: string
  email: string
  rol_codigo: string
  estado: string
  creada_en: string
  expira_en: string
}

export interface InvitarBody {
  email: string
  rol_codigo: RolInvitable
  nombre_completo?: string
}

export interface EditarUsuarioBody {
  nombre_completo?: string
  cargo_visible?: string | null
  rol_codigo?: RolInvitable
  activo?: boolean
}

export async function getUsuarios(): Promise<UsuarioItem[]> {
  const { data } = await api.get<UsuarioItem[]>('/api/admin/usuarios')
  return data
}

export async function getInvitaciones(): Promise<InvitacionItem[]> {
  const { data } = await api.get<InvitacionItem[]>('/api/admin/invitaciones')
  return data
}

export async function invitarUsuario(
  body: InvitarBody,
): Promise<{ email: string; enlace_para_definir_contrasena: string }> {
  const { data } = await api.post('/api/admin/usuarios', body)
  return data
}

export async function editarUsuario(id: string, body: EditarUsuarioBody): Promise<{ ok: boolean }> {
  const { data } = await api.patch(`/api/admin/usuarios/${id}`, body)
  return data
}

export async function eliminarUsuario(id: string): Promise<{ ok: boolean }> {
  const { data } = await api.delete(`/api/admin/usuarios/${id}`)
  return data
}
