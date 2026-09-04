import { useCallback, useEffect, useRef, useState } from 'react'
import axios from 'axios'
import {
  listarProyectos, moverProyecto,
  type EstadoProyecto, type Proyecto,
} from '@/api/proyectos'

const PAGE_SIZE = 25
const MAX_CARGADAS = 200 // más allá de esto, pedir afinar la búsqueda

export interface Filtros {
  q: string
  orden: 'reciente' | 'entrega' | 'avance' | 'nombre'
}

interface ColumnaState {
  items: Proyecto[]
  cargando: boolean
  error: boolean
  hayMas: boolean
  topeAlcanzado: boolean
}

function colVacia(): ColumnaState {
  return { items: [], cargando: true, error: false, hayMas: false, topeAlcanzado: false }
}

/**
 * Carga el tablero columna por columna, paginando en el backend (nunca se trae
 * el catálogo entero). Reescritura de `useBoardData` del prototipo Base44 contra
 * `/api/proyectos`. El movimiento entre columnas es optimista con reversión por
 * snapshot y reconciliación tras el éxito.
 */
/** Espera transitoria: sin respuesta (red/timeout) o 5xx — nunca 4xx. */
function esTransitorio(err: unknown): boolean {
  if (!axios.isAxiosError(err)) return false
  const status = err.response?.status
  return status === undefined || status >= 500
}

export function useTableroProyectos(columns: EstadoProyecto[], filtros: Filtros) {
  const [state, setState] = useState<Record<string, ColumnaState>>({})
  const reqRef = useRef(0)
  const controladoresRef = useRef<Set<AbortController>>(new Set())
  const key = JSON.stringify([columns, filtros])

  const fetchPage = useCallback(
    async (estado: EstadoProyecto, skip: number, token: number): Promise<void> => {
      // Hasta 2 intentos: el 2º solo si el 1º falló de forma transitoria (red/5xx).
      for (let intento = 0; intento < 2; intento++) {
        const controller = new AbortController()
        controladoresRef.current.add(controller)
        try {
          const { items } = await listarProyectos(
            {
              estado,
              q: filtros.q || undefined,
              orden: filtros.orden,
              limit: PAGE_SIZE + 1,
              offset: skip,
            },
            controller.signal,
          )
          if (token !== reqRef.current) return
          const hayMas = items.length > PAGE_SIZE
          const page = hayMas ? items.slice(0, PAGE_SIZE) : items
          setState((prev) => {
            const previos = skip === 0 ? [] : prev[estado]?.items ?? []
            const merged = [...previos, ...page]
            return {
              ...prev,
              [estado]: {
                items: merged,
                cargando: false,
                error: false,
                hayMas: hayMas && merged.length < MAX_CARGADAS,
                topeAlcanzado: hayMas && merged.length >= MAX_CARGADAS,
              },
            }
          })
          return
        } catch (err) {
          // Cancelación intencional (cleanup/re-key) — no es un error, no se reporta.
          if (axios.isCancel(err)) return
          if (token !== reqRef.current) return
          if (intento === 0 && esTransitorio(err)) {
            await new Promise((r) => setTimeout(r, 400))
            if (token !== reqRef.current) return
            continue // 2º y último intento
          }
          setState((prev) => ({
            ...prev,
            [estado]: { ...(prev[estado] ?? colVacia()), cargando: false, error: true },
          }))
          return
        } finally {
          controladoresRef.current.delete(controller)
        }
      }
    },
    [filtros.q, filtros.orden],
  )

  useEffect(() => {
    const token = ++reqRef.current
    const controladores = controladoresRef.current
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(Object.fromEntries(columns.map((c) => [c, colVacia()])))
    columns.forEach((estado) => {
      void fetchPage(estado, 0, token)
    })
    return () => {
      controladores.forEach((c) => c.abort())
      controladores.clear()
    }
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

  const recargar = useCallback(
    (estado?: EstadoProyecto) => {
      const token = ++reqRef.current
      const cols = estado ? [estado] : columns
      cols.forEach((e) => {
        setState((prev) => ({ ...prev, [e]: { ...colVacia() } }))
        void fetchPage(e, 0, token)
      })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, fetchPage],
  )

  /** Mueve una tarjeta entre columnas: optimista, revierte por snapshot, reconcilia al éxito. */
  const mover = useCallback(
    async (id: number, desde: EstadoProyecto, hacia: EstadoProyecto): Promise<boolean> => {
      if (desde === hacia) return true
      let previo: Record<string, ColumnaState> | null = null
      setState((prev) => {
        previo = prev
        const origen = prev[desde]?.items ?? []
        const movido = origen.find((p) => p.id === id)
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
        // Reconciliar la columna destino con la verdad del backend (progreso,
        // en_riesgo, contadores). La de origen ya no contiene la tarjeta.
        if (columns.includes(hacia)) recargar(hacia)
        return true
      } catch {
        if (previo) setState(previo)
        return false
      }
    },
    [columns, recargar],
  )

  const algunError = columns.some((c) => state[c]?.error)

  return { state, cargarMas, recargar, mover, algunError }
}
