import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { getDeviceId } from '@/lib/deviceId'
import { useAuthStore } from '@/store/auth'
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
import AdminPage from '@/pages/AdminPage'
import ParametrosPage from '@/pages/ParametrosPage'
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

function AuthGate({ children }: { children: React.ReactNode }) {
  const hydrated = useAuthStore((s) => s.hydrated)

  useEffect(() => {
    getDeviceId()
    useAuthStore.getState().refresh()
    const { data } = supabase.auth.onAuthStateChange(() => {
      useAuthStore.getState().refresh()
    })
    return () => data.subscription.unsubscribe()
  }, [])

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-bg">
        <div className="w-8 h-8 border-2 border-brand-muted/30 border-t-brand-primary rounded-full animate-spin" />
      </div>
    )
  }

  return <>{children}</>
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastHost />
      <AuthGate>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/dashboard" element={<Private><DashboardPage /></Private>} />
            <Route path="/cotizacion" element={<Private><CotizacionPage /></Private>} />
            <Route path="/express" element={<Private><CotizacionExpressPage /></Private>} />
            <Route path="/cotizacion-aiu" element={<Private><CotizacionAIUPage /></Private>} />
            <Route path="/historial" element={<Private><HistorialPage /></Private>} />
            <Route path="/retales" element={<Private><RetalesPage /></Private>} />
            <Route path="/inventario" element={<Private><InventarioPage /></Private>} />
            <Route path="/nesting" element={<Private><NestingPage /></Private>} />
            <Route path="/parametros" element={<Private><ParametrosPage /></Private>} />
            <Route path="/configuracion" element={<Private><ConfigPage /></Private>} />
            <Route path="/admin" element={<AdminRoute><SessionGuard /><AdminPage /></AdminRoute>} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthGate>
    </QueryClientProvider>
  )
}
