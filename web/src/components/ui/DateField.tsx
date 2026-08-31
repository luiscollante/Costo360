import { type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { Field } from './Field'

const INPUT = cn(
  'w-full bg-brand-input border border-brand-border rounded-lg px-3 h-10',
  'text-sm text-brand-text outline-none transition-colors',
  'focus-visible:border-brand-primary',
)

/** Envoltorio del `<input type="date">` NATIVO + etiqueta. Sin calendario custom. */
export function DateField({
  label,
  error,
  hint,
  required,
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string
  hint?: string
}) {
  return (
    <Field label={label} error={error} hint={hint} required={required}>
      {(a11y) => (
        <input type="date" {...a11y} {...rest} className={cn(INPUT, className)} />
      )}
    </Field>
  )
}

/** Par de fechas (desde / hasta) con una etiqueta de grupo. */
export function DateRangeField({
  label,
  desde,
  hasta,
  onDesde,
  onHasta,
}: {
  label: string
  desde: string
  hasta: string
  onDesde: (v: string) => void
  onHasta: (v: string) => void
}) {
  return (
    <fieldset className="space-y-1.5">
      <legend className="block text-[11px] font-semibold uppercase tracking-wide text-brand-text-secondary">
        {label}
      </legend>
      <div className="flex items-center gap-2">
        <input
          type="date"
          aria-label={`${label} — desde`}
          value={desde}
          onChange={(e) => onDesde(e.target.value)}
          className={cn(INPUT, 'flex-1')}
        />
        <span className="text-xs text-brand-text-tertiary" aria-hidden="true">
          →
        </span>
        <input
          type="date"
          aria-label={`${label} — hasta`}
          value={hasta}
          onChange={(e) => onHasta(e.target.value)}
          className={cn(INPUT, 'flex-1')}
        />
      </div>
    </fieldset>
  )
}
