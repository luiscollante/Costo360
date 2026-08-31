import React, { useState, useEffect, useRef } from 'react'
import { FileDown, Receipt, Loader2, Plus } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useLocation } from 'react-router-dom'
import AppLayout from '@/components/AppLayout'
import { useWizardStore } from '@/store/wizard'
import { calcularCotizacionDirecta, guardarCotizacion, descargarPDF, descargarCuentaCobro } from '@/api/cotizacion'
import type { MaterialItem, PiezaItem } from '@/types/cotizacion'
import MaterialCombobox from '@/components/MaterialCombobox'
import { PageHeader } from '@/components/ui/PageHeader'
import { formatCOP, formatNum, formatPct } from '@/lib/utils'

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIAS = ['Mármol', 'Granito', 'Sinterizado', 'Quarztone', 'Quarzita']

const ETAPAS = [
  'Casa terminada (limpia)',
  'En acabados',
  'En estructura',
  'Proyecto comercial',
]

const TIPOS_PROYECTO = [
  'Meson', 'Isla', 'Baño', 'Escalera', 'Piso',
  'Fachada', 'Revestimiento', 'Otro',
]

// Anchos por defecto por tipo — siempre editables (no bloqueados)
const ANCHOS_ESTANDAR: Record<string, number | null> = {
  'Mesón de cocina': 0.60,
  'Isla de cocina': 1.00,
  'Encimera': 0.60,
  'Salpicadero / Frente': 0.60,
  'Baño / Lavamanos': 0.45,
  'Mueble de baño': 0.50,
  'Zócalo': 0.10,
  'Huella escalón': 0.30,
  'Escalón completo': 0.90,
  'Fachada / Panel': 1.00,
  'Personalizado': null,
}
const TIPO_ELEMENT_KEYS = Object.keys(ANCHOS_ESTANDAR)

const STEP_LABELS = ['Material', 'Piezas', 'Proyecto', 'Resultado']

const SUGERENCIAS_INCLUSION = [
  'Suministro del material',
  'Instalación completa',
  'Medidas en sitio',
  'Limpieza final',
  'Zócalo incluido',
  'Transporte al sitio',
]

const SUGERENCIAS_EXCLUSION = [
  'Demolición',
  'Electricidad o plomería',
  'Permisos y licencias',
  'Pintura o estucado',
  'Mano de obra de otros gremios',
]

// Color system for plates — 4 fixed colors cycling
const PLACA_COLORS = [
  { hex: '#1F6F54', light: '#6AAEFF', bg: 'rgba(30,127,255,0.08)' },
  { hex: '#C9A227', light: '#D4B06A', bg: 'rgba(201,162,39,0.08)' },
  { hex: '#22C55E', light: '#4ADE80', bg: 'rgba(34,197,94,0.08)' },
  { hex: '#F43F5E', light: '#FB7185', bg: 'rgba(244,63,94,0.08)' },
]

const MAX_ADICIONALES = 20

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlacaLocal {
  id: string
  cat: string
  ref: string
  precio_m2: number
  largo: number
  ancho: number
  cantLaminas: number
}

interface PiezaLocal {
  id: string
  placaId: string
  nombre: string
  tipoElemento: string
  ml: string
  cantidad: string
  anchoCustom: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makePlaca(): PlacaLocal {
  return {
    id: Math.random().toString(36).slice(2),
    cat: 'Mármol',
    ref: '',
    precio_m2: 0,
    largo: 0,
    ancho: 0,
    cantLaminas: 1,
  }
}

function makePieza(placaId: string): PiezaLocal {
  const defaultTipo = 'Mesón de cocina'
  return {
    id: Math.random().toString(36).slice(2),
    placaId,
    nombre: '',
    tipoElemento: defaultTipo,
    ml: '',
    cantidad: '1',
    anchoCustom: String(ANCHOS_ESTANDAR[defaultTipo] ?? 0.60),
  }
}

function placaAreaTotal(p: PlacaLocal): number {
  return p.largo * p.ancho * p.cantLaminas
}

function placaLabel(p: PlacaLocal, idx: number): string {
  const dims = p.largo > 0 && p.ancho > 0
    ? ` · ${formatNum(p.largo, 2)}×${formatNum(p.ancho, 2)} m`
    : ''
  const lam = p.cantLaminas > 1 ? ` · ${p.cantLaminas} lám.` : ''
  return `Placa ${idx + 1}${p.ref ? ` — ${p.ref}` : ''}${dims}${lam}`
}

function placaShortLabel(ref: string, idx: number): string {
  const truncated = ref.length > 12 ? ref.slice(0, 11) + '…' : ref
  return `P${idx + 1}${truncated ? ` · ${truncated}` : ''}`
}

function piezaM2(p: PiezaLocal): number {
  const ancho = parseFloat(p.anchoCustom) || 0
  return (parseFloat(p.ml) || 0) * ancho * (parseInt(p.cantidad) || 1)
}

function piezaM2Single(p: PiezaLocal): number {
  const ancho = parseFloat(p.anchoCustom) || 0
  return (parseFloat(p.ml) || 0) * ancho
}

function piezasAdicionalesAprox(
  restanteM2: number,
  piezasFiltradas: PiezaLocal[]
): Array<{ tipo: string; cantidad: number }> {
  if (restanteM2 <= 0 || piezasFiltradas.length === 0) return []
  const tipos = new Map<string, number>()
  piezasFiltradas.forEach((p) => {
    const m2 = piezaM2Single(p)
    if (m2 > 0) {
      const cuantas = Math.min(Math.floor(restanteM2 / m2), MAX_ADICIONALES)
      if (cuantas > 0) tipos.set(p.tipoElemento, cuantas)
    }
  })
  return Array.from(tipos.entries()).map(([tipo, cantidad]) => ({ tipo, cantidad }))
}

// ─── Shared animation ─────────────────────────────────────────────────────────

const slideVariants = {
  enter: (dir: number) => ({ x: dir * 60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir * -60, opacity: 0 }),
}

function StepMotion({
  children,
  stepKey,
  dir,
}: {
  children: React.ReactNode
  stepKey: number
  dir: number
}) {
  return (
    <motion.div
      key={stepKey}
      custom={dir}
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="w-full"
    >
      {children}
    </motion.div>
  )
}

// ─── Shared primitives ────────────────────────────────────────────────────────

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
  className = '',
  readOnly,
  suffix,
  decimals,
}: {
  value: string | number
  onChange?: (v: string) => void
  placeholder?: string
  type?: string
  min?: number
  step?: number
  className?: string
  readOnly?: boolean
  suffix?: string
  decimals?: number
}) {
  const fmt = React.useCallback((v: string | number): string => {
    if (v === '' || v === 0 || v == null) return ''
    const n = parseFloat(String(v).replace(',', '.'))
    if (isNaN(n)) return String(v)
    if (decimals !== undefined) return n.toFixed(decimals)
    return String(v)
  }, [decimals])

  const [display, setDisplay] = React.useState(() => fmt(value))
  const focused = useRef(false)

  useEffect(() => {
    if (!focused.current) setDisplay(fmt(value))
  }, [value, fmt])

  const baseClass = [
    'w-full bg-brand-input border border-brand-border rounded px-3 py-2.5',
    'font-mono text-sm text-brand-text placeholder-brand-muted/40',
    'outline-none transition-all duration-200',
    'focus:border-brand-primary focus:shadow-[0_0_0_1px_#1F6F5440,0_0_12px_#1F6F5418]',
    'group-hover:border-brand-border/80',
    readOnly ? 'cursor-default text-brand-primary/80' : '',
    suffix ? 'pr-6' : '',
    className,
  ].join(' ')

  if (decimals !== undefined && !readOnly) {
    return (
      <div className="relative group">
        <input
          type="text"
          inputMode={decimals === 0 ? 'numeric' : 'decimal'}
          value={display}
          onChange={(e) => { setDisplay(e.target.value); onChange?.(e.target.value) }}
          onFocus={() => { focused.current = true }}
          onBlur={() => {
            focused.current = false
            if (display.trim() !== '') {
              const n = parseFloat(display.replace(',', '.'))
              if (!isNaN(n)) { const f = n.toFixed(decimals); setDisplay(f); onChange?.(f) }
            }
          }}
          placeholder={placeholder}
          className={baseClass}
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
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        min={min}
        step={step}
        readOnly={readOnly}
        className={baseClass}
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
  className = '',
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
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
        className,
      ].join(' ')}
    />
  )
}

function SelectInput({
  value,
  onChange,
  options,
  className = '',
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  className?: string
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={[
        'w-full bg-brand-input border border-brand-border rounded px-3 py-2.5',
        'text-sm text-brand-text',
        'outline-none transition-all duration-200',
        'focus:border-brand-primary focus:shadow-[0_0_0_1px_#1F6F5440]',
        className,
      ].join(' ')}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

// ─── MoneyInput — formatea con separadores al salir del foco ─────────────────

function MoneyInput({
  value,
  onChange,
  placeholder = '0',
  className = '',
}: {
  value: number
  onChange: (v: number) => void
  placeholder?: string
  className?: string
}) {
  const [focused, setFocused] = useState(false)
  const [raw, setRaw] = useState(value > 0 ? String(value) : '')
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync raw when value changes from outside (e.g., catalog selection)
  useEffect(() => {
    if (!focused) setRaw(value > 0 ? String(value) : '')
  }, [value, focused])

  const displayVal = focused
    ? raw
    : value > 0
    ? new Intl.NumberFormat('es-CO').format(value)
    : ''

  return (
    <div className="relative group">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-brand-text-secondary font-mono pointer-events-none">$</span>
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={displayVal}
        placeholder={placeholder}
        onFocus={() => { setFocused(true); setRaw(value > 0 ? String(value) : '') }}
        onBlur={() => {
          setFocused(false)
          const n = parseInt(raw.replace(/\D/g, '')) || 0
          onChange(n)
          setRaw(n > 0 ? String(n) : '')
        }}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, '')
          setRaw(digits)
        }}
        className={[
          'w-full bg-brand-input border border-brand-border rounded pl-7 pr-3 py-2.5',
          'font-mono text-sm text-brand-text placeholder-brand-muted/40',
          'outline-none transition-all duration-200',
          'focus:border-brand-primary focus:shadow-[0_0_0_1px_#1F6F5440,0_0_12px_#1F6F5418]',
          'group-hover:border-brand-border/80',
          className,
        ].join(' ')}
      />
    </div>
  )
}

function Toggle({
  checked,
  onChange,
  label,
  sublabel,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  sublabel?: string
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between w-full py-3 group"
    >
      <div className="text-left">
        <p className="text-sm text-brand-text font-medium">{label}</p>
        {sublabel && <p className="text-xs text-brand-text-secondary mt-0.5">{sublabel}</p>}
      </div>
      <div
        className={[
          'relative w-10 h-5 rounded-full transition-all duration-200 shrink-0 ml-4',
          checked ? 'bg-brand-primary' : 'bg-brand-border',
        ].join(' ')}
      >
        <div
          className={[
            'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all duration-200 shadow-sm',
            checked ? 'left-5' : 'left-0.5',
          ].join(' ')}
        />
      </div>
    </button>
  )
}

// ─── AlcancePanel ─────────────────────────────────────────────────────────────

function AlcancePanel({
  label,
  isInclusion,
  items,
  setItems,
  sugerencias,
}: {
  label: string
  isInclusion: boolean
  items: string[]
  setItems: (items: string[]) => void
  sugerencias: string[]
}) {
  const [inputVal, setInputVal] = useState('')

  const accent = isInclusion ? '#22C55E' : '#F43F5E'
  const bgColor = isInclusion ? 'rgba(34,197,94,0.06)' : 'rgba(244,63,94,0.06)'
  const borderColor = isInclusion ? 'rgba(34,197,94,0.20)' : 'rgba(244,63,94,0.20)'

  function addItem(text: string) {
    const t = text.trim()
    if (t && !items.includes(t)) setItems([...items, t])
  }

  function removeItem(item: string) {
    setItems(items.filter(i => i !== item))
  }

  const disponibles = sugerencias.filter(s => !items.includes(s))

  return (
    <div className="rounded-lg border p-4 space-y-3" style={{ background: bgColor, borderColor }}>
      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: accent }} />
        <span className="text-[10px] font-semibold tracking-[0.15em] uppercase" style={{ color: accent }}>
          {label}
        </span>
        {items.length > 0 && (
          <span className="ml-auto font-mono text-[9px] text-brand-text-secondary">{items.length} ítem{items.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {items.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {items.map(item => (
            <span
              key={item}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border"
              style={{ borderColor: accent + '40', background: accent + '10', color: accent }}
            >
              {item}
              <button
                type="button"
                onClick={() => removeItem(item)}
                className="opacity-60 hover:opacity-100 transition-opacity leading-none"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {disponibles.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {disponibles.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => addItem(s)}
              className="px-2 py-0.5 rounded-full text-[11px] border border-dashed border-brand-border/50 text-brand-text-secondary hover:border-brand-border hover:text-brand-text transition-all"
            >
              + {s}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); addItem(inputVal); setInputVal('') }
          }}
          placeholder="Agregar ítem personalizado…"
          className="flex-1 min-w-0 bg-brand-input/60 border border-brand-border/50 rounded px-3 py-1.5 text-xs text-brand-text placeholder-brand-muted/40 outline-none focus:border-brand-primary/50 transition-all"
        />
        <button
          type="button"
          onClick={() => { addItem(inputVal); setInputVal('') }}
          disabled={!inputVal.trim()}
          className="px-2.5 py-1.5 rounded border border-brand-border/50 text-xs text-brand-text-secondary hover:text-brand-text hover:border-brand-border transition-colors disabled:opacity-30"
        >
          +
        </button>
      </div>
    </div>
  )
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-6">
      <div className="flex-1 h-px bg-brand-border" />
      <span className="text-[9px] tracking-[0.2em] uppercase text-brand-text-secondary font-semibold">
        {label}
      </span>
      <div className="flex-1 h-px bg-brand-border" />
    </div>
  )
}

function StepNav({
  onBack,
  onNext,
  backLabel = 'Anterior',
  nextLabel = 'Siguiente',
  nextDisabled = false,
  isLast = false,
}: {
  onBack?: () => void
  onNext: () => void
  backLabel?: string
  nextLabel?: string
  nextDisabled?: boolean
  isLast?: boolean
}) {
  return (
    <div className="flex items-center justify-between mt-10 pt-6 border-t border-brand-border">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-brand-text-secondary hover:text-brand-text transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 2L4 7L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {backLabel}
        </button>
      ) : (
        <div />
      )}
      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled}
        className={[
          'flex items-center gap-2 px-6 py-2.5 rounded text-sm font-semibold transition-all duration-200',
          isLast
            ? 'bg-brand-primary text-white hover:bg-brand-primary/90 shadow-[0_0_20px_#1F6F5430]'
            : 'bg-brand-primary/10 border border-brand-primary/30 text-brand-primary-light hover:bg-brand-primary/20 hover:border-brand-primary/60',
          nextDisabled ? 'opacity-40 cursor-not-allowed' : '',
        ].join(' ')}
      >
        {nextLabel}
        {!isLast && (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M5 2L10 7L5 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
    </div>
  )
}

// ─── Step Indicator ───────────────────────────────────────────────────────────

function StepIndicator({ paso }: { paso: number }) {
  return (
    <nav aria-label="Progreso de la cotización">
      {/* Mobile: barra de progreso compacta */}
      <div className="sm:hidden mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] uppercase tracking-widest text-brand-text-secondary font-semibold">
            Paso {paso + 1} / {STEP_LABELS.length}
          </span>
          <span className="text-[10px] font-semibold text-brand-primary-light uppercase tracking-widest">
            {STEP_LABELS[paso]}
          </span>
        </div>
        <div className="h-0.5 bg-brand-border rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-brand-primary rounded-full"
            initial={{ width: '0%' }}
            animate={{ width: `${((paso + 1) / STEP_LABELS.length) * 100}%` }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
          />
        </div>
      </div>
      {/* Desktop: indicador completo */}
      <div className="hidden sm:flex items-center justify-center mb-10">
      {STEP_LABELS.map((label, i) => {
        const done = i < paso
        const active = i === paso
        return (
          <React.Fragment key={i}>
            {i > 0 && (
              <div className="flex-1 h-px max-w-16 relative mx-1">
                <div className="absolute inset-0 bg-brand-border" />
                <motion.div
                  className="absolute inset-y-0 left-0 bg-brand-primary"
                  initial={{ width: '0%' }}
                  animate={{ width: done ? '100%' : '0%' }}
                  transition={{ duration: 0.4, ease: 'easeInOut' }}
                />
              </div>
            )}
            <div className="flex flex-col items-center gap-1.5" aria-current={active ? 'step' : undefined}>
              <div className="relative">
                <motion.div
                  className={[
                    'w-7 h-7 rounded-full border flex items-center justify-center transition-all duration-300',
                    active
                      ? 'border-brand-primary bg-brand-primary/10 shadow-[0_0_12px_#1F6F5440]'
                      : done
                      ? 'border-brand-primary bg-brand-primary'
                      : 'border-brand-border bg-brand-bg',
                  ].join(' ')}
                >
                  {done ? (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <span
                      className={[
                        'font-mono text-[10px] font-bold',
                        active ? 'text-brand-primary' : 'text-brand-text-secondary',
                      ].join(' ')}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </span>
                  )}
                </motion.div>
                {active && (
                  <motion.div
                    className="absolute inset-0 rounded-full border border-brand-primary/40"
                    animate={{ scale: [1, 1.5], opacity: [0.6, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
                  />
                )}
              </div>
              <span
                className={[
                  'text-[10px] tracking-[0.12em] uppercase font-semibold whitespace-nowrap',
                  active ? 'text-brand-primary' : 'text-brand-text-secondary',
                ].join(' ')}
              >
                {label}
              </span>
            </div>
          </React.Fragment>
        )
      })}
      </div>
    </nav>
  )
}

// ─── LaminasSelector ─────────────────────────────────────────────────────────

function LaminasSelector({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const PRESETS = [1, 2, 3, 4, 5]
  const isPreset = PRESETS.includes(value)
  const [showOtro, setShowOtro] = useState(!isPreset)
  const [otroVal, setOtroVal] = useState(isPreset ? '' : String(value))

  function selectPreset(n: number) {
    setShowOtro(false)
    setOtroVal('')
    onChange(n)
  }

  function activateOtro() {
    setShowOtro(true)
    setOtroVal(String(value))
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-1.5 flex-wrap">
        {PRESETS.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => selectPreset(n)}
            className={[
              'w-9 h-9 rounded font-mono text-sm font-bold border transition-all duration-150',
              !showOtro && value === n
                ? 'bg-brand-primary/15 border-brand-primary/50 text-brand-primary-light shadow-[0_0_8px_#1F6F5420]'
                : 'bg-brand-input border-brand-border text-brand-text-secondary hover:border-brand-primary/30 hover:text-brand-text',
            ].join(' ')}
          >
            {n}
          </button>
        ))}
        <button
          type="button"
          onClick={activateOtro}
          className={[
            'px-3 h-9 rounded text-xs font-semibold border transition-all duration-150',
            showOtro
              ? 'bg-brand-primary/15 border-brand-primary/50 text-brand-primary-light'
              : 'bg-brand-input border-brand-border text-brand-text-secondary hover:border-brand-primary/30 hover:text-brand-text',
          ].join(' ')}
        >
          Otro
        </button>
      </div>
      <AnimatePresence>
        {showOtro && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <MonoInput
              type="number"
              value={otroVal}
              onChange={(v) => {
                setOtroVal(v)
                const n = Math.max(1, parseInt(v) || 1)
                onChange(n)
              }}
              placeholder="6"
              min={1}
              suffix="und"
              className="max-w-28"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── PlacaCard ────────────────────────────────────────────────────────────────

function PlacaCard({
  placa,
  idx,
  isExpanded,
  onToggle,
  onUpdate,
  onRemove,
  canRemove,
  piezaCount,
}: {
  placa: PlacaLocal
  idx: number
  isExpanded: boolean
  onToggle: () => void
  onUpdate: (field: keyof PlacaLocal, value: string | number) => void
  onRemove: () => void
  canRemove: boolean
  piezaCount: number
}) {
  const color = PLACA_COLORS[idx % PLACA_COLORS.length]
  const [confirmDelete, setConfirmDelete] = useState(false)
  const areaLamina = placa.largo * placa.ancho
  const areaTotal = areaLamina * placa.cantLaminas
  const subtotal = placa.precio_m2 * areaTotal
  const isComplete = placa.ref.trim().length > 0 && placa.precio_m2 > 0 && areaTotal > 0

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className="glass rounded-lg border border-brand-border/60 overflow-hidden"
      style={{ borderLeft: `3px solid ${color.hex}` }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-brand-surface/20 transition-colors select-none"
        onClick={onToggle}
      >
        <span className="font-mono text-xs font-bold shrink-0 w-5" style={{ color: color.hex }}>
          P{idx + 1}
        </span>

        <div className="flex-1 min-w-0">
          <p className="text-sm text-brand-text truncate">
            {placaLabel(placa, idx)}
          </p>
        </div>

        {isComplete && (
          <span className="font-mono text-[10px] text-brand-text-secondary shrink-0">
            {formatNum(areaTotal)} m²
          </span>
        )}

        <div
          className="w-2 h-2 rounded-full shrink-0"
          style={{ background: isComplete ? '#22C55E' : '#F59E0B80' }}
        />

        {canRemove && !confirmDelete && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setConfirmDelete(true) }}
            className="text-brand-text-secondary hover:text-brand-danger/70 transition-colors text-lg leading-none shrink-0 ml-1"
            aria-label="Eliminar placa"
          >
            ×
          </button>
        )}

        <svg
          width="12" height="12" viewBox="0 0 12 12" fill="none"
          className={`shrink-0 text-brand-text-secondary transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
        >
          <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>

      {/* Delete confirmation */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="px-4 pb-3 border-t border-red-500/20 bg-red-500/5 overflow-hidden"
          >
            <p className="text-xs text-brand-danger mt-3 mb-2.5">
              {piezaCount > 0
                ? `Esta placa tiene ${piezaCount} pieza${piezaCount !== 1 ? 's' : ''} asignada${piezaCount !== 1 ? 's' : ''} que se eliminarán.`
                : '¿Eliminar esta placa?'}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="flex-1 py-1.5 rounded border border-brand-border text-xs text-brand-text-secondary hover:text-brand-text transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => { setConfirmDelete(false); onRemove() }}
                className="flex-1 py-1.5 rounded border border-red-500/40 bg-red-500/10 text-xs text-brand-danger hover:bg-red-500/20 transition-colors"
              >
                Eliminar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && !confirmDelete && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-5 pt-2 border-t border-brand-border/40 space-y-4">
              {/* Category */}
              <div>
                <FieldLabel>Categoría</FieldLabel>
                <select
                  value={placa.cat}
                  onChange={(e) => onUpdate('cat', e.target.value)}
                  className="w-full bg-brand-input border border-brand-border rounded px-3 py-2 text-xs text-brand-text outline-none transition-all duration-200 focus:border-brand-primary focus:shadow-[0_0_0_1px_#1F6F5440] appearance-none cursor-pointer"
                >
                  {CATEGORIAS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Reference + Price */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <FieldLabel>Referencia / Nombre</FieldLabel>
                  <MaterialCombobox
                    categoria={placa.cat}
                    value={placa.ref}
                    precioM2Actual={placa.precio_m2}
                    onChange={(newRef, precio, dims) => {
                      onUpdate('ref', newRef)
                      if (precio > 0) onUpdate('precio_m2', precio)
                      if (dims) {
                        onUpdate('largo', dims.largo)
                        onUpdate('ancho', dims.ancho)
                      }
                    }}
                    placeholder="Buscar en el catálogo…"
                  />
                </div>
                <div>
                  <FieldLabel>Precio / m²</FieldLabel>
                  <MoneyInput
                    value={placa.precio_m2}
                    onChange={(v) => onUpdate('precio_m2', v)}
                    placeholder="280.000"
                  />
                </div>
                <div />
              </div>

              {/* Dimensions */}
              <div className="space-y-3">
                <div>
                  <FieldLabel>Cant. láminas</FieldLabel>
                  <LaminasSelector
                    value={placa.cantLaminas}
                    onChange={(v) => onUpdate('cantLaminas', v)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <FieldLabel>Largo</FieldLabel>
                    <MonoInput
                      value={placa.largo > 0 ? placa.largo : ''}
                      onChange={(v) => onUpdate('largo', parseFloat(v) || 0)}
                      placeholder="0.00"
                      suffix="m"
                      decimals={2}
                    />
                  </div>
                  <div>
                    <FieldLabel>Ancho</FieldLabel>
                    <MonoInput
                      value={placa.ancho > 0 ? placa.ancho : ''}
                      onChange={(v) => onUpdate('ancho', parseFloat(v) || 0)}
                      placeholder="0.00"
                      suffix="m"
                      decimals={2}
                    />
                  </div>
                </div>
              </div>

              {/* Mini summary */}
              {(areaTotal > 0 || placa.precio_m2 > 0) && (
                <div className="grid grid-cols-3 gap-3 pt-2 border-t border-brand-border/30">
                  <MetricCell label="Área/lámina" value={formatNum(areaLamina)} unit="m²" />
                  <MetricCell label="Área total" value={formatNum(areaTotal)} unit="m²" highlight />
                  <MetricCell label="Subtotal" value={subtotal > 0 ? formatCOP(subtotal) : '—'} unit="" />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Step 1 — Material ────────────────────────────────────────────────────────

function Step1Material({ dir }: { dir: number }) {
  const { materiales, piezas: storedPiezas, setMateriales, setPiezas, setPaso } = useWizardStore()

  const [placas, setPlacas] = useState<PlacaLocal[]>(() => {
    if (materiales.length > 0) {
      return materiales.map((m) => ({
        id: m.id ?? Math.random().toString(36).slice(2),
        cat: m.cat,
        ref: m.ref,
        precio_m2: m.precio_m2,
        largo: m.largo ?? 0,
        ancho: m.ancho ?? 0,
        cantLaminas: m.cantLaminas ?? 1,
      }))
    }
    return [makePlaca()]
  })

  const [expandedId, setExpandedId] = useState<string>(placas[0]?.id ?? '')

  function toggleExpanded(id: string) {
    setExpandedId((prev) => (prev === id ? '' : id))
  }

  function updatePlaca(id: string, field: keyof PlacaLocal, value: string | number) {
    setPlacas((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)))
  }

  function addPlaca() {
    const nueva = makePlaca()
    setPlacas((prev) => [...prev, nueva])
    setExpandedId(nueva.id)
  }

  function removePlaca(removedId: string) {
    if (placas.length <= 1) return
    setPlacas((prev) => {
      const remaining = prev.filter((p) => p.id !== removedId)
      if (expandedId === removedId && remaining.length > 0) {
        setExpandedId(remaining[0].id)
      }
      return remaining
    })
  }

  function piezaCountForPlaca(placaId: string): number {
    const placaIdx = placas.findIndex((p) => p.id === placaId)
    return (storedPiezas as Array<PiezaItem & { placa_idx?: number }>)
      .filter((p) => p.placa_idx === placaIdx).length
  }

  function handleNext() {
    const mats: MaterialItem[] = placas.map((p) => ({
      id: p.id,
      cat: p.cat,
      ref: p.ref,
      precio_m2: p.precio_m2,
      area_placa: placaAreaTotal(p),
      largo: p.largo,
      ancho: p.ancho,
      cantLaminas: p.cantLaminas,
    }))

    setMateriales(mats)

    // Filter orphan pieces (pieces whose plate was removed)
    const maxIdx = placas.length - 1
    const filtered = (storedPiezas as Array<PiezaItem & { placa_idx?: number }>).filter(
      (p) => p.placa_idx === undefined || p.placa_idx <= maxIdx
    )
    if (filtered.length !== storedPiezas.length) {
      setPiezas(filtered)
    }

    setPaso(1)
  }

  const canNext = placas.every(
    (p) => p.ref.trim().length > 0 && p.precio_m2 > 0 && placaAreaTotal(p) > 0
  )

  const totalArea = placas.reduce((s, p) => s + placaAreaTotal(p), 0)
  const totalSubtotal = placas.reduce((s, p) => s + p.precio_m2 * placaAreaTotal(p), 0)

  return (
    <StepMotion stepKey={0} dir={dir}>
      <div className="max-w-2xl mx-auto">
        <StepHeader
          step="01"
          title="Material"
          subtitle="Define los materiales y láminas del proyecto"
        />

        <div className="space-y-3 mb-4">
          <AnimatePresence initial={false}>
            {placas.map((placa, idx) => (
              <PlacaCard
                key={placa.id}
                placa={placa}
                idx={idx}
                isExpanded={expandedId === placa.id}
                onToggle={() => toggleExpanded(placa.id)}
                onUpdate={(field, value) => updatePlaca(placa.id, field, value)}
                onRemove={() => removePlaca(placa.id)}
                canRemove={placas.length > 1}
                piezaCount={piezaCountForPlaca(placa.id)}
              />
            ))}
          </AnimatePresence>
        </div>

        <button
          type="button"
          onClick={addPlaca}
          className="w-full py-3 rounded-lg border border-dashed border-brand-primary/40 bg-brand-primary/[0.04] text-sm font-semibold text-brand-primary hover:bg-brand-primary/[0.08] hover:border-brand-primary/60 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
        >
          <Plus size={16} aria-hidden="true" />
          Agregar otra placa
        </button>

        {placas.length > 1 && totalArea > 0 && (
          <div className="mt-4 glass rounded-lg px-5 py-4 border border-brand-border/60">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[9px] tracking-[0.2em] uppercase font-semibold text-brand-text-secondary">
                Resumen total
              </span>
              <span className="font-mono text-[10px] text-brand-text-secondary">
                {placas.length} placas
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <MetricCell label="Área total" value={formatNum(totalArea)} unit="m²" highlight />
              <MetricCell
                label="Inversión material"
                value={totalSubtotal > 0 ? formatCOP(totalSubtotal) : '—'}
                unit=""
              />
            </div>
          </div>
        )}

        <StepNav onNext={handleNext} nextDisabled={!canNext} />
      </div>
    </StepMotion>
  )
}

// ─── Consumption indicator ────────────────────────────────────────────────────

function ConsumoIndicador({
  placa,
  placaIdx,
  piezasFiltradas,
}: {
  placa: MaterialItem
  placaIdx: number
  piezasFiltradas: PiezaLocal[]
}) {
  const areaDisponible = placa.area_placa
  const areaConsumida = piezasFiltradas.reduce((s, p) => s + piezaM2(p), 0)
  const pct = areaDisponible > 0 ? Math.min((areaConsumida / areaDisponible) * 100, 100) : 0
  const restante = Math.max(0, areaDisponible - areaConsumida)
  const isWarning = pct >= 90
  const [showAprox, setShowAprox] = useState(false)

  const adicionales = piezasFiltradas.length > 0 && restante > 0
    ? piezasAdicionalesAprox(restante, piezasFiltradas)
    : []

  if (areaDisponible <= 0) return null

  return (
    <div className="glass rounded-lg border border-brand-border/60 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[9px] tracking-[0.15em] uppercase font-semibold text-brand-text-secondary">
          Consumo Placa {placaIdx + 1}
          {placa.ref ? ` — ${placa.ref.slice(0, 20)}` : ''}
        </span>
        <div className="flex items-center gap-2">
          {isWarning && (
            <span
              className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold tracking-wider border"
              style={{ borderColor: '#C9A22750', background: '#C9A22710', color: '#C9A227' }}
            >
              {areaConsumida > areaDisponible ? 'EXCEDIDA' : 'LÍMITE'}
            </span>
          )}
          <span
            className="font-mono text-sm font-bold"
            style={{ color: isWarning ? '#C9A227' : '#1F6F54' }}
          >
            {formatPct(pct, 1)}
          </span>
        </div>
      </div>

      <div className="h-1.5 bg-brand-border/60 rounded-full overflow-hidden mb-2">
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(pct, 100)}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          style={{
            background: isWarning
              ? 'linear-gradient(90deg, #1F6F54, #C9A227)'
              : '#1F6F54',
          }}
        />
      </div>

      <div className="flex items-center justify-between text-[10px] font-mono text-brand-text-secondary mb-2">
        <span>{formatNum(areaConsumida)} m² usados</span>
        <span>de {formatNum(areaDisponible)} m² disponibles</span>
      </div>

      {adicionales.length > 0 && (
        <div className="border-t border-brand-border/30 pt-2 mt-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-[9px] text-brand-text-secondary">Adicionales aprox.:</span>
            {adicionales.map((a) => (
              <span key={a.tipo} className="text-[10px] text-brand-text-secondary">
                {a.tipo.split(' / ')[0]}{' '}
                <span className="font-mono font-semibold" style={{ color: '#6AAEFF' }}>
                  ×{a.cantidad}
                </span>
              </span>
            ))}
            <button
              type="button"
              onClick={() => setShowAprox((v) => !v)}
              className="text-[9px] text-brand-text-secondary hover:text-brand-primary transition-colors"
            >
              {showAprox ? '▲' : '▼'} ¿Qué es esto?
            </button>
          </div>
          <AnimatePresence>
            {showAprox && (
              <motion.p
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="text-[9px] text-brand-text-secondary border-l border-brand-border/40 pl-2 overflow-hidden"
              >
                Estimación basada en área disponible sin considerar geometría de corte.
                El resultado real puede variar según la forma y orientación de las piezas.
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

// ─── Global summary ───────────────────────────────────────────────────────────

function ResumenGlobal({
  materiales: mats,
  piezas,
}: {
  materiales: MaterialItem[]
  piezas: PiezaLocal[]
}) {
  const totalPiezas = piezas.length
  const totalDisponible = mats.reduce((s, m) => s + m.area_placa, 0)
  const totalConsumido = piezas.reduce((s, p) => s + piezaM2(p), 0)

  return (
    <div className="glass rounded-xl border border-brand-border/60 overflow-hidden">
      <div
        className="px-5 py-3 border-b border-brand-border/40"
        style={{ background: 'linear-gradient(180deg, rgba(30,127,255,0.04) 0%, transparent 100%)' }}
      >
        <span className="text-[9px] tracking-[0.2em] uppercase font-semibold text-brand-text-secondary">
          Consumo por placa
        </span>
      </div>

      <div className="px-5 py-4 space-y-3">
        {mats.map((m, idx) => {
          const color = PLACA_COLORS[idx % PLACA_COLORS.length]
          const consumido = piezas
            .filter((p) => p.placaId === m.id)
            .reduce((s, p) => s + piezaM2(p), 0)
          const disponible = m.area_placa
          const pct = disponible > 0 ? Math.min((consumido / disponible) * 100, 100) : 0
          const label = m.ref
            ? m.ref.length > 18 ? m.ref.slice(0, 17) + '…' : m.ref
            : `Placa ${idx + 1}`

          return (
            <div key={m.id ?? idx} className="flex items-center gap-3">
              <span className="font-mono text-[10px] font-bold shrink-0 w-5" style={{ color: color.hex }}>
                P{idx + 1}
              </span>
              <span className="text-[10px] text-brand-text-secondary truncate flex-[2] min-w-0">
                {label}
              </span>
              <div className="flex-1 min-w-16 max-w-28 h-1 bg-brand-border/60 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  style={{
                    background: pct >= 90
                      ? 'linear-gradient(90deg, #1F6F54, #C9A227)'
                      : color.hex,
                  }}
                />
              </div>
              <span className="font-mono text-[10px] text-brand-text-secondary shrink-0 w-28 text-right">
                {formatPct(pct, 0)} · {formatNum(consumido)}/{formatNum(disponible)} m²
              </span>
            </div>
          )
        })}
      </div>

      <div className="px-5 py-3 border-t border-brand-border/40 bg-brand-surface/20">
        <div className="flex items-center justify-between">
          <span className="text-[9px] tracking-[0.15em] uppercase text-brand-text-secondary font-semibold">
            Total proyecto
          </span>
          <div className="flex items-center gap-3 font-mono text-xs">
            <span className="text-brand-text-secondary">
              {totalPiezas} pieza{totalPiezas !== 1 ? 's' : ''}
            </span>
            <span className="w-px h-3 bg-brand-border/60 inline-block" />
            <span className="text-brand-text font-semibold">{formatNum(totalConsumido)} m²</span>
            <span className="text-brand-text-secondary">de {formatNum(totalDisponible)} m²</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Step 2 — Piezas ─────────────────────────────────────────────────────────

function Step2Piezas({ dir }: { dir: number }) {
  const { piezas: stored, materiales, setPiezas, setPaso } = useWizardStore()

  const defaultPlacaId = materiales[0]?.id ?? ''

  const [piezas, setPiezasLocal] = useState<PiezaLocal[]>(() => {
    if (stored.length > 0) {
      return (stored as Array<PiezaItem & { placa_idx?: number; tipoElemento?: string }>).map((p) => {
        const tipoElemento = p.tipoElemento ?? 'Mesón de cocina'
        const anchoCustom = p.ancho_custom
          ? String(p.ancho_custom)
          : String(ANCHOS_ESTANDAR[tipoElemento] ?? 0.60)
        return {
          id: Math.random().toString(36).slice(2),
          placaId: materiales[p.placa_idx ?? 0]?.id ?? defaultPlacaId,
          nombre: p.nombre,
          tipoElemento,
          ml: String(p.ml),
          cantidad: String(p.cantidad),
          anchoCustom,
        }
      })
    }
    return [makePieza(defaultPlacaId)]
  })

  const [placaActivaId, setPlacaActivaId] = useState<string>(defaultPlacaId)

  const placaActivaIdx = materiales.findIndex((m) => m.id === placaActivaId)
  const placaActiva = materiales[placaActivaIdx >= 0 ? placaActivaIdx : 0]
  const piezasFiltradas = piezas.filter((p) => p.placaId === placaActivaId)

  function updatePieza(id: string, field: keyof PiezaLocal, value: string) {
    setPiezasLocal((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)))
  }

  function addPieza() {
    setPiezasLocal((prev) => [...prev, makePieza(placaActivaId)])
  }

  function removePieza(id: string) {
    setPiezasLocal((prev) => prev.filter((p) => p.id !== id))
  }

  const totalM2 = piezas.reduce((acc, p) => acc + piezaM2(p), 0)

  function handleNext() {
    const mapped = piezas.map((p) => {
      const ancho = parseFloat(p.anchoCustom) || 0
      const pIdx = materiales.findIndex((m) => m.id === p.placaId)
      return {
        nombre: p.nombre || p.tipoElemento,
        ml: parseFloat(p.ml) || 0,
        ancho_custom: ancho,
        cantidad: parseInt(p.cantidad) || 1,
        categoria: materiales[pIdx >= 0 ? pIdx : 0]?.cat ?? 'Mármol',
        unidad_venta: 'ml',
        placa_idx: pIdx >= 0 ? pIdx : 0,
        tipoElemento: p.tipoElemento,
      } as PiezaItem & { placa_idx: number; tipoElemento: string }
    })
    setPiezas(mapped)
    setPaso(2)
  }

  const canNext = piezas.length > 0 && piezas.every((p) => parseFloat(p.ml) > 0)

  const showTabs = materiales.length > 1

  return (
    <StepMotion stepKey={1} dir={dir}>
      <div className="max-w-3xl mx-auto">
        <StepHeader
          step="02"
          title="Piezas"
          subtitle={showTabs ? 'Dimensiona cada pieza y asígnala a su placa' : 'Dimensiona cada pieza del proyecto'}
        />

        {/* Plate tabs */}
        {showTabs && (
          <div className="mb-6">
            <FieldLabel>Placa activa</FieldLabel>
            <div className="flex gap-1 p-1 bg-brand-input border border-brand-border rounded overflow-x-auto">
              {materiales.map((m, idx) => {
                const color = PLACA_COLORS[idx % PLACA_COLORS.length]
                const isActive = m.id === placaActivaId
                const count = piezas.filter((p) => p.placaId === m.id).length
                const shortLbl = placaShortLabel(m.ref, idx)
                const fullLbl = `${m.ref || `Placa ${idx + 1}`}${m.area_placa > 0 ? ` · ${formatNum(m.area_placa)} m²` : ''}`

                return (
                  <button
                    key={m.id ?? idx}
                    type="button"
                    title={fullLbl}
                    onClick={() => setPlacaActivaId(m.id ?? '')}
                    className={[
                      'flex items-center gap-1.5 px-3 py-2 rounded text-xs font-semibold transition-all duration-200 whitespace-nowrap shrink-0',
                      isActive
                        ? 'bg-brand-surface/80 text-brand-text shadow-sm'
                        : 'text-brand-text-secondary hover:text-brand-text hover:bg-brand-surface/30',
                    ].join(' ')}
                    style={isActive ? {
                      borderBottom: `2px solid ${color.hex}`,
                      paddingBottom: '6px',
                    } : {}}
                  >
                    <span style={{ color: isActive ? color.hex : undefined }}>{shortLbl}</span>
                    {count > 0 && (
                      <span className="font-mono text-[9px] px-1.5 py-0.5 rounded-full bg-brand-border/40 text-brand-text-secondary">
                        {count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Piece list — fades when changing plate */}
        <AnimatePresence mode="wait">
          <motion.div
            key={placaActivaId}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
          >
            <AnimatePresence initial={false}>
              {piezasFiltradas.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass rounded-lg p-12 text-center border border-dashed border-brand-border"
                >
                  <div className="text-brand-text-secondary text-4xl mb-4">⊕</div>
                  <p className="text-sm text-brand-text-secondary mb-2">
                    {showTabs ? `Sin piezas para ${placaActiva?.ref || `Placa ${placaActivaIdx + 1}`}` : 'Sin piezas aún'}
                  </p>
                  <p className="text-xs text-brand-text-secondary mb-6">
                    Agrega las piezas que componen el proyecto
                  </p>
                  <button
                    type="button"
                    onClick={addPieza}
                    className="text-xs text-brand-text-secondary hover:text-brand-primary transition-colors"
                  >
                    + Agregar primera pieza
                  </button>
                </motion.div>
              ) : (
                <div className="space-y-3">
                  {piezasFiltradas.map((pieza, idx) => {
                    const tipoAncho = ANCHOS_ESTANDAR[pieza.tipoElemento]
                    const isCustom = tipoAncho === null
                    const m2 = piezaM2(pieza)
                    const colorIdx = materiales.findIndex((m) => m.id === pieza.placaId)
                    const color = PLACA_COLORS[(colorIdx >= 0 ? colorIdx : 0) % PLACA_COLORS.length]

                    return (
                      <motion.div
                        key={pieza.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20, height: 0 }}
                        transition={{ delay: idx * 0.04, duration: 0.2 }}
                        className="glass rounded-lg p-5 border border-brand-border/60 relative"
                        style={showTabs ? { borderLeft: `2px solid ${color.hex}30` } : undefined}
                      >
                        <div className="absolute top-4 left-5">
                          <span className="font-mono text-[9px] text-brand-text-secondary tracking-widest">
                            P{String(idx + 1).padStart(2, '0')}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removePieza(pieza.id)}
                          className="absolute top-3.5 right-4 text-brand-text-secondary hover:text-brand-danger/70 transition-colors text-lg leading-none"
                        >
                          ×
                        </button>

                        <div className="mt-2 grid grid-cols-12 gap-3 items-end">
                          <div className="col-span-12 sm:col-span-3">
                            <FieldLabel>Nombre</FieldLabel>
                            <TextInput
                              value={pieza.nombre}
                              onChange={(v) => updatePieza(pieza.id, 'nombre', v)}
                              placeholder="Opcional"
                            />
                          </div>
                          <div className="col-span-12 sm:col-span-4">
                            <FieldLabel>Tipo de elemento</FieldLabel>
                            <SelectInput
                              value={pieza.tipoElemento}
                              onChange={(v) => {
                                const anchoDefault = ANCHOS_ESTANDAR[v]
                                updatePieza(pieza.id, 'tipoElemento', v)
                                if (anchoDefault !== null && anchoDefault !== undefined) {
                                  updatePieza(pieza.id, 'anchoCustom', String(anchoDefault))
                                }
                              }}
                              options={TIPO_ELEMENT_KEYS.map((k) => ({ value: k, label: k }))}
                            />
                          </div>
                          <div className="col-span-4 sm:col-span-2">
                            <FieldLabel>Largo</FieldLabel>
                            <MonoInput
                              value={pieza.ml}
                              onChange={(v) => updatePieza(pieza.id, 'ml', v)}
                              placeholder="0.00"
                              suffix="m"
                              decimals={2}
                            />
                          </div>
                          <div className="col-span-4 sm:col-span-2">
                            <FieldLabel>
                              Ancho{!isCustom && tipoAncho !== null ? ` · def. ${tipoAncho}m` : ''}
                            </FieldLabel>
                            <MonoInput
                              value={pieza.anchoCustom}
                              onChange={(v) => updatePieza(pieza.id, 'anchoCustom', v)}
                              placeholder="0.00"
                              suffix="m"
                              decimals={2}
                            />
                          </div>
                          <div className="col-span-4 sm:col-span-1">
                            <FieldLabel>Cant.</FieldLabel>
                            <MonoInput
                              value={pieza.cantidad}
                              onChange={(v) => updatePieza(pieza.id, 'cantidad', v)}
                              decimals={0}
                            />
                          </div>
                        </div>

                        <div className="mt-3 flex justify-end">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] text-brand-text-secondary uppercase tracking-widest">
                              Área
                            </span>
                            <span
                              className={[
                                'font-mono text-sm font-bold transition-colors',
                                m2 > 0 ? 'text-brand-gold' : 'text-brand-text-secondary',
                              ].join(' ')}
                            >
                              {formatNum(m2)} m²
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>

        {/* Consumption indicator */}
        {placaActiva && (
          <div className="mt-4">
            <ConsumoIndicador
              placa={placaActiva}
              placaIdx={placaActivaIdx >= 0 ? placaActivaIdx : 0}
              piezasFiltradas={piezasFiltradas}
            />
          </div>
        )}

        {/* Add piece button */}
        <button
          type="button"
          onClick={addPieza}
          className="mt-4 w-full py-3 rounded-lg border border-dashed border-brand-primary/40 bg-brand-primary/[0.04] text-sm font-semibold text-brand-primary hover:bg-brand-primary/[0.08] hover:border-brand-primary/60 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
        >
          <Plus size={16} aria-hidden="true" />
          {showTabs
            ? `Agregar pieza a ${placaActiva?.ref ? placaActiva.ref.slice(0, 20) : `Placa ${(placaActivaIdx >= 0 ? placaActivaIdx : 0) + 1}`}`
            : 'Agregar pieza'}
        </button>

        {/* Global summary */}
        {showTabs && (
          <>
            <SectionDivider label="Resumen global" />
            <ResumenGlobal materiales={materiales} piezas={piezas} />
          </>
        )}

        {/* Total */}
        {piezas.length > 0 && (
          <div className="mt-6 glass rounded-lg px-5 py-4 flex items-center justify-between border border-brand-border/60">
            <span className="text-[9px] tracking-[0.2em] uppercase text-brand-text-secondary font-semibold">
              Total proyecto
            </span>
            <span className="font-mono text-xl font-bold text-brand-text">
              {formatNum(totalM2)}{' '}
              <span className="text-sm text-brand-text-secondary font-normal">m²</span>
            </span>
          </div>
        )}

        <StepNav
          onBack={() => setPaso(0)}
          onNext={handleNext}
          nextDisabled={!canNext}
        />
      </div>
    </StepMotion>
  )
}

// ─── Step 3 — Proyecto ────────────────────────────────────────────────────────

function Step3Proyecto({ dir }: { dir: number }) {
  const { proyecto, setProyecto, setPaso } = useWizardStore()

  const [nombre, setNombre] = useState(proyecto.nombre_cliente)
  const [tipoProyecto, setTipoProyecto] = useState(proyecto.tipo_proyecto)
  const [etapa, setEtapa] = useState(proyecto.etapa_label)
  const [dias, setDias] = useState(String(proyecto.dias))
  const [personas, setPersonas] = useState(String(proyecto.personas))
  const [margen, setMargen] = useState(proyecto.margen_pct)
  const [zocaloActivo, setZocaloActivo] = useState(proyecto.zocalo_activo)
  const [zocaloMl, setZocaloMl] = useState(String(proyecto.zocalo_ml))
  const [incluirIva, setIncluirIva] = useState(proyecto.incluir_iva)
  const [inclusiones, setInclusiones] = useState<string[]>(proyecto.inclusiones ?? [])
  const [exclusiones, setExclusiones] = useState<string[]>(proyecto.exclusiones ?? [])

  function handleNext() {
    setProyecto({
      nombre_cliente: nombre,
      tipo_proyecto: tipoProyecto,
      etapa_label: etapa,
      dias: parseInt(dias) || 2,
      personas: parseInt(personas) || 2,
      margen_pct: margen,
      zocalo_activo: zocaloActivo,
      zocalo_ml: parseFloat(zocaloMl) || 0,
      incluir_iva: incluirIva,
      inclusiones,
      exclusiones,
    })
    setPaso(3)
  }

  return (
    <StepMotion stepKey={2} dir={dir}>
      <div className="max-w-4xl mx-auto">
        <StepHeader
          step="03"
          title="Proyecto"
          subtitle="Parámetros del cliente y la obra"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
          <div>
            <FieldLabel>Nombre del cliente</FieldLabel>
            <TextInput
              value={nombre}
              onChange={setNombre}
              placeholder="Nombre completo o empresa"
            />
          </div>

          <div>
            <FieldLabel>Tipo de proyecto</FieldLabel>
            <div className="flex flex-wrap gap-2 mt-2">
              {TIPOS_PROYECTO.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTipoProyecto(t)}
                  className={[
                    'px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide border transition-all duration-200',
                    tipoProyecto === t
                      ? 'bg-brand-primary/15 border-brand-primary/50 text-brand-primary-light shadow-[0_0_8px_#1F6F5418]'
                      : 'bg-transparent border-brand-border text-brand-text-secondary hover:border-brand-border/80 hover:text-brand-text',
                  ].join(' ')}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <FieldLabel>Etapa de obra</FieldLabel>
            <SelectInput
              value={etapa}
              onChange={setEtapa}
              options={ETAPAS.map((e) => ({ value: e, label: e }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>Días de obra</FieldLabel>
              <MonoInput
                value={dias}
                onChange={setDias}
                suffix="días"
                decimals={0}
              />
            </div>
            <div>
              <FieldLabel>Personas en obra</FieldLabel>
              <MonoInput
                value={personas}
                onChange={setPersonas}
                suffix="pers."
                decimals={0}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <FieldLabel>Margen de utilidad</FieldLabel>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={margen}
                  onChange={(e) => {
                    const v = Math.min(80, Math.max(5, parseInt(e.target.value) || 5))
                    setMargen(v)
                  }}
                  min={5}
                  max={80}
                  className="w-14 bg-brand-input border border-brand-border rounded px-2 py-1 font-mono text-sm text-brand-primary-light text-center outline-none focus:border-brand-primary"
                />
                <span className="text-xs text-brand-text-secondary">%</span>
              </div>
            </div>
            <div className="relative h-1.5 bg-brand-border rounded-full overflow-hidden">
              <motion.div
                className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-brand-primary to-brand-primary-light"
                style={{ width: `${((margen - 5) / 75) * 100}%` }}
                transition={{ duration: 0.1 }}
              />
            </div>
            <input
              type="range"
              min={5}
              max={80}
              value={margen}
              onChange={(e) => setMargen(parseInt(e.target.value))}
              className="w-full mt-1 h-1.5 appearance-none bg-transparent cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand-primary [&::-webkit-slider-thumb]:shadow-[0_0_8px_#1F6F5460]"
            />
            <div className="flex justify-between text-[9px] text-brand-text-secondary font-mono mt-1">
              <span>5%</span>
              <span>80%</span>
            </div>
          </div>
        </div>

        <SectionDivider label="Opciones adicionales" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
          <div>
            <Toggle
              checked={zocaloActivo}
              onChange={setZocaloActivo}
              label="Incluir zócalo"
              sublabel="Agrega costo de instalación de zócalo perimetral"
            />
            {zocaloActivo && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 pl-4 border-l border-brand-primary/20"
              >
                <FieldLabel>Metros lineales de zócalo</FieldLabel>
                <MonoInput
                  type="number"
                  value={zocaloMl}
                  onChange={setZocaloMl}
                  min={0}
                  step={0.1}
                  suffix="ml"
                  className="max-w-36"
                />
              </motion.div>
            )}
          </div>

          <Toggle
            checked={incluirIva}
            onChange={setIncluirIva}
            label="Incluir IVA 19%"
            sublabel="Responsable de IVA — 19% sobre el valor del servicio (Art. 468 E.T.)"
          />
        </div>

        <SectionDivider label="Alcance del proyecto" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AlcancePanel
            label="Incluye"
            isInclusion
            items={inclusiones}
            setItems={setInclusiones}
            sugerencias={SUGERENCIAS_INCLUSION}
          />
          <AlcancePanel
            label="Excluye"
            isInclusion={false}
            items={exclusiones}
            setItems={setExclusiones}
            sugerencias={SUGERENCIAS_EXCLUSION}
          />
        </div>

        <StepNav
          onBack={() => setPaso(1)}
          onNext={handleNext}
        />
      </div>
    </StepMotion>
  )
}


// ─── CCModalResultado ─────────────────────────────────────────────────────────

function CCModalResultado({ cotId, onClose }: { cotId: number; onClose: () => void }) {
  const [nombre, setNombre] = useState('')
  const [nit, setNit] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function handleDownload() {
    setLoading(true); setErr(null)
    try { await descargarCuentaCobro(cotId, nombre, nit); onClose() }
    catch { setErr('No se pudo generar. Intenta de nuevo.') }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.15 }}
        className="relative glass rounded-xl border border-brand-border shadow-2xl p-5 w-80 z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-brand-text-secondary mb-4">Cuenta de Cobro</p>
        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-[10px] text-brand-text-secondary mb-1.5">Nombre del pagador *</label>
            <input autoFocus value={nombre} onChange={(e) => setNombre(e.target.value)}
              placeholder="Constructora XYZ S.A.S"
              className="w-full bg-brand-input border border-brand-border rounded px-3 py-2.5 text-sm text-brand-text placeholder-brand-muted/40 outline-none focus:border-brand-primary/50 transition-all" />
          </div>
          <div>
            <label className="block text-[10px] text-brand-text-secondary mb-1.5">NIT / Cédula</label>
            <input value={nit} onChange={(e) => setNit(e.target.value)}
              placeholder="900.123.456-7"
              className="w-full bg-brand-input border border-brand-border rounded px-3 py-2.5 text-sm text-brand-text placeholder-brand-muted/40 outline-none focus:border-brand-primary/50 transition-all" />
          </div>
        </div>
        {err && <p className="text-xs text-brand-danger mb-3">{err}</p>}
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded border border-brand-border text-sm text-brand-text-secondary hover:text-brand-text transition-colors">Cancelar</button>
          <button onClick={handleDownload} disabled={loading || !nombre.trim()}
            className="flex-1 py-2.5 rounded bg-brand-gold/15 border border-brand-gold/40 text-sm font-semibold text-brand-gold hover:bg-brand-gold/25 transition-all disabled:opacity-40 flex items-center justify-center gap-1.5">
            {loading ? <Loader2 size={13} className="animate-spin" /> : null}
            {loading ? 'Generando…' : 'Descargar PDF'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ─── Step 5 — Resultado ───────────────────────────────────────────────────────

function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (target === 0) return
    const start = Date.now()
    const startVal = 0
    const tick = () => {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)
      setValue(Math.round(startVal + (target - startVal) * eased))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
    return () => setValue(target)
  }, [target, duration])

  return value
}

const COST_LABELS: Record<string, string> = {
  c1_material: 'Material',
  c2_mano_obra: 'Mano de obra',
  c3_zocalos: 'Zócalos',
  c4_insumos: 'Insumos y consumibles',
  c7_adicionales: 'Adicionales',
}

const COST_KEYS = Object.keys(COST_LABELS) as (keyof typeof COST_LABELS)[]

function Step4Resultado({ dir }: { dir: number }) {
  const { materiales, piezas, proyecto, resultado, setResultado, reset, setPaso } =
    useWizardStore()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(() => resultado !== null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<{ id: number; numero: string } | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [dlPDF, setDlPDF] = useState(false)
  const [showCCModal, setShowCCModal] = useState(false)

  const mat = materiales[0]
  const precioBaseAnimado = useCountUp(
    revealed && resultado ? resultado.precio_sugerido : 0,
    1400
  )
  const mainValueAnimado = useCountUp(
    revealed && resultado ? (proyecto.incluir_iva ? resultado.precio_sugerido * 1.19 : resultado.precio_sugerido) : 0,
    1400
  )

  async function handleCalc() {
    if (!mat) return
    setLoading(true)
    setError(null)
    try {
      const body = {
        categoria: mat.cat,
        referencia: mat.ref,
        precio_m2: mat.precio_m2,
        // Sum all plate areas for correct retal/aprovechamiento calculation
        area_placa_comprada: materiales.reduce((s, m) => s + m.area_placa, 0),
        materiales_lista: materiales,
        piezas,
        tipo_proyecto: proyecto.tipo_proyecto,
        etapa_label: proyecto.etapa_label,
        nombre_cliente: proyecto.nombre_cliente,
        margen_pct: proyecto.margen_pct,
        dias: proyecto.dias,
        personas: proyecto.personas,
        zocalo_activo: proyecto.zocalo_activo,
        zocalo_ml: proyecto.zocalo_ml,
        incluir_iva: proyecto.incluir_iva,
      }
      const res = await calcularCotizacionDirecta(body)
      setResultado(res)
      setTimeout(() => setRevealed(true), 100)
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        'Error al calcular. Intenta de nuevo.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!resultado) return
    setSaving(true)
    setSaveError(null)
    try {
      const resultadoConInputs = {
        ...resultado,
        _wizard_inputs: { materiales, piezas, proyecto },
      }
      const res = await guardarCotizacion(
        proyecto.nombre_cliente,
        resultadoConInputs as typeof resultado,
        undefined,
        proyecto.inclusiones ?? [],
        proyecto.exclusiones ?? []
      )
      setSaved(res)
    } catch {
      setSaveError('No se pudo guardar. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  const totalAreaComprada = materiales.reduce((s, m) => s + m.area_placa, 0)
  const iva = resultado
    ? proyecto.incluir_iva
      ? resultado.precio_sugerido * 0.19
      : 0
    : 0
  const totalConIva = resultado ? resultado.precio_sugerido + iva : 0

  return (
    <StepMotion stepKey={4} dir={dir}>
      <div className="max-w-2xl mx-auto">
        <StepHeader
          step="04"
          title="Resultado"
          subtitle="Cotización final del proyecto"
        />

        {!resultado ? (
          <div className="text-center">
            <div className="glass rounded-lg p-6 mb-8 text-left border border-brand-border/60">
              <p className="text-[9px] tracking-[0.2em] uppercase text-brand-text-secondary mb-4 font-semibold">
                Resumen del proyecto
              </p>
              <div className="grid grid-cols-2 gap-y-3 gap-x-8">
                <SummaryRow label="Cliente" value={proyecto.nombre_cliente || '—'} />
                <SummaryRow label="Tipo" value={proyecto.tipo_proyecto} />
                <SummaryRow
                  label="Material"
                  value={materiales.length > 1
                    ? `${materiales.length} placas`
                    : `${mat?.cat ?? '—'} · ${mat?.ref ?? '—'}`}
                />
                <SummaryRow label="Precio/m²" value={mat ? formatCOP(mat.precio_m2) : '—'} mono />
                <SummaryRow label="Área comprada" value={`${formatNum(totalAreaComprada)} m²`} mono />
                <SummaryRow label="Piezas" value={`${piezas.length} pieza${piezas.length !== 1 ? 's' : ''}`} />
                <SummaryRow label="Margen" value={`${proyecto.margen_pct}%`} mono />
                <SummaryRow label="Días / Personas" value={`${proyecto.dias}d · ${proyecto.personas}p`} mono />
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 rounded border border-red-500/30 bg-red-500/5 text-brand-danger text-sm"
              >
                {error}
              </motion.div>
            )}

            <button
              type="button"
              onClick={handleCalc}
              disabled={loading}
              className={[
                'relative w-full py-5 rounded-lg font-bold text-lg tracking-wide transition-all duration-300',
                'bg-brand-primary text-white',
                'shadow-[0_0_40px_#1F6F5430,0_0_0_1px_#1F6F5440]',
                'hover:shadow-[0_0_60px_#1F6F5450,0_0_0_1px_#1F6F5470]',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              ].join(' ')}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-3">
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                    className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                  />
                  Calculando…
                </span>
              ) : (
                'Calcular cotización'
              )}
            </button>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="relative glass rounded-xl p-8 mb-6 border border-brand-primary/20 text-center overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-brand-primary/5 to-transparent pointer-events-none" />
              <div className="absolute top-3 left-3 w-6 h-6 border-t border-l border-brand-primary/30" />
              <div className="absolute top-3 right-3 w-6 h-6 border-t border-r border-brand-primary/30" />
              <div className="absolute bottom-3 left-3 w-6 h-6 border-b border-l border-brand-primary/30" />
              <div className="absolute bottom-3 right-3 w-6 h-6 border-b border-r border-brand-primary/30" />

              <p className="text-[9px] tracking-[0.25em] uppercase text-brand-text-secondary mb-3 font-semibold">
                {proyecto.incluir_iva ? 'Total con IVA' : 'Precio sugerido al cliente'}
              </p>

              <div className="font-mono text-3xl sm:text-5xl font-bold text-brand-text mb-1 tabular-nums break-words">
                {formatCOP(mainValueAnimado)}
              </div>

              {proyecto.incluir_iva && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1 }}
                  className="mt-3 space-y-1"
                >
                  <div className="flex justify-center gap-3 text-xs text-brand-text-secondary">
                    <span>Subtotal:</span>
                    <span className="font-mono">{formatCOP(precioBaseAnimado)}</span>
                  </div>
                  <div className="flex justify-center gap-3 text-xs text-brand-text-secondary">
                    <span>+ IVA 19%:</span>
                    <span className="font-mono">{formatCOP(iva)}</span>
                  </div>
                </motion.div>
              )}

              <div className="mt-4 flex justify-center gap-6">
                <div className="text-center">
                  <div className="font-mono text-sm text-brand-gold font-bold">
                    {formatNum(resultado.margen_pct, 1)}%
                  </div>
                  <div className="text-[9px] uppercase tracking-widest text-brand-text-secondary mt-0.5">
                    Margen
                  </div>
                </div>
                <div className="w-px bg-brand-border" />
                <div className="text-center">
                  <div className="font-mono text-sm text-brand-gold font-bold">
                    {formatCOP(resultado.utilidad)}
                  </div>
                  <div className="text-[9px] uppercase tracking-widest text-brand-text-secondary mt-0.5">
                    Utilidad
                  </div>
                </div>
                <div className="w-px bg-brand-border" />
                <div className="text-center">
                  <div className="font-mono text-sm text-brand-gold font-bold">
                    {formatNum(resultado.aprovechamiento, 1)}%
                  </div>
                  <div className="text-[9px] uppercase tracking-widest text-brand-text-secondary mt-0.5">
                    Aprovech.
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.25 }}
              className="glass rounded-lg border border-brand-border/60 overflow-hidden mb-4"
            >
              <div className="px-5 py-3 border-b border-brand-border/50">
                <span className="text-[9px] tracking-[0.2em] uppercase text-brand-text-secondary font-semibold">
                  Desglose de costos
                </span>
              </div>
              <div className="divide-y divide-brand-border/30">
                {COST_KEYS.map((key, idx) => {
                  const val = resultado[key as keyof typeof resultado] as number
                  if (!val || val === 0) return null
                  return (
                    <motion.div
                      key={key}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + idx * 0.05 }}
                      className="flex items-center justify-between px-5 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[9px] text-brand-text-secondary w-4">
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        <span className="text-sm text-brand-text-secondary">{COST_LABELS[key]}</span>
                      </div>
                      <span className="font-mono text-sm text-brand-text">
                        {formatCOP(val)}
                      </span>
                    </motion.div>
                  )
                })}
                <div className="flex items-center justify-between px-5 py-3 bg-brand-surface/20">
                  <span className="text-sm text-brand-text-secondary">Subtotal (sin IVA)</span>
                  <span className="font-mono text-sm text-brand-text">
                    {formatCOP(resultado.costo_total)}
                  </span>
                </div>
                {proyecto.incluir_iva && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 }}
                    className="flex items-center justify-between px-5 py-3 bg-brand-warning/5"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[9px] text-brand-warning-text/50 w-4">IVA</span>
                      <span className="text-sm text-brand-warning-text/80">IVA 19% (Art. 468 E.T.)</span>
                    </div>
                    <span className="font-mono text-sm text-brand-warning-text">
                      {formatCOP(iva)}
                    </span>
                  </motion.div>
                )}
                <div className="flex items-center justify-between px-5 py-3 bg-brand-surface/30">
                  <span className="text-sm font-semibold text-brand-text">
                    {proyecto.incluir_iva ? 'Total con IVA' : 'Costo total'}
                  </span>
                  <span className="font-mono text-sm font-bold text-brand-text">
                    {formatCOP(proyecto.incluir_iva ? totalConIva : resultado.costo_total)}
                  </span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="grid grid-cols-3 gap-3 mb-8"
            >
              <MetricCard label="m² real" value={`${formatNum(resultado.m2_real)} m²`} />
              <MetricCard label="Retal" value={formatCOP(resultado.retal)} />
              <MetricCard label="Categoría" value={resultado.categoria} />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mb-4"
            >
              {saved ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-5 py-3.5 rounded-lg border border-brand-primary/40/30 bg-brand-primary/5">
                    <div className="flex items-center gap-3">
                      <span className="text-brand-primary text-lg">✓</span>
                      <div>
                        <p className="text-sm font-semibold text-brand-primary">Cotización guardada</p>
                        <p className="text-[10px] text-brand-text-secondary font-mono">{saved.numero}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate('/historial')}
                      className="text-xs text-brand-text-secondary hover:text-brand-primary transition-colors"
                    >
                      Ver historial →
                    </button>
                  </div>
                  {/* Botones de descarga */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={dlPDF}
                      onClick={async () => {
                        setDlPDF(true)
                        try { await descargarPDF(saved.id) } finally { setDlPDF(false) }
                      }}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border border-brand-border text-sm text-brand-text-secondary hover:text-brand-primary hover:border-brand-primary/40/40 transition-all disabled:opacity-40"
                    >
                      {dlPDF ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} />}
                      Descargar PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCCModal(true)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border border-brand-gold/30 bg-brand-gold/5 text-sm text-brand-gold hover:bg-brand-gold/10 hover:border-brand-gold/50 transition-all"
                    >
                      <Receipt size={13} />
                      Cuenta de Cobro
                    </button>
                  </div>
                  {showCCModal && (
                    <CCModalResultado cotId={saved.id} onClose={() => setShowCCModal(false)} />
                  )}
                </div>
              ) : (
                <>
                  {saveError && (
                    <p className="text-xs text-brand-danger mb-2 text-center">{saveError}</p>
                  )}
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full py-3.5 rounded-lg border border-brand-primary/40 bg-brand-primary/10 text-sm font-semibold text-brand-text hover:bg-brand-primary/20 hover:border-brand-primary/70 transition-all disabled:opacity-50"
                  >
                    {saving ? 'Guardando…' : 'Guardar cotización'}
                  </button>
                </>
              )}
            </motion.div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setPaso(3)
                  setResultado(null)
                }}
                className="flex-1 py-3 rounded border border-brand-border text-sm text-brand-text-secondary hover:text-brand-text hover:border-brand-border/80 transition-colors"
              >
                Ajustar parámetros
              </button>
              <button
                type="button"
                onClick={() => { reset() }}
                className="flex-1 py-3 rounded bg-brand-surface border border-brand-border text-sm text-brand-text hover:border-brand-primary/40 transition-colors font-semibold"
              >
                Nueva cotización
              </button>
            </div>
          </motion.div>
        )}

        {!resultado && (
          <StepNav
            onBack={() => setPaso(3)}
            onNext={handleCalc}
            nextLabel="Calcular"
            nextDisabled={loading}
            isLast
          />
        )}
      </div>
    </StepMotion>
  )
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function StepHeader({
  step,
  title,
  subtitle,
}: {
  step: string
  title: string
  subtitle: string
}) {
  return (
    <div className="mb-8">
      <div className="flex items-baseline gap-3 mb-1">
        <span className="font-mono text-[11px] text-brand-text-secondary tracking-[0.2em]">
          {step}
        </span>
        <h2 className="text-2xl font-bold text-brand-text tracking-tight">{title}</h2>
      </div>
      <p className="text-sm text-brand-text-secondary ml-9">{subtitle}</p>
      <div className="mt-4 h-px bg-gradient-to-r from-brand-primary/40 via-brand-border to-transparent" />
    </div>
  )
}

function MetricCell({
  label,
  value,
  unit,
  highlight,
}: {
  label: string
  value: string
  unit?: string
  highlight?: boolean
}) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-[0.15em] text-brand-text-secondary mb-1.5 font-semibold">
        {label}
      </p>
      <p
        className={[
          'font-mono text-base font-bold',
          highlight ? 'text-brand-gold' : 'text-brand-text',
        ].join(' ')}
      >
        {value}
        {unit && (
          <span className="text-xs text-brand-text-secondary font-normal ml-1">{unit}</span>
        )}
      </p>
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-lg p-4 border border-brand-border/50 text-center">
      <p className="text-[9px] uppercase tracking-[0.15em] text-brand-text-secondary mb-2 font-semibold">
        {label}
      </p>
      <p className="font-mono text-sm font-bold text-brand-text">{value}</p>
    </div>
  )
}

function SummaryRow({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-[0.12em] text-brand-text-secondary mb-0.5 font-semibold">
        {label}
      </p>
      <p className={['text-sm text-brand-text', mono ? 'font-mono' : ''].join(' ')}>
        {value}
      </p>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CotizacionPage() {
  const { paso, materiales, setMateriales, setPiezas, setProyecto, setResultado, setPaso } = useWizardStore()
  const location = useLocation()
  const [dir, setDir] = useState(1)

  // Hydration desde Historial → Editar
  useEffect(() => {
    const state = location.state as { _wizard_inputs?: { materiales: MaterialItem[]; piezas: PiezaItem[]; proyecto: Record<string, unknown> } } | null
    if (state?._wizard_inputs) {
      const { materiales: m, piezas: p, proyecto: pr } = state._wizard_inputs
      if (m) setMateriales(m)
      if (p) setPiezas(p)
      if (pr) setProyecto(pr as Parameters<typeof setProyecto>[0])
      setResultado(null)  // limpia resultado anterior para que el paso 5 arranque limpio
      setPaso(0)
      // Limpia el state para no re-hidratar en navegaciones internas
      window.history.replaceState({}, '')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const prevPaso = React.useRef(paso)
  useEffect(() => {
    setDir(paso > prevPaso.current ? 1 : -1)
    prevPaso.current = paso
  }, [paso])

  // Key for Step2 — forces remount when plate composition changes
  const step2Key = materiales.map((m) => m.id ?? m.ref).join('|')

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto py-6 px-2">
        <PageHeader
          kicker="Crear"
          title="Nueva cotización"
          subtitle="Calcula el precio de venta óptimo para tu proyecto"
        />

        <StepIndicator paso={paso} />

        <AnimatePresence mode="wait" custom={dir}>
          {paso === 0 && <Step1Material dir={dir} />}
          {paso === 1 && <Step2Piezas dir={dir} key={step2Key} />}
          {paso === 2 && <Step3Proyecto dir={dir} />}
          {paso === 3 && <Step4Resultado dir={dir} />}
        </AnimatePresence>
      </div>
    </AppLayout>
  )
}
