import React, { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Grid, Plus, X, Download, AlertTriangle, Minus, Maximize2 } from 'lucide-react'
import AppLayout from '@/components/AppLayout'
import { generarNesting } from '@/api/nesting'
import type { NestingResult } from '@/api/nesting'
import { formatNum } from '@/lib/utils'
import { downloadFile } from '@/lib/downloadFile'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PiezaLocal {
  uid: string
  id: string
  largo: string
  ancho: string
  cantidad: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeUID(): string {
  return Math.random().toString(36).slice(2, 9)
}

function makePieza(): PiezaLocal {
  return { uid: makeUID(), id: '', largo: '', ancho: '', cantidad: '1' }
}

// ─── Shared primitives (matches CotizacionPage design language) ───────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[10px] font-semibold tracking-[0.18em] uppercase text-brand-muted mb-1.5">
      {children}
    </label>
  )
}

function MonoInput({
  value,
  onChange,
  placeholder,
  type = 'text',
  min,
  step,
  suffix,
  decimals,
}: {
  value: string | number
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  min?: number
  step?: number
  suffix?: string
  decimals?: number
}) {
  const fmt = useCallback((v: string | number): string => {
    if (v === '' || v == null) return ''
    const n = parseFloat(String(v).replace(',', '.'))
    if (isNaN(n)) return String(v)
    if (decimals !== undefined) return n.toFixed(decimals)
    return String(v)
  }, [decimals])

  const [display, setDisplay] = useState(() => fmt(value))
  const focused = useRef(false)

  useEffect(() => {
    if (!focused.current) setDisplay(fmt(value))
  }, [value, fmt])

  const inputClass = [
    'w-full bg-brand-input border border-brand-border rounded px-3 py-2.5',
    'font-mono text-sm text-brand-text placeholder-brand-muted/40',
    'outline-none transition-all duration-200',
    'focus:border-brand-primary focus:shadow-[0_0_0_1px_#1F6F5440,0_0_12px_#1F6F5418]',
    'group-hover:border-brand-border/80',
    suffix ? 'pr-6' : '',
  ].join(' ')

  if (decimals !== undefined) {
    return (
      <div className="relative group">
        <input
          type="text"
          inputMode={decimals === 0 ? 'numeric' : 'decimal'}
          value={display}
          onChange={(e) => { setDisplay(e.target.value); onChange(e.target.value) }}
          onFocus={() => { focused.current = true }}
          onBlur={() => {
            focused.current = false
            if (display.trim() !== '') {
              const n = parseFloat(display.replace(',', '.'))
              if (!isNaN(n)) { const f = n.toFixed(decimals); setDisplay(f); onChange(f) }
            }
          }}
          placeholder={placeholder}
          className={inputClass}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-brand-muted font-mono pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="relative group">
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        min={min}
        step={step}
        className={inputClass}
      />
      {suffix && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-brand-muted font-mono pointer-events-none">
          {suffix}
        </span>
      )}
    </div>
  )
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={[
        'w-full bg-brand-input border border-brand-border rounded px-3 py-2.5',
        'text-sm text-brand-text placeholder-brand-muted/40',
        'outline-none transition-all duration-200',
        'focus:border-brand-primary focus:shadow-[0_0_0_1px_#1F6F5440]',
      ].join(' ')}
    />
  )
}

// ─── Metric card ──────────────────────────────────────────────────────────────

type CardColor = 'blue' | 'gold' | 'emerald' | 'default'

function MetricCard({
  label, value, sub, color = 'default',
}: {
  label: string
  value: string
  sub?: string
  color?: CardColor
}) {
  const s: Record<CardColor, { border: string; text: string; line: string; bg: string }> = {
    blue:    { border: 'border-brand-primary/25',  text: 'text-emerald-400', line: 'via-brand-primary/60',   bg: 'bg-brand-primary/[0.04] group-hover:bg-brand-primary/[0.07]'   },
    gold:    { border: 'border-brand-gold/25',  text: 'text-brand-gold-light', line: 'via-brand-gold/60',   bg: 'bg-brand-gold/[0.04] group-hover:bg-brand-gold/[0.07]'   },
    emerald: { border: 'border-emerald-500/25', text: 'text-emerald-400',      line: 'via-emerald-500/60',  bg: 'bg-emerald-500/[0.04] group-hover:bg-emerald-500/[0.07]' },
    default: { border: 'border-brand-border/60',text: 'text-brand-text',       line: 'via-brand-border/60', bg: '' },
  }
  const c = s[color]
  return (
    <div className={`glass rounded-xl border ${c.border} p-4 relative overflow-hidden group transition-all duration-300`}>
      <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent ${c.line} to-transparent`} />
      {c.bg && <div className={`absolute inset-0 ${c.bg} transition-colors duration-300 pointer-events-none`} />}
      <p className="text-[9px] uppercase tracking-[0.18em] text-brand-muted/60 font-semibold mb-1.5">{label}</p>
      <p className={`font-mono text-2xl font-bold leading-none ${c.text}`}>{value}</p>
      {sub && <p className="text-[10px] text-brand-muted/50 font-mono mt-1">{sub}</p>}
    </div>
  )
}

// ─── Left panel — Form ────────────────────────────────────────────────────────

function FormPanel({
  laminaLargo,
  setLaminaLargo,
  laminaAncho,
  setLaminaAncho,
  piezas,
  setPiezas,
  onGenerar,
  loading,
}: {
  laminaLargo: string
  setLaminaLargo: (v: string) => void
  laminaAncho: string
  setLaminaAncho: (v: string) => void
  piezas: PiezaLocal[]
  setPiezas: React.Dispatch<React.SetStateAction<PiezaLocal[]>>
  onGenerar: () => void
  loading: boolean
}) {
  const largo = parseFloat(laminaLargo) || 0
  const ancho = parseFloat(laminaAncho) || 0
  const areaLamina = largo * ancho

  const totalAreaPiezas = piezas.reduce((acc, p) => {
    return acc + (parseFloat(p.largo) || 0) * (parseFloat(p.ancho) || 0)
  }, 0)

  function addPieza() {
    setPiezas((prev) => [...prev, makePieza()])
  }

  function removePieza(uid: string) {
    setPiezas((prev) => prev.filter((p) => p.uid !== uid))
  }

  function updatePieza(uid: string, field: keyof Omit<PiezaLocal, 'uid'>, value: string) {
    setPiezas((prev) =>
      prev.map((p) => (p.uid === uid ? { ...p, [field]: value } : p))
    )
  }

  const canGenerate =
    largo > 0 &&
    ancho > 0 &&
    piezas.length > 0 &&
    piezas.every((p) => (parseFloat(p.largo) || 0) > 0 && (parseFloat(p.ancho) || 0) > 0)

  return (
    <div className="flex flex-col gap-6 min-w-0">

      {/* Lamina section */}
      <div className="glass rounded-xl border border-brand-border/60 p-5">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-0.5 h-4 bg-brand-primary rounded-full" />
          <h3 className="text-xs font-semibold tracking-[0.15em] uppercase text-brand-muted">
            Lámina
          </h3>
        </div>
        <p className="text-[10px] text-brand-muted/50 mb-4 pl-2.5">La plancha de mármol disponible para cortar</p>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <FieldLabel>Largo</FieldLabel>
            <MonoInput
              value={laminaLargo}
              onChange={setLaminaLargo}
              placeholder="3.20"
              suffix="m"
              decimals={2}
            />
          </div>
          <div>
            <FieldLabel>Ancho</FieldLabel>
            <MonoInput
              value={laminaAncho}
              onChange={setLaminaAncho}
              placeholder="1.60"
              suffix="m"
              decimals={2}
            />
          </div>
        </div>

        <div className="flex items-center justify-between px-4 py-2.5 bg-brand-input rounded border border-brand-border/40">
          <span className="text-[9px] uppercase tracking-[0.18em] text-brand-muted font-semibold">
            Área lámina
          </span>
          <span className="font-mono text-sm font-bold text-brand-gold">
            {formatNum(areaLamina)} m²
          </span>
        </div>
      </div>

      {/* Piezas section */}
      <div className="glass rounded-xl border border-brand-border/60 p-5">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-0.5 h-4 bg-brand-primary rounded-full" />
          <h3 className="text-xs font-semibold tracking-[0.15em] uppercase text-brand-muted">
            Piezas
          </h3>
          <span className="ml-auto font-mono text-[10px] text-brand-muted/40">
            {piezas.length} pieza{piezas.length !== 1 ? 's' : ''}
          </span>
        </div>
        <p className="text-[10px] text-brand-muted/50 mb-4 pl-2.5">Los cortes que necesitas obtener de la plancha</p>

        <AnimatePresence initial={false}>
          {piezas.length === 0 ? (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center text-xs text-brand-muted/40 py-6"
            >
              Sin piezas — agrega al menos una
            </motion.p>
          ) : (
            <div className="space-y-3 mb-4">
              {piezas.map((pieza, idx) => {
                const area =
                  (parseFloat(pieza.largo) || 0) * (parseFloat(pieza.ancho) || 0)

                return (
                  <motion.div
                    key={pieza.uid}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -16, height: 0, marginBottom: 0 }}
                    transition={{ delay: idx * 0.03, duration: 0.2 }}
                    className="relative bg-brand-input rounded-lg border border-brand-border/50 p-4"
                  >
                    {/* index badge */}
                    <span className="absolute top-3 left-3.5 font-mono text-[9px] text-brand-muted/30 tracking-widest">
                      P{String(idx + 1).padStart(2, '0')}
                    </span>

                    {/* remove button */}
                    <button
                      type="button"
                      onClick={() => removePieza(pieza.uid)}
                      className="absolute top-2.5 right-2.5 p-1 rounded text-brand-muted/30 hover:text-red-400/70 hover:bg-red-500/10 transition-all"
                      aria-label="Eliminar pieza"
                    >
                      <X size={13} />
                    </button>

                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-6 gap-2 items-end">
                      <div className="col-span-2">
                        <FieldLabel>Nombre/ID</FieldLabel>
                        <TextInput
                          value={pieza.id}
                          onChange={(v) => updatePieza(pieza.uid, 'id', v)}
                          placeholder="Ej. Mesón principal"
                        />
                      </div>
                      <div>
                        <FieldLabel>Largo</FieldLabel>
                        <MonoInput
                          value={pieza.largo}
                          onChange={(v) => updatePieza(pieza.uid, 'largo', v)}
                          placeholder="0.00"
                          suffix="m"
                          decimals={2}
                        />
                      </div>
                      <div>
                        <FieldLabel>Ancho</FieldLabel>
                        <MonoInput
                          value={pieza.ancho}
                          onChange={(v) => updatePieza(pieza.uid, 'ancho', v)}
                          placeholder="0.00"
                          suffix="m"
                          decimals={2}
                        />
                      </div>
                      <div>
                        <FieldLabel>Cant.</FieldLabel>
                        <MonoInput
                          value={pieza.cantidad}
                          onChange={(v) => updatePieza(pieza.uid, 'cantidad', v)}
                          placeholder="1"
                          decimals={0}
                        />
                      </div>
                      {/* area badge */}
                      <div className="flex flex-col items-end gap-0.5 pb-0.5">
                        <span className="text-[9px] uppercase tracking-widest text-brand-muted/40">
                          Área
                        </span>
                        <span
                          className={[
                            'font-mono text-sm font-bold',
                            area > 0 ? 'text-emerald-400' : 'text-brand-muted/30',
                          ].join(' ')}
                        >
                          {formatNum(area)}
                        </span>
                        <span className="text-[9px] text-brand-muted/40 font-mono">m²</span>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </AnimatePresence>

        {/* Add pieza button */}
        <button
          type="button"
          onClick={addPieza}
          className="w-full py-2.5 rounded-lg border border-dashed border-brand-border/50 text-xs text-brand-muted hover:text-emerald-400 hover:border-brand-primary/40 transition-all duration-200 flex items-center justify-center gap-2"
        >
          <Plus size={13} />
          Agregar pieza
        </button>

        {/* Total area piezas */}
        {piezas.length > 0 && (
          <div className="mt-4 flex items-center justify-between px-4 py-2.5 bg-brand-input rounded border border-brand-border/40">
            <span className="text-[9px] uppercase tracking-[0.18em] text-brand-muted font-semibold">
              Total piezas
            </span>
            <span className="font-mono text-sm font-bold text-brand-text">
              {formatNum(totalAreaPiezas)}{' '}
              <span className="text-xs text-brand-muted font-normal">m²</span>
            </span>
          </div>
        )}
      </div>

      {/* Generate button */}
      <button
        type="button"
        onClick={onGenerar}
        disabled={!canGenerate || loading}
        className={[
          'w-full py-4 rounded-xl font-bold text-sm tracking-wide transition-all duration-300',
          'bg-brand-primary text-white',
          'shadow-[0_0_30px_#1F6F5428,0_0_0_1px_#1F6F5440]',
          'hover:shadow-[0_0_50px_#1F6F5445,0_0_0_1px_#1F6F5470]',
          'disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none',
        ].join(' ')}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-3">
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
              className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
            />
            Generando…
          </span>
        ) : (
          'Generar plano'
        )}
      </button>
    </div>
  )
}

// ─── Right panel — Result ─────────────────────────────────────────────────────

const MIN_ZOOM = 0.3
const MAX_ZOOM = 3.0
const ZOOM_STEP = 0.2

function ResultPanel({
  result,
  totalPiezas,
}: {
  result: NestingResult | null
  totalPiezas: number
}) {
  const [zoom, setZoom] = React.useState(1)

  async function handleDownload() {
    if (!result?.svg) return
    const blob = new Blob([result.svg], { type: 'image/svg+xml' })
    await downloadFile(blob, 'plano_nesting.svg', 'image/svg+xml')
  }

  if (!result) {
    return (
      <div className="glass rounded-xl border border-brand-border/60 flex flex-col items-center justify-center min-h-[480px] gap-4">
        <div className="w-16 h-16 rounded-2xl bg-brand-surface/80 border border-brand-border flex items-center justify-center">
          <Grid size={28} className="text-brand-muted/30" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-brand-muted/50">El plano aparecerá aquí</p>
          <p className="text-xs text-brand-muted/30 mt-1">
            Completa el formulario y genera el plano
          </p>
        </div>
      </div>
    )
  }

  const areaLibre = result.area_lamina - result.area_usada
  const aprovPct = result.aprovechamiento

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="flex flex-col gap-5"
    >

      {/* Metrics row — color-coded */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard
          label="Aprovechamiento"
          value={`${formatNum(aprovPct, 1)}%`}
          color={aprovPct >= 70 ? 'emerald' : aprovPct >= 50 ? 'gold' : 'default'}
          sub={`de ${formatNum(result.area_lamina)} m²`}
        />
        <MetricCard
          label="Área usada"
          value={formatNum(result.area_usada, 2)}
          color="blue"
          sub="m²"
        />
        <MetricCard
          label="Piezas colocadas"
          value={`${result.piezas_colocadas}`}
          color="gold"
          sub={`de ${totalPiezas} total`}
        />
        <MetricCard
          label="Área libre"
          value={formatNum(areaLibre, 2)}
          color="default"
          sub="m² retal"
        />
      </div>

      {/* Piezas fuera warning */}
      <AnimatePresence>
        {result.piezas_fuera.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-2 px-4 py-3.5 rounded-lg border border-red-500/30 bg-red-500/5"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-red-400 shrink-0" />
              <span className="text-sm font-semibold text-red-400">
                {result.piezas_fuera.length} pieza
                {result.piezas_fuera.length !== 1 ? 's' : ''} no caben en la lámina
              </span>
            </div>
            <ul className="pl-5 space-y-0.5">
              {result.piezas_fuera.map((nombre) => (
                <li key={nombre} className="text-xs text-red-400/70 font-mono">
                  {nombre}
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SVG viewer with zoom */}
      <div className="rounded-xl border border-brand-primary/15 bg-brand-input overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-brand-border/40">
          <span className="text-[9px] tracking-[0.2em] uppercase text-brand-muted font-semibold">
            Plano de corte
          </span>
          <div className="flex items-center gap-2">
            {/* Zoom controls */}
            <div className="flex items-center gap-1 mr-1">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(MIN_ZOOM, parseFloat((z - ZOOM_STEP).toFixed(1))))}
                className="w-6 h-6 flex items-center justify-center rounded border border-brand-border/60 text-brand-muted hover:text-brand-text hover:border-brand-primary/40 transition-all"
                aria-label="Reducir zoom"
              >
                <Minus size={11} />
              </button>
              <button
                type="button"
                onClick={() => setZoom(1)}
                className="px-2 h-6 font-mono text-[10px] rounded border border-brand-border/60 text-brand-muted hover:text-brand-text hover:border-brand-primary/40 transition-all min-w-[44px] text-center"
                aria-label="Restablecer zoom"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(MAX_ZOOM, parseFloat((z + ZOOM_STEP).toFixed(1))))}
                className="w-6 h-6 flex items-center justify-center rounded border border-brand-border/60 text-brand-muted hover:text-brand-text hover:border-brand-primary/40 transition-all"
                aria-label="Aumentar zoom"
              >
                <Plus size={11} />
              </button>
              <button
                type="button"
                onClick={() => setZoom(1)}
                className="w-6 h-6 flex items-center justify-center rounded border border-brand-border/60 text-brand-muted hover:text-brand-text hover:border-brand-primary/40 transition-all"
                aria-label="Ajustar al ancho"
              >
                <Maximize2 size={11} />
              </button>
            </div>
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-brand-primary/30 bg-brand-primary/10 text-xs font-semibold text-brand-text hover:bg-brand-primary/20 hover:border-brand-primary/60 transition-all duration-200"
            >
              <Download size={12} />
              Descargar SVG
            </button>
          </div>
        </div>
        {/* SVG with zoom transform */}
        <div className="overflow-auto p-5" style={{ maxHeight: '70vh' }}>
          <div
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
              transition: 'transform 0.15s ease',
              display: 'inline-block',
            }}
            dangerouslySetInnerHTML={{ __html: result.svg }}
          />
        </div>
      </div>
    </motion.div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function NestingPage() {
  const [laminaLargo, setLaminaLargo] = useState('3.20')
  const [laminaAncho, setLaminaAncho] = useState('1.60')
  const [piezas, setPiezas] = useState<PiezaLocal[]>([makePieza()])
  const [result, setResult] = useState<NestingResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleGenerar() {
    setLoading(true)
    setError(null)
    try {
      const res = await generarNesting({
        lamina: {
          largo: parseFloat(laminaLargo) || 0,
          ancho: parseFloat(laminaAncho) || 0,
        },
        piezas: piezas.map((p, i) => ({
          id: p.id.trim() || `Pieza ${i + 1}`,
          largo: parseFloat(p.largo) || 0,
          ancho: parseFloat(p.ancho) || 0,
          cantidad: Math.max(1, parseInt(p.cantidad) || 1),
        })),
        perforaciones: [],
      })
      setResult(res)
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        'Error al generar el plano. Intenta de nuevo.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppLayout>
      <div className="max-w-[1400px] mx-auto py-6 px-2">

        {/* Page header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-1 h-6 bg-brand-primary rounded-full" />
            <h1 className="text-lg font-bold text-brand-text tracking-tight">
              Nesting — Plano de corte
            </h1>
          </div>
          <p className="text-xs text-brand-muted ml-4 pl-0.5">
            Optimiza el aprovechamiento de la lámina distribuyendo las piezas automáticamente
          </p>
          <div className="mt-4 h-px bg-gradient-to-r from-brand-primary/40 via-brand-border to-transparent" />
        </div>

        {/* Error banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              role="alert"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-6 flex items-center gap-3 px-5 py-3.5 rounded-lg border border-red-500/30 bg-red-500/5"
            >
              <AlertTriangle size={15} className="text-red-400 shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
              <button
                type="button"
                onClick={() => setError(null)}
                aria-label="Cerrar"
                className="ml-auto text-red-400/50 hover:text-red-400 transition-colors"
              >
                <X size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 xl:grid-cols-[2fr_3fr] gap-6 items-start">

          {/* Left — Form */}
          <FormPanel
            laminaLargo={laminaLargo}
            setLaminaLargo={setLaminaLargo}
            laminaAncho={laminaAncho}
            setLaminaAncho={setLaminaAncho}
            piezas={piezas}
            setPiezas={setPiezas}
            onGenerar={handleGenerar}
            loading={loading}
          />

          {/* Right — Result */}
          <ResultPanel result={result} totalPiezas={piezas.length} />
        </div>
      </div>
    </AppLayout>
  )
}
