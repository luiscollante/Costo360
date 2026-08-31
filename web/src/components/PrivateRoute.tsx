import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import AppShellSkeleton from './AppShellSkeleton'

export default function PrivateRoute({ children }: { children: React.ReactNode }) {
  const status = useAuthStore((s) => s.status)

  // Sesión confirmada, perfil cargando → shell inmediato (NO expulsar a /login).
  if (status === 'authenticating' || status === 'profile-pending') {
    return <AppShellSkeleton />
  }
  // 'anon' o 'no-profile' → sin acceso.
  if (status !== 'ready') {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}
