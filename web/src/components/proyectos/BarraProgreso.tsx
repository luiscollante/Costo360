import { formatPct } from '@/lib/utils'

/**
 * Barra de progreso mínima (hallazgo UX U8, opción b). Vive en `components/
 * proyectos/`, NO en `ui/` — es específica del módulo. Relleno `bg-brand-primary`;
 * el dorado (`bg-brand-gold`) se reserva para el 100 % / hitos completados
 * (permitido por §6: dorado en rellenos, nunca texto).
 */
export function BarraProgreso({
  pct,
  className = '',
  mostrarValor = false,
  etiqueta = 'Avance',
}: {
  pct: number
  className?: string
  mostrarValor?: boolean
  etiqueta?: string
}) {
  const v = Math.max(0, Math.min(100, pct))
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-brand-border/40"
        role="progressbar"
        aria-label={etiqueta}
        aria-valuenow={v}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`h-full rounded-full transition-[width] ${v >= 100 ? 'bg-brand-gold' : 'bg-brand-primary'}`}
          style={{ width: `${v}%` }}
        />
      </div>
      {mostrarValor && (
        <span className="shrink-0 font-mono text-[11px] tabular-nums text-brand-text-secondary">
          {formatPct(v)}
        </span>
      )}
    </div>
  )
}
