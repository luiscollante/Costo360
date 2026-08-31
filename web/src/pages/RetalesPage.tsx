import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import AppLayout from '@/components/AppLayout'
import {
  listarRetales,
  crearRetal,
  actualizarRetal,
  eliminarRetal,
  type Retal,
  type RetalIn,
  type RetalUpdate,
} from '@/api/retales'
import { formatCOP, formatNum } from '@/lib/utils'
import { Plus, Pencil, Trash2, X, Layers } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'

const CATEGORIAS = ['Mármol', 'Granito', 'Sinterizado', 'Quartzstone', 'Quartzita']
const ESTADOS_RETAL = ['Disponible', 'Reservado', 'Usado']

const estadoConfig: Record<string, { color: string; dot: string; bg: string }> = {
  Disponible: { color: 'text-brand-primary', dot: 'bg-emerald-400', bg: 'bg-brand-primary/10 border-emerald-400/20' },
  Reservado:  { color: 'text-brand-warning-text',   dot: 'bg-amber-400',   bg: 'bg-amber-400/10 border-amber-400/20'   },
  Usado:      { color: 'text-brand-text-secondary', dot: 'bg-brand-muted', bg: 'bg-brand-surface border-brand-border'  },
}

type FormState = RetalIn & { estado: string }

const EMPTY_FORM: FormState = {
  material_categoria: 'Mármol',
  referencia: '',
  m2_disponibles: 0,
  notas: '',
  precio_recuperacion: 0,
  precio_mercado_m2: 0,
  estado: 'Disponible',
}

export default function RetalesPage() {
  const qc = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRetal, setEditingRetal] = useState<Retal | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const { data = [], isPending: isPendingQuery, isError } = useQuery({
    queryKey: ['retales'],
    queryFn: listarRetales,
  })

  const createMut = useMutation({
    mutationFn: (body: RetalIn) => crearRetal(body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['retales'] }); closeModal() },
  })

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: number; body: RetalUpdate }) => actualizarRetal(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['retales'] }); closeModal() },
  })

  const deleteMut = useMutation({
    mutationFn: eliminarRetal,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['retales'] }); setDeleteId(null) },
  })

  function openCreate() {
    setForm(EMPTY_FORM)
    setEditingRetal(null)
    setModalOpen(true)
  }

  function openEdit(retal: Retal) {
    setForm({
      material_categoria: retal.material_categoria,
      referencia: retal.referencia,
      m2_disponibles: retal.m2_disponibles,
      notas: retal.notas,
      precio_recuperacion: retal.precio_recuperacion,
      precio_mercado_m2: retal.precio_mercado_m2,
      estado: retal.estado,
    })
    setEditingRetal(retal)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingRetal(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (editingRetal) {
      const update: RetalUpdate = {
        m2_disponibles: form.m2_disponibles,
        estado: form.estado,
        notas: form.notas,
        precio_recuperacion: form.precio_recuperacion,
        precio_mercado_m2: form.precio_mercado_m2,
      }
      updateMut.mutate({ id: editingRetal.id, body: update })
    } else {
      const body: RetalIn = {
        material_categoria: form.material_categoria,
        referencia: form.referencia,
        m2_disponibles: form.m2_disponibles,
        notas: form.notas,
        precio_recuperacion: form.precio_recuperacion,
        precio_mercado_m2: form.precio_mercado_m2,
      }
      createMut.mutate(body)
    }
  }

  const isPending = createMut.isPending || updateMut.isPending

  const inputClass = 'w-full px-3 py-2.5 rounded-lg bg-brand-input border border-brand-border text-sm text-brand-text placeholder:text-brand-text-secondary focus:outline-none focus:border-brand-primary focus:shadow-[0_0_0_1px_#1F6F5440,0_0_12px_#1F6F5418] transition-all'

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto">
        <PageHeader
          kicker="Taller"
          title="Retales"
          subtitle="Sobrantes de losas disponibles para reutilización"
          actions={
            <button
              type="button"
              onClick={openCreate}
              className="flex items-center gap-2 whitespace-nowrap rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-primary-light cursor-pointer"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              Agregar retal
            </button>
          }
        />

        {/* Table */}
        {isPendingQuery ? (
          <div role="status" className="rounded-xl border border-brand-border bg-brand-surface p-12 text-center">
            <span className="mx-auto mb-3 inline-block h-6 w-6 animate-spin rounded-full border-2 border-brand-border border-t-brand-primary" aria-hidden="true" />
            <p className="text-sm text-brand-text-secondary">Cargando retales…</p>
          </div>
        ) : isError ? (
          <div className="glass rounded-xl border border-brand-danger/30 p-8 text-center shadow-md transition-shadow hover:shadow-lg">
            <p className="text-brand-danger text-sm">Error al cargar los retales. Recarga la página.</p>
          </div>
        ) : data.length === 0 ? (
          <div className="glass rounded-xl border border-brand-border p-16 text-center shadow-md transition-shadow hover:shadow-lg">
            <Layers className="w-10 h-10 text-brand-text-secondary mx-auto mb-4" />
            <p className="text-brand-text-secondary text-sm mb-2">No hay retales registrados</p>
            <button onClick={openCreate} className="text-brand-text-secondary hover:text-brand-primary text-sm hover:underline cursor-pointer">
              Agregar el primer retal →
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
              <div className="hidden sm:grid grid-cols-[1.5fr_1.5fr_1fr_0.9fr_1fr_1fr_80px] px-4 py-3 border-b border-brand-border/60 bg-brand-surface/30 sm:min-w-[520px]">
                {['Material', 'Referencia', 'M² disponibles', 'Estado', 'Valor recuperado', 'Precio de mercado', ''].map((h) => (
                  <span key={h} className="text-[9px] tracking-[0.15em] uppercase text-brand-text-secondary font-semibold">{h}</span>
                ))}
              </div>

              {/* Rows */}
              <div className="divide-y divide-brand-border/30">
              {data.map((r: Retal, i: number) => {
                const cfg = estadoConfig[r.estado] ?? estadoConfig.Usado
                const acciones = (
                  <div className="flex items-center gap-0.5">
                    <button onClick={() => openEdit(r)} title="Editar"
                      className="w-9 h-9 flex items-center justify-center rounded-lg text-brand-text-secondary hover:text-brand-text hover:bg-brand-surface/60 transition-colors cursor-pointer">
                      <Pencil className="w-4 h-4" />
                    </button>
                    {deleteId === r.id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => deleteMut.mutate(r.id)} disabled={deleteMut.isPending}
                          className="px-2 py-1 rounded text-[10px] bg-red-500/20 text-brand-danger border border-brand-danger/30 hover:bg-red-500/30 transition-colors cursor-pointer disabled:opacity-60">
                          {deleteMut.isPending ? '…' : 'Confirmar'}
                        </button>
                        <button onClick={() => setDeleteId(null)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-brand-text-secondary cursor-pointer">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteId(r.id)} title="Eliminar"
                        className="w-9 h-9 flex items-center justify-center rounded-lg text-brand-text-secondary hover:text-brand-danger hover:bg-red-500/10 transition-colors cursor-pointer">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )
                return (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    {/* Tarjeta móvil */}
                    <div className="sm:hidden px-4 py-3.5 hover:bg-brand-surface/20 transition-colors">
                      <div className="flex items-start justify-between gap-2 mb-2.5">
                        <div className="min-w-0">
                          <p className="text-sm text-brand-text font-medium leading-tight">{r.material_categoria}</p>
                          <p className="text-[10px] text-brand-text-secondary mt-0.5">{r.referencia || '—'}</p>
                        </div>
                        <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cfg.bg} ${cfg.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                          {r.estado}
                        </span>
                      </div>
                      <div className="flex items-end justify-between gap-2">
                        <div className="text-[11px] space-y-0.5 text-brand-text-secondary">
                          <p><span className="text-brand-text-secondary">M² disponibles: </span><span className="font-mono text-brand-text">{formatNum(r.m2_disponibles)}</span></p>
                          {r.precio_recuperacion > 0 && <p><span className="text-brand-text-secondary">Valor recuperado: </span><span className="font-mono">{formatCOP(r.precio_recuperacion)}</span></p>}
                          {r.precio_mercado_m2 > 0 && <p><span className="text-brand-text-secondary">Precio de mercado: </span><span className="font-mono">{formatCOP(r.precio_mercado_m2)}/m²</span></p>}
                        </div>
                        {acciones}
                      </div>
                    </div>

                    {/* Fila desktop */}
                    <div className="hidden sm:grid grid-cols-[1.5fr_1.5fr_1fr_0.9fr_1fr_1fr_80px] px-4 py-3.5 items-center hover:bg-brand-surface/20 transition-colors sm:min-w-[520px]">
                      <span className="text-sm text-brand-text font-medium truncate">{r.material_categoria}</span>
                      <span className="text-sm text-brand-text-secondary truncate">{r.referencia || '—'}</span>
                      <span className="font-mono text-sm text-brand-text">{formatNum(r.m2_disponibles)}</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border w-fit ${cfg.bg} ${cfg.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                        {r.estado}
                      </span>
                      <span className="font-mono text-xs text-brand-text-secondary">{r.precio_recuperacion > 0 ? formatCOP(r.precio_recuperacion) : '—'}</span>
                      <span className="font-mono text-xs text-brand-text-secondary">{r.precio_mercado_m2 > 0 ? `${formatCOP(r.precio_mercado_m2)}/m²` : '—'}</span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(r)} title="Editar"
                          className="p-1.5 rounded-lg text-brand-text-secondary hover:text-brand-text hover:bg-brand-surface/60 transition-colors cursor-pointer">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {deleteId === r.id ? (
                          <div className="flex items-center gap-1">
                            <button onClick={() => deleteMut.mutate(r.id)} disabled={deleteMut.isPending}
                              className="px-2 py-1 rounded text-[10px] bg-red-500/20 text-brand-danger border border-brand-danger/30 hover:bg-red-500/30 transition-colors cursor-pointer disabled:opacity-60">
                              {deleteMut.isPending ? '…' : 'Confirmar'}
                            </button>
                            <button onClick={() => setDeleteId(null)}
                              className="p-1 rounded text-brand-text-secondary hover:text-brand-text cursor-pointer">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => setDeleteId(r.id)} title="Eliminar"
                            className="p-1.5 rounded-lg text-brand-text-secondary hover:text-brand-danger hover:bg-red-500/10 transition-colors cursor-pointer">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 border-t border-brand-border/40 bg-brand-surface/20">
              <span className="text-[10px] text-brand-text-secondary font-mono">
                {data.length} retal{data.length !== 1 ? 'es' : ''}
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
              className="glass rounded-2xl border border-brand-border w-full max-w-lg p-6"
            >
              {/* Modal header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-brand-text">
                  {editingRetal ? 'Editar retal' : 'Agregar retal'}
                </h2>
                <button
                  onClick={closeModal}
                  className="p-1.5 rounded-lg text-brand-text-secondary hover:text-brand-text transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Material + Referencia: solo en creación */}
                {!editingRetal && (
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
                        value={form.referencia ?? ''}
                        onChange={(e) => setForm((f) => ({ ...f, referencia: e.target.value }))}
                        placeholder="Ej: Blanco Ibiza…"
                        className={inputClass}
                      />
                    </div>
                  </div>
                )}

                {/* m² disponibles */}
                <div>
                  <label className="block text-[10px] font-semibold text-brand-text-secondary mb-1.5 uppercase tracking-wide">m² disponibles</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.m2_disponibles}
                    onChange={(e) => setForm((f) => ({ ...f, m2_disponibles: parseFloat(e.target.value) || 0 }))}
                    required
                    className={inputClass + ' font-mono'}
                  />
                </div>

                {/* Precios */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-brand-text-secondary mb-1.5 uppercase tracking-wide">Valor recuperado (total)</label>
                    <input
                      type="number"
                      min="0"
                      value={form.precio_recuperacion ?? 0}
                      onChange={(e) => setForm((f) => ({ ...f, precio_recuperacion: parseFloat(e.target.value) || 0 }))}
                      className={inputClass + ' font-mono'}
                    />
                    <p className="text-[10px] text-brand-text-secondary mt-1 leading-snug">Cuánto vale este retal en total para tus registros de costos (no es por m²).</p>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-brand-text-secondary mb-1.5 uppercase tracking-wide">Precio de mercado (por m²)</label>
                    <input
                      type="number"
                      min="0"
                      value={form.precio_mercado_m2 ?? 0}
                      onChange={(e) => setForm((f) => ({ ...f, precio_mercado_m2: parseFloat(e.target.value) || 0 }))}
                      className={inputClass + ' font-mono'}
                    />
                    <p className="text-[10px] text-brand-text-secondary mt-1 leading-snug">Precio de referencia del material por m², para decidir si conviene venderlo.</p>
                  </div>
                </div>

                {/* Estado: solo en edición */}
                {editingRetal && (
                  <div>
                    <label className="block text-[10px] font-semibold text-brand-text-secondary mb-1.5 uppercase tracking-wide">Estado</label>
                    <select
                      value={form.estado}
                      onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value }))}
                      className={inputClass}
                    >
                      {ESTADOS_RETAL.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                )}

                {/* Notas */}
                <div>
                  <label className="block text-[10px] font-semibold text-brand-text-secondary mb-1.5 uppercase tracking-wide">Notas</label>
                  <textarea
                    value={form.notas ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))}
                    rows={2}
                    placeholder="Observaciones sobre el retal…"
                    className={inputClass + ' resize-none'}
                  />
                </div>

                {/* Actions */}
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
                    {isPending ? 'Guardando…' : editingRetal ? 'Guardar cambios' : 'Agregar retal'}
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
