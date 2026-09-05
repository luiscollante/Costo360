import { Fragment } from 'react'
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
  BookMarked,
  FolderKanban,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'

interface NavItem { to: string; label: string; Icon: LucideIcon; requiereDashboard?: boolean }

// Estructura "por área del negocio" (decisión del fundador 2026-08-31):
//  · Dashboard suelto arriba (resumen — solo roles con acceso a BI).
//  · Cotizaciones: crear + Historial (la lista de lo cotizado).
//  · Taller: todo lo de materiales y piso, incluido el Catálogo.
//  · Ajustes: parámetros de costo y datos de la empresa.
//  · Panel Admin va aparte, abajo.
const DASHBOARD_ITEM: NavItem = { to: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard, requiereDashboard: true }
// Ítem suelto (no un grupo de un solo hijo — hallazgo UX U10), entre "Cotizaciones" y "Taller".
const PROYECTOS_ITEM: NavItem = { to: '/proyectos', label: 'Proyectos', Icon: FolderKanban }

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Cotizaciones',
    items: [
      { to: '/cotizacion',     label: 'Nueva Cotización', Icon: PlusCircle    },
      { to: '/express',        label: 'Express',          Icon: Zap           },
      { to: '/cotizacion-aiu', label: 'Cotización AIU',   Icon: HardHat       },
      { to: '/historial',      label: 'Historial',        Icon: ClipboardList },
    ],
  },
  {
    label: 'Taller',
    items: [
      { to: '/materiales', label: 'Catálogo',   Icon: BookMarked },
      { to: '/inventario', label: 'Inventario', Icon: Boxes      },
      { to: '/retales',    label: 'Retales',    Icon: Layers     },
      { to: '/nesting',    label: 'Nesting',    Icon: Grid3X3    },
    ],
  },
  {
    label: 'Ajustes',
    items: [
      { to: '/parametros',    label: 'Parámetros',    Icon: SlidersHorizontal, requiereDashboard: true },
      { to: '/configuracion', label: 'Configuración', Icon: Settings2,         requiereDashboard: true },
      // Piloto del Objetivo 5 (Ciclo 1) — solo Proyectos/Tareas por ahora, gestor únicamente.
      { to: '/agente',        label: 'Cost (beta)',      Icon: Sparkles,       requiereDashboard: true },
    ],
  },
]

// Texto en colores SÓLIDOS (sin alfa) sobre la barra esmeralda-glass. Ver R1/R4.
const inactiveNav = 'text-[#F5E8D2] hover:bg-white/[0.08]'
const activeNav = 'text-white font-medium'

function NavRow({ to, label, Icon, onNavigate }: NavItem & { onNavigate?: () => void }) {
  return (
    <NavLink
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
  )
}

export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { usuario, clearSession } = useAuthStore()
  const navigate = useNavigate()

  async function handleLogout() {
    try { await logoutSession() } catch { /* ignorar */ }
    await supabase.auth.signOut()
    clearSession()
    navigate('/login')
  }

  // Regla 6: el rol operativo no ve Dashboard / Parámetros / Configuración.
  const verDashboard = puedeVerDashboard(usuario)
  const grupos = NAV_GROUPS
    .map((g) => ({ ...g, items: g.items.filter((it) => !it.requiereDashboard || verDashboard) }))
    .filter((g) => g.items.length > 0)

  return (
    <aside className="glass-emerald w-56 shrink-0 flex flex-col h-screen sticky top-0 relative z-10">
      {/* Logo — vive sobre el extremo negro carbón del degradado continuo de
          `.glass-emerald` (no un bloque sólido propio). El filo dorado marca
          la costura real hacia la navegación, igual que el dorado traza los
          bordes de color en el isotipo real (decisión validada con 3 agentes
          de diseño tras el primer intento en bloques sólidos). */}
      <div className="border-b border-brand-gold/35 px-4 py-2.5 flex flex-col items-center gap-0.5 shrink-0">
        <Logo variant="light" className="w-[132px] h-auto object-contain" />
        <p className="text-[10px] text-[#E4D8BF] leading-none">Sistema Integral de Cotizaciones</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 space-y-3 px-3 relative overflow-y-auto min-h-0">
        {verDashboard && (
          <div className="space-y-0.5">
            <NavRow {...DASHBOARD_ITEM} onNavigate={onNavigate} />
          </div>
        )}

        {grupos.map((group) => (
          <Fragment key={group.label}>
            <div>
              <p className="px-3 mb-1 text-[11px] font-semibold uppercase tracking-widest text-[#E4D8BF]">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((it) => (
                  <NavRow key={it.to} {...it} onNavigate={onNavigate} />
                ))}
              </div>
            </div>
            {group.label === 'Cotizaciones' && (
              <div className="space-y-0.5">
                <NavRow {...PROYECTOS_ITEM} onNavigate={onNavigate} />
              </div>
            )}
          </Fragment>
        ))}

        {usuario?.puede_gestionar_usuarios && (
          <div className="mt-1 border-t border-white/10 pt-3">
            <NavRow to="/admin" label="Panel Admin" Icon={ShieldCheck} onNavigate={onNavigate} />
          </div>
        )}
      </nav>

      {/* Usuario — vive sobre el extremo negro carbón inferior del degradado
          continuo. Filo dorado en la costura hacia la navegación (misma
          lógica que el encabezado). */}
      <div className="border-t border-brand-gold/35 px-4 py-2.5 shrink-0">
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
