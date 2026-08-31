import { api } from '@/api/client'

export interface MensajeChat {
  role: 'user' | 'assistant'
  content: string
}

export async function chatConAgente(mensaje: string, historial: MensajeChat[]): Promise<string> {
  const { data } = await api.post<{ respuesta: string }>('/api/agente/chat', {
    mensaje,
    historial,
  }, { timeout: 60_000 }) // el LLM puede tardar más que el default de 10 s
  return data.respuesta
}
