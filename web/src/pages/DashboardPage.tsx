import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/store/auth'
import AppLayout from '@/components/AppLayout'
import { getDashboardResumen, type DashboardResumen, type Granularidad } from '@/api/dashboard'
import { formatCOP, formatNum, formatPct } from '@/lib/utils'
import { useCountUp } from '@/hooks/useCountUp'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { AsyncBoundary } from '@/components/ui/AsyncBoundary'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { StatusBadge } from '@/components/ui/Badge'
import {
  PlusCircle, ClipboardList, Layers, Grid3X3, Settings2, type LucideIcon,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'

// ─── Config ──────────────────────────────────────────────────────────────────

const MODULES: { to: string; title: string; Icon: LucideIcon }[] = [
  { to: '/historial',     title: 'Historial',     Icon: ClipboardList },
  { to: '/retales',       title: 'Retales',       Icon: Layers        },
  { to: '/nesting',       title: 'Nesting',       Icon: Grid3X3       },
  { to: '/configuracion', title: 'Configuración', Icon: Settings2     },
]

// Orden visual: positivo → negativo. Colores de marca (no amber/emerald/red de Tailwind).
const ESTADO_BARS = [
  { key: 'Aprobada',  label: 'Aprobadas',  barBg: 'bg-brand-success', txt: 'text-brand-success' },
  { key: 'Pendiente', label: 'Pendientes', barBg: 'bg-brand-warning', txt: 'text-brand-warning-text' },
  { key: 'Rechazada', label: 'Rechazadas', barBg: 'bg-brand-danger',  txt: 'text-brand-danger' },
] as const

const MESES_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
function mesCorto(mes: string): string {
  const m = parseInt(mes.split('-')[1], 10) - 1
  return MESES_ES[m] ?? mes
}
function formatPeriodo(periodo: string, gran: Granularidad): string {
  if (gran === 'mensual') return mesCorto(periodo)
  if (gran === 'semanal') {
    const semana = periodo.split('-S')[1]
    return semana ? `Sem ${semana}` : periodo
  }
  const [, mesNum, dia] = periodo.split('-')
  const m = parseInt(mesNum, 10) - 1
  return `${parseInt(dia, 10)} ${MESES_ES[m] ?? ''}`
}
const GRANULARIDADES: { value: Granularidad; label: string }[] = [
  { value: 'diaria',  label: 'Días' },
  { value: 'semanal', label: 'Semanas' },
  { value: 'mensual', label: 'Meses' },
]
function formatMillones(n: number): string {
  if (n >= 1_000_000) return `$${formatNum(n / 1_000_000, 1)}M`
  if (n >= 1_000)     return `$${formatNum(n / 1_000, 0)}K`
  return formatCOP(n)
}

// ─── Recharts Tooltip ────────────────────────────────────────────────────────

interface TooltipRenderProps {
  active?: boolean
  payload?: Array<{ payload: { facturado: number; cotizaciones: number } }>
  label?: string
}

function AreaTooltip({ active, payload, label }: TooltipRenderProps) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload as { facturado: number; cotizaciones: number } | undefined
  return (
    <div className="rounded-xl border border-brand-border bg-brand-surface px-4 py-3 shadow-lg">
      <p className="mb-2 text-[10px] font-mono uppercase tracking-widest text-brand-text-tertiary">{label}</p>
      <p className="font-mono text-sm font-bold text-brand-text-dark num">
        {formatCOP(row?.facturado ?? 0)}
      </p>
      {row?.cotizaciones != null && (
        <p className="mt-1 font-mono text-[10px] text-brand-text-secondary num">
          {row.cotizaciones} cotiz. aprobadas
        </p>
      )}
    </div>
  )
}

// ─── Skeletons ───────────────────────────────────────────────────────────────

function Sk({ className = '' }: { className?: string }) {
  return <div className={`rounded bg-brand-border/40 ${className}`} />
}

function DashSkeleton() {
  return (
    <div className="space-y-7">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Card key={i} className="p-5">
            <Sk className="mb-3 h-2.5 w-28" />
            <Sk className="h-8 w-20" />
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Sk className="h-44" />
        <Sk className="h-44" />
      </div>
      <Sk className="h-64" />
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const navigate = useNavigate()
  const usuario = useAuthStore((s) => s.usuario)
  const [granularidad, setGranularidad] = useState<Granularidad>('mensual')

  // El dashboard es una foto EN VIVO: cada vez que se entra a la pantalla (o se
  // vuelve a ella tras guardar cotizaciones o cambiar estados) debe releer.
  const { data, isPending, isError, isFetching, refetch } = useQuery<DashboardResumen>({
    queryKey: ['dashboard', granularidad],
    queryFn: () => getDashboardResumen(granularidad),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  })
  // Muestra "Actualizando…" cuando refresca en segundo plano (ya hay datos en
  // pantalla) — así una recarga de 1-2 s se lee como "está al día", no como lentitud.
  const refrescando = isFetching && !isPending

  const cotizacionesCount = useCountUp(data?.cotizaciones_mes ?? 0)
  const facturacionCount  = useCountUp(data?.facturacion_mes ?? 0)
  const margenDecimas     = useCountUp(Math.round((data?.margen_promedio ?? 0) * 10))

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches'
  const nombre = usuario?.nombre_completo?.split(' ')[0] ?? ''

  const totalEstados = ESTADO_BARS.reduce((s, e) => s + (data?.por_estado?.[e.key] ?? 0), 0)
  const historialChart = (data?.historial ?? []).map((m) => ({
    mes:          formatPeriodo(m.periodo, granularidad),
    facturado:    m.facturado,
    cotizaciones: m.cotizaciones,
  }))
  const maxRevenue = Math.max(...(data?.top_materiales ?? []).map((m) => m.revenue), 1)
  const rangoLabel = granularidad === 'diaria'
    ? 'Últimos 30 días'
    : granularidad === 'semanal' ? 'Últimas 12 semanas' : 'Últimos 6 meses'

  return (
    <AppLayout>
      <PageHeader
        kicker="Panel"
        title="Dashboard"
        subtitle={`${greeting}, ${nombre} — resumen del mes en curso`}
        actions={
          refrescando ? (
            <span
              className="flex items-center gap-1.5 rounded-full border border-brand-border bg-brand-surface px-2.5 py-1 text-[11px] font-medium text-brand-text-secondary"
              role="status"
            >
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-brand-border border-t-brand-primary" aria-hidden="true" />
              Actualizando…
            </span>
          ) : undefined
        }
      />

      <AsyncBoundary isPending={isPending} isError={isError} onRetry={() => refetch()} skeleton={<DashSkeleton />}>
        {data && (
          <>
            {/* ── KPIs ────────────────────────────────────────────────────── */}
            <div className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="p-5">
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-brand-text-secondary">Cotizaciones · mes</p>
                <p className="font-mono text-3xl font-bold text-brand-text-dark num">{cotizacionesCount}</p>
              </Card>
              <Card className="p-5">
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-brand-text-secondary">Facturación · mes</p>
                <p className="truncate font-mono text-xl font-bold text-brand-text-dark num">{formatCOP(facturacionCount)}</p>
              </Card>
              <Card className="p-5">
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-brand-text-secondary">Margen promedio</p>
                <p className="font-mono text-3xl font-bold text-brand-success num">{formatPct(margenDecimas / 10)}</p>
              </Card>
              <button
                type="button"
                onClick={() => navigate('/historial')}
                className="rounded-xl border border-brand-border bg-brand-surface p-5 text-left shadow-[0_1px_3px_rgba(74,74,74,0.08)] transition-colors hover:border-brand-primary/40 cursor-pointer"
              >
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-brand-text-secondary">Pendientes de aprobar</p>
                <div className="flex items-end justify-between">
                  <p className="font-mono text-3xl font-bold text-brand-warning-text num">{data.por_estado?.Pendiente ?? 0}</p>
                  <span className="mb-1 text-[11px] font-semibold text-brand-primary" aria-hidden="true">Ver →</span>
                </div>
              </button>
            </div>

            {/* ── Estado + Top Materiales ─────────────────────────────────── */}
            <div className="mb-7 grid grid-cols-1 gap-5 lg:grid-cols-2">
              <Card className="p-5">
                <p className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-brand-text-secondary">
                  Estado cotizaciones · mes actual
                </p>
                {totalEstados === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-sm text-brand-text-secondary">Sin cotizaciones este mes</p>
                    <button
                      type="button"
                      onClick={() => navigate('/cotizacion')}
                      className="mt-2 text-xs font-semibold text-brand-primary hover:underline cursor-pointer"
                    >
                      Crear la primera →
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="mb-3 flex h-2.5 gap-0.5 overflow-hidden rounded-full">
                      {ESTADO_BARS.map(({ key, barBg }) => {
                        const pct = ((data.por_estado?.[key] ?? 0) / totalEstados) * 100
                        return pct > 0 ? (
                          <motion.div
                            key={key}
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.7, ease: 'easeOut' }}
                            className={`h-full rounded-full motion-reduce:transition-none ${barBg}`}
                          />
                        ) : null
                      })}
                    </div>
                    {/* Leyenda */}
                    <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1">
                      {ESTADO_BARS.map(({ key, label, barBg }) => (
                        <span key={key} className="inline-flex items-center gap-1.5 text-[11px] text-brand-text-secondary">
                          <span className={`h-2 w-2 rounded-full ${barBg}`} aria-hidden="true" />
                          {label}
                        </span>
                      ))}
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {ESTADO_BARS.map(({ key, label, txt }) => {
                        const count = data.por_estado?.[key] ?? 0
                        const pct = totalEstados > 0 ? (count / totalEstados) * 100 : 0
                        return (
                          <div key={key} className="rounded-lg bg-brand-bg py-2 text-center">
                            <p className={`font-mono text-2xl font-bold num ${count > 0 ? txt : 'text-brand-text-tertiary'}`}>
                              {count}
                            </p>
                            <p className="mt-0.5 text-[11px] text-brand-text-secondary">{label}</p>
                            <p className="font-mono text-[10px] text-brand-text-tertiary num">{formatPct(pct, 0)}</p>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}
              </Card>

              <Card className="p-5">
                <p className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-brand-text-secondary">
                  Top materiales · últimos 90 días
                </p>
                {!data.top_materiales?.length ? (
                  <p className="py-8 text-center text-sm text-brand-text-secondary">Sin datos aún</p>
                ) : (
                  <div className="space-y-3">
                    {data.top_materiales.map((m, i) => {
                      const pct = (m.revenue / maxRevenue) * 100
                      const isTop = i === 0
                      return (
                        <div key={m.material}>
                          <div className="mb-1.5 flex items-center gap-2.5">
                            <span className={`w-5 shrink-0 text-right font-mono text-[10px] font-bold num ${isTop ? 'text-brand-warning-text' : 'text-brand-text-tertiary'}`}>
                              {String(i + 1).padStart(2, '0')}
                            </span>
                            <span className={`flex-1 truncate text-xs ${isTop ? 'font-semibold text-brand-text-dark' : 'text-brand-text-secondary'}`}>
                              {m.material || 'Sin categoría'}
                            </span>
                            <span className={`shrink-0 font-mono text-xs font-semibold num ${isTop ? 'text-brand-text-dark' : 'text-brand-text-secondary'}`}>
                              {formatMillones(m.revenue)}
                            </span>
                          </div>
                          <div className="ml-7 h-1 overflow-hidden rounded-full bg-brand-border/40">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.6, ease: 'easeOut', delay: i * 0.06 }}
                              className={`h-full rounded-full motion-reduce:transition-none ${isTop ? 'bg-brand-gold' : 'bg-brand-primary'}`}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </Card>
            </div>

            {/* ── Tendencia + Accesos ──────────────────────────────────────── */}
            {historialChart.length > 0 && (
              <div className="mb-7 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_260px]">
                <Card className="p-5">
                  <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-brand-text-secondary">
                        Facturación aprobada
                      </p>
                      <p className="mt-0.5 text-[11px] text-brand-text-tertiary">
                        {rangoLabel} · solo cotizaciones Aprobadas
                      </p>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <SegmentedControl
                        mode="buttons"
                        ariaLabel="Granularidad del gráfico"
                        options={GRANULARIDADES}
                        value={granularidad}
                        onChange={setGranularidad}
                      />
                      <span className="hidden items-center gap-1.5 font-mono text-[10px] text-brand-text-secondary sm:flex">
                        <span className="inline-block h-0.5 w-3 rounded bg-brand-gold" aria-hidden="true" />
                        Facturado
                      </span>
                    </div>
                  </div>

                  <div
                    role="img"
                    aria-label={`Facturación aprobada por ${granularidad}. ${historialChart
                      .map((d) => `${d.mes}: ${formatCOP(d.facturado)}`)
                      .join('; ')}`}
                  >
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={historialChart} margin={{ top: 6, right: 4, left: 0, bottom: 0 }} accessibilityLayer>
                        <defs>
                          <linearGradient id="gradFact" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#D4AF37" stopOpacity={0.22} />
                            <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="mes" tick={{ fill: '#5F5F5F', fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                        <YAxis tickFormatter={formatMillones} tick={{ fill: '#5F5F5F', fontSize: 9, fontFamily: 'monospace' }} axisLine={false} tickLine={false} width={54} />
                        <Tooltip content={<AreaTooltip />} cursor={{ stroke: '#15612E40', strokeWidth: 1, strokeDasharray: '4 3' }} />
                        <Area
                          type="monotone" dataKey="facturado" stroke="#D4AF37" strokeWidth={2} fill="url(#gradFact)"
                          dot={{ fill: '#D4AF37', strokeWidth: 0, r: 3 }}
                          activeDot={{ r: 5, fill: '#D4AF37', stroke: '#FFFFFF', strokeWidth: 2 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Equivalente accesible */}
                  <table className="sr-only">
                    <caption>Facturación aprobada por {granularidad}</caption>
                    <thead><tr><th scope="col">Periodo</th><th scope="col">Facturado</th></tr></thead>
                    <tbody>
                      {historialChart.map((d) => (
                        <tr key={d.mes}><td>{d.mes}</td><td>{formatCOP(d.facturado)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </Card>

                <Card className="p-4">
                  <p className="mb-3 px-1 text-[11px] font-semibold uppercase tracking-widest text-brand-text-secondary">
                    Accesos rápidos
                  </p>
                  <div className="space-y-1.5">
                    {MODULES.map(({ to, title, Icon }) => (
                      <button
                        key={to}
                        type="button"
                        onClick={() => navigate(to)}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-brand-bg cursor-pointer"
                      >
                        <Icon className="h-4 w-4 shrink-0 text-brand-primary" aria-hidden="true" />
                        <span className="text-sm text-brand-text">{title}</span>
                      </button>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {/* ── CTA ─────────────────────────────────────────────────────── */}
            <button
              type="button"
              onClick={() => navigate('/cotizacion')}
              className="mb-7 flex w-full items-center gap-4 rounded-2xl border border-brand-primary/30 bg-brand-primary/[0.05] p-6 text-left transition-colors hover:border-brand-primary/50 hover:bg-brand-primary/[0.08] cursor-pointer"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-primary text-white">
                <PlusCircle className="h-6 w-6" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-base font-bold text-brand-text-dark">Nueva cotización</span>
                <span className="mt-0.5 block text-sm text-brand-text-secondary">Calcular costo y precio en piedra natural</span>
              </span>
              <span className="ml-auto text-xl text-brand-primary" aria-hidden="true">→</span>
            </button>

            {/* ── Últimas cotizaciones ────────────────────────────────────── */}
            <div>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-brand-text-secondary">Últimas cotizaciones</p>
              {!data.ultimas?.length ? (
                <Card className="p-10 text-center">
                  <p className="text-sm text-brand-text-secondary">Sin cotizaciones aún</p>
                  <button
                    type="button"
                    onClick={() => navigate('/cotizacion')}
                    className="mt-2 text-xs font-semibold text-brand-primary hover:underline cursor-pointer"
                  >
                    Crear la primera →
                  </button>
                </Card>
              ) : (
                <Card className="overflow-hidden">
                  <div className="divide-y divide-brand-border">
                    {data.ultimas.map((row) => (
                      <div key={row.id} className="flex items-center px-4 py-3 transition-colors hover:bg-brand-bg">
                        <div className="mr-3 min-w-0 flex-1">
                          <p className="truncate font-mono text-xs text-brand-text-dark">{row.numero}</p>
                          <p className="truncate text-xs text-brand-text-secondary">{row.cliente || '—'}</p>
                        </div>
                        <p className="mr-3 shrink-0 font-mono text-sm text-brand-text-dark num">{formatCOP(row.precio)}</p>
                        <StatusBadge estado={row.estado} />
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/historial')}
                    className="w-full border-t border-brand-border bg-brand-bg px-4 py-2.5 text-left font-mono text-[11px] text-brand-text-secondary transition-colors hover:text-brand-text cursor-pointer"
                  >
                    Ver historial completo →
                  </button>
                </Card>
              )}
            </div>
          </>
        )}
      </AsyncBoundary>
    </AppLayout>
  )
}
