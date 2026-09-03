import { useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Plus } from 'lucide-react'
import AppLayout from '@/components/AppLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { AsyncBoundary } from '@/components/ui/AsyncBoundary'
import { useAuthStore } from '@/store/auth'
import { puedeVerDashboard } from '@/lib/capabilities'
import { formatPct } from '@/lib/utils'
import { showToast } from '@/lib/toast'
import {
  getProyecto, listarTareas, listarHitos, getUsuariosTaller, moverTarea,
  type EstadoTarea, type Tarea,
} from '@/api/proyectos'
import { ProjectStatusBadge } from '@/components/proyectos/badges'
import { TareaKanban } from '@/components/proyectos/tablero/TareaKanban'
import { TareaDialog } from '@/components/proyectos/tablero/TareaDialog'
import { NuevaTareaDialog } from '@/components/proyectos/tablero/NuevaTareaDialog'
import { CronogramaHitos } from '@/components/proyectos/CronogramaHitos'
import { ParteHoras } from '@/components/proyectos/ParteHoras'

type Panel = 'tablero' | 'cronograma' | 'tiempos'

export default function ProyectoDetallePage() {
  const { id: idParam } = useParams()
  const projectId = Number(idParam)
  if (!Number.isFinite(projectId)) return <Navigate to="/proyectos" replace />
  return <ProyectoDetalle projectId={projectId} />
}

function ProyectoDetalle({ projectId }: { projectId: number }) {
  const qc = useQueryClient()
  const usuario = useAuthStore((s) => s.usuario)
  const esGestor = puedeVerDashboard(usuario)
  const usuarioId = usuario?.id ?? ''

  const [panel, setPanel] = useState<Panel>('tablero')
  const [nuevaTareaAbierta, setNuevaTareaAbierta] = useState(false)
  const [tareaSel, setTareaSel] = useState<Tarea | null>(null)

  const proyectoQ = useQuery({
    queryKey: ['proyecto', projectId],
    queryFn: () => getProyecto(projectId),
    enabled: Number.isFinite(projectId),
  })
  const tareasQ = useQuery({
    queryKey: ['tareas', projectId],
    queryFn: () => listarTareas(projectId),
    enabled: Number.isFinite(projectId),
  })
  const hitosQ = useQuery({
    queryKey: ['hitos', projectId],
    queryFn: () => listarHitos(projectId),
    enabled: Number.isFinite(projectId),
  })
  const usuariosQ = useQuery({
    queryKey: ['usuarios-taller'],
    queryFn: getUsuariosTaller,
    staleTime: 1000 * 60 * 5,
  })

  const tareas = useMemo(() => tareasQ.data ?? [], [tareasQ.data])
  const hitos = useMemo(() => hitosQ.data ?? [], [hitosQ.data])
  const usuarios = useMemo(() => usuariosQ.data ?? [], [usuariosQ.data])
  const nombrePorId = useMemo(
    () => Object.fromEntries(usuarios.map((u) => [u.id, u.nombre])),
    [usuarios],
  )

  // Mantener la tarea seleccionada sincronizada con la lista fresca.
  const tareaSelViva = tareaSel ? tareas.find((t) => t.id === tareaSel.id) ?? tareaSel : null

  const mover = useMutation({
    mutationFn: ({ tarea, hacia, orden }: { tarea: Tarea; hacia: EstadoTarea; orden?: number }) =>
      moverTarea(tarea.id, hacia, orden),
    onMutate: async ({ tarea, hacia }) => {
      await qc.cancelQueries({ queryKey: ['tareas', projectId] })
      const prev = qc.getQueryData<Tarea[]>(['tareas', projectId])
      qc.setQueryData<Tarea[]>(['tareas', projectId], (old) =>
        old?.map((t) => (t.id === tarea.id ? { ...t, estado: hacia } : t)),
      )
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['tareas', projectId], ctx.prev)
      showToast('error', 'No se pudo mover la tarea')
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['tareas', projectId] })
      qc.invalidateQueries({ queryKey: ['proyecto', projectId] })
      qc.invalidateQueries({ queryKey: ['proyectos-resumen'] })
    },
  })

  function puedeEditar(t: Tarea) {
    return esGestor || t.responsable_id === usuarioId
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-[1200px]">
        <Link
          to="/proyectos"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-brand-text-secondary hover:text-brand-primary"
        >
          <ArrowLeft size={15} aria-hidden="true" /> Proyectos
        </Link>

        <AsyncBoundary
          isPending={proyectoQ.isPending}
          isError={proyectoQ.isError}
          onRetry={() => proyectoQ.refetch()}
        >
          {proyectoQ.data && (
            <>
              <PageHeader
                kicker="Proyecto"
                title={proyectoQ.data.nombre}
                subtitle={[proyectoQ.data.cliente, proyectoQ.data.material].filter(Boolean).join(' · ') || undefined}
                actions={
                  <div className="flex items-center gap-3">
                    <ProjectStatusBadge estado={proyectoQ.data.estado} />
                    <span className="font-mono text-sm font-bold tabular-nums text-brand-primary">
                      {formatPct(proyectoQ.data.progreso_pct)}
                    </span>
                  </div>
                }
              />

              <div className="mb-4 flex items-center justify-between gap-3">
                <SegmentedControl
                  mode="tabs"
                  ariaLabel="Secciones del proyecto"
                  value={panel}
                  onChange={(v) => setPanel(v as Panel)}
                  panelIdFor={(v) => `pd-panel-${v}`}
                  tabIdPrefix="pd-tab"
                  options={[
                    { value: 'tablero', label: 'Tablero' },
                    { value: 'cronograma', label: 'Cronograma' },
                    { value: 'tiempos', label: 'Tiempos' },
                  ]}
                />
                {panel === 'tablero' && esGestor && (
                  <Button size="sm" onClick={() => setNuevaTareaAbierta(true)}>
                    <Plus size={15} aria-hidden="true" /> Nueva tarea
                  </Button>
                )}
              </div>

              <div id="pd-panel-tablero" role="tabpanel" aria-labelledby="pd-tab-tablero" tabIndex={0} hidden={panel !== 'tablero'}>
                <AsyncBoundary
                  isPending={tareasQ.isPending}
                  isError={tareasQ.isError}
                  onRetry={() => tareasQ.refetch()}
                >
                  <TareaKanban
                    tareas={tareas}
                    nombreDe={(uid) => (uid ? nombrePorId[uid] : undefined)}
                    esGestor={esGestor}
                    puedeEditar={puedeEditar}
                    onMover={(tarea, hacia, orden) => mover.mutate({ tarea, hacia, orden })}
                    onAbrir={setTareaSel}
                  />
                </AsyncBoundary>
              </div>

              <div id="pd-panel-cronograma" role="tabpanel" aria-labelledby="pd-tab-cronograma" tabIndex={0} hidden={panel !== 'cronograma'}>
                <AsyncBoundary
                  isPending={hitosQ.isPending}
                  isError={hitosQ.isError}
                  onRetry={() => hitosQ.refetch()}
                >
                  <CronogramaHitos projectId={projectId} hitos={hitos} tareas={tareas} esGestor={esGestor} />
                </AsyncBoundary>
              </div>

              <div id="pd-panel-tiempos" role="tabpanel" aria-labelledby="pd-tab-tiempos" tabIndex={0} hidden={panel !== 'tiempos'}>
                <ParteHoras projectId={projectId} tareas={tareas} activo={panel === 'tiempos'} />
              </div>
            </>
          )}
        </AsyncBoundary>
      </div>

      {nuevaTareaAbierta && (
        <NuevaTareaDialog
          open
          onClose={() => setNuevaTareaAbierta(false)}
          projectId={projectId}
          hitos={hitos}
          usuarios={usuarios}
        />
      )}
      <TareaDialog
        key={tareaSel?.id ?? 'none'}
        tarea={tareaSelViva}
        open={!!tareaSel}
        onClose={() => setTareaSel(null)}
        projectId={projectId}
        esGestor={esGestor}
        usuarioId={usuarioId}
        hitos={hitos}
        usuarios={usuarios}
      />
    </AppLayout>
  )
}
