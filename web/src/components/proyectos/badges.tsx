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

export function NotifIcono({ tipo }: { tipo: TipoNotificacion }) {
  const m = NOTIF_META[tipo] ?? NOTIF_META.recordatorio
  const color =
    m.tono === 'success' ? 'text-brand-success'
      : m.tono === 'danger' ? 'text-brand-danger'
        : 'text-brand-warning-text'
  return <m.Icon size={15} className={color} aria-hidden="true" />
}
