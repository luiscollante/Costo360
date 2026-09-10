import { create } from 'zustand'
import {
  streamAgente, confirmarPropuesta, descartarPropuesta,
  type MensajeChat, type Propuesta,
} from '@/api/agente'
import { mensajeConfirmacion } from '@/lib/agenteFormato'
import { showToast } from '@/lib/toast'

/**
 * Estado y acciones de Cost, compartidos entre la página dedicada (`/agente`)
 * y el widget flotante global (Ciclo 3, Objetivo 5) — un solo store a nivel
 * de módulo para que la conversación sobreviva a la navegación entre páginas
 * (antes vivía en `useState` de `AgentePage.tsx` y se perdía al desmontar).
 *
 * Alcance a propósito: solo memoria de la pestaña mientras dura la sesión del
 * navegador — NUNCA se persiste en `localStorage` ni en el backend este
 * ciclo (el `thread_id` que ya manda `streamAgente` sigue siendo decorativo,
 * el servidor no lo usa para nada). Persistencia real entre recargas queda
 * fuera de alcance, ver `docs/ROADMAP_COSTO360.md`.
 *
 * Invariante de seguridad, a propósito: este store NUNCA confirma ni
 * descarta una propuesta por su cuenta — `confirmar()`/`cancelar()` solo
 * corren cuando el humano hace clic en la tarjeta. Minimizar el panel
 * flotante (estado puramente de UI, fuera de este store) nunca debe llamar
 * a ninguna de estas dos acciones.
 */
interface CostState {
  mensajes: MensajeChat[]
  input: string
  cargando: boolean
  propuesta: Propuesta | null
  resolviendo: boolean
  setInput: (v: string) => void
  enviar: (texto?: string) => Promise<void>
  detener: () => void
  confirmar: () => Promise<void>
  cancelar: () => Promise<void>
}

// A nivel de módulo (no en el store) porque un AbortController no es estado
// serializable/comparable — mismo motivo por el que antes vivía en un
// `useRef` en vez de en `useState`.
let abortController: AbortController | null = null

export const useCostStore = create<CostState>((set, get) => ({
  mensajes: [],
  input: '',
  cargando: false,
  propuesta: null,
  resolviendo: false,

  setInput: (v) => set({ input: v }),

  enviar: async (texto) => {
    const { input, cargando, mensajes } = get()
    const contenido = (texto ?? input).trim()
    if (!contenido || cargando) return
    const historial = mensajes
    set({
      input: '',
      propuesta: null,
      mensajes: [...mensajes, { role: 'user', content: contenido }, { role: 'assistant', content: '' }],
      cargando: true,
    })
    const controller = new AbortController()
    abortController = controller
    try {
      for await (const evento of streamAgente(contenido, historial, controller.signal)) {
        if (evento.type === 'TEXT_MESSAGE_CONTENT' && evento.delta) {
          set((s) => {
            const copia = [...s.mensajes]
            copia[copia.length - 1] = { role: 'assistant', content: copia[copia.length - 1].content + evento.delta }
            return { mensajes: copia }
          })
        }
        if (evento.type === 'RUN_FINISHED' && evento.outcome?.type === 'interrupt') {
          const interrupt = evento.outcome.interrupts?.[0]
          if (interrupt?.metadata?.propuesta) set({ propuesta: interrupt.metadata.propuesta })
        }
        if (evento.type === 'RUN_ERROR') {
          const msg = evento.message ?? 'El asistente no pudo responder'
          showToast('error', msg)
          set((s) => {
            const copia = [...s.mensajes]
            if (!copia[copia.length - 1].content) copia[copia.length - 1] = { role: 'assistant', content: `⚠️ ${msg}` }
            return { mensajes: copia }
          })
        }
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        set((s) => {
          const copia = [...s.mensajes]
          const ultimo = copia[copia.length - 1]
          if (!ultimo.content) copia.pop() // sin respuesta parcial: no dejar una burbuja vacía
          else copia[copia.length - 1] = { ...ultimo, content: `${ultimo.content}\n\n*(detenido)*` }
          return { mensajes: copia }
        })
      } else {
        showToast('error', 'No se pudo contactar al asistente')
      }
    } finally {
      abortController = null
      set({ cargando: false })
    }
  },

  detener: () => {
    abortController?.abort()
  },

  confirmar: async () => {
    const { propuesta, mensajes } = get()
    if (!propuesta) return
    set({ resolviendo: true })
    try {
      await confirmarPropuesta(propuesta.propuesta_id)
      set({ mensajes: [...mensajes, { role: 'assistant', content: mensajeConfirmacion(propuesta) }] })
      showToast('success', 'Acción confirmada y ejecutada')
      set({ propuesta: null })
    } catch {
      showToast('error', 'No se pudo confirmar — puede que haya expirado')
    } finally {
      set({ resolviendo: false })
    }
  },

  cancelar: async () => {
    const { propuesta } = get()
    if (!propuesta) return
    set({ resolviendo: true })
    try {
      await descartarPropuesta(propuesta.propuesta_id)
      set({ propuesta: null })
    } catch {
      showToast('error', 'No se pudo descartar la propuesta')
    } finally {
      set({ resolviendo: false })
    }
  },
}))
