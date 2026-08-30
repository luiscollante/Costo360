import { Capacitor } from '@capacitor/core'
import { api } from './client'
import { deviceLabel, getDeviceId } from '@/lib/deviceId'

export type SesionEstado = 'none' | 'activa' | 'takeover_pendiente'

export interface HeartbeatOut {
  estado: SesionEstado
  mine: boolean
  device_actual: string | null
  retador: string | null
  am_i_retador: boolean
}

export interface ClaimOut {
  status: 'active' | 'pending' | 'busy'
  prev_device?: string
}

async function devicePayload() {
  return {
    id: await getDeviceId(),
    label: deviceLabel(),
    plataforma: Capacitor.isNativePlatform() ? 'app' : 'web',
    user_agent: navigator.userAgent.slice(0, 200),
  }
}

export async function claimSession(force = false): Promise<ClaimOut> {
  const { data } = await api.post(
    `/api/auth/session/claim${force ? '?force=true' : ''}`,
    { device: await devicePayload() },
  )
  return data as ClaimOut
}

export async function keepSession(): Promise<void> {
  await api.post('/api/auth/session/keep')
}

export async function handoffSession(): Promise<void> {
  await api.post('/api/auth/session/handoff')
}

export async function logoutSession(): Promise<void> {
  await api.post('/api/auth/session/logout')
}

export async function heartbeat(): Promise<HeartbeatOut> {
  const { data } = await api.post('/api/auth/session/heartbeat')
  return data as HeartbeatOut
}
