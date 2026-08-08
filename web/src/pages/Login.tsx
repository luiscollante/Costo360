import { useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabaseClient'

type Mode = 'signin' | 'signup'

export default function Login() {
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setNotice(null)
    setLoading(true)

    const { error } =
      mode === 'signin'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password })

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    if (mode === 'signup') {
      setNotice('Cuenta creada. Revisa tu correo para confirmar el registro.')
    }
  }

  return (
    <div className="min-h-svh flex items-center justify-center bg-brand-bg px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-brand-surface/70 p-8 shadow-2xl backdrop-blur-xl"
      >
        <h1 className="font-heading text-2xl text-brand-text text-center mb-1">
          Costo360
        </h1>
        <p className="text-center text-sm text-brand-text/60 mb-6">
          Cotización profesional para talleres de piedra natural
        </p>

        <div className="flex mb-6 rounded-lg bg-black/20 p-1">
          <button
            type="button"
            onClick={() => setMode('signin')}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
              mode === 'signin'
                ? 'bg-brand-green text-white'
                : 'text-brand-text/70 hover:text-brand-text'
            }`}
          >
            Iniciar sesión
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
              mode === 'signup'
                ? 'bg-brand-green text-white'
                : 'text-brand-text/70 hover:text-brand-text'
            }`}
          >
            Registro
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-brand-text/60 mb-1" htmlFor="email">
              Correo
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-brand-text outline-none focus:border-brand-gold"
              placeholder="taller@ejemplo.com"
            />
          </div>
          <div>
            <label className="block text-xs text-brand-text/60 mb-1" htmlFor="password">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-brand-text outline-none focus:border-brand-gold"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p className="text-sm text-brand-gold" role="status">
              {notice}
            </p>
          )}

          <motion.button
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-brand-gold py-2.5 font-medium text-brand-bg transition-opacity disabled:opacity-50"
          >
            {loading
              ? 'Cargando…'
              : mode === 'signin'
                ? 'Entrar'
                : 'Crear cuenta'}
          </motion.button>
        </form>
      </motion.div>
    </div>
  )
}
