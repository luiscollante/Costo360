import { type ReactNode } from 'react'

/**
 * Envoltura presentacional para el estado de una consulta (`useQuery`). React
 * Query v5 no permite envolver `useQuery` desde fuera, así que cada página le
 * pasa su `isPending` / `isError` / `onRetry`. El timeout de red vive en
 * `api/client.ts`.
 */
export function AsyncBoundary({
  isPending,
  isError,
  onRetry,
  skeleton,
  errorTitle = 'No se pudo cargar la información',
  children,
}: {
  isPending: boolean
  isError: boolean
  onRetry?: () => void
  skeleton?: ReactNode
  errorTitle?: string
  children: ReactNode
}) {
  if (isPending) {
    return (
      <div role="status" aria-busy="true" aria-live="polite">
        <span className="sr-only">Cargando…</span>
        {skeleton ?? <DefaultSkeleton />}
      </div>
    )
  }

  if (isError) {
    return (
      <div role="alert" className="flex flex-col items-center gap-3 py-10 text-center">
        <p className="text-sm text-brand-text-secondary">{errorTitle}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="h-9 rounded-lg border border-brand-border px-4 text-sm font-semibold text-brand-text hover:border-brand-primary/40 cursor-pointer"
          >
            Reintentar
          </button>
        )}
      </div>
    )
  }

  return <>{children}</>
}

function DefaultSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-12 rounded-lg bg-brand-border/40" />
      ))}
    </div>
  )
}
