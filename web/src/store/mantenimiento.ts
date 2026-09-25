import { create } from 'zustand'

/**
 * Modo mantenimiento (pedido del fundador 2026-09-25): cuando el servidor no
 * responde, la app muestra una página amable de "estamos mejorando Costo360"
 * en vez de errores o de mandar al usuario al login. Se activa si:
 *  - el servidor responde 503 con `mantenimiento: true` (mantenimiento planeado), o
 *  - una petición falla sin respuesta / con 5xx Y `/api/health` tampoco responde
 *    (un error puntual de una sola ruta NO dispara la página).
 * Revisa `/api/health` cada 30 s y, al volver, se oculta sola sin cerrar sesión.
 */
const BASE_URL = import.meta.env.VITE_API_URL ?? ''

type Estado = { activo: boolean; planeado: boolean; activar: (planeado: boolean) => void; desactivar: () => void }

// Pantalla donde estaba el usuario cuando se cayó el servidor: al volver, se
// regresa ahí (mientras tanto la app pudo haberlo movido al login por detrás).
// La guarda `recordarRuta` en cada cambio de pantalla (ver App.tsx) — no al
// activar, porque la app pudo haber movido al usuario al login antes.
let rutaPrevia: string | null =
  window.location.pathname !== '/login' && window.location.pathname !== '/' ? window.location.pathname + window.location.search : null

export function recordarRuta(ruta: string) {
  if (!ruta.startsWith('/login') && ruta !== '/' && !useMantenimiento.getState().activo) rutaPrevia = ruta
}

export const useMantenimiento = create<Estado>((set) => ({
  activo: false,
  planeado: false,
  activar: (planeado) => set({ activo: true, planeado }),
  desactivar: () => {
    set({ activo: false, planeado: false })
    if (rutaPrevia && window.location.pathname === '/login') {
      const destino = rutaPrevia
      rutaPrevia = null
      window.location.assign(destino)
    }
  },
}))

/** `ok` = servidor sano y sin mantenimiento; `mantenimiento` = planeado; `caido` = no responde. */
export async function consultarSalud(): Promise<'ok' | 'mantenimiento' | 'caido'> {
  try {
    const ctrl = new AbortController()
    const t = window.setTimeout(() => ctrl.abort(), 6000)
    const r = await fetch(BASE_URL + '/api/health', { signal: ctrl.signal, cache: 'no-store' })
    window.clearTimeout(t)
    if (!r.ok) return 'caido'
    const data = await r.json().catch(() => ({}))
    return data?.mantenimiento ? 'mantenimiento' : 'ok'
  } catch {
    return 'caido'
  }
}

let verificando = false

/** Llamado por el cliente HTTP ante un fallo del servidor: confirma con /api/health antes de mostrar la página. */
export async function verificarServidor(): Promise<void> {
  if (verificando || useMantenimiento.getState().activo) return
  verificando = true
  try {
    const salud = await consultarSalud()
    if (salud !== 'ok') useMantenimiento.getState().activar(salud === 'mantenimiento')
  } finally {
    verificando = false
  }
}
