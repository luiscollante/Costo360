import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type BadgeTono = 'neutral' | 'success' | 'warning' | 'danger' | 'gold'

const TONOS: Record<BadgeTono, string> = {
  neutral: 'bg-brand-border/40 text-brand-text-secondary',
  success: 'bg-brand-success-soft text-brand-success',
  warning: 'bg-brand-warning-soft text-brand-warning-text',
  danger: 'bg-brand-danger-soft text-brand-danger',
  gold: 'bg-brand-gold/15 text-brand-warning-text',
}

/**
 * Etiqueta compacta. `icon` (opcional) permite distinguir por icono + texto y no
 * por matiz de color (los 7 inductores de Parámetros no se distinguen con 7 verdes).
 * Solo tonos de la paleta de marca — nada de morado/cian/naranja.
 */
export function Badge({
  tono = 'neutral',
  icon,
  children,
  className,
}: {
  tono?: BadgeTono
  icon?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold leading-tight',
        TONOS[tono],
        className,
      )}
    >
      {icon && (
        <span className="shrink-0" aria-hidden="true">
          {icon}
        </span>
      )}
      {children}
    </span>
  )
}

const ESTADO_TONO: Record<string, BadgeTono> = {
  Aprobada: 'success',
  Pendiente: 'warning',
  Borrador: 'neutral',
  Rechazada: 'danger',
}

/** Badge de estado de cotización — mapea el estado al tono de marca correcto. */
export function StatusBadge({ estado }: { estado: string }) {
  return <Badge tono={ESTADO_TONO[estado] ?? 'neutral'}>{estado}</Badge>
}
