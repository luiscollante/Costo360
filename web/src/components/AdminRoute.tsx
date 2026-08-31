import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { homeDeRol } from '@/lib/capabilities'
import AppShellSkeleton from './AppShellSkeleton'

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const status = useAuthStore((s) => s.status)
  const usuario = useAuthStore((s) => s.usuario)

  if (status === 'authenticating' || status === 'profile-pending') {
    return <AppShellSkeleton />
  }
  if (status !== 'ready' || !usuario) {
    return <Navigate to="/login" replace />
  }
  if (!usuario.puede_gestionar_usuarios) {
    return <Navigate to={homeDeRol(usuario)} replace />
  }
  return <>{children}</>
}
