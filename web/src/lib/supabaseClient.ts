import { createClient } from '@supabase/supabase-js'
import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!url || !anon) {
  console.error(
    '[supabase] Falta VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY en web/.env — ' +
      'ver web/ENV_SETUP.md',
  )
}

// En el APK (WebView de Capacitor) el localStorage no siempre persiste — se usa Preferences.
const nativeStorage = {
  getItem: async (k: string) => (await Preferences.get({ key: k })).value,
  setItem: async (k: string, v: string) => {
    await Preferences.set({ key: k, value: v })
  },
  removeItem: async (k: string) => {
    await Preferences.remove({ key: k })
  },
}

export const supabase = createClient(url ?? '', anon ?? '', {
  auth: {
    flowType: 'pkce',
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    ...(Capacitor.isNativePlatform() ? { storage: nativeStorage } : {}),
  },
})
