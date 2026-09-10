import { useEffect, useRef } from 'react'
import { Sparkles, Send, AlertTriangle, Square } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { useCostStore } from '@/store/cost'
import { CAMPOS_PRINCIPAL, CAMPOS_OCULTOS, tieneValor, etiqueta, valorLegible } from '@/lib/agenteFormato'

const SUGERENCIAS = [
  'Lista las tareas del proyecto 8',
  'Crea una tarea llamada Revisar corte en el proyecto 8',
  'Muéstrame las cotizaciones pendientes de este mes',
]

/** Markdown del modelo → JSX con los tokens de marca (nunca los estilos por
 * defecto del navegador para <strong>/<ul>/etc). */
function TextoAsistente({ texto }: { texto: string }) {
  return (
    <ReactMarkdown
      components={{
        p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
        strong: ({ children }) => <strong className="font-semibold text-brand-text-dark">{children}</strong>,
        ul: ({ children }) => <ul className="mb-1.5 list-disc space-y-0.5 pl-4 last:mb-0">{children}</ul>,
        ol: ({ children }) => <ol className="mb-1.5 list-decimal space-y-0.5 pl-4 last:mb-0">{children}</ol>,
        li: ({ children }) => <li>{children}</li>,
        a: ({ children, href }) => (
          <a href={href} target="_blank" rel="noreferrer" className="underline text-brand-primary">{children}</a>
        ),
        code: ({ children }) => <code className="rounded bg-brand-border/40 px-1 py-0.5 text-[12px]">{children}</code>,
      }}
    >
      {texto}
    </ReactMarkdown>
  )
}

/**
 * Cuerpo de la conversación con Cost — mensajes, tarjeta de confirmación, y
 * el formulario de entrada. Sin chrome propio (sin `<Card>`, sin encabezado):
 * cada superficie que lo usa (`AgentePage.tsx`, página; `CostFloating.tsx`,
 * widget flotante) le da su propio contenedor y tamaño, ver Ciclo 3.
 * Ambas superficies leen del mismo `useCostStore`, así que la conversación
 * sigue estando ahí sin importar desde cuál se abrió.
 */
export function CostChat({ compacto = false }: { compacto?: boolean }) {
  const { mensajes, input, cargando, propuesta, resolviendo, setInput, enviar, detener, confirmar, cancelar } = useCostStore()
  const scrollRef = useRef<HTMLDivElement>(null)
  const propuestaRef = useRef<HTMLDivElement>(null)

  function scrollAbajo() {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
    })
  }

  useEffect(() => { scrollAbajo() }, [mensajes, cargando])

  // Foco acotado a la tarjeta al aparecer (sin atrapar todo el árbol, a
  // diferencia de un <Dialog> modal — el agente nunca debe bloquear la
  // navegación manual, Regla 7). Mismo patrón que ya usa TareaDialog.tsx
  // para su confirmación inline de borrado (hallazgo Fase 5 a11y).
  useEffect(() => {
    if (propuesta) propuestaRef.current?.focus()
  }, [propuesta])

  const txt = compacto
    ? { burbuja: 'text-xs', input: 'text-xs', boton: 'w-8 h-8' }
    : { burbuja: 'text-sm', input: 'text-sm', boton: '' }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {mensajes.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center">
            <EmptyState
              icon={<Sparkles size={compacto ? 24 : 32} />}
              title="Hola, soy Cost. Pregúntame sobre tus proyectos, tareas o cotizaciones."
            />
            <div className="w-full max-w-sm space-y-1.5">
              {SUGERENCIAS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => enviar(s)}
                  className={`w-full cursor-pointer rounded-lg border border-brand-border px-3 py-2 text-left text-brand-text-secondary transition-colors hover:border-brand-primary/40 hover:text-brand-text ${txt.input}`}
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
              className={`max-w-[85%] rounded-xl px-3 py-2 ${txt.burbuja} ${
                m.role === 'user'
                  ? 'whitespace-pre-wrap bg-brand-primary text-white'
                  : 'border border-brand-border bg-brand-bg text-brand-text'
              }`}
            >
              {m.role === 'assistant' ? (
                m.content
                  ? <TextoAsistente texto={m.content} />
                  : (cargando && i === mensajes.length - 1 ? <span aria-hidden="true">…</span> : '')
              ) : (
                m.content
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
            <p className={`flex items-center gap-1.5 font-semibold text-brand-text-dark ${txt.burbuja}`}>
              {propuesta.es_destructiva && <AlertTriangle size={14} className="text-brand-danger" aria-hidden="true" />}
              {propuesta.es_destructiva ? 'Confirma antes de borrar' : 'Confirma esta acción'}
            </p>
            <ul className={`mt-2 space-y-1.5 text-brand-text ${txt.burbuja}`}>
              {propuesta.filas_afectadas.map((f, i) => {
                const campoPrincipal = CAMPOS_PRINCIPAL.find((c) => tieneValor(f[c]))
                const principal = campoPrincipal
                  ? String(f[campoPrincipal])
                  : (tieneValor(f.id) ? String(f.id) : 'Esta acción')
                const detalles = Object.entries(f).filter(
                  ([k, v]) => k !== campoPrincipal && !CAMPOS_OCULTOS.has(k) && tieneValor(v)
                )
                return (
                  <li key={i}>
                    <div>
                      <span className="font-medium">{principal}</span>
                      {f.id != null && (
                        <span className="text-brand-text-secondary"> (id {String(f.id)})</span>
                      )}
                    </div>
                    {detalles.length > 0 && (
                      <div className="text-xs text-brand-text-secondary">
                        {detalles.map(([k, v]) => `${etiqueta(k)}: ${valorLegible(k, v)}`).join(' · ')}
                      </div>
                    )}
                  </li>
                )
              })}
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
          className={`h-9 flex-1 rounded-lg border border-brand-border bg-brand-input px-3 text-brand-text focus-visible:outline-none focus-visible:border-brand-primary ${txt.input}`}
        />
        {cargando ? (
          <Button type="button" size="sm" variant="danger" onClick={detener} aria-label="Detener la respuesta">
            <Square size={12} aria-hidden="true" />
          </Button>
        ) : (
          <Button type="submit" size="sm" disabled={!input.trim()} aria-label="Enviar">
            <Send size={14} aria-hidden="true" />
          </Button>
        )}
      </form>
    </div>
  )
}
