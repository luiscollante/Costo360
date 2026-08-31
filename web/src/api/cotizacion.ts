import { api } from '@/api/client'
import { downloadFile } from '@/lib/downloadFile'
import { showToast } from '@/lib/toast'
import type { CotizacionDirectaIn, CotizacionResult, AIUIn, ResultadoAIU } from '@/types/cotizacion'

// ── Cotización Directa ────────────────────────────────────────────────────────

export async function calcularCotizacionDirecta(
  body: CotizacionDirectaIn
): Promise<CotizacionResult> {
  const { data } = await api.post<CotizacionResult>('/api/cotizacion/directa', body)
  return data
}

export async function guardarCotizacion(
  cliente: string,
  resultado: CotizacionResult,
  numero?: string,
  inclusiones: string[] = [],
  exclusiones: string[] = []
): Promise<{ id: number; numero: string }> {
  const { data } = await api.post('/api/cotizacion/guardar', {
    cliente,
    resultado: { ...resultado, inclusiones, exclusiones },
    numero: numero ?? '',
  })
  return data
}

export interface CotizacionResumen {
  id: number
  numero: string
  fecha: string
  cliente: string
  material: string
  tipo: string
  ml: number
  precio: number
  margen: number
  estado: string
}

export interface HistorialFiltros {
  busqueda?: string
  estado?: string
  fecha_desde?: string
  fecha_hasta?: string
}

export async function listarCotizaciones(filtros: HistorialFiltros = {}): Promise<CotizacionResumen[]> {
  const params: Record<string, string> = {}
  if (filtros.busqueda)    params.busqueda = filtros.busqueda
  if (filtros.estado)      params.estado = filtros.estado
  if (filtros.fecha_desde) params.fecha_desde = filtros.fecha_desde
  if (filtros.fecha_hasta) params.fecha_hasta = filtros.fecha_hasta
  const { data } = await api.get<CotizacionResumen[]>('/api/cotizacion/historial', { params })
  return data
}

export async function getCotizacionDatos(id: number): Promise<{ datos: Record<string, unknown>; numero: string }> {
  const { data } = await api.get<{ datos: Record<string, unknown>; numero: string }>(`/api/cotizacion/${id}/datos`)
  return data
}

export async function actualizarEstado(id: number, estado: string): Promise<void> {
  await api.patch(`/api/cotizacion/${id}/estado`, { estado })
}

export async function eliminarCotizacion(id: number): Promise<void> {
  await api.delete(`/api/cotizacion/${id}`)
}

async function descargarBlob(
  request: () => Promise<{ data: Blob }>,
  filename: string,
  mimeType: string
): Promise<void> {
  let blob: Blob
  try {
    blob = (await request()).data
  } catch (err) {
    showToast('error', `No se pudo generar ${filename}. Intenta de nuevo.`)
    throw err
  }
  await downloadFile(blob, filename, mimeType)
}

export async function descargarPDF(id: number): Promise<void> {
  await descargarBlob(
    () => api.get(`/api/cotizacion/${id}/pdf`, { responseType: 'blob', timeout: 60_000 }),
    `cotizacion-${id}.pdf`,
    'application/pdf'
  )
}

export async function descargarCuentaCobro(
  id: number,
  nombrePagador: string,
  nitPagador: string,
  numeroCc?: string
): Promise<void> {
  await descargarBlob(
    () =>
      api.post(
        `/api/cotizacion/${id}/cuenta-cobro`,
        { nombre_pagador: nombrePagador, nit_pagador: nitPagador, numero_cc: numeroCc ?? '' },
        { responseType: 'blob', timeout: 60_000 }
      ),
    `cuenta-cobro-${id}.pdf`,
    'application/pdf'
  )
}

// ── AIU ──────────────────────────────────────────────────────────────────────

export async function calcularAIU(body: AIUIn): Promise<ResultadoAIU> {
  const { data } = await api.post<ResultadoAIU>('/api/cotizacion/aiu', body)
  return data
}

export async function guardarAIU(
  cliente: string,
  resultado: ResultadoAIU,
  numero?: string
): Promise<{ id: number; numero: string }> {
  const { data } = await api.post('/api/cotizacion/aiu/guardar', {
    cliente,
    resultado,
    numero: numero ?? '',
  })
  return data
}

export async function descargarPDFAiu(id: number): Promise<void> {
  await descargarBlob(
    () => api.get(`/api/cotizacion/${id}/aiu-pdf`, { responseType: 'blob', timeout: 60_000 }),
    `oferta-aiu-${id}.pdf`,
    'application/pdf'
  )
}
