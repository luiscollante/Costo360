import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell } from 'lucide-react'
import { IconButton } from '@/components/ui/IconButton'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { showToast } from '@/lib/toast'
import { formatFechaHora } from '@/lib/utils'
import {
  listarNotificaciones, marcarNotificacionLeida, marcarTodasLeidas,
} from '@/api/proyectos'
import { NotifIcono } from './badges'

/**
 * Campana de notificaciones del módulo de proyectos, en la barra superior.
 * Sin `refetchInterval` (hallazgo UX M5): refetch al montar + al enfocar la
 * ventana + invalidación desde las páginas de `/proyectos`.
 */
export function CampanaNotificaciones() {
  const qc = useQueryClient()
  const [abierto, setAbierto] = useState(false)

  const { data = [] } = useQuery({
    queryKey: ['notificaciones'],
    queryFn: listarNotificaciones,
    refetchOnWindowFocus: true,
    staleTime: 1000 * 60,
  })
  const noLeidas = data.filter((n) => !n.leida).length

  const marcarUna = useMutation({
    mutationFn: (id: number) => marcarNotificacionLeida(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notificaciones'] }),
    onError: () => showToast('error', 'No se pudo marcar la notificación'),
  })
  const marcarTodas = useMutation({
    mutationFn: () => marcarTodasLeidas(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notificaciones'] }),
    onError: () => showToast('error', 'No se pudieron marcar las notificaciones'),
  })

  return (
    <>
      <div className="relative">
        <IconButton
          aria-label={noLeidas > 0 ? `Notificaciones (${noLeidas} sin leer)` : 'Notificaciones'}
          onClick={() => setAbierto(true)}
        >
          <Bell size={16} aria-hidden="true" />
        </IconButton>
        {noLeidas > 0 && (
          <span
            className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-danger px-1 text-[9px] font-bold text-white"
            aria-hidden="true"
          >
            {noLeidas > 9 ? '9+' : noLeidas}
          </span>
        )}
      </div>

      <Dialog open={abierto} onClose={() => setAbierto(false)} title="Notificaciones" className="max-w-md">
        <div className="mb-3 flex justify-end">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => marcarTodas.mutate()}
            disabled={marcarTodas.isPending || noLeidas === 0}
          >
            Marcar todas como leídas
          </Button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {data.length === 0 ? (
            <EmptyState icon={<Bell size={26} />} title="Sin notificaciones" />
          ) : (
            <ul className="space-y-1.5">
              {data.map((n) => {
                const contenido = (
                  <>
                    <NotifIcono tipo={n.tipo} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-brand-text-dark">
                        {!n.leida && (
                          <>
                            <span className="sr-only">Sin leer. </span>
                            <span
                              className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-brand-primary align-middle"
                              aria-hidden="true"
                            />
                          </>
                        )}
                        {n.titulo}
                      </span>
                      {n.mensaje && (
                        <span className="mt-0.5 block text-[12px] text-brand-text-secondary">{n.mensaje}</span>
                      )}
                      <span className="mt-0.5 block text-[10px] text-brand-text-secondary">
                        {formatFechaHora(n.created_at)}
                      </span>
                    </span>
                  </>
                )
                const cls = `flex items-start gap-2.5 rounded-lg border p-2.5 ${
                  n.leida ? 'border-brand-border/40' : 'border-brand-primary/30 bg-brand-primary/[0.04]'
                }`
                return (
                  <li key={n.id}>
                    {n.project_id ? (
                      <Link
                        to={`/proyectos/${n.project_id}`}
                        onClick={() => { if (!n.leida) marcarUna.mutate(n.id); setAbierto(false) }}
                        className={`${cls} hover:border-brand-primary/50`}
                      >
                        {contenido}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => { if (!n.leida) marcarUna.mutate(n.id) }}
                        className={`${cls} w-full text-left`}
                      >
                        {contenido}
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </Dialog>
    </>
  )
}
