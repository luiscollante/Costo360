import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { History, Undo2, Download, Sparkles } from 'lucide-react'
import AppLayout from '@/components/AppLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { listarHistorial, deshacerAccion, obtenerAgregadoHistorial, descargarCsvAgregado } from '@/api/agente'
import { resumirFila } from '@/lib/agenteFormato'
import { formatFechaHora } from '@/lib/utils'
import { showToast } from '@/lib/toast'
import { useAuthStore } from '@/store/auth'
import { puedePedirDatosAgregadosAgente } from '@/lib/capabilities'

/**
 * Centro del Agente — Objetivo 5, Ciclo 3. Dos secciones con reglas de acceso
 * distintas (decisiones del fundador, 2026-09-06/09):
 *   - "Tu bitácora": de CUALQUIER usuario autenticado, y SOLO la propia — el
 *     backend la aísla por usuario_id vía RLS, ni admin ni gerencia ven la de
 *     otro por este camino.
 *   - "Modo BI": solo con `puede_pedir_datos_agregados_agente`. Nunca una
 *     fila individual — el backend ya agrupa por usuario y omite cualquier
 *     grupo bajo el umbral de k-anonimato antes de que esto llegue aquí.
 */
export default function CentroAgentePage() {
  const usuario = useAuthStore((s) => s.usuario)
  const puedeBI = puedePedirDatosAgregadosAgente(usuario)
  const qc = useQueryClient()

  const { data: acciones = [], isPending } = useQuery({
    queryKey: ['agente-historial'],
    queryFn: listarHistorial,
  })

  const deshacerMut = useMutation({
    mutationFn: deshacerAccion,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agente-historial'] })
      showToast('success', 'Acción deshecha')
    },
    onError: () => showToast('error', 'No se pudo deshacer — puede que ya se haya deshecho antes'),
  })

  const { data: agregado, isPending: isPendingAgregado } = useQuery({
    queryKey: ['agente-historial-agregado'],
    queryFn: obtenerAgregadoHistorial,
    enabled: puedeBI,
  })

  async function exportarCsv() {
    try {
      await descargarCsvAgregado()
    } catch {
      showToast('error', 'No se pudo exportar el CSV')
    }
  }

  return (
    <AppLayout>
      <PageHeader
        kicker="Objetivo 5 · Ciclo 3"
        title="Centro del Agente"
        subtitle="Todo lo que Cost ejecutó de verdad por ti — con posibilidad de deshacer las ediciones."
      />

      <Card className="p-4">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-brand-text-dark">
          <History size={16} className="text-brand-primary" aria-hidden="true" />
          Tu bitácora
        </h2>

        {isPending ? (
          <p className="py-6 text-center text-sm text-brand-text-secondary">Cargando…</p>
        ) : acciones.length === 0 ? (
          <EmptyState
            icon={<Sparkles size={32} />}
            title="Cost todavía no ha ejecutado ninguna acción para ti."
          />
        ) : (
          <ul className="divide-y divide-brand-border">
            {acciones.map((a) => {
              const fila = a.filas_afectadas[0]
              const { principal, id, detalles } = fila ? resumirFila(fila) : { principal: a.herramienta, id: null, detalles: [] }
              return (
                <li key={a.id} className="flex items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-brand-text-dark">{principal}</span>
                      {id != null && <span className="text-xs text-brand-text-secondary">(id {id})</span>}
                      {a.deshecha_en && <Badge tono="neutral">Deshecha</Badge>}
                    </div>
                    {detalles.length > 0 && (
                      <p className="mt-0.5 text-xs text-brand-text-secondary">
                        {detalles.map(([k, v]) => `${k}: ${v}`).join(' · ')}
                      </p>
                    )}
                    <p className="mt-0.5 text-[11px] text-brand-text-tertiary">
                      {a.herramienta} · {formatFechaHora(a.creado_en)}
                    </p>
                  </div>
                  {a.es_deshacible && !a.deshecha_en && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => deshacerMut.mutate(a.id)}
                      disabled={deshacerMut.isPending}
                      aria-label={`Deshacer: ${principal}`}
                    >
                      <Undo2 size={12} aria-hidden="true" />
                      Deshacer
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      {puedeBI && (
        <Card className="mt-6 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-brand-text-dark">Modo BI — uso agregado del Agente</h2>
            <Button size="sm" variant="secondary" onClick={exportarCsv}>
              <Download size={12} aria-hidden="true" />
              Exportar CSV
            </Button>
          </div>

          {isPendingAgregado ? (
            <p className="py-6 text-center text-sm text-brand-text-secondary">Cargando…</p>
          ) : !agregado || agregado.por_herramienta.length === 0 ? (
            <EmptyState title="Todavía no hay suficiente actividad del Agente en este taller." />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-text-secondary">
                  Por herramienta
                </p>
                <ul className="space-y-1 text-sm">
                  {agregado.por_herramienta.map((f) => (
                    <li key={f.herramienta} className="flex items-center justify-between gap-2">
                      <span className="truncate text-brand-text">{f.herramienta}</span>
                      <span className="shrink-0 text-brand-text-secondary">
                        {f.total}{f.deshechas > 0 && ` (${f.deshechas} deshechas)`}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-text-secondary">
                  Por usuario
                </p>
                {agregado.por_usuario.length === 0 ? (
                  <p className="text-sm text-brand-text-secondary">Ningún usuario individual supera el umbral todavía.</p>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {agregado.por_usuario.map((u) => (
                      <li key={u.usuario_id} className="flex items-center justify-between gap-2">
                        <span className="truncate text-brand-text">{u.nombre}</span>
                        <span className="shrink-0 text-brand-text-secondary">{u.total}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {agregado.usuarios_agrupados > 0 && (
                  <p className="mt-2 text-xs text-brand-text-tertiary">
                    +{agregado.usuarios_agrupados} usuario(s) con menos de {agregado.umbral_k_anonimato} acciones
                    cada uno ({agregado.acciones_agrupadas} acciones en total) — no se muestran por separado para
                    proteger su privacidad.
                  </p>
                )}
              </div>
            </div>
          )}
        </Card>
      )}
    </AppLayout>
  )
}
