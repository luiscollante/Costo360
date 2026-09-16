import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import AppLayout from '@/components/AppLayout'
import Toast from '@/components/Toast'
import { getParametros, setParametros } from '@/api/parametros'
import type { ParametrosData, TarifaItem, AdicionalItem } from '@/api/parametros'
import { useAuthStore } from '@/store/auth'
import {
  Save, AlertCircle, Loader2, Plus, Trash2,
  Ruler, Hammer, Square, CalendarDays, Percent, AlignHorizontalJustifyStart, Scissors,
  HardHat, Disc3, Gem, Lock,
  type LucideIcon,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { formatCOP, formatNum } from '@/lib/utils'

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

// Los 7 inductores agrupados por QUÉ representa el costo (no por su unidad de medida —
// agrupar por unidad es justo lo que juntaba en el texto a los dos "por m²" y los dos
// "por metro lineal" que son conceptualmente distintos; hallazgo real del fundador,
// 2026-09-16: ni él mismo entendía el selector plano de antes).
type GrupoInductor = 'mano_obra' | 'insumo' | 'material' | 'fijo'

const GRUPOS_INDUCTOR: { id: GrupoInductor; label: string; subtitulo: string; Icon: LucideIcon }[] = [
  { id: 'mano_obra', label: 'Mano de obra',                         subtitulo: 'le pagas a un oficial',       Icon: HardHat },
  { id: 'insumo',    label: 'Insumo o desgaste de herramienta',     subtitulo: 'no es sueldo de nadie',       Icon: Disc3 },
  { id: 'material',  label: 'Sobre el material de la pieza',        subtitulo: 'se calcula como %',           Icon: Gem },
  { id: 'fijo',      label: 'Costo fijo del proyecto',              subtitulo: 'no depende del tamaño',       Icon: Lock },
]

// Catálogo cerrado de tipos de cálculo que una empresa puede elegir al agregar una fila nueva.
// Agregar un tipo NUEVO a este catálogo es trabajo del desarrollador (requiere lógica nueva en
// el motor de cálculo) — lo que cada empresa sí controla libremente es cuántas FILAS usa de este
// catálogo y con qué nombre/valor. Ver ARQUITECTURA_AGENTES_OPERACION.md y motor/parametros.py.
// `value`/`bucketDefault`/`esPorcentaje` SIN TOCAR — son el contrato real con el motor de cálculo
// (backend/motor/calculos.py); solo cambió el texto que ve el usuario (`titulo`/`descripcion`).
const INDUCTORES_DISPONIBLES: {
  value: string; titulo: string; descripcion: string; grupo: GrupoInductor
  bucketDefault: string; esPorcentaje: boolean
}[] = [
  {
    value: 'por_ml', grupo: 'mano_obra', bucketDefault: 'c2_mano_obra', esPorcentaje: false,
    titulo: 'Mano de obra por borde',
    descripcion: 'Se cobra por cada metro lineal de borde pulido o canteado de la pieza. A más borde, más costo.',
  },
  {
    value: 'por_m2_mano_obra', grupo: 'mano_obra', bucketDefault: 'c2_mano_obra', esPorcentaje: false,
    titulo: 'Mano de obra por área',
    descripcion: 'Se cobra por cada m² instalado en piso o fachada. Es el pago al oficial, no el material.',
  },
  {
    value: 'por_ml_zocalo', grupo: 'mano_obra', bucketDefault: 'c3_zocalos', esPorcentaje: false,
    titulo: 'Mano de obra por zócalo',
    descripcion: 'Igual que "por borde", pero se mide aparte: son los metros lineales de zócalo (rodapié), no del borde principal.',
  },
  {
    value: 'por_m2', grupo: 'insumo', bucketDefault: 'c4_insumos', esPorcentaje: false,
    titulo: 'Insumo por m² cortado',
    descripcion: 'No es sueldo: es el desgaste del disco y los consumibles del corte, por cada m² cortado.',
  },
  {
    value: 'porcentaje_material', grupo: 'material', bucketDefault: 'c4_insumos', esPorcentaje: true,
    titulo: '% sobre el costo del material',
    descripcion: 'Un porcentaje que se suma sobre el valor de la piedra de esa pieza — ej. riesgo por si se rompe al procesarla.',
  },
  {
    value: 'merma_pct', grupo: 'material', bucketDefault: '', esPorcentaje: true,
    titulo: '% de material perdido (merma)',
    descripcion: 'Porcentaje de piedra que se pierde al cortar y hay que comprar de más. Es material, no mano de obra.',
  },
  {
    value: 'por_dia', grupo: 'fijo', bucketDefault: 'c4_insumos', esPorcentaje: false,
    titulo: 'Costo fijo por día de obra',
    descripcion: 'Un valor fijo que se cobra una sola vez por los días que dura el proyecto — no crece con el tamaño de la pieza.',
  },
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
  onGuardar: () => void
  saving: boolean
  dirty: boolean
}

// Los valores tipo "%" se guardan como fracción (0.02 = 2%) — helpers para mostrar/editar en %.
function esPorcentajeInductor(inductor: string): boolean {
  return inductor === 'porcentaje_material' || inductor === 'merma_pct'
}

/**
 * Campo de dinero — muestra "60.000" (agrupado, sin ceros de más) siempre,
 * incluso mientras se edita. Hallazgo real del fundador, 2026-09-16: sin
 * agrupar, "60000" obliga a contar dígitos uno por uno para saber si son 6,
 * 60 o 600 mil. `onFocus` selecciona todo el texto — al escribir encima se
 * reemplaza entero, nunca se mezcla con lo que ya había (un diseño anterior
 * que dependía de `requestAnimationFrame` para seleccionar tenía justo ese
 * bug: a veces el clic quedaba con el cursor sin seleccionar nada, y tipear
 * insertaba en vez de reemplazar).
 */
function MoneyInput({
  value,
  onChange,
  className,
}: {
  value: number
  onChange: (n: number) => void
  className?: string
}) {
  const [texto, setTexto] = useState(() => formatNum(value, 0))

  // El valor puede cambiar desde AFUERA (se canceló un borrado, se cambió de
  // pestaña de material) — mantener el texto mostrado sincronizado con eso.
  useEffect(() => {
    setTexto(formatNum(value, 0))
  }, [value])

  return (
    <input
      type="text"
      inputMode="numeric"
      value={texto}
      onFocus={(e) => e.target.select()}
      onChange={(e) => setTexto(e.target.value.replace(/[^\d]/g, ''))}
      onBlur={() => {
        const n = texto ? Number.parseInt(texto, 10) : 0
        onChange(n)
        setTexto(formatNum(n, 0))
      }}
      className={className}
    />
  )
}

function TarifasTab({ tarifas, canEdit, onChange, onRename, onAddRow, onRemoveRow, onGuardar, saving, dirty }: TarifasTabProps) {
  const [activeMat, setActiveMat] = useState<Material>(MATERIALES[0])
  const filas = tarifas[activeMat] ?? []

  // Modal de "agregar costo" — reemplaza al <select> plano de antes; elegir
  // una tarjeta ya crea la fila (sin segundo click). Usa el <Dialog> real de
  // la app (foco atrapado, Escape, click afuera, devuelve el foco al cerrar
  // — todo eso ya lo resuelve el componente, no hace falta reimplementarlo).
  const [menuAbierto, setMenuAbierto] = useState(false)

  // Confirmación antes de borrar — un clic sin querer en el bote de basura
  // ya no borra directo (hallazgo real del fundador, 2026-09-16).
  const [borrarIdx, setBorrarIdx] = useState<number | null>(null)

  // Resalta brevemente la fila recién agregada — cierra el loop visual de
  // "elegí algo del menú" -> "esto es lo que apareció abajo".
  const [filaDestacada, setFilaDestacada] = useState<number | null>(null)
  const prevLenRef = useRef(filas.length)

  useEffect(() => {
    setMenuAbierto(false)
    setFilaDestacada(null)
    setBorrarIdx(null)
    prevLenRef.current = filas.length
    // Solo reaccionar al cambio de MATERIAL (evita una falsa alarma de "fila
    // agregada" si el material nuevo simplemente tiene más filas que el
    // anterior) — el efecto de abajo es el que sí reacciona a `filas.length`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMat])

  useEffect(() => {
    if (filas.length > prevLenRef.current) {
      const idx = filas.length - 1
      setFilaDestacada(idx)
      prevLenRef.current = filas.length
      const t = setTimeout(() => setFilaDestacada(null), 900)
      return () => clearTimeout(t)
    }
    prevLenRef.current = filas.length
  }, [filas.length])

  function elegirInductor(value: string) {
    onAddRow(activeMat, value)
    setMenuAbierto(false)
  }

  function confirmarBorrar() {
    if (borrarIdx === null) return
    onRemoveRow(activeMat, borrarIdx)
    setBorrarIdx(null)
  }

  const filaABorrar = borrarIdx !== null ? filas[borrarIdx] : null

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

      {/* Filas agrupadas por lo mismo que agrupa el modal de agregar — así la
          lista de lo que YA existe se lee con la misma lógica que se usó
          para agregarlo (hallazgo real del fundador, 2026-09-16: antes el
          modal agrupaba pero la lista de abajo seguía plana). */}
      <div className="bg-brand-surface rounded-xl border border-brand-border overflow-hidden">
        {filas.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-brand-text-secondary">Sin tarifas para este material.</p>
        ) : (
          GRUPOS_INDUCTOR.map((grupo, gi) => {
            const filasDelGrupo = filas
              .map((item, idx) => ({ item, idx }))
              .filter(({ item }) => INDUCTORES_DISPONIBLES.find((o) => o.value === item.inductor)?.grupo === grupo.id)
            if (filasDelGrupo.length === 0) return null
            return (
              <div key={grupo.id} className={gi > 0 ? 'border-t border-brand-border' : ''}>
                <div className="flex items-center gap-2 bg-brand-surface/60 px-5 py-2">
                  <grupo.Icon size={13} className="shrink-0 text-brand-text-secondary" aria-hidden="true" />
                  <span className="text-[11px] font-bold uppercase tracking-wide text-brand-text-secondary">
                    {grupo.label}
                  </span>
                </div>
                <div className="divide-y divide-brand-border/50">
                  {filasDelGrupo.map(({ item, idx }) => {
                    const esPorcentaje = esPorcentajeInductor(item.inductor)
                    return (
                      <div
                        key={`${item.inductor}-${idx}`}
                        className={`px-5 py-3.5 flex items-center justify-between gap-4 transition-colors duration-700 ${
                          idx === filaDestacada ? 'bg-brand-success-soft' : 'hover:bg-brand-surface/30'
                        }`}
                      >
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
                            {esPorcentaje ? (
                              <input
                                type="number"
                                value={Math.round(item.valor * 1000) / 10}
                                step={0.1}
                                min={0}
                                max={100}
                                onChange={(e) => onChange(activeMat, idx, (parseFloat(e.target.value) || 0) / 100)}
                                className={`${inputBase} w-28`}
                              />
                            ) : (
                              <MoneyInput
                                value={item.valor}
                                onChange={(n) => onChange(activeMat, idx, n)}
                                className={`${inputBase} w-28`}
                              />
                            )}
                            {esPorcentaje && <span className="text-[10px] text-brand-text-secondary">%</span>}
                            <button
                              onClick={() => setBorrarIdx(idx)}
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
              </div>
            )
          })
        )}
      </div>

      {canEdit && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <Button
            type="button"
            onClick={() => setMenuAbierto(true)}
            aria-haspopup="dialog"
            aria-expanded={menuAbierto}
          >
            <Plus className="w-3.5 h-3.5" />
            Agregar costo para {activeMat}
          </Button>
          <div className="flex items-center gap-3">
            {dirty && !saving && (
              <span className="flex items-center gap-1.5 text-xs text-brand-text-secondary">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-gold" aria-hidden="true" />
                Tienes cambios sin guardar
              </span>
            )}
            <Button type="button" onClick={onGuardar} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Save className="w-4 h-4" aria-hidden="true" />}
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </div>
        </div>
      )}

      <Dialog
        open={borrarIdx !== null}
        onClose={() => setBorrarIdx(null)}
        role="alertdialog"
        title="Eliminar este costo"
      >
        <p className="mb-5 text-sm text-brand-text-secondary">
          ¿Eliminar <span className="font-semibold text-brand-text-dark">«{filaABorrar?.nombre_interno}»</span> de
          las tarifas de {activeMat}? Se quita de la lista, pero no se hace permanente hasta que toques
          «Guardar cambios».
        </p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => setBorrarIdx(null)}>Cancelar</Button>
          <Button type="button" variant="danger" onClick={confirmarBorrar}>Eliminar</Button>
        </div>
      </Dialog>

      <Dialog
        open={menuAbierto}
        onClose={() => setMenuAbierto(false)}
        title="Elige qué tipo de costo estás agregando"
        className="max-w-lg"
      >
        <div role="listbox" aria-label="Tipo de costo a agregar">
          {GRUPOS_INDUCTOR.map((grupo, gi) => {
            const opciones = INDUCTORES_DISPONIBLES.filter((o) => o.grupo === grupo.id)
            if (opciones.length === 0) return null
            return (
              <div key={grupo.id} className={gi > 0 ? 'mt-4 border-t border-brand-border/60 pt-4' : ''}>
                <div className="mb-1.5 flex items-center gap-2">
                  <grupo.Icon size={14} className="shrink-0 text-brand-text-secondary" aria-hidden="true" />
                  <span className="text-[11px] font-bold uppercase tracking-wide text-brand-text-secondary">
                    {grupo.label}
                  </span>
                  <span className="text-[11px] font-normal normal-case text-brand-text-secondary/70">
                    — {grupo.subtitulo}
                  </span>
                </div>
                {opciones.map((op) => {
                  const badge = INDUCTOR_BADGE[op.value]
                  return (
                    <button
                      key={op.value}
                      type="button"
                      role="option"
                      aria-selected="false"
                      onClick={() => elegirInductor(op.value)}
                      className="flex w-full cursor-pointer items-start gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-brand-bg focus-visible:bg-brand-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/50"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-primary/10">
                        {badge && <badge.Icon size={16} className="text-brand-primary" aria-hidden="true" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium leading-tight text-brand-text">{op.titulo}</span>
                        <span className="mt-0.5 block text-xs leading-snug text-brand-text-secondary">{op.descripcion}</span>
                      </span>
                      {badge && (
                        <span className="shrink-0 self-center">
                          <Badge tono="neutral" icon={<badge.Icon size={11} />}>{badge.label}</Badge>
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      </Dialog>
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
  onGuardar: () => void
  saving: boolean
  dirty: boolean
}

function AdicionalesTab({ adicionales, canEdit, onChange, onAddRow, onRemoveRow, onGuardar, saving, dirty }: AdicionalesTabProps) {
  // Confirmación antes de borrar — mismo criterio que en Tarifas.
  const [borrarIdx, setBorrarIdx] = useState<number | null>(null)

  function confirmarBorrar() {
    if (borrarIdx === null) return
    onRemoveRow(borrarIdx)
    setBorrarIdx(null)
  }

  const filaABorrar = borrarIdx !== null ? adicionales[borrarIdx] : null

  return (
    <div className="space-y-3">
      <p className="text-xs text-brand-text-secondary pl-1">
        Servicios extras disponibles al cotizar (fregadero, impermeabilizante, acceso elevación, etc.)
        — precio varía según etapa de la obra.
      </p>

      <div className="bg-brand-surface rounded-xl border border-brand-border overflow-x-auto">
        <table className="w-full text-sm min-w-[820px] table-fixed">
          <thead>
            <tr className="border-b border-brand-border bg-brand-surface/40">
              <th className="px-4 py-3 text-left text-[11px] font-bold text-brand-text-secondary uppercase tracking-wider w-[36%]">Concepto</th>
              <th className="px-3 py-3 text-left text-[11px] font-bold text-brand-text-secondary uppercase tracking-wider w-[8%]">Unidad</th>
              {ETAPAS_COLS.map(({ label }) => (
                <th key={label} className="px-3 py-3 text-right text-[11px] font-bold text-brand-text-secondary uppercase tracking-wider w-[12%]">
                  {label}
                </th>
              ))}
              {canEdit && <th className="w-10" />}
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
                      <MoneyInput
                        value={item[key] as number}
                        onChange={(n) => onChange(idx, key, n)}
                        className="w-full px-2 py-1.5 rounded-md bg-brand-input border border-brand-border text-sm text-right text-brand-text tabular-nums focus:outline-none focus:border-brand-primary transition-colors"
                      />
                    ) : (
                      <span className="text-brand-text tabular-nums">{formatCOP(item[key] as number)}</span>
                    )}
                  </td>
                ))}
                {canEdit && (
                  <td className="px-2 py-2.5">
                    <button
                      onClick={() => setBorrarIdx(idx)}
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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button type="button" onClick={onAddRow}>
            <Plus className="w-3.5 h-3.5" />
            Agregar servicio adicional
          </Button>
          <div className="flex items-center gap-3">
            {dirty && !saving && (
              <span className="flex items-center gap-1.5 text-xs text-brand-text-secondary">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-gold" aria-hidden="true" />
                Tienes cambios sin guardar
              </span>
            )}
            <Button type="button" onClick={onGuardar} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Save className="w-4 h-4" aria-hidden="true" />}
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </div>
        </div>
      )}

      <Dialog
        open={borrarIdx !== null}
        onClose={() => setBorrarIdx(null)}
        role="alertdialog"
        title="Eliminar este servicio"
      >
        <p className="mb-5 text-sm text-brand-text-secondary">
          ¿Eliminar <span className="font-semibold text-brand-text-dark">«{filaABorrar?.concepto}»</span> de los
          servicios adicionales? Se quita de la lista, pero no se hace permanente hasta que toques
          «Guardar cambios».
        </p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => setBorrarIdx(null)}>Cancelar</Button>
          <Button type="button" variant="danger" onClick={confirmarBorrar}>Eliminar</Button>
        </div>
      </Dialog>
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
  // Hallazgo real del fundador, 2026-09-16: nada avisaba si había cambios
  // sin guardar — "Guardar cambios" se veía igual con o sin nada pendiente.
  const [dirty, setDirty] = useState(false)

  // Load on mount
  useEffect(() => {
    setLoading(true)
    getParametros()
      .then(setData)
      .catch(() => setToast({ type: 'error', message: 'Error al cargar parámetros' }))
      .finally(() => setLoading(false))
  }, [])

  // Todas las mutaciones locales pasan por acá en vez de `setData` directo,
  // para que ninguna futura edición se olvide de marcar `dirty`.
  const actualizarData = useCallback((updater: (prev: ParametrosData | null) => ParametrosData | null) => {
    setData(updater)
    setDirty(true)
  }, [])

  // Handlers for local mutations
  const handleTarifaChange = useCallback((material: string, index: number, value: number) => {
    actualizarData((prev) => {
      if (!prev) return prev
      const updated = prev.tarifas[material].map((item, i) =>
        i === index ? { ...item, valor: value } : item
      )
      return { ...prev, tarifas: { ...prev.tarifas, [material]: updated } }
    })
  }, [])

  const handleTarifaRename = useCallback((material: string, index: number, nombre: string) => {
    actualizarData((prev) => {
      if (!prev) return prev
      const updated = prev.tarifas[material].map((item, i) =>
        i === index ? { ...item, nombre_interno: nombre } : item
      )
      return { ...prev, tarifas: { ...prev.tarifas, [material]: updated } }
    })
  }, [])

  const handleTarifaAddRow = useCallback((material: string, inductor: string) => {
    actualizarData((prev) => {
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
    actualizarData((prev) => {
      if (!prev) return prev
      const updated = (prev.tarifas[material] ?? []).filter((_, i) => i !== index)
      return { ...prev, tarifas: { ...prev.tarifas, [material]: updated } }
    })
  }, [])



  const handleAdicionalesChange = useCallback((index: number, field: keyof AdicionalItem, value: string | number) => {
    actualizarData((prev) => {
      if (!prev) return prev
      const updated = prev.adicionales.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
      return { ...prev, adicionales: updated }
    })
  }, [])

  const handleAdicionalesAddRow = useCallback(() => {
    actualizarData((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        adicionales: [...prev.adicionales, { concepto: '', unidad: 'und', terminada: 0, acabados: 0, estructura: 0, comercial: 0 }],
      }
    })
  }, [])

  const handleAdicionalesRemoveRow = useCallback((index: number) => {
    actualizarData((prev) => {
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
      setDirty(false)
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
            ) : undefined
          }
        />

        {/* ── Loading state ── */}
        {loading ? (
          <div className="bg-brand-surface rounded-xl border border-brand-border p-16 text-center">
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
                    onGuardar={handleSave}
                    saving={saving}
                    dirty={dirty}
                  />
                )}

                {activeTab === 'Adicionales' && (
                  <AdicionalesTab
                    adicionales={data.adicionales}
                    canEdit={canEdit}
                    onChange={handleAdicionalesChange}
                    onAddRow={handleAdicionalesAddRow}
                    onRemoveRow={handleAdicionalesRemoveRow}
                    onGuardar={handleSave}
                    saving={saving}
                    dirty={dirty}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        ) : (
          <div className="bg-brand-surface rounded-xl border border-brand-danger/30 p-8 text-center">
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
