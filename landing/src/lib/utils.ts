import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCOP(val: number): string {
  return `$${Math.round(val).toLocaleString('es-CO')}`;
}

export function formatPct(val: number): string {
  return `${(val).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 1 })}%`;
}
