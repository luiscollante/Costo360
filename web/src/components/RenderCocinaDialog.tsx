import { useEffect, useState, type ChangeEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Sparkles, Loader2, Upload, X as XIcon, Check, RefreshCw } from 'lucide-react'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import {
  getCategoriasMaterial, getMaterialesPorCategoria, getMaterialVisual,
  subirFotoReferencia, aprobarFotoReferencia,
} from '@/api/materiales'
import { generarRender, listarRenders, type SuperficieCocina } from '@/api/render'
import { showToast } from '@/lib/toast'

const SUPERFICIES: { value: SuperficieCocina; label: string }[] = [
  { value: 'mesón/encimera', label: 'Mesón / encimera' },
  { value: 'isla', label: 'Isla' },
  { value: 'salpicadero/backsplash', label: 'Salpicadero / backsplash' },
]

const TOPE_POR_COTIZACION = 3

const MENSAJES_CARGA = [
  'Analizando el material seleccionado…',
  'Aplicando la textura real de la piedra…',
  'Ajustando la iluminación de la escena…',
  'Dando los últimos retoques…',
]

function errDetalle(err: unknown, fallback: string): string {
  const d = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
  return typeof d === 'string' ? d : fallback
}

/** Panel de espera mientras OpenAI genera la imagen — sin porcentaje real
 * disponible, así que en vez de una barra fija se usa movimiento continuo +
 * mensajes rotativos para que la espera (varios segundos) se sienta activa. */
function CargandoRender() {
  const [i, setI] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % MENSAJES_CARGA.length), 2600)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-brand-border bg-brand-surface/60 p-6">
      <Sparkles className="h-7 w-7 animate-pulse text-brand-primary" aria-hidden="true" />
      <div className="h-1.5 w-40 overflow-hidden rounded-full bg-brand-border">
        <div className="render-progreso-bar h-full w-1/3 rounded-full bg-brand-primary" />
      </div>
      <p className="text-center text-xs text-brand-text-secondary">{MENSAJES_CARGA[i]}</p>
    </div>
  )
}

/**
 * Render de cocina con IA — genera una imagen de una cocina con el material
 * REAL que se está cotizando (OpenAI `gpt-image-2.5-sunburst`, ver
 * `backend/services/render_service.py`). Siempre requiere una cotización ya
 * guardada (el render queda colgado de ese registro, `render_cocina.
 * cotizacion_id`) — no existe para una cotización en borrador sin guardar.
 *
 * Regla dura (2026-09-16): nunca se genera un render sin una foto real
 * aprobada del material — el backend la exige, este diálogo la exige también
 * y permite resolverla ahí mismo (subir + aprobar) sin salir a Catálogo.
 */
export function RenderCocinaDialog({ cotizacionId, onClose }: { cotizacionId: number; onClose: () => void }) {
  const qc = useQueryClient()
  const [categoria, setCategoria] = useState('')
  const [materialId, setMaterialId] = useState<number | ''>('')
  const [superficie, setSuperficie] = useState<SuperficieCocina>('mesón/encimera')
  const [notaLibre, setNotaLibre] = useState('')
  const [fotoCliente, setFotoCliente] = useState<File | null>(null)
  const [consentimiento, setConsentimiento] = useState(false)

  // Foto de referencia del material, subida desde este mismo diálogo.
  const [fotoMaterialPreviewUrl, setFotoMaterialPreviewUrl] = useState<string | null>(null)
  const [mostrarConfirmarCatalogo, setMostrarConfirmarCatalogo] = useState(false)

  // Comparación antes/después — solo existe para el render recién generado en
  // ESTA sesión del diálogo (la foto del cliente nunca se re-expone desde el
  // backend por privacidad, así que el "antes" vive solo en el navegador).
  const [fotoAntesPreview, setFotoAntesPreview] = useState<string | null>(null)
  const [renderIdConAntes, setRenderIdConAntes] = useState<number | null>(null)

  const { data: categorias = [] } = useQuery({
    queryKey: ['categorias-material'],
    queryFn: getCategoriasMaterial,
  })

  const { data: materiales = [] } = useQuery({
    queryKey: ['materiales-categoria', categoria],
    queryFn: () => getMaterialesPorCategoria(categoria),
    enabled: !!categoria,
  })

  const { data: materialVisual, isFetching: cargandoVisual } = useQuery({
    queryKey: ['material-visual', materialId],
    queryFn: () => getMaterialVisual(materialId as number),
    enabled: !!materialId,
  })

  const { data: renders = [], refetch: refetchRenders } = useQuery({
    queryKey: ['renders', cotizacionId],
    queryFn: () => listarRenders(cotizacionId),
  })

  const atributosCompletos = materialVisual?.apto_para_render ?? false
  const fotoLista = !!(materialVisual?.foto_referencia_url && materialVisual?.foto_referencia_aprobada)
  const materialSeleccionado = materiales.find((m) => m.id === materialId)

  function limpiarPreviewMaterial() {
    setFotoMaterialPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    setMostrarConfirmarCatalogo(false)
  }

  function handleCategoria(e: ChangeEvent<HTMLSelectElement>) {
    setCategoria(e.target.value)
    setMaterialId('')
    limpiarPreviewMaterial()
  }

  function handleMaterial(e: ChangeEvent<HTMLSelectElement>) {
    setMaterialId(e.target.value ? Number(e.target.value) : '')
    limpiarPreviewMaterial()
  }

  const subirFotoMut = useMutation({
    mutationFn: (file: File) => subirFotoReferencia(materialId as number, file),
    onSuccess: () => setMostrarConfirmarCatalogo(true),
    onError: (e) => {
      showToast('error', errDetalle(e, 'No se pudo subir la foto'))
      limpiarPreviewMaterial()
    },
  })

  const aprobarMut = useMutation({
    mutationFn: (aprobada: boolean) => aprobarFotoReferencia(materialId as number, aprobada),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['material-visual', materialId] })
      limpiarPreviewMaterial()
      showToast('success', 'Foto guardada en el catálogo')
    },
    onError: (e) => showToast('error', errDetalle(e, 'No se pudo guardar la foto')),
  })

  function handleSeleccionarFotoMaterial(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setFotoMaterialPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(file)
    })
    subirFotoMut.mutate(file)
  }

  const generarMut = useMutation({
    mutationFn: () =>
      generarRender(cotizacionId, {
        material_id: Number(materialId),
        superficie,
        nota_libre: notaLibre.trim() || undefined,
        foto_cliente_consentimiento: consentimiento,
        foto_cliente: fotoCliente,
      }),
    onSuccess: async (data) => {
      await refetchRenders()
      qc.invalidateQueries({ queryKey: ['render-gasto'] })
      showToast('success', 'Render generado')
      setRenderIdConAntes(data.id)
      setFotoCliente(null)
      setConsentimiento(false)
      setNotaLibre('')
    },
    onError: (e) => showToast('error', errDetalle(e, 'No se pudo generar el render')),
  })

  function handleGenerar() {
    setFotoAntesPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return fotoCliente ? URL.createObjectURL(fotoCliente) : null
    })
    setRenderIdConAntes(null)
    generarMut.mutate()
  }

  function cerrar() {
    if (fotoAntesPreview) URL.revokeObjectURL(fotoAntesPreview)
    if (fotoMaterialPreviewUrl) URL.revokeObjectURL(fotoMaterialPreviewUrl)
    onClose()
  }

  const alTope = renders.length >= TOPE_POR_COTIZACION
  const materialListo = !!materialId && atributosCompletos && fotoLista
  const puedeGenerar =
    materialListo && (!fotoCliente || consentimiento) && !generarMut.isPending && !alTope

  return (
    <Dialog open onClose={cerrar} title="Render de cocina con IA" className="max-w-lg">
      <div className="space-y-3">
        <p className="text-xs text-brand-text-secondary">
          Generá una imagen de una cocina con el material real que estás cotizando, para mostrarle al
          cliente cómo se vería. Hasta {TOPE_POR_COTIZACION} renders por cotización.
        </p>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-brand-text-secondary">
              Tipo de material
            </label>
            <select
              value={categoria}
              onChange={handleCategoria}
              className="w-full cursor-pointer rounded-lg border border-brand-border bg-brand-input px-3 py-2.5 text-sm text-brand-text outline-none focus-visible:border-brand-primary"
            >
              <option value="">Elegir tipo…</option>
              {categorias.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-brand-text-secondary">
              Referencia
            </label>
            <select
              value={materialId}
              onChange={handleMaterial}
              disabled={!categoria}
              className="w-full cursor-pointer rounded-lg border border-brand-border bg-brand-input px-3 py-2.5 text-sm text-brand-text outline-none focus-visible:border-brand-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="">{categoria ? 'Elegir referencia…' : 'Elegí el tipo primero'}</option>
              {materiales.map((m) => (
                <option key={m.id} value={m.id}>{m.referencia}</option>
              ))}
            </select>
          </div>
        </div>

        {materialId !== '' && (
          <div className="space-y-2 rounded-lg border border-brand-border bg-brand-surface/40 p-3">
            {cargandoVisual ? (
              <p className="text-xs text-brand-text-secondary">Consultando datos del material…</p>
            ) : !atributosCompletos ? (
              <p className="text-xs text-brand-warning-text">
                Este material todavía no tiene sus datos visuales completos (color, veta, acabado).
                Completalos en <b>Catálogo</b> antes de generar un render.
              </p>
            ) : fotoLista ? (
              <div className="flex items-center gap-1.5 text-xs font-medium text-brand-success">
                <Check size={14} aria-hidden="true" />
                Foto de referencia lista para render
              </div>
            ) : mostrarConfirmarCatalogo && fotoMaterialPreviewUrl ? (
              <div className="space-y-2">
                <img
                  src={fotoMaterialPreviewUrl} alt="Foto de referencia subida"
                  className="h-32 w-full rounded-lg object-cover"
                />
                <p className="text-xs text-brand-text">
                  ¿Guardar esta foto en el catálogo para usarla en este y en futuros renders de{' '}
                  <b>{materialSeleccionado?.referencia}</b>?
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm" onClick={() => aprobarMut.mutate(true)} disabled={aprobarMut.isPending}
                  >
                    {aprobarMut.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <Check size={14} aria-hidden="true" />
                    )}
                    Sí, usar esta foto
                  </Button>
                  <Button
                    size="sm" variant="secondary" onClick={limpiarPreviewMaterial} disabled={aprobarMut.isPending}
                  >
                    <RefreshCw size={14} aria-hidden="true" />
                    Subir otra
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <p className="text-xs text-brand-warning-text">
                  Este material necesita una foto real de referencia para poder generar renders.
                </p>
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-brand-border px-3 py-2 text-xs text-brand-text-secondary transition-colors hover:border-brand-primary/50 hover:text-brand-text">
                  <Upload size={14} aria-hidden="true" />
                  {subirFotoMut.isPending ? 'Subiendo…' : 'Subir foto de la lámina real'}
                  <input
                    type="file" accept="image/*" className="hidden" disabled={subirFotoMut.isPending}
                    onChange={handleSeleccionarFotoMaterial}
                  />
                </label>
              </div>
            )}
          </div>
        )}

        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-brand-text-secondary">
            Dónde aplicar el material
          </label>
          <div className="flex flex-wrap gap-1.5">
            {SUPERFICIES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setSuperficie(s.value)}
                className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  superficie === s.value
                    ? 'border border-brand-primary/40 bg-brand-primary/20 text-brand-text'
                    : 'border border-brand-border bg-brand-surface/60 text-brand-text-secondary hover:text-brand-text'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-brand-text-secondary">
            Foto real de la cocina del cliente (opcional)
          </label>
          {fotoCliente ? (
            <div className="flex items-center gap-2 rounded-lg border border-brand-border px-3 py-2 text-xs text-brand-text">
              <span className="flex-1 truncate">{fotoCliente.name}</span>
              <button
                type="button"
                onClick={() => { setFotoCliente(null); setConsentimiento(false) }}
                className="cursor-pointer text-brand-text-secondary hover:text-brand-danger"
              >
                <XIcon size={14} />
              </button>
            </div>
          ) : (
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-brand-border px-3 py-2 text-xs text-brand-text-secondary transition-colors hover:border-brand-primary/50 hover:text-brand-text">
              <Upload size={14} aria-hidden="true" />
              Subir foto (si no subís una, se genera una cocina de muestra)
              <input
                type="file" accept="image/*" className="hidden"
                onChange={(e) => setFotoCliente(e.target.files?.[0] ?? null)}
              />
            </label>
          )}
          {fotoCliente && (
            <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-brand-text-secondary">
              <input
                type="checkbox" checked={consentimiento}
                onChange={(e) => setConsentimiento(e.target.checked)}
                className="cursor-pointer"
              />
              El cliente autorizó usar esta foto para generar el render
            </label>
          )}
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-brand-text-secondary">
            Nota adicional (opcional)
          </label>
          <input
            type="text" maxLength={120} value={notaLibre}
            onChange={(e) => setNotaLibre(e.target.value)}
            placeholder="Ej. isla con banco alto"
            className="w-full rounded-lg border border-brand-border bg-brand-input px-3 py-2.5 text-sm text-brand-text outline-none focus-visible:border-brand-primary"
          />
        </div>

        <Button type="button" onClick={handleGenerar} disabled={!puedeGenerar} className="w-full">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          Generar render
        </Button>
        {materialId !== '' && !materialListo && !cargandoVisual && (
          <p className="text-center text-[11px] text-brand-text-secondary">
            {!atributosCompletos ? 'Faltan datos visuales del material.' : 'Falta la foto de referencia aprobada.'}
          </p>
        )}
        {alTope && (
          <p className="text-center text-[11px] text-brand-text-secondary">
            Ya generaste el máximo de {TOPE_POR_COTIZACION} renders para esta cotización.
          </p>
        )}

        {generarMut.isPending && <CargandoRender />}

        {renders.length > 0 && (
          <div className="mt-4 space-y-3 border-t border-brand-border pt-4">
            {renders.map((r) => (
              <div key={r.id} className="overflow-hidden rounded-lg border border-brand-border">
                {r.estado === 'completado' && r.imagen_url ? (
                  r.id === renderIdConAntes && fotoAntesPreview ? (
                    <div>
                      <div className="grid grid-cols-2 gap-px bg-brand-border">
                        <div className="relative">
                          <img src={fotoAntesPreview} alt="Antes" className="h-40 w-full object-cover sm:h-48" />
                          <span className="absolute bottom-1.5 left-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                            Antes
                          </span>
                        </div>
                        <div className="relative">
                          <img
                            src={r.imagen_url} alt={`Después con ${r.material_referencia_snapshot}`}
                            className="h-40 w-full object-cover sm:h-48"
                          />
                          <span className="absolute bottom-1.5 left-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                            Después
                          </span>
                        </div>
                      </div>
                      <p className="bg-black/60 px-2 py-1 text-center text-[10px] text-white">
                        Simulación referencial — el color y la veta reales pueden variar
                      </p>
                    </div>
                  ) : (
                    <div className="relative">
                      <img src={r.imagen_url} alt={`Render con ${r.material_referencia_snapshot}`} className="w-full" />
                      <span className="absolute bottom-1.5 left-1.5 right-1.5 rounded bg-black/60 px-2 py-1 text-center text-[10px] text-white">
                        Simulación referencial — el color y la veta reales pueden variar
                      </span>
                    </div>
                  )
                ) : r.estado === 'fallido' ? (
                  <p className="p-3 text-xs text-brand-danger">No se pudo generar este render.</p>
                ) : (
                  <p className="flex items-center justify-center gap-2 p-3 text-xs text-brand-text-secondary">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    Generando…
                  </p>
                )}
                <p className="px-3 py-1.5 text-[11px] text-brand-text-secondary">
                  {r.material_referencia_snapshot} · {r.superficie}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </Dialog>
  )
}
