import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, X, Send, Loader2 } from 'lucide-react'
import { chatConAgente, type MensajeChat } from '@/api/agente'

const SALUDO: MensajeChat = {
  role: 'assistant',
  content: 'Hola, soy el asistente de Parámetros de Costo360. Pregúntame cómo estructurar un costo de fabricación, qué significa la merma, o cómo clasificar un costo nuevo.',
}

const SUGERENCIAS = [
  '¿Qué es la merma de material?',
  '¿Cómo cobro la mano de obra de instalación?',
  'Quiero agregar un costo de transporte, ¿cómo lo clasifico?',
]

export default function AgenteChat() {
  const [open, setOpen] = useState(false)
  const [mensajes, setMensajes] = useState<MensajeChat[]>([SALUDO])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [mensajes, loading, open])

  async function enviar(texto?: string) {
    const contenido = (texto ?? input).trim()
    if (!contenido || loading) return
    setError(null)
    setInput('')
    const historialActual = mensajes.filter((m) => m !== SALUDO)
    const nuevos: MensajeChat[] = [...mensajes, { role: 'user', content: contenido }]
    setMensajes(nuevos)
    setLoading(true)
    try {
      const respuesta = await chatConAgente(contenido, historialActual)
      setMensajes((prev) => [...prev, { role: 'assistant', content: respuesta }])
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        'No se pudo contactar al asistente. Intenta de nuevo.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    enviar()
  }

  return (
    <>
      {/* Botón flotante */}
      <motion.button
        onClick={() => setOpen((v) => !v)}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3, type: 'spring', stiffness: 300, damping: 20 }}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        className="fixed bottom-5 right-5 z-40 w-12 h-12 rounded-full bg-brand-primary text-white flex items-center justify-center shadow-[0_0_24px_#1F6F5450,0_0_0_1px_#1F6F5460] hover:shadow-[0_0_36px_#1F6F5470] transition-shadow cursor-pointer"
        aria-label={open ? 'Cerrar asistente' : 'Abrir asistente de Parámetros'}
      >
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <X className="w-5 h-5" />
            </motion.span>
          ) : (
            <motion.span key="sparkles" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <Sparkles className="w-5 h-5" />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Panel de chat */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="fixed bottom-20 right-5 z-40 w-[min(360px,calc(100vw-2.5rem))] h-[min(520px,calc(100vh-8rem))] glass rounded-2xl border border-brand-border shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-brand-border/60 bg-brand-surface/30 flex items-center gap-2.5 shrink-0">
              <div className="w-7 h-7 rounded-lg bg-brand-primary/15 border border-brand-primary/30 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-brand-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-brand-text leading-tight">Asistente de Parámetros</p>
                <p className="text-[10px] text-brand-muted/50 leading-tight">Beta · Gemini 3.5 Flash-Lite</p>
              </div>
            </div>

            {/* Mensajes */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
              {mensajes.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
                      m.role === 'user'
                        ? 'bg-brand-primary text-white rounded-br-sm'
                        : 'bg-brand-surface/70 border border-brand-border/60 text-brand-text rounded-bl-sm'
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-brand-surface/70 border border-brand-border/60 rounded-xl rounded-bl-sm px-3 py-2 flex items-center gap-1.5">
                    <Loader2 className="w-3 h-3 animate-spin text-brand-muted" />
                    <span className="text-[10px] text-brand-muted">Pensando…</span>
                  </div>
                </div>
              )}
              {error && (
                <p className="text-[11px] text-red-400 text-center">{error}</p>
              )}
              {mensajes.length === 1 && !loading && (
                <div className="pt-1 space-y-1.5">
                  {SUGERENCIAS.map((s) => (
                    <button
                      key={s}
                      onClick={() => enviar(s)}
                      className="w-full text-left text-[11px] px-2.5 py-1.5 rounded-lg border border-brand-border/60 text-brand-muted hover:text-brand-text hover:border-brand-primary/40 transition-colors cursor-pointer"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-3 border-t border-brand-border/60 flex items-center gap-2 shrink-0">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escribe tu pregunta…"
                maxLength={2000}
                className="flex-1 px-3 py-2 rounded-lg bg-brand-input border border-brand-border text-xs text-brand-text placeholder:text-brand-muted/40 focus:outline-none focus:border-brand-primary transition-colors"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg bg-brand-primary text-white disabled:opacity-40 transition-opacity cursor-pointer"
                aria-label="Enviar"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
