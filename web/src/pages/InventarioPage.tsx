import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import AppLayout from '@/components/AppLayout'
import {
  listarInventario,
  crearLamina,
  actualizarLamina,
  eliminarLamina,
  type Lamina,
  type LaminaIn,
  type LaminaUpdate,
} from '@/api/inventario'
import { formatCOP } from '@/lib/utils'
import { Plus, Pencil, Trash2, X, Boxes, Minus, AlertTriangle } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Badge } from '@/components/ui/Badge'

const CATEGORIAS = ['Mármol', 'Granito', 'Sinterizado', 'Quartzstone', 'Quartzita']

type FormState = Required<Pick<LaminaIn,
  'material_categoria' | 'referencia' | 'cantidad_laminas' | 'costo_unitario' |
  'stock_minimo' | 'proveedor' | 'ubicacion' | 'notas'
>> & { ancho_cm: number | null; alto_cm: number | null; espesor_cm: number | null }

const EMPTY_FORM: FormState = {
  material_categoria: 'Mármol',
  referencia: '',
  cantidad_laminas: 0,
  ancho_cm: null,
  alto_cm: null,
  espesor_cm: null,
  costo_unitario: 0,
  stock_minimo: 2,
  proveedor: '',
  ubicacion: '',
  notas: '',
}

export default function InventarioPage() {
  const qc = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Lamina | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const { data = [], isPending: isPendingQuery, isError } = useQuery({
    queryKey: ['inventario'],
    queryFn: listarInventario,
  })

  const createMut = useMutation({
    mutationFn: (body: LaminaIn) => crearLamina(body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['inventario'] }); closeModal() },
  })

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: number; body: LaminaUpdate }) => actualizarLamina(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['inventario'] }); closeModal() },
  })

  const stockMut = useMutation({
    mutationFn: ({ id, body }: { id: number; body: LaminaUpdate }) => actualizarLamina(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventario'] }),
  })

  const deleteMut = useMutation({
    mutationFn: eliminarLamina,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['inventario'] }); setDeleteId(null) },
  })

  function openCreate() {
    setForm(EMPTY_FORM)
    setEditing(null)
    setModalOpen(true)
  }

  function openEdit(l: Lamina) {
    setForm({
      material_categoria: l.material_categoria,
      referencia: l.referencia,
      cantidad_laminas: l.cantidad_laminas,
      ancho_cm: l.ancho_cm,
      alto_cm: l.alto_cm,
      espesor_cm: l.espesor_cm,
      costo_unitario: l.costo_unitario,
      stock_minimo: l.stock_minimo,
      proveedor: l.proveedor,
      ubicacion: l.ubicacion,
      notas: l.notas,
    })
    setEditing(l)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditing(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (editing) {
      updateMut.mutate({ id: editing.id, body: form })
    } else {
      createMut.mutate(form)
    }
  }

  function ajustarStock(l: Lamina, delta: number) {
    const nueva = Math.max(0, l.cantidad_laminas + delta)
    stockMut.mutate({ id: l.id, body: { cantidad_laminas: nueva } })
  }

  const isPending = createMut.isPending || updateMut.isPending
  const bajoStockCount = data.filter((l) => l.cantidad_laminas <= l.stock_minimo).length

  const inputClass = 'w-full px-3 py-2.5 rounded-lg bg-brand-input border border-brand-border text-sm text-brand-text placeholder:text-brand-text-secondary focus:outline-none focus:border-brand-primary focus:shadow-[0_0_0_1px_#1F6F5440,0_0_12px_#1F6F5418] transition-all'

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto">
        <PageHeader
          kicker="Taller"
          title="Inventario"
          subtitle="Stock físico de láminas por material y referencia"
          actions={
            <>
              {bajoStockCount > 0 && (
                <Badge tono="warning" icon={<AlertTriangle size={11} />}>
                  {bajoStockCount} en stock bajo
                </Badge>
              )}
              <button
                type="button"
                onClick={openCreate}
                className="flex items-center gap-2 whitespace-nowrap rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-primary-light cursor-pointer"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                Agregar lámina
              </button>
            </>
          }
        />

        {/* Table */}
        {isPendingQuery ? (
          <div role="status" className="rounded-xl border border-brand-border bg-brand-surface p-12 text-center">
            <span className="mx-auto mb-3 inline-block h-6 w-6 animate-spin rounded-full border-2 border-brand-border border-t-brand-primary" aria-hidden="true" />
            <p className="text-sm text-brand-text-secondary">Cargando inventario…</p>
          </div>
        ) : isError ? (
          <div className="glass rounded-xl border border-brand-danger/30 p-8 text-center shadow-md transition-shadow hover:shadow-lg">
            <p className="text-brand-danger text-sm">Error al cargar el inventario. Recarga la página.</p>
          </div>
        ) : data.length === 0 ? (
          <div className="glass rounded-xl border border-brand-border p-16 text-center shadow-md transition-shadow hover:shadow-lg">
            <Boxes className="w-10 h-10 text-brand-text-secondary mx-auto mb-4" />
            <p className="text-brand-text-secondary text-sm mb-2">No hay láminas registradas</p>
            <button onClick={openCreate} className="text-brand-text-secondary hover:text-brand-primary text-sm hover:underline cursor-pointer">
              Agregar la primera lámina →
            </button>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-xl border border-brand-border overflow-hidden shadow-md transition-shadow hover:shadow-lg"
          >
            <div className="overflow-x-auto">
              {/* Header — solo desktop */}
              <div className="hidden sm:grid grid-cols-[1.3fr_1.3fr_1fr_1fr_1fr_1fr_100px] px-4 py-3 border-b border-brand-border/60 bg-brand-surface/30 sm:min-w-[640px]">
                {['Material', 'Referencia', 'Stock', 'Costo/lámina', 'Ubicación', 'Proveedor', ''].map((h) => (
                  <span key={h} className="text-[9px] tracking-[0.15em] uppercase text-brand-text-secondary font-semibold">{h}</span>
                ))}
              </div>

              <div className="divide-y divide-brand-border/30">
                {data.map((l: Lamina, i: number) => {
                  const bajoStock = l.cantidad_laminas <= l.stock_minimo
                  const acciones = (
                    <div className="flex items-center gap-0.5">
                      <button onClick={() => openEdit(l)} title="Editar"
                        className="w-9 h-9 flex items-center justify-center rounded-lg text-brand-text-secondary hover:text-brand-text hover:bg-brand-surface/60 transition-colors cursor-pointer">
                        <Pencil className="w-4 h-4" />
                      </button>
                      {deleteId === l.id ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => deleteMut.mutate(l.id)} disabled={deleteMut.isPending}
                            className="px-2 py-1 rounded text-[10px] bg-red-500/20 text-brand-danger border border-brand-danger/30 hover:bg-red-500/30 transition-colors cursor-pointer disabled:opacity-60">
                            {deleteMut.isPending ? '…' : 'Confirmar'}
                          </button>
                          <button onClick={() => setDeleteId(null)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-brand-text-secondary cursor-pointer">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setDeleteId(l.id)} title="Eliminar"
                          className="w-9 h-9 flex items-center justify-center rounded-lg text-brand-text-secondary hover:text-brand-danger hover:bg-red-500/10 transition-colors cursor-pointer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )
                  const stockControl = (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => ajustarStock(l, -1)}
                        disabled={stockMut.isPending || l.cantidad_laminas <= 0}
                        className="w-6 h-6 flex items-center justify-center rounded-md border border-brand-border text-brand-text-secondary hover:text-brand-text hover:bg-brand-surface/60 disabled:opacity-40 transition-colors cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className={`font-mono text-sm w-6 text-center ${bajoStock ? 'text-brand-warning-text font-semibold' : 'text-brand-text'}`}>
                        {l.cantidad_laminas}
                      </span>
                      <button
                        onClick={() => ajustarStock(l, 1)}
                        disabled={stockMut.isPending}
                        className="w-6 h-6 flex items-center justify-center rounded-md border border-brand-border text-brand-text-secondary hover:text-brand-text hover:bg-brand-surface/60 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  )
                  return (
                    <motion.div
                      key={l.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                    >
                      {/* Tarjeta móvil */}
                      <div className="sm:hidden px-4 py-3.5 hover:bg-brand-surface/20 transition-colors">
                        <div className="flex items-start justify-between gap-2 mb-2.5">
                          <div className="min-w-0">
                            <p className="text-sm text-brand-text font-medium leading-tight">{l.material_categoria}</p>
                            <p className="text-[10px] text-brand-text-secondary mt-0.5">{l.referencia || '—'}</p>
                          </div>
                          {bajoStock && (
                            <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-amber-400/10 border-amber-400/20 text-brand-warning-text">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              Bajo
                            </span>
                          )}
                        </div>
                        <div className="flex items-end justify-between gap-2">
                          <div className="text-[11px] space-y-1 text-brand-text-secondary">
                            {stockControl}
                            {l.costo_unitario > 0 && <p><span className="text-brand-text-secondary">Costo: </span><span className="font-mono">{formatCOP(l.costo_unitario)}</span></p>}
                            {l.ubicacion && <p><span className="text-brand-text-secondary">Ubicación: </span>{l.ubicacion}</p>}
                          </div>
                          {acciones}
                        </div>
                      </div>

                      {/* Fila desktop */}
                      <div className="hidden sm:grid grid-cols-[1.3fr_1.3fr_1fr_1fr_1fr_1fr_100px] px-4 py-3.5 items-center hover:bg-brand-surface/20 transition-colors sm:min-w-[640px]">
                        <span className="text-sm text-brand-text font-medium truncate flex items-center gap-1.5">
                          {l.material_categoria}
                          {bajoStock && <AlertTriangle className="w-3 h-3 text-brand-warning-text shrink-0" />}
                        </span>
                        <span className="text-sm text-brand-text-secondary truncate">{l.referencia || '—'}</span>
                        {stockControl}
                        <span className="font-mono text-xs text-brand-text-secondary">{l.costo_unitario > 0 ? formatCOP(l.costo_unitario) : '—'}</span>
                        <span className="text-xs text-brand-text-secondary truncate">{l.ubicacion || '—'}</span>
                        <span className="text-xs text-brand-text-secondary truncate">{l.proveedor || '—'}</span>
                        {acciones}
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 border-t border-brand-border/40 bg-brand-surface/20">
              <span className="text-[10px] text-brand-text-secondary font-mono">
                {data.length} referencia{data.length !== 1 ? 's' : ''} · {data.reduce((s, l) => s + l.cantidad_laminas, 0)} láminas en total
              </span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Modal add/edit */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget) closeModal() }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.18 }}
              className="glass rounded-2xl border border-brand-border w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-brand-text">
                  {editing ? 'Editar lámina' : 'Agregar lámina'}
                </h2>
                <button
                  onClick={closeModal}
                  className="p-1.5 rounded-lg text-brand-text-secondary hover:text-brand-text transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-brand-text-secondary mb-1.5 uppercase tracking-wide">Material</label>
                    <select
                      value={form.material_categoria}
                      onChange={(e) => setForm((f) => ({ ...f, material_categoria: e.target.value }))}
                      className={inputClass}
                    >
                      {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-brand-text-secondary mb-1.5 uppercase tracking-wide">Referencia</label>
                    <input
                      type="text"
                      value={form.referencia}
                      onChange={(e) => setForm((f) => ({ ...f, referencia: e.target.value }))}
                      placeholder="Ej: Blanco Ibiza…"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-brand-text-secondary mb-1.5 uppercase tracking-wide">Cantidad de láminas</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={form.cantidad_laminas}
                      onChange={(e) => setForm((f) => ({ ...f, cantidad_laminas: parseInt(e.target.value) || 0 }))}
                      className={inputClass + ' font-mono'}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-brand-text-secondary mb-1.5 uppercase tracking-wide">Stock mínimo (alerta)</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={form.stock_minimo}
                      onChange={(e) => setForm((f) => ({ ...f, stock_minimo: parseInt(e.target.value) || 0 }))}
                      className={inputClass + ' font-mono'}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-brand-text-secondary mb-1.5 uppercase tracking-wide">Ancho (cm)</label>
                    <input
                      type="number" min="0" step="0.1"
                      value={form.ancho_cm ?? ''}
                      onChange={(e) => setForm((f) => ({ ...f, ancho_cm: e.target.value ? parseFloat(e.target.value) : null }))}
                      className={inputClass + ' font-mono'}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-brand-text-secondary mb-1.5 uppercase tracking-wide">Alto (cm)</label>
                    <input
                      type="number" min="0" step="0.1"
                      value={form.alto_cm ?? ''}
                      onChange={(e) => setForm((f) => ({ ...f, alto_cm: e.target.value ? parseFloat(e.target.value) : null }))}
                      className={inputClass + ' font-mono'}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-brand-text-secondary mb-1.5 uppercase tracking-wide">Espesor (cm)</label>
                    <input
                      type="number" min="0" step="0.1"
                      value={form.espesor_cm ?? ''}
                      onChange={(e) => setForm((f) => ({ ...f, espesor_cm: e.target.value ? parseFloat(e.target.value) : null }))}
                      className={inputClass + ' font-mono'}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-brand-text-secondary mb-1.5 uppercase tracking-wide">Costo por lámina</label>
                  <input
                    type="number" min="0"
                    value={form.costo_unitario}
                    onChange={(e) => setForm((f) => ({ ...f, costo_unitario: parseFloat(e.target.value) || 0 }))}
                    className={inputClass + ' font-mono'}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-brand-text-secondary mb-1.5 uppercase tracking-wide">Ubicación en bodega</label>
                    <input
                      type="text"
                      value={form.ubicacion}
                      onChange={(e) => setForm((f) => ({ ...f, ubicacion: e.target.value }))}
                      placeholder="Ej: Estante 3, fila B"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-brand-text-secondary mb-1.5 uppercase tracking-wide">Proveedor</label>
                    <input
                      type="text"
                      value={form.proveedor}
                      onChange={(e) => setForm((f) => ({ ...f, proveedor: e.target.value }))}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-brand-text-secondary mb-1.5 uppercase tracking-wide">Notas</label>
                  <textarea
                    value={form.notas}
                    onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))}
                    rows={2}
                    placeholder="Observaciones sobre esta referencia…"
                    className={inputClass + ' resize-none'}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-1">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 rounded-lg border border-brand-border text-sm text-brand-text-secondary hover:text-brand-text transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="px-5 py-2 rounded-lg bg-brand-primary text-white text-sm font-semibold shadow-[0_0_24px_#1F6F5428,0_0_0_1px_#1F6F5440] hover:shadow-[0_0_40px_#1F6F5445,0_0_0_1px_#1F6F5470] disabled:opacity-60 disabled:shadow-none transition-all duration-200 cursor-pointer"
                  >
                    {isPending ? 'Guardando…' : editing ? 'Guardar cambios' : 'Agregar lámina'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppLayout>
  )
}
