import { api } from '@/api/client'
import { supabase } from '@/lib/supabaseClient'
import { getDeviceIdSync } from '@/lib/deviceId'

export interface MensajeChat {
  role: 'user' | 'assistant'
  content: string
}

// ── Motor del agente Cost (Objetivo 5) — protocolo AG-UI por SSE ───────────
// El asistente legado de Parámetros (`chatConAgente`, sin tool-calling) se
// eliminó en el Ciclo 3: Cost ya cubre Parámetros también, y nada más en el
// proyecto dependía de esa ruta (verificado antes de borrar).

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
  signal?: AbortSignal,
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
    signal,
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

// ── Centro del Agente (Ciclo 3) — bitácora, deshacer, modo BI ──────────────

export interface AccionHistorial {
  id: string
  herramienta: string
  payload: Record<string, unknown>
  filas_afectadas: Array<Record<string, unknown>>
  es_deshacible: boolean
  creado_en: string
  deshecha_en: string | null
}

/** Bitácora del usuario actual — nunca la de otro, sin importar su rol
 * (RLS aísla por usuario_id, no solo por empresa; decisión del fundador). */
export async function listarHistorial(): Promise<AccionHistorial[]> {
  const { data } = await api.get('/api/agente/historial')
  return data.acciones
}

export async function deshacerAccion(historialId: string): Promise<unknown> {
  const { data } = await api.post(`/api/agente/historial/${historialId}/deshacer`)
  return data
}

export interface AgregadoHistorial {
  por_herramienta: Array<{ herramienta: string; total: number; deshechas: number }>
  por_usuario: Array<{ usuario_id: string; nombre: string; total: number }>
  usuarios_agrupados: number
  acciones_agrupadas: number
  umbral_k_anonimato: number
}

/** Modo BI — requiere `puede_pedir_datos_agregados_agente`. El backend nunca
 * devuelve una fila individual: agrupa por usuario y omite cualquier grupo
 * bajo el umbral de k-anonimato. */
export async function obtenerAgregadoHistorial(): Promise<AgregadoHistorial> {
  const { data } = await api.get('/api/agente/historial/agregado')
  return data
}

/** El endpoint usa `Authorization: Bearer` (no cookies) — un `<a href>` normal
 * nunca mandaría el token, así que se descarga como blob y se dispara la
 * descarga desde JS. */
export async function descargarCsvAgregado(): Promise<void> {
  const { data } = await api.get('/api/agente/historial/agregado/exportar.csv', { responseType: 'blob' })
  const url = URL.createObjectURL(data as Blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'agente_bi_costo360.csv'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
