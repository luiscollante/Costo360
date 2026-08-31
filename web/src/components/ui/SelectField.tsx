import { type SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Field } from './Field'

/**
 * Envoltorio del `<select>` NATIVO (no un listbox custom — el nativo ya es
 * accesible). Solo unifica alto/radio/foco/etiqueta.
 */
export function SelectField({
  label,
  error,
  hint,
  required,
  className,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & {
  label: string
  error?: string
  hint?: string
}) {
  return (
    <Field label={label} error={error} hint={hint} required={required}>
      {(a11y) => (
        <div className="relative">
          <select
            {...a11y}
            {...rest}
            className={cn(
              'w-full appearance-none bg-brand-input border border-brand-border rounded-lg pl-3 pr-9 h-10',
              'text-sm text-brand-text outline-none transition-colors cursor-pointer',
              'focus-visible:border-brand-primary aria-[invalid=true]:border-brand-danger',
              className,
            )}
          >
            {children}
          </select>
          <ChevronDown
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-brand-text-tertiary"
          />
        </div>
      )}
    </Field>
  )
}
