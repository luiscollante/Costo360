import { api } from '@/api/client'

export interface UsuarioItem {
  id: number
  username: string
  rol: string
  nombre_completo: string
}

export interface UsuarioCreate {
  username: string
  password: string
  pin: string
  rol: string
  nombre_completo: string
}

export interface UsuarioUpdate {
  nombre_completo?: string
  rol?: string
  password?: string
}

export async function getUsuarios(): Promise<UsuarioItem[]> {
  const { data } = await api.get<UsuarioItem[]>('/api/admin/usuarios')
  return data
}

export async function createUsuario(body: UsuarioCreate): Promise<{ ok: boolean; id: number }> {
  const { data } = await api.post('/api/admin/usuarios', body)
  return data
}

export async function updateUsuario(id: number, body: UsuarioUpdate): Promise<{ ok: boolean }> {
  const { data } = await api.put(`/api/admin/usuarios/${id}`, body)
  return data
}

export async function deleteUsuario(id: number): Promise<{ ok: boolean }> {
  const { data } = await api.delete(`/api/admin/usuarios/${id}`)
  return data
}
