import { api } from '@/api/client'
import { supabase } from '@/lib/supabaseClient'
import { getDeviceIdSync } from '@/lib/deviceId'

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

// ── Motor nuevo del agente (Objetivo 5, Ciclo 1) — protocolo AG-UI por SSE ──

export interface Propuesta {
  propuesta_id: string
  herramienta: string
  payload: Record<string, unknown>
  filas_afectadas: Array<Record<string, unknown>>
  es_destructiva: boolean
  estado: string
  expira_en: string
}

/** Evento AG-UI ya decodificado de JSON — solo se leen los campos que usa el piloto. */
export interface EventoAgUi {
  type: string
  delta?: string
  outcome?: { type: string; interrupts?: Array<{ id: string; message?: string; metadata?: { propuesta?: Propuesta } }> }
  message?: string
}

/**
 * Abre el turno del agente por streaming (SSE) usando `fetch` + lectura manual
 * del `ReadableStream` — NO se puede usar `EventSource` nativo porque no admite
 * headers personalizados, y este proyecto usa `Authorization: Bearer` en vez de
 * cookies (`allow_credentials: False` en el CORS del backend).
 *
 * Piloto del Ciclo 1: se hace el parseo mínimo de eventos a mano en vez de
 * adoptar el cliente oficial `@ag-ui/client`/CopilotKit — eso queda para el
 * Ciclo 3 (pantallas completas), cuando además se construya el widget
 * flotante global. Aquí basta con probar que el contrato del backend
 * funciona de punta a punta.
 */
export async function* streamAgente(
  mensaje: string,
  historial: MensajeChat[],
): AsyncGenerator<EventoAgUi> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const dev = getDeviceIdSync()
  if (dev) headers['X-Device-Id'] = dev

  const baseUrl = import.meta.env.VITE_API_URL ?? ''
  const resp = await fetch(`${baseUrl}/api/agente/stream`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ mensaje, historial }),
  })
  if (!resp.ok || !resp.body) {
    throw new Error(`El asistente respondió ${resp.status}`)
  }

  const reader = resp.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const bloques = buffer.split('\n\n')
    buffer = bloques.pop() ?? ''
    for (const bloque of bloques) {
      const linea = bloque.split('\n').find((l) => l.startsWith('data:'))
      if (!linea) continue
      try {
        yield JSON.parse(linea.slice(5).trim()) as EventoAgUi
      } catch {
        /* línea SSE incompleta o de keep-alive — se ignora */
      }
    }
  }
}

export async function confirmarPropuesta(propuestaId: string): Promise<unknown> {
  const { data } = await api.post(`/api/agente/propuestas/${propuestaId}/confirmar`)
  return data
}

export async function descartarPropuesta(propuestaId: string): Promise<void> {
  await api.post(`/api/agente/propuestas/${propuestaId}/descartar`)
}
