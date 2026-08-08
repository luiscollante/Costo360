import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabaseClient'
import Login from './pages/Login'

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [checkingSession, setCheckingSession] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setCheckingSession(false)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, newSession) => setSession(newSession)
    )

    return () => subscription.subscription.unsubscribe()
  }, [])

  if (checkingSession) {
    return (
      <div className="min-h-svh flex items-center justify-center bg-brand-bg text-brand-text/60">
        Cargando…
      </div>
    )
  }

  if (!session) {
    return <Login />
  }

  return (
    <div className="min-h-svh flex flex-col items-center justify-center gap-4 bg-brand-bg text-brand-text">
      <h1 className="font-heading text-2xl">Sesión iniciada</h1>
      <p className="text-brand-text/60">{session.user.email}</p>
      <button
        type="button"
        onClick={() => supabase.auth.signOut()}
        className="rounded-lg bg-brand-surface border border-white/10 px-4 py-2 text-sm hover:border-brand-gold"
      >
        Cerrar sesión
      </button>
    </div>
  )
}

export default App
