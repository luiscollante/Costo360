import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Send, AlertTriangle, PauseCircle, Square, Check, ChevronRight, Loader2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { useCostStore, type PasoAgente } from '@/store/cost'
import { resumirFila, etiquetaDePaso, dominioDePaso } from '@/lib/agenteFormato'

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
          <a href={href} target="_blank" rel="noreferrer" className="underline text-brand-primary break-all">{children}</a>
        ),
        code: ({ children }) => <code className="rounded bg-brand-border/40 px-1 py-0.5 text-[12px]">{children}</code>,
        // Cost no debería responder con bloques de código (ver system prompt:
        // "nunca jerga de software"), pero si igual lo hace, sin esto un
        // bloque sin saltos de línea se salía del recuadro del mensaje —
        // hallazgo real reportado por el fundador (2026-09-12). `max-w-full`
        // + `overflow-x-auto` lo contienen con scroll propio en vez de romper
        // el ancho de la burbuja.
        pre: ({ children }) => (
          <pre className="mb-1.5 max-w-full overflow-x-auto rounded-lg bg-brand-border/30 p-2 text-[12px] last:mb-0">
            {children}
          </pre>
        ),
      }}
    >
      {texto}
    </ReactMarkdown>
  )
}

/** Indicador de "pensando" genérico — solo se ve en la ventana entre que se
 * envía el mensaje y llega el primer evento real (texto o un paso). En
 * cuanto hay un paso activo, ES el indicador de carga (con más información
 * que un "…" nunca podría dar) — nunca se muestran los dos a la vez, sería
 * el mismo "ruido visual" que se está quitando. */
function Pensando() {
  return (
    <div className="flex items-center gap-2 py-0.5">
      <motion.span
        className="h-1.5 w-1.5 rounded-full bg-brand-gold"
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
        aria-hidden="true"
      />
      <span className="shimmer-text text-xs font-medium">Pensando…</span>
    </div>
  )
}

/** Una llamada a herramienta en curso o terminada — el reemplazo real del
 * "…" estático. El anillo pulsante solo corre mientras `activo`; terminado,
 * es un check quieto (nunca un loop infinito sobre algo que ya pasó). */
function FilaPaso({ paso }: { paso: PasoAgente }) {
  return (
    <div className="flex items-center gap-2">
      <span className="relative flex h-3 w-3 shrink-0 items-center justify-center">
        {paso.estado === 'activo' && (
          <motion.span
            className="absolute inset-0 rounded-full bg-brand-gold/35"
            animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 1.3, repeat: Infinity, ease: 'easeOut' }}
            aria-hidden="true"
          />
        )}
        {paso.estado === 'activo' ? (
          <span className="h-1.5 w-1.5 rounded-full bg-brand-gold" aria-hidden="true" />
        ) : (
          <Check size={10} className="text-brand-success" aria-hidden="true" />
        )}
      </span>
      <span className={`text-xs ${paso.estado === 'activo' ? 'font-medium text-brand-text-dark' : 'text-brand-text-tertiary'}`}>
        {etiquetaDePaso(paso.nombre)}
      </span>
    </div>
  )
}

/**
 * Cuerpo de la conversación con Cost — mensajes, tarjeta de confirmación, y
 * el formulario de entrada. Sin chrome propio (sin `<Card>`, sin encabezado):
 * cada superficie que lo usa (`AgentePage.tsx`, página; `CostFloating.tsx`,
 * widget flotante) le da su propio contenedor y tamaño, ver Ciclo 3.
 * Ambas superficies leen del mismo `useCostStore`, así que la conversación
 * sigue estando ahí sin importar desde cuál se abrió.
 *
 * Rediseño (2026-09-14): deja de dibujarse como una conversación de mensajería
 * (burbujas de colores en zig-zag) y pasa a ser una bitácora de una sola
 * columna — cada turno es una entrada con su propio label ("Tú"/"Cost"), no
 * "dos actores charlando". El objetivo explícito del fundador: que se sienta
 * como un Agente de IA trabajando, no un chatbot al que le hablas. Ver
 * `docs/` — ciclo de diseño con UI Designer + Whimsy Injector.
 */
export function CostChat({ compacto = false }: { compacto?: boolean }) {
  const { mensajes, input, cargando, propuesta, resolviendo, setInput, enviar, detener, confirmar, cancelar } = useCostStore()
  const scrollRef = useRef<HTMLDivElement>(null)
  const propuestaRef = useRef<HTMLDivElement>(null)
  const [pasosExpandidos, setPasosExpandidos] = useState<Set<number>>(new Set())

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

  function togglePasos(i: number) {
    setPasosExpandidos((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  const txt = compacto
    ? { burbuja: 'text-xs', input: 'text-xs', boton: 'w-8 h-8' }
    : { burbuja: 'text-sm', input: 'text-sm', boton: '' }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex-1 min-h-0">
        <div ref={scrollRef} className="h-full overflow-y-auto p-4">
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
          {mensajes.map((m, i) => {
            const esUltimo = i === mensajes.length - 1
            const pasos = m.pasos ?? []
            const pasosActivos = esUltimo && cargando
            const expandido = pasosActivos || pasosExpandidos.has(i)
            const sinContenidoTodavia = pasosActivos && !m.content && (pasos.length === 0 || pasos.every((p) => p.estado === 'listo'))
            return (
              <motion.div
                key={i}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={
                  m.role === 'user'
                    ? { duration: 0.28, ease: [0.16, 1, 0.3, 1] }
                    : { type: 'spring', stiffness: 500, damping: 30, mass: 0.9, delay: 0.06 }
                }
                className="border-t border-brand-border/50 pt-3 first:border-t-0 first:pt-0"
              >
                {m.role === 'user' ? (
                  // A propósito distinto del estilo "bitácora" de Cost: tu
                  // mensaje es la ORDEN, no un paso del registro — se ve como
                  // un bloque propio, alineado a la derecha, para que nunca
                  // se confunda con la respuesta (hallazgo real del fundador:
                  // sin esto, ambos eran texto plano indistinguible a simple
                  // vista, ver el label pequeño no bastaba).
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-lg border border-brand-primary/25 bg-brand-primary/[0.06] px-3 py-2">
                      <span className="sr-only">Tú: </span>
                      <p className={`whitespace-pre-wrap text-brand-text ${txt.burbuja}`}>{m.content}</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-brand-gold-text">
                      <Sparkles size={11} aria-hidden="true" />
                      Cost
                    </p>

                    {pasos.length > 0 && (
                      expandido ? (
                        <div className="mb-1.5 space-y-1">
                          {pasos.map((p) => <FilaPaso key={p.id} paso={p} />)}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => togglePasos(i)}
                          className="mb-1.5 flex cursor-pointer items-center gap-1 text-[11px] text-brand-text-tertiary transition-colors hover:text-brand-text-secondary"
                        >
                          <ChevronRight size={11} aria-hidden="true" />
                          {pasos.length} paso{pasos.length > 1 ? 's' : ''} · {[...new Set(pasos.map((p) => dominioDePaso(p.nombre)))].join(', ')}
                        </button>
                      )
                    )}

                    <div className={`min-w-0 overflow-hidden break-words ${txt.burbuja}`}>
                      {m.content ? <TextoAsistente texto={m.content} /> : (sinContenidoTodavia ? <Pensando /> : null)}
                    </div>
                  </>
                )}
              </motion.div>
            )
          })}

          {propuesta && (
            <motion.div
              ref={propuestaRef}
              tabIndex={-1}
              role="alert"
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 26, mass: 0.8 }}
              className={`mt-3 rounded-xl border-2 border-dashed p-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${
                propuesta.es_destructiva
                  ? 'border-brand-danger/50 bg-brand-danger-soft'
                  : 'border-brand-success/50 bg-brand-success-soft'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border ${
                    propuesta.es_destructiva
                      ? 'border-brand-danger/30 bg-brand-danger/10'
                      : 'border-brand-success/30 bg-brand-success/10'
                  }`}
                >
                  {propuesta.es_destructiva ? (
                    <AlertTriangle size={13} className="text-brand-danger" aria-hidden="true" />
                  ) : (
                    <PauseCircle size={13} className="text-brand-success" aria-hidden="true" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className={`font-semibold text-brand-text-dark ${txt.burbuja}`}>
                    {propuesta.es_destructiva ? 'Confirma antes de borrar' : 'Confirma esta acción'}
                  </p>
                  <p className="mt-0.5 text-[11px] text-brand-text-secondary">
                    Cost pausó aquí — esto no se ejecuta hasta que decidas.
                  </p>
                </div>
              </div>

              <ul className="mt-2.5 space-y-1.5">
                {propuesta.filas_afectadas.map((f, i) => {
                  const { principal, id, detalles } = resumirFila(f)
                  return (
                    <li key={i} className="rounded-md border border-brand-border/40 bg-brand-surface/60 px-2.5 py-1.5">
                      <div className={txt.burbuja}>
                        <span className="font-medium text-brand-text">{principal}</span>
                        {id != null && <span className="text-brand-text-secondary"> (id {id})</span>}
                      </div>
                      {detalles.length > 0 && (
                        <div className="text-xs text-brand-text-secondary">
                          {detalles.map(([k, v]) => `${k}: ${v}`).join(' · ')}
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
                  {resolviendo && <Loader2 size={12} className="animate-spin" aria-hidden="true" />}
                  Confirmar
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={cancelar}
                  disabled={resolviendo}
                  aria-label="Cancelar y descartar la propuesta"
                >
                  {resolviendo && <Loader2 size={12} className="animate-spin" aria-hidden="true" />}
                  Cancelar
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); enviar() }}
        className="flex items-center gap-2 border-t border-brand-border p-3"
      >
        <motion.span
          className="shrink-0 text-brand-text-tertiary"
          animate={
            cargando
              ? { filter: ['drop-shadow(0 0 0px #15612E00)', 'drop-shadow(0 0 6px #15612E80)', 'drop-shadow(0 0 0px #15612E00)'] }
              : { filter: 'drop-shadow(0 0 0px #15612E00)' }
          }
          transition={cargando ? { duration: 2.2, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.3 }}
        >
          <Sparkles size={16} aria-hidden="true" />
        </motion.span>
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
