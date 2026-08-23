import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCOP(n: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)
}

export function formatNum(n: number, dec = 2): string {
  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  }).format(n)
}
