import { useEffect, useState } from 'react'
import { Command } from 'cmdk'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  LayoutDashboard, PlusCircle, ClipboardList, Layers, Grid3X3, Boxes,
  SlidersHorizontal, Settings2, Zap, HardHat, Search, type LucideIcon,
} from 'lucide-react'

interface CommandItem { to: string; label: string; hint?: string; Icon: LucideIcon }

const ITEMS: CommandItem[] = [
  { to: '/dashboard',     label: 'Dashboard',            hint: 'Resumen del negocio',       Icon: LayoutDashboard  },
  { to: '/cotizacion',    label: 'Nueva Cotización',     hint: 'Crear cotización guiada',    Icon: PlusCircle       },
  { to: '/express',       label: 'Cotización Express',   hint: 'Cálculo rápido',             Icon: Zap              },
  { to: '/cotizacion-aiu', label: 'Cotización AIU',      hint: 'Obra pública',               Icon: HardHat          },
  { to: '/historial',     label: 'Historial',            hint: 'Cotizaciones guardadas',     Icon: ClipboardList    },
  { to: '/inventario',    label: 'Inventario',           hint: 'Láminas en bodega',          Icon: Boxes            },
  { to: '/retales',       label: 'Retales',              hint: 'Sobrantes reutilizables',    Icon: Layers           },
  { to: '/nesting',       label: 'Nesting',               hint: 'Plano de corte óptimo',      Icon: Grid3X3          },
  { to: '/parametros',    label: 'Parámetros',            hint: 'Costos de fabricación',      Icon: SlidersHorizontal },
  { to: '/configuracion', label: 'Configuración',         hint: 'Datos de la empresa',        Icon: Settings2        },
]

export default function CommandPalette() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

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
          className="fixed inset-0 bg-black/55 backdrop-blur-sm z-[60] flex items-start justify-center pt-[14vh] px-4"
          onClick={() => setOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.97 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg glass rounded-2xl border border-brand-border shadow-2xl overflow-hidden"
          >
            <Command loop>
              <div className="flex items-center gap-2.5 px-4 py-3 border-b border-brand-border/60">
                <Search className="w-4 h-4 text-brand-muted/50 shrink-0" />
                <Command.Input
                  autoFocus
                  placeholder="Ir a… (Dashboard, Nesting, Inventario…)"
                  className="flex-1 bg-transparent text-sm text-brand-text placeholder:text-brand-muted/40 outline-none"
                />
                <kbd className="hidden sm:inline-block text-[10px] px-1.5 py-0.5 rounded border border-brand-border text-brand-muted/50 font-mono">esc</kbd>
              </div>
              <Command.List className="max-h-80 overflow-y-auto p-2">
                <Command.Empty className="px-3 py-6 text-center text-xs text-brand-muted/50">
                  Sin resultados.
                </Command.Empty>
                {ITEMS.map(({ to, label, hint, Icon }) => (
                  <Command.Item
                    key={to}
                    value={`${label} ${hint ?? ''}`}
                    onSelect={() => ir(to)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-brand-muted cursor-pointer aria-selected:bg-brand-primary/[0.12] aria-selected:text-brand-text transition-colors"
                  >
                    <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span className="flex-1 min-w-0">
                      <span className="block text-brand-text font-medium truncate">{label}</span>
                      {hint && <span className="block text-[11px] text-brand-muted/50 truncate">{hint}</span>}
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
