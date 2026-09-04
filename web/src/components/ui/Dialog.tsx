import { type ReactNode, type KeyboardEvent, useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'

const FOCUSABLES =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])'

// Contador de diálogos abiertos: `#root` solo deja de ser `inert` cuando el
// ÚLTIMO se cierra (hallazgo Fase 5 a11y — la campana puede abrirse sobre otro
// diálogo). El retorno de foco de cada diálogo (returnFocusRef) apunta al
// elemento que tenía el foco cuando ESE diálogo se abrió, así que el apilado
// devuelve el foco correctamente en cascada.
let _dialogosAbiertos = 0
function _marcarInert() {
  if (_dialogosAbiertos === 0) document.getElementById('root')?.setAttribute('inert', '')
  _dialogosAbiertos += 1
}
function _desmarcarInert() {
  _dialogosAbiertos = Math.max(0, _dialogosAbiertos - 1)
  if (_dialogosAbiertos === 0) document.getElementById('root')?.removeAttribute('inert')
}

/**
 * Diálogo modal accesible. Portala a `document.body`, marca `#root` como `inert`
 * (con contador de referencias para soportar diálogos apilados), atrapa el foco,
 * cierra con Escape, y devuelve el foco al elemento que lo abrió.
 *
 * `role="alertdialog"` para avisos que requieren una decisión (no se cierra al
 * clicar el fondo). `role="dialog"` (default) sí se cierra al clicar el fondo.
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

    _marcarInert()

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
      _desmarcarInert()
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
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm sm:items-center"
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
        // Alto acotado al viewport + scroll propio del panel: un solo scroll, sin
        // recorte del contenido en pantallas bajas (feedback del fundador).
        className={`my-auto max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto overscroll-contain rounded-2xl border border-brand-border bg-brand-surface p-6 shadow-[0_12px_40px_rgba(0,0,0,0.18)] focus:outline-none ${className}`}
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
