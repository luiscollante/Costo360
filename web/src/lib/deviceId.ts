import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'

const KEY = 'costo360_device_id'

function gen(): string {
  const b = new Uint8Array(16) // 128 bits
  crypto.getRandomValues(b)
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')
}

let cached: string | null = null

/** Identificador de dispositivo (128 bits aleatorios), estable y persistente. */
export async function getDeviceId(): Promise<string> {
  if (cached) return cached
  if (Capacitor.isNativePlatform()) {
    const { value } = await Preferences.get({ key: KEY })
    if (value) {
      cached = value
      return value
    }
    const id = gen()
    await Preferences.set({ key: KEY, value: id })
    cached = id
    return id
  }
  let id = localStorage.getItem(KEY)
  if (!id) {
    id = gen()
    localStorage.setItem(KEY, id)
  }
  cached = id
  return id
}

/** Versión síncrona para el interceptor de axios. `getDeviceId()` debe haberse llamado antes. */
export function getDeviceIdSync(): string {
  if (cached) return cached
  const id = localStorage.getItem(KEY) ?? ''
  if (id) cached = id
  return id
}

export function deviceLabel(): string {
  const ua = navigator.userAgent
  const plat = Capacitor.isNativePlatform()
    ? 'App'
    : /Mobi/i.test(ua)
      ? 'Móvil'
      : 'Escritorio'
  const browser = /Edg/i.test(ua)
    ? 'Edge'
    : /Chrome/i.test(ua)
      ? 'Chrome'
      : /Firefox/i.test(ua)
        ? 'Firefox'
        : /Safari/i.test(ua)
          ? 'Safari'
          : 'Navegador'
  return `${browser} · ${plat}`
}
