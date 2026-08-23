import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import AppLayout from '@/components/AppLayout'
import { getConfigEmpresa, putConfigEmpresa, getLogo, uploadLogo, type ConfigEmpresa } from '@/api/config'
import { Save, ImageUp } from 'lucide-react'

const DEFAULTS: ConfigEmpresa = {
  nombre: '',
  nit: '',
  direccion: '',
  telefono: '',
  email: '',
  ciudad: '',
  banco_nombre: '',
  banco_cuenta: '',
  banco_tipo: 'Cuenta Corriente',
  banco_titular: '',
  anticipo_pct: 60,
  dias_entrega: 10,
  condiciones_pago: '50% anticipo — 50% contra entrega',
}

export default function ConfigPage() {
  const qc = useQueryClient()

  const [form, setForm] = useState<ConfigEmpresa>(DEFAULTS)
  const [saved, setSaved] = useState(false)
  const [logoSaved, setLogoSaved] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data, isPending } = useQuery({
    queryKey: ['config-empresa'],
    queryFn: getConfigEmpresa,
  })

  const { data: logoData } = useQuery({
    queryKey: ['config-logo'],
    queryFn: getLogo,
  })

  const logoMut = useMutation({
    mutationFn: (file: File) => uploadLogo(file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['config-logo'] })
      setLogoSaved(true)
      setTimeout(() => setLogoSaved(false), 2500)
    },
  })

  useEffect(() => {
    if (data) setForm(data)
  }, [data])

  const saveMut = useMutation({
    mutationFn: () => putConfigEmpresa(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['config-empresa'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    },
  })

  function set(key: keyof ConfigEmpresa, value: string | number) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  const inputBase = 'input-light w-full px-3 py-2.5 rounded-lg bg-brand-surface border border-brand-border text-sm text-brand-text placeholder:text-brand-muted/40 focus:outline-none focus:border-brand-primary/50 transition-colors'

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <span className="font-mono text-[10px] text-brand-muted/50 tracking-[0.2em]">CONFIGURACIÓN</span>
            <div className="w-16 h-px bg-brand-border/40" />
          </div>
          <h1 className="text-2xl font-bold text-brand-text tracking-tight">Empresa</h1>
          <p className="text-sm text-brand-muted mt-1">Datos que aparecen en los PDFs de cotización</p>
        </div>

        {isPending ? (
          <div className="glass rounded-xl border border-brand-border p-12 text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
              className="inline-block w-6 h-6 border-2 border-brand-muted/30 border-t-brand-primary rounded-full mb-3"
            />
            <p className="text-sm text-brand-muted">Cargando configuración…</p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Datos de la empresa */}
            <div className="glass rounded-xl border border-brand-border p-6">
              <h2 className="text-[9px] font-semibold text-brand-muted/50 uppercase tracking-widest mb-5">Datos de la empresa</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-[10px] font-semibold text-brand-muted mb-1.5 uppercase tracking-wide">Nombre empresa</label>
                  <input
                    type="text"
                    value={form.nombre}
                    onChange={(e) => set('nombre', e.target.value)}
                    placeholder="Costo360 Ltda"
                    className={inputBase}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-brand-muted mb-1.5 uppercase tracking-wide">NIT</label>
                  <input
                    type="text"
                    value={form.nit}
                    onChange={(e) => set('nit', e.target.value)}
                    placeholder="900.123.456-7"
                    className={inputBase}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-brand-muted mb-1.5 uppercase tracking-wide">Ciudad</label>
                  <input
                    type="text"
                    value={form.ciudad}
                    onChange={(e) => set('ciudad', e.target.value)}
                    placeholder="Barranquilla"
                    className={inputBase}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-semibold text-brand-muted mb-1.5 uppercase tracking-wide">Dirección</label>
                  <input
                    type="text"
                    value={form.direccion}
                    onChange={(e) => set('direccion', e.target.value)}
                    placeholder="Calle 123 #45-67"
                    className={inputBase}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-brand-muted mb-1.5 uppercase tracking-wide">Teléfono</label>
                  <input
                    type="text"
                    value={form.telefono}
                    onChange={(e) => set('telefono', e.target.value)}
                    placeholder="+57 300 123 4567"
                    className={inputBase}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-brand-muted mb-1.5 uppercase tracking-wide">Correo</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => set('email', e.target.value)}
                    placeholder="info@empresa.com"
                    className={inputBase}
                  />
                </div>
              </div>
            </div>

            {/* Datos bancarios */}
            <div className="glass rounded-xl border border-brand-border p-6">
              <h2 className="text-[9px] font-semibold text-brand-muted/50 uppercase tracking-widest mb-5">Datos bancarios</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold text-brand-muted mb-1.5 uppercase tracking-wide">Banco</label>
                  <input
                    type="text"
                    value={form.banco_nombre}
                    onChange={(e) => set('banco_nombre', e.target.value)}
                    placeholder="Bancolombia"
                    className={inputBase}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-brand-muted mb-1.5 uppercase tracking-wide">Tipo de cuenta</label>
                  <select
                    value={form.banco_tipo}
                    onChange={(e) => set('banco_tipo', e.target.value)}
                    className={inputBase}
                  >
                    <option>Cuenta Corriente</option>
                    <option>Cuenta de Ahorros</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-brand-muted mb-1.5 uppercase tracking-wide">Número de cuenta</label>
                  <input
                    type="text"
                    value={form.banco_cuenta}
                    onChange={(e) => set('banco_cuenta', e.target.value)}
                    placeholder="000-123456-00"
                    className={inputBase + ' font-mono'}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-brand-muted mb-1.5 uppercase tracking-wide">Titular</label>
                  <input
                    type="text"
                    value={form.banco_titular}
                    onChange={(e) => set('banco_titular', e.target.value)}
                    placeholder="Costo360 Ltda"
                    className={inputBase}
                  />
                </div>
              </div>
            </div>

            {/* Condiciones comerciales */}
            <div className="glass rounded-xl border border-brand-border p-6">
              <h2 className="text-[9px] font-semibold text-brand-muted/50 uppercase tracking-widest mb-5">Condiciones comerciales</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold text-brand-muted mb-1.5 uppercase tracking-wide">
                    Anticipo requerido —{' '}
                    <span className="text-brand-primary font-mono">{form.anticipo_pct}%</span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={form.anticipo_pct}
                    onChange={(e) => set('anticipo_pct', parseInt(e.target.value))}
                    className="w-full accent-brand-primary mt-2"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-brand-muted mb-1.5 uppercase tracking-wide">Días de entrega</label>
                  <input
                    type="number"
                    min={1}
                    value={form.dias_entrega}
                    onChange={(e) => set('dias_entrega', parseInt(e.target.value) || 1)}
                    className={inputBase + ' font-mono'}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-semibold text-brand-muted mb-1.5 uppercase tracking-wide">Condiciones de pago</label>
                  <input
                    type="text"
                    value={form.condiciones_pago}
                    onChange={(e) => set('condiciones_pago', e.target.value)}
                    className={inputBase}
                  />
                </div>
              </div>
            </div>

            {/* Logo de empresa */}
            <div className="glass rounded-xl border border-brand-border p-6">
              <h2 className="text-[9px] font-semibold text-brand-muted/50 uppercase tracking-widest mb-5">Logo de empresa</h2>
              <div className="flex items-center gap-5">
                <div className="w-24 h-24 rounded-xl border border-brand-border bg-brand-surface flex items-center justify-center overflow-hidden shrink-0">
                  {logoData?.logo_b64 ? (
                    <img
                      src={`data:${logoData.content_type};base64,${logoData.logo_b64}`}
                      alt="Logo empresa"
                      className="w-full h-full object-contain p-1"
                    />
                  ) : (
                    <span className="text-xs text-brand-muted/40 text-center px-2">Sin logo</span>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-brand-muted mb-3">
                    Aparece en los PDFs de cotización. Formatos: JPEG o PNG. Máximo 2 MB.
                  </p>
                  <div className="flex items-center gap-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (f) logoMut.mutate(f)
                        e.target.value = ''
                      }}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={logoMut.isPending}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg border border-brand-border text-sm text-brand-muted hover:text-brand-text hover:border-brand-primary/50 disabled:opacity-60 transition-colors cursor-pointer"
                    >
                      <ImageUp className="w-4 h-4" />
                      {logoMut.isPending ? 'Subiendo…' : 'Cambiar logo'}
                    </button>
                    {logoSaved && (
                      <motion.p
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-sm text-emerald-400 font-medium"
                      >
                        ✓ Logo actualizado
                      </motion.p>
                    )}
                    {logoMut.isError && (
                      <p className="text-xs text-red-400">
                        {(logoMut.error as any)?.response?.data?.detail ?? 'Error al subir logo'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Acceso rápido */}
            <div className="glass rounded-xl border border-brand-border p-6">
              <h2 className="text-[9px] font-semibold text-brand-muted/50 uppercase tracking-widest mb-5">Acceso rápido</h2>
              <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
                <div className="bg-white p-3 rounded-xl shrink-0">
                  <QRCodeSVG value="https://costo360.vercel.app" size={120} fgColor="#0C1B3A" bgColor="#ffffff" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-brand-text mb-1 font-mono">costo360.vercel.app</p>
                  <p className="text-xs text-brand-muted mb-4">Comparte este código QR con los operarios para que abran la app desde su celular sin escribir la URL.</p>
                  <div className="space-y-2.5">
                    <div className="flex items-start gap-2.5">
                      <span className="text-[10px] font-bold text-brand-gold bg-brand-gold/10 border border-brand-gold/20 rounded px-1.5 py-0.5 shrink-0 mt-0.5">Android</span>
                      <span className="text-xs text-brand-muted">Chrome → menú <span className="font-mono">⋮</span> → «Agregar a pantalla de inicio»</span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="text-[10px] font-bold text-brand-gold bg-brand-gold/10 border border-brand-gold/20 rounded px-1.5 py-0.5 shrink-0 mt-0.5">iPhone</span>
                      <span className="text-xs text-brand-muted">Safari → botón compartir <span className="font-mono">⎙</span> → «Añadir a la pantalla de inicio»</span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="text-[10px] font-bold text-brand-gold bg-brand-gold/10 border border-brand-gold/20 rounded px-1.5 py-0.5 shrink-0 mt-0.5">PC</span>
                      <span className="text-xs text-brand-muted">Chrome → icono <span className="font-mono">⊕</span> en la barra de dirección → «Instalar»</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Botón guardar */}
            <div className="flex items-center justify-between pt-1">
              {saved && (
                <motion.p
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-sm text-emerald-400 font-medium"
                >
                  ✓ Guardado correctamente
                </motion.p>
              )}
              <button
                onClick={() => saveMut.mutate()}
                disabled={saveMut.isPending}
                className="ml-auto flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:bg-brand-primary/90 disabled:opacity-60 transition-colors cursor-pointer"
              >
                <Save className="w-4 h-4" />
                {saveMut.isPending ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
