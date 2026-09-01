import { type ReactNode, useId } from 'react'

interface ControlA11y {
  id: string
  'aria-invalid'?: boolean
  'aria-describedby'?: string
  'aria-required'?: boolean
}

/**
 * Envoltura de campo de formulario: `<label htmlFor>` + control + pista/error.
 * Los formularios de la app son `useState` a mano (no hay react-hook-form), así
 * que `children` es un render-prop que recibe el `id`, `aria-invalid` y
 * `aria-describedby` para pasárselos al `<input>`/`<select>` controlado.
 */
export function Field({
  label,
  error,
  hint,
  required,
  children,
}: {
  label: string
  error?: string
  hint?: string
  required?: boolean
  children: (a11y: ControlA11y) => ReactNode
}) {
  const id = useId()
  const hintId = `${id}-hint`
  const errId = `${id}-err`
  const showHint = !!hint && !error
  const describedBy = [showHint ? hintId : null, error ? errId : null].filter(Boolean).join(' ') || undefined

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-[11px] font-semibold uppercase tracking-wide text-brand-text-secondary"
      >
        {label}
        {required && (
          <span className="ml-0.5 text-brand-danger" aria-hidden="true">
            *
          </span>
        )}
      </label>

      {children({
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy,
        'aria-required': required || undefined,
      })}

      {showHint && (
        <p id={hintId} className="text-[11px] text-brand-text-secondary">
          {hint}
        </p>
      )}
      {error && (
        <p id={errId} role="alert" className="text-[11px] text-brand-danger">
          {error}
        </p>
      )}
    </div>
  )
}
