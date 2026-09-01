import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Check, Trash2 } from 'lucide-react'
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

function errDetalle(err: unknown, fallback: string): string {
  const d = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
  return typeof d === 'string' ? d : fallback
}

export default function MaterialesPage() {
  const qc = useQueryClient()
  const [filtroCat, setFiltroCat] = useState('')
  const [busca, setBusca] = useState('')
  const [modal, setModal] = useState<'crear' | 'editar' | null>(null)
  const [editando, setEditando] = useState<MaterialCatalogo | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [borrar, setBorrar] = useState<MaterialCatalogo | null>(null)

  const { data = [], isPending, isError, refetch } = useQuery({
    queryKey: ['materiales-todos'],
    queryFn: getMaterialesTodos,
  })

  // Espera a que la lista vuelva a leerse ANTES de cerrar / avisar, para no
  // mostrar el valor viejo mientras el toast dice "guardado".
  const invalidar = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ['materiales-todos'] }),
      qc.invalidateQueries({ queryKey: ['materiales'] }),
    ])

  const guardarMut = useMutation({
    mutationFn: () => {
      const body = {
        categoria: form.categoria,
        referencia: form.referencia.trim(),
        precio_m2: Number(form.precio_m2) || 0,
      }
      return modal === 'crear'
        ? crearMaterial(body)
        : editarMaterial(editando!.id, body)
    },
    onSuccess: async () => {
      await invalidar()
      setModal(null)
      showToast(
        'success',
        modal === 'crear'
          ? 'Material agregado a tu catálogo'
          : 'Cambio guardado — solo aplica a tu taller',
      )
    },
    onError: (e) => showToast('error', errDetalle(e, 'No se pudo guardar')),
  })

  const delMut = useMutation({
    mutationFn: (id: number) => eliminarMaterial(id),
    onSuccess: async () => {
      await invalidar()
      setBorrar(null)
      setModal(null)
      showToast('success', 'Material quitado de tu catálogo')
    },
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
    setEditando(null)
    setModal('crear')
  }
  function abrirEditar(m: MaterialCatalogo) {
    setForm({ categoria: m.categoria, referencia: m.referencia, precio_m2: String(m.precio_m2) })
    setEditando(m)
    setModal('editar')
  }

  const formValido = form.referencia.trim().length > 0 && Number(form.precio_m2) > 0

  return (
    <AppLayout>
      <PageHeader
        kicker="Taller"
        title="Catálogo de materiales"
        subtitle="Toca una fila para ajustar categoría, nombre o precio. Los cambios valen solo para tu taller y todos sus usuarios los ven en vivo."
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
                  {filtrados.map((m) => (
                    <tr
                      key={m.id}
                      onClick={() => abrirEditar(m)}
                      className="cursor-pointer border-b border-brand-border/60 last:border-0 hover:bg-brand-primary/[0.05] focus-within:bg-brand-primary/[0.05]"
                    >
                      <td className="px-4 py-3 text-brand-text-secondary">{m.categoria}</td>
                      <td className="px-4 py-3">
                        {/* Botón real: da acceso por teclado (Tab + Enter). El clic
                            en cualquier parte de la fila también abre el modal. */}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); abrirEditar(m) }}
                          className="text-left font-medium text-brand-text-dark hover:text-brand-primary hover:underline cursor-pointer"
                          aria-label={`Editar ${m.referencia}`}
                        >
                          {m.referencia}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-brand-text-dark num">
                        {formatCOP(m.precio_m2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </AsyncBoundary>

      {/* Crear / Editar — mismo modal, precargado al editar */}
      <Dialog
        open={modal !== null}
        onClose={() => setModal(null)}
        title={modal === 'crear' ? 'Agregar material a tu catálogo' : 'Editar material'}
      >
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
          {modal === 'editar' && editando && !editando.es_propio && (
            <p className="text-[11px] leading-relaxed text-brand-text-secondary">
              Este es un material base de Costo360. Al guardar se creará una copia
              personalizada para tu taller; el material original no se modifica.
            </p>
          )}
        </div>

        <div className="mt-5 flex items-center gap-2">
          {modal === 'editar' && editando?.es_propio && (
            <button
              type="button"
              onClick={() => setBorrar(editando)}
              className="mr-auto flex items-center gap-1.5 rounded-lg px-2.5 py-2.5 text-sm font-medium text-brand-text-secondary hover:bg-brand-danger-soft hover:text-brand-danger transition-colors cursor-pointer"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Quitar
            </button>
          )}
          <button type="button" onClick={() => setModal(null)}
            className="rounded-lg border border-brand-border px-4 py-2.5 text-sm font-medium text-brand-text-secondary hover:bg-brand-bg hover:text-brand-text transition-colors cursor-pointer">
            Cancelar
          </button>
          <button
            type="button"
            disabled={!formValido || guardarMut.isPending}
            onClick={() => guardarMut.mutate()}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-primary-light transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Check size={14} aria-hidden="true" />
            {guardarMut.isPending ? 'Guardando…' : 'Guardar'}
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
