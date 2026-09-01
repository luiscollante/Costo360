import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Check, X, Trash2 } from 'lucide-react'
import AppLayout from '@/components/AppLayout'
import {
  getMaterialesTodos,
  crearMaterial,
  editarMaterial,
  eliminarMaterial,
  type MaterialCatalogo,
  type MaterialCambios,
} from '@/api/materiales'
import { formatCOP } from '@/lib/utils'
import { showToast } from '@/lib/toast'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Dialog } from '@/components/ui/Dialog'
import { AsyncBoundary } from '@/components/ui/AsyncBoundary'
import { EmptyState } from '@/components/ui/EmptyState'

const CATEGORIAS = ['Mármol', 'Granito', 'Sinterizado', 'Quartzstone', 'Quartzita']

const inputCls =
  'w-full rounded-lg border border-brand-border bg-brand-input px-3 py-2.5 text-sm text-brand-text placeholder:text-brand-text-secondary outline-none focus-visible:border-brand-primary'
const cellInputCls =
  'w-full rounded-md border border-brand-primary/40 bg-brand-input px-2 py-1.5 text-sm text-brand-text outline-none focus-visible:border-brand-primary'

type FormState = { categoria: string; referencia: string; precio_m2: string }
const EMPTY: FormState = { categoria: 'Mármol', referencia: '', precio_m2: '' }

function errDetalle(err: unknown, fallback: string): string {
  const d = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
  return typeof d === 'string' ? d : fallback
}

export default function MaterialesPage() {
  const qc = useQueryClient()
  const [filtroCat, setFiltroCat] = useState('')
  const [busca, setBusca] = useState('')
  const [modalCrear, setModalCrear] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [editId, setEditId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<FormState>(EMPTY)
  const [borrar, setBorrar] = useState<MaterialCatalogo | null>(null)

  const { data = [], isPending, isError, refetch } = useQuery({
    queryKey: ['materiales-todos'],
    queryFn: getMaterialesTodos,
  })

  // Espera a que la lista vuelva a leerse ANTES de cerrar la edición / avisar,
  // para que nunca se vea el valor viejo mientras el toast dice "guardado".
  const invalidar = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ['materiales-todos'] }),
      qc.invalidateQueries({ queryKey: ['materiales'] }),
    ])

  const crearMut = useMutation({
    mutationFn: () =>
      crearMaterial({ categoria: form.categoria, referencia: form.referencia.trim(), precio_m2: Number(form.precio_m2) || 0 }),
    onSuccess: async () => { await invalidar(); setModalCrear(false); showToast('success', 'Material agregado a tu catálogo') },
    onError: (e) => showToast('error', errDetalle(e, 'No se pudo agregar el material')),
  })

  const editMut = useMutation({
    mutationFn: (vars: { id: number; body: MaterialCambios }) => editarMaterial(vars.id, vars.body),
    onSuccess: async () => { await invalidar(); setEditId(null); showToast('success', 'Cambio guardado — solo aplica a tu taller') },
    onError: (e) => showToast('error', errDetalle(e, 'No se pudo guardar el cambio')),
  })

  const delMut = useMutation({
    mutationFn: (id: number) => eliminarMaterial(id),
    onSuccess: async () => { await invalidar(); setBorrar(null); setEditId(null); showToast('success', 'Material quitado de tu catálogo') },
    onError: (e) => showToast('error', errDetalle(e, 'No se pudo quitar')),
  })

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return data.filter(
      (m) =>
        (!filtroCat || m.categoria === filtroCat) &&
        (!q || m.referencia.toLowerCase().includes(q)),
    )
  }, [data, filtroCat, busca])

  const propios = data.filter((m) => m.es_propio).length

  function abrirCrear() {
    setForm(EMPTY)
    setModalCrear(true)
  }
  function iniciarEdicion(m: MaterialCatalogo) {
    setEditForm({ categoria: m.categoria, referencia: m.referencia, precio_m2: String(m.precio_m2) })
    setEditId(m.id)
  }
  function guardarEdicion() {
    if (editId == null) return
    if (!editForm.referencia.trim() || Number(editForm.precio_m2) <= 0) return
    editMut.mutate({
      id: editId,
      body: {
        categoria: editForm.categoria,
        referencia: editForm.referencia.trim(),
        precio_m2: Number(editForm.precio_m2),
      },
    })
  }

  const crearValido = form.referencia.trim().length > 0 && Number(form.precio_m2) > 0

  return (
    <AppLayout>
      <PageHeader
        kicker="Sistema"
        title="Catálogo de materiales"
        subtitle="Ajusta categoría, nombre o precio. Los cambios valen solo para tu taller y todos sus usuarios los ven en vivo."
        actions={
          <button
            type="button"
            onClick={abrirCrear}
            className="flex items-center gap-2 whitespace-nowrap rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-primary-light cursor-pointer"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Agregar material
          </button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nombre…"
          aria-label="Buscar material"
          className={`${inputCls} max-w-xs`}
        />
        <select
          value={filtroCat}
          onChange={(e) => setFiltroCat(e.target.value)}
          aria-label="Filtrar por categoría"
          className={`${inputCls} max-w-[180px] cursor-pointer`}
        >
          <option value="">Todas las categorías</option>
          {CATEGORIAS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        {propios > 0 && (
          <span className="flex items-center">
            <Badge tono="gold">{propios} personalizado{propios === 1 ? '' : 's'}</Badge>
          </span>
        )}
      </div>

      <AsyncBoundary isPending={isPending} isError={isError} onRetry={() => refetch()}>
        {filtrados.length === 0 ? (
          <Card className="p-2">
            <EmptyState
              title="No hay materiales que coincidan"
              action={
                <button type="button" onClick={abrirCrear} className="text-sm font-semibold text-brand-primary hover:underline cursor-pointer">
                  Agregar el primero →
                </button>
              }
            />
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <caption className="sr-only">
                  Catálogo de materiales del taller. Selecciona una fila para editar categoría, nombre o precio.
                </caption>
                <thead>
                  <tr className="border-b border-brand-border text-left">
                    <th scope="col" className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-brand-text-secondary">Categoría</th>
                    <th scope="col" className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-brand-text-secondary">Referencia</th>
                    <th scope="col" className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-brand-text-secondary">Precio / m²</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((m) => {
                    const enEdicion = editId === m.id
                    if (enEdicion) {
                      return (
                        <tr key={m.id} className="border-b border-brand-border/60 bg-brand-primary/[0.04] last:border-0">
                          <td className="px-4 py-3 align-top">
                            <select
                              value={editForm.categoria}
                              onChange={(e) => setEditForm((f) => ({ ...f, categoria: e.target.value }))}
                              aria-label="Categoría"
                              className={`${cellInputCls} cursor-pointer`}
                            >
                              {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <input
                              type="text"
                              value={editForm.referencia}
                              autoFocus
                              onChange={(e) => setEditForm((f) => ({ ...f, referencia: e.target.value }))}
                              onKeyDown={(e) => { if (e.key === 'Enter') guardarEdicion(); if (e.key === 'Escape') setEditId(null) }}
                              aria-label="Referencia o nombre"
                              className={cellInputCls}
                            />
                          </td>
                          <td className="px-4 py-3 align-top">
                            <div className="flex flex-col items-end gap-2">
                              <input
                                type="number"
                                min={0}
                                step={1000}
                                value={editForm.precio_m2}
                                onChange={(e) => setEditForm((f) => ({ ...f, precio_m2: e.target.value }))}
                                onKeyDown={(e) => { if (e.key === 'Enter') guardarEdicion(); if (e.key === 'Escape') setEditId(null) }}
                                aria-label="Precio por metro cuadrado"
                                className={`${cellInputCls} text-right font-mono`}
                              />
                              <div className="flex items-center gap-1.5">
                                {m.es_propio && (
                                  <button
                                    type="button"
                                    onClick={() => setBorrar(m)}
                                    aria-label={`Quitar ${m.referencia} de tu catálogo`}
                                    className="mr-1 flex items-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-medium text-brand-text-secondary hover:bg-brand-danger-soft hover:text-brand-danger transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                    Quitar
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setEditId(null)}
                                  aria-label="Cancelar edición"
                                  className="rounded-md border border-brand-border p-1.5 text-brand-text-secondary hover:text-brand-text transition-colors cursor-pointer"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={guardarEdicion}
                                  disabled={editMut.isPending || !editForm.referencia.trim() || Number(editForm.precio_m2) <= 0}
                                  aria-label="Guardar cambio"
                                  className="flex items-center gap-1 rounded-md bg-brand-primary px-2.5 py-1.5 text-[12px] font-semibold text-white hover:bg-brand-primary-light transition-colors disabled:opacity-50 cursor-pointer"
                                >
                                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                                  {editMut.isPending ? '…' : 'Guardar'}
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )
                    }
                    return (
                      <tr key={m.id} className="border-b border-brand-border/60 last:border-0 hover:bg-brand-bg">
                        <td className="px-4 py-3 text-brand-text-secondary">{m.categoria}</td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => iniciarEdicion(m)}
                            className="text-left font-medium text-brand-text-dark hover:text-brand-primary hover:underline cursor-pointer"
                            aria-label={`Editar ${m.referencia}`}
                          >
                            {m.referencia}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => iniciarEdicion(m)}
                            className="font-mono text-brand-text-dark hover:text-brand-primary cursor-pointer num"
                            aria-label={`Editar precio de ${m.referencia}`}
                          >
                            {formatCOP(m.precio_m2)}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </AsyncBoundary>

      {/* Agregar material nuevo */}
      <Dialog open={modalCrear} onClose={() => setModalCrear(false)} title="Agregar material a tu catálogo">
        <div className="space-y-3">
          <div>
            <label htmlFor="mat-cat" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-brand-text-secondary">Categoría</label>
            <select
              id="mat-cat"
              value={form.categoria}
              onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))}
              className={`${inputCls} cursor-pointer`}
            >
              {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="mat-ref" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-brand-text-secondary">Referencia / nombre</label>
            <input id="mat-ref" type="text" value={form.referencia} autoFocus
              onChange={(e) => setForm((f) => ({ ...f, referencia: e.target.value }))}
              placeholder="Ej. Blanco Carrara pulido" className={inputCls} />
          </div>
          <div>
            <label htmlFor="mat-precio" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-brand-text-secondary">Precio / m² (COP)</label>
            <input id="mat-precio" type="number" min={0} step={1000} value={form.precio_m2}
              onChange={(e) => setForm((f) => ({ ...f, precio_m2: e.target.value }))}
              placeholder="280000" className={`${inputCls} font-mono`} />
          </div>
        </div>
        <div className="mt-5 flex gap-2">
          <button type="button" onClick={() => setModalCrear(false)}
            className="flex-1 rounded-lg border border-brand-border py-2.5 text-sm font-medium text-brand-text-secondary hover:bg-brand-bg hover:text-brand-text transition-colors cursor-pointer">
            Cancelar
          </button>
          <button
            type="button"
            disabled={!crearValido || crearMut.isPending}
            onClick={() => crearMut.mutate()}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-primary py-2.5 text-sm font-semibold text-white hover:bg-brand-primary-light transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Check size={14} aria-hidden="true" />
            {crearMut.isPending ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </Dialog>

      {/* Confirmar quitar */}
      <Dialog open={borrar !== null} onClose={() => setBorrar(null)} role="alertdialog" title="Quitar del catálogo">
        <p className="mb-5 text-sm text-brand-text-secondary">
          ¿Quitar <span className="font-semibold text-brand-text-dark">«{borrar?.referencia}»</span> del catálogo de tu
          taller? Si era un material base de Costo360 que personalizaste, volverá a mostrarse con el valor original.
          Las cotizaciones ya guardadas no se ven afectadas.
        </p>
        <div className="flex gap-2">
          <button type="button" onClick={() => setBorrar(null)}
            className="flex-1 rounded-lg border border-brand-border py-2.5 text-sm font-medium text-brand-text-secondary hover:bg-brand-bg hover:text-brand-text transition-colors cursor-pointer">
            Cancelar
          </button>
          <button
            type="button"
            disabled={delMut.isPending}
            onClick={() => borrar && delMut.mutate(borrar.id)}
            className="flex-1 rounded-lg bg-brand-danger py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
          >
            {delMut.isPending ? 'Quitando…' : 'Quitar'}
          </button>
        </div>
      </Dialog>
    </AppLayout>
  )
}
