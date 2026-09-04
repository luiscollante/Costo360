import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, Flag, Loader2 } from 'lucide-react'
import { Dialog } from '@/components/ui/Dialog'
import { Field } from '@/components/ui/Field'
import { DateField } from '@/components/ui/DateField'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { showToast } from '@/lib/toast'
import { formatFecha, diasHasta } from '@/lib/utils'
import { crearHito, cambiarEstadoHito, type Hito, type Tarea } from '@/api/proyectos'

const HITO_TONO = { pendiente: 'neutral', en_progreso: 'success', completado: 'gold' } as const
const HITO_LABEL = { pendiente: 'Pendiente', en_progreso: 'En progreso', completado: 'Completado' } as const

export function CronogramaHitos({
  projectId, hitos, tareas = [], esGestor,
}: {
  projectId: number
  hitos: Hito[]
  tareas?: Tarea[]
  esGestor: boolean
}) {
  const qc = useQueryClient()
  const [dialogAbierto, setDialogAbierto] = useState(false)

  const invalidar = () => {
    qc.invalidateQueries({ queryKey: ['hitos', projectId] })
    qc.invalidateQueries({ queryKey: ['tareas', projectId] })
    qc.invalidateQueries({ queryKey: ['proyecto', projectId] })
    qc.invalidateQueries({ queryKey: ['proyectos-resumen'] })
    qc.invalidateQueries({ queryKey: ['notificaciones'] }) // el desbloqueo puede generar avisos (M5)
  }

  const completar = useMutation({
    mutationFn: (h: Hito) =>
      cambiarEstadoHito(h.id, h.estado === 'completado' ? 'pendiente' : 'completado'),
    onSuccess: (res) => {
      invalidar()
      if (res.tareas_desbloqueadas > 0) {
        showToast('success', `Hito completado — ${res.tareas_desbloqueadas} tarea(s) desbloqueada(s)`)
      }
    },
    onError: () => showToast('error', 'No se pudo cambiar el estado del hito'),
  })

  const hechos = hitos.filter((h) => h.estado === 'completado').length

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-text-secondary">
          {hitos.length > 0 ? `${hechos} de ${hitos.length} hitos cumplidos` : 'Hitos'}
        </p>
        {esGestor && (
          <Button size="sm" variant="secondary" onClick={() => setDialogAbierto(true)}>
            <Flag size={14} aria-hidden="true" /> Nuevo hito
          </Button>
        )}
      </div>

      {hitos.length === 0 ? (
        <EmptyState icon={<Flag size={28} />} title="Sin hitos definidos" />
      ) : (
        <ol className="relative space-y-2.5 border-l-2 border-brand-border pl-6">
          {hitos.map((h) => {
            const dependientes = tareas.filter((t) => t.milestone_id === h.id)
            const pendientes = dependientes.filter((t) => t.estado !== 'completada').length
            const dias = diasHasta(h.fecha_limite)
            const vencido = h.estado !== 'completado' && dias !== null && dias < 0
            return (
              <li key={h.id} className="relative">
                <span
                  className={`absolute -left-[31px] top-2.5 h-3.5 w-3.5 rounded-full border-[3px] border-brand-surface ${
                    h.estado === 'completado' ? 'bg-brand-gold'
                      : h.estado === 'en_progreso' ? 'bg-brand-success'
                        : vencido ? 'bg-brand-danger' : 'bg-brand-border'
                  }`}
                  aria-hidden="true"
                />
                <div className={`flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 rounded-lg border p-3 ${
                  h.estado === 'completado' ? 'border-brand-border/50 bg-brand-bg/40' : 'border-brand-border'
                }`}>
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold ${h.estado === 'completado' ? 'text-brand-text-secondary' : 'text-brand-text-dark'}`}>
                      {h.titulo}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-brand-text-secondary">
                      <span className={vencido ? 'font-semibold text-brand-danger' : undefined}>
                        {h.estado === 'completado'
                          ? (h.fecha_limite ? `Vencía ${formatFecha(h.fecha_limite)}` : 'Cumplido')
                          : h.fecha_limite ? `Vence ${formatFecha(h.fecha_limite)}` : 'Sin fecha'}
                        {vencido && ' · atrasado'}
                      </span>
                      {dependientes.length > 0 && (
                        <span>
                          · {dependientes.length} tarea{dependientes.length !== 1 ? 's' : ''}
                          {pendientes > 0 && h.estado !== 'completado' ? ` (${pendientes} sin completar)` : ''}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge tono={HITO_TONO[h.estado]}>{HITO_LABEL[h.estado]}</Badge>
                    {esGestor && (
                      <button
                        type="button"
                        onClick={() => completar.mutate(h)}
                        disabled={completar.isPending}
                        className="inline-flex items-center gap-1 rounded-lg border border-brand-border px-2 py-1 text-[11px] font-semibold text-brand-text-secondary hover:border-brand-primary/40 hover:text-brand-text cursor-pointer disabled:opacity-50"
                      >
                        {completar.isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                        {h.estado === 'completado' ? 'Reabrir' : 'Completar'}
                      </button>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      )}

      {dialogAbierto && (
        <NuevoHitoDialog
          open
          onClose={() => setDialogAbierto(false)}
          projectId={projectId}
          onCreado={invalidar}
        />
      )}
    </div>
  )
}

function NuevoHitoDialog({
  open, onClose, projectId, onCreado,
}: {
  open: boolean; onClose: () => void; projectId: number; onCreado: () => void
}) {
  const [titulo, setTitulo] = useState('')
  const [fechaLimite, setFechaLimite] = useState('')
  const [err, setErr] = useState<string | null>(null)

  const mut = useMutation({
    mutationFn: () => crearHito(projectId, { titulo: titulo.trim(), fecha_limite: fechaLimite || null }),
    onSuccess: () => { setTitulo(''); setFechaLimite(''); setErr(null); onCreado(); onClose() },
    onError: () => setErr('No se pudo crear el hito.'),
  })

  return (
    <Dialog open={open} onClose={onClose} title="Nuevo hito">
      <form
        onSubmit={(e) => { e.preventDefault(); if (titulo.trim()) mut.mutate() }}
        className="space-y-4"
      >
        <Field label="Título del hito" required>
          {(a11y) => (
            <input
              {...a11y}
              autoFocus
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej. Entrega de planos aprobados"
              className="w-full rounded-lg border border-brand-border bg-brand-input px-3 h-10 text-sm text-brand-text focus-visible:outline-none focus-visible:border-brand-primary focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-primary/40"
            />
          )}
        </Field>
        <DateField label="Fecha límite" value={fechaLimite} onChange={(e) => setFechaLimite(e.target.value)} />
        {err && <p className="text-xs text-brand-danger" role="alert">{err}</p>}
        <div className="flex gap-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button type="submit" className="flex-1" disabled={mut.isPending || !titulo.trim()}>
            {mut.isPending ? 'Creando…' : 'Crear hito'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
