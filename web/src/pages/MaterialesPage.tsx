import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Check } from 'lucide-react'
import AppLayout from '@/components/AppLayout'
import {
  getMaterialesTodos,
  crearMaterial,
  editarMaterial,
  eliminarMaterial,
  type MaterialCatalogo,
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

type FormState = { categoria: string; referencia: string; precio_m2: string }
const EMPTY: FormState = { categoria: 'Mármol', referencia: '', precio_m2: '' }

export default function MaterialesPage() {
  const qc = useQueryClient()
  const [filtroCat, setFiltroCat] = useState('')
  const [busca, setBusca] = useState('')
  const [modal, setModal] = useState<'crear' | 'editar' | null>(null)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [borrar, setBorrar] = useState<MaterialCatalogo | null>(null)

  const { data = [], isPending, isError, refetch } = useQuery({
    queryKey: ['materiales-todos'],
    queryFn: getMaterialesTodos,
  })

  const invalidar = () => {
    qc.invalidateQueries({ queryKey: ['materiales-todos'] })
    qc.invalidateQueries({ queryKey: ['materiales'] })
  }

  const crearMut = useMutation({
    mutationFn: () =>
      crearMaterial({ categoria: form.categoria, referencia: form.referencia.trim(), precio_m2: Number(form.precio_m2) || 0 }),
    onSuccess: () => { invalidar(); setModal(null); showToast('success', 'Material agregado a tu catálogo') },
    onError: () => showToast('error', 'No se pudo agregar el material'),
  })

  const editMut = useMutation({
    mutationFn: () =>
      editarMaterial(editId!, { referencia: form.referencia.trim(), precio_m2: Number(form.precio_m2) || 0 }),
    onSuccess: () => { invalidar(); setModal(null); showToast('success', 'Material actualizado') },
    onError: () => showToast('error', 'No se pudo actualizar'),
  })

  const delMut = useMutation({
    mutationFn: (id: number) => eliminarMaterial(id),
    onSuccess: () => { invalidar(); setBorrar(null); showToast('success', 'Material eliminado') },
    onError: () => showToast('error', 'No se pudo eliminar'),
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
    setEditId(null)
    setModal('crear')
  }
  function abrirEditar(m: MaterialCatalogo) {
    setForm({ categoria: m.categoria, referencia: m.referencia, precio_m2: String(m.precio_m2) })
    setEditId(m.id)
    setModal('editar')
  }

  const formValido = form.referencia.trim().length > 0 && Number(form.precio_m2) > 0

  return (
    <AppLayout>
      <PageHeader
        kicker="Sistema"
        title="Catálogo de materiales"
        subtitle="El catálogo base de Costo360 más los materiales que tu taller ha agregado"
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
            <Badge tono="gold">{propios} de tu taller</Badge>
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
                <caption className="sr-only">Catálogo de materiales</caption>
                <thead>
                  <tr className="border-b border-brand-border text-left">
                    <th scope="col" className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-brand-text-secondary">Categoría</th>
                    <th scope="col" className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-brand-text-secondary">Referencia</th>
                    <th scope="col" className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-brand-text-secondary">Precio / m²</th>
                    <th scope="col" className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-brand-text-secondary">Origen</th>
                    <th scope="col" className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-brand-text-secondary">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((m) => (
                    <tr key={m.id} className="border-b border-brand-border/60 last:border-0 hover:bg-brand-bg">
                      <td className="px-4 py-3 text-brand-text-secondary">{m.categoria}</td>
                      <td className="px-4 py-3 font-medium text-brand-text-dark">{m.referencia}</td>
                      <td className="px-4 py-3 text-right font-mono text-brand-text-dark num">{formatCOP(m.precio_m2)}</td>
                      <td className="px-4 py-3">
                        {m.es_propio
                          ? <Badge tono="gold">Tu taller</Badge>
                          : <Badge tono="neutral">Costo360</Badge>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {m.es_propio ? (
                            <>
                              <button type="button" onClick={() => abrirEditar(m)} aria-label={`Editar ${m.referencia}`}
                                className="rounded-lg p-2 text-brand-text-secondary hover:bg-brand-bg hover:text-brand-text cursor-pointer">
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button type="button" onClick={() => setBorrar(m)} aria-label={`Eliminar ${m.referencia}`}
                                className="rounded-lg p-2 text-brand-text-secondary hover:bg-brand-danger-soft hover:text-brand-danger cursor-pointer">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          ) : (
                            <span className="text-[11px] text-brand-text-secondary">solo lectura</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </AsyncBoundary>

      {/* Crear / Editar */}
      <Dialog
        open={modal !== null}
        onClose={() => setModal(null)}
        title={modal === 'crear' ? 'Agregar material a tu catálogo' : 'Editar material'}
      >
        <div className="space-y-3">
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-brand-text-secondary">Categoría</label>
            <select
              value={form.categoria}
              disabled={modal === 'editar'}
              onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))}
              className={`${inputCls} cursor-pointer disabled:opacity-60`}
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
          <button type="button" onClick={() => setModal(null)}
            className="flex-1 rounded-lg border border-brand-border py-2.5 text-sm text-brand-text-secondary hover:text-brand-text transition-colors cursor-pointer">
            Cancelar
          </button>
          <button
            type="button"
            disabled={!formValido || crearMut.isPending || editMut.isPending}
            onClick={() => (modal === 'crear' ? crearMut.mutate() : editMut.mutate())}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-primary py-2.5 text-sm font-semibold text-white hover:bg-brand-primary-light transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Check size={14} aria-hidden="true" />
            {crearMut.isPending || editMut.isPending ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </Dialog>

      {/* Confirmar borrado */}
      <Dialog open={borrar !== null} onClose={() => setBorrar(null)} role="alertdialog" title="Eliminar material">
        <p className="mb-5 text-sm text-brand-text-secondary">
          ¿Eliminar <span className="font-semibold text-brand-text-dark">«{borrar?.referencia}»</span> de tu
          catálogo? Las cotizaciones ya guardadas no se ven afectadas.
        </p>
        <div className="flex gap-2">
          <button type="button" onClick={() => setBorrar(null)}
            className="flex-1 rounded-lg border border-brand-border py-2.5 text-sm text-brand-text-secondary hover:text-brand-text transition-colors cursor-pointer">
            Cancelar
          </button>
          <button
            type="button"
            disabled={delMut.isPending}
            onClick={() => borrar && delMut.mutate(borrar.id)}
            className="flex-1 rounded-lg bg-brand-danger py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
          >
            {delMut.isPending ? 'Eliminando…' : 'Eliminar'}
          </button>
        </div>
      </Dialog>
    </AppLayout>
  )
}
