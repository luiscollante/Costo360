import { create } from 'zustand'
import { supabase } from '@/lib/supabaseClient'
import { getMe, type Usuario } from '@/api/auth'

/**
 * Estados de la carga inicial (R7). La clave es `profile-pending`: hay sesión de
 * Supabase confirmada pero el perfil del backend aún carga — la app renderiza el
 * shell (skeleton) en vez de bloquear o expulsar a /login.
 */
export type AuthStatus =
  | 'authenticating' // getSession() en curso (rápido: storage local)
  | 'anon'           // sin sesión de Supabase
  | 'profile-pending'// sesión OK, /api/auth/me en vuelo
  | 'no-profile'     // sesión OK pero sin perfil (p. ej. OAuth de un no invitado)
  | 'ready'          // sesión + perfil cargados

interface AuthState {
  status: AuthStatus
  /** Hay una sesión de Supabase activa. */
  session: boolean
  /** Perfil del backend (`/api/auth/me`). */
  usuario: Usuario | null
  /** Re-lee la sesión de Supabase y el perfil del backend. */
  refresh: () => Promise<void>
  /** Limpia el estado local (no cierra la sesión de Supabase — eso lo hace signOut). */
  clearSession: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'authenticating',
  session: false,
  usuario: null,

  refresh: async () => {
    try {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        set({ status: 'anon', session: false, usuario: null })
        return
      }
      // Sesión confirmada: desbloquea el shell YA; el perfil carga detrás.
      const yaTeniaPerfil = get().usuario != null
      set({ session: true, status: yaTeniaPerfil ? 'ready' : 'profile-pending' })
      try {
        const u = await getMe()
        set({ status: 'ready', session: true, usuario: u })
      } catch {
        // Si ya había perfil, es un blip de red — se conserva y se sigue 'ready'.
        if (!yaTeniaPerfil) set({ status: 'no-profile', session: true, usuario: null })
      }
    } catch {
      set({ status: 'anon', session: false, usuario: null })
    }
  },

  clearSession: () => set({ status: 'anon', session: false, usuario: null }),
}))
