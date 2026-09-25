import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw, Wrench } from 'lucide-react'
import { consultarSalud, useMantenimiento } from '@/store/mantenimiento'
import { useAuthStore } from '@/store/auth'

const INTERVALO_S = 30

/**
 * Página amable de mantenimiento (pedido del fundador 2026-09-25). Tapa toda
 * la app mientras el servidor no responde o está en mantenimiento planeado,
 * consulta /api/health cada 30 s y, al volver, se oculta sola y re-hidrata la
 * sesión — el usuario sigue donde estaba, sin volver a iniciar sesión.
 */
export default function MaintenancePage() {
  const planeado = useMantenimiento((s) => s.planeado)
  const [segundos, setSegundos] = useState(INTERVALO_S)
  const [revisando, setRevisando] = useState(false)

  async function revisar() {
    setRevisando(true)
    const salud = await consultarSalud()
    setRevisando(false)
    setSegundos(INTERVALO_S)
    if (salud === 'ok') {
      useMantenimiento.getState().desactivar()
      void useAuthStore.getState().refresh()
    }
  }

  useEffect(() => {
    const id = window.setInterval(() => {
      setSegundos((s) => {
        if (s <= 1) { void revisar(); return INTERVALO_S }
        return s - 1
      })
    }, 1000)
    return () => window.clearInterval(id)
  }, [])

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto bg-brand-bg px-4 py-10"
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-md overflow-hidden rounded-2xl border border-brand-border bg-brand-surface text-center shadow-[0_12px_40px_rgba(0,0,0,0.12)]"
      >
        <div className="bg-[#00472B] px-8 py-7">
          <img src="/logo.png" alt="Costo360" className="mx-auto h-10 w-auto" />
        </div>
        <div className="px-7 py-8 sm:px-9">
          <motion.div
            animate={{ rotate: [0, -12, 12, -6, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 2.2 }}
            className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary"
          >
            <Wrench size={26} aria-hidden="true" />
          </motion.div>
          <h1 className="mb-3 text-xl font-bold text-brand-text-dark">
            {planeado ? 'Estamos mejorando Costo360 para ti' : 'Estamos haciendo unos ajustes técnicos'}
          </h1>
          <p className="mb-2 text-sm leading-relaxed text-brand-text-secondary">
            {planeado
              ? 'Estamos instalando mejoras para que cotices más rápido y con más precisión. Volvemos en unos minutos.'
              : 'Nuestro equipo ya está trabajando para que todo vuelva a la normalidad en unos minutos.'}
          </p>
          <p className="mb-7 text-sm leading-relaxed text-brand-text-secondary">
            Tu información está segura y tu sesión sigue abierta. Disculpa las molestias.
          </p>
          <button
            type="button"
            onClick={() => void revisar()}
            disabled={revisando}
            className="mx-auto flex h-11 items-center justify-center gap-2 rounded-lg bg-brand-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-primary-light disabled:opacity-70"
          >
            <RefreshCw size={16} className={revisando ? 'animate-spin' : ''} aria-hidden="true" />
            {revisando ? 'Revisando…' : 'Reintentar ahora'}
          </button>
          <p className="mt-4 text-xs text-brand-text-secondary">
            Volvemos a revisar automáticamente en {segundos} s.
          </p>
        </div>
        <div className="border-t border-brand-border/60 bg-[#FDFBF7] px-7 py-4">
          <p className="text-xs text-brand-text-secondary">
            ¿Es urgente? Escríbenos a <a className="font-semibold text-brand-primary" href="mailto:atencion@costo360.com">atencion@costo360.com</a>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
