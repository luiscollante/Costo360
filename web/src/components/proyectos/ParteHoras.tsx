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
  const pct = totalEstimado > 0 ? Math.min(100, Math.round((totalRegistrado / totalEstimado) * 100)) : 0

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Tile label="Estimado" valor={`${formatNum(totalEstimado, 1)} h`} />
        <Tile label="Registrado" valor={`${formatNum(totalRegistrado, 1)} h`} sub={totalEstimado > 0 ? `${pct}% del estimado` : undefined} />
        <Tile
          label="Desvío"
          valor={`${desvio > 0 ? '+' : ''}${formatNum(desvio, 1)} h`}
          sub={
            Math.abs(desvio) < 0.05 ? 'en línea'
              : desvio > 0 ? 'sobre lo estimado' : 'bajo lo estimado'
          }
          tono={Math.abs(desvio) < 0.05 ? 'neutral' : desvio > 0 ? 'danger' : 'success'}
        />
      </div>

      <AsyncBoundary isPending={isPending} isError={isError} onRetry={() => refetch()}>
        {data.length === 0 ? (
          <EmptyState icon={<Clock size={28} />} title="Aún no se registran horas en este proyecto" />
        ) : (
          <Card className="overflow-hidden p-1">
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
                <tr key={e.id} className="border-b border-brand-border/30 last:border-0 hover:bg-brand-bg/50">
                  <td className="px-3 py-2 text-brand-text">{tituloDe(e.task_id)}</td>
                  <td className="px-3 py-2 text-brand-text-secondary">{e.user_name || '—'}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-brand-text-secondary">{formatFecha(e.fecha)}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-brand-text">{formatNum(e.horas, 1)}</td>
                  <td className="px-3 py-2 text-brand-text-secondary">{e.nota || '—'}</td>
                </tr>
              ))}
            </DataTable>
          </Card>
        )}
      </AsyncBoundary>
    </div>
  )
}

function Tile({
  label, valor, sub, tono = 'neutral',
}: {
  label: string
  valor: string
  sub?: string
  tono?: 'neutral' | 'success' | 'danger'
}) {
  const color = tono === 'success' ? 'text-brand-success' : tono === 'danger' ? 'text-brand-danger' : 'text-brand-text-dark'
  return (
    <Card className="p-3">
      <p className="text-[11px] text-brand-text-secondary">{label}</p>
      <p className={`mt-1 font-mono text-lg font-bold tabular-nums ${color}`}>{valor}</p>
      {sub && <p className="mt-0.5 text-[10px] text-brand-text-secondary">{sub}</p>}
    </Card>
  )
}
