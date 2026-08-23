import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/store/auth'
import AppLayout from '@/components/AppLayout'
import { getDashboardResumen, type DashboardResumen, type Granularidad } from '@/api/dashboard'
import { formatCOP, formatNum } from '@/lib/utils'
import { useCountUp } from '@/hooks/useCountUp'
import {
  PlusCircle, ClipboardList, Layers, Grid3X3, Settings2, type LucideIcon,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'

// ─── Config ──────────────────────────────────────────────────────────────────

const estadoConfig: Record<string, { color: string; dot: string; bg: string }> = {
  Pendiente: { color: 'text-amber-400',   dot: 'bg-amber-400',   bg: 'bg-amber-400/10 border-amber-400/20'   },
  Aprobada:  { color: 'text-emerald-400', dot: 'bg-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20' },
  Rechazada: { color: 'text-red-400',     dot: 'bg-red-400',     bg: 'bg-red-400/10 border-red-400/20'       },
  Borrador:  { color: 'text-brand-muted', dot: 'bg-brand-muted', bg: 'bg-brand-surface border-brand-border'  },
}

const MODULES: { to: string; title: string; desc: string; Icon: LucideIcon; color: string }[] = [
  { to: '/historial',     title: 'Historial',     desc: 'Cotizaciones guardadas',             Icon: ClipboardList, color: '#2C8A6B' },
  { to: '/retales',       title: 'Retales',       desc: 'Gestión de retales disponibles',     Icon: Layers,        color: '#2C8A6B' },
  { to: '/nesting',       title: 'Nesting',       desc: 'Optimización de cortes en planchas', Icon: Grid3X3,       color: '#2C8A6B' },
  { to: '/configuracion', title: 'Configuración', desc: 'Parámetros y datos de empresa',      Icon: Settings2,     color: '#6B7FA3' },
]

// Estado distribution — orden visual: Aprobada primero (positivo → negativo)
const ESTADO_BARS = [
  { key: 'Aprobada',  label: 'Aprobadas',  bar: 'bg-emerald-400', text: 'text-emerald-400', hex: '#22D3A5' },
  { key: 'Pendiente', label: 'Pendientes', bar: 'bg-amber-400',   text: 'text-amber-400',   hex: '#F59E0B' },
  { key: 'Rechazada', label: 'Rechazadas', bar: 'bg-red-400',     text: 'text-red-400',     hex: '#EF4444' },
]

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
  // diaria: "2026-08-23" -> "23 Ago"
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

// ─── Recharts Tooltip personalizado ──────────────────────────────────────────

interface TooltipRenderProps {
  active?: boolean
  payload?: Array<{ payload: { facturado: number; cotizaciones: number } }>
  label?: string
}

function AreaTooltip({ active, payload, label }: TooltipRenderProps) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload as { facturado: number; cotizaciones: number } | undefined
  return (
    <div className="glass rounded-xl border border-brand-gold/30 px-4 py-3 shadow-2xl">
      <p className="text-[10px] font-mono text-brand-muted/60 tracking-widest uppercase mb-2">{label}</p>
      <p className="font-bold text-brand-gold-light font-mono text-sm tabular-nums">
        {formatCOP(row?.facturado ?? 0)}
      </p>
      {row?.cotizaciones != null && (
        <p className="text-[10px] text-brand-muted/50 font-mono mt-1 tabular-nums">
          {row.cotizaciones} cotiz. aprobadas
        </p>
      )}
    </div>
  )
}

// ─── Skeleton uniforme ────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-brand-border/40 rounded ${className}`} />
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const navigate  = useNavigate()
  const usuario   = useAuthStore((s) => s.usuario)
  const [granularidad, setGranularidad] = useState<Granularidad>('mensual')

  const { data, isPending } = useQuery<DashboardResumen>({
    queryKey: ['dashboard', granularidad],
    queryFn: () => getDashboardResumen(granularidad),
    staleTime: 1000 * 60 * 2,
  })

  const cotizacionesCount = useCountUp(data?.cotizaciones_mes ?? 0)
  const facturacionCount  = useCountUp(data?.facturacion_mes ?? 0)
  const margenRaw         = useCountUp(Math.round((data?.margen_promedio ?? 0) * 10))

  const hour     = new Date().getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches'

  // Datos analíticos
  const totalEstados   = ESTADO_BARS.reduce((s, e) => s + (data?.por_estado?.[e.key] ?? 0), 0)
  const historialChart = (data?.historial ?? []).map((m) => ({
    mes:          formatPeriodo(m.periodo, granularidad),
    facturado:    m.facturado,
    cotizaciones: m.cotizaciones,
  }))
  const maxRevenue = Math.max(...(data?.top_materiales ?? []).map((m) => m.revenue), 1)

  return (
    <AppLayout>
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-text" style={{ textWrap: 'balance' } as React.CSSProperties}>
          {greeting}, {usuario?.nombre_completo?.split(' ')[0] ?? usuario?.username}
        </h1>
        <p className="text-brand-muted text-sm mt-1">Resumen del mes en curso</p>
      </div>

      {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
        {isPending ? (
          [0,1,2,3].map((i) => (
            <div key={i} className="glass rounded-xl border border-brand-border p-5">
              <Skeleton className="h-2.5 w-28 mb-3" />
              <Skeleton className="h-8 w-20" />
            </div>
          ))
        ) : (
          <>
            {/* Cotizaciones */}
            <div className="glass rounded-xl border border-brand-primary/25 p-5 relative overflow-hidden group hover:border-brand-primary/45 shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-primary/60 to-transparent" />
              <div className="absolute inset-0 bg-brand-primary/[0.04] group-hover:bg-brand-primary/[0.07] transition-colors duration-300 pointer-events-none" />
              <p className="text-[9px] tracking-[0.15em] uppercase text-brand-muted/50 font-semibold mb-1.5">Cotizaciones · mes</p>
              <p className="text-3xl font-bold text-brand-gold font-mono tabular-nums">{cotizacionesCount}</p>
            </div>
            {/* Facturación */}
            <div className="glass rounded-xl border border-brand-gold/25 p-5 relative overflow-hidden group hover:border-brand-gold/45 shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-gold/60 to-transparent" />
              <div className="absolute inset-0 bg-brand-gold/[0.04] group-hover:bg-brand-gold/[0.07] transition-colors duration-300 pointer-events-none" />
              <p className="text-[9px] tracking-[0.15em] uppercase text-brand-muted/50 font-semibold mb-1.5">Facturación · mes</p>
              <p className="text-xl font-bold text-brand-gold-light font-mono tabular-nums truncate">{formatCOP(facturacionCount)}</p>
            </div>
            {/* Margen */}
            <div className="glass rounded-xl border border-emerald-500/25 p-5 relative overflow-hidden group hover:border-emerald-500/45 shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/60 to-transparent" />
              <div className="absolute inset-0 bg-emerald-500/[0.04] group-hover:bg-emerald-500/[0.07] transition-colors duration-300 pointer-events-none" />
              <p className="text-[9px] tracking-[0.15em] uppercase text-brand-muted/50 font-semibold mb-1.5">Margen promedio</p>
              <p className="text-3xl font-bold text-emerald-400 font-mono tabular-nums">
                {formatNum(margenRaw / 10, 1)}<span className="text-lg font-semibold">%</span>
              </p>
            </div>
            {/* Pendientes de aprobar */}
            <button
              onClick={() => navigate('/historial')}
              className="glass rounded-xl border border-amber-400/30 p-5 relative overflow-hidden group hover:border-amber-400/55 shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-300 text-left cursor-pointer"
            >
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-400/70 to-transparent" />
              <div className="absolute inset-0 bg-amber-400/[0.05] group-hover:bg-amber-400/[0.09] transition-colors duration-300 pointer-events-none" />
              <p className="text-[9px] tracking-[0.15em] uppercase text-brand-muted/50 font-semibold mb-1.5">Pendientes de aprobar</p>
              <div className="flex items-end justify-between">
                <p className="text-3xl font-bold text-amber-400 font-mono tabular-nums">
                  {data?.por_estado?.Pendiente ?? 0}
                </p>
                <span className="text-[10px] text-amber-400/70 group-hover:text-amber-400 transition-colors mb-1">
                  Ver →
                </span>
              </div>
            </button>
          </>
        )}
      </div>

      {/* ── Estado + Top Materiales ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-7">

        {/* Estado de cotizaciones */}
        <div className="glass rounded-xl border border-brand-border shadow-md p-5 transition-shadow hover:shadow-lg">
          <p className="text-[9px] font-semibold text-brand-muted/50 uppercase tracking-widest mb-4">
            Estado cotizaciones · mes actual
          </p>
          {isPending ? (
            <div className="space-y-3">
              <Skeleton className="h-2.5 w-full rounded-full" />
              <div className="grid grid-cols-3 gap-2">
                {[0,1,2].map((i) => <Skeleton key={i} className="h-12" />)}
              </div>
            </div>
          ) : totalEstados === 0 ? (
            <div className="py-8 text-center">
              <p className="text-brand-muted text-sm">Sin cotizaciones este mes</p>
              <button
                onClick={() => navigate('/cotizacion')}
                className="text-brand-muted hover:text-emerald-400 text-xs mt-2 hover:underline cursor-pointer"
              >
                Crear la primera →
              </button>
            </div>
          ) : (
            <>
              {/* Barra apilada total */}
              <div className="h-2.5 rounded-full overflow-hidden flex mb-5 gap-0.5">
                {ESTADO_BARS.map(({ key, bar }) => {
                  const pct = (data?.por_estado?.[key] ?? 0) / totalEstados * 100
                  return pct > 0 ? (
                    <motion.div
                      key={key}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.7, ease: 'easeOut' }}
                      className={`h-full rounded-full motion-reduce:transition-none ${bar}`}
                    />
                  ) : null
                })}
              </div>

              {/* Grid 3 números */}
              <div className="grid grid-cols-3 gap-3">
                {ESTADO_BARS.map(({ key, label, text }) => {
                  const count = data?.por_estado?.[key] ?? 0
                  const pct   = totalEstados > 0 ? (count / totalEstados) * 100 : 0
                  return (
                    <div key={key} className="text-center py-2 rounded-lg bg-brand-surface/30">
                      <p className={`text-2xl font-bold font-mono tabular-nums ${count > 0 ? text : 'text-brand-muted/30'}`}>
                        {count}
                      </p>
                      <p className="text-[10px] text-brand-muted mt-0.5">{label}</p>
                      <p className="text-[9px] font-mono text-brand-muted/40 tabular-nums">
                        {formatNum(pct, 0)}%
                      </p>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>

        {/* Top Materiales */}
        <div className="glass rounded-xl border border-brand-border shadow-md p-5 transition-shadow hover:shadow-lg">
          <p className="text-[9px] font-semibold text-brand-muted/50 uppercase tracking-widest mb-4">
            Top materiales · últimos 90 días
          </p>
          {isPending ? (
            <div className="space-y-4">
              {[0,1,2,3,4].map((i) => <Skeleton key={i} className="h-6" />)}
            </div>
          ) : !data?.top_materiales?.length ? (
            <p className="text-brand-muted text-sm text-center py-8">Sin datos aún</p>
          ) : (
            <div className="space-y-3">
              {data.top_materiales.map((m, i) => {
                const pct   = (m.revenue / maxRevenue) * 100
                const isTop = i === 0
                return (
                  <div key={m.material}>
                    <div className="flex items-center gap-2.5 mb-1.5">
                      {/* Rank */}
                      <span
                        className={`font-mono text-[10px] tabular-nums w-5 shrink-0 text-right font-bold ${
                          isTop ? 'text-brand-gold' : 'text-brand-muted/35'
                        }`}
                      >
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      {/* Nombre */}
                      <span className={`text-xs truncate flex-1 ${isTop ? 'text-brand-text font-semibold' : 'text-brand-muted'}`}>
                        {m.material || 'Sin categoría'}
                      </span>
                      {/* Revenue */}
                      <span className={`font-mono text-xs shrink-0 tabular-nums font-semibold ${
                        isTop ? 'text-brand-gold-light' : 'text-brand-muted/60'
                      }`}>
                        {formatMillones(m.revenue)}
                      </span>
                    </div>
                    {/* Barra */}
                    <div className="ml-7 h-1 bg-brand-border/40 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut', delay: i * 0.06 }}
                        className="h-full rounded-full motion-reduce:transition-none"
                        style={{
                          background: isTop ? '#C9A227' : '#1F6F54',
                          opacity: isTop ? 1 : Math.max(0.25, 0.7 - i * 0.1),
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Tendencia 6 meses (Area Chart) + Accesos Rápidos ──────────────── */}
      {!isPending && historialChart.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-5 mb-7">
          <div className="glass rounded-xl border border-brand-border shadow-md p-5 transition-shadow hover:shadow-lg">
            <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
              <div>
                <p className="text-[9px] font-semibold text-brand-muted/50 uppercase tracking-widest">
                  Facturación aprobada
                </p>
                <p className="text-[10px] text-brand-muted/30 font-mono mt-0.5">
                  {granularidad === 'diaria' ? 'Últimos 30 días' : granularidad === 'semanal' ? 'Últimas 12 semanas' : 'Últimos 6 meses'} · solo cotizaciones Aprobadas
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-brand-surface/50 border border-brand-border/60">
                  {GRANULARIDADES.map((g) => (
                    <button
                      key={g.value}
                      onClick={() => setGranularidad(g.value)}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors cursor-pointer ${
                        granularidad === g.value
                          ? 'bg-brand-primary/20 text-brand-primary'
                          : 'text-brand-muted/60 hover:text-brand-text'
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
                <span className="hidden sm:flex items-center gap-1.5 text-[10px] text-brand-gold/70 font-mono">
                  <span className="w-3 h-0.5 bg-brand-gold rounded inline-block" />
                  Facturado
                </span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart
                data={historialChart}
                margin={{ top: 6, right: 4, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="gradFact" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#C9A227" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="#C9A227" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="mes"
                  tick={{ fill: '#6B7FA3', fontSize: 10, fontFamily: 'monospace' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={formatMillones}
                  tick={{ fill: '#6B7FA3', fontSize: 9, fontFamily: 'monospace' }}
                  axisLine={false}
                  tickLine={false}
                  width={54}
                />
                <Tooltip
                  content={<AreaTooltip />}
                  cursor={{ stroke: '#1F6F5440', strokeWidth: 1, strokeDasharray: '4 3' }}
                />
                <Area
                  type="monotone"
                  dataKey="facturado"
                  stroke="#C9A227"
                  strokeWidth={2}
                  fill="url(#gradFact)"
                  dot={{ fill: '#C9A227', strokeWidth: 0, r: 3 }}
                  activeDot={{ r: 5, fill: '#C9A227', stroke: '#050B09', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Accesos Rápidos */}
          <div className="glass rounded-xl border border-brand-border shadow-md p-4 transition-shadow hover:shadow-lg">
            <p className="text-[9px] font-semibold text-brand-muted/50 uppercase tracking-widest mb-3 px-1">
              Accesos Rápidos
            </p>
            <div className="space-y-1.5">
              {MODULES.map(({ to, title, Icon, color }) => (
                <button
                  key={to}
                  onClick={() => navigate(to)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-brand-surface/40 transition-colors duration-150 text-left group cursor-pointer"
                >
                  <Icon className="w-4 h-4 shrink-0" style={{ color }} aria-hidden="true" />
                  <span className="text-sm text-brand-muted group-hover:text-brand-text transition-colors">{title}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── CTA Nueva Cotización ──────────────────────────────────────────── */}
      <button
        onClick={() => navigate('/cotizacion')}
        className="w-full mb-7 p-6 rounded-2xl border border-brand-primary/30 bg-gradient-to-r from-brand-primary/10 via-brand-primary/[0.06] to-transparent hover:from-brand-primary/15 hover:border-brand-primary/50 transition-all duration-300 text-left group cursor-pointer relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-brand-primary/50 via-brand-primary/30 to-transparent" />
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-brand-primary/20 border border-brand-primary/30 flex items-center justify-center text-brand-muted group-hover:scale-105 group-hover:text-emerald-400 group-hover:bg-brand-primary/30 group-hover:border-brand-primary/50 transition-all duration-300 shrink-0">
            <PlusCircle className="w-6 h-6" aria-hidden="true" />
          </div>
          <div>
            <p className="text-brand-text font-bold text-base">Nueva Cotización</p>
            <p className="text-brand-muted text-sm mt-0.5">Calcular costo y precio en piedra natural</p>
          </div>
          <span className="ml-auto text-emerald-400 text-xl opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200" aria-hidden="true">→</span>
        </div>
      </button>

      {/* ── Últimas cotizaciones ──────────────────────────────────────────── */}
      <div>
          <p className="text-[9px] font-semibold text-brand-muted/50 uppercase tracking-widest mb-3">Últimas cotizaciones</p>
          {isPending ? (
            <div className="glass rounded-xl border border-brand-border p-8 flex justify-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
                className="w-5 h-5 border-2 border-brand-muted/30 border-t-brand-primary rounded-full"
                aria-label="Cargando"
              />
            </div>
          ) : !data?.ultimas?.length ? (
            <div className="glass rounded-xl border border-brand-border p-10 text-center">
              <p className="text-brand-muted text-sm">Sin cotizaciones aún</p>
              <button
                onClick={() => navigate('/cotizacion')}
                className="text-brand-muted hover:text-emerald-400 text-xs mt-2 hover:underline cursor-pointer"
              >
                Crear la primera →
              </button>
            </div>
          ) : (
            <div className="glass rounded-xl border border-brand-border overflow-hidden shadow-md transition-shadow hover:shadow-lg">
              <div className="divide-y divide-brand-border/30">
                {data.ultimas.map((row) => {
                  const cfg = estadoConfig[row.estado] ?? estadoConfig.Borrador
                  return (
                    <div key={row.id} className="flex items-center px-4 py-3 hover:bg-brand-surface/20 transition-colors duration-150">
                      <div className="flex-1 min-w-0 mr-3">
                        <p className="font-mono text-xs text-brand-text truncate">{row.numero}</p>
                        <p className="text-xs text-brand-muted truncate">{row.cliente || '—'}</p>
                      </div>
                      <p className="font-mono text-sm text-brand-text tabular-nums mr-3 shrink-0">{formatCOP(row.precio)}</p>
                      <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 ${cfg.bg} ${cfg.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} aria-hidden="true" />
                        {row.estado}
                      </span>
                    </div>
                  )
                })}
              </div>
              <button
                onClick={() => navigate('/historial')}
                className="w-full px-4 py-2.5 border-t border-brand-border/40 bg-brand-surface/20 text-[10px] text-brand-muted/50 hover:text-brand-muted transition-colors duration-150 font-mono text-left cursor-pointer"
              >
                Ver historial completo →
              </button>
            </div>
          )}
        </div>
    </AppLayout>
  )
}
