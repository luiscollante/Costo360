import { type ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand-primary text-white hover:bg-brand-primary-light',
  secondary: 'border border-brand-border bg-brand-surface text-brand-text hover:border-brand-primary/40',
  ghost: 'text-brand-text-secondary hover:bg-brand-primary/[0.06] hover:text-brand-text',
  danger: 'bg-brand-danger text-white hover:opacity-90',
}

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
}

/** Botón de la app — radio único (`rounded-lg`), color por token, cursor de mano. */
export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }
>(({ variant = 'primary', size = 'md', className, type = 'button', ...props }, ref) => (
  <button
    ref={ref}
    type={type}
    className={cn(
      'inline-flex items-center justify-center rounded-lg font-semibold transition-colors cursor-pointer',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      VARIANTS[variant],
      SIZES[size],
      className,
    )}
    {...props}
  />
))
Button.displayName = 'Button'
