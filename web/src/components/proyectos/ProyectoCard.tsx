import { Link } from 'react-router-dom'
import type { DraggableProvidedDragHandleProps } from '@hello-pangea/dnd'
import { AlertTriangle, CalendarClock, GripVertical } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatFecha } from '@/lib/utils'
import type { EstadoProyecto, Proyecto } from '@/api/proyectos'
import { PROYECTO_META } from './badgeMeta'
import { BarraProgreso } from './BarraProgreso'

/**
 * Tarjeta de proyecto del tablero. El asa de arrastre es un botón dedicado
 * (`dragHandleProps` va SOLO ahí — hallazgo Fase 5 a11y: no se puede anidar el
 * `<Link>`/`<select>` dentro de un `role="button"`). La vía accesible sin
 * arrastre es el `<select>` "Mover a" (hallazgo U5).
 */
export function ProyectoCard({
  proyecto,
  columnasDestino,
  onMover,
  puedeMover,
  dragHandleProps,
}: {
  proyecto: Proyecto
  columnasDestino: EstadoProyecto[]
  onMover: (id: number, hacia: EstadoProyecto) => void
  puedeMover: boolean
  dragHandleProps?: DraggableProvidedDragHandleProps | null
}) {
  const destinos = columnasDestino.filter((c) => c !== proyecto.estado)

  return (
    <Card className="p-3">
      <div className="flex items-start gap-1.5">
        {dragHandleProps && (
          <button
            {...dragHandleProps}
            type="button"
            aria-label={`Mover a otra columna: ${proyecto.nombre}`}
            className="mt-0.5 shrink-0 rounded p-0.5 text-brand-text-tertiary hover:text-brand-text focus-visible:outline-2 focus-visible:outline-brand-primary cursor-grab"
          >
            <GripVertical size={14} aria-hidden="true" />
          </button>
        )}
        <Link
          to={`/proyectos/${proyecto.id}`}
          className="block min-w-0 flex-1 rounded focus-visible:outline-2 focus-visible:outline-brand-primary"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="min-w-0 text-sm font-semibold leading-tight text-brand-text-dark">
              {proyecto.nombre}
            </p>
            {proyecto.en_riesgo && (
              <Badge tono="danger" icon={<AlertTriangle size={11} />} className="shrink-0">
                En riesgo
              </Badge>
            )}
          </div>
          {(proyecto.cliente || proyecto.material) && (
            <p className="mt-0.5 truncate text-[11px] text-brand-text-secondary">
              {[proyecto.cliente, proyecto.material].filter(Boolean).join(' · ')}
            </p>
          )}

          <BarraProgreso pct={proyecto.progreso_pct} mostrarValor className="mt-3" />

          <div className="mt-2 flex items-center justify-between text-[11px] text-brand-text-secondary">
            <span>{proyecto.tareas_hechas}/{proyecto.tareas_total} tareas</span>
            {proyecto.fecha_fin && (
              <span className="inline-flex items-center gap-1">
                <CalendarClock size={11} aria-hidden="true" />
                {formatFecha(proyecto.fecha_fin)}
              </span>
            )}
          </div>
        </Link>
      </div>

      {puedeMover && destinos.length > 0 && (
        <label className="mt-2 flex items-center gap-2 border-t border-brand-border/60 pt-2 text-[11px] text-brand-text-secondary">
          <span className="shrink-0">Mover a</span>
          <select
            value=""
            onChange={(e) => {
              const v = e.target.value as EstadoProyecto
              if (v) onMover(proyecto.id, v)
            }}
            aria-label={`Mover a otra columna: ${proyecto.nombre}`}
            className="h-7 flex-1 rounded border border-brand-border bg-brand-input px-2 text-[11px] text-brand-text outline-none focus-visible:border-brand-primary focus-visible:ring-2 focus-visible:ring-brand-primary cursor-pointer"
          >
            <option value="">…</option>
            {destinos.map((d) => (
              <option key={d} value={d}>{PROYECTO_META[d].label}</option>
            ))}
          </select>
        </label>
      )}
    </Card>
  )
}
