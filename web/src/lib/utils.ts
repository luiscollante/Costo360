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

/**
 * Porcentaje con formato colombiano (coma decimal + espacio antes del `%`).
 * Recibe el valor en escala 0–100 (p. ej. `formatPct(40)` → `"40,0 %"`).
 */
export function formatPct(n: number, dec = 1): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'percent',
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  }).format(n / 100)
}

const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

/**
 * Fecha ISO (`YYYY-MM-DD`) → `"3 Sep 26"`. Sin librería de fechas (`date-fns`/
 * `moment` no están en el stack). Mismo patrón que `HistorialPage`.
 */
export function formatFecha(iso: string | null | undefined): string {
  const parts = iso?.split('T')[0]?.split('-')
  if (!parts || parts.length !== 3) return '—'
  const mes = MESES_CORTOS[parseInt(parts[1], 10) - 1] ?? parts[1]
  return `${parseInt(parts[2], 10)} ${mes} ${parts[0].slice(2)}`
}

/** Timestamp ISO → `"3 Sep 26, 14:05"` en hora local del navegador. */
export function formatFechaHora(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const hora = new Intl.DateTimeFormat('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false }).format(d)
  return `${formatFecha(iso)}, ${hora}`
}

/** Días entre hoy y una fecha ISO (negativo = ya pasó). `null` si no hay fecha. */
export function diasHasta(iso: string | null | undefined): number | null {
  if (!iso) return null
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const d = new Date(iso.split('T')[0] + 'T00:00:00')
  if (Number.isNaN(d.getTime())) return null
  return Math.round((d.getTime() - hoy.getTime()) / 86_400_000)
}
