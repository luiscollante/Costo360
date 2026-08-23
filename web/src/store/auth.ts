import { create } from 'zustand'
import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'
import type { Usuario } from '@/api/auth'

const isNative = Capacitor.isNativePlatform()

interface AuthState {
  token: string | null
  usuario: Usuario | null
  hydrated: boolean
  setSession: (token: string, usuario: Usuario) => void
  clearSession: () => void
  hydrate: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  // En el celular (APK) la sesión se hidrata de forma async desde Preferences — ver hydrate().
  // En la web sigue siendo sessionStorage, síncrono, sin cambios de comportamiento.
  token: isNative ? null : sessionStorage.getItem('session_token'),
  usuario: isNative ? null : (() => {
    const raw = sessionStorage.getItem('usuario')
    return raw ? (JSON.parse(raw) as Usuario) : null
  })(),
  hydrated: !isNative,

  hydrate: async () => {
    if (!isNative) return
    const [{ value: token }, { value: usuarioRaw }] = await Promise.all([
      Preferences.get({ key: 'session_token' }),
      Preferences.get({ key: 'usuario' }),
    ])
    set({
      token: token ?? null,
      usuario: usuarioRaw ? (JSON.parse(usuarioRaw) as Usuario) : null,
      hydrated: true,
    })
  },

  setSession: (token, usuario) => {
    if (isNative) {
      Preferences.set({ key: 'session_token', value: token })
      Preferences.set({ key: 'usuario', value: JSON.stringify(usuario) })
    } else {
      sessionStorage.setItem('session_token', token)
      sessionStorage.setItem('usuario', JSON.stringify(usuario))
    }
    set({ token, usuario })
  },

  clearSession: () => {
    if (isNative) {
      Preferences.remove({ key: 'session_token' })
      Preferences.remove({ key: 'usuario' })
    } else {
      sessionStorage.removeItem('session_token')
      sessionStorage.removeItem('usuario')
    }
    set({ token: null, usuario: null })
  },
}))
