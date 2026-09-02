import { type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

/**
 * Superficie base para agrupar contenido. Reemplaza el "todo flota" (glass en
 * todas partes) por una tarjeta sólida con borde y sombra sutil.
 * El padding lo pone quien la usa (`className`), para poder componerla.
 */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'bg-brand-surface border border-brand-border rounded-xl shadow-[0_1px_3px_rgba(74,74,74,0.08)]',
        className,
      )}
      {...props}
    />
  )
}
