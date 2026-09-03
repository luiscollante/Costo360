import { useCallback, useEffect, useRef, useState } from 'react'
import {
  listarProyectos, moverProyecto,
  type EstadoProyecto, type Proyecto,
} from '@/api/proyectos'

const PAGE_SIZE = 25
const MAX_CARGADAS = 200 // más allá de esto, pedir afinar la búsqueda

export interface Filtros {
  q: string
  cliente: string
  material: string
  orden: 'reciente' | 'entrega' | 'avance' | 'nombre'
}

interface ColumnaState {
  items: Proyecto[]
  cargando: boolean
  hayMas: boolean
  topeAlcanzado: boolean
}

const COL_VACIA: ColumnaState = { items: [], cargando: true, hayMas: false, topeAlcanzado: false }

/**
 * Carga el tablero columna por columna, paginando en el backend (nunca se trae
 * el catálogo entero). Reescritura de `useBoardData` del prototipo Base44 contra
 * `/api/proyectos`. El movimiento entre columnas es optimista.
 */
export function useTableroProyectos(columns: EstadoProyecto[], filtros: Filtros) {
  const [state, setState] = useState<Record<string, ColumnaState>>({})
  const reqRef = useRef(0)
  const key = JSON.stringify([columns, filtros])

  const fetchPage = useCallback(
    async (estado: EstadoProyecto, skip: number, token: number) => {
      const { items } = await listarProyectos({
        estado,
        q: filtros.q || undefined,
        orden: filtros.orden,
        limit: PAGE_SIZE + 1,
        offset: skip,
      })
      if (token !== reqRef.current) return
      // El backend filtra por `q` (nombre/cliente/material). `cliente`/`material`
      // exactos se afinan en el cliente sobre lo ya traído.
      const filtrados = items.filter(
        (p) =>
          (!filtros.cliente || p.cliente === filtros.cliente) &&
          (!filtros.material || p.material === filtros.material),
      )
      const hayMas = items.length > PAGE_SIZE
      const page = hayMas ? filtrados.slice(0, PAGE_SIZE) : filtrados
      setState((prev) => {
        const previos = skip === 0 ? [] : prev[estado]?.items ?? []
        const merged = [...previos, ...page]
        return {
          ...prev,
          [estado]: {
            items: merged,
            cargando: false,
            hayMas: hayMas && merged.length < MAX_CARGADAS,
            topeAlcanzado: hayMas && merged.length >= MAX_CARGADAS,
          },
        }
      })
    },
    [filtros.q, filtros.cliente, filtros.material, filtros.orden],
  )

  useEffect(() => {
    const token = ++reqRef.current
    // Reset de todas las columnas al cambiar de vista/filtros y recarga (patrón
    // de `useBoardData` del prototipo; mismo caso que los 23 pre-existentes).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(Object.fromEntries(columns.map((c) => [c, COL_VACIA])))
    columns.forEach((estado) => {
      void fetchPage(estado, 0, token)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const cargarMas = useCallback(
    (estado: EstadoProyecto) => {
      const col = state[estado]
      if (!col || col.cargando || !col.hayMas) return
      setState((prev) => ({ ...prev, [estado]: { ...prev[estado], cargando: true } }))
      void fetchPage(estado, col.items.length, reqRef.current)
    },
    [state, fetchPage],
  )

  const recargar = useCallback(() => {
    const token = ++reqRef.current
    columns.forEach((estado) => {
      setState((prev) => ({ ...prev, [estado]: { ...(prev[estado] ?? COL_VACIA), cargando: true } }))
      void fetchPage(estado, 0, token)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, fetchPage])

  /** Mueve una tarjeta entre columnas de forma optimista y persiste el estado. */
  const mover = useCallback(
    async (id: number, desde: EstadoProyecto, hacia: EstadoProyecto) => {
      if (desde === hacia) return
      let movido: Proyecto | undefined
      setState((prev) => {
        const origen = prev[desde]?.items ?? []
        movido = origen.find((p) => p.id === id)
        if (!movido) return prev
        const next: Record<string, ColumnaState> = {
          ...prev,
          [desde]: { ...prev[desde], items: origen.filter((p) => p.id !== id) },
        }
        if (prev[hacia]) {
          const actualizado = { ...movido, estado: hacia, archivado: hacia === 'archivado' }
          next[hacia] = { ...prev[hacia], items: [actualizado, ...prev[hacia].items] }
        }
        return next
      })
      try {
        await moverProyecto(id, hacia)
      } catch {
        recargar() // revertir consultando la verdad del backend
      }
    },
    [recargar],
  )

  return { state, cargarMas, recargar, mover }
}
