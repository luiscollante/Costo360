import { type ReactNode } from 'react'

/**
 * Estado vacío único para toda la app (Inventario, Historial, Retales, panel de
 * resultado de Express/Nesting). El icono va a 32px con `--color-brand-text-tertiary`.
 */
export function EmptyState({
  icon,
  title,
  action,
}: {
  icon?: ReactNode
  title: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      {icon && (
        <span className="text-brand-text-tertiary" aria-hidden="true">
          {icon}
        </span>
      )}
      <p className="text-sm text-brand-text-secondary">{title}</p>
      {action}
    </div>
  )
}
