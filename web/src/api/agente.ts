import { api } from '@/api/client'

export interface MensajeChat {
  role: 'user' | 'assistant'
  content: string
}

export async function chatConAgente(mensaje: string, historial: MensajeChat[]): Promise<string> {
  const { data } = await api.post<{ respuesta: string }>('/api/agente/chat', {
    mensaje,
    historial,
  })
  return data.respuesta
}
