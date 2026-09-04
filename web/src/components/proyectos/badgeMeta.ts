import {
  Archive, AlertTriangle, Check, ChevronsUp, Circle, CircleDashed, Clock,
  Equal, Lock, Minus, Pause, Play, Search, Unlock, X, type LucideIcon,
} from 'lucide-react'
import type { BadgeTono } from '@/components/ui/Badge'
import type {
  EstadoProyecto, EstadoTarea, Prioridad, TipoNotificacion,
} from '@/api/proyectos'

/**
 * Mapas estado/prioridad/tipo → { tono de marca, icono, etiqueta, color de punto }
 * (hallazgo UX U1/U2). Nada de `#1F6F54`/`bg-amber-*` del prototipo — solo tonos
 * `<Badge>` + icono para distinguir sin depender del matiz. En archivo aparte de
 * `badges.tsx` (que solo exporta componentes) por `react-refresh`.
 */

export interface EstadoMeta { tono: BadgeTono; Icon: LucideIcon; label: string; dot: string }

export const PROYECTO_META: Record<EstadoProyecto, EstadoMeta> = {
  planificacion: { tono: 'neutral', Icon: CircleDashed, label: 'Planificación', dot: 'bg-brand-border'  },
  activo:        { tono: 'success', Icon: Play,         label: 'Activo',        dot: 'bg-brand-success' },
  en_revision:   { tono: 'warning', Icon: Search,       label: 'En revisión',   dot: 'bg-brand-warning' },
  completado:    { tono: 'gold',    Icon: Check,        label: 'Completado',    dot: 'bg-brand-gold'    },
  en_pausa:      { tono: 'neutral', Icon: Pause,        label: 'En pausa',      dot: 'bg-brand-text-tertiary' },
  cancelado:     { tono: 'danger',  Icon: X,            label: 'Cancelado',     dot: 'bg-brand-danger'  },
  archivado:     { tono: 'neutral', Icon: Archive,      label: 'Archivado',     dot: 'bg-brand-border'  },
}

export const TAREA_META: Record<EstadoTarea, EstadoMeta> = {
  bloqueada:   { tono: 'neutral', Icon: Lock,   label: 'Bloqueada',   dot: 'bg-brand-border'  },
  por_hacer:   { tono: 'neutral', Icon: Circle, label: 'Por hacer',   dot: 'bg-brand-border'  },
  en_progreso: { tono: 'success', Icon: Play,   label: 'En progreso', dot: 'bg-brand-success' },
  revision:    { tono: 'warning', Icon: Search, label: 'Revisión',    dot: 'bg-brand-warning' },
  completada:  { tono: 'gold',    Icon: Check,  label: 'Completada',  dot: 'bg-brand-gold'    },
}

export const PRIORIDAD_META: Record<Prioridad, { tono: BadgeTono; Icon: LucideIcon; label: string }> = {
  baja:    { tono: 'neutral', Icon: Minus,         label: 'Baja'    },
  media:   { tono: 'neutral', Icon: Equal,         label: 'Media'   },
  alta:    { tono: 'warning', Icon: ChevronsUp,    label: 'Alta'    },
  urgente: { tono: 'danger',  Icon: AlertTriangle, label: 'Urgente' },
}

export const NOTIF_META: Record<TipoNotificacion, { tono: BadgeTono; Icon: LucideIcon }> = {
  desbloqueo:   { tono: 'success', Icon: Unlock },
  recordatorio: { tono: 'gold',    Icon: Clock },
  riesgo:       { tono: 'danger',  Icon: AlertTriangle },
}
