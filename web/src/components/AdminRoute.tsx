import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const { token, usuario } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />
  if (usuario?.rol !== 'Admin') return <Navigate to="/dashboard" replace />
  return <>{children}</>
}
