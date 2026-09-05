import { Badge } from '@/components/ui/Badge'
import type { EstadoProyecto, EstadoTarea, Prioridad, TipoNotificacion } from '@/api/proyectos'
import { PROYECTO_META, TAREA_META, PRIORIDAD_META, NOTIF_META } from './badgeMeta'

export function ProjectStatusBadge({ estado }: { estado: EstadoProyecto }) {
  const m = PROYECTO_META[estado] ?? PROYECTO_META.activo
  return <Badge tono={m.tono} icon={<m.Icon size={11} />}>{m.label}</Badge>
}

export function TaskStatusBadge({ estado }: { estado: EstadoTarea }) {
  const m = TAREA_META[estado] ?? TAREA_META.por_hacer
  return <Badge tono={m.tono} icon={<m.Icon size={11} />}>{m.label}</Badge>
}

export function PriorityBadge({ prioridad }: { prioridad: Prioridad }) {
  const m = PRIORIDAD_META[prioridad] ?? PRIORIDAD_META.media
  return <Badge tono={m.tono} icon={<m.Icon size={11} />}>{m.label}</Badge>
}

const NOTIF_LABEL: Record<TipoNotificacion, string> = {
  desbloqueo: 'Desbloqueo',
  recordatorio: 'Recordatorio',
  riesgo: 'Riesgo',
}

export function NotifIcono({ tipo }: { tipo: TipoNotificacion }) {
  const m = NOTIF_META[tipo] ?? NOTIF_META.recordatorio
  const { texto, fondo } =
    m.tono === 'success' ? { texto: 'text-brand-success', fondo: 'bg-brand-success-soft' }
      : m.tono === 'danger' ? { texto: 'text-brand-danger', fondo: 'bg-brand-danger-soft' }
        : { texto: 'text-brand-warning-text', fondo: 'bg-brand-warning-soft' }
  return (
    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${fondo}`}>
      <m.Icon size={15} className={texto} aria-hidden="true" />
      <span className="sr-only">{NOTIF_LABEL[tipo] ?? 'Notificación'}: </span>
    </span>
  )
}
