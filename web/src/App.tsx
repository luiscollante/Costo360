import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth'
import LoginPage from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import CotizacionPage from '@/pages/CotizacionPage'
import HistorialPage from '@/pages/HistorialPage'
import RetalesPage from '@/pages/RetalesPage'
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 5, retry: 1 },
  },
})

function Private({ children }: { children: React.ReactNode }) {
  return <PrivateRoute>{children}</PrivateRoute>
}

// Espera a que la sesión se hidrate desde Preferences (solo aplica en el APK — en la web
// `hydrated` ya empieza en `true`, así que esto no agrega ninguna espera visible ahí).
function AuthGate({ children }: { children: React.ReactNode }) {
  const hydrated = useAuthStore((s) => s.hydrated)

  useEffect(() => {
    useAuthStore.getState().hydrate()
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
            <Route path="/dashboard" element={<Private><DashboardPage /></Private>} />
            <Route path="/cotizacion" element={<Private><CotizacionPage /></Private>} />
            <Route path="/express" element={<Private><CotizacionExpressPage /></Private>} />
            <Route path="/cotizacion-aiu" element={<Private><CotizacionAIUPage /></Private>} />
            <Route path="/historial" element={<Private><HistorialPage /></Private>} />
            <Route path="/retales" element={<Private><RetalesPage /></Private>} />
            <Route path="/nesting" element={<Private><NestingPage /></Private>} />
            <Route path="/parametros" element={<Private><ParametrosPage /></Private>} />
            <Route path="/configuracion" element={<Private><ConfigPage /></Private>} />
            <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthGate>
    </QueryClientProvider>
  )
}
