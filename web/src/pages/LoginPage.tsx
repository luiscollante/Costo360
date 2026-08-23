import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { login } from '@/api/auth'
import { Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const navigate = useNavigate()
  const setSession = useAuthStore((s) => s.setSession)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await login(username, password)
      setSession(data.token, data.usuario)
      navigate('/dashboard')
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { detail?: string } } }
      if (e.response?.status === 429 && e.response.data?.detail) {
        setError(e.response.data.detail)
      } else {
        setError('Usuario o contraseña incorrectos')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-bg relative overflow-hidden">

      {/* Atmospheric orbs */}
      <div className="absolute top-[-20%] left-[5%] w-[650px] h-[650px] rounded-full bg-brand-primary/[0.07] blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[0%] w-[550px] h-[550px] rounded-full bg-brand-gold/[0.06] blur-[110px] pointer-events-none" />
      <div className="absolute top-[45%] right-[15%] w-[280px] h-[280px] rounded-full bg-brand-primary/[0.04] blur-[80px] pointer-events-none" />

      {/* Card */}
      <div className="relative w-full max-w-sm">
        {/* Outer glow */}
        <div className="absolute inset-0 rounded-2xl bg-brand-primary/[0.08] blur-[40px] scale-110 pointer-events-none" />

        <div className="relative glass rounded-2xl overflow-hidden">
          {/* Top accent line */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-primary/70 to-transparent" />

          <div className="p-10">
            {/* Logo */}
            <div className="text-center mb-8">
              <img
                src="/logo.png"
                alt="Costo360"
                className="w-[220px] h-auto mx-auto mb-3 object-contain"
              />
              <div className="h-px bg-gradient-to-r from-transparent via-brand-border to-transparent mb-3" />
              <p className="text-[10px] tracking-[0.22em] uppercase text-brand-muted/60 font-medium">
                Sistema de cotizaciones · piedra natural
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="username"
                  className="block text-[10px] font-semibold tracking-[0.15em] uppercase text-brand-muted mb-1.5"
                >
                  Usuario
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-brand-input/80 border border-brand-border rounded-lg px-4 py-2.5 text-brand-text text-sm outline-none focus:border-brand-primary focus:shadow-[0_0_0_1px_#1F6F5430,0_0_12px_#1F6F5414] transition-all duration-200"
                  autoComplete="username"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-[10px] font-semibold tracking-[0.15em] uppercase text-brand-muted mb-1.5"
                >
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
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
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && (
                <p role="alert" className="text-red-400 text-xs text-center py-1">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full relative overflow-hidden bg-brand-primary hover:bg-brand-primary/90 disabled:opacity-50 text-white font-semibold py-3 rounded-lg text-sm transition-all duration-200 shadow-[0_0_24px_#1F6F5430,0_0_0_1px_#1F6F5440] hover:shadow-[0_0_40px_#1F6F5450,0_0_0_1px_#1F6F5460] mt-2 cursor-pointer"
              >
                {loading ? 'Ingresando…' : 'Ingresar'}
              </button>
            </form>
          </div>

          {/* Bottom accent */}
          <div className="px-10 pb-5 text-center">
            <p className="text-[9px] text-brand-muted/30 tracking-widest uppercase">
              Costo360
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
