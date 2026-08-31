import React, { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Grid, Plus, X, Download, AlertTriangle, Minus, Maximize2, PackagePlus, Check } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import AppLayout from '@/components/AppLayout'
import { generarNesting } from '@/api/nesting'
import type { NestingResult } from '@/api/nesting'
import { crearRetal } from '@/api/retales'
import { formatNum } from '@/lib/utils'
import { downloadFile } from '@/lib/downloadFile'
import MaterialCombobox from '@/components/MaterialCombobox'

const MATERIALES_NESTING = ['Mármol', 'Granito', 'Sinterizado', 'Quarztone', 'Quarzita'] as const

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
    <label className="block text-[10px] font-semibold tracking-[0.18em] uppercase text-brand-text-secondary mb-1.5">
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
    'font-mono text-sm text-brand-text placeholder:text-brand-text-secondary',
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
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-brand-text-secondary font-mono pointer-events-none">
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
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-brand-text-secondary font-mono pointer-events-none">
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
        'text-sm text-brand-text placeholder:text-brand-text-secondary',
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
    blue:    { border: 'border-brand-primary/25',  text: 'text-brand-primary', line: 'via-brand-primary/60',   bg: 'bg-brand-primary/[0.04] group-hover:bg-brand-primary/[0.07]'   },
    gold:    { border: 'border-brand-gold/25',  text: 'text-brand-gold-light', line: 'via-brand-gold/60',   bg: 'bg-brand-gold/[0.04] group-hover:bg-brand-gold/[0.07]'   },
    emerald: { border: 'border-brand-primary/25', text: 'text-brand-primary',      line: 'via-brand-primary/60',  bg: 'bg-brand-primary/[0.04] group-hover:bg-brand-primary/[0.07]' },
    default: { border: 'border-brand-border/60',text: 'text-brand-text',       line: 'via-brand-border/60', bg: '' },
  }
  const c = s[color]
  return (
    <div className={`glass rounded-xl border ${c.border} p-4 relative overflow-hidden group transition-all duration-300`}>
      <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent ${c.line} to-transparent`} />
      {c.bg && <div className={`absolute inset-0 ${c.bg} transition-colors duration-300 pointer-events-none`} />}
      <p className="text-[9px] uppercase tracking-[0.18em] text-brand-text-secondary font-semibold mb-1.5">{label}</p>
      <p className={`font-mono text-2xl font-bold leading-none ${c.text}`}>{value}</p>
      {sub && <p className="text-[10px] text-brand-text-secondary font-mono mt-1">{sub}</p>}
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
  categoria,
  setCategoria,
  materialRef,
  setMaterialRef,
  materialPrecioM2,
  setMaterialPrecioM2,
}: {
  laminaLargo: string
  setLaminaLargo: (v: string) => void
  laminaAncho: string
  setLaminaAncho: (v: string) => void
  piezas: PiezaLocal[]
  setPiezas: React.Dispatch<React.SetStateAction<PiezaLocal[]>>
  onGenerar: () => void
  loading: boolean
  categoria: string
  setCategoria: (v: string) => void
  materialRef: string
  setMaterialRef: (v: string) => void
  materialPrecioM2: number
  setMaterialPrecioM2: (v: number) => void
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

      {/* Material section — necesario para poder guardar el retal sobrante al Banco */}
      <div className="glass rounded-xl border border-brand-border/60 p-5">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-0.5 h-4 bg-brand-primary rounded-full" />
          <h3 className="text-xs font-semibold tracking-[0.15em] uppercase text-brand-text-secondary">
            Material
          </h3>
        </div>
        <p className="text-[10px] text-brand-text-secondary mb-4 pl-2.5">Para poder guardar el sobrante en el Banco de Retales</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <FieldLabel>Categoría</FieldLabel>
            <select
              value={categoria}
              onChange={(e) => { setCategoria(e.target.value); setMaterialRef(''); setMaterialPrecioM2(0) }}
              className="w-full px-3 py-2.5 rounded bg-brand-input border border-brand-border text-sm text-brand-text focus:outline-none focus:border-brand-primary transition-colors"
            >
              {MATERIALES_NESTING.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <FieldLabel>Referencia</FieldLabel>
            <MaterialCombobox
              categoria={categoria}
              value={materialRef}
              precioM2Actual={materialPrecioM2}
              onChange={(ref, precioM2) => { setMaterialRef(ref); setMaterialPrecioM2(precioM2) }}
            />
          </div>
        </div>
      </div>

      {/* Lamina section */}
      <div className="glass rounded-xl border border-brand-border/60 p-5">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-0.5 h-4 bg-brand-primary rounded-full" />
          <h3 className="text-xs font-semibold tracking-[0.15em] uppercase text-brand-text-secondary">
            Lámina
          </h3>
        </div>
        <p className="text-[10px] text-brand-text-secondary mb-4 pl-2.5">La plancha de mármol disponible para cortar</p>

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
          <span className="text-[9px] uppercase tracking-[0.18em] text-brand-text-secondary font-semibold">
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
          <h3 className="text-xs font-semibold tracking-[0.15em] uppercase text-brand-text-secondary">
            Piezas
          </h3>
          <span className="ml-auto font-mono text-[10px] text-brand-text-secondary">
            {piezas.length} pieza{piezas.length !== 1 ? 's' : ''}
          </span>
        </div>
        <p className="text-[10px] text-brand-text-secondary mb-4 pl-2.5">Los cortes que necesitas obtener de la plancha</p>

        <AnimatePresence initial={false}>
          {piezas.length === 0 ? (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center text-xs text-brand-text-secondary py-6"
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
                    <span className="absolute top-3 left-3.5 font-mono text-[9px] text-brand-text-secondary tracking-widest">
                      P{String(idx + 1).padStart(2, '0')}
                    </span>

                    {/* remove button */}
                    <button
                      type="button"
                      onClick={() => removePieza(pieza.uid)}
                      className="absolute top-2.5 right-2.5 p-1 rounded text-brand-text-secondary hover:text-brand-danger/70 hover:bg-red-500/10 transition-all"
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
                        <span className="text-[9px] uppercase tracking-widest text-brand-text-secondary">
                          Área
                        </span>
                        <span
                          className={[
                            'font-mono text-sm font-bold',
                            area > 0 ? 'text-brand-primary' : 'text-brand-text-secondary',
                          ].join(' ')}
                        >
                          {formatNum(area)}
                        </span>
                        <span className="text-[9px] text-brand-text-secondary font-mono">m²</span>
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
          className="w-full py-2.5 rounded-lg border border-dashed border-brand-border/50 text-xs text-brand-text-secondary hover:text-brand-primary hover:border-brand-primary/40 transition-all duration-200 flex items-center justify-center gap-2"
        >
          <Plus size={13} />
          Agregar pieza
        </button>

        {/* Total area piezas */}
        {piezas.length > 0 && (
          <div className="mt-4 flex items-center justify-between px-4 py-2.5 bg-brand-input rounded border border-brand-border/40">
            <span className="text-[9px] uppercase tracking-[0.18em] text-brand-text-secondary font-semibold">
              Total piezas
            </span>
            <span className="font-mono text-sm font-bold text-brand-text">
              {formatNum(totalAreaPiezas)}{' '}
              <span className="text-xs text-brand-text-secondary font-normal">m²</span>
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
            <span
              className="inline-block w-4 h-4 animate-spin border-2 border-white/30 border-t-white rounded-full"
              aria-hidden="true"
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
  categoria,
  materialRef,
  materialPrecioM2,
}: {
  result: NestingResult | null
  totalPiezas: number
  categoria: string
  materialRef: string
  materialPrecioM2: number
}) {
  const [zoom, setZoom] = React.useState(1)
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState(false)
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null)

  async function handleDownload() {
    if (!result?.svg) return
    const blob = new Blob([result.svg], { type: 'image/svg+xml' })
    await downloadFile(blob, 'plano_nesting.svg', 'image/svg+xml')
  }

  async function handleGuardarRetal() {
    if (!result) return
    const areaLibre = result.area_lamina - result.area_usada
    if (areaLibre <= 0) return
    setGuardando(true)
    setErrorGuardar(null)
    try {
      await crearRetal({
        material_categoria: categoria,
        referencia: materialRef || undefined,
        m2_disponibles: Math.round(areaLibre * 1000) / 1000,
        precio_mercado_m2: materialPrecioM2 || undefined,
        notas: 'Generado desde Nesting — sobrante del plano de corte',
      })
      setGuardado(true)
    } catch {
      setErrorGuardar('No se pudo guardar el retal. Intenta de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  useEffect(() => {
    setGuardado(false)
    setErrorGuardar(null)
  }, [result])

  if (!result) {
    return (
      <div className="glass rounded-xl border border-brand-border/60 flex flex-col items-center justify-center min-h-[480px] gap-4">
        <div className="w-16 h-16 rounded-2xl bg-brand-surface/80 border border-brand-border flex items-center justify-center">
          <Grid size={28} className="text-brand-text-secondary" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-brand-text-secondary">El plano aparecerá aquí</p>
          <p className="text-xs text-brand-text-secondary mt-1">
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

      {/* Guardar retal — el sobrante ya NO se pierde, queda disponible para la próxima cotización */}
      {areaLibre > 0.01 && (
        <div className="glass rounded-xl border border-brand-border/60 px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-brand-primary/15 border border-brand-primary/30 flex items-center justify-center shrink-0">
              <PackagePlus size={16} className="text-brand-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-brand-text">
                {formatNum(areaLibre, 2)} m² de sobrante en {categoria}{materialRef ? ` — ${materialRef}` : ''}
              </p>
              <p className="text-[11px] text-brand-text-secondary">Guárdalo en el Banco de Retales para usarlo en una próxima cotización</p>
            </div>
          </div>
          <button
            onClick={handleGuardarRetal}
            disabled={guardando || guardado}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-primary text-white text-xs font-semibold shadow-[0_0_16px_#1F6F5430] hover:shadow-[0_0_28px_#1F6F5450] disabled:opacity-60 transition-all shrink-0"
          >
            {guardado ? <Check className="w-3.5 h-3.5" /> : <PackagePlus className="w-3.5 h-3.5" />}
            {guardado ? 'Guardado en Retales' : guardando ? 'Guardando…' : 'Guardar retal'}
          </button>
        </div>
      )}
      {errorGuardar && (
        <p className="text-xs text-brand-danger -mt-2">{errorGuardar}</p>
      )}

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
            className="flex flex-col gap-2 px-4 py-3.5 rounded-lg border border-brand-danger/30 bg-red-500/5"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-brand-danger shrink-0" />
              <span className="text-sm font-semibold text-brand-danger">
                {result.piezas_fuera.length} pieza
                {result.piezas_fuera.length !== 1 ? 's' : ''} no caben en la lámina
              </span>
            </div>
            <ul className="pl-5 space-y-0.5">
              {result.piezas_fuera.map((nombre) => (
                <li key={nombre} className="text-xs text-brand-danger/70 font-mono">
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
          <span className="text-[9px] tracking-[0.2em] uppercase text-brand-text-secondary font-semibold">
            Plano de corte
          </span>
          <div className="flex items-center gap-2">
            {/* Zoom controls */}
            <div className="flex items-center gap-1 mr-1">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(MIN_ZOOM, parseFloat((z - ZOOM_STEP).toFixed(1))))}
                className="w-6 h-6 flex items-center justify-center rounded border border-brand-border/60 text-brand-text-secondary hover:text-brand-text hover:border-brand-primary/40 transition-all"
                aria-label="Reducir zoom"
              >
                <Minus size={11} />
              </button>
              <button
                type="button"
                onClick={() => setZoom(1)}
                className="px-2 h-6 font-mono text-[10px] rounded border border-brand-border/60 text-brand-text-secondary hover:text-brand-text hover:border-brand-primary/40 transition-all min-w-[44px] text-center"
                aria-label="Restablecer zoom"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(MAX_ZOOM, parseFloat((z + ZOOM_STEP).toFixed(1))))}
                className="w-6 h-6 flex items-center justify-center rounded border border-brand-border/60 text-brand-text-secondary hover:text-brand-text hover:border-brand-primary/40 transition-all"
                aria-label="Aumentar zoom"
              >
                <Plus size={11} />
              </button>
              <button
                type="button"
                onClick={() => setZoom(1)}
                className="w-6 h-6 flex items-center justify-center rounded border border-brand-border/60 text-brand-text-secondary hover:text-brand-text hover:border-brand-primary/40 transition-all"
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
  const [categoria, setCategoria] = useState<string>(MATERIALES_NESTING[0])
  const [materialRef, setMaterialRef] = useState('')
  const [materialPrecioM2, setMaterialPrecioM2] = useState(0)

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

        <PageHeader
          kicker="Taller"
          title="Nesting"
          subtitle="Optimiza el aprovechamiento de la lámina distribuyendo las piezas automáticamente"
        />

        {/* Error banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              role="alert"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-6 flex items-center gap-3 px-5 py-3.5 rounded-lg border border-brand-danger/30 bg-red-500/5"
            >
              <AlertTriangle size={15} className="text-brand-danger shrink-0" />
              <p className="text-sm text-brand-danger">{error}</p>
              <button
                type="button"
                onClick={() => setError(null)}
                aria-label="Cerrar"
                className="ml-auto text-brand-danger/50 hover:text-brand-danger transition-colors"
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
            categoria={categoria}
            setCategoria={setCategoria}
            materialRef={materialRef}
            setMaterialRef={setMaterialRef}
            materialPrecioM2={materialPrecioM2}
            setMaterialPrecioM2={setMaterialPrecioM2}
          />

          {/* Right — Result */}
          <ResultPanel
            result={result}
            totalPiezas={piezas.length}
            categoria={categoria}
            materialRef={materialRef}
            materialPrecioM2={materialPrecioM2}
          />
        </div>
      </div>
    </AppLayout>
  )
}
