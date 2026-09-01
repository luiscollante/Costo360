import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Loader2, Trash2, PlusCircle } from 'lucide-react'
import AppLayout from '@/components/AppLayout'
import { calcularAIU, guardarAIU, descargarPDFAiu, descargarCuentaCobro } from '@/api/cotizacion'
import type { ItemAIU, ResultadoAIU } from '@/types/cotizacion'
import { PageHeader } from '@/components/ui/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { formatCOP, formatPct } from '@/lib/utils'

// ─── Constants ────────────────────────────────────────────────────────────────

const STEP_LABELS = ['Ítems', 'AIU', 'Resultado']

const DEFAULT_ITEMS: ItemAIU[] = [
  { id: '1', desc: 'Suministro material pétreo (suministro)', und: 'm²', cant: 10, punit: 250000 },
  { id: '2', desc: 'Mano de obra corte y elaboración', und: 'm²', cant: 10, punit: 100000 },
  { id: '3', desc: 'Instalación y nivelación', und: 'm²', cant: 10, punit: 50000 },
  { id: '4', desc: 'Insumos (disco, adhesivo, silicona)', und: 'glb', cant: 1, punit: 150000 },
]

const PCT_A_PRESETS = [1, 1.5, 2, 2.5, 3]
const PCT_I_PRESETS = [1, 1.5, 2, 2.5, 3]
const PCT_U_PRESETS = [3, 5, 7, 8, 10]

const slideVariants = {
  enter: (dir: number) => ({ x: dir * 60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir * -60, opacity: 0 }),
}

// ─── Primitives ───────────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[10px] font-semibold tracking-[0.18em] uppercase text-brand-text-secondary mb-1.5">
      {children}
    </label>
  )
}

function TextInput({ value, onChange, placeholder, className = '' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; className?: string
}) {
  return (
    <input
      type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className={[
        'w-full bg-brand-input border border-brand-border rounded px-3 py-2.5',
        'text-sm text-brand-text placeholder:text-brand-text-secondary',
        'outline-none transition-all duration-200 focus:border-brand-primary focus:shadow-[0_0_0_1px_#1F6F5440]',
        className,
      ].join(' ')}
    />
  )
}

function Toggle({ checked, onChange, label, sublabel }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; sublabel?: string
}) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex items-center justify-between w-full py-3 group">
      <div className="text-left">
        <p className="text-sm text-brand-text font-medium">{label}</p>
        {sublabel && <p className="text-xs text-brand-text-secondary mt-0.5">{sublabel}</p>}
      </div>
      <div className={['relative w-10 h-5 rounded-full transition-all duration-200 shrink-0 ml-4', checked ? 'bg-brand-primary' : 'bg-brand-border'].join(' ')}>
        <div className={['absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all duration-200 shadow-sm', checked ? 'left-5' : 'left-0.5'].join(' ')} />
      </div>
    </button>
  )
}

function PctPills({ label, value, onChange, presets }: {
  label: string; value: number; onChange: (v: number) => void; presets: number[]
}) {
  const [showCustom, setShowCustom] = useState(!presets.includes(value))
  const [customStr, setCustomStr] = useState(String(value))

  function selectPreset(p: number) { onChange(p); setShowCustom(false) }

  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex flex-wrap gap-1.5 items-center mb-1.5">
        {presets.map(p => (
          <button
            key={p} type="button"
            onClick={() => selectPreset(p)}
            className={[
              'px-3 py-1.5 rounded text-xs font-semibold border transition-all duration-200',
              !showCustom && value === p
                ? 'bg-brand-primary text-white border-brand-primary shadow-[0_0_8px_#1F6F5430]'
                : 'border-brand-border text-brand-text-secondary hover:border-brand-primary/40 hover:text-brand-text',
            ].join(' ')}
          >
            {p}%
          </button>
        ))}
        <button
          type="button"
          onClick={() => { setShowCustom(v => !v); if (!showCustom) { setCustomStr(String(value)) } }}
          className={[
            'px-3 py-1.5 rounded text-xs font-semibold border transition-all duration-200',
            showCustom
              ? 'bg-brand-gold/20 text-brand-gold-text border-brand-gold/50'
              : 'border-brand-border text-brand-text-secondary hover:border-brand-gold/40 hover:text-brand-text',
          ].join(' ')}
        >
          Otro
        </button>
      </div>
      <AnimatePresence>
        {showCustom && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }}>
            <div className="relative max-w-32">
              <input
                type="number" value={customStr} step={0.1} min={0} max={100}
                onChange={e => { setCustomStr(e.target.value); onChange(parseFloat(e.target.value) || 0) }}
                placeholder="e.g. 4.5"
                className="w-full bg-brand-input border border-brand-gold/40 rounded px-3 py-1.5 font-mono text-sm text-brand-text outline-none focus:border-brand-gold pr-8 transition-all"
                autoFocus
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-brand-text-secondary">%</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Step Indicator ───────────────────────────────────────────────────────────

function StepIndicator({ paso }: { paso: number }) {
  return (
    <nav aria-label="Progreso de la oferta AIU" className="flex items-center justify-center mb-10">
      {STEP_LABELS.map((label, i) => {
        const done = i < paso; const active = i === paso
        return (
          <React.Fragment key={i}>
            {i > 0 && (
              <div className="flex-1 h-px max-w-16 relative mx-1">
                <div className="absolute inset-0 bg-brand-border" />
                <motion.div className="absolute inset-y-0 left-0 bg-brand-primary" initial={{ width: '0%' }} animate={{ width: done ? '100%' : '0%' }} transition={{ duration: 0.4 }} />
              </div>
            )}
            <div className="flex flex-col items-center gap-1.5" aria-current={active ? 'step' : undefined}>
              <motion.div className={['w-7 h-7 rounded-full border flex items-center justify-center transition-all duration-300', active ? 'border-brand-primary bg-brand-primary/10' : done ? 'border-brand-primary bg-brand-primary' : 'border-brand-border bg-brand-bg'].join(' ')}>
                {done ? (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                ) : (
                  <span className={['font-mono text-[10px] font-bold', active ? 'text-brand-primary' : 'text-brand-text-secondary'].join(' ')}>{String(i + 1).padStart(2, '0')}</span>
                )}
              </motion.div>
              <span className={['text-[10px] tracking-[0.12em] uppercase font-semibold whitespace-nowrap', active ? 'text-brand-warning-text' : 'text-brand-text-secondary'].join(' ')}>{label}</span>
            </div>
          </React.Fragment>
        )
      })}
    </nav>
  )
}

function StepNav({ onBack, onNext, nextLabel = 'Siguiente', nextDisabled = false, isLast = false, loading = false }: {
  onBack?: () => void; onNext: () => void; nextLabel?: string; nextDisabled?: boolean; isLast?: boolean; loading?: boolean
}) {
  return (
    <div className="flex items-center justify-between mt-10 pt-6 border-t border-brand-border">
      {onBack ? (
        <button type="button" onClick={onBack} className="flex items-center gap-2 text-sm text-brand-text-secondary hover:text-brand-text transition-colors">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Anterior
        </button>
      ) : <div />}
      <button
        type="button" onClick={onNext} disabled={nextDisabled || loading}
        className={['flex items-center gap-2 px-6 py-2.5 rounded text-sm font-semibold transition-all duration-200',
          isLast ? 'bg-brand-primary text-white hover:bg-brand-primary/90 shadow-[0_0_20px_#1F6F5430]'
            : 'bg-brand-primary/10 border border-brand-primary/30 text-brand-text hover:bg-brand-primary/20 hover:border-brand-primary/60',
          (nextDisabled || loading) ? 'opacity-40 cursor-not-allowed' : '',
        ].join(' ')}
      >
        {loading && <Loader2 size={14} className="animate-spin" />}
        {nextLabel}
        {!isLast && !loading && (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 2L10 7L5 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        )}
      </button>
    </div>
  )
}

function StepHeader({ step, title, subtitle }: { step: string; title: string; subtitle: string }) {
  return (
    <div className="mb-8">
      <div className="flex items-baseline gap-3 mb-1">
        <span className="font-mono text-[11px] text-brand-text-secondary tracking-[0.2em]">{step}</span>
        <h2 className="text-2xl font-bold text-brand-text tracking-tight">{title}</h2>
      </div>
      <p className="text-sm text-brand-text-secondary ml-9">{subtitle}</p>
      <div className="mt-4 h-px bg-gradient-to-r from-brand-gold/40 via-brand-border to-transparent" />
    </div>
  )
}

// ─── Step 0 — Ítems del Contrato ──────────────────────────────────────────────

function Step0Items({
  dir, nombreCliente, setNombreCliente, ciudad, setCiudad, telefono, setTelefono,
  items, setItems, onNext,
}: {
  dir: number
  nombreCliente: string; setNombreCliente: (v: string) => void
  ciudad: string; setCiudad: (v: string) => void
  telefono: string; setTelefono: (v: string) => void
  items: ItemAIU[]; setItems: (items: ItemAIU[]) => void
  onNext: () => void
}) {
  const cd = items.reduce((s, it) => s + it.cant * it.punit, 0)

  function addItem() {
    setItems([...items, { id: Math.random().toString(36).slice(2), desc: '', und: 'm²', cant: 1, punit: 0 }])
  }

  function updateItem(id: string, field: keyof ItemAIU, value: string | number) {
    setItems(items.map(it => it.id === id ? { ...it, [field]: value } : it))
  }

  function removeItem(id: string) {
    if (items.length > 1) setItems(items.filter(it => it.id !== id))
  }

  const canNext = nombreCliente.trim().length > 0 && items.every(it => it.desc.trim()) && cd > 0

  return (
    <motion.div key={0} custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit"
      transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }} className="w-full">
      <div className="max-w-3xl mx-auto">
        <StepHeader step="01" title="Ítems del Contrato" subtitle="Define el cliente y los ítems del Costo Directo" />

        {/* Client info */}
        <div className="glass rounded-lg border border-brand-border/60 p-5 mb-6">
          <p className="text-[9px] tracking-[0.2em] uppercase text-brand-text-secondary font-semibold mb-4">Datos del Contratante</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <FieldLabel>Nombre / Empresa *</FieldLabel>
              <TextInput value={nombreCliente} onChange={setNombreCliente} placeholder="Constructora XYZ S.A.S." />
            </div>
            <div>
              <FieldLabel>Ciudad</FieldLabel>
              <TextInput value={ciudad} onChange={setCiudad} placeholder="Ciudad" />
            </div>
            <div>
              <FieldLabel>Teléfono</FieldLabel>
              <TextInput value={telefono} onChange={setTelefono} placeholder="+57 300 000 0000" />
            </div>
          </div>
        </div>

        {/* Items del Costo Directo — una tarjeta clara por ítem, igual en celular y escritorio */}
        <div className="glass rounded-lg border border-brand-border/60 p-5 mb-4">
          <span className="text-[9px] tracking-[0.2em] uppercase text-brand-text-secondary font-semibold">Ítems del Costo Directo</span>
          <p className="text-xs text-brand-text-secondary mt-1 mb-4">Agrega cada material o actividad por separado. El subtotal se calcula solo.</p>

          <div className="space-y-3">
            {items.map((item, idx) => (
              <div key={item.id} className="rounded-lg border border-brand-border/50 bg-brand-surface/20 p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold text-brand-text-secondary uppercase tracking-widest">Ítem {idx + 1}</span>
                  <button
                    type="button" onClick={() => removeItem(item.id)} disabled={items.length <= 1}
                    aria-label="Eliminar este ítem"
                    className="w-7 h-7 flex items-center justify-center rounded text-brand-text-secondary hover:text-brand-danger hover:bg-brand-danger/10 transition-colors disabled:opacity-0 disabled:pointer-events-none"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="mb-3">
                  <FieldLabel>Descripción</FieldLabel>
                  <TextInput value={item.desc} onChange={v => updateItem(item.id, 'desc', v)} placeholder="Ej: Suministro de mármol Carrara" />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <FieldLabel>Unidad</FieldLabel>
                    <TextInput value={item.und} onChange={v => updateItem(item.id, 'und', v)} placeholder="m², ml, día…" />
                  </div>
                  <div>
                    <FieldLabel>Cantidad</FieldLabel>
                    <input
                      type="number" value={item.cant} min={0} step={0.1}
                      onChange={e => updateItem(item.id, 'cant', parseFloat(e.target.value) || 0)}
                      className="w-full bg-brand-input border border-brand-border rounded px-3 py-2.5 text-sm text-brand-text text-right tabular-nums outline-none transition-all duration-200 focus:border-brand-primary focus:shadow-[0_0_0_1px_#1F6F5440]"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <FieldLabel>Precio unitario</FieldLabel>
                    <input
                      type="number" value={item.punit || ''} min={0} step={1000} placeholder="0"
                      onChange={e => updateItem(item.id, 'punit', parseFloat(e.target.value) || 0)}
                      className="w-full bg-brand-input border border-brand-border rounded px-3 py-2.5 text-sm text-brand-text text-right tabular-nums outline-none transition-all duration-200 focus:border-brand-primary focus:shadow-[0_0_0_1px_#1F6F5440]"
                    />
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-brand-border/40 flex items-center justify-between">
                  <span className="text-xs text-brand-text-secondary">Subtotal de este ítem</span>
                  <span className="font-mono text-sm font-bold text-brand-gold-text">{formatCOP(item.cant * item.punit)}</span>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button" onClick={addItem}
            className="w-full mt-3 py-3 rounded-lg border border-dashed border-brand-primary/40 bg-brand-primary/[0.04] text-sm font-semibold text-brand-primary hover:bg-brand-primary/[0.08] hover:border-brand-primary/60 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
          >
            <PlusCircle size={16} aria-hidden="true" />
            Agregar otro ítem
          </button>

          {/* CD Total */}
          <div className="mt-4 p-4 rounded-lg bg-brand-primary/[0.06] border border-brand-primary/20 flex items-center justify-between">
            <div>
              <p className="text-[9px] tracking-[0.2em] uppercase text-brand-text-secondary font-semibold">Costo Directo (CD)</p>
              <p className="text-[10px] text-brand-text-secondary mt-0.5">Base de cálculo AIU — Decreto 1372/92</p>
            </div>
            <span className="font-mono text-xl font-bold text-brand-gold-text">{formatCOP(cd)}</span>
          </div>
        </div>

        <StepNav onNext={onNext} nextDisabled={!canNext} />
      </div>
    </motion.div>
  )
}

// ─── Step 1 — AIU + Logística ─────────────────────────────────────────────────

function Step1AIU({
  dir, pctA, setPctA, pctI, setPctI, pctU, setPctU,
  incluirIva, setIncluirIva,
  cd, onBack, onNext, loading,
}: {
  dir: number
  pctA: number; setPctA: (v: number) => void
  pctI: number; setPctI: (v: number) => void
  pctU: number; setPctU: (v: number) => void
  incluirIva: boolean; setIncluirIva: (v: boolean) => void
  cd: number; onBack: () => void; onNext: () => void; loading: boolean
}) {
  const valA = cd * (pctA / 100)
  const valI = cd * (pctI / 100)
  const valU = cd * (pctU / 100)
  const valIva = incluirIva ? valU * 0.19 : 0
  const subtotalAIU = valA + valI + valU + valIva
  const estimado = cd + subtotalAIU

  function PreviewRow({ label, value, muted = false, accent = false }: { label: string; value: number; muted?: boolean; accent?: boolean }) {
    return (
      <div className={['flex items-center justify-between py-2', muted ? 'opacity-60' : ''].join(' ')}>
        <span className="text-xs text-brand-text-secondary">{label}</span>
        <span className={['font-mono text-sm font-semibold', accent ? 'text-brand-gold-text' : 'text-brand-text'].join(' ')}>
          {formatCOP(value)}
        </span>
      </div>
    )
  }

  return (
    <motion.div key={1} custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit"
      transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }} className="w-full">
      <div className="max-w-3xl mx-auto">
        <StepHeader step="02" title="AIU" subtitle="Define los porcentajes de Administración, Imprevistos y Utilidad" />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
          {/* Left: inputs */}
          <div className="space-y-6">
            <div className="glass rounded-lg border border-brand-border/60 p-5 space-y-5">
              <PctPills label="Administración (A%)" value={pctA} onChange={setPctA} presets={PCT_A_PRESETS} />
              <PctPills label="Imprevistos (I%)" value={pctI} onChange={setPctI} presets={PCT_I_PRESETS} />
              <PctPills label="Utilidad (U%)" value={pctU} onChange={setPctU} presets={PCT_U_PRESETS} />

              <div className="pt-2 border-t border-brand-border/40">
                <Toggle
                  checked={incluirIva}
                  onChange={setIncluirIva}
                  label="IVA 19% sobre Utilidad"
                  sublabel="Decreto 1372/92 — IVA aplica solo sobre el componente U"
                />
              </div>
            </div>
          </div>

          {/* Right: live preview */}
          <div className="glass rounded-xl border border-brand-border/60 p-5 h-fit sticky top-6">
            <p className="text-[9px] tracking-[0.2em] uppercase text-brand-text-secondary font-semibold mb-4">Preview AIU</p>
            <div className="divide-y divide-brand-border/30">
              <PreviewRow label={`CD (Base)`} value={cd} />
              <PreviewRow label={`+ A (${formatPct(pctA, 1)})`} value={valA} />
              <PreviewRow label={`+ I (${formatPct(pctI, 1)})`} value={valI} />
              <PreviewRow label={`+ U (${formatPct(pctU, 1)})`} value={valU} />
              {incluirIva && <PreviewRow label="+ IVA 19% sobre U" value={valIva} />}
            </div>
            <div className="mt-3 pt-3 border-t-2 border-brand-primary/30">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-brand-text">Estimado</span>
                <span className="font-mono text-base font-bold text-brand-gold-text">{formatCOP(estimado)}</span>
              </div>
            </div>
          </div>
        </div>

        <StepNav onBack={onBack} onNext={onNext} nextLabel="Calcular" isLast loading={loading} />
      </div>
    </motion.div>
  )
}

// ─── Cuenta de Cobro Modal ────────────────────────────────────────────────────

function CCModalAIU({ cotId, onClose }: { cotId: number; onClose: () => void }) {
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
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.15 }}
        className="relative glass rounded-xl border border-brand-border shadow-2xl p-6 w-80 z-10"
        onClick={e => e.stopPropagation()}
      >
        <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-brand-text-secondary mb-4">Cuenta de Cobro</p>
        <div className="space-y-3 mb-4">
          <div>
            <FieldLabel>Nombre del pagador *</FieldLabel>
            <TextInput value={nombre} onChange={setNombre} placeholder="Constructora XYZ S.A.S." />
          </div>
          <div>
            <FieldLabel>NIT / Cédula</FieldLabel>
            <TextInput value={nit} onChange={setNit} placeholder="900.123.456-7" />
          </div>
        </div>
        {err && <p className="text-xs text-brand-danger mb-3">{err}</p>}
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded border border-brand-border text-sm text-brand-text-secondary hover:text-brand-text transition-colors">Cancelar</button>
          <button onClick={handleDownload} disabled={loading || !nombre.trim()}
            className="flex-1 py-2.5 rounded border border-brand-primary/40 bg-brand-primary/[0.06] text-sm font-semibold text-brand-primary hover:bg-brand-primary/[0.12] transition-all disabled:opacity-40 flex items-center justify-center gap-2">
            {loading && <Loader2 size={14} className="animate-spin" />}
            {loading ? 'Generando…' : 'Descargar PDF'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ─── Step 2 — Resultado ───────────────────────────────────────────────────────

function Step2Resultado({
  dir, resultado, saved, saving, onBack, onSave,
}: {
  dir: number
  resultado: ResultadoAIU
  saved: { id: number; numero: string } | null
  saving: boolean
  onBack: () => void
  onSave: () => void
}) {
  const navigate = useNavigate()
  const [pdfLoading, setPdfLoading] = useState(false)
  const [showCC, setShowCC] = useState(false)

  async function handlePDF() {
    if (!saved) return
    setPdfLoading(true)
    try { await descargarPDFAiu(saved.id) }
    finally { setPdfLoading(false) }
  }

  const rows: { label: string; value: number; sub?: boolean; bold?: boolean; accent?: string }[] = [
    { label: 'Costo Directo (CD)', value: resultado.cd, bold: true },
    { label: `+ Administración (A ${formatPct(resultado.pct_a, 1)})`, value: resultado.val_a, sub: true },
    { label: `+ Imprevistos (I ${formatPct(resultado.pct_i, 1)})`, value: resultado.val_i, sub: true },
    { label: `+ Utilidad (U ${formatPct(resultado.pct_u, 1)})`, value: resultado.val_u, sub: true },
    ...(resultado.val_iva > 0 ? [{ label: '+ IVA 19% sobre U (Decreto 1372/92)', value: resultado.val_iva, sub: true }] : []),
  ]

  return (
    <>
      <motion.div key={2} custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit"
        transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }} className="w-full">
        <div className="max-w-2xl mx-auto">
          <StepHeader step="03" title="Resultado AIU" subtitle="Propuesta comercial calculada según Decreto 1372/92" />

          {/* Hero price card */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
            className="relative glass rounded-xl p-8 mb-6 border border-brand-gold/20 text-center overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-brand-gold/4 to-transparent pointer-events-none" />
            <div className="absolute top-3 left-3 w-6 h-6 border-t border-l border-brand-gold/30" />
            <div className="absolute top-3 right-3 w-6 h-6 border-t border-r border-brand-gold/30" />
            <div className="absolute bottom-3 left-3 w-6 h-6 border-b border-l border-brand-gold/30" />
            <div className="absolute bottom-3 right-3 w-6 h-6 border-b border-r border-brand-gold/30" />

            <p className="text-[9px] tracking-[0.25em] uppercase text-brand-text-secondary mb-3 font-semibold">Precio Total del Contrato AIU</p>
            <div className="font-mono text-3xl sm:text-5xl font-bold text-brand-text mb-4 tabular-nums break-words">{formatCOP(resultado.precio_total)}</div>

            <div className="flex justify-center gap-6">
              <div className="text-center">
                <div className="font-mono text-sm text-brand-gold-text font-bold">{formatPct(resultado.pct_u, 1)}</div>
                <div className="text-[9px] uppercase tracking-widest text-brand-text-secondary mt-0.5">Utilidad</div>
              </div>
              <div className="w-px bg-brand-border" />
              <div className="text-center">
                <div className="font-mono text-sm text-brand-gold-text font-bold">{formatPct(resultado.margen_pct, 1)}</div>
                <div className="text-[9px] uppercase tracking-widest text-brand-text-secondary mt-0.5">Margen efectivo</div>
              </div>
            </div>
          </motion.div>

          {/* Breakdown */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}
            className="glass rounded-lg border border-brand-border/60 overflow-hidden mb-4">
            <div className="px-5 py-3 border-b border-brand-border/50">
              <span className="text-[9px] tracking-[0.2em] uppercase text-brand-text-secondary font-semibold">Desglose AIU</span>
            </div>
            <div className="divide-y divide-brand-border/30">
              {rows.map((row, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.05 }}
                  className={['flex items-center justify-between px-5 py-3', row.sub ? 'pl-9' : ''].join(' ')}>
                  <span className={['text-sm', row.bold ? 'font-semibold text-brand-text' : 'text-brand-text-secondary'].join(' ')}>{row.label}</span>
                  <span className={['font-mono text-sm', row.bold ? 'font-bold text-brand-text' : 'text-brand-text'].join(' ')}>{formatCOP(row.value)}</span>
                </motion.div>
              ))}
              <div className="flex items-center justify-between px-5 py-3.5 bg-brand-input-deep/60">
                <span className="text-sm font-bold text-white">PRECIO TOTAL DEL CONTRATO</span>
                <span className="font-mono text-base font-bold text-brand-gold-text">{formatCOP(resultado.precio_total)}</span>
              </div>
            </div>
          </motion.div>

          {/* Save + PDF buttons */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="space-y-3 mb-4">
            {saved ? (
              <div className="flex items-center justify-between px-5 py-3.5 rounded-lg border border-brand-primary/30 bg-brand-primary/5">
                <div className="flex items-center gap-3">
                  <span className="text-brand-primary text-lg">✓</span>
                  <div>
                    <p className="text-sm font-semibold text-brand-primary">Cotización AIU guardada</p>
                    <p className="text-[10px] text-brand-text-secondary font-mono">{saved.numero}</p>
                  </div>
                </div>
                <button onClick={() => navigate('/historial')} className="text-xs text-brand-text-secondary hover:text-brand-primary transition-colors">
                  Ver historial →
                </button>
              </div>
            ) : (
              <button onClick={onSave} disabled={saving}
                className="w-full py-3.5 rounded-lg border border-brand-primary/40 bg-brand-primary/10 text-sm font-semibold text-brand-text hover:bg-brand-primary/20 hover:border-brand-primary/70 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {saving && <Loader2 size={14} className="animate-spin" />}
                {saving ? 'Guardando…' : 'Guardar cotización AIU'}
              </button>
            )}

            {saved && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button onClick={handlePDF} disabled={pdfLoading}
                  className="py-3 rounded-lg border border-brand-primary/40 bg-brand-primary/[0.06] text-sm font-semibold text-brand-primary hover:bg-brand-primary/[0.12] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {pdfLoading && <Loader2 size={14} className="animate-spin" />}
                  {pdfLoading ? 'Generando…' : 'Descargar Oferta AIU'}
                </button>
                <button onClick={() => setShowCC(true)}
                  className="py-3 rounded-lg border border-brand-border text-sm font-semibold text-brand-text-secondary hover:text-brand-text hover:border-brand-border/80 transition-all">
                  Cuenta de Cobro
                </button>
              </div>
            )}
          </motion.div>

          <div className="flex gap-3">
            <button onClick={onBack}
              className="flex-1 py-3 rounded border border-brand-border text-sm text-brand-text-secondary hover:text-brand-text transition-colors">
              Ajustar parámetros
            </button>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {showCC && saved && <CCModalAIU cotId={saved.id} onClose={() => setShowCC(false)} />}
      </AnimatePresence>
    </>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CotizacionAIUPage() {
  const [paso, setPaso] = useState(0)
  const [dir, setDir] = useState(1)

  // Step 0
  const [nombreCliente, setNombreCliente] = useState('')
  const [ciudad, setCiudad] = useState('')
  const [telefono, setTelefono] = useState('')
  const [items, setItems] = useState<ItemAIU[]>(DEFAULT_ITEMS)

  // Step 1
  const [pctA, setPctA] = useState(2.0)
  const [pctI, setPctI] = useState(2.0)
  const [pctU, setPctU] = useState(5.0)
  const [incluirIva, setIncluirIva] = useState(true)

  // Step 2
  const [resultado, setResultado] = useState<ResultadoAIU | null>(null)
  const [loading, setLoading] = useState(false)
  const [calcError, setCalcError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<{ id: number; numero: string } | null>(null)

  const cd = items.reduce((s, it) => s + it.cant * it.punit, 0)

  function navigate(n: number) {
    setDir(n > paso ? 1 : -1)
    setPaso(n)
  }

  async function handleCalcular() {
    setLoading(true)
    setCalcError(null)
    try {
      const res = await calcularAIU({
        cd,
        pct_a: pctA, pct_i: pctI, pct_u: pctU,
        incluir_iva: incluirIva,
        nombre_cliente: nombreCliente,
        tipo_proyecto: 'Licitación AIU',
        material: '',
      })
      setResultado(res)
      navigate(2)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Error al calcular. Verifica los datos.'
      setCalcError(msg)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!resultado) return
    setSaving(true)
    try {
      const resultadoEnriquecido: ResultadoAIU = {
        ...resultado,
        _estado_guardado: {
          aiu_items: items,
          nombre_cliente: nombreCliente,
        },
        ciudad_proyecto: ciudad,
        telefono_cliente: telefono,
        incluir_iva: incluirIva,
        inclusiones: [],
        exclusiones: [],
      }
      const res = await guardarAIU(nombreCliente, resultadoEnriquecido)
      setSaved(res)
    } catch { /* silent */ }
    finally { setSaving(false) }
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto py-6 px-2">
        <PageHeader
          kicker="Crear"
          title="Cotización AIU"
          subtitle="Estructura de precio para obra pública y licitaciones: A + I + U sobre Costo Directo"
          actions={<Badge tono="gold">Decreto 1372/92</Badge>}
        />

        <StepIndicator paso={paso} />

        {calcError && paso === 1 && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded border border-brand-danger/30 bg-brand-danger/5 text-brand-danger text-sm">
            {calcError}
          </motion.div>
        )}

        <AnimatePresence mode="wait" custom={dir}>
          {paso === 0 && (
            <Step0Items
              dir={dir}
              nombreCliente={nombreCliente} setNombreCliente={setNombreCliente}
              ciudad={ciudad} setCiudad={setCiudad}
              telefono={telefono} setTelefono={setTelefono}
              items={items} setItems={setItems}
              onNext={() => navigate(1)}
            />
          )}
          {paso === 1 && (
            <Step1AIU
              dir={dir}
              pctA={pctA} setPctA={setPctA}
              pctI={pctI} setPctI={setPctI}
              pctU={pctU} setPctU={setPctU}
              incluirIva={incluirIva} setIncluirIva={setIncluirIva}
              cd={cd}
              onBack={() => navigate(0)}
              onNext={handleCalcular}
              loading={loading}
            />
          )}
          {paso === 2 && resultado && (
            <Step2Resultado
              dir={dir}
              resultado={resultado}
              saved={saved}
              saving={saving}
              onBack={() => navigate(1)}
              onSave={handleSave}
            />
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  )
}
