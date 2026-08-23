import { api } from './client'

export interface Usuario {
  id: number
  username: string
  rol: string
  nombre_completo: string
}

export interface LoginResponse {
  token: string
  usuario: Usuario
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/api/auth/login', { username, password })
  return data
}

export async function logout(): Promise<void> {
  await api.post('/api/auth/logout')
}

export async function getMe(): Promise<Usuario> {
  const { data } = await api.get<Usuario>('/api/auth/me')
  return data
}
