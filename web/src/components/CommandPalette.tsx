import { useEffect, useMemo, useState } from 'react'
import { Command } from 'cmdk'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  LayoutDashboard, PlusCircle, ClipboardList, Layers, Grid3X3, Boxes,
  SlidersHorizontal, Settings2, Zap, HardHat, Search, BookMarked, type LucideIcon,
} from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { puedeVerDashboard } from '@/lib/capabilities'

interface CommandItem { to: string; label: string; hint?: string; Icon: LucideIcon; requiereDashboard?: boolean }

const ITEMS: CommandItem[] = [
  { to: '/dashboard',      label: 'Dashboard',          hint: 'Resumen del negocio',    Icon: LayoutDashboard,   requiereDashboard: true },
  { to: '/cotizacion',     label: 'Nueva Cotización',   hint: 'Crear cotización guiada', Icon: PlusCircle        },
  { to: '/express',        label: 'Cotización Express', hint: 'Cálculo rápido',          Icon: Zap               },
  { to: '/cotizacion-aiu', label: 'Cotización AIU',     hint: 'Obra pública',            Icon: HardHat           },
  { to: '/historial',      label: 'Historial',          hint: 'Cotizaciones guardadas',  Icon: ClipboardList     },
  { to: '/inventario',     label: 'Inventario',         hint: 'Láminas en bodega',       Icon: Boxes             },
  { to: '/retales',        label: 'Retales',            hint: 'Sobrantes reutilizables', Icon: Layers            },
  { to: '/nesting',        label: 'Nesting',            hint: 'Plano de corte óptimo',   Icon: Grid3X3           },
  { to: '/materiales',     label: 'Catálogo',           hint: 'Materiales y precios',    Icon: BookMarked        },
  { to: '/parametros',     label: 'Parámetros',         hint: 'Costos de fabricación',   Icon: SlidersHorizontal, requiereDashboard: true },
  { to: '/configuracion',  label: 'Configuración',      hint: 'Datos de la empresa',     Icon: Settings2,         requiereDashboard: true },
]

export default function CommandPalette() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const usuario = useAuthStore((s) => s.usuario)

  const items = useMemo(() => {
    const verDash = puedeVerDashboard(usuario)
    return ITEMS.filter((it) => !it.requiereDashboard || verDash)
  }, [usuario])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    function onOpenRequest() {
      setOpen(true)
    }
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('costo360:open-command-palette', onOpenRequest)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('costo360:open-command-palette', onOpenRequest)
    }
  }, [])

  function ir(to: string) {
    navigate(to)
    setOpen(false)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-start justify-center pt-[14vh] px-4"
          onClick={() => setOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.97 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-brand-border bg-brand-surface shadow-[0_24px_70px_rgba(0,0,0,0.24)]"
          >
            {/* Filete de marca */}
            <div className="h-1 w-full bg-gradient-to-r from-brand-primary via-brand-primary-light to-brand-gold" aria-hidden="true" />
            <Command loop>
              <div className="flex items-center gap-2.5 border-b border-brand-border px-4 py-3">
                <Search className="h-4 w-4 shrink-0 text-brand-text-secondary" aria-hidden="true" />
                <Command.Input
                  autoFocus
                  placeholder="Ir a una sección… (Dashboard, Nesting, Inventario…)"
                  className="flex-1 bg-transparent text-sm text-brand-text-dark placeholder:text-brand-text-secondary outline-none"
                />
                <kbd className="hidden rounded border border-brand-border px-1.5 py-0.5 font-mono text-[10px] text-brand-text-secondary sm:inline-block">esc</kbd>
              </div>
              <Command.List className="max-h-80 overflow-y-auto p-2">
                <Command.Empty className="px-3 py-6 text-center text-xs text-brand-text-secondary">
                  Sin resultados.
                </Command.Empty>
                {items.map(({ to, label, hint, Icon }) => (
                  <Command.Item
                    key={to}
                    value={`${label} ${hint ?? ''}`}
                    onSelect={() => ir(to)}
                    className="group relative flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-brand-text transition-colors aria-selected:bg-brand-primary/10"
                  >
                    {/* Indicador no cromático de selección */}
                    <span
                      className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-brand-primary opacity-0 group-aria-selected:opacity-100"
                      aria-hidden="true"
                    />
                    <Icon className="h-4 w-4 shrink-0 text-brand-text-secondary group-aria-selected:text-brand-primary" aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-brand-text-dark">{label}</span>
                      {hint && <span className="block truncate text-[11px] text-brand-text-secondary">{hint}</span>}
                    </span>
                  </Command.Item>
                ))}
              </Command.List>
            </Command>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
