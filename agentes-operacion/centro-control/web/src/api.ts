export type Row = { id: string; kind: string; data: Record<string, string | null>; version: number; archived: boolean; created_at: string; updated_at: string }
export type User = { id: string; name: string; email: string; role: 'fundador' | 'comercial' | 'lectura' }
export type List = { items: Row[]; total: number; offset: number; limit: number }
export type FieldSchema = { type?: string; title?: string; enum?: string[]; default?: string | number | null; anyOf?: FieldSchema[]; format?: string; maxLength?: number; minLength?: number; minimum?: number; maximum?: number }
export type Meta = Record<string, { schema: { properties: Record<string, FieldSchema>; required?: string[] }; parent?: [string, string] | null }>
export type Proposal = { id: string; kind: string; action: string; record_id: string | null; data: Record<string, string | null>; before: Row | null; version: number | null; state: string; expires: string; result: Row | null }
export type Summary = { empresas: number; clientes: number; oportunidades_abiertas: number; valor_pipeline: string; tareas_vencidas: number; tickets_abiertos: number; proximas_tareas: Row[]; seguimientos: Row[]; advertencia: string }
export type Evidence = { tool?: string; ok?: boolean; at?: string; total?: number; ids?: string[]; error?: string; action?: string; record_id?: string }
export type Message = { id: number; role: string; text: string; evidence: Evidence[] }
export type Audit = { id: string; actor_id: string; record_id: string; action: string; origin: string; created_at: string; before: Row | null; after: Row }
let csrf = ''
export function setCsrf(value: string) { csrf = value }
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch('/api' + path, { ...options, credentials: 'same-origin', headers: { 'Content-Type': 'application/json', ...(csrf ? { 'X-CSRF-Token': csrf } : {}), ...options.headers } })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    if (response.status === 401 && path !== '/login') window.dispatchEvent(new Event('crm-session-expired'))
    throw new Error(typeof body.detail === 'string' ? body.detail : 'No se pudo completar la solicitud.')
  }
  return body as T
}
export const title = (row: Row) => row.data.nombre || row.data.titulo || row.data.concepto || ('Suscripción ' + (row.data.plan || ''))
export const money = (value: string | number | null | undefined) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(value || 0))
export const dateText = (value: string | null | undefined) => value ? new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(new Date(value.length === 10 ? value + 'T12:00:00' : value)) : 'Sin fecha'
export const labels: Record<string, string> = { empresa_id: 'Empresa relacionada', proveedor_id: 'Proveedor relacionado', valor_mensual: 'Valor mensual previsto (COP)', importe_mensual: 'Importe mensual (COP)', importe: 'Importe (COP)', fecha_seguimiento: 'Fecha de seguimiento', proximo_paso: 'Próximo paso', motivo_perdida: 'Motivo de pérdida', permiso_contacto: 'Permiso de contacto', telefono: 'Teléfono', email: 'Correo electrónico', nit: 'NIT', renovacion: 'Próxima renovación', descripcion: 'Descripción', titulo: 'Título', categoria: 'Categoría' }
export const label = (key: string) => labels[key] || key.charAt(0).toUpperCase() + key.slice(1).replaceAll('_', ' ')
