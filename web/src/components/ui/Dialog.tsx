import { type ReactNode, type KeyboardEvent, useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'

const FOCUSABLES =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])'

/**
 * Diálogo modal accesible. Portala a `document.body`, marca `#root` como `inert`,
 * atrapa el foco, cierra con Escape, y devuelve el foco al elemento que lo abrió.
 *
 * `role="alertdialog"` para avisos que requieren una decisión (no se cierra al
 * clicar el fondo). `role="dialog"` (default) sí se cierra al clicar el fondo.
 *
 * Limitación conocida: no soporta diálogos apilados (el primero en cerrar quita
 * el `inert`). Suficiente para el uso actual.
 */
export function Dialog({
  open,
  onClose,
  title,
  role = 'dialog',
  labelledBy,
  describedBy,
  children,
  className = '',
}: {
  open: boolean
  onClose: () => void
  title?: string
  role?: 'dialog' | 'alertdialog'
  labelledBy?: string
  describedBy?: string
  children: ReactNode
  className?: string
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const autoId = useId()
  const titleId = labelledBy ?? (title ? `${autoId}-title` : undefined)
  const dismissOnBackdrop = role === 'dialog'

  useEffect(() => {
    if (!open) return
    returnFocusRef.current = (document.activeElement as HTMLElement) ?? null

    const root = document.getElementById('root')
    root?.setAttribute('inert', '')

    // Foco al primer control (respeta un autoFocus del consumidor); si no hay,
    // al panel. Para alertdialog (sin campos) suele caer en el panel.
    const primero = panelRef.current?.querySelector<HTMLElement>(FOCUSABLES)
    if (document.activeElement && panelRef.current?.contains(document.activeElement)) {
      /* el consumidor ya movió el foco con autoFocus — respetarlo */
    } else if (primero) {
      primero.focus()
    } else {
      panelRef.current?.focus()
    }

    return () => {
      root?.removeAttribute('inert')
      returnFocusRef.current?.focus?.()
    }
  }, [open])

  if (!open) return null

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.stopPropagation()
      onClose()
      return
    }
    if (e.key !== 'Tab' || !panelRef.current) return
    const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLES))
    if (items.length === 0) {
      e.preventDefault()
      return
    }
    const first = items[0]
    const last = items[items.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={dismissOnBackdrop ? onClose : undefined}
    >
      <div
        ref={panelRef}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={describedBy}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-md rounded-2xl border border-brand-border bg-brand-surface p-6 shadow-[0_12px_40px_rgba(0,0,0,0.18)] focus:outline-none ${className}`}
      >
        {title && (
          <h2 id={titleId} className="mb-3 text-base font-bold text-brand-text-dark">
            {title}
          </h2>
        )}
        {children}
      </div>
    </div>,
    document.body,
  )
}
