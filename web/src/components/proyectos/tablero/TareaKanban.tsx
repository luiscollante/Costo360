import {
  DragDropContext, Draggable, Droppable,
  type DropResult, type DraggableProvided,
} from '@hello-pangea/dnd'
import { EmptyState } from '@/components/ui/EmptyState'
import type { EstadoTarea, Tarea } from '@/api/proyectos'
import { TAREA_META } from '@/components/proyectos/badgeMeta'
import { TareaCard } from './TareaCard'

const COLUMNAS: EstadoTarea[] = ['bloqueada', 'por_hacer', 'en_progreso', 'revision', 'completada']

export function TareaKanban({
  tareas,
  nombreDe,
  puedeEditar,
  onMover,
  onAbrir,
}: {
  tareas: Tarea[]
  nombreDe: (id: string | null) => string | undefined
  puedeEditar: (t: Tarea) => boolean
  onMover: (tarea: Tarea, hacia: EstadoTarea) => void
  onAbrir: (t: Tarea) => void
}) {
  const porColumna = (estado: EstadoTarea) =>
    tareas.filter((t) => t.estado === estado).sort((a, b) => a.orden - b.orden)

  function onDragEnd(r: DropResult) {
    if (!r.destination || r.destination.droppableId === r.source.droppableId) return
    const tarea = tareas.find((t) => String(t.id) === r.draggableId)
    if (tarea) onMover(tarea, r.destination.droppableId as EstadoTarea)
  }

  return (
    <DragDropContext
      onDragEnd={onDragEnd}
      dragHandleUsageInstructions="Presiona Espacio para levantar la tarea. Flechas para moverla, Espacio para soltarla."
    >
      <div className="flex gap-3 overflow-x-auto pb-4">
        {COLUMNAS.map((estado) => {
          const items = porColumna(estado)
          const meta = TAREA_META[estado]
          return (
            <div key={estado} className="flex w-[260px] shrink-0 flex-col">
              <div className="mb-2 flex items-center gap-2 px-1">
                <span className={`h-2 w-2 rounded-full ${meta.dot}`} aria-hidden="true" />
                <span className="text-[11px] font-semibold uppercase tracking-wide text-brand-text-secondary">
                  {meta.label}
                </span>
                <span className="text-[11px] text-brand-text-tertiary">{items.length}</span>
              </div>
              <Droppable droppableId={estado}>
                {(dp) => (
                  <div
                    ref={dp.innerRef}
                    {...dp.droppableProps}
                    className="flex min-h-[100px] flex-1 flex-col gap-2 rounded-xl bg-brand-border/20 p-2"
                  >
                    {items.length === 0 ? (
                      <EmptyState title="—" />
                    ) : (
                      items.map((t, i) => {
                        const editable = puedeEditar(t)
                        return (
                          <Draggable
                            key={t.id}
                            draggableId={String(t.id)}
                            index={i}
                            isDragDisabled={!editable}
                          >
                            {(drag: DraggableProvided) => (
                              <div
                                ref={drag.innerRef}
                                {...drag.draggableProps}
                                {...drag.dragHandleProps}
                                className="rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                              >
                                <TareaCard
                                  tarea={t}
                                  responsableNombre={nombreDe(t.responsable_id)}
                                  columnas={COLUMNAS}
                                  onAbrir={() => onAbrir(t)}
                                  onMover={(hacia) => onMover(t, hacia)}
                                  puedeMover={editable}
                                />
                              </div>
                            )}
                          </Draggable>
                        )
                      })
                    )}
                    {dp.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          )
        })}
      </div>
    </DragDropContext>
  )
}
