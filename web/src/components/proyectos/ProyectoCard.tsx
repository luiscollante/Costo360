import { Link } from 'react-router-dom'
import { AlertTriangle, CalendarClock } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatFecha } from '@/lib/utils'
import type { EstadoProyecto, Proyecto } from '@/api/proyectos'
import { PROYECTO_META } from './badgeMeta'
import { BarraProgreso } from './BarraProgreso'

/**
 * Tarjeta de proyecto del tablero. El arrastre lo cablea la página con
 * `@hello-pangea/dnd`; aquí va la vía accesible alternativa (hallazgo UX U5): un
 * `<select>` "Mover a" visible para gestores cuando la columna no es de solo
 * lectura.
 */
export function ProyectoCard({
  proyecto,
  columnasDestino,
  onMover,
  puedeMover,
}: {
  proyecto: Proyecto
  columnasDestino: EstadoProyecto[]
  onMover: (id: number, hacia: EstadoProyecto) => void
  puedeMover: boolean
}) {
  const destinos = columnasDestino.filter((c) => c !== proyecto.estado)

  return (
    <Card className="p-3">
      <Link
        to={`/proyectos/${proyecto.id}`}
        className="block rounded focus-visible:outline-2 focus-visible:outline-brand-primary"
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

      {puedeMover && destinos.length > 0 && (
        <label className="mt-2 flex items-center gap-2 border-t border-brand-border/60 pt-2 text-[11px] text-brand-text-secondary">
          <span className="shrink-0">Mover a</span>
          <select
            value=""
            onChange={(e) => {
              const v = e.target.value as EstadoProyecto
              if (v) onMover(proyecto.id, v)
            }}
            aria-label={`Mover "${proyecto.nombre}" a otra columna`}
            className="h-7 flex-1 rounded border border-brand-border bg-brand-input px-2 text-[11px] text-brand-text outline-none focus-visible:border-brand-primary cursor-pointer"
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
