import { useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, XCircle, Loader2, ShieldCheck, Users, ArrowLeft, Lock } from 'lucide-react'
import Logo from '@/components/Logo'
import { Field } from '@/components/ui/Field'
import { SelectField } from '@/components/ui/SelectField'
import { formatCOP } from '@/lib/utils'
import { obtenerAceptacion, tokenizarTarjeta, marcaTarjeta, type AceptacionWompi } from '@/lib/wompi'
import {
  listarPlanes, iniciarPago, cobrarPago, consultarEstado,
  type Plan, type IniciarPagoOut, type EstadoSolicitud,
} from '@/api/pagos'

type Paso = 'datos' | 'pago' | 'resultado'

const inputCls =
  'w-full bg-brand-input/80 border border-brand-border rounded-lg px-4 py-2.5 text-brand-text text-sm outline-none ' +
  'focus:border-brand-primary focus:shadow-[0_0_0_1px_#1F6F5430,0_0_12px_#1F6F5414] transition-all duration-200'

/** El detalle del backend (axios) tiene prioridad -- si no, el mensaje de un
 * `Error` normal (p. ej. los que lanza `wompi.ts` al tokenizar); si no hay
 * nada usable, el mensaje genérico. OJO: un AxiosError también es
 * `instanceof Error`, así que revisar `.response.data.detail` primero es lo
 * que evita mostrar "Request failed with status code 409" en vez del motivo
 * real (bug real encontrado probando el bloqueo de doble cobro en vivo). */
function extraerError(e: unknown, fallback: string): string {
  const ax = e as { response?: { data?: { detail?: string } } }
  if (ax?.response?.data?.detail) return ax.response.data.detail
  if (e instanceof Error && e.message) return e.message
  return fallback
}

function formatearNumero(digitos: string): string {
  return digitos.replace(/(.{4})/g, '$1 ').trim()
}

const ANIOS = Array.from({ length: 16 }, (_, i) => String(new Date().getFullYear() % 100 + i).padStart(2, '0'))
const MESES = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))

export default function CheckoutPage() {
  const [searchParams] = useSearchParams()
  const [paso, setPaso] = useState<Paso>('datos')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Paso "datos"
  const [planes, setPlanes] = useState<Plan[]>([])
  const [planCodigo, setPlanCodigo] = useState('')
  const [nombreEmpresa, setNombreEmpresa] = useState('')
  const [nit, setNit] = useState('')
  const [adminNombre, setAdminNombre] = useState('')
  const [adminEmail, setAdminEmail] = useState('')

  // Resultado de /iniciar
  const [checkout, setCheckout] = useState<IniciarPagoOut | null>(null)

  // Paso "pago"
  const [aceptacion, setAceptacion] = useState<AceptacionWompi | null>(null)
  const [numero, setNumero] = useState('')
  const [mes, setMes] = useState('')
  const [anio, setAnio] = useState('')
  const [cvc, setCvc] = useState('')
  const [titular, setTitular] = useState('')
  const [aceptaTerminos, setAceptaTerminos] = useState(false)
  const [aceptaDatos, setAceptaDatos] = useState(false)

  // Paso "resultado"
  const [estadoPago, setEstadoPago] = useState<EstadoSolicitud | 'procesando' | 'timeout'>('procesando')

  useEffect(() => {
    listarPlanes()
      .then((data) => {
        setPlanes(data)
        const preseleccion = searchParams.get('plan')
        if (preseleccion && data.some((p) => p.codigo === preseleccion)) setPlanCodigo(preseleccion)
      })
      .catch(() => setError('No se pudieron cargar los planes. Recarga la página.'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (paso !== 'pago' || !checkout || aceptacion) return
    obtenerAceptacion(checkout.public_key)
      .then(setAceptacion)
      .catch(() => setError('No se pudo conectar con la pasarela de pago. Intenta de nuevo.'))
  }, [paso, checkout, aceptacion])

  const intentosPolling = useRef(0)
  useEffect(() => {
    if (paso !== 'resultado' || !checkout) return
    setEstadoPago('procesando')
    intentosPolling.current = 0
    const id = setInterval(async () => {
      intentosPolling.current += 1
      try {
        const e = await consultarEstado(checkout.reference)
        if (e === 'pagado' || e === 'fallido' || e === 'expirado') {
          setEstadoPago(e)
          clearInterval(id)
        } else if (intentosPolling.current >= 30) {
          setEstadoPago('timeout')
          clearInterval(id)
        }
      } catch {
        /* red intermitente -- reintenta en el próximo tick */
      }
    }, 2000)
    return () => clearInterval(id)
  }, [paso, checkout])

  async function enviarDatos() {
    setError('')
    if (!planCodigo) return setError('Elige un plan para continuar')
    if (!nombreEmpresa.trim()) return setError('Escribe el nombre de tu taller')
    if (!adminNombre.trim()) return setError('Escribe tu nombre')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail.trim())) return setError('Escribe un correo válido')

    setLoading(true)
    try {
      const out = await iniciarPago({
        nombre_empresa: nombreEmpresa.trim(),
        nit: nit.trim() || undefined,
        plan_codigo: planCodigo,
        admin_email: adminEmail.trim(),
        admin_nombre: adminNombre.trim(),
      })
      setCheckout(out)
      setPaso('pago')
    } catch (e) {
      setError(extraerError(e, 'No se pudo iniciar el pago. Intenta de nuevo.'))
    } finally {
      setLoading(false)
    }
  }

  async function verificarDeNuevo() {
    if (!checkout) return
    setLoading(true)
    try {
      const e = await consultarEstado(checkout.reference)
      if (e === 'pagado' || e === 'fallido' || e === 'expirado') setEstadoPago(e)
      else setEstadoPago('timeout')
    } catch {
      setEstadoPago('timeout')
    } finally {
      setLoading(false)
    }
  }

  async function reintentarPago() {
    setError('')
    setEstadoPago('procesando')
    setLoading(true)
    try {
      const out = await iniciarPago({
        nombre_empresa: nombreEmpresa.trim(),
        nit: nit.trim() || undefined,
        plan_codigo: planCodigo,
        admin_email: adminEmail.trim(),
        admin_nombre: adminNombre.trim(),
      })
      setCheckout(out)
      setAceptacion(null)
      setNumero('')
      setCvc('')
      setMes('')
      setAnio('')
      setTitular('')
      setPaso('pago')
    } catch (e) {
      setError(extraerError(e, 'No se pudo reiniciar el pago. Intenta de nuevo.'))
    } finally {
      setLoading(false)
    }
  }

  async function pagar() {
    setError('')
    if (!checkout || !aceptacion) return
    if (numero.replace(/\s/g, '').length < 13) return setError('Revisa el número de tarjeta')
    if (!mes || !anio) return setError('Elige el mes y el año de vencimiento')
    if (cvc.length < 3) return setError('Revisa el código de seguridad (CVC)')
    if (!titular.trim()) return setError('Escribe el nombre del titular de la tarjeta')
    if (!aceptaTerminos || !aceptaDatos) return setError('Debes aceptar los 2 términos para continuar')

    setLoading(true)
    try {
      const token = await tokenizarTarjeta(checkout.public_key, { numero, cvc, mes, anio, titular: titular.trim() })
      await cobrarPago({
        reference: checkout.reference,
        token,
        acceptance_token: aceptacion.acceptanceToken,
        accept_personal_auth: aceptacion.personalAuthToken,
      })
      setPaso('resultado')
    } catch (e) {
      setError(extraerError(e, 'No se pudo procesar el pago. Intenta de nuevo.'))
    } finally {
      setLoading(false)
    }
  }

  const marca = marcaTarjeta(numero)

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-bg relative overflow-hidden py-10 px-4">
      <div className="absolute top-[-20%] left-[5%] w-[650px] h-[650px] rounded-full bg-brand-primary/[0.07] blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[0%] w-[550px] h-[550px] rounded-full bg-brand-gold/[0.06] blur-[110px] pointer-events-none" />

      <div className="relative w-full max-w-md">
        <div className="text-center mb-6">
          <Logo variant="dark" className="w-[170px] h-auto mx-auto mb-3" />
          <p className="text-[11px] tracking-[0.22em] uppercase text-brand-text-secondary font-medium">
            Activa tu suscripción
          </p>
        </div>

        <PasoIndicador paso={paso} />

        <div className="absolute inset-0 -z-10 rounded-2xl bg-brand-primary/[0.08] blur-[40px] scale-110 pointer-events-none" />
        <div className="relative bg-brand-surface rounded-2xl overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-primary/70 to-transparent" />

          <div className="p-8">
            <AnimatePresence mode="wait">
              {paso === 'datos' && (
                <motion.div key="datos" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.25 }}>
                  <h1 className="text-lg font-bold text-brand-text-dark mb-1">Elige tu plan</h1>
                  <p className="text-xs text-brand-text-secondary mb-5">Un pago mensual por taller, en pesos colombianos.</p>

                  <div role="radiogroup" aria-label="Plan" className="space-y-2 mb-5">
                    {planes.map((p) => {
                      const selected = p.codigo === planCodigo
                      return (
                        <button
                          key={p.codigo}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => setPlanCodigo(p.codigo)}
                          className={`w-full flex items-center justify-between rounded-lg border px-4 py-3 text-left transition-all cursor-pointer ${
                            selected
                              ? 'border-brand-primary bg-brand-primary/[0.06] shadow-[0_0_0_1px_#1F6F5430]'
                              : 'border-brand-border hover:border-brand-primary/40'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-semibold text-brand-text-dark">{p.nombre}</span>
                              <span className="flex items-center gap-0.5 text-[10px] text-brand-text-tertiary">
                                <Users size={11} /> {p.cupo_usuarios}
                              </span>
                            </div>
                            <span className="text-xs text-brand-text-secondary">{formatCOP(p.precio_mensual_cop)} COP / mes</span>
                          </div>
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                              selected ? 'border-brand-primary' : 'border-brand-border'
                            }`}
                          >
                            {selected && <div className="w-2 h-2 rounded-full bg-brand-primary" />}
                          </div>
                        </button>
                      )
                    })}
                  </div>

                  <div className="space-y-4">
                    <Field label="Nombre del taller" required>
                      {(a11y) => <input {...a11y} className={inputCls} value={nombreEmpresa} onChange={(e) => setNombreEmpresa(e.target.value)} placeholder="Mármoles del Valle" />}
                    </Field>
                    <Field label="NIT" hint="Opcional">
                      {(a11y) => <input {...a11y} className={inputCls} value={nit} onChange={(e) => setNit(e.target.value)} placeholder="900123456-1" />}
                    </Field>
                    <Field label="Tu nombre" required>
                      {(a11y) => <input {...a11y} className={inputCls} value={adminNombre} onChange={(e) => setAdminNombre(e.target.value)} placeholder="Nombre completo" />}
                    </Field>
                    <Field label="Tu correo" required hint="Aquí te llegará el acceso a Costo360">
                      {(a11y) => <input {...a11y} type="email" className={inputCls} value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="tucorreo@taller.com" />}
                    </Field>
                  </div>

                  {error && <p role="alert" className="text-brand-danger text-xs text-center py-1 mt-3">{error}</p>}

                  <button
                    type="button"
                    disabled={loading}
                    onClick={enviarDatos}
                    className="w-full mt-5 bg-brand-primary hover:bg-brand-primary/90 disabled:opacity-50 text-white font-semibold py-3 rounded-lg text-sm transition-all duration-200 shadow-[0_0_24px_#1F6F5430,0_0_0_1px_#1F6F5440] cursor-pointer"
                  >
                    {loading ? 'Un momento…' : 'Continuar al pago'}
                  </button>
                </motion.div>
              )}

              {paso === 'pago' && checkout && (
                <motion.div key="pago" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.25 }}>
                  <button type="button" onClick={() => setPaso('datos')} className="flex items-center gap-1 text-xs text-brand-text-secondary hover:text-brand-text mb-4 cursor-pointer">
                    <ArrowLeft size={14} /> Volver
                  </button>

                  <TarjetaPreview numero={numero} titular={titular} mes={mes} anio={anio} marca={marca} />

                  <div className="space-y-4 mt-5">
                    <Field label="Número de tarjeta" required>
                      {(a11y) => (
                        <input
                          {...a11y}
                          inputMode="numeric"
                          className={inputCls}
                          value={formatearNumero(numero)}
                          onChange={(e) => setNumero(e.target.value.replace(/\D/g, '').slice(0, 19))}
                          placeholder="0000 0000 0000 0000"
                        />
                      )}
                    </Field>

                    <div className="grid grid-cols-3 gap-3">
                      <SelectField label="Mes" required value={mes} onChange={(e) => setMes(e.target.value)}>
                        <option value="">MM</option>
                        {MESES.map((m) => <option key={m} value={m}>{m}</option>)}
                      </SelectField>
                      <SelectField label="Año" required value={anio} onChange={(e) => setAnio(e.target.value)}>
                        <option value="">AA</option>
                        {ANIOS.map((a) => <option key={a} value={a}>{a}</option>)}
                      </SelectField>
                      <Field label="CVC" required>
                        {(a11y) => (
                          <input
                            {...a11y}
                            inputMode="numeric"
                            className={inputCls}
                            value={cvc}
                            onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                            placeholder="123"
                          />
                        )}
                      </Field>
                    </div>

                    <Field label="Nombre del titular" required>
                      {(a11y) => <input {...a11y} className={inputCls} value={titular} onChange={(e) => setTitular(e.target.value)} placeholder="Como aparece en la tarjeta" />}
                    </Field>
                  </div>

                  <div className="mt-4 space-y-2">
                    <label className="flex items-start gap-2 text-[11px] text-brand-text-secondary cursor-pointer">
                      <input type="checkbox" checked={aceptaTerminos} onChange={(e) => setAceptaTerminos(e.target.checked)} className="mt-0.5 accent-brand-primary cursor-pointer" />
                      <span>
                        Acepto el{' '}
                        {aceptacion ? (
                          <a href={aceptacion.permalinkTerminos} target="_blank" rel="noreferrer" className="text-brand-primary underline">reglamento de usuarios de Wompi</a>
                        ) : 'reglamento de usuarios de Wompi'}
                      </span>
                    </label>
                    <label className="flex items-start gap-2 text-[11px] text-brand-text-secondary cursor-pointer">
                      <input type="checkbox" checked={aceptaDatos} onChange={(e) => setAceptaDatos(e.target.checked)} className="mt-0.5 accent-brand-primary cursor-pointer" />
                      <span>
                        Autorizo el{' '}
                        {aceptacion ? (
                          <a href={aceptacion.permalinkDatosPersonales} target="_blank" rel="noreferrer" className="text-brand-primary underline">tratamiento de mis datos personales</a>
                        ) : 'tratamiento de mis datos personales'}
                      </span>
                    </label>
                  </div>

                  <div className="mt-4 rounded-lg bg-brand-input-deep border border-brand-border px-3.5 py-2.5 flex items-start gap-2">
                    <ShieldCheck size={15} className="text-brand-primary shrink-0 mt-0.5" />
                    <p className="text-[11px] text-brand-text-secondary leading-relaxed">
                      Tu tarjeta se procesa directo con Wompi -- Costo360 nunca ve ni guarda el número. Se cobrará
                      automáticamente <strong className="text-brand-text">{formatCOP(checkout.amount_in_cents / 100)}</strong> cada
                      mes a esta tarjeta hasta que canceles tu suscripción.
                    </p>
                  </div>

                  {error && <p role="alert" className="text-brand-danger text-xs text-center py-1 mt-3">{error}</p>}

                  <button
                    type="button"
                    disabled={loading || !aceptacion}
                    onClick={pagar}
                    className="w-full mt-4 flex items-center justify-center gap-2 bg-brand-primary hover:bg-brand-primary/90 disabled:opacity-50 text-white font-semibold py-3 rounded-lg text-sm transition-all duration-200 shadow-[0_0_24px_#1F6F5430,0_0_0_1px_#1F6F5440] cursor-pointer"
                  >
                    <Lock size={14} />
                    {loading ? 'Procesando…' : `Pagar ${formatCOP(checkout.amount_in_cents / 100)} y activar mi cuenta`}
                  </button>
                </motion.div>
              )}

              {paso === 'resultado' && (
                <motion.div key="resultado" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-4">
                  {estadoPago === 'procesando' && (
                    <>
                      <Loader2 size={40} className="animate-spin text-brand-primary mx-auto mb-4" />
                      <h1 className="text-base font-bold text-brand-text-dark mb-1">Confirmando tu pago…</h1>
                      <p className="text-xs text-brand-text-secondary">Esto toma unos segundos. No cierres esta página.</p>
                    </>
                  )}
                  {estadoPago === 'pagado' && (
                    <>
                      <CheckCircle2 size={44} className="text-brand-primary mx-auto mb-4" />
                      <h1 className="text-base font-bold text-brand-text-dark mb-1">¡Pago aprobado!</h1>
                      <p className="text-xs text-brand-text-secondary max-w-xs mx-auto">
                        Te enviamos un correo a <strong className="text-brand-text">{adminEmail}</strong> para que definas tu
                        contraseña y entres a Costo360.
                      </p>
                    </>
                  )}
                  {(estadoPago === 'fallido' || estadoPago === 'expirado') && (
                    <>
                      <XCircle size={44} className="text-brand-danger mx-auto mb-4" />
                      <h1 className="text-base font-bold text-brand-text-dark mb-1">El pago no se pudo procesar</h1>
                      <p className="text-xs text-brand-text-secondary mb-5">Revisa los datos de tu tarjeta e intenta de nuevo.</p>
                      {error && <p role="alert" className="text-brand-danger text-xs text-center py-1 mb-3">{error}</p>}
                      <button
                        type="button"
                        disabled={loading}
                        onClick={reintentarPago}
                        className="bg-brand-primary hover:bg-brand-primary/90 disabled:opacity-50 text-white font-semibold py-2.5 px-6 rounded-lg text-sm cursor-pointer"
                      >
                        Intentar de nuevo
                      </button>
                    </>
                  )}
                  {estadoPago === 'timeout' && (
                    <>
                      <Loader2 size={40} className="text-brand-gold-text mx-auto mb-4" />
                      <h1 className="text-base font-bold text-brand-text-dark mb-1">Seguimos confirmando tu pago</h1>
                      <p className="text-xs text-brand-text-secondary max-w-xs mx-auto mb-5">
                        Está tardando más de lo normal. Te avisaremos por correo a <strong className="text-brand-text">{adminEmail}</strong> en
                        cuanto quede listo.
                      </p>
                      <button
                        type="button"
                        disabled={loading}
                        onClick={verificarDeNuevo}
                        className="border border-brand-border bg-brand-surface text-brand-text hover:border-brand-primary/40 disabled:opacity-50 font-semibold py-2.5 px-6 rounded-lg text-sm cursor-pointer"
                      >
                        {loading ? 'Consultando…' : 'Verificar de nuevo'}
                      </button>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="px-8 pb-5 text-center">
            <p className="text-[9px] text-brand-text-secondary tracking-widest uppercase">Costo360</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function PasoIndicador({ paso }: { paso: Paso }) {
  const pasos: { key: Paso; label: string }[] = [
    { key: 'datos', label: 'Datos' },
    { key: 'pago', label: 'Pago' },
    { key: 'resultado', label: 'Listo' },
  ]
  const idx = pasos.findIndex((p) => p.key === paso)
  return (
    <nav aria-label="Progreso del pago" className="flex items-center justify-center gap-1.5 mb-4">
      {pasos.map((p, i) => (
        <div key={p.key} className="flex items-center gap-1.5">
          <div
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i <= idx ? 'w-6 bg-brand-primary' : 'w-3 bg-brand-border'
            }`}
          />
        </div>
      ))}
    </nav>
  )
}

function TarjetaPreview({
  numero, titular, mes, anio, marca,
}: {
  numero: string
  titular: string
  mes: string
  anio: string
  marca: 'visa' | 'mastercard' | 'amex' | null
}) {
  const numeroFmt = formatearNumero(numero).padEnd(19, '•').slice(0, 19)
  return (
    <div
      className="relative rounded-xl p-5 h-36 text-white overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #212121 0%, #00472B 45%, #00311D 100%)',
      }}
    >
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <div className="flex items-center justify-between">
        <div className="w-8 h-6 rounded-sm bg-gradient-to-br from-brand-gold-light to-brand-gold" />
        <span className="text-xs font-bold tracking-wide uppercase opacity-90">{marca ?? 'Costo360'}</span>
      </div>
      <div className="num mt-5 text-lg tracking-[0.15em]">{numeroFmt}</div>
      <div className="flex items-end justify-between mt-3">
        <span className="text-[11px] uppercase tracking-wide opacity-80 truncate max-w-[65%]">{titular || 'NOMBRE DEL TITULAR'}</span>
        <span className="num text-xs opacity-80">{mes || 'MM'}/{anio || 'AA'}</span>
      </div>
    </div>
  )
}
