import AppLayout from '@/components/AppLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { CostChat } from '@/components/CostChat'

/**
 * Página dedicada de Cost. Desde el Ciclo 3 (Objetivo 5) comparte estado y
 * lógica con el widget flotante global (`CostFloating.tsx`) a través de
 * `useCostStore` — la conversación es LA MISMA sin importar desde cuál
 * superficie se abrió, ver `web/src/store/cost.ts`.
 */
export default function AgentePage() {
  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl">
        <PageHeader
          kicker="Objetivo 5 · Ciclo 3"
          title="Cost"
          subtitle="Tu asistente de Costo360 — hoy entiende de Proyectos, Tareas, Cotización, Catálogo, Inventario, Retales, Nesting y Parámetros."
        />
        <Card className="flex h-[65vh] flex-col overflow-hidden">
          <CostChat />
        </Card>
      </div>
    </AppLayout>
  )
}
