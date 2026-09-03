import type {
  DragStart, DragUpdate, DropResult, ResponderProvided,
} from '@hello-pangea/dnd'

/**
 * Mensajes en vivo en español para el lector de pantalla durante el arrastre
 * (hallazgo Fase 5 a11y — `@hello-pangea/dnd` los emite en inglés por defecto).
 * `tarjeta(id)` y `columna(id)` traducen el id crudo a texto legible.
 */
export function crearResponders(
  tarjeta: (draggableId: string) => string,
  columna: (droppableId: string) => string,
): {
  onDragStart: (s: DragStart, p: ResponderProvided) => void
  onDragUpdate: (u: DragUpdate, p: ResponderProvided) => void
} {
  return {
    onDragStart: (s, p) => {
      p.announce(
        `Levantaste "${tarjeta(s.draggableId)}". Usa las flechas para moverla entre columnas y Espacio para soltarla.`,
      )
    },
    onDragUpdate: (u, p) => {
      if (!u.destination) {
        p.announce('No estás sobre una columna válida.')
        return
      }
      p.announce(
        `"${tarjeta(u.draggableId)}" sobre la columna ${columna(u.destination.droppableId)}, posición ${u.destination.index + 1}.`,
      )
    },
  }
}

/** Mensaje para el `onDragEnd` del consumidor (que además ejecuta el movimiento). */
export function anuncioFin(
  r: DropResult,
  p: ResponderProvided,
  tarjeta: (id: string) => string,
  columna: (id: string) => string,
): void {
  if (!r.destination || r.destination.droppableId === r.source.droppableId) {
    p.announce(`Dejaste "${tarjeta(r.draggableId)}" en su columna original.`)
    return
  }
  p.announce(`Moviste "${tarjeta(r.draggableId)}" a la columna ${columna(r.destination.droppableId)}.`)
}
