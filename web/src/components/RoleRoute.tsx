import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { puedeVerDashboard } from '@/lib/capabilities'

/**
 * Puerta de rol para las rutas visibles solo con acceso a Dashboard/BI (Regla 6):
 * Dashboard, Parámetros, Configuración. Se renderiza SIEMPRE dentro de
 * <PrivateRoute>, que ya cubre los estados de carga y de no-autenticado, así que
 * aquí el perfil ya está disponible. El rol operativo se redirige a Nueva
 * Cotización (el backend además responde 403 en esos endpoints — ver C1-R0).
 */
export default function RoleRoute({ children }: { children: React.ReactNode }) {
  const usuario = useAuthStore((s) => s.usuario)
  if (!puedeVerDashboard(usuario)) return <Navigate to="/cotizacion" replace />
  return <>{children}</>
}
