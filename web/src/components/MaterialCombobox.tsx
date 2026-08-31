import { useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, Search, X, PenLine, ArrowLeft, BookmarkPlus, Check } from 'lucide-react'
import {
  getMaterialesPorCategoria,
  crearMaterial,
  type MaterialCatalogo,
} from '@/api/materiales'
import { formatCOP } from '@/lib/utils'
import { showToast } from '@/lib/toast'
import { Dialog } from '@/components/ui/Dialog'

interface Props {
  categoria: string
  value: string
  onChange: (ref: string, precioM2: number, dims?: { largo: number; ancho: number }) => void
  placeholder?: string
  /** Precio/m² que el usuario ya escribió — habilita "guardar en mi catálogo". */
  precioM2Actual?: number
}

const DISCLAIMER =
  'Precios de lista 2024. Confirma precio y disponibilidad con el proveedor antes de cotizar.'

export default function MaterialCombobox({
  categoria,
  value,
  onChange,
  placeholder,
  precioM2Actual = 0,
}: Props) {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [isCustom, setIsCustom] = useState(false)
  const [customValue, setCustomValue] = useState('')
  const [confirmGuardar, setConfirmGuardar] = useState(false)
  const customInputRef = useRef<HTMLInputElement>(null)

  const { data: materiales = [], isLoading } = useQuery<MaterialCatalogo[]>({
    queryKey: ['materiales', categoria],
    queryFn: () => getMaterialesPorCategoria(categoria),
    staleTime: 1000 * 60 * 30,
  })

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? materiales.filter((m) => m.referencia.toLowerCase().includes(q)) : materiales
  }, [materiales, query])

  const guardarMut = useMutation({
    mutationFn: () =>
      crearMaterial({ categoria, referencia: customValue.trim(), precio_m2: precioM2Actual }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['materiales', categoria] })
      showToast('success', `«${customValue.trim()}» se agregó a tu catálogo`)
      setConfirmGuardar(false)
      setIsCustom(false)
      onChange(customValue.trim(), precioM2Actual)
      setCustomValue('')
    },
    onError: () => {
      setConfirmGuardar(false)
      showToast('error', 'No se pudo guardar el material. Intenta de nuevo.')
    },
  })

  function handleSelect(m: MaterialCatalogo) {
    const dims =
      m.ancho_lamina_cm && m.alto_lamina_cm
        ? { largo: m.alto_lamina_cm / 100, ancho: m.ancho_lamina_cm / 100 }
        : undefined
    onChange(m.referencia, m.precio_m2, dims)
    setIsCustom(false)
    setCustomValue('')
    setOpen(false)
    setQuery('')
  }

  function handleSelectOtro() {
    setIsCustom(true)
    setCustomValue('')
    onChange('', 0, undefined)
    setOpen(false)
    setQuery('')
    setTimeout(() => customInputRef.current?.focus(), 30)
  }

  function handleCustomChange(val: string) {
    setCustomValue(val)
    onChange(val, precioM2Actual > 0 ? precioM2Actual : 0, undefined)
  }

  function handleBackToCatalog() {
    setIsCustom(false)
    setCustomValue('')
    onChange('', 0, undefined)
  }

  function handleClearCustom() {
    setCustomValue('')
    onChange('', 0, undefined)
  }

  const puedeGuardar = customValue.trim().length > 0 && precioM2Actual > 0

  // ── Modo texto libre ("Otro") ─────────────────────────────────────────────
  if (isCustom) {
    return (
      <div className="space-y-1.5">
        <div className="relative flex items-center">
          <PenLine size={13} className="pointer-events-none absolute left-3 text-brand-gold" aria-hidden="true" />
          <input
            ref={customInputRef}
            type="text"
            value={customValue}
            onChange={(e) => handleCustomChange(e.target.value)}
            placeholder="Escribe el nombre del material…"
            aria-label="Nombre del material"
            className="w-full rounded-lg border border-brand-gold/50 bg-brand-input px-3 py-2.5 pl-8 text-sm text-brand-text placeholder:text-brand-text-secondary outline-none focus-visible:border-brand-gold"
          />
          {customValue && (
            <button type="button" onClick={handleClearCustom} aria-label="Limpiar"
              className="absolute right-3 text-brand-text-secondary hover:text-brand-danger cursor-pointer">
              <X size={13} />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handleBackToCatalog}
            className="flex items-center gap-1 text-[11px] text-brand-text-secondary hover:text-brand-primary transition-colors cursor-pointer"
          >
            <ArrowLeft size={11} aria-hidden="true" />
            Volver al catálogo
          </button>

          {puedeGuardar && (
            <button
              type="button"
              onClick={() => setConfirmGuardar(true)}
              className="flex items-center gap-1 text-[11px] font-semibold text-brand-primary hover:underline cursor-pointer"
            >
              <BookmarkPlus size={12} aria-hidden="true" />
              Guardar en mi catálogo
            </button>
          )}
        </div>

        <Dialog
          open={confirmGuardar}
          onClose={() => setConfirmGuardar(false)}
          role="alertdialog"
          title="Guardar en tu catálogo"
        >
          <p className="mb-5 text-sm text-brand-text-secondary">
            ¿Guardar <span className="font-semibold text-brand-text-dark">«{customValue.trim()}»</span> a{' '}
            <span className="font-mono font-semibold text-brand-text-dark">{formatCOP(precioM2Actual)}/m²</span>{' '}
            para tenerlo disponible en próximas cotizaciones?
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setConfirmGuardar(false)}
              className="flex-1 rounded-lg border border-brand-border py-2.5 text-sm text-brand-text-secondary hover:text-brand-text transition-colors cursor-pointer"
            >
              Ahora no
            </button>
            <button
              type="button"
              onClick={() => guardarMut.mutate()}
              disabled={guardarMut.isPending}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-primary py-2.5 text-sm font-semibold text-white hover:bg-brand-primary-light transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Check size={14} aria-hidden="true" />
              {guardarMut.isPending ? 'Guardando…' : 'Sí, guardar'}
            </button>
          </div>
        </Dialog>
      </div>
    )
  }

  // ── Trigger + diálogo de selección ────────────────────────────────────────
  return (
    <>
      <button
        type="button"
        onClick={() => { setOpen(true); setQuery('') }}
        aria-haspopup="dialog"
        className="flex w-full items-center gap-2 rounded-lg border border-brand-border bg-brand-input px-3 py-2.5 text-left transition-colors hover:border-brand-primary/40 cursor-pointer"
      >
        <span className={`flex-1 truncate text-sm ${value ? 'text-brand-text' : 'text-brand-text-secondary'}`}>
          {value || placeholder || `Seleccionar ${categoria}…`}
        </span>
        {value && (
          <span
            role="button"
            tabIndex={0}
            aria-label="Limpiar"
            onClick={(e) => { e.stopPropagation(); onChange('', 0, undefined) }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onChange('', 0, undefined) } }}
            className="text-brand-text-secondary hover:text-brand-danger cursor-pointer"
          >
            <X size={13} />
          </span>
        )}
        <ChevronDown size={14} className="shrink-0 text-brand-text-tertiary" aria-hidden="true" />
      </button>

      <Dialog open={open} onClose={() => { setOpen(false); setQuery('') }} title={`Elegir material — ${categoria}`}>
        <div className="relative mb-3">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-tertiary" aria-hidden="true" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Buscar en ${categoria}…`}
            aria-label={`Buscar material de ${categoria}`}
            className="w-full rounded-lg border border-brand-border bg-brand-input py-2.5 pl-9 pr-3 text-sm text-brand-text placeholder:text-brand-text-secondary outline-none focus-visible:border-brand-primary"
          />
        </div>

        <ul className="max-h-[45vh] overflow-y-auto rounded-lg border border-brand-border divide-y divide-brand-border">
          {isLoading ? (
            <li className="px-4 py-8 text-center text-xs text-brand-text-secondary" role="status">Cargando catálogo…</li>
          ) : filtered.length === 0 ? (
            <li className="px-4 py-8 text-center text-xs text-brand-text-secondary">Sin resultados. Usa «Otro» abajo.</li>
          ) : (
            filtered.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(m)}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors hover:bg-brand-primary/[0.06] ${
                    value === m.referencia ? 'bg-brand-primary/10' : ''
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-sm font-medium text-brand-text-dark">{m.referencia}</span>
                    {m.es_propio && (
                      <span className="shrink-0 rounded bg-brand-gold/15 px-1.5 py-0.5 text-[9px] font-semibold text-brand-warning-text">
                        de tu taller
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 font-mono text-xs text-brand-text-secondary num">
                    {formatCOP(m.precio_m2)}/m²
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>

        <button
          type="button"
          onClick={handleSelectOtro}
          className="mt-3 flex w-full items-center gap-2 rounded-lg border border-dashed border-brand-gold/50 bg-brand-gold/[0.05] px-4 py-2.5 text-left text-sm font-semibold text-brand-warning-text hover:bg-brand-gold/[0.1] transition-colors cursor-pointer"
        >
          <PenLine size={14} aria-hidden="true" />
          Otro (escribir el nombre a mano)
        </button>

        <p className="mt-3 text-[10px] leading-relaxed text-brand-text-tertiary">
          {filtered.length} {filtered.length === 1 ? 'material' : 'materiales'} · {DISCLAIMER}
        </p>
      </Dialog>
    </>
  )
}
