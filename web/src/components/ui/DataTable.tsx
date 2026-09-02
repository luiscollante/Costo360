import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface Columna {
  key: string
  label: ReactNode
  className?: string
}

/**
 * Tabla semántica: `<table>` real con `<caption>` (visualmente oculto),
 * `<th scope="col">`. Los `<tr><td>` de datos los renderiza el consumidor como
 * `children`. Scroll horizontal contenido.
 */
export function DataTable({
  caption,
  columns,
  children,
  className,
}: {
  caption: string
  columns: Columna[]
  children: ReactNode
  className?: string
}) {
  return (
    <div className="overflow-x-auto">
      <table className={cn('w-full border-collapse text-sm', className)}>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-brand-border text-left">
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                className={cn(
                  'px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-brand-text-secondary',
                  c.className,
                )}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}
