import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Loader2, Trash2, X } from 'lucide-react'
import { Dialog } from '@/components/ui/Dialog'
import { Field } from '@/components/ui/Field'
import { SelectField } from '@/components/ui/SelectField'
import { DateField } from '@/components/ui/DateField'
import { Button } from '@/components/ui/Button'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { EmptyState } from '@/components/ui/EmptyState'
import { showToast } from '@/lib/toast'
import { formatFecha, formatFechaHora, formatNum } from '@/lib/utils'
import {
  editarTarea, asignarResponsable, borrarTarea,
  listarComentarios, crearComentario, borrarComentario,
  listarHorasTarea, registrarHoras, borrarHoras,
  type EstadoTarea, type Hito, type Prioridad, type Tarea, type UsuarioTaller,
} from '@/api/proyectos'
import { TAREA_META } from '@/components/proyectos/badgeMeta'

const INPUT =
  'w-full bg-brand-input border border-brand-border rounded-lg px-3 h-10 text-sm text-brand-text ' +
  'outline-none focus-visible:border-brand-primary'

const PRIORIDADES: Prioridad[] = ['baja', 'media', 'alta', 'urgente']
const ESTADOS: EstadoTarea[] = ['bloqueada', 'por_hacer', 'en_progreso', 'revision', 'completada']

export function TareaDialog({
  tarea, open, onClose, projectId, esGestor, usuarioId, hitos, usuarios,
}: {
  tarea: Tarea | null
  open: boolean
  onClose: () => void
  projectId: number
  esGestor: boolean
  usuarioId: string
  hitos: Hito[]
  usuarios: UsuarioTaller[]
}) {
  const qc = useQueryClient()
  const esResponsable = !!tarea && tarea.responsable_id === usuarioId
  const puedeEditar = esGestor || esResponsable
  const bloqueadaParaMi = !!tarea && tarea.estado === 'bloqueada' && !esGestor

  // El diálogo se monta con `key={tarea.id}` desde la página → el estado inicial
  // se toma del prop una sola vez (sin `useEffect` de sincronización). Un refetch
  // de la lista NO reinicia el formulario (no se pierden ediciones en curso).
  const [titulo, setTitulo] = useState(() => tarea?.titulo ?? '')
  const [descripcion, setDescripcion] = useState(() => tarea?.descripcion ?? '')
  const [prioridad, setPrioridad] = useState<Prioridad>(() => tarea?.prioridad ?? 'media')
  const [estado, setEstado] = useState<EstadoTarea>(() => tarea?.estado ?? 'por_hacer')
  const [fechaLimite, setFechaLimite] = useState(() => tarea?.fecha_limite ?? '')
  const [horasEst, setHorasEst] = useState(() =>
    tarea?.horas_estimadas != null ? String(tarea.horas_estimadas) : '',
  )
  const [milestoneId, setMilestoneId] = useState(() =>
    tarea?.milestone_id != null ? String(tarea.milestone_id) : '',
  )
  const [tab, setTab] = useState<'comentarios' | 'horas'>('comentarios')
  const [confirmarBorrado, setConfirmarBorrado] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const confirmarRef = useRef<HTMLButtonElement>(null)
  const eliminarRef = useRef<HTMLButtonElement>(null)

  // Foco a la confirmación de borrado (y de vuelta al cancelar) — la acción
  // destructiva no debe dejar el foco en <body> (hallazgo Fase 5 a11y).
  useEffect(() => {
    if (confirmarBorrado) confirmarRef.current?.focus()
    else if (eliminarRef.current && document.activeElement === document.body) eliminarRef.current.focus()
  }, [confirmarBorrado])

  const invalidar = () => {
    qc.invalidateQueries({ queryKey: ['tareas', projectId] })
    qc.invalidateQueries({ queryKey: ['proyecto', projectId] })
    qc.invalidateQueries({ queryKey: ['proyectos-resumen'] })
  }

  const guardar = useMutation({
    mutationFn: async () => {
      if (!tarea) return
      const cambios: Record<string, unknown> = { estado, descripcion: descripcion.trim() }
      cambios.horas_estimadas = horasEst ? Number(horasEst) : null
      if (esGestor) {
        cambios.titulo = titulo.trim()
        cambios.prioridad = prioridad
        cambios.fecha_limite = fechaLimite || null
        cambios.milestone_id = milestoneId ? Number(milestoneId) : null
      }
      await editarTarea(tarea.id, cambios)
    },
    onSuccess: () => { invalidar(); onClose() },
    onError: () => setErr('No se pudo guardar. Revisa los campos.'),
  })

  const borrar = useMutation({
    mutationFn: () => borrarTarea(tarea!.id),
    onSuccess: () => { invalidar(); onClose() },
    onError: () => setErr('No se pudo eliminar.'),
  })

  const asignarme = useMutation({
    mutationFn: () => asignarResponsable(tarea!.id, usuarioId),
    onSuccess: invalidar,
    onError: () => showToast('error', 'No se pudo asignar la tarea'),
  })

  const cambiarResponsable = useMutation({
    mutationFn: (id: string | null) => asignarResponsable(tarea!.id, id),
    onSuccess: invalidar,
    onError: () => showToast('error', 'No se pudo cambiar el responsable'),
  })

  if (!tarea) return null
  const meta = TAREA_META[tarea.estado]

  return (
    <Dialog open={open} onClose={onClose} title={tarea.titulo} className="max-w-2xl">
      <div className="-mt-1 mb-3 flex items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-md bg-brand-border/40 px-2 py-0.5 text-[11px] font-semibold text-brand-text-secondary">
          <meta.Icon size={11} aria-hidden="true" /> {meta.label}
        </span>
      </div>

      <div className="max-h-[75vh] space-y-4 overflow-y-auto pr-1">
        {/* ── Campos ── */}
        {esGestor && (
          <Field label="Título">
            {(a11y) => (
              <input {...a11y} value={titulo} onChange={(e) => setTitulo(e.target.value)} className={INPUT} />
            )}
          </Field>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SelectField
            label="Estado"
            value={estado}
            disabled={!puedeEditar || bloqueadaParaMi}
            onChange={(e) => setEstado(e.target.value as EstadoTarea)}
          >
            {ESTADOS.map((s) => (
              <option key={s} value={s} disabled={s === 'bloqueada' && !esGestor}>
                {TAREA_META[s].label}
              </option>
            ))}
          </SelectField>

          <SelectField
            label="Prioridad"
            value={prioridad}
            disabled={!esGestor}
            onChange={(e) => setPrioridad(e.target.value as Prioridad)}
          >
            {PRIORIDADES.map((p) => (
              <option key={p} value={p}>{p[0].toUpperCase() + p.slice(1)}</option>
            ))}
          </SelectField>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <DateField
            label="Fecha límite"
            value={fechaLimite}
            disabled={!esGestor}
            onChange={(e) => setFechaLimite(e.target.value)}
          />
          <Field label="Horas estimadas">
            {(a11y) => (
              <input
                {...a11y}
                type="number"
                min={0}
                step="0.5"
                value={horasEst}
                disabled={!puedeEditar}
                onChange={(e) => setHorasEst(e.target.value)}
                className={INPUT}
              />
            )}
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SelectField
            label="Responsable"
            value={tarea.responsable_id ?? ''}
            disabled={!esGestor}
            onChange={(e) => cambiarResponsable.mutate(e.target.value || null)}
          >
            <option value="">Sin responsable</option>
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>{u.nombre}</option>
            ))}
          </SelectField>

          {esGestor && (
            <SelectField
              label="Hito"
              value={milestoneId}
              onChange={(e) => setMilestoneId(e.target.value)}
            >
              <option value="">Sin hito</option>
              {hitos.map((h) => (
                <option key={h.id} value={h.id}>{h.titulo}</option>
              ))}
            </SelectField>
          )}
        </div>

        {!esGestor && !tarea.responsable_id && (
          <Button size="sm" variant="secondary" onClick={() => asignarme.mutate()} disabled={asignarme.isPending}>
            Asignármela
          </Button>
        )}

        <Field label="Descripción">
          {(a11y) => (
            <textarea
              {...a11y}
              value={descripcion}
              disabled={!puedeEditar}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={3}
              className="w-full resize-y rounded-lg border border-brand-border bg-brand-input px-3 py-2 text-sm text-brand-text outline-none focus-visible:border-brand-primary disabled:opacity-60"
            />
          )}
        </Field>

        {err && <p className="text-xs text-brand-danger" role="alert">{err}</p>}

        {/* ── Comentarios / Horas ── */}
        <div className="border-t border-brand-border/60 pt-3">
          <SegmentedControl
            mode="tabs"
            ariaLabel="Detalle de la tarea"
            value={tab}
            onChange={(v) => setTab(v as 'comentarios' | 'horas')}
            panelIdFor={(v) => `td-panel-${v}`}
            tabIdPrefix="td-tab"
            options={[
              { value: 'comentarios', label: 'Comentarios' },
              { value: 'horas', label: 'Registro de horas' },
            ]}
          />
          <div id="td-panel-comentarios" role="tabpanel" aria-labelledby="td-tab-comentarios" tabIndex={0} hidden={tab !== 'comentarios'} className="pt-3">
            <PanelComentarios taskId={tarea.id} usuarioId={usuarioId} esGestor={esGestor} />
          </div>
          <div id="td-panel-horas" role="tabpanel" aria-labelledby="td-tab-horas" tabIndex={0} hidden={tab !== 'horas'} className="pt-3">
            <PanelHoras
              taskId={tarea.id}
              projectId={projectId}
              usuarioId={usuarioId}
              esGestor={esGestor}
              puedeRegistrar={puedeEditar}
            />
          </div>
        </div>
      </div>

      {/* ── Acciones ── */}
      <div className="mt-4 flex items-center gap-2 border-t border-brand-border/60 pt-3">
        {esGestor && (
          confirmarBorrado ? (
            <span className="flex items-center gap-1 text-xs text-brand-danger">
              ¿Eliminar?
              <button
                ref={confirmarRef}
                type="button"
                onClick={() => borrar.mutate()}
                disabled={borrar.isPending}
                aria-label="Confirmar eliminación"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-brand-danger hover:bg-brand-danger/15 focus-visible:outline-2 focus-visible:outline-brand-danger"
              >
                {borrar.isPending ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              </button>
              <button
                type="button"
                onClick={() => setConfirmarBorrado(false)}
                aria-label="Cancelar eliminación"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-brand-text-secondary hover:bg-brand-surface"
              >
                <X size={13} />
              </button>
            </span>
          ) : (
            <button
              ref={eliminarRef}
              type="button"
              onClick={() => setConfirmarBorrado(true)}
              className="inline-flex items-center gap-1 text-xs text-brand-text-secondary hover:text-brand-danger"
            >
              <Trash2 size={13} aria-hidden="true" /> Eliminar
            </button>
          )
        )}
        <div className="ml-auto flex gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>Cerrar</Button>
          {puedeEditar && (
            <Button type="button" size="sm" onClick={() => guardar.mutate()} disabled={guardar.isPending}>
              {guardar.isPending ? 'Guardando…' : 'Guardar'}
            </Button>
          )}
        </div>
      </div>
    </Dialog>
  )
}

function PanelComentarios({ taskId, usuarioId, esGestor }: { taskId: number; usuarioId: string; esGestor: boolean }) {
  const qc = useQueryClient()
  const [texto, setTexto] = useState('')
  const { data = [], isPending } = useQuery({
    queryKey: ['comentarios', taskId],
    queryFn: () => listarComentarios(taskId),
  })
  const add = useMutation({
    mutationFn: () => crearComentario(taskId, texto.trim()),
    onSuccess: () => { setTexto(''); qc.invalidateQueries({ queryKey: ['comentarios', taskId] }) },
    onError: () => showToast('error', 'No se pudo enviar el comentario'),
  })
  const del = useMutation({
    mutationFn: (id: number) => borrarComentario(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comentarios', taskId] }),
    onError: () => showToast('error', 'No se pudo borrar el comentario'),
  })

  return (
    <div className="space-y-3">
      {isPending ? (
        <div className="h-10 rounded bg-brand-border/40" role="status" aria-busy="true">
          <span className="sr-only">Cargando comentarios…</span>
        </div>
      ) : data.length === 0 ? (
        <EmptyState title="Sin comentarios todavía" />
      ) : (
        <ul className="space-y-2">
          {data.map((c) => (
            <li key={c.id} className="rounded-lg border border-brand-border/60 p-2.5 text-sm">
              <div className="mb-1 flex items-center justify-between text-[11px] text-brand-text-secondary">
                <span className="font-semibold text-brand-text">{c.autor_nombre || 'Alguien'}</span>
                <span className="flex items-center gap-2">
                  {formatFechaHora(c.created_at)}
                  {(esGestor || c.autor_id === usuarioId) && (
                    <button
                      type="button"
                      onClick={() => del.mutate(c.id)}
                      aria-label="Borrar comentario"
                      className="text-brand-text-tertiary hover:text-brand-danger"
                    >
                      <X size={12} />
                    </button>
                  )}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-brand-text">{c.contenido}</p>
            </li>
          ))}
        </ul>
      )}
      <form
        onSubmit={(e) => { e.preventDefault(); if (texto.trim()) add.mutate() }}
        className="flex gap-2"
      >
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Escribe un comentario…"
          aria-label="Nuevo comentario"
          className="h-9 flex-1 rounded-lg border border-brand-border bg-brand-input px-3 text-sm text-brand-text outline-none focus-visible:border-brand-primary"
        />
        <Button type="submit" size="sm" disabled={add.isPending || !texto.trim()}>Comentar</Button>
      </form>
    </div>
  )
}

function PanelHoras({
  taskId, projectId, usuarioId, esGestor, puedeRegistrar,
}: {
  taskId: number; projectId: number; usuarioId: string; esGestor: boolean; puedeRegistrar: boolean
}) {
  const qc = useQueryClient()
  const [horas, setHoras] = useState('')
  const [nota, setNota] = useState('')
  const { data = [], isPending } = useQuery({
    queryKey: ['horas-tarea', taskId],
    queryFn: () => listarHorasTarea(taskId),
  })
  const invalidar = () => {
    qc.invalidateQueries({ queryKey: ['horas-tarea', taskId] })
    qc.invalidateQueries({ queryKey: ['horas-proyecto', projectId] })
    qc.invalidateQueries({ queryKey: ['proyectos-resumen'] })
  }
  const add = useMutation({
    mutationFn: () => registrarHoras(taskId, { horas: Number(horas), nota: nota.trim() }),
    onSuccess: () => { setHoras(''); setNota(''); invalidar() },
    onError: () => showToast('error', 'No se pudieron registrar las horas'),
  })
  const del = useMutation({
    mutationFn: (id: number) => borrarHoras(id),
    onSuccess: invalidar,
    onError: () => showToast('error', 'No se pudo borrar el registro'),
  })

  const total = data.reduce((s, e) => s + e.horas, 0)

  return (
    <div className="space-y-3">
      {isPending ? (
        <div className="h-10 rounded bg-brand-border/40" role="status" aria-busy="true">
          <span className="sr-only">Cargando horas…</span>
        </div>
      ) : data.length === 0 ? (
        <EmptyState title="Sin horas registradas" />
      ) : (
        <>
          <ul className="space-y-1.5">
            {data.map((e) => (
              <li key={e.id} className="flex items-center justify-between rounded-lg border border-brand-border/60 px-2.5 py-1.5 text-sm">
                <span className="min-w-0">
                  <span className="font-mono font-semibold tabular-nums text-brand-text">{formatNum(e.horas, 1)} h</span>
                  <span className="ml-2 text-[11px] text-brand-text-secondary">{e.user_name || '—'} · {formatFecha(e.fecha)}</span>
                  {e.nota && <span className="ml-2 text-[11px] text-brand-text-secondary">— {e.nota}</span>}
                </span>
                {(esGestor || e.usuario_id === usuarioId) && (
                  <button
                    type="button"
                    onClick={() => del.mutate(e.id)}
                    aria-label="Borrar registro de horas"
                    className="text-brand-text-tertiary hover:text-brand-danger"
                  >
                    <X size={12} />
                  </button>
                )}
              </li>
            ))}
          </ul>
          <p className="text-right text-[11px] font-semibold text-brand-text-secondary">
            Total: {formatNum(total, 1)} h
          </p>
        </>
      )}
      {puedeRegistrar && (
        <form
          onSubmit={(e) => { e.preventDefault(); if (Number(horas) > 0) add.mutate() }}
          className="grid grid-cols-[80px_1fr_auto] items-end gap-2"
        >
          <label className="text-[11px] text-brand-text-secondary">
            Horas
            <input
              type="number" min={0} step="0.5" value={horas}
              onChange={(e) => setHoras(e.target.value)}
              className="mt-1 h-9 w-full rounded-lg border border-brand-border bg-brand-input px-2 text-sm text-brand-text outline-none focus-visible:border-brand-primary"
            />
          </label>
          <label className="text-[11px] text-brand-text-secondary">
            Nota (opcional)
            <input
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              className="mt-1 h-9 w-full rounded-lg border border-brand-border bg-brand-input px-2 text-sm text-brand-text outline-none focus-visible:border-brand-primary"
            />
          </label>
          <Button type="submit" size="sm" disabled={add.isPending || !(Number(horas) > 0)}>Registrar</Button>
        </form>
      )}
    </div>
  )
}
