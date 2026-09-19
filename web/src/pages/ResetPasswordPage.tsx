import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabaseClient'
import Logo from '@/components/Logo'

/**
 * Página a la que llega el enlace de invitación / restablecimiento de Supabase.
 * Supabase (con `detectSessionInUrl`) crea una sesión temporal de recuperación;
 * aquí la persona define su contraseña. Sirve tanto para "olvidé mi contraseña"
 * como para el primer acceso de un usuario invitado.
 */
export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [listo, setListo] = useState(false)
  const [sinEnlace, setSinEnlace] = useState(false)
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // El enlace de recovery/invitación que genera el Admin API de Supabase
    // siempre viene en el formato "implicit" (tokens en el fragmento de la URL,
    // #access_token=...&refresh_token=...) — el cliente de la app usa
    // `flowType: 'pkce'` para el login normal (más seguro), que espera un
    // `?code=` y no procesa ese fragmento solo con `detectSessionInUrl`. Por
    // eso el enlace parecía "inválido" aunque estuviera perfectamente vigente
    // — se arma la sesión a mano con `setSession()` en vez de depender de la
    // detección automática.
    let cancelado = false

    async function procesarEnlace() {
      const hash = window.location.hash.startsWith('#')
        ? window.location.hash.slice(1)
        : window.location.hash
      const params = new URLSearchParams(hash)
      const access_token = params.get('access_token')
      const refresh_token = params.get('refresh_token')

      if (access_token && refresh_token) {
        const { error } = await supabase.auth.setSession({ access_token, refresh_token })
        if (!cancelado && !error) {
          setListo(true)
          return
        }
      }
      // Respaldo: por si ya había una sesión vigente por otra vía.
      const { data } = await supabase.auth.getSession()
      if (cancelado) return
      if (data.session) setListo(true)
      else setSinEnlace(true)
    }

    procesarEnlace()
    return () => {
      cancelado = true
    }
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }
    if (password !== password2) {
      setError('Las contraseñas no coinciden')
      return
    }
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) {
        setError('No se pudo guardar la contraseña. El enlace pudo haber expirado.')
        return
      }
      navigate('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-bg p-4">
      <div className="bg-brand-surface rounded-2xl border border-brand-border p-8 w-full max-w-sm">
        <Logo variant="dark" className="w-[170px] h-auto mx-auto mb-6" />
        <h1 className="text-lg font-bold text-brand-text-dark text-center mb-1">Define tu contraseña</h1>
        <p className="text-xs text-brand-text-secondary text-center mb-6">
          Elige una contraseña para entrar a Costo360.
        </p>

        {sinEnlace && !listo ? (
          <div className="text-center py-4">
            <p className="text-sm text-brand-text-secondary mb-4">
              El enlace no es válido o expiró. Pide uno nuevo desde «¿Olvidaste tu contraseña?».
            </p>
            <button
              onClick={() => navigate('/login')}
              className="w-full bg-brand-primary hover:bg-brand-primary/90 text-white font-semibold py-2.5 rounded-lg text-sm cursor-pointer"
            >
              Volver a iniciar sesión
            </button>
          </div>
        ) : !listo ? (
          <p className="text-sm text-brand-text-secondary text-center py-6">Validando el enlace…</p>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-label="Nueva contraseña"
              placeholder="Nueva contraseña"
              autoComplete="new-password"
              className="w-full bg-brand-input/80 border border-brand-border rounded-lg px-4 py-2.5 text-brand-text text-sm outline-none focus:border-brand-primary transition-all"
              required
            />
            <input
              type="password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              aria-label="Repite la contraseña"
              placeholder="Repite la contraseña"
              autoComplete="new-password"
              className="w-full bg-brand-input/80 border border-brand-border rounded-lg px-4 py-2.5 text-brand-text text-sm outline-none focus:border-brand-primary transition-all"
              required
            />
            {error && <p role="alert" className="text-brand-danger text-xs text-center">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-primary hover:bg-brand-primary/90 disabled:opacity-50 text-white font-semibold py-3 rounded-lg text-sm transition-all cursor-pointer"
            >
              {loading ? 'Guardando…' : 'Guardar y entrar'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
