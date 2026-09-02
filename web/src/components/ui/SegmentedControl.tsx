import { type ReactNode, type KeyboardEvent, useRef } from 'react'
import { cn } from '@/lib/utils'

interface Opcion<T extends string> {
  value: T
  label: ReactNode
}

/**
 * Control segmentado con DOS semánticas:
 *  - `mode="tabs"`   → `role="tablist"`/`tab` + roving tabindex + flechas.
 *    Para pestañas que intercambian un panel (Parámetros: Tarifas/Adicionales).
 *    El consumidor cablea los `<div role="tabpanel">` y pasa `panelIdFor`.
 *  - `mode="buttons"` → `role="radiogroup"`/`radio` + `aria-checked`.
 *    Para alternar una vista sin cambiar de panel (Dashboard: Días/Semanas/Meses).
 *
 * Indicador de selección NO cromático: fondo + sombra + subrayado + negrita.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  mode = 'buttons',
  panelIdFor,
}: {
  options: Opcion<T>[]
  value: T
  onChange: (v: T) => void
  ariaLabel: string
  mode?: 'tabs' | 'buttons'
  panelIdFor?: (v: T) => string
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  function onKeyDown(e: KeyboardEvent, i: number) {
    let next = i
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % options.length
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i - 1 + options.length) % options.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = options.length - 1
    else return
    e.preventDefault()
    onChange(options[next].value)
    refs.current[next]?.focus()
  }

  return (
    <div
      role={mode === 'tabs' ? 'tablist' : 'radiogroup'}
      aria-label={ariaLabel}
      className="inline-flex rounded-lg border border-brand-border bg-brand-input-deep p-0.5"
    >
      {options.map((o, i) => {
        const selected = o.value === value
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role={mode === 'tabs' ? 'tab' : 'radio'}
            aria-selected={mode === 'tabs' ? selected : undefined}
            aria-checked={mode === 'buttons' ? selected : undefined}
            aria-controls={mode === 'tabs' && panelIdFor ? panelIdFor(o.value) : undefined}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              'h-8 rounded-md px-3 text-xs font-semibold transition-colors cursor-pointer',
              selected
                ? 'bg-brand-surface text-brand-text-dark shadow-sm underline decoration-brand-primary decoration-2 underline-offset-4'
                : 'text-brand-text-secondary hover:text-brand-text',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
