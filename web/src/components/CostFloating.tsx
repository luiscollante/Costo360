import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, X } from 'lucide-react'
import { CostChat } from '@/components/CostChat'
import { useCostStore } from '@/store/cost'

/**
 * Widget flotante global de Cost (Ciclo 3, Objetivo 5) — reemplaza al
 * asistente de Parámetros legado (`AgenteChat.tsx`, borrado en este mismo
 * ciclo). Ya NO es un asistente aparte sin tool-calling: es el mismo Cost de
 * `/agente`, compartiendo conversación vía `useCostStore` — cerrar este
 * panel y abrir la página dedicada (o viceversa) nunca pierde el hilo.
 *
 * Decisión del fundador (2026-09-09): si el panel se minimiza mientras Cost
 * está pensando o con una propuesta sin resolver, sigue "corriendo" en
 * segundo plano — el botón muestra un punto de aviso. Invariante de
 * seguridad, verificada en la auditoría de este ciclo: minimizar SOLO oculta
 * la UI, nunca toca `confirmar()`/`cancelar()` del store — una propuesta
 * pendiente sigue esperando un clic humano explícito sin importar cuánto
 * tiempo el panel esté minimizado (ver `store/cost.ts`).
 */
export default function CostFloating() {
  const [open, setOpen] = useState(false)
  const cargando = useCostStore((s) => s.cargando)
  const propuesta = useCostStore((s) => s.propuesta)
  const contenedorRef = useRef<HTMLDivElement>(null)

  // Clic fuera del botón/panel cierra el modal (el botón ya maneja su propio
  // toggle en su onClick, así que un clic ahí nunca dispara este cierre).
  useEffect(() => {
    if (!open) return
    function alClicFuera(e: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', alClicFuera)
    return () => document.removeEventListener('mousedown', alClicFuera)
  }, [open])

  // Punto de aviso: solo tiene sentido mostrarlo cuando el panel está
  // CERRADO — si está abierto, el usuario ya está viendo lo mismo que el
  // aviso resumiría.
  const conAviso = !open && (cargando || propuesta != null)

  return (
    <div ref={contenedorRef}>
      {/* Botón flotante */}
      <motion.button
        onClick={() => setOpen((v) => !v)}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3, type: 'spring', stiffness: 300, damping: 20 }}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        className="fixed bottom-5 right-5 z-40 flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-brand-primary text-white shadow-[0_0_24px_#1F6F5450,0_0_0_1px_#1F6F5460] transition-shadow hover:shadow-[0_0_36px_#1F6F5470]"
        aria-label={open ? 'Cerrar Cost' : conAviso ? 'Abrir Cost — tiene una actualización pendiente' : 'Abrir Cost'}
      >
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <X className="h-5 w-5" />
            </motion.span>
          ) : (
            <motion.span key="sparkles" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <Sparkles className="h-5 w-5" />
            </motion.span>
          )}
        </AnimatePresence>
        {conAviso && (
          <span
            className="absolute right-0.5 top-0.5 h-2.5 w-2.5 rounded-full bg-brand-gold ring-2 ring-brand-primary"
            aria-hidden="true"
          />
        )}
      </motion.button>

      {/* Panel de chat */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.18, ease: 'easeOut' } }}
            exit={{ opacity: 0, y: 10, scale: 0.98, transition: { duration: 0.32, ease: [0.4, 0, 0.2, 1] } }}
            className="glass fixed bottom-20 right-5 z-40 flex h-[min(560px,calc(100vh-8rem))] w-[min(380px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-brand-border shadow-2xl"
          >
            {/* Header */}
            <div className="flex shrink-0 items-center gap-2.5 border-b border-brand-border/60 bg-brand-surface/30 px-4 py-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-brand-primary/30 bg-brand-primary/15">
                <Sparkles className="h-3.5 w-3.5 text-brand-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold leading-tight text-brand-text">Cost</p>
                <p className="text-[10px] leading-tight text-brand-muted/50">Tu asistente de Costo360</p>
              </div>
            </div>

            <CostChat compacto />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
