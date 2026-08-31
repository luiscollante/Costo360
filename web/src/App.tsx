import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { getDeviceId } from '@/lib/deviceId'
import { useAuthStore } from '@/store/auth'
import { homeDeRol } from '@/lib/capabilities'
import LoginPage from '@/pages/LoginPage'
import ResetPasswordPage from '@/pages/ResetPasswordPage'
import DashboardPage from '@/pages/DashboardPage'
import CotizacionPage from '@/pages/CotizacionPage'
import HistorialPage from '@/pages/HistorialPage'
import RetalesPage from '@/pages/RetalesPage'
import InventarioPage from '@/pages/InventarioPage'
import ConfigPage from '@/pages/ConfigPage'
import PrivateRoute from '@/components/PrivateRoute'
import AdminRoute from '@/components/AdminRoute'
import RoleRoute from '@/components/RoleRoute'
import AppShellSkeleton from '@/components/AppShellSkeleton'
import AdminPage from '@/pages/AdminPage'
import ParametrosPage from '@/pages/ParametrosPage'
import MaterialesPage from '@/pages/MaterialesPage'
import NestingPage from '@/pages/NestingPage'
import CotizacionExpressPage from '@/pages/CotizacionExpressPage'
import CotizacionAIUPage from '@/pages/CotizacionAIUPage'
import ToastHost from '@/components/ToastHost'
import LandingPage from '@/pages/LandingPage'
import SessionGuard from '@/components/SessionGuard'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 5, retry: 1 },
  },
})

function Private({ children }: { children: React.ReactNode }) {
  return (
    <PrivateRoute>
      <SessionGuard />
      {children}
    </PrivateRoute>
  )
}

/** Destino del catch-all: casa según el rol (o login / skeleton si aún carga). */
function HomeRedirect() {
  const status = useAuthStore((s) => s.status)
  const usuario = useAuthStore((s) => s.usuario)
  if (status === 'authenticating' || status === 'profile-pending') return <AppShellSkeleton />
  if (status !== 'ready' || !usuario) return <Navigate to="/login" replace />
  return <Navigate to={homeDeRol(usuario)} replace />
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const status = useAuthStore((s) => s.status)

  useEffect(() => {
    getDeviceId()
    useAuthStore.getState().refresh()
    // Solo re-hidratar en cambios de identidad — NO en TOKEN_REFRESHED (evita un
    // bucle: 401 del backend → refreshSession → TOKEN_REFRESHED → refresh → 401…).
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        useAuthStore.getState().refresh()
      }
    })
    return () => data.subscription.unsubscribe()
  }, [])

  // Solo bloquea mientras se resuelve la sesión (getSession, rápido). Una vez
  // resuelta, el router se monta y PrivateRoute pinta el shell si el perfil
  // todavía carga (R7).
  if (status === 'authenticating') {
    return (
      <div role="status" className="min-h-screen flex items-center justify-center bg-brand-bg">
        <span className="sr-only">Verificando la sesión…</span>
        <div
          className="w-8 h-8 border-2 border-brand-muted/30 border-t-brand-primary rounded-full animate-spin"
          aria-hidden="true"
        />
      </div>
    )
  }

  return <>{children}</>
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user">
        <ToastHost />
        <AuthGate>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/dashboard" element={<Private><RoleRoute><DashboardPage /></RoleRoute></Private>} />
              <Route path="/cotizacion" element={<Private><CotizacionPage /></Private>} />
              <Route path="/express" element={<Private><CotizacionExpressPage /></Private>} />
              <Route path="/cotizacion-aiu" element={<Private><CotizacionAIUPage /></Private>} />
              <Route path="/historial" element={<Private><HistorialPage /></Private>} />
              <Route path="/retales" element={<Private><RetalesPage /></Private>} />
              <Route path="/inventario" element={<Private><InventarioPage /></Private>} />
              <Route path="/nesting" element={<Private><NestingPage /></Private>} />
              <Route path="/parametros" element={<Private><RoleRoute><ParametrosPage /></RoleRoute></Private>} />
              <Route path="/materiales" element={<Private><RoleRoute><MaterialesPage /></RoleRoute></Private>} />
              <Route path="/configuracion" element={<Private><RoleRoute><ConfigPage /></RoleRoute></Private>} />
              <Route path="/admin" element={<AdminRoute><SessionGuard /><AdminPage /></AdminRoute>} />
              <Route path="*" element={<HomeRedirect />} />
            </Routes>
          </BrowserRouter>
        </AuthGate>
      </MotionConfig>
    </QueryClientProvider>
  )
}
