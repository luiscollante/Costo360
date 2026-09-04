import { api } from './client'

// ── Tipos ───────────────────────────────────────────────────────────────────

export type EstadoProyecto =
  | 'planificacion' | 'activo' | 'en_revision' | 'completado'
  | 'en_pausa' | 'cancelado' | 'archivado'
export type EstadoTarea = 'bloqueada' | 'por_hacer' | 'en_progreso' | 'revision' | 'completada'
export type Prioridad = 'baja' | 'media' | 'alta' | 'urgente'
export type EstadoHito = 'pendiente' | 'en_progreso' | 'completado'
export type TipoNotificacion = 'desbloqueo' | 'recordatorio' | 'riesgo'

export interface Proyecto {
  id: number
  nombre: string
  descripcion: string
  cliente: string
  material: string
  estado: EstadoProyecto
  fecha_inicio: string | null
  fecha_fin: string | null
  progreso_pct: number
  tareas_total: number
  tareas_hechas: number
  archivado: boolean
  en_riesgo: boolean
  created_at: string | null
  updated_at: string | null
}

export interface Tarea {
  id: number
  project_id: number
  titulo: string
  descripcion: string
  estado: EstadoTarea
  prioridad: Prioridad
  responsable_id: string | null
  fecha_limite: string | null
  horas_estimadas: number | null
  milestone_id: number | null
  orden: number
  created_at: string | null
  updated_at: string | null
}

export interface Hito {
  id: number
  project_id: number
  titulo: string
  descripcion: string
  fecha_inicio: string | null
  fecha_limite: string | null
  estado: EstadoHito
  created_at: string | null
  updated_at: string | null
}

export interface RegistroHoras {
  id: number
  task_id: number
  project_id: number
  usuario_id: string | null
  user_name: string
  horas: number
  fecha: string
  nota: string
  created_at: string | null
}

export interface Comentario {
  id: number
  task_id: number
  autor_id: string | null
  autor_nombre: string
  contenido: string
  created_at: string | null
}

export interface Notificacion {
  id: number
  titulo: string
  mensaje: string
  tipo: TipoNotificacion
  project_id: number | null
  task_id: number | null
  leida: boolean
  created_at: string | null
}

export interface ResumenProyectos {
  proyectos_activos: number
  tareas_en_progreso: number
  horas_registradas: number
}

export interface UsuarioTaller {
  id: string
  nombre: string
  cargo: string | null
  rol: string
}

// ── Proyectos ───────────────────────────────────────────────────────────────

export interface ListarProyectosParams {
  estado?: EstadoProyecto
  archivado?: boolean
  q?: string
  orden?: 'reciente' | 'entrega' | 'avance' | 'nombre'
  limit?: number
  offset?: number
}

export interface PaginaProyectos {
  items: Proyecto[]
  hay_mas: boolean
}

export async function listarProyectos(
  params: ListarProyectosParams = {},
  signal?: AbortSignal,
): Promise<PaginaProyectos> {
  const res = await api.get<PaginaProyectos>('/api/proyectos', { params, signal })
  return res.data
}

export async function getResumen(): Promise<ResumenProyectos> {
  const res = await api.get<ResumenProyectos>('/api/proyectos/resumen')
  return res.data
}

export async function getUsuariosTaller(): Promise<UsuarioTaller[]> {
  const res = await api.get<UsuarioTaller[]>('/api/proyectos/usuarios')
  return res.data
}

export async function getProyecto(id: number): Promise<Proyecto> {
  const res = await api.get<Proyecto>(`/api/proyectos/${id}`)
  return res.data
}

export interface ProyectoNuevo {
  nombre: string
  descripcion?: string
  cliente?: string
  material?: string
  estado?: EstadoProyecto
  fecha_inicio?: string | null
  fecha_fin?: string | null
}

export async function crearProyecto(body: ProyectoNuevo): Promise<Proyecto> {
  const res = await api.post<Proyecto>('/api/proyectos', body)
  return res.data
}

export type ProyectoCambios = Partial<Omit<ProyectoNuevo, 'estado'>>

export async function editarProyecto(id: number, body: ProyectoCambios): Promise<Proyecto> {
  const res = await api.put<Proyecto>(`/api/proyectos/${id}`, body)
  return res.data
}

/** Mueve el proyecto en el Kanban de proyectos (solo admin/gerencia). */
export async function moverProyecto(id: number, estado: EstadoProyecto): Promise<Proyecto> {
  const res = await api.patch<Proyecto>(`/api/proyectos/${id}/estado`, { estado })
  return res.data
}

export async function borrarProyecto(id: number): Promise<void> {
  await api.delete(`/api/proyectos/${id}`)
}

// ── Tareas ──────────────────────────────────────────────────────────────────

export async function listarTareas(projectId: number): Promise<Tarea[]> {
  const res = await api.get<Tarea[]>(`/api/proyectos/${projectId}/tareas`)
  return res.data
}

export interface TareaNueva {
  titulo: string
  descripcion?: string
  prioridad?: Prioridad
  responsable_id?: string | null
  fecha_limite?: string | null
  horas_estimadas?: number | null
  milestone_id?: number | null
}

export async function crearTarea(projectId: number, body: TareaNueva): Promise<Tarea> {
  const res = await api.post<Tarea>(`/api/proyectos/${projectId}/tareas`, body)
  return res.data
}

/** El cambio de responsable va SIEMPRE por `asignarResponsable`, no por aquí. */
export type TareaCambios = Partial<
  Omit<TareaNueva, 'responsable_id'> & { estado: EstadoTarea; orden: number }
>

export async function editarTarea(tareaId: number, body: TareaCambios): Promise<Tarea> {
  const res = await api.put<Tarea>(`/api/proyectos/tareas/${tareaId}`, body)
  return res.data
}

/** Mueve la tarjeta en el Kanban de tareas (gestor o responsable). */
export async function moverTarea(
  tareaId: number,
  estado: EstadoTarea,
  orden?: number,
): Promise<Tarea> {
  const res = await api.patch<Tarea>(`/api/proyectos/tareas/${tareaId}`, { estado, orden })
  return res.data
}

/** Asigna responsable (gestor: cualquiera o null; no-gestor: solo a sí mismo si está libre). */
export async function asignarResponsable(
  tareaId: number,
  responsableId: string | null,
): Promise<Tarea> {
  const res = await api.patch<Tarea>(`/api/proyectos/tareas/${tareaId}/responsable`, {
    responsable_id: responsableId,
  })
  return res.data
}

export async function borrarTarea(tareaId: number): Promise<void> {
  await api.delete(`/api/proyectos/tareas/${tareaId}`)
}

// ── Hitos ───────────────────────────────────────────────────────────────────

export async function listarHitos(projectId: number): Promise<Hito[]> {
  const res = await api.get<Hito[]>(`/api/proyectos/${projectId}/hitos`)
  return res.data
}

export interface HitoNuevo {
  titulo: string
  descripcion?: string
  fecha_inicio?: string | null
  fecha_limite?: string | null
}

export async function crearHito(projectId: number, body: HitoNuevo): Promise<Hito> {
  const res = await api.post<Hito>(`/api/proyectos/${projectId}/hitos`, body)
  return res.data
}

export async function editarHito(hitoId: number, body: Partial<HitoNuevo>): Promise<Hito> {
  const res = await api.put<Hito>(`/api/proyectos/hitos/${hitoId}`, body)
  return res.data
}

export interface HitoEstadoResp extends Hito {
  tareas_desbloqueadas: number
}

/** Cambia el estado del hito; al completar, desbloquea sus tareas y devuelve cuántas. */
export async function cambiarEstadoHito(hitoId: number, estado: EstadoHito): Promise<HitoEstadoResp> {
  const res = await api.patch<HitoEstadoResp>(`/api/proyectos/hitos/${hitoId}/estado`, { estado })
  return res.data
}

// ── Registro de horas ───────────────────────────────────────────────────────

export async function listarHorasTarea(tareaId: number): Promise<RegistroHoras[]> {
  const res = await api.get<RegistroHoras[]>(`/api/proyectos/tareas/${tareaId}/horas`)
  return res.data
}

export async function listarHorasProyecto(projectId: number): Promise<RegistroHoras[]> {
  const res = await api.get<RegistroHoras[]>(`/api/proyectos/${projectId}/horas`)
  return res.data
}

export interface HorasNuevas {
  horas: number
  fecha?: string | null
  nota?: string
}

export async function registrarHoras(tareaId: number, body: HorasNuevas): Promise<RegistroHoras> {
  const res = await api.post<RegistroHoras>(`/api/proyectos/tareas/${tareaId}/horas`, body)
  return res.data
}

export async function borrarHoras(entryId: number): Promise<void> {
  await api.delete(`/api/proyectos/horas/${entryId}`)
}

// ── Comentarios ─────────────────────────────────────────────────────────────

export async function listarComentarios(tareaId: number): Promise<Comentario[]> {
  const res = await api.get<Comentario[]>(`/api/proyectos/tareas/${tareaId}/comentarios`)
  return res.data
}

export async function crearComentario(tareaId: number, contenido: string): Promise<Comentario> {
  const res = await api.post<Comentario>(`/api/proyectos/tareas/${tareaId}/comentarios`, { contenido })
  return res.data
}

export async function borrarComentario(comentarioId: number): Promise<void> {
  await api.delete(`/api/proyectos/comentarios/${comentarioId}`)
}

// ── Notificaciones ──────────────────────────────────────────────────────────

export async function listarNotificaciones(): Promise<Notificacion[]> {
  const res = await api.get<Notificacion[]>('/api/proyectos/notificaciones')
  return res.data
}

export async function marcarNotificacionLeida(id: number): Promise<void> {
  await api.patch(`/api/proyectos/notificaciones/${id}/leida`)
}

export async function marcarTodasLeidas(): Promise<{ marcadas: number }> {
  const res = await api.patch<{ marcadas: number }>('/api/proyectos/notificaciones/leer-todas')
  return res.data
}
