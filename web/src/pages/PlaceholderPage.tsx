import { useLocation } from 'react-router-dom'
import AppLayout from '@/components/AppLayout'

const LABELS: Record<string, string> = {
  '/historial': 'Historial',
  '/retales': 'Retales',
  '/nesting': 'Nesting',
  '/configuracion': 'Configuración',
  '/cotizacion': 'Nueva Cotización',
}

export default function PlaceholderPage() {
  const { pathname } = useLocation()
  const label = LABELS[pathname] ?? pathname

  return (
    <AppLayout>
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-brand-text text-xl font-semibold">{label}</p>
          <p className="text-brand-muted text-sm mt-2">Próximamente</p>
        </div>
      </div>
    </AppLayout>
  )
}
