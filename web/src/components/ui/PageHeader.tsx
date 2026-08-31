import { type ReactNode, useEffect, useRef } from 'react'

/**
 * Encabezado de página único: kicker + regla vertical verde + `<h1>` + subtítulo
 * + slot de acciones. Fija `document.title` y expone un `<h1 tabindex="-1">` para
 * la gestión de foco al cambiar de ruta.
 *
 * Nota R6: al migrar las páginas a este componente hay que quitar el mapa
 * `TITULOS` de `AppLayout` y reconciliar el foco (hoy `AppLayout` enfoca `<main>`;
 * la intención es que enfoque este `<h1>` cuando exista).
 */
export function PageHeader({
  kicker,
  title,
  subtitle,
  actions,
}: {
  kicker?: string
  title: string
  subtitle?: string
  actions?: ReactNode
}) {
  const h1Ref = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    document.title = `${title} · Costo360`
  }, [title])

  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div className="min-w-0">
        {kicker && (
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-brand-text-tertiary">
            {kicker}
          </p>
        )}
        <div className="flex items-stretch gap-3">
          <span className="w-0.5 shrink-0 rounded-full bg-brand-primary" aria-hidden="true" />
          <h1
            ref={h1Ref}
            tabIndex={-1}
            className="text-2xl font-bold leading-tight text-brand-text-dark focus:outline-none"
          >
            {title}
          </h1>
        </div>
        {subtitle && <p className="mt-1 text-sm text-brand-text-secondary">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}
