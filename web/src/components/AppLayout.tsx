import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, Search } from 'lucide-react'
import Sidebar from './Sidebar'
import AgenteChat from './AgenteChat'
import CommandPalette from './CommandPalette'
import Logo from './Logo'
import { CampanaNotificaciones } from './proyectos/CampanaNotificaciones'
import { useAuthStore } from '@/store/auth'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { usuario } = useAuthStore()
  const mainRef = useRef<HTMLElement>(null)

  // Al cambiar de ruta: mover el foco al contenido (accesibilidad de teclado /
  // lector de pantalla) y resetear el scroll. El `document.title` lo fija
  // `<PageHeader>` en cada página (R6).
  useEffect(() => {
    mainRef.current?.focus({ preventScroll: true })
    mainRef.current?.scrollTo(0, 0)
  }, [location.pathname])

  return (
    <div className="flex h-screen overflow-hidden bg-brand-bg relative">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-brand-primary focus:text-white focus:text-sm"
      >
        Saltar al contenido
      </a>

      {/* Mobile header bar */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-brand-bg/95 border-b border-brand-border/40 flex items-center justify-between px-4 gap-3 z-30" style={{ backdropFilter: 'blur(12px)' }}>
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="w-11 h-11 flex items-center justify-center rounded-lg border border-brand-border text-brand-muted hover:text-brand-text hover:border-brand-primary/40 transition-all cursor-pointer"
            aria-label="Abrir menú"
          >
            <Menu size={18} />
          </button>
          <Logo variant="dark" className="h-6 w-auto ml-1" />
        </div>
        <CampanaNotificaciones />
      </header>

      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden fixed inset-0 bg-black/60 z-40"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar — desktop: static, mobile: drawer */}
      <div className="hidden lg:block relative" style={{ zIndex: 2 }}>
        <Sidebar onNavigate={() => {}} />
      </div>
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ x: -224 }}
            animate={{ x: 0 }}
            exit={{ x: -224 }}
            transition={{ type: 'spring', stiffness: 400, damping: 40 }}
            className="lg:hidden fixed top-0 left-0 h-full z-50"
          >
            <div className="relative">
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="absolute top-3 right-[-44px] w-11 h-11 flex items-center justify-center rounded-lg bg-brand-input-deep border border-brand-border text-brand-muted hover:text-brand-text transition-all z-10 cursor-pointer"
                aria-label="Cerrar menú"
              >
                <X size={16} />
              </button>
              <Sidebar onNavigate={() => setSidebarOpen(false)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop header bar — solo visible lg+ */}
      <header
        className="hidden lg:flex h-12 items-center justify-between gap-4 px-6 border-b border-brand-border/30 fixed top-0 right-0 bg-brand-bg/80 z-20"
        style={{ left: '224px', backdropFilter: 'blur(12px)' }}
      >
        <div className="flex flex-col leading-tight min-w-0">
          {usuario?.empresa_nombre && (
            <span className="text-xs font-semibold text-brand-text-dark truncate">
              {usuario.empresa_nombre}
            </span>
          )}
          <span className="text-[11px] text-brand-text-secondary truncate">
            {usuario?.nombre_completo}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <CampanaNotificaciones />
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('costo360:open-command-palette'))}
            className="flex items-center gap-2 px-3 h-9 rounded-lg border border-brand-border text-brand-text-secondary hover:text-brand-text hover:border-brand-primary/40 transition-all cursor-pointer shrink-0"
            aria-label="Buscar y navegar (Ctrl+K)"
          >
            <Search size={14} />
            <span className="text-xs">Buscar</span>
            <kbd className="text-[10px] px-1.5 py-0.5 rounded border border-brand-border/70 text-brand-text-secondary font-mono">Ctrl K</kbd>
          </button>
        </div>
      </header>

      {/* Main content */}
      <main
        id="main"
        ref={mainRef}
        tabIndex={-1}
        className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 pt-[calc(3.5rem+1rem)] lg:pt-20 relative min-w-0 focus:outline-none"
        style={{ zIndex: 1 }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="min-h-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      <CommandPalette />
      {/* La burbuja flotante del chat legado no tiene sentido dentro de la
          propia página del asistente nuevo (Objetivo 5) — sería un segundo
          punto de entrada al mismo agente, superpuesto sobre el primero. */}
      {location.pathname !== '/agente' && <AgenteChat />}
    </div>
  )
}
