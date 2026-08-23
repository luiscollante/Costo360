import { api } from '@/api/client'

export interface DashboardUltima {
  id: number
  numero: string
  fecha: string
  cliente: string
  material: string
  precio: number
  margen: number
  estado: string
}

export interface DashboardResumen {
  cotizaciones_mes: number
  facturacion_mes: number
  margen_promedio: number
  por_estado: Record<string, number>
  historial_mensual: { mes: string; cotizaciones: number; facturado: number; margen_prom: number }[]
  top_materiales: { material: string; cotizaciones: number; revenue: number }[]
  ultimas: DashboardUltima[]
}

export async function getDashboardResumen(): Promise<DashboardResumen> {
  const { data } = await api.get<DashboardResumen>('/api/dashboard/resumen')
  return data
}
