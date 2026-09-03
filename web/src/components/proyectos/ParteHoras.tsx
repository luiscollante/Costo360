import { useQuery } from '@tanstack/react-query'
import { Clock } from 'lucide-react'
import { DataTable } from '@/components/ui/DataTable'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { AsyncBoundary } from '@/components/ui/AsyncBoundary'
import { formatFecha, formatNum } from '@/lib/utils'
import { listarHorasProyecto, type Tarea } from '@/api/proyectos'

export function ParteHoras({
  projectId, tareas, activo = true,
}: {
  projectId: number
  tareas: Tarea[]
  activo?: boolean
}) {
  const { data = [], isPending, isError, refetch } = useQuery({
    queryKey: ['horas-proyecto', projectId],
    queryFn: () => listarHorasProyecto(projectId),
    enabled: activo, // no consultar mientras la pestaña "Tiempos" está oculta (FD#10)
  })

  const tituloDe = (taskId: number) => tareas.find((t) => t.id === taskId)?.titulo ?? '—'
  const totalRegistrado = data.reduce((s, e) => s + e.horas, 0)
  const totalEstimado = tareas.reduce((s, t) => s + (t.horas_estimadas ?? 0), 0)
  const desvio = totalRegistrado - totalEstimado

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3">
          <p className="text-[11px] text-brand-text-secondary">Estimado</p>
          <p className="mt-1 font-mono text-lg font-bold tabular-nums text-brand-text-dark">
            {formatNum(totalEstimado, 1)} h
          </p>
        </Card>
        <Card className="p-3">
          <p className="text-[11px] text-brand-text-secondary">Registrado</p>
          <p className="mt-1 font-mono text-lg font-bold tabular-nums text-brand-text-dark">
            {formatNum(totalRegistrado, 1)} h
          </p>
        </Card>
        <Card className="p-3">
          <p className="text-[11px] text-brand-text-secondary">Desvío</p>
          <p className={`mt-1 font-mono text-lg font-bold tabular-nums ${desvio > 0 ? 'text-brand-danger' : 'text-brand-success'}`}>
            {desvio > 0 ? '+' : ''}{formatNum(desvio, 1)} h
          </p>
        </Card>
      </div>

      <AsyncBoundary isPending={isPending} isError={isError} onRetry={() => refetch()}>
        {data.length === 0 ? (
          <EmptyState icon={<Clock size={28} />} title="Aún no se registran horas en este proyecto" />
        ) : (
          <DataTable
            caption="Registro de horas del proyecto"
            columns={[
              { key: 'tarea', label: 'Tarea' },
              { key: 'persona', label: 'Persona' },
              { key: 'fecha', label: 'Fecha' },
              { key: 'horas', label: 'Horas', className: 'text-right' },
              { key: 'nota', label: 'Nota' },
            ]}
          >
            {data.map((e) => (
              <tr key={e.id} className="border-b border-brand-border/40">
                <td className="px-3 py-2 text-brand-text">{tituloDe(e.task_id)}</td>
                <td className="px-3 py-2 text-brand-text-secondary">{e.user_name || '—'}</td>
                <td className="px-3 py-2 text-brand-text-secondary">{formatFecha(e.fecha)}</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums text-brand-text">{formatNum(e.horas, 1)}</td>
                <td className="px-3 py-2 text-brand-text-tertiary">{e.nota || '—'}</td>
              </tr>
            ))}
          </DataTable>
        )}
      </AsyncBoundary>
    </div>
  )
}
