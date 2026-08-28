import { create } from 'zustand'
import { supabase } from '@/lib/supabaseClient'
import { getMe, type Usuario } from '@/api/auth'

interface AuthState {
  /** Hay una sesión de Supabase activa. */
  session: boolean
  /** Perfil del backend (`/api/auth/me`). null si no está aprovisionado o sin sesión. */
  usuario: Usuario | null
  /** Ya se resolvió el estado inicial (sesión + perfil). */
  hydrated: boolean
  /** Re-lee la sesión de Supabase y el perfil del backend. */
  refresh: () => Promise<void>
  /** Limpia el estado local (no cierra la sesión de Supabase — eso lo hace signOut). */
  clearSession: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  session: false,
  usuario: null,
  hydrated: false,

  refresh: async () => {
    try {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        set({ session: false, usuario: null, hydrated: true })
        return
      }
      try {
        const u = await getMe()
        set({ session: true, usuario: u, hydrated: true })
      } catch {
        // Autenticado en Supabase pero sin perfil (p. ej. OAuth de un no invitado).
        set({ session: true, usuario: null, hydrated: true })
      }
    } catch {
      set({ session: false, usuario: null, hydrated: true })
    }
  },

  clearSession: () => set({ session: false, usuario: null }),
}))
