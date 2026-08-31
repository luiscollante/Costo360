import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Eye, EyeOff } from 'lucide-react'
import Logo from '@/components/Logo'

type Modo = 'login' | 'recuperar'

export default function LoginPage() {
  const [modo, setModo] = useState<Modo>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (error) {
        setError('Correo o contraseña incorrectos')
        return
      }
      // El listener de onAuthStateChange en App.tsx hidrata el perfil y navega.
      window.location.href = '/dashboard'
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    })
    if (error) setError('No se pudo iniciar con Google')
  }

  async function handleRecuperar(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) {
        setError('No se pudo enviar el correo de recuperación')
        return
      }
      setInfo('Si el correo está registrado, te llegará un enlace para restablecer la contraseña.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-bg relative overflow-hidden">
      <div className="absolute top-[-20%] left-[5%] w-[650px] h-[650px] rounded-full bg-brand-primary/[0.07] blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[0%] w-[550px] h-[550px] rounded-full bg-brand-gold/[0.06] blur-[110px] pointer-events-none" />

      <div className="relative w-full max-w-sm">
        <div className="absolute inset-0 rounded-2xl bg-brand-primary/[0.08] blur-[40px] scale-110 pointer-events-none" />

        <div className="relative glass rounded-2xl overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-primary/70 to-transparent" />

          <div className="p-10">
            <div className="text-center mb-8">
              <Logo variant="dark" className="text-3xl mb-3" />
              <div className="h-px bg-gradient-to-r from-transparent via-brand-border to-transparent mb-3" />
              <p className="text-[10px] tracking-[0.22em] uppercase text-brand-muted/60 font-medium">
                Sistema de cotizaciones · piedra natural
              </p>
            </div>

            <form onSubmit={modo === 'login' ? handleLogin : handleRecuperar} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-[10px] font-semibold tracking-[0.15em] uppercase text-brand-muted mb-1.5">
                  Correo
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-brand-input/80 border border-brand-border rounded-lg px-4 py-2.5 text-brand-text text-sm outline-none focus:border-brand-primary focus:shadow-[0_0_0_1px_#1F6F5430,0_0_12px_#1F6F5414] transition-all duration-200"
                  autoComplete="email"
                  required
                />
              </div>

              {modo === 'login' && (
                <div>
                  <label htmlFor="password" className="block text-[10px] font-semibold tracking-[0.15em] uppercase text-brand-muted mb-1.5">
                    Contraseña
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-brand-input/80 border border-brand-border rounded-lg px-4 py-2.5 pr-10 text-brand-text text-sm outline-none focus:border-brand-primary focus:shadow-[0_0_0_1px_#1F6F5430,0_0_12px_#1F6F5414] transition-all duration-200"
                      autoComplete="current-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-brand-muted hover:text-brand-text transition-colors cursor-pointer"
                      aria-label="Mostrar u ocultar contraseña"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              )}

              {error && <p role="alert" className="text-red-400 text-xs text-center py-1">{error}</p>}
              {info && <p className="text-brand-primary text-xs text-center py-1">{info}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full relative overflow-hidden bg-brand-primary hover:bg-brand-primary/90 disabled:opacity-50 text-white font-semibold py-3 rounded-lg text-sm transition-all duration-200 shadow-[0_0_24px_#1F6F5430,0_0_0_1px_#1F6F5440] hover:shadow-[0_0_40px_#1F6F5450,0_0_0_1px_#1F6F5460] mt-2 cursor-pointer"
              >
                {loading ? 'Un momento…' : modo === 'login' ? 'Ingresar' : 'Enviar enlace'}
              </button>
            </form>

            {modo === 'login' && (
              <>
                <div className="my-4 flex items-center gap-3">
                  <div className="h-px flex-1 bg-brand-border/50" />
                  <span className="text-[10px] text-brand-muted/50 uppercase tracking-widest">o</span>
                  <div className="h-px flex-1 bg-brand-border/50" />
                </div>
                <button
                  type="button"
                  onClick={handleGoogle}
                  className="w-full border border-brand-border rounded-lg py-2.5 text-sm text-brand-text hover:bg-brand-surface/60 transition-colors cursor-pointer"
                >
                  Continuar con Google
                </button>
              </>
            )}

            <div className="mt-5 text-center">
              <button
                type="button"
                onClick={() => {
                  setError('')
                  setInfo('')
                  setModo(modo === 'login' ? 'recuperar' : 'login')
                }}
                className="text-[11px] text-brand-muted hover:text-brand-text transition-colors cursor-pointer"
              >
                {modo === 'login' ? '¿Olvidaste tu contraseña?' : '← Volver a ingresar'}
              </button>
            </div>
          </div>

          <div className="px-10 pb-5 text-center">
            <p className="text-[9px] text-brand-muted/30 tracking-widest uppercase">Costo360</p>
          </div>
        </div>
      </div>
    </div>
  )
}
