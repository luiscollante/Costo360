import { NavLink, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/store/auth'
import { logout } from '@/api/auth'
import {
  LayoutDashboard,
  PlusCircle,
  ClipboardList,
  Layers,
  Grid3X3,
  Boxes,
  SlidersHorizontal,
  Settings2,
  ShieldCheck,
  Zap,
  HardHat,
  type LucideIcon,
} from 'lucide-react'
import { useTheme } from '../hooks/useTheme'

interface NavItem { to: string; label: string; Icon: LucideIcon }

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Crear',
    items: [
      { to: '/cotizacion',     label: 'Nueva Cotización', Icon: PlusCircle },
      { to: '/express',        label: 'Express',          Icon: Zap        },
      { to: '/cotizacion-aiu', label: 'Cotización AIU',   Icon: HardHat    },
    ],
  },
  {
    label: 'Consultar',
    items: [
      { to: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
      { to: '/historial', label: 'Historial', Icon: ClipboardList  },
    ],
  },
  {
    label: 'Taller',
    items: [
      { to: '/inventario', label: 'Inventario', Icon: Boxes    },
      { to: '/retales',    label: 'Retales',    Icon: Layers   },
      { to: '/nesting',    label: 'Nesting',     Icon: Grid3X3  },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { to: '/parametros',    label: 'Parámetros',    Icon: SlidersHorizontal },
      { to: '/configuracion', label: 'Configuración', Icon: Settings2         },
    ],
  },
]

export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { usuario, clearSession } = useAuthStore()
  const navigate = useNavigate()
  const { theme } = useTheme()

  async function handleLogout() {
    try { await logout() } catch { /* ignorar */ }
    clearSession()
    navigate('/login')
  }

  const sidebarBg = theme === 'light'
    ? '#F0F4F8'
    : 'linear-gradient(180deg, #07100D 0%, #050B09 50%, #07100D 100%)'

  const inactiveNav = theme === 'light'
    ? 'text-brand-muted hover:text-brand-text hover:bg-brand-primary/[0.06]'
    : 'text-brand-muted hover:text-brand-text hover:bg-brand-surface'

  const activeNav = theme === 'light'
    ? 'bg-brand-primary/[0.10] text-brand-primary font-medium'
    : 'bg-brand-primary/15 text-brand-text font-medium'

  return (
    <aside
      className="w-56 shrink-0 flex flex-col h-screen sticky top-0 border-r border-brand-border/80 relative"
      style={{ background: sidebarBg, backdropFilter: theme === 'dark' ? 'blur(20px)' : 'none' }}
    >
      {/* Logo */}
      <div className="px-4 py-2.5 border-b border-brand-border flex flex-col items-center gap-0.5 shrink-0">
        <img src="/logo.png" alt="Costo360" className="w-[128px] h-auto object-contain" />
        <p className="text-[8px] text-brand-muted leading-none">Sistema de Cotizaciones</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-2.5 space-y-2 px-3 relative overflow-y-auto min-h-0">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="px-3 mb-0.5 text-[9px] font-semibold uppercase tracking-widest text-brand-muted/45">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map(({ to, label, Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `relative flex items-center gap-3 px-3 py-1.5 rounded-lg text-[13px] leading-tight transition-colors ${
                      isActive ? activeNav : inactiveNav
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <>
                          <motion.span
                            layoutId="nav-active"
                            className="absolute left-0 top-1 bottom-1 w-0.5 bg-brand-primary rounded-full"
                            style={{ boxShadow: '0 0 8px #1F6F54, 0 0 16px #1F6F5460' }}
                            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                          />
                          <motion.span
                            layoutId="nav-active-bg"
                            className="absolute inset-0 rounded-lg bg-brand-primary/[0.08]"
                            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                          />
                        </>
                      )}
                      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      {label}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
        {usuario?.rol === 'Admin' && (
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              `relative flex items-center gap-3 px-3 py-1.5 rounded-lg text-[13px] leading-tight transition-colors ${
                isActive
                  ? 'bg-purple-500/15 text-purple-300 font-medium'
                  : inactiveNav
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute left-0 top-1 bottom-1 w-0.5 bg-brand-primary rounded-full"
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  />
                )}
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                Panel Admin
              </>
            )}
          </NavLink>
        )}
      </nav>

      {/* Usuario */}
      <div className="px-4 py-2.5 border-t border-brand-border shrink-0">
        <p className="text-xs text-brand-text font-medium truncate">{usuario?.nombre_completo}</p>
        <p className="text-[10px] text-brand-muted capitalize">{usuario?.rol}</p>
        <button
          onClick={handleLogout}
          className="mt-1.5 text-xs text-brand-muted hover:text-red-400 transition-colors cursor-pointer"
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
