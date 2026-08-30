import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'

export default function PrivateRoute({ children }: { children: React.ReactNode }) {
  const session = useAuthStore((s) => s.session)
  const usuario = useAuthStore((s) => s.usuario)
  if (!session) return <Navigate to="/login" replace />
  // Autenticado en Supabase pero sin perfil (no aprovisionado) → sin acceso.
  if (!usuario) return <Navigate to="/login" replace />
  return <>{children}</>
}
