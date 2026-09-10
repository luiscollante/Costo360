import type { Usuario } from '@/api/auth'

/**
 * Capacidades de rol — fuente única. Se apoya en los 4 flags de `roles_catalogo`
 * que el backend devuelve en `/api/auth/me` (no se inventan flags nuevos: Regla 3).
 */

/** Regla 6: acceso a Dashboard, modo BI Senior y datos agregados del Agente. */
export function puedeVerDashboard(u: Usuario | null | undefined): boolean {
  return !!u?.puede_ver_dashboard
}

/** Rutas visibles solo para roles con acceso a Dashboard/BI (Regla 6). */
export const RUTAS_SOLO_DASHBOARD = ['/dashboard', '/parametros', '/configuracion'] as const

/** Modo BI del Centro del Agente (Ciclo 3) — agregados de la bitácora del
 * Agente y su exportación CSV. Mismo flag de `roles_catalogo` que ya existía
 * sin usar desde la migración 0001 (decisión del fundador: reusar, no crear
 * uno nuevo). La bitácora propia (sin este permiso) la ve cualquier usuario
 * autenticado — solo el modo BI agregado necesita esta capacidad. */
export function puedePedirDatosAgregadosAgente(u: Usuario | null | undefined): boolean {
  return !!u?.puede_pedir_datos_agregados_agente
}

/** Ruta "casa" según el rol: Dashboard si puede verlo, si no Nueva Cotización. */
export function homeDeRol(u: Usuario | null | undefined): string {
  return puedeVerDashboard(u) ? '/dashboard' : '/cotizacion'
}
