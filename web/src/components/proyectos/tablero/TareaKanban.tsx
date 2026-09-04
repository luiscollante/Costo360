import { useMemo } from 'react'
import {
  DragDropContext, Draggable, Droppable,
  type DropResult, type DraggableProvided, type ResponderProvided,
} from '@hello-pangea/dnd'
import { EmptyState } from '@/components/ui/EmptyState'
import type { EstadoTarea, Tarea } from '@/api/proyectos'
import { TAREA_META } from '@/components/proyectos/badgeMeta'
import { crearResponders, anuncioFin } from '@/components/proyectos/dndAnuncios'
import { TareaCard } from './TareaCard'

const COLUMNAS: EstadoTarea[] = ['bloqueada', 'por_hacer', 'en_progreso', 'revision', 'completada']

export function TareaKanban({
  tareas,
  nombreDe,
  esGestor,
  puedeEditar,
  onMover,
  onAbrir,
}: {
  tareas: Tarea[]
  nombreDe: (id: string | null) => string | undefined
  esGestor: boolean
  puedeEditar: (t: Tarea) => boolean
  onMover: (tarea: Tarea, hacia: EstadoTarea, orden?: number) => void
  onAbrir: (t: Tarea) => void
}) {
  const columnas = useMemo(
    () =>
      COLUMNAS.map((estado) => ({
        estado,
        items: tareas.filter((t) => t.estado === estado).sort((a, b) => a.orden - b.orden),
      })),
    [tareas],
  )

  const tituloDe = (id: string) => tareas.find((t) => String(t.id) === id)?.titulo ?? 'la tarea'
  const columnaDe = (id: string) => TAREA_META[id as EstadoTarea]?.label ?? id
  const responders = crearResponders(tituloDe, columnaDe)

  function onDragEnd(r: DropResult, p: ResponderProvided) {
    anuncioFin(r, p, tituloDe, columnaDe)
    if (!r.destination || r.destination.droppableId === r.source.droppableId) return
    const tarea = tareas.find((t) => String(t.id) === r.draggableId)
    if (tarea) onMover(tarea, r.destination.droppableId as EstadoTarea, r.destination.index)
  }

  return (
    <DragDropContext
      onDragEnd={onDragEnd}
      onDragStart={responders.onDragStart}
      onDragUpdate={responders.onDragUpdate}
      dragHandleUsageInstructions="Presiona Espacio para levantar la tarea. Flechas para moverla, Espacio para soltarla."
    >
      <div className="flex gap-3 overflow-x-auto pb-4 md:h-[65vh] md:min-h-0">
        {columnas.map(({ estado, items }) => {
          const meta = TAREA_META[estado]
          return (
            <div key={estado} className="flex w-[260px] shrink-0 flex-col md:min-h-0">
              <div className="mb-2 flex shrink-0 items-center gap-2 px-1">
                <span className={`h-2 w-2 rounded-full ${meta.dot}`} aria-hidden="true" />
                <span className="text-[11px] font-semibold uppercase tracking-wide text-brand-text-secondary">
                  {meta.label}
                </span>
                <span className="text-[11px] text-brand-text-secondary">{items.length}</span>
              </div>
              <Droppable droppableId={estado}>
                {(dp) => (
                  <div
                    ref={dp.innerRef}
                    {...dp.droppableProps}
                    className="flex min-h-[100px] flex-1 flex-col gap-2 rounded-xl bg-brand-border/20 p-2 md:min-h-0 md:overflow-y-auto md:pr-1"
                  >
                    {items.length === 0 ? (
                      <EmptyState title="Sin tareas" />
                    ) : (
                      items.map((t, i) => {
                        const editable = puedeEditar(t)
                        const bloqueadaParaMi = t.estado === 'bloqueada' && !esGestor
                        return (
                          <Draggable
                            key={t.id}
                            draggableId={String(t.id)}
                            index={i}
                            isDragDisabled={!editable || bloqueadaParaMi}
                          >
                            {(drag: DraggableProvided) => (
                              <div
                                ref={drag.innerRef}
                                {...drag.draggableProps}
                                className="rounded-xl"
                              >
                                <TareaCard
                                  tarea={t}
                                  responsableNombre={nombreDe(t.responsable_id)}
                                  columnas={COLUMNAS}
                                  esGestor={esGestor}
                                  onAbrir={() => onAbrir(t)}
                                  onMover={(hacia) => onMover(t, hacia)}
                                  puedeMover={editable}
                                  dragHandleProps={drag.dragHandleProps}
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
