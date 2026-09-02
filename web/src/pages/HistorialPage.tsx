import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { FileDown, Loader2, Receipt, Pencil, Trash2, Check, X, ChevronDown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '@/components/AppLayout'
import {
  listarCotizaciones,
  actualizarEstado,
  descargarPDF,
  descargarPDFAiu,
  descargarCuentaCobro,
  getCotizacionDatos,
  eliminarCotizacion,
  type CotizacionResumen,
  type HistorialFiltros,
} from '@/api/cotizacion'
import { PageHeader } from '@/components/ui/PageHeader'
import { Dialog } from '@/components/ui/Dialog'
import { formatCOP, formatNum } from '@/lib/utils'

const ESTADOS = ['Pendiente', 'Aprobada', 'Rechazada']

const estadoConfig: Record<string, { color: string; bg: string; dot: string }> = {
  Pendiente:  { color: 'text-brand-warning-text',   bg: 'bg-brand-warning-soft border-brand-warning/30', dot: 'bg-brand-warning' },
  Aprobada:   { color: 'text-brand-success',        bg: 'bg-brand-success-soft border-brand-success/30', dot: 'bg-brand-success' },
  Rechazada:  { color: 'text-brand-danger',         bg: 'bg-brand-danger-soft border-brand-danger/30',   dot: 'bg-brand-danger'  },
  Borrador:   { color: 'text-brand-text-secondary', bg: 'bg-brand-bg border-brand-border',               dot: 'bg-brand-border'  },
}

function EstadoBadge({ estado, id }: { estado: string; id: number }) {
  const [open, setOpen] = useState(false)
  const qc = useQueryClient()
  const containerRef = useRef<HTMLDivElement>(null)
  const mut = useMutation({
    mutationFn: (nuevoEstado: string) => actualizarEstado(id, nuevoEstado),
    // Actualización optimista: la fila cambia AL INSTANTE; si el backend falla se
    // revierte. Evita la sensación de lentitud al cambiar de estado.
    onMutate: async (nuevoEstado: string) => {
      setOpen(false)
      await qc.cancelQueries({ queryKey: ['historial'] })
      const prev = qc.getQueriesData<CotizacionResumen[]>({ queryKey: ['historial'] })
      qc.setQueriesData<CotizacionResumen[]>({ queryKey: ['historial'] }, (old) =>
        old?.map((r) => (r.id === id ? { ...r, estado: nuevoEstado } : r)),
      )
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      ctx?.prev?.forEach(([key, data]) => qc.setQueryData(key, data))
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['historial'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] }) // el dashboard cuenta por estado
    },
  })

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClickOutside)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  const cfg = estadoConfig[estado] ?? estadoConfig.Borrador
  return (
    <div ref={containerRef} className="relative min-w-0">
      <button
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all cursor-pointer ${cfg.bg} ${cfg.color}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
        {estado}
        <ChevronDown size={9} className={`transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute top-8 left-0 z-20 glass rounded-lg border border-brand-border shadow-lg overflow-hidden min-w-[120px]"
          >
            {ESTADOS.map(e => (
              <button
                key={e}
                onClick={() => mut.mutate(e)}
                disabled={mut.isPending}
                className={`w-full text-left px-3 py-2 text-xs hover:bg-brand-surface/60 transition-colors ${
                  e === estado ? 'text-brand-text font-semibold' : 'text-brand-text-secondary'
                }`}
              >
                {e}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const MESES_CORTOS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
function formatFecha(iso: string): string {
  const parts = iso?.split('-')
  if (!parts || parts.length !== 3) return iso ?? '—'
  const mes = MESES_CORTOS[parseInt(parts[1], 10) - 1] ?? parts[1]
  return `${parts[2]} ${mes} ${parts[0].slice(2)}`
}

// ── Cuenta de Cobro Modal ────────────────────────────────────────────────────

function CCModal({
  cotId,
  onClose,
}: {
  cotId: number
  onClose: () => void
}) {
  const [nombre, setNombre] = useState('')
  const [nit, setNit] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function handleDownload() {
    setLoading(true)
    setErr(null)
    try {
      await descargarCuentaCobro(cotId, nombre, nit)
      onClose()
    } catch {
      setErr('No se pudo generar. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onClose={onClose} title="Cuenta de cobro">
      <div>
        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-[10px] text-brand-text-secondary mb-1.5">Nombre del pagador *</label>
            <input
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Constructora XYZ S.A.S"
              autoFocus
              className="w-full bg-brand-input border border-brand-border rounded px-3 py-2.5 text-sm text-brand-text placeholder:text-brand-text-secondary outline-none focus:border-brand-primary/50 transition-all"
            />
          </div>
          <div>
            <label className="block text-[10px] text-brand-text-secondary mb-1.5">NIT / Cédula</label>
            <input
              value={nit}
              onChange={e => setNit(e.target.value)}
              placeholder="900.123.456-7"
              className="w-full bg-brand-input border border-brand-border rounded px-3 py-2.5 text-sm text-brand-text placeholder:text-brand-text-secondary outline-none focus:border-brand-primary/50 transition-all"
            />
          </div>
        </div>
        {err && <p className="text-xs text-brand-danger mb-3" role="alert">{err}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-brand-border text-sm text-brand-text-secondary hover:text-brand-text transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={loading || !nombre.trim()}
            className="flex-1 py-2.5 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:bg-brand-primary-light transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {loading ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : null}
            {loading ? 'Generando…' : 'Descargar PDF'}
          </button>
        </div>
      </div>
    </Dialog>
  )
}

// ── Row ───────────────────────────────────────────────────────────────────────

function HistorialRow({ row, index }: { row: CotizacionResumen; index: number }) {
  const [downloading, setDownloading] = useState(false)
  const [showCC, setShowCC] = useState(false)
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const navigate = useNavigate()
  const qc = useQueryClient()

  const deleteMut = useMutation({
    mutationFn: () => eliminarCotizacion(row.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['historial'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: () => setConfirmDelete(false),
  })

  const isAIU = row.numero?.startsWith('AIU')

  async function handleDownload() {
    setDownloading(true)
    try {
      if (isAIU) {
        await descargarPDFAiu(row.id)
      } else {
        await descargarPDF(row.id)
      }
    } finally {
      setDownloading(false)
    }
  }

  async function handleEdit() {
    setEditing(true)
    try {
      const { datos } = await getCotizacionDatos(row.id)
      const wizardInputs = (datos as Record<string, unknown>)._wizard_inputs
      if (wizardInputs) {
        navigate('/cotizacion', { state: { _wizard_inputs: wizardInputs } })
      } else {
        // Cotización antigua sin _wizard_inputs: abrir igual y dejar al usuario reconfigurar
        navigate('/cotizacion', { state: { _wizard_inputs: { proyecto: { nombre_cliente: row.cliente } } } })
      }
    } catch {
      setEditing(false)
    }
  }

  // Botones de acción reutilizados en ambas vistas
  const acciones = (
    <div className="flex items-center gap-0.5">
      <button
        onClick={handleDownload}
        disabled={downloading}
        title={isAIU ? 'Descargar Oferta AIU' : 'Descargar PDF'}
        className="w-8 h-8 flex items-center justify-center rounded-lg text-brand-text-secondary hover:text-brand-primary hover:bg-brand-primary/10 transition-all disabled:opacity-40"
      >
        {downloading ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
      </button>
      <div className="relative">
        <button
          onClick={() => setShowCC(v => !v)}
          title="Cuenta de Cobro PDF"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-brand-text-secondary hover:text-brand-primary hover:bg-brand-primary/10 transition-all"
        >
          <Receipt size={14} />
        </button>
        <AnimatePresence>
          {showCC && <CCModal cotId={row.id} onClose={() => setShowCC(false)} />}
        </AnimatePresence>
      </div>
      {!isAIU ? (
        <button
          onClick={handleEdit}
          disabled={editing}
          title="Editar cotización"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-brand-text-secondary hover:text-brand-primary hover:bg-brand-primary/10 transition-all disabled:opacity-40"
        >
          {editing ? <Loader2 size={14} className="animate-spin" /> : <Pencil size={14} />}
        </button>
      ) : (
        <div className="w-8 h-8" />
      )}
      <AnimatePresence mode="wait">
        {confirmDelete ? (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.1 }}
            className="flex items-center gap-0.5"
          >
            <button
              onClick={() => deleteMut.mutate()}
              disabled={deleteMut.isPending}
              title="Confirmar eliminación"
              className="w-7 h-7 flex items-center justify-center rounded-lg text-brand-danger hover:bg-brand-danger/15 transition-all disabled:opacity-40"
            >
              {deleteMut.isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              title="Cancelar"
              className="w-7 h-7 flex items-center justify-center rounded-lg text-brand-text-secondary hover:text-brand-text hover:bg-brand-surface/60 transition-all"
            >
              <X size={12} />
            </button>
          </motion.div>
        ) : (
          <motion.button
            key="trash"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setConfirmDelete(true)}
            title="Eliminar cotización"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-brand-text-secondary hover:text-brand-danger hover:bg-brand-danger/10 transition-all opacity-0 group-hover:opacity-100"
          >
            <Trash2 size={14} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      className="group"
    >
      {/* ── Tarjeta móvil ── */}
      <div className="sm:hidden px-4 py-3.5 hover:bg-brand-surface/20 transition-colors">
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <span className="font-mono text-xs text-brand-text flex items-center gap-1.5 min-w-0 pt-0.5">
            {isAIU && (
              <span className="shrink-0 px-1 py-0.5 rounded text-[8px] font-bold bg-brand-gold/15 text-brand-warning-text border border-brand-gold/40 leading-none">AIU</span>
            )}
            <span className="truncate">{row.numero}</span>
          </span>
          <EstadoBadge estado={row.estado} id={row.id} />
        </div>
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-brand-text font-medium truncate leading-tight">{row.cliente || '—'}</p>
            <p className="text-[10px] text-brand-text-secondary truncate mt-0.5">
              {row.material || (isAIU ? 'Obra Pública' : '—')} · {formatFecha(row.fecha)}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-mono text-sm text-brand-text tabular-nums">{formatCOP(row.precio)}</p>
            <div className="flex items-center justify-end mt-1">
              {acciones}
            </div>
          </div>
        </div>
      </div>

      {/* ── Fila desktop ── */}
      <div className="hidden sm:grid grid-cols-[1.6fr_2fr_0.9fr_1.3fr_1.1fr_150px] px-4 py-3 items-center hover:bg-brand-surface/20 transition-colors sm:min-w-[580px]">
        <span className="font-mono text-xs text-brand-text flex items-center gap-1.5 min-w-0">
          {isAIU && (
            <span className="shrink-0 px-1 py-0.5 rounded text-[8px] font-bold bg-brand-gold/15 text-brand-warning-text border border-brand-gold/40 leading-none">AIU</span>
          )}
          <span className="truncate">{row.numero}</span>
        </span>
        <div className="min-w-0 pr-2">
          <p className="text-sm text-brand-text truncate font-medium leading-tight">{row.cliente || '—'}</p>
          <p className="text-[10px] text-brand-text-secondary truncate mt-0.5">{row.material || (isAIU ? 'Obra Pública' : '—')}</p>
        </div>
        <span className="min-w-0 font-mono text-xs text-brand-text-secondary tabular-nums">{formatFecha(row.fecha)}</span>
        <div className="min-w-0">
          <p className="font-mono text-sm text-brand-text tabular-nums truncate">{formatCOP(row.precio)}</p>
          <p className="font-mono text-[10px] text-brand-text-secondary tabular-nums mt-0.5">{row.margen != null ? formatNum(row.margen, 1) : ''}%</p>
        </div>
        <EstadoBadge estado={row.estado} id={row.id} />
        <div className="ml-3">{acciones}</div>
      </div>
    </motion.div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HistorialPage() {
  const [busqueda, setBusqueda] = useState('')
  const [query, setQuery] = useState('')
  const [estado, setEstado] = useState('')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')

  const filtros: HistorialFiltros = {
    busqueda: query,
    estado,
    fecha_desde: fechaDesde,
    fecha_hasta: fechaHasta,
  }

  const { data = [], isPending, isError } = useQuery({
    queryKey: ['historial', query, estado, fechaDesde, fechaHasta],
    queryFn: () => listarCotizaciones(filtros),
  })

  const hayFiltrosActivos = !!(query || estado || fechaDesde || fechaHasta)

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setQuery(busqueda.trim())
  }

  function limpiarFiltros() {
    setBusqueda('')
    setQuery('')
    setEstado('')
    setFechaDesde('')
    setFechaHasta('')
  }

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto">
        <PageHeader
          kicker="Consultar"
          title="Historial"
          subtitle="Registro completo de proyectos cotizados"
        />

        {/* Search + filtros */}
        <form onSubmit={handleSearch} className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[220px]">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-text-secondary text-sm">⌕</span>
            <input
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar por cliente, número o material…"
              className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-brand-surface border border-brand-border text-sm text-brand-text placeholder:text-brand-text-secondary focus:outline-none focus:border-brand-primary/50 transition-colors"
            />
          </div>

          <select
            value={estado}
            onChange={e => setEstado(e.target.value)}
            className="px-3 py-2.5 rounded-lg bg-brand-surface border border-brand-border text-sm text-brand-text focus:outline-none focus:border-brand-primary/50 transition-colors"
          >
            <option value="">Todos los estados</option>
            {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
          </select>

          <input
            type="date"
            value={fechaDesde}
            onChange={e => setFechaDesde(e.target.value)}
            title="Desde"
            className="px-3 py-2.5 rounded-lg bg-brand-surface border border-brand-border text-sm text-brand-text focus:outline-none focus:border-brand-primary/50 transition-colors"
          />
          <input
            type="date"
            value={fechaHasta}
            onChange={e => setFechaHasta(e.target.value)}
            title="Hasta"
            className="px-3 py-2.5 rounded-lg bg-brand-surface border border-brand-border text-sm text-brand-text focus:outline-none focus:border-brand-primary/50 transition-colors"
          />

          <button
            type="submit"
            className="px-5 py-2.5 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:bg-brand-primary/90 transition-colors"
          >
            Buscar
          </button>
          {hayFiltrosActivos && (
            <button
              type="button"
              onClick={limpiarFiltros}
              aria-label="Limpiar filtros"
              title="Limpiar filtros"
              className="px-3 py-2.5 rounded-lg border border-brand-border text-sm text-brand-text-secondary hover:text-brand-text transition-colors"
            >
              ✕
            </button>
          )}
        </form>

        {/* Table */}
        {isPending ? (
          <div className="glass rounded-xl border border-brand-border p-12 text-center shadow-md transition-shadow hover:shadow-lg">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
              className="inline-block w-6 h-6 border-2 border-brand-muted/30 border-t-brand-primary rounded-full mb-3"
            />
            <p className="text-sm text-brand-text-secondary">Cargando historial…</p>
          </div>
        ) : isError ? (
          <div className="glass rounded-xl border border-brand-danger/20 p-8 text-center shadow-md transition-shadow hover:shadow-lg">
            <p className="text-brand-danger text-sm">Error al cargar el historial. Recarga la página.</p>
          </div>
        ) : data.length === 0 ? (
          <div className="glass rounded-xl border border-brand-border p-16 text-center shadow-md transition-shadow hover:shadow-lg">
            <div className="text-4xl mb-4 opacity-30">☰</div>
            <p className="text-brand-text-secondary text-sm">
              {hayFiltrosActivos ? 'Sin resultados para esos filtros.' : 'Aún no hay cotizaciones guardadas.'}
            </p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-xl border border-brand-border overflow-hidden shadow-md transition-shadow hover:shadow-lg"
          >
            <div className="overflow-x-auto">
              {/* Header — sólo visible en desktop */}
              <div className="hidden sm:grid grid-cols-[1.6fr_2fr_0.9fr_1.3fr_1.1fr_150px] px-4 py-3 border-b border-brand-border/60 bg-brand-surface/30 sm:min-w-[580px]">
                {['Número', 'Cliente · Material', 'Fecha', 'Precio · Margen', 'Estado', ''].map((h, i) => (
                  <span key={i} className="min-w-0 truncate text-[9px] tracking-[0.15em] uppercase text-brand-text-secondary font-semibold">
                    {h}
                  </span>
                ))}
              </div>

              {/* Rows */}
              <div className="divide-y divide-brand-border/30">
                {data.map((row: CotizacionResumen, i: number) => (
                  <HistorialRow key={row.id} row={row} index={i} />
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 border-t border-brand-border/40 bg-brand-surface/20">
              <span className="text-[10px] text-brand-text-secondary font-mono">
                {data.length} cotización{data.length !== 1 ? 'es' : ''}
              </span>
            </div>
          </motion.div>
        )}
      </div>
    </AppLayout>
  )
}
