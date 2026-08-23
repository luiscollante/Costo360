import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, Sun, Moon, Search } from 'lucide-react'
import Sidebar from './Sidebar'
import AgenteChat from './AgenteChat'
import CommandPalette from './CommandPalette'
import { useTheme } from '../hooks/useTheme'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="flex min-h-screen bg-brand-bg relative">
      {/* Atmospheric background orbs */}
      <div className="fixed top-[-15%] left-[15%] w-[700px] h-[600px] rounded-full bg-brand-primary/[0.055] blur-[140px] pointer-events-none" style={{ zIndex: 0 }} />
      <div className="fixed bottom-[-10%] right-[8%] w-[550px] h-[500px] rounded-full bg-brand-gold/[0.04] blur-[120px] pointer-events-none" style={{ zIndex: 0 }} />
      <div className="fixed top-[50%] right-[30%] w-[350px] h-[350px] rounded-full bg-brand-primary/[0.03] blur-[90px] pointer-events-none" style={{ zIndex: 0 }} />

      {/* Mobile header bar */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-brand-bg/95 border-b border-brand-border/40 flex items-center px-4 gap-3 z-30" style={{ backdropFilter: 'blur(12px)' }}>
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="w-11 h-11 flex items-center justify-center rounded-lg border border-brand-border text-brand-muted hover:text-brand-text hover:border-brand-primary/40 transition-all cursor-pointer"
          aria-label="Abrir menú"
        >
          <Menu size={18} />
        </button>
        <img src="/logo.png" alt="Costo360" className="h-7 w-auto object-contain flex-1" />
        <button
          type="button"
          onClick={toggleTheme}
          className="w-9 h-9 flex items-center justify-center rounded-lg border border-brand-border text-brand-muted hover:text-brand-text hover:border-brand-primary/40 transition-all cursor-pointer"
          aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
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

      {/* Desktop header bar — toggle button, only visible lg+ */}
      <header
        className="hidden lg:flex h-12 items-center justify-end gap-2.5 px-6 border-b border-brand-border/30 fixed top-0 right-0 bg-brand-bg/80 z-20"
        style={{ left: '224px', backdropFilter: 'blur(12px)' }}
      >
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('costo360:open-command-palette'))}
          className="flex items-center gap-2 px-3 h-9 rounded-lg border border-brand-border text-brand-muted hover:text-brand-text hover:border-brand-primary/40 transition-all cursor-pointer"
          aria-label="Buscar y navegar (Ctrl+K)"
        >
          <Search size={14} />
          <span className="text-xs">Buscar</span>
          <kbd className="text-[10px] px-1.5 py-0.5 rounded border border-brand-border/70 text-brand-muted/50 font-mono">Ctrl K</kbd>
        </button>
        <button
          type="button"
          onClick={toggleTheme}
          className="w-9 h-9 flex items-center justify-center rounded-lg border border-brand-border text-brand-muted hover:text-brand-text hover:border-brand-primary/40 transition-all cursor-pointer"
          aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </header>

      {/* Main content */}
      <main
        className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 pt-[calc(3.5rem+1rem)] lg:pt-20 relative min-w-0"
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
      <AgenteChat />
    </div>
  )
}
