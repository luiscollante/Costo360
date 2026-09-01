import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, ChevronDown, ChevronUp, Save, ArrowRight, RotateCcw, FileDown, Receipt, Loader2 } from 'lucide-react'
import AppLayout from '@/components/AppLayout'
import { calcularCotizacionDirecta, guardarCotizacion, descargarPDF, descargarCuentaCobro } from '@/api/cotizacion'
import type { CotizacionResult } from '@/types/cotizacion'
import { formatCOP, formatNum, formatPct } from '@/lib/utils'
import { useCountUp } from '@/hooks/useCountUp'
import MaterialCombobox from '@/components/MaterialCombobox'
import { PageHeader } from '@/components/ui/PageHeader'

// ─── Persistencia Express en localStorage ────────────────────────────────────

const EXPRESS_KEY = 'costo360-express-v1'

interface ExpressForm {
  cat: string
  ref: string
  precioM2: string
  largo: string
  ancho: string
  tipoIdx: number
  metros: string
  anchoCustom: string
  cliente: string
  margen: number
  iva: boolean
}

const DEFAULT_FORM: ExpressForm = {
  cat: 'Mármol',
  ref: '',
  precioM2: '',
  largo: '',
  ancho: '',
  tipoIdx: 0,
  metros: '',
  anchoCustom: '',
  cliente: '',
  margen: 40,
  iva: true,
}

function loadForm(): ExpressForm {
  try {
    const raw = localStorage.getItem(EXPRESS_KEY)
    if (raw) return { ...DEFAULT_FORM, ...JSON.parse(raw) }
  } catch { /* ignore */ }
  return { ...DEFAULT_FORM }
}

function saveForm(f: Partial<ExpressForm>) {
  try {
    const prev = loadForm()
    localStorage.setItem(EXPRESS_KEY, JSON.stringify({ ...prev, ...f }))
  } catch { /* ignore */ }
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const CATEGORIAS = ['Mármol', 'Granito', 'Sinterizado', 'Quarztone', 'Quarzita'] as const

interface TipoProyecto {
  label: string
  modo: 'ml' | 'm2'
  ancho: number | null
}

const TIPOS: TipoProyecto[] = [
  { label: 'Mesón cocina',    modo: 'ml', ancho: 0.60 },
  { label: 'Isla cocina',     modo: 'ml', ancho: 1.00 },
  { label: 'Baño / Lavamanos',modo: 'ml', ancho: 0.45 },
  { label: 'Encimera',        modo: 'ml', ancho: 0.60 },
  { label: 'Escalera',        modo: 'ml', ancho: 0.30 },
  { label: 'Piso',            modo: 'm2', ancho: null  },
  { label: 'Fachada',         modo: 'm2', ancho: null  },
  { label: 'Revestimiento',   modo: 'm2', ancho: null  },
  { label: 'Otro',            modo: 'm2', ancho: null  },
]

// ─── Primitives ───────────────────────────────────────────────────────────────

const inputCls = [
  'w-full bg-brand-input border border-brand-border rounded-lg px-3 py-2.5',
  'text-sm text-brand-text placeholder:text-brand-text-secondary',
  'focus:outline-none focus:border-brand-primary',
  'focus:shadow-[0_0_0_1px_#1F6F5440,0_0_12px_#1F6F5418]',
  'transition-all duration-200',
].join(' ')

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-0.5 h-4 bg-brand-primary rounded-full shrink-0" />
      <h3 className="text-[10px] font-semibold tracking-[0.18em] uppercase text-brand-text-secondary">
        {children}
      </h3>
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[10px] font-semibold tracking-[0.15em] uppercase text-brand-text-secondary mb-1.5">
      {children}
    </label>
  )
}

// ─── MoneyInput Express ───────────────────────────────────────────────────────

function MoneyInput({
  value,
  onChange,
  placeholder = '0',
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const numVal = parseFloat(value) || 0
  const displayVal = focused
    ? value
    : numVal > 0
    ? new Intl.NumberFormat('es-CO').format(numVal)
    : ''

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-brand-text-secondary font-mono pointer-events-none">$</span>
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={displayVal}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, '')
          onChange(digits)
        }}
        className={inputCls + ' pl-7 pr-12 font-mono'}
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-brand-text-secondary pointer-events-none">COP</span>
    </div>
  )
}

// ─── Margin traffic light ─────────────────────────────────────────────────────

function MarginLight({ pct }: { pct: number }) {
  const color = pct >= 30 ? '#15612E' : pct >= 20 ? '#6E5410' : '#B23B3B'
  const label = pct >= 30 ? 'Margen saludable' : pct >= 20 ? 'Margen ajustado' : 'Margen bajo'
  return (
    <div className="flex items-center gap-2 mt-3">
      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
      <span className="text-xs font-semibold" style={{ color }}>{label}</span>
      <span className="text-xs text-brand-text-secondary ml-auto font-mono">{formatPct(pct, 1)}</span>
    </div>
  )
}

// ─── CCModalExpress ───────────────────────────────────────────────────────────

function CCModalExpress({ cotId, onClose }: { cotId: number; onClose: () => void }) {
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
              className="w-full bg-brand-input border border-brand-border rounded px-3 py-2.5 text-sm text-brand-text placeholder:text-brand-text-secondary outline-none focus:border-brand-primary/50 transition-all" />
          </div>
          <div>
            <label className="block text-[10px] text-brand-text-secondary mb-1.5">NIT / Cédula</label>
            <input value={nit} onChange={(e) => setNit(e.target.value)}
              placeholder="900.123.456-7"
              className="w-full bg-brand-input border border-brand-border rounded px-3 py-2.5 text-sm text-brand-text placeholder:text-brand-text-secondary outline-none focus:border-brand-primary/50 transition-all" />
          </div>
        </div>
        {err && <p className="text-xs text-brand-danger mb-3">{err}</p>}
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded border border-brand-border text-sm text-brand-text-secondary hover:text-brand-text transition-colors">Cancelar</button>
          <button onClick={handleDownload} disabled={loading || !nombre.trim()}
            className="flex-1 py-2.5 rounded border border-brand-primary/40 bg-brand-primary/[0.06] text-sm font-semibold text-brand-primary hover:bg-brand-primary/[0.12] transition-all disabled:opacity-40 flex items-center justify-center gap-1.5">
            {loading ? <Loader2 size={13} className="animate-spin" /> : null}
            {loading ? 'Generando…' : 'Descargar PDF'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ─── Result Panel ─────────────────────────────────────────────────────────────

function ResultPanel({
  result,
  savedId,
  onSave,
  onRefine,
  saving,
  saved,
  incluirIva,
}: {
  result: CotizacionResult
  savedId: number | null
  onSave: () => void
  onRefine: () => void
  saving: boolean
  saved: boolean
  incluirIva: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const [dlPDF, setDlPDF] = useState(false)
  const [showCC, setShowCC] = useState(false)
  const iva = incluirIva ? result.precio_sugerido * 0.19 : 0
  const totalConIva = result.precio_sugerido + iva

  const precio = useCountUp(Math.round(incluirIva ? totalConIva : result.precio_sugerido))
  const precioBaseAnimado = useCountUp(Math.round(result.precio_sugerido))
  const utilidad = useCountUp(Math.round(result.utilidad))


  const breakdown = [
    { label: 'Material',     value: result.c1_material   },
    { label: 'Mano de obra', value: result.c2_mano_obra  },
    { label: 'Insumos',      value: result.c4_insumos    },
    { label: 'Zócalos',      value: result.c3_zocalos    },
    { label: 'Adicionales',  value: result.c7_adicionales },
  ].filter((b) => b.value > 0)

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="flex flex-col gap-4"
    >
      {/* Price hero */}
      <div className="glass rounded-xl border border-brand-primary/30 p-6 text-center">
        <p className="text-[9px] tracking-[0.22em] uppercase text-brand-text-secondary mb-2">
          {incluirIva ? 'Total con IVA' : 'Precio sugerido al cliente'}
        </p>
        <p className="text-3xl sm:text-4xl font-bold text-brand-text font-mono tracking-tight leading-none break-words tabular-nums">
          {formatCOP(precio)}
        </p>
        {incluirIva && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-2 space-y-0.5"
          >
            <p className="text-xs text-brand-text-secondary">Subtotal: <span className="font-mono">{formatCOP(precioBaseAnimado)}</span></p>
            <p className="text-xs text-brand-text-secondary">+ IVA 19%: <span className="font-mono">{formatCOP(iva)}</span></p>
          </motion.div>
        )}
        <MarginLight pct={result.margen_pct} />
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Costo total',      value: formatCOP(Math.round(result.costo_total)), color: 'text-brand-text' },
          { label: 'Utilidad neta',    value: formatCOP(utilidad),                       color: 'text-brand-gold' },
          { label: 'Aprovechamiento',  value: formatPct(result.aprovechamiento, 1),   color: 'text-brand-text' },
        ].map(({ label, value, color }) => (
          <div key={label} className="glass rounded-xl border border-brand-border p-3 text-center">
            <p className="text-[8px] tracking-widest uppercase text-brand-text-secondary mb-1.5">{label}</p>
            <p className={`text-xs font-bold font-mono ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Retal */}
      {result.retal > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-brand-surface/40 border border-brand-border/50">
          <div className="w-1.5 h-1.5 rounded-full bg-brand-warning shrink-0" />
          <p className="text-xs text-brand-text-secondary">
            Retal estimado: <span className="font-mono font-semibold text-brand-warning-text">{formatNum(result.retal)} m²</span>
            <span className="text-brand-text-secondary"> sobrante de la lámina</span>
          </p>
        </div>
      )}

      {/* Cost breakdown */}
      <div className="glass rounded-xl border border-brand-border overflow-hidden">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-brand-surface/30 transition-colors cursor-pointer"
        >
          <span className="text-[10px] tracking-[0.15em] uppercase text-brand-text-secondary font-semibold">
            Desglose de costos
          </span>
          {expanded ? <ChevronUp size={13} className="text-brand-text-secondary" /> : <ChevronDown size={13} className="text-brand-text-secondary" />}
        </button>
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 space-y-1.5 border-t border-brand-border/40 pt-3">
                {breakdown.map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between py-1">
                    <span className="text-xs text-brand-text-secondary">{label}</span>
                    <span className="text-xs font-mono font-semibold text-brand-text">{formatCOP(Math.round(value))}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between py-1 pt-2 border-t border-brand-border/30">
                  <span className="text-xs text-brand-text-secondary">Subtotal (sin IVA)</span>
                  <span className="text-xs font-mono font-bold text-brand-text">{formatCOP(Math.round(result.costo_total))}</span>
                </div>
                {incluirIva && (
                  <div className="flex items-center justify-between py-1 bg-brand-warning/5 px-2 rounded">
                    <span className="text-xs text-brand-warning-text/80">IVA 19% (Art. 468 E.T.)</span>
                    <span className="text-xs font-mono font-bold text-brand-warning-text">{formatCOP(Math.round(iva))}</span>
                  </div>
                )}
                <div className="flex items-center justify-between py-1 pt-1 border-t border-brand-border/30">
                  <span className="text-xs font-semibold text-brand-text">{incluirIva ? 'Total con IVA' : 'Total costos'}</span>
                  <span className="text-xs font-mono font-bold text-brand-text">{formatCOP(Math.round(incluirIva ? totalConIva : result.costo_total))}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <p className="text-[10px] text-brand-text-secondary text-center leading-relaxed px-2">
        Cotización express: instalación en condiciones estándar.
      </p>

      {/* Actions */}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={onSave}
          disabled={saving || saved}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-primary text-white text-sm font-semibold shadow-[0_0_24px_#1F6F5428,0_0_0_1px_#1F6F5440] hover:shadow-[0_0_40px_#1F6F5445,0_0_0_1px_#1F6F5470] disabled:shadow-none disabled:opacity-60 transition-all duration-200 cursor-pointer"
        >
          <Save size={14} />
          {saved ? 'Guardada en historial' : saving ? 'Guardando…' : 'Guardar cotización'}
        </button>

        {/* Botones descarga — solo después de guardar */}
        {saved && savedId && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="flex gap-2"
          >
            <button
              type="button"
              disabled={dlPDF}
              onClick={async () => {
                setDlPDF(true)
                try { await descargarPDF(savedId) } finally { setDlPDF(false) }
              }}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-brand-primary/40 bg-brand-primary/[0.07] text-sm font-semibold text-brand-primary hover:bg-brand-primary/[0.14] hover:border-brand-primary/60 transition-all disabled:opacity-40 cursor-pointer"
            >
              {dlPDF ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} />}
              Descargar PDF
            </button>
            <button
              type="button"
              onClick={() => setShowCC(true)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-brand-primary/40 bg-brand-primary/[0.07] text-sm font-semibold text-brand-primary hover:bg-brand-primary/[0.14] hover:border-brand-primary/60 transition-all cursor-pointer"
            >
              <Receipt size={13} />
              Cuenta de Cobro
            </button>
          </motion.div>
        )}

        {showCC && savedId && (
          <CCModalExpress cotId={savedId} onClose={() => setShowCC(false)} />
        )}

        <button
          type="button"
          onClick={onRefine}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-brand-border text-sm text-brand-text-secondary hover:text-brand-text hover:border-brand-primary/40 transition-all duration-200 cursor-pointer"
        >
          <ArrowRight size={14} />
          Refinar en Modo Completo
        </button>
      </div>
    </motion.div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CotizacionExpressPage() {
  const navigate = useNavigate()

  // Cargar estado persistido
  const init = loadForm()

  // Form state
  const [cat, setCat]             = useState(init.cat)
  const [ref, setRef]             = useState(init.ref)
  const [precioM2, setPrecioM2]   = useState(init.precioM2)
  const [largo, setLargo]         = useState(init.largo)
  const [ancho, setAncho]         = useState(init.ancho)
  const [tipoIdx, setTipoIdx]     = useState(init.tipoIdx)
  const [metros, setMetros]       = useState(init.metros)
  const [anchoCustom, setAnchoCustom] = useState(init.anchoCustom)
  const [cliente, setCliente]     = useState(init.cliente)
  const [margen, setMargen]       = useState(init.margen)
  const [iva, setIva]             = useState(init.iva)

  // Async state
  const [loading, setLoading]     = useState(false)
  const [result, setResult]       = useState<CotizacionResult | null>(null)
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(false)
  const [savedId, setSavedId]     = useState<number | null>(null)

  const tipo       = TIPOS[tipoIdx]
  const esMl       = tipo.modo === 'ml'
  const anchoFinal = parseFloat(anchoCustom) || 0
  const areaPlaca  = (parseFloat(largo) || 0) * (parseFloat(ancho) || 0)
  const m2Pieza    = esMl
    ? (parseFloat(metros) || 0) * anchoFinal
    : (parseFloat(metros) || 0)

  // Sincroniza anchoCustom cuando cambia el tipo de proyecto
  useEffect(() => {
    const stdAncho = tipo.ancho
    setAnchoCustom(stdAncho !== null ? String(stdAncho) : '')
    setMetros('')
  }, [tipoIdx])

  // Persistir cambios del formulario
  useEffect(() => {
    saveForm({ cat, ref, precioM2, largo, ancho, tipoIdx, metros, anchoCustom, cliente, margen, iva })
  }, [cat, ref, precioM2, largo, ancho, tipoIdx, metros, anchoCustom, cliente, margen, iva])

  const canCalc =
    !!cat &&
    (parseFloat(precioM2) || 0) > 0 &&
    areaPlaca > 0 &&
    (parseFloat(metros) || 0) > 0 &&
    (!esMl || anchoFinal > 0)

  const missingFields: string[] = []
  if ((parseFloat(precioM2) || 0) <= 0) missingFields.push('Precio / m²')
  if (areaPlaca <= 0) missingFields.push('Dimensiones de la lámina (largo y ancho)')
  if ((parseFloat(metros) || 0) <= 0) missingFields.push(esMl ? 'Metros lineales' : 'Metros cuadrados')
  if (esMl && anchoFinal <= 0) missingFields.push('Ancho')

  async function handleCalc() {
    if (!canCalc) return
    setLoading(true)
    setResult(null)
    setSaved(false)
    setSavedId(null)
    try {
      const res = await calcularCotizacionDirecta({
        categoria:            cat,
        referencia:           ref || tipo.label,
        precio_m2:            parseFloat(precioM2) || 0,
        area_placa_comprada:  areaPlaca,
        materiales_lista:     [],
        piezas: [{
          nombre:       tipo.label,
          ml:           esMl ? parseFloat(metros) || 0 : m2Pieza,
          ancho_custom: esMl ? anchoFinal : 1.0,
          cantidad:     1,
          categoria:    cat,
          unidad_venta: esMl ? 'ml' : 'm2',
        }],
        tipo_proyecto:        tipo.label,
        etapa_label:          'Casa terminada (limpia)',
        nombre_cliente:       cliente || 'Sin nombre',
        margen_pct:           margen,
        dias:                 1,
        personas:             2,
        zocalo_activo:        false,
        zocalo_ml:            0,
        incluir_iva:          iva,
      })
      setResult(res)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!result) return
    setSaving(true)
    try {
      const res = await guardarCotizacion(cliente || 'Sin nombre', result)
      setSaved(true)
      setSavedId(res.id)
    } finally {
      setSaving(false)
    }
  }

  function handleReset() {
    setResult(null)
    setSaved(false)
    setSavedId(null)
    setRef('')
    setPrecioM2('')
    setLargo('')
    setAncho('')
    setMetros('')
    setAnchoCustom(tipo.ancho !== null ? String(tipo.ancho) : '')
    setCliente('')
    setMargen(40)
    setIva(true)
    localStorage.removeItem(EXPRESS_KEY)
  }

  return (
    <AppLayout>
      <div className="max-w-[1200px] mx-auto">

        <PageHeader
          kicker="Crear"
          title="Cotización Express"
          subtitle="Una pantalla. Cálculo real. Precio en segundos."
        />

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

          {/* ── LEFT: Form ───────────────────────────────────────────────── */}
          <div className="flex flex-col gap-5">

            {/* Material */}
            <div className="glass rounded-xl border border-brand-border/60 p-5">
              <SectionTitle>Material</SectionTitle>
              <div className="space-y-3">
                <div>
                  <Label>Categoría</Label>
                  <select
                    value={cat}
                    onChange={(e) => { setCat(e.target.value); setRef('') }}
                    className={inputCls}
                  >
                    {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <Label>Referencia (opcional)</Label>
                  <MaterialCombobox
                    categoria={cat}
                    value={ref}
                    precioM2Actual={parseFloat(precioM2) || 0}
                    onChange={(newRef, precio, dims) => {
                      setRef(newRef)
                      if (precio > 0) setPrecioM2(String(precio))
                      if (dims) { setLargo(String(dims.largo)); setAncho(String(dims.ancho)) }
                    }}
                    placeholder="Buscar en el catálogo…"
                  />
                </div>

                <div>
                  <Label>Precio / m²</Label>
                  <MoneyInput
                    value={precioM2}
                    onChange={setPrecioM2}
                    placeholder="280.000"
                  />
                </div>

                <div>
                  <Label>Lámina (largo × ancho)</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { v: largo, set: setLargo, ph: '3.20' },
                      { v: ancho, set: setAncho, ph: '1.60' },
                    ].map(({ v, set, ph }) => (
                      <div key={ph} className="relative">
                        <input
                          type="number"
                          value={v}
                          onChange={(e) => set(e.target.value)}
                          placeholder={ph}
                          step={0.01}
                          min={0}
                          className={inputCls + ' pr-7 font-mono'}
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-brand-text-secondary pointer-events-none">m</span>
                      </div>
                    ))}
                  </div>
                  {areaPlaca > 0 && (
                    <p className="text-[10px] text-brand-text-secondary mt-1.5 font-mono pl-0.5">
                      Área lámina: <span className="text-brand-gold font-semibold">{formatNum(areaPlaca)} m²</span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Project type + dimensions */}
            <div className="glass rounded-xl border border-brand-border/60 p-5">
              <SectionTitle>Proyecto</SectionTitle>
              <div className="space-y-4">

                <div>
                  <Label>Tipo de proyecto</Label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {TIPOS.map((t, i) => (
                      <button
                        key={t.label}
                        type="button"
                        onClick={() => setTipoIdx(i)}
                        className={[
                          'px-2 py-2 rounded-lg text-[11px] font-medium text-center transition-all duration-150 border',
                          tipoIdx === i
                            ? 'bg-brand-primary/15 border-brand-primary/50 text-brand-text'
                            : 'border-brand-border text-brand-text-secondary hover:border-brand-primary/30 hover:text-brand-text',
                        ].join(' ')}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={esMl ? 'grid grid-cols-2 gap-3' : ''}>
                  <div>
                    <Label>{esMl ? 'Metros lineales' : 'Metros cuadrados'}</Label>
                    <div className="relative">
                      <input
                        type="number"
                        value={metros}
                        onChange={(e) => setMetros(e.target.value)}
                        placeholder={esMl ? '3.50' : '12.00'}
                        step={0.01}
                        min={0}
                        className={inputCls + ' pr-10 font-mono'}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-brand-text-secondary pointer-events-none">
                        {esMl ? 'ml' : 'm²'}
                      </span>
                    </div>
                  </div>

                  {esMl && (
                    <div>
                      <Label>
                        Ancho{tipo.ancho !== null ? ` · def. ${tipo.ancho} m` : ''}
                      </Label>
                      <div className="relative">
                        <input
                          type="number"
                          value={anchoCustom}
                          onChange={(e) => setAnchoCustom(e.target.value)}
                          placeholder="0.60"
                          step={0.01}
                          min={0}
                          className={inputCls + ' pr-7 font-mono'}
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-brand-text-secondary pointer-events-none">m</span>
                      </div>
                    </div>
                  )}
                </div>

                {m2Pieza > 0 && (
                  <p className="text-[10px] text-brand-text-secondary font-mono">
                    Área proyecto: <span className="text-brand-gold font-semibold">{formatNum(m2Pieza)} m²</span>
                  </p>
                )}
              </div>
            </div>

            {/* Config */}
            <div className="glass rounded-xl border border-brand-border/60 p-5">
              <SectionTitle>Configuración</SectionTitle>
              <div className="space-y-4">

                <div>
                  <Label>Cliente (opcional)</Label>
                  <input
                    type="text"
                    value={cliente}
                    onChange={(e) => setCliente(e.target.value)}
                    placeholder="Nombre del cliente"
                    className={inputCls}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Margen de utilidad</Label>
                    <span className="font-mono text-sm font-bold text-brand-gold">{margen}%</span>
                  </div>
                  <input
                    type="range"
                    min={5} max={70} step={1}
                    value={margen}
                    onChange={(e) => setMargen(Number(e.target.value))}
                    className="w-full h-1.5 rounded-full cursor-pointer accent-[#1F6F54]"
                  />
                  <div className="flex justify-between text-[9px] text-brand-text-secondary mt-1 font-mono">
                    <span>5%</span><span>70%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-brand-text font-medium">Incluir IVA 19%</p>
                    <p className="text-[10px] text-brand-text-secondary mt-0.5">Responsable de IVA — Art. 468 E.T.</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={iva}
                    onClick={() => setIva((v) => !v)}
                    className={`relative w-10 h-[22px] rounded-full transition-colors duration-200 cursor-pointer ${iva ? 'bg-brand-primary' : 'bg-brand-border'}`}
                  >
                    <span className={`absolute top-[3px] w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${iva ? 'left-[22px]' : 'left-[3px]'}`} />
                  </button>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCalc}
                disabled={!canCalc || loading}
                className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl bg-brand-primary text-white font-bold text-sm shadow-[0_0_30px_#1F6F5428,0_0_0_1px_#1F6F5440] hover:shadow-[0_0_50px_#1F6F5445,0_0_0_1px_#1F6F5470] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none transition-all duration-300 cursor-pointer"
              >
                {loading ? (
                  <>
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                      className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                    />
                    Calculando…
                  </>
                ) : (
                  <>
                    <Zap size={16} />
                    Calcular precio
                  </>
                )}
              </button>
              {result && (
                <button
                  type="button"
                  onClick={handleReset}
                  aria-label="Limpiar formulario"
                  className="p-4 rounded-xl border border-brand-border text-brand-text-secondary hover:text-brand-text hover:border-brand-primary/30 transition-all duration-200 cursor-pointer"
                >
                  <RotateCcw size={15} />
                </button>
              )}
            </div>
            {!canCalc && !loading && missingFields.length > 0 && (
              <p className="text-[11px] text-brand-warning-text/80 px-0.5">
                Falta completar: {missingFields.join(', ')}
              </p>
            )}
          </div>

          {/* ── RIGHT: Results ────────────────────────────────────────────── */}
          <div>
            <AnimatePresence mode="wait">
              {result ? (
                <ResultPanel
                  key="result"
                  result={result}
                  savedId={savedId}
                  onSave={handleSave}
                  onRefine={() => navigate('/cotizacion')}
                  saving={saving}
                  saved={saved}
                  incluirIva={iva}
                />
              ) : (
                <motion.div
                  key="placeholder"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="glass rounded-xl border border-brand-border/60 flex flex-col items-center justify-center min-h-[520px] gap-4 text-center p-8"
                >
                  <div className="w-16 h-16 rounded-2xl bg-brand-surface/80 border border-brand-border flex items-center justify-center">
                    <Zap size={26} className="text-brand-text-secondary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-brand-text-secondary">El precio aparecerá aquí</p>
                    <p className="text-xs text-brand-text-secondary mt-1.5 max-w-[200px] leading-relaxed">
                      Completa el formulario y presiona Calcular precio
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
