import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuthStore } from '@/store/auth'
import {
  claimSession,
  handoffSession,
  heartbeat,
  keepSession,
  logoutSession,
} from '@/api/session'

/**
 * Sesión única con aviso real (Regla 5). Montado dentro del área autenticada.
 * - Al montar: reclama la sesión para este dispositivo.
 * - Poll cada 15 s: detecta expulsión y avisos de toma de sesión.
 * - Si otro dispositivo pide entrar → este (titular) decide: mantener o ceder.
 * - Si fue expulsado → cierra sesión y muestra el motivo.
 */
type Vista =
  | { tipo: 'oculto' }
  | { tipo: 'reclamando' }
  | { tipo: 'esperando'; prev: string; puedeForzar: boolean }
  | { tipo: 'aviso-titular'; retador: string }
  | { tipo: 'expulsado' }
  | { tipo: 'sin-cupo' }

const GRACE_MS = 30_000
const POLL_MS = 15_000

export default function SessionGuard() {
  const session = useAuthStore((s) => s.session)
  const usuario = useAuthStore((s) => s.usuario)
  const [vista, setVista] = useState<Vista>({ tipo: 'oculto' })
  const esperandoDesde = useRef<number>(0)
  const activo = session && !!usuario

  const salir = useCallback(async () => {
    try {
      await logoutSession()
    } catch {
      /* noop */
    }
    await supabase.auth.signOut()
    useAuthStore.getState().clearSession()
    window.location.href = '/login'
  }, [])

  const reclamar = useCallback(async (force = false) => {
    try {
      const r = await claimSession(force)
      if (r.status === 'active') {
        setVista({ tipo: 'oculto' })
      } else if (r.status === 'pending') {
        if (!esperandoDesde.current) esperandoDesde.current = Date.now()
        setVista({
          tipo: 'esperando',
          prev: r.prev_device ?? 'otro dispositivo',
          puedeForzar: Date.now() - esperandoDesde.current > GRACE_MS,
        })
      } else {
        setVista({ tipo: 'oculto' }) // 'busy' → reintenta en el próximo poll
      }
    } catch {
      /* el interceptor maneja 401/409 */
    }
  }, [])

  // Reclamo inicial + evento de expulsión desde el interceptor.
  useEffect(() => {
    if (!activo) return
    setVista({ tipo: 'reclamando' })
    reclamar()
    const onSuperseded = () => setVista({ tipo: 'expulsado' })
    window.addEventListener('costo360:session-superseded', onSuperseded)
    return () => window.removeEventListener('costo360:session-superseded', onSuperseded)
  }, [activo, reclamar])

  // Poll.
  useEffect(() => {
    if (!activo) return
    let cancelado = false
    const tick = async () => {
      try {
        const hb = await heartbeat()
        if (cancelado) return
        if (hb.estado === 'activa' && !hb.mine) {
          setVista({ tipo: 'expulsado' })
        } else if (hb.estado === 'takeover_pendiente' && hb.mine) {
          setVista({ tipo: 'aviso-titular', retador: hb.retador ?? 'otro dispositivo' })
        } else if (hb.estado === 'takeover_pendiente' && hb.am_i_retador) {
          setVista((v) =>
            v.tipo === 'esperando'
              ? { ...v, puedeForzar: Date.now() - esperandoDesde.current > GRACE_MS }
              : { tipo: 'esperando', prev: hb.device_actual ?? 'otro dispositivo', puedeForzar: false },
          )
        } else if (hb.mine) {
          esperandoDesde.current = 0
          setVista((v) => (v.tipo === 'expulsado' ? v : { tipo: 'oculto' }))
        }
      } catch {
        /* noop */
      }
    }
    const id = window.setInterval(tick, POLL_MS)
    return () => {
      cancelado = true
      window.clearInterval(id)
    }
  }, [activo])

  if (vista.tipo === 'oculto') return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="glass rounded-2xl border border-brand-border p-8 w-full max-w-sm text-center">
        {vista.tipo === 'reclamando' && (
          <p className="text-sm text-brand-muted py-4">Verificando la sesión…</p>
        )}

        {vista.tipo === 'esperando' && (
          <>
            <h2 className="text-base font-bold text-brand-text mb-2">Sesión en otro dispositivo</h2>
            <p className="text-sm text-brand-muted mb-6">
              Tu cuenta está activa en «{vista.prev}». Le pedimos permiso para moverla aquí.
              {vista.puedeForzar ? ' Si no respondes en ese equipo, puedes forzar el cambio.' : ''}
            </p>
            <div className="flex flex-col gap-2">
              {vista.puedeForzar && (
                <button
                  onClick={() => reclamar(true)}
                  className="w-full bg-brand-primary hover:bg-brand-primary/90 text-white font-semibold py-2.5 rounded-lg text-sm cursor-pointer"
                >
                  Forzar y usar aquí
                </button>
              )}
              <button
                onClick={salir}
                className="w-full border border-brand-border text-brand-muted hover:text-brand-text py-2.5 rounded-lg text-sm cursor-pointer"
              >
                Cancelar y salir
              </button>
            </div>
          </>
        )}

        {vista.tipo === 'aviso-titular' && (
          <>
            <h2 className="text-base font-bold text-brand-text mb-2">¿Mover la sesión?</h2>
            <p className="text-sm text-brand-muted mb-6">
              Se intentó iniciar sesión en «{vista.retador}». ¿Qué quieres hacer?
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={async () => {
                  await keepSession()
                  setVista({ tipo: 'oculto' })
                }}
                className="w-full bg-brand-primary hover:bg-brand-primary/90 text-white font-semibold py-2.5 rounded-lg text-sm cursor-pointer"
              >
                Mantener la sesión aquí
              </button>
              <button
                onClick={async () => {
                  await handoffSession()
                  setVista({ tipo: 'expulsado' })
                }}
                className="w-full border border-brand-border text-brand-muted hover:text-brand-text py-2.5 rounded-lg text-sm cursor-pointer"
              >
                Permitir el otro dispositivo
              </button>
            </div>
          </>
        )}

        {vista.tipo === 'expulsado' && (
          <>
            <h2 className="text-base font-bold text-brand-text mb-2">Tu sesión se movió</h2>
            <p className="text-sm text-brand-muted mb-6">
              Iniciaste sesión en otro dispositivo. Aquí se cerró para mantener una sola sesión activa.
            </p>
            <button
              onClick={salir}
              className="w-full bg-brand-primary hover:bg-brand-primary/90 text-white font-semibold py-2.5 rounded-lg text-sm cursor-pointer"
            >
              Entendido
            </button>
          </>
        )}

        {vista.tipo === 'sin-cupo' && (
          <>
            <h2 className="text-base font-bold text-brand-text mb-2">Sin cupo disponible</h2>
            <p className="text-sm text-brand-muted mb-6">
              Tu plan no tiene cupos de usuario libres. Contacta al administrador de tu empresa.
            </p>
            <button onClick={salir} className="w-full border border-brand-border py-2.5 rounded-lg text-sm cursor-pointer">
              Salir
            </button>
          </>
        )}
      </div>
    </div>
  )
}
