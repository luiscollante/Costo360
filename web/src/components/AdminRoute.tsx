import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const session = useAuthStore((s) => s.session)
  const usuario = useAuthStore((s) => s.usuario)
  if (!session || !usuario) return <Navigate to="/login" replace />
  if (!usuario.puede_gestionar_usuarios) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}
