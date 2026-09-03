import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Dialog } from '@/components/ui/Dialog'
import { Field } from '@/components/ui/Field'
import { SelectField } from '@/components/ui/SelectField'
import { DateField } from '@/components/ui/DateField'
import { Button } from '@/components/ui/Button'
import { getCategoriasMaterial } from '@/api/materiales'
import { crearProyecto, type EstadoProyecto } from '@/api/proyectos'
import { PROYECTO_META } from './badgeMeta'

const INPUT =
  'w-full bg-brand-input border border-brand-border rounded-lg px-3 h-10 text-sm text-brand-text ' +
  'outline-none transition-colors focus-visible:border-brand-primary aria-[invalid=true]:border-brand-danger'

const ESTADOS_INICIALES: EstadoProyecto[] = ['planificacion', 'activo', 'en_revision', 'en_pausa']

export function NuevoProyectoDialog({
  open,
  onClose,
  onCreado,
}: {
  open: boolean
  onClose: () => void
  onCreado: () => void
}) {
  const qc = useQueryClient()
  const [nombre, setNombre] = useState('')
  const [cliente, setCliente] = useState('')
  const [material, setMaterial] = useState('')
  const [estado, setEstado] = useState<EstadoProyecto>('activo')
  const [descripcion, setDescripcion] = useState('')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [err, setErr] = useState<string | null>(null)

  const { data: categorias = [] } = useQuery({
    queryKey: ['materiales-categorias'],
    queryFn: getCategoriasMaterial,
    staleTime: 1000 * 60 * 10,
  })

  const mut = useMutation({
    mutationFn: () =>
      crearProyecto({
        nombre: nombre.trim(),
        cliente: cliente.trim(),
        material,
        estado,
        descripcion: descripcion.trim(),
        fecha_inicio: fechaInicio || null,
        fecha_fin: fechaFin || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['proyectos-resumen'] })
      reset()
      onCreado()
      onClose()
    },
    onError: () => setErr('No se pudo crear el proyecto. Intenta de nuevo.'),
  })

  function reset() {
    setNombre(''); setCliente(''); setMaterial(''); setEstado('activo')
    setDescripcion(''); setFechaInicio(''); setFechaFin(''); setErr(null)
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre.trim()) return
    setErr(null)
    mut.mutate()
  }

  return (
    <Dialog open={open} onClose={onClose} title="Nuevo proyecto" className="max-w-lg">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Nombre del proyecto" required>
          {(a11y) => (
            <input
              {...a11y}
              autoFocus
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Cocina apto 502 — Torre Norte"
              className={INPUT}
            />
          )}
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Cliente">
            {(a11y) => (
              <input
                {...a11y}
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
                placeholder="Nombre del cliente"
                className={INPUT}
              />
            )}
          </Field>

          <SelectField
            label="Material"
            value={material}
            onChange={(e) => setMaterial(e.target.value)}
          >
            <option value="">— Sin especificar —</option>
            {categorias.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </SelectField>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SelectField
            label="Estado"
            value={estado}
            onChange={(e) => setEstado(e.target.value as EstadoProyecto)}
          >
            {ESTADOS_INICIALES.map((s) => (
              <option key={s} value={s}>{PROYECTO_META[s].label}</option>
            ))}
          </SelectField>
          <DateField label="Inicio" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
          <DateField label="Entrega" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
        </div>

        <Field label="Descripción">
          {(a11y) => (
            <textarea
              {...a11y}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={3}
              className="w-full resize-y rounded-lg border border-brand-border bg-brand-input px-3 py-2 text-sm text-brand-text outline-none focus-visible:border-brand-primary"
            />
          )}
        </Field>

        {err && <p className="text-xs text-brand-danger" role="alert">{err}</p>}

        <div className="flex gap-2 pt-1">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" className="flex-1" disabled={mut.isPending || !nombre.trim()}>
            {mut.isPending ? 'Creando…' : 'Crear proyecto'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
