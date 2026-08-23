import { useState, useRef, useEffect, useId } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, Search, X, PenLine, ArrowLeft } from 'lucide-react'
import { getMaterialesPorCategoria, type MaterialCatalogo } from '@/api/materiales'
import { formatCOP } from '@/lib/utils'

interface Props {
  categoria: string
  value: string
  onChange: (ref: string, precioM2: number, dims?: { largo: number; ancho: number }) => void
  placeholder?: string
}

const DISCLAIMER = 'Precios de lista 2024. Confirmar precios actuales y disponibilidad con proveedores antes de cotizar.'

export default function MaterialCombobox({ categoria, value, onChange, placeholder }: Props) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [isCustom, setIsCustom] = useState(false)
  const [customValue, setCustomValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const customInputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const { data: materiales = [], isLoading } = useQuery<MaterialCatalogo[]>({
    queryKey: ['materiales', categoria],
    queryFn: () => getMaterialesPorCategoria(categoria),
    staleTime: 1000 * 60 * 30,
  })

  const filtered = query.trim()
    ? materiales.filter((m) => m.referencia.toLowerCase().includes(query.toLowerCase()))
    : materiales

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { setOpen(false); setQuery('') }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  function handleSelect(m: MaterialCatalogo) {
    const dims = m.ancho_lamina_cm && m.alto_lamina_cm
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
    onChange(val, 0, undefined)
  }

  function handleBackToCatalog() {
    setIsCustom(false)
    setCustomValue('')
    onChange('', 0, undefined)
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation()
    setIsCustom(false)
    setCustomValue('')
    onChange('', 0, undefined)
    setQuery('')
  }

  // Modo texto libre (Otro)
  if (isCustom) {
    return (
      <div className="space-y-1.5">
        <div className="relative flex items-center">
          <PenLine size={13} className="absolute left-3 text-brand-gold/60 pointer-events-none" />
          <input
            ref={customInputRef}
            type="text"
            value={customValue}
            onChange={(e) => handleCustomChange(e.target.value)}
            placeholder="Escribe el nombre de la referencia…"
            className="w-full bg-brand-input border border-brand-gold/40 rounded px-3 py-2.5 pl-8 text-sm text-brand-text placeholder-brand-muted/40 outline-none focus:border-brand-gold focus:shadow-[0_0_0_1px_#C9A22730]"
          />
          {customValue && (
            <button type="button" onClick={handleClear} className="absolute right-3 text-brand-muted/40 hover:text-red-400">
              <X size={13} />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={handleBackToCatalog}
          className="flex items-center gap-1 text-[11px] text-brand-muted/50 hover:text-brand-primary transition-colors"
        >
          <ArrowLeft size={11} />
          Volver al catálogo
        </button>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <div
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={`${id}-list`}
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 10) }}
        className={[
          'w-full flex items-center gap-2 bg-brand-input border rounded px-3 py-2.5 cursor-pointer transition-all duration-200',
          open
            ? 'border-brand-primary shadow-[0_0_0_1px_#1F6F5440,0_0_12px_#1F6F5418]'
            : 'border-brand-border hover:border-brand-border/80',
        ].join(' ')}
      >
        {open ? (
          <>
            <Search size={13} className="text-brand-muted/60 shrink-0" />
            <input
              ref={inputRef}
              id={id}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Buscar en ${categoria}…`}
              className="flex-1 bg-transparent text-sm text-brand-text placeholder-brand-muted/40 outline-none min-w-0"
              aria-autocomplete="list"
              aria-controls={`${id}-list`}
            />
          </>
        ) : (
          <>
            <span className={`flex-1 text-sm truncate ${value ? 'text-brand-text' : 'text-brand-muted/40'}`}>
              {value || placeholder || `Seleccionar ${categoria}…`}
            </span>
            {value && (
              <button type="button" onClick={handleClear} className="text-brand-muted/40 hover:text-red-400 transition-colors" aria-label="Limpiar">
                <X size={13} />
              </button>
            )}
            <ChevronDown size={14} className={`text-brand-muted/50 transition-transform duration-200 shrink-0 ${open ? 'rotate-180' : ''}`} />
          </>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div
          id={`${id}-list`}
          role="listbox"
          aria-label={`Materiales de ${categoria}`}
          className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl border border-brand-border/80 bg-brand-input-deep shadow-[0_8px_32px_rgba(0,0,0,0.5),0_0_0_1px_rgba(30,127,255,0.08)] overflow-hidden flex flex-col material-dropdown"
          style={{ maxHeight: '300px' }}
        >
          {/* Scrollable list */}
          <div className="overflow-y-auto flex-1">
            {isLoading ? (
              <div className="px-4 py-8 text-center text-xs text-brand-muted/50">Cargando catálogo…</div>
            ) : (
              <ul>
                {filtered.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={value === m.referencia}
                      onClick={() => handleSelect(m)}
                      className={[
                        'w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors duration-150',
                        value === m.referencia
                          ? 'bg-brand-primary/15 text-brand-text'
                          : 'hover:bg-brand-primary/8 text-brand-text',
                      ].join(' ')}
                    >
                      <span className="text-sm font-medium truncate mr-3">{m.referencia}</span>
                      <span className="text-xs font-mono text-brand-gold-light shrink-0">
                        {formatCOP(m.precio_m2)}/m²
                      </span>
                    </button>
                  </li>
                ))}
                {/* Opción Otro */}
                <li>
                  <button
                    type="button"
                    onClick={handleSelectOtro}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-left border-t border-brand-border/30 hover:bg-brand-gold/8 text-brand-muted/70 hover:text-brand-gold transition-colors duration-150"
                  >
                    <PenLine size={13} />
                    <span className="text-sm">Otro (escribir manualmente)</span>
                  </button>
                </li>
              </ul>
            )}
          </div>

          {/* Footer con aviso de precios */}
          <div className="px-4 py-2.5 border-t border-brand-border/40 bg-brand-bg/80 shrink-0">
            <p className="text-[10px] text-brand-muted/40 leading-relaxed">
              {filtered.length} {filtered.length === 1 ? 'material' : 'materiales'} · {DISCLAIMER}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
