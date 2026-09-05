import { useEffect, useRef, useState } from 'react'
import { Sparkles, Send, Loader2, AlertTriangle } from 'lucide-react'
import AppLayout from '@/components/AppLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { showToast } from '@/lib/toast'
import {
  streamAgente, confirmarPropuesta, descartarPropuesta,
  type MensajeChat, type Propuesta,
} from '@/api/agente'

/**
 * Página piloto del Ciclo 1 (Objetivo 5) — motor nuevo del agente, acotado al
 * dominio de Proyectos/Tareas. Deliberadamente mínima: solo lo necesario para
 * probar de punta a punta que el streaming, el tool-calling y la confirmación
 * de dos fases funcionan con datos reales. El widget flotante global y el
 * "Centro del Agente" completo (bitácora, deshacer, BI) son del Ciclo 3.
 */
const SUGERENCIAS = [
  'Lista las tareas del proyecto 8',
  'Crea una tarea llamada Revisar corte en el proyecto 8',
]

export default function AgentePage() {
  const [mensajes, setMensajes] = useState<MensajeChat[]>([])
  const [input, setInput] = useState('')
  const [cargando, setCargando] = useState(false)
  const [propuesta, setPropuesta] = useState<Propuesta | null>(null)
  const [resolviendo, setResolviendo] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const propuestaRef = useRef<HTMLDivElement>(null)

  function scrollAbajo() {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
    })
  }

  // Foco acotado a la tarjeta al aparecer (sin atrapar todo el árbol, a
  // diferencia de un <Dialog> modal — el agente nunca debe bloquear la
  // navegación manual, Regla 7). Mismo patrón que ya usa TareaDialog.tsx
  // para su confirmación inline de borrado (hallazgo Fase 5 a11y).
  useEffect(() => {
    if (propuesta) propuestaRef.current?.focus()
  }, [propuesta])

  async function enviar(texto?: string) {
    const contenido = (texto ?? input).trim()
    if (!contenido || cargando) return
    setInput('')
    setPropuesta(null)
    const historial = mensajes
    setMensajes((m) => [...m, { role: 'user', content: contenido }, { role: 'assistant', content: '' }])
    setCargando(true)
    scrollAbajo()
    try {
      for await (const evento of streamAgente(contenido, historial)) {
        if (evento.type === 'TEXT_MESSAGE_CONTENT' && evento.delta) {
          setMensajes((m) => {
            const copia = [...m]
            copia[copia.length - 1] = { role: 'assistant', content: copia[copia.length - 1].content + evento.delta }
            return copia
          })
          scrollAbajo()
        }
        if (evento.type === 'RUN_FINISHED' && evento.outcome?.type === 'interrupt') {
          const interrupt = evento.outcome.interrupts?.[0]
          if (interrupt?.metadata?.propuesta) setPropuesta(interrupt.metadata.propuesta)
        }
        if (evento.type === 'RUN_ERROR') {
          const msg = evento.message ?? 'El asistente no pudo responder'
          showToast('error', msg)
          setMensajes((m) => {
            const copia = [...m]
            if (!copia[copia.length - 1].content) copia[copia.length - 1] = { role: 'assistant', content: `⚠️ ${msg}` }
            return copia
          })
        }
      }
    } catch {
      showToast('error', 'No se pudo contactar al asistente')
    } finally {
      setCargando(false)
    }
  }

  async function confirmar() {
    if (!propuesta) return
    setResolviendo(true)
    try {
      await confirmarPropuesta(propuesta.propuesta_id)
      showToast('success', 'Acción confirmada y ejecutada')
      setPropuesta(null)
    } catch {
      showToast('error', 'No se pudo confirmar — puede que haya expirado')
    } finally {
      setResolviendo(false)
    }
  }

  async function cancelar() {
    if (!propuesta) return
    setResolviendo(true)
    try {
      await descartarPropuesta(propuesta.propuesta_id)
      setPropuesta(null)
    } catch {
      showToast('error', 'No se pudo descartar la propuesta')
    } finally {
      setResolviendo(false)
    }
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl">
        <PageHeader
          kicker="Objetivo 5 · Piloto Ciclo 1"
          title="Asistente de Costo360"
          subtitle="Por ahora solo entiende de Proyectos y Tareas."
        />

        <Card className="flex h-[65vh] flex-col overflow-hidden">
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {mensajes.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center">
                <EmptyState
                  icon={<Sparkles size={32} />}
                  title="Pregúntale algo sobre tus proyectos y tareas."
                />
                <div className="w-full max-w-sm space-y-1.5">
                  {SUGERENCIAS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => enviar(s)}
                      className="w-full cursor-pointer rounded-lg border border-brand-border px-3 py-2 text-left text-xs text-brand-text-secondary transition-colors hover:border-brand-primary/40 hover:text-brand-text"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {mensajes.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-xl px-3 py-2 text-sm ${
                  m.role === 'user'
                    ? 'bg-brand-primary text-white'
                    : 'border border-brand-border bg-brand-bg text-brand-text'
                }`}
              >
                {m.content || (
                  cargando && i === mensajes.length - 1
                    ? <span aria-hidden="true">…</span>
                    : ''
                )}
              </div>
            </div>
          ))}

          {propuesta && (
            <div
              ref={propuestaRef}
              tabIndex={-1}
              role="alert"
              className={`rounded-xl border p-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${
                propuesta.es_destructiva
                  ? 'border-brand-danger/40 bg-brand-danger-soft'
                  : 'border-brand-success/40 bg-brand-success-soft'
              }`}
            >
              <p className="flex items-center gap-1.5 text-sm font-semibold text-brand-text-dark">
                {propuesta.es_destructiva && <AlertTriangle size={14} className="text-brand-danger" aria-hidden="true" />}
                {propuesta.es_destructiva ? 'Confirma antes de borrar' : 'Confirma esta acción'}
              </p>
              <ul className="mt-2 space-y-1 text-sm text-brand-text">
                {propuesta.filas_afectadas.map((f, i) => (
                  <li key={i}>
                    {String(f.titulo ?? f.id)} <span className="text-brand-text-secondary">(id {String(f.id)})</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  variant={propuesta.es_destructiva ? 'danger' : 'primary'}
                  onClick={confirmar}
                  disabled={resolviendo}
                  aria-label={propuesta.es_destructiva ? 'Confirmar borrado' : 'Confirmar acción'}
                >
                  Confirmar
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={cancelar}
                  disabled={resolviendo}
                  aria-label="Cancelar y descartar la propuesta"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); enviar() }}
          className="flex items-center gap-2 border-t border-brand-border p-3"
        >
          <Sparkles size={16} className="shrink-0 text-brand-text-tertiary" aria-hidden="true" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe tu mensaje…"
            aria-label="Mensaje para el asistente"
            className="h-9 flex-1 rounded-lg border border-brand-border bg-brand-input px-3 text-sm text-brand-text focus-visible:outline-none focus-visible:border-brand-primary"
          />
          <Button type="submit" size="sm" disabled={cargando || !input.trim()} aria-label="Enviar">
            {cargando ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Send size={14} aria-hidden="true" />}
          </Button>
        </form>
        </Card>
      </div>
    </AppLayout>
  )
}
