import { NavLink, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/store/auth'
import { supabase } from '@/lib/supabaseClient'
import { logoutSession } from '@/api/session'
import { puedeVerDashboard } from '@/lib/capabilities'
import Logo from './Logo'
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

interface NavItem { to: string; label: string; Icon: LucideIcon; requiereDashboard?: boolean }

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
      { to: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard, requiereDashboard: true },
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
      { to: '/parametros',    label: 'Parámetros',    Icon: SlidersHorizontal, requiereDashboard: true },
      { to: '/configuracion', label: 'Configuración', Icon: Settings2,         requiereDashboard: true },
    ],
  },
]

export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { usuario, clearSession } = useAuthStore()
  const navigate = useNavigate()

  async function handleLogout() {
    try { await logoutSession() } catch { /* ignorar */ }
    await supabase.auth.signOut()
    clearSession()
    navigate('/login')
  }

  // Barra lateral esmeralda-glass — texto en colores SÓLIDOS (sin alfa). Ver R1/R4.
  const inactiveNav = 'text-[#F5E8D2] hover:bg-white/[0.08]'
  const activeNav = 'text-white font-medium'

  // Regla 6: el rol operativo no ve Dashboard / Parámetros / Configuración.
  const verDashboard = puedeVerDashboard(usuario)
  const grupos = NAV_GROUPS
    .map((g) => ({ ...g, items: g.items.filter((it) => !it.requiereDashboard || verDashboard) }))
    .filter((g) => g.items.length > 0)

  return (
    <aside className="glass-emerald w-56 shrink-0 flex flex-col h-screen sticky top-0 relative">
      {/* Logo */}
      <div className="px-4 py-2.5 border-b border-white/15 flex flex-col items-center gap-0.5 shrink-0">
        <Logo variant="light" className="w-[132px] h-auto object-contain" />
        <p className="text-[10px] text-[#E4D8BF] leading-none">Sistema de Cotizaciones</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-2.5 space-y-2 px-3 relative overflow-y-auto min-h-0">
        {grupos.map((group) => (
          <div key={group.label}>
            <p className="px-3 mb-0.5 text-[11px] font-semibold uppercase tracking-widest text-[#E4D8BF]">
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
                            className="absolute left-0 top-1 bottom-1 w-0.5 bg-brand-gold rounded-full"
                            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                          />
                          <motion.span
                            layoutId="nav-active-bg"
                            className="absolute inset-0 rounded-lg bg-white/[0.14]"
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
        {usuario?.puede_gestionar_usuarios && (
          <NavLink
            to="/admin"
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
                      className="absolute left-0 top-1 bottom-1 w-0.5 bg-brand-gold rounded-full"
                      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    />
                    <motion.span
                      layoutId="nav-active-bg"
                      className="absolute inset-0 rounded-lg bg-white/[0.14]"
                      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    />
                  </>
                )}
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                Panel Admin
              </>
            )}
          </NavLink>
        )}
      </nav>

      {/* Usuario */}
      <div className="px-4 py-2.5 border-t border-white/15 shrink-0">
        <p className="text-xs text-white font-medium truncate">{usuario?.nombre_completo}</p>
        <p className="text-[10px] text-[#E4D8BF] capitalize">{usuario?.cargo_visible || usuario?.rol_codigo}</p>
        <button
          onClick={handleLogout}
          className="mt-1.5 text-xs text-[#F5E8D2] hover:text-white transition-colors cursor-pointer"
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
