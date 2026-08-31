import { type ReactNode, useId } from 'react'

/**
 * Agrupa campos relacionados con un título accesible. Usa `role="group"` +
 * `aria-labelledby` (en vez de `<fieldset><legend>`, que trae rarezas de layout
 * con flexbox/grid).
 */
export function FormSection({
  title,
  children,
  className = '',
}: {
  title: string
  children: ReactNode
  className?: string
}) {
  const id = useId()
  return (
    <section role="group" aria-labelledby={id} className={`space-y-4 ${className}`}>
      <h2 id={id} className="text-lg font-semibold text-brand-text-dark">
        {title}
      </h2>
      {children}
    </section>
  )
}
