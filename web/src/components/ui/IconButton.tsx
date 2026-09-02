import { type ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

/**
 * Botón de solo icono. `aria-label` es OBLIGATORIO (no hay texto visible que le
 * dé nombre accesible). Target ≥ 36px (el toggle de tema anterior medía 22px).
 */
export const IconButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { 'aria-label': string }
>(({ className, type = 'button', ...props }, ref) => (
  <button
    ref={ref}
    type={type}
    className={cn(
      'inline-flex items-center justify-center rounded-lg w-9 h-9 shrink-0',
      'text-brand-text-secondary hover:text-brand-text hover:bg-brand-primary/[0.06]',
      'transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
      className,
    )}
    {...props}
  />
))
IconButton.displayName = 'IconButton'
