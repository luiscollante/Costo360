import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  DragDropContext, Draggable, Droppable,
  type DropResult, type DraggableProvided,
} from '@hello-pangea/dnd'
import { Plus, FolderKanban } from 'lucide-react'
import AppLayout from '@/components/AppLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { EmptyState } from '@/components/ui/EmptyState'
import { useAuthStore } from '@/store/auth'
import { puedeVerDashboard } from '@/lib/capabilities'
import { formatNum } from '@/lib/utils'
import { getResumen, type EstadoProyecto } from '@/api/proyectos'
import { PROYECTO_META } from '@/components/proyectos/badgeMeta'
import { ProyectoCard } from '@/components/proyectos/ProyectoCard'
import { NuevoProyectoDialog } from '@/components/proyectos/NuevoProyectoDialog'
import { useTableroProyectos, type Filtros } from '@/hooks/useTableroProyectos'

type VistaKey = 'operativa' | 'cierre' | 'archivo'

const VISTAS: { key: VistaKey; label: string; hint: string; columnas: EstadoProyecto[]; soloLectura?: boolean }[] = [
  { key: 'operativa', label: 'Operativa', hint: 'El día a día del taller',
    columnas: ['planificacion', 'activo', 'en_revision', 'en_pausa', 'cancelado'] },
  { key: 'cierre', label: 'Cierre', hint: 'Revisión y entrega final',
    columnas: ['en_revision', 'completado'] },
  { key: 'archivo', label: 'Archivo', hint: 'Histórico, solo consulta',
    columnas: ['archivado'], soloLectura: true },
]

const ORDENES: { key: Filtros['orden']; label: string }[] = [
  { key: 'reciente', label: 'Más reciente' },
  { key: 'entrega', label: 'Entrega más próxima' },
  { key: 'avance', label: 'Mayor avance' },
  { key: 'nombre', label: 'Nombre (A–Z)' },
]

export default function ProyectosPage() {
  const usuario = useAuthStore((s) => s.usuario)
  const esGestor = puedeVerDashboard(usuario)

  const [vista, setVista] = useState<VistaKey>('operativa')
  const [busqueda, setBusqueda] = useState('')
  const [q, setQ] = useState('')
  const [orden, setOrden] = useState<Filtros['orden']>('reciente')
  const [dialogAbierto, setDialogAbierto] = useState(false)

  // Debounce del texto de búsqueda
  useEffect(() => {
    const t = setTimeout(() => setQ(busqueda.trim()), 300)
    return () => clearTimeout(t)
  }, [busqueda])

  const vistaCfg = useMemo(() => VISTAS.find((v) => v.key === vista)!, [vista])
  const soloLectura = !!vistaCfg.soloLectura || !esGestor

  const filtros: Filtros = useMemo(() => ({ q, cliente: '', material: '', orden }), [q, orden])
  const { state, cargarMas, recargar, mover } = useTableroProyectos(vistaCfg.columnas, filtros)

  const resumen = useQuery({ queryKey: ['proyectos-resumen'], queryFn: getResumen, staleTime: 1000 * 30 })

  function onDragEnd(r: DropResult) {
    if (!r.destination || r.destination.droppableId === r.source.droppableId) return
    mover(
      Number(r.draggableId),
      r.source.droppableId as EstadoProyecto,
      r.destination.droppableId as EstadoProyecto,
    )
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-[1400px]">
        <PageHeader
          kicker="Proyectos"
          title="Proyectos"
          subtitle={vistaCfg.hint}
          actions={
            esGestor ? (
              <Button size="sm" onClick={() => setDialogAbierto(true)}>
                <Plus size={15} aria-hidden="true" /> Nuevo proyecto
              </Button>
            ) : undefined
          }
        />

        {/* Franja de resumen del módulo (no duplica el Dashboard global) */}
        <div className="mb-5 grid grid-cols-3 gap-3">
          <ResumenTile label="Proyectos activos" valor={resumen.data?.proyectos_activos} />
          <ResumenTile label="Tareas en progreso" valor={resumen.data?.tareas_en_progreso} />
          <ResumenTile
            label="Horas registradas"
            valor={resumen.data ? `${formatNum(resumen.data.horas_registradas, 1)} h` : undefined}
          />
        </div>

        {/* Vistas + orden */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <SegmentedControl
            mode="buttons"
            ariaLabel="Vista del tablero"
            value={vista}
            onChange={(v) => setVista(v as VistaKey)}
            options={VISTAS.map((v) => ({ value: v.key, label: v.label }))}
          />
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre, cliente o material…"
              aria-label="Buscar proyectos"
              className="h-9 w-[min(280px,60vw)] rounded-lg border border-brand-border bg-brand-surface px-3 text-sm text-brand-text outline-none focus-visible:border-brand-primary"
            />
            <select
              value={orden}
              onChange={(e) => setOrden(e.target.value as Filtros['orden'])}
              aria-label="Ordenar"
              className="h-9 rounded-lg border border-brand-border bg-brand-surface px-2 text-sm text-brand-text outline-none focus-visible:border-brand-primary cursor-pointer"
            >
              {ORDENES.map((o) => (
                <option key={o.key} value={o.key}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tablero */}
        <DragDropContext
          onDragEnd={onDragEnd}
          dragHandleUsageInstructions="Presiona Espacio para levantar la tarjeta. Usa las flechas para moverla entre columnas y Espacio de nuevo para soltarla."
        >
          <div className="flex gap-4 overflow-x-auto pb-4">
            {vistaCfg.columnas.map((estado) => {
              const col = state[estado]
              const meta = PROYECTO_META[estado]
              return (
                <div key={estado} className="flex w-[300px] shrink-0 flex-col">
                  <div className="mb-2 flex items-center gap-2 px-1">
                    <span className={`h-2 w-2 rounded-full ${meta.dot}`} aria-hidden="true" />
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-brand-text-secondary">
                      {meta.label}
                    </span>
                    <span className="text-[11px] text-brand-text-tertiary">
                      {col?.items.length ?? 0}
                    </span>
                  </div>

                  <Droppable droppableId={estado} isDropDisabled={soloLectura}>
                    {(dp) => (
                      <div
                        ref={dp.innerRef}
                        {...dp.droppableProps}
                        className="flex min-h-[120px] flex-1 flex-col gap-2 rounded-xl bg-brand-border/20 p-2"
                      >
                        {col?.cargando && !col.items.length ? (
                          <ColSkeleton />
                        ) : col && col.items.length === 0 ? (
                          <EmptyState title="Sin proyectos aquí" />
                        ) : (
                          col?.items.map((p, i) => (
                            <Draggable
                              key={p.id}
                              draggableId={String(p.id)}
                              index={i}
                              isDragDisabled={soloLectura}
                            >
                              {(drag: DraggableProvided) => (
                                <div
                                  ref={drag.innerRef}
                                  {...drag.draggableProps}
                                  {...drag.dragHandleProps}
                                  className="rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                                >
                                  <ProyectoCard
                                    proyecto={p}
                                    columnasDestino={vistaCfg.columnas}
                                    onMover={(id, hacia) => mover(id, estado, hacia)}
                                    puedeMover={!soloLectura}
                                  />
                                </div>
                              )}
                            </Draggable>
                          ))
                        )}
                        {dp.placeholder}

                        {col?.topeAlcanzado && (
                          <p className="px-1 py-2 text-center text-[11px] text-brand-text-tertiary">
                            Muchos proyectos — afiná la búsqueda para ver el resto.
                          </p>
                        )}
                        {col?.hayMas && !col.topeAlcanzado && (
                          <button
                            type="button"
                            onClick={() => cargarMas(estado)}
                            disabled={col.cargando}
                            className="mt-1 h-8 rounded-lg border border-brand-border bg-brand-surface text-xs font-semibold text-brand-text-secondary hover:border-brand-primary/40 cursor-pointer"
                          >
                            {col.cargando ? 'Cargando…' : 'Cargar más'}
                          </button>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              )
            })}
          </div>
        </DragDropContext>
      </div>

      <NuevoProyectoDialog
        open={dialogAbierto}
        onClose={() => setDialogAbierto(false)}
        onCreado={recargar}
      />
    </AppLayout>
  )
}

function ResumenTile({ label, valor }: { label: string; valor: number | string | undefined }) {
  return (
    <Card className="flex items-center gap-3 p-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary">
        <FolderKanban size={16} aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block font-mono text-lg font-bold leading-none tabular-nums text-brand-text-dark">
          {valor ?? '—'}
        </span>
        <span className="mt-1 block text-[11px] leading-snug text-brand-text-secondary">{label}</span>
      </span>
    </Card>
  )
}

function ColSkeleton() {
  return (
    <div className="space-y-2" role="status" aria-busy="true">
      <span className="sr-only">Cargando…</span>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-24 rounded-xl bg-brand-border/40" />
      ))}
    </div>
  )
}
