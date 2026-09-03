import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Dialog } from '@/components/ui/Dialog'
import { Field } from '@/components/ui/Field'
import { SelectField } from '@/components/ui/SelectField'
import { DateField } from '@/components/ui/DateField'
import { Button } from '@/components/ui/Button'
import { crearTarea, type Hito, type Prioridad, type UsuarioTaller } from '@/api/proyectos'

const INPUT =
  'w-full bg-brand-input border border-brand-border rounded-lg px-3 h-10 text-sm text-brand-text ' +
  'outline-none focus-visible:border-brand-primary'
const PRIORIDADES: Prioridad[] = ['baja', 'media', 'alta', 'urgente']

export function NuevaTareaDialog({
  open, onClose, projectId, hitos, usuarios,
}: {
  open: boolean
  onClose: () => void
  projectId: number
  hitos: Hito[]
  usuarios: UsuarioTaller[]
}) {
  const qc = useQueryClient()
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [prioridad, setPrioridad] = useState<Prioridad>('media')
  const [responsableId, setResponsableId] = useState('')
  const [fechaLimite, setFechaLimite] = useState('')
  const [horasEst, setHorasEst] = useState('')
  const [milestoneId, setMilestoneId] = useState('')
  const [err, setErr] = useState<string | null>(null)

  const mut = useMutation({
    mutationFn: () =>
      crearTarea(projectId, {
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        prioridad,
        responsable_id: responsableId || null,
        fecha_limite: fechaLimite || null,
        horas_estimadas: horasEst ? Number(horasEst) : null,
        milestone_id: milestoneId ? Number(milestoneId) : null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tareas', projectId] })
      qc.invalidateQueries({ queryKey: ['proyecto', projectId] })
      qc.invalidateQueries({ queryKey: ['proyectos-resumen'] })
      reset()
      onClose()
    },
    onError: () => setErr('No se pudo crear la tarea.'),
  })

  function reset() {
    setTitulo(''); setDescripcion(''); setPrioridad('media'); setResponsableId('')
    setFechaLimite(''); setHorasEst(''); setMilestoneId(''); setErr(null)
  }

  return (
    <Dialog open={open} onClose={onClose} title="Nueva tarea" className="max-w-lg">
      <form
        onSubmit={(e) => { e.preventDefault(); if (titulo.trim()) mut.mutate() }}
        className="space-y-4"
      >
        <Field label="Título" required>
          {(a11y) => (
            <input {...a11y} autoFocus value={titulo} onChange={(e) => setTitulo(e.target.value)} className={INPUT} />
          )}
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField label="Prioridad" value={prioridad} onChange={(e) => setPrioridad(e.target.value as Prioridad)}>
            {PRIORIDADES.map((p) => (
              <option key={p} value={p}>{p[0].toUpperCase() + p.slice(1)}</option>
            ))}
          </SelectField>
          <SelectField label="Responsable" value={responsableId} onChange={(e) => setResponsableId(e.target.value)}>
            <option value="">Sin responsable</option>
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>{u.nombre}</option>
            ))}
          </SelectField>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <DateField label="Fecha límite" value={fechaLimite} onChange={(e) => setFechaLimite(e.target.value)} />
          <Field label="Horas est.">
            {(a11y) => (
              <input
                {...a11y}
                type="number"
                min={0}
                step="0.5"
                value={horasEst}
                onChange={(e) => setHorasEst(e.target.value)}
                className={INPUT}
              />
            )}
          </Field>
          <SelectField label="Hito" value={milestoneId} onChange={(e) => setMilestoneId(e.target.value)}>
            <option value="">Sin hito</option>
            {hitos.map((h) => (
              <option key={h.id} value={h.id}>{h.titulo}</option>
            ))}
          </SelectField>
        </div>

        {milestoneId && hitos.find((h) => String(h.id) === milestoneId)?.estado !== 'completado' && (
          <p className="text-[11px] text-brand-text-secondary">
            La tarea nacerá <strong>bloqueada</strong> hasta que se complete el hito.
          </p>
        )}

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

        <div className="flex gap-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button type="submit" className="flex-1" disabled={mut.isPending || !titulo.trim()}>
            {mut.isPending ? 'Creando…' : 'Crear tarea'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
