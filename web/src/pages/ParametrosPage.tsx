import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import AppLayout from '@/components/AppLayout'
import Toast from '@/components/Toast'
import { getParametros, setParametros } from '@/api/parametros'
import type { ParametrosData, TarifaItem, AdicionalItem } from '@/api/parametros'
import { useAuthStore } from '@/store/auth'
import {
  Save, AlertCircle, Loader2, Plus, Trash2,
  Ruler, Hammer, Square, CalendarDays, Percent, AlignHorizontalJustifyStart, Scissors,
  type LucideIcon,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Badge } from '@/components/ui/Badge'
import { formatCOP } from '@/lib/utils'

const MATERIALES = ['Mármol', 'Granito', 'Sinterizado', 'Quarztone', 'Quarzita'] as const
type Material = (typeof MATERIALES)[number]

const MAIN_TABS = ['Tarifas', 'Adicionales'] as const
type MainTab = (typeof MAIN_TABS)[number]

// Los inductores se distinguen por ÍCONO + TEXTO (no por 7 matices de color).
const INDUCTOR_BADGE: Record<string, { label: string; Icon: LucideIcon }> = {
  por_ml:              { label: 'por ml',        Icon: Ruler },
  por_m2_mano_obra:    { label: 'por m² (M.O.)', Icon: Hammer },
  por_m2:              { label: 'por m²',        Icon: Square },
  por_dia:             { label: 'por día',       Icon: CalendarDays },
  porcentaje_material: { label: '% material',    Icon: Percent },
  por_ml_zocalo:       { label: 'por ml zócalo', Icon: AlignHorizontalJustifyStart },
  merma_pct:           { label: '% merma',       Icon: Scissors },
}

// Catálogo cerrado de tipos de cálculo que una empresa puede elegir al agregar una fila nueva.
// Agregar un tipo NUEVO a este catálogo es trabajo del desarrollador (requiere lógica nueva en
// el motor de cálculo) — lo que cada empresa sí controla libremente es cuántas FILAS usa de este
// catálogo y con qué nombre/valor. Ver ARQUITECTURA_AGENTES_OPERACION.md y motor/parametros.py.
const INDUCTORES_DISPONIBLES: { value: string; label: string; bucketDefault: string; esPorcentaje: boolean }[] = [
  { value: 'por_ml',              label: 'Por metro lineal (mano de obra en bordes)', bucketDefault: 'c2_mano_obra', esPorcentaje: false },
  { value: 'por_m2_mano_obra',    label: 'Por m² (mano de obra en área — pisos/fachadas)', bucketDefault: 'c2_mano_obra', esPorcentaje: false },
  { value: 'por_m2',              label: 'Por m² cortado (insumo/consumible)', bucketDefault: 'c4_insumos', esPorcentaje: false },
  { value: 'por_dia',             label: 'Por día de obra (costo fijo del proyecto)', bucketDefault: 'c4_insumos', esPorcentaje: false },
  { value: 'porcentaje_material', label: '% del costo del material', bucketDefault: 'c4_insumos', esPorcentaje: true },
  { value: 'por_ml_zocalo',       label: 'Por metro lineal de zócalo', bucketDefault: 'c3_zocalos', esPorcentaje: false },
  { value: 'merma_pct',           label: '% de merma / desperdicio de material', bucketDefault: '', esPorcentaje: true },
]

function InductorBadge({ inductor }: { inductor: string }) {
  const info = INDUCTOR_BADGE[inductor]
  if (!info) return <Badge tono="neutral">{inductor}</Badge>
  const { label, Icon } = info
  return <Badge tono="neutral" icon={<Icon size={11} />}>{label}</Badge>
}

// ─── Shared input classes ──────────────────────────────────────────────────────

const inputBase =
  'px-3 py-2 rounded-lg bg-brand-input border border-brand-border text-sm text-brand-text placeholder:text-brand-text-secondary focus:outline-none focus:border-brand-primary focus:shadow-[0_0_0_1px_#1F6F5440,0_0_12px_#1F6F5418] transition-all text-right tabular-nums'


// ─── Tab: Tarifas ─────────────────────────────────────────────────────────────

interface TarifasTabProps {
  tarifas: Record<string, TarifaItem[]>
  canEdit: boolean
  onChange: (material: string, index: number, value: number) => void
  onRename: (material: string, index: number, nombre: string) => void
  onAddRow: (material: string, inductor: string) => void
  onRemoveRow: (material: string, index: number) => void
}

// Los valores tipo "%" se guardan como fracción (0.02 = 2%) — helpers para mostrar/editar en %.
function esPorcentajeInductor(inductor: string): boolean {
  return inductor === 'porcentaje_material' || inductor === 'merma_pct'
}

function TarifasTab({ tarifas, canEdit, onChange, onRename, onAddRow, onRemoveRow }: TarifasTabProps) {
  const [activeMat, setActiveMat] = useState<Material>(MATERIALES[0])
  const [nuevoInductor, setNuevoInductor] = useState(INDUCTORES_DISPONIBLES[0].value)
  const filas = tarifas[activeMat] ?? []

  return (
    <div>
      {/* Sub-tabs materiales */}
      <div className="flex gap-1.5 mb-5 flex-wrap">
        {MATERIALES.map((m) => (
          <button
            key={m}
            onClick={() => setActiveMat(m)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer
              ${activeMat === m
                ? 'bg-brand-primary/20 text-brand-text border border-brand-primary/40'
                : 'bg-brand-surface/60 text-brand-text-secondary border border-brand-border hover:text-brand-text hover:bg-brand-surface'
              }`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Filas — layout flex compatible con todos los anchos */}
      <div className="glass rounded-xl border border-brand-border divide-y divide-brand-border/50">
        {filas.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-brand-text-secondary">Sin tarifas para este material.</p>
        ) : filas.map((item, idx) => {
          const esPorcentaje = esPorcentajeInductor(item.inductor)
          return (
            <div key={`${item.inductor}-${idx}`} className="px-5 py-3.5 flex items-center justify-between gap-4 hover:bg-brand-surface/30 transition-colors">
              <div className="min-w-0 flex-1">
                {canEdit ? (
                  <input
                    type="text"
                    value={item.nombre_interno}
                    onChange={(e) => onRename(activeMat, idx, e.target.value)}
                    className="text-sm font-medium text-brand-text leading-tight bg-transparent border-none outline-none w-full focus:bg-brand-input rounded px-1 -mx-1"
                    placeholder="Nombre de este costo"
                  />
                ) : (
                  <p className="text-sm font-medium text-brand-text leading-tight">{item.nombre_interno}</p>
                )}
                <div className="mt-1"><InductorBadge inductor={item.inductor} /></div>
              </div>
              {canEdit ? (
                <div className="flex items-center gap-1.5 shrink-0">
                  {!esPorcentaje && <span className="text-[10px] text-brand-text-secondary">COP</span>}
                  <input
                    type="number"
                    value={esPorcentaje ? Math.round(item.valor * 1000) / 10 : item.valor}
                    step={esPorcentaje ? 0.1 : 1000}
                    min={0}
                    max={esPorcentaje ? 100 : undefined}
                    onChange={(e) => {
                      const raw = parseFloat(e.target.value) || 0
                      onChange(activeMat, idx, esPorcentaje ? raw / 100 : raw)
                    }}
                    className={`${inputBase} w-28`}
                  />
                  {esPorcentaje && <span className="text-[10px] text-brand-text-secondary">%</span>}
                  <button
                    onClick={() => onRemoveRow(activeMat, idx)}
                    className="p-1.5 rounded-md text-brand-text-secondary hover:text-brand-danger hover:bg-brand-danger/10 transition-colors"
                    title="Eliminar este costo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <span className="font-mono text-sm text-brand-text shrink-0">
                  {esPorcentaje ? `${Math.round(item.valor * 1000) / 10}%` : formatCOP(item.valor)}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {canEdit && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            value={nuevoInductor}
            onChange={(e) => setNuevoInductor(e.target.value)}
            className="px-3 py-2 rounded-lg bg-brand-input border border-brand-border text-xs text-brand-text focus:outline-none focus:border-brand-primary transition-colors max-w-[280px]"
          >
            {INDUCTORES_DISPONIBLES.map((ind) => (
              <option key={ind.value} value={ind.value}>{ind.label}</option>
            ))}
          </select>
          <button
            onClick={() => onAddRow(activeMat, nuevoInductor)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-brand-border text-sm text-brand-text-secondary hover:text-brand-text hover:border-brand-primary/50 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Agregar costo para {activeMat}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Tab: Adicionales ─────────────────────────────────────────────────────────

const UNIDADES_ADD = ['und', 'ml', 'm²', 'viaje', 'glb', 'día', 'kg'] as const
const ETAPAS_COLS: { key: keyof AdicionalItem; label: string }[] = [
  { key: 'terminada',  label: 'Casa terminada' },
  { key: 'acabados',   label: 'En acabados' },
  { key: 'estructura', label: 'En estructura' },
  { key: 'comercial',  label: 'Proyecto comercial' },
]

interface AdicionalesTabProps {
  adicionales: AdicionalItem[]
  canEdit: boolean
  onChange: (index: number, field: keyof AdicionalItem, value: string | number) => void
  onAddRow: () => void
  onRemoveRow: (index: number) => void
}

function AdicionalesTab({ adicionales, canEdit, onChange, onAddRow, onRemoveRow }: AdicionalesTabProps) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-brand-text-secondary pl-1">
        Servicios extras disponibles al cotizar (fregadero, impermeabilizante, acceso elevación, etc.)
        — precio varía según etapa de la obra.
      </p>

      <div className="glass rounded-xl border border-brand-border overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="border-b border-brand-border bg-brand-surface/40">
              <th className="px-4 py-3 text-left text-[11px] font-bold text-brand-text-secondary uppercase tracking-wider w-[35%]">Concepto</th>
              <th className="px-3 py-3 text-left text-[11px] font-bold text-brand-text-secondary uppercase tracking-wider w-[8%]">Unidad</th>
              {ETAPAS_COLS.map(({ label }) => (
                <th key={label} className="px-3 py-3 text-right text-[11px] font-bold text-brand-text-secondary uppercase tracking-wider">
                  {label}
                </th>
              ))}
              {canEdit && <th className="w-8" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-border/40">
            {adicionales.map((item, idx) => (
              <tr key={idx} className="hover:bg-brand-surface/20 transition-colors">
                <td className="px-4 py-2.5">
                  {canEdit ? (
                    <input
                      type="text"
                      value={item.concepto}
                      onChange={(e) => onChange(idx, 'concepto', e.target.value)}
                      className="w-full px-2 py-1.5 rounded-md bg-brand-input border border-brand-border text-sm text-brand-text focus:outline-none focus:border-brand-primary transition-colors"
                      placeholder="Nombre del servicio"
                    />
                  ) : (
                    <span className="text-brand-text">{item.concepto}</span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  {canEdit ? (
                    <select
                      value={item.unidad}
                      onChange={(e) => onChange(idx, 'unidad', e.target.value)}
                      className="w-full px-2 py-1.5 rounded-md bg-brand-input border border-brand-border text-sm text-brand-text focus:outline-none focus:border-brand-primary transition-colors"
                    >
                      {UNIDADES_ADD.map((u) => <option key={u} value={u}>{u}</option>)}
                    </select>
                  ) : (
                    <span className="text-brand-text-secondary">{item.unidad}</span>
                  )}
                </td>
                {ETAPAS_COLS.map(({ key }) => (
                  <td key={key} className="px-3 py-2.5 text-right">
                    {canEdit ? (
                      <input
                        type="number"
                        value={item[key] as number}
                        min={0}
                        step={1000}
                        onChange={(e) => onChange(idx, key, parseFloat(e.target.value) || 0)}
                        className="w-28 px-2 py-1.5 rounded-md bg-brand-input border border-brand-border text-sm text-right text-brand-text tabular-nums focus:outline-none focus:border-brand-primary transition-colors"
                      />
                    ) : (
                      <span className="text-brand-text tabular-nums">{formatCOP(item[key] as number)}</span>
                    )}
                  </td>
                ))}
                {canEdit && (
                  <td className="px-2 py-2.5">
                    <button
                      onClick={() => onRemoveRow(idx)}
                      className="p-1.5 rounded-md text-brand-text-secondary hover:text-brand-danger hover:bg-brand-danger/10 transition-colors"
                      title="Eliminar fila"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {canEdit && (
        <button
          onClick={onAddRow}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-brand-border text-sm text-brand-text-secondary hover:text-brand-text hover:border-brand-primary/50 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Agregar servicio adicional
        </button>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ParametrosPage() {
  const usuario = useAuthStore((s) => s.usuario)
  const canEdit = usuario?.puede_ver_dashboard ?? false

  const [activeTab, setActiveTab] = useState<MainTab>('Tarifas')
  const [data, setData] = useState<ParametrosData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Load on mount
  useEffect(() => {
    setLoading(true)
    getParametros()
      .then(setData)
      .catch(() => setToast({ type: 'error', message: 'Error al cargar parámetros' }))
      .finally(() => setLoading(false))
  }, [])

  // Handlers for local mutations
  const handleTarifaChange = useCallback((material: string, index: number, value: number) => {
    setData((prev) => {
      if (!prev) return prev
      const updated = prev.tarifas[material].map((item, i) =>
        i === index ? { ...item, valor: value } : item
      )
      return { ...prev, tarifas: { ...prev.tarifas, [material]: updated } }
    })
  }, [])

  const handleTarifaRename = useCallback((material: string, index: number, nombre: string) => {
    setData((prev) => {
      if (!prev) return prev
      const updated = prev.tarifas[material].map((item, i) =>
        i === index ? { ...item, nombre_interno: nombre } : item
      )
      return { ...prev, tarifas: { ...prev.tarifas, [material]: updated } }
    })
  }, [])

  const handleTarifaAddRow = useCallback((material: string, inductor: string) => {
    setData((prev) => {
      if (!prev) return prev
      const cfg = INDUCTORES_DISPONIBLES.find((i) => i.value === inductor) ?? INDUCTORES_DISPONIBLES[0]
      const nuevaFila: TarifaItem = {
        nombre_interno: 'Nuevo costo',
        inductor: cfg.value,
        valor: 0,
        etiqueta_pdf: cfg.bucketDefault,
      }
      const existentes = prev.tarifas[material] ?? []
      return { ...prev, tarifas: { ...prev.tarifas, [material]: [...existentes, nuevaFila] } }
    })
  }, [])

  const handleTarifaRemoveRow = useCallback((material: string, index: number) => {
    setData((prev) => {
      if (!prev) return prev
      const updated = (prev.tarifas[material] ?? []).filter((_, i) => i !== index)
      return { ...prev, tarifas: { ...prev.tarifas, [material]: updated } }
    })
  }, [])



  const handleAdicionalesChange = useCallback((index: number, field: keyof AdicionalItem, value: string | number) => {
    setData((prev) => {
      if (!prev) return prev
      const updated = prev.adicionales.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
      return { ...prev, adicionales: updated }
    })
  }, [])

  const handleAdicionalesAddRow = useCallback(() => {
    setData((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        adicionales: [...prev.adicionales, { concepto: '', unidad: 'und', terminada: 0, acabados: 0, estructura: 0, comercial: 0 }],
      }
    })
  }, [])

  const handleAdicionalesRemoveRow = useCallback((index: number) => {
    setData((prev) => {
      if (!prev) return prev
      return { ...prev, adicionales: prev.adicionales.filter((_, i) => i !== index) }
    })
  }, [])

  // Save — sends only the active tab's data
  async function handleSave() {
    if (!data || !canEdit) return
    setSaving(true)
    try {
      let payload: Partial<ParametrosData>
      if (activeTab === 'Tarifas')         payload = { tarifas: data.tarifas }
      else                                 payload = { adicionales: data.adicionales }

      await setParametros(payload)
      setToast({ type: 'success', message: 'Parámetros guardados correctamente' })
    } catch {
      setToast({ type: 'error', message: 'Error al guardar parámetros' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">

        <PageHeader
          kicker="Ajustes"
          title="Parámetros"
          subtitle="Tarifas, adicionales y AIU del sistema"
          actions={
            !canEdit ? (
              <span className="flex items-center gap-2 rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-xs text-brand-text-secondary">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                Solo Admin o Gerente pueden editar
              </span>
            ) : (
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || loading}
                className="flex items-center gap-2 rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-primary-light disabled:opacity-50 cursor-pointer"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Save className="w-4 h-4" aria-hidden="true" />}
                {saving ? 'Guardando…' : 'Guardar cambios'}
              </button>
            )
          }
        />

        {/* ── Loading state ── */}
        {loading ? (
          <div className="glass rounded-xl border border-brand-border p-16 text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
              className="inline-block w-6 h-6 border-2 border-brand-muted/30 border-t-brand-primary rounded-full mb-3"
            />
            <p className="text-sm text-brand-text-secondary">Cargando parámetros…</p>
          </div>
        ) : data ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            {/* ── Main tabs ── */}
            <div className="mb-6">
              <SegmentedControl
                mode="tabs"
                ariaLabel="Secciones de parámetros"
                options={MAIN_TABS.map((t) => ({ value: t, label: t }))}
                value={activeTab}
                onChange={setActiveTab}
                panelIdFor={(v) => `panel-${v}`}
              />
            </div>

            {/* ── Tab content ── */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                role="tabpanel"
                id={`panel-${activeTab}`}
                aria-label={activeTab}
                tabIndex={0}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.18 }}
                className="focus:outline-none"
              >
                {activeTab === 'Tarifas' && (
                  <TarifasTab
                    tarifas={data.tarifas}
                    canEdit={canEdit}
                    onChange={handleTarifaChange}
                    onRename={handleTarifaRename}
                    onAddRow={handleTarifaAddRow}
                    onRemoveRow={handleTarifaRemoveRow}
                  />
                )}

                {activeTab === 'Adicionales' && (
                  <AdicionalesTab
                    adicionales={data.adicionales}
                    canEdit={canEdit}
                    onChange={handleAdicionalesChange}
                    onAddRow={handleAdicionalesAddRow}
                    onRemoveRow={handleAdicionalesRemoveRow}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        ) : (
          <div className="glass rounded-xl border border-brand-danger/30 p-8 text-center">
            <AlertCircle className="w-8 h-8 text-brand-danger mx-auto mb-3" />
            <p className="text-sm text-brand-danger">No se pudieron cargar los parámetros.</p>
          </div>
        )}
      </div>

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <Toast
            key={toast.message}
            type={toast.type}
            message={toast.message}
            onDismiss={() => setToast(null)}
          />
        )}
      </AnimatePresence>
    </AppLayout>
  )
}
