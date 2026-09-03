import { CalendarClock, User } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { formatFecha, diasHasta } from '@/lib/utils'
import type { EstadoTarea, Tarea } from '@/api/proyectos'
import { PriorityBadge } from '@/components/proyectos/badges'
import { TAREA_META } from '@/components/proyectos/badgeMeta'

export function TareaCard({
  tarea,
  responsableNombre,
  columnas,
  onAbrir,
  onMover,
  puedeMover,
}: {
  tarea: Tarea
  responsableNombre?: string
  columnas: EstadoTarea[]
  onAbrir: () => void
  onMover: (hacia: EstadoTarea) => void
  puedeMover: boolean
}) {
  const dias = diasHasta(tarea.fecha_limite)
  const vencida = dias !== null && dias < 0 && tarea.estado !== 'completada'
  const destinos = columnas.filter(
    (c) => c !== tarea.estado && !(tarea.estado === 'bloqueada' && !puedeMover),
  )
  // Un no-gestor no puede sacar la tarea de 'bloqueada' (el backend responde 403).
  const bloqueadaParaMi = tarea.estado === 'bloqueada' && !puedeMover

  return (
    <Card className="p-3">
      <button
        type="button"
        onClick={onAbrir}
        className="block w-full rounded text-left focus-visible:outline-2 focus-visible:outline-brand-primary"
      >
        <p className="text-sm font-semibold leading-tight text-brand-text-dark">{tarea.titulo}</p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <PriorityBadge prioridad={tarea.prioridad} />
          {vencida && (
            <span className="text-[11px] font-semibold text-brand-danger">Vencida</span>
          )}
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] text-brand-text-secondary">
          <span className="inline-flex items-center gap-1 truncate">
            <User size={11} aria-hidden="true" />
            {responsableNombre || 'Sin responsable'}
          </span>
          {tarea.fecha_limite && (
            <span className={`inline-flex shrink-0 items-center gap-1 ${vencida ? 'text-brand-danger' : ''}`}>
              <CalendarClock size={11} aria-hidden="true" />
              {formatFecha(tarea.fecha_limite)}
            </span>
          )}
        </div>
      </button>

      {puedeMover && !bloqueadaParaMi && destinos.length > 0 && (
        <label className="mt-2 flex items-center gap-2 border-t border-brand-border/60 pt-2 text-[11px] text-brand-text-secondary">
          <span className="shrink-0">Mover a</span>
          <select
            value=""
            onChange={(e) => {
              const v = e.target.value as EstadoTarea
              if (v) onMover(v)
            }}
            aria-label={`Mover "${tarea.titulo}" a otra columna`}
            className="h-7 flex-1 rounded border border-brand-border bg-brand-input px-2 text-[11px] text-brand-text outline-none focus-visible:border-brand-primary cursor-pointer"
          >
            <option value="">…</option>
            {destinos.map((d) => (
              <option key={d} value={d}>{TAREA_META[d].label}</option>
            ))}
          </select>
        </label>
      )}
    </Card>
  )
}
