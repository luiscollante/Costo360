import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import AppLayout from '@/components/AppLayout'
import {
  getUsuarios,
  getInvitaciones,
  invitarUsuario,
  editarUsuario,
  eliminarUsuario,
  type UsuarioItem,
  type RolInvitable,
} from '@/api/admin'
import { useAuthStore } from '@/store/auth'
import { UserPlus, Pencil, Trash2, X, Check, Shield, Copy } from 'lucide-react'

const ROLES: RolInvitable[] = ['operativo', 'gerencia']
const ROL_LABEL: Record<string, string> = {
  admin: 'Administrador',
  gerencia: 'Gerencia',
  operativo: 'Operativo',
}

const inputBase =
  'w-full px-3 py-2.5 rounded-lg bg-brand-surface border border-brand-border text-sm text-brand-text placeholder:text-brand-muted/40 focus:outline-none focus:border-brand-primary/50 transition-colors'

export default function AdminPage() {
  const qc = useQueryClient()
  const yo = useAuthStore((s) => s.usuario)

  const [modal, setModal] = useState<'invitar' | 'editar' | null>(null)
  const [editing, setEditing] = useState<UsuarioItem | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [enlace, setEnlace] = useState<string | null>(null)

  const [inviteForm, setInviteForm] = useState({ email: '', nombre_completo: '', rol_codigo: 'operativo' as RolInvitable })
  const [editForm, setEditForm] = useState({ nombre_completo: '', cargo_visible: '', rol_codigo: 'operativo' as RolInvitable, activo: true })

  const { data: usuarios = [], isPending } = useQuery({ queryKey: ['admin-usuarios'], queryFn: getUsuarios })
  const { data: invitaciones = [] } = useQuery({ queryKey: ['admin-invitaciones'], queryFn: getInvitaciones })

  const refetchAll = () => {
    qc.invalidateQueries({ queryKey: ['admin-usuarios'] })
    qc.invalidateQueries({ queryKey: ['admin-invitaciones'] })
  }

  const inviteMut = useMutation({
    mutationFn: invitarUsuario,
    onSuccess: (data) => {
      refetchAll()
      setEnlace(data.enlace_para_definir_contrasena)
      setModal(null)
    },
  })

  const editMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof editarUsuario>[1] }) => editarUsuario(id, body),
    onSuccess: () => {
      refetchAll()
      setModal(null)
      setEditing(null)
    },
  })

  const deleteMut = useMutation({
    mutationFn: eliminarUsuario,
    onSuccess: () => {
      refetchAll()
      setDeleteId(null)
    },
  })

  function openEdit(u: UsuarioItem) {
    setEditing(u)
    setEditForm({
      nombre_completo: u.nombre_completo,
      cargo_visible: u.cargo_visible ?? '',
      rol_codigo: (u.rol_codigo === 'gerencia' ? 'gerencia' : 'operativo'),
      activo: u.activo,
    })
    setModal('editar')
  }

  const rolBadge: Record<string, string> = {
    admin: 'bg-purple-500/15 text-purple-300 border border-purple-500/30',
    gerencia: 'bg-brand-primary/15 text-brand-text border border-brand-primary/30',
    operativo: 'bg-brand-surface text-brand-muted border border-brand-border',
  }

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="font-mono text-[10px] text-brand-muted/50 tracking-[0.2em]">ADMINISTRACIÓN</span>
              <div className="w-16 h-px bg-brand-border/40" />
            </div>
            <h1 className="text-2xl font-bold text-brand-text tracking-tight flex items-center gap-2">
              <Shield className="w-6 h-6 text-brand-primary" />
              Usuarios de la empresa
            </h1>
            <p className="text-sm text-brand-muted mt-1">Invita y gestiona a tu equipo</p>
          </div>
          <button
            onClick={() => {
              setInviteForm({ email: '', nombre_completo: '', rol_codigo: 'operativo' })
              setModal('invitar')
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:bg-brand-primary/90 transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            Invitar usuario
          </button>
        </div>

        {enlace && (
          <div className="mb-6 glass rounded-xl border border-brand-primary/30 p-4">
            <p className="text-xs text-brand-muted mb-2">
              Envía este enlace a la persona para que defina su contraseña (el correo automático puede no estar
              configurado todavía):
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-[11px] text-brand-text bg-brand-surface rounded px-2 py-1.5 truncate">{enlace}</code>
              <button
                onClick={() => navigator.clipboard.writeText(enlace)}
                className="p-2 rounded-lg hover:bg-brand-surface text-brand-muted cursor-pointer"
                aria-label="Copiar enlace"
              >
                <Copy className="w-4 h-4" />
              </button>
              <button onClick={() => setEnlace(null)} className="p-2 rounded-lg hover:bg-brand-surface text-brand-muted cursor-pointer" aria-label="Cerrar">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {isPending ? (
          <div className="glass rounded-xl border border-brand-border p-12 text-center">
            <p className="text-sm text-brand-muted">Cargando usuarios…</p>
          </div>
        ) : (
          <div className="glass rounded-xl border border-brand-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-border">
                  <th className="px-5 py-3 text-left text-[10px] font-semibold text-brand-muted/60 uppercase tracking-widest">Nombre</th>
                  <th className="px-5 py-3 text-left text-[10px] font-semibold text-brand-muted/60 uppercase tracking-widest">Correo</th>
                  <th className="px-5 py-3 text-left text-[10px] font-semibold text-brand-muted/60 uppercase tracking-widest">Rol</th>
                  <th className="px-5 py-3 text-right text-[10px] font-semibold text-brand-muted/60 uppercase tracking-widest">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => {
                  const esYo = u.id === yo?.id
                  const esAdmin = u.rol_codigo === 'admin'
                  return (
                    <tr key={u.id} className="border-b border-brand-border/50 last:border-0 hover:bg-brand-surface/40 transition-colors">
                      <td className="px-5 py-3.5 text-brand-text font-medium">
                        {u.nombre_completo || <span className="text-brand-muted/50 italic">Sin nombre</span>}
                        {esYo && <span className="ml-2 text-[9px] text-brand-primary font-mono">(tú)</span>}
                        {!u.activo && <span className="ml-2 text-[9px] text-red-400 font-mono">(inactivo)</span>}
                        {u.cargo_visible && <span className="ml-2 text-[10px] text-brand-muted">· {u.cargo_visible}</span>}
                      </td>
                      <td className="px-5 py-3.5 text-brand-muted font-mono text-xs">{u.email}</td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${rolBadge[u.rol_codigo] ?? rolBadge.operativo}`}>
                          {ROL_LABEL[u.rol_codigo] ?? u.rol_codigo}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-2">
                          {!esYo && !esAdmin && deleteId === u.id ? (
                            <>
                              <span className="text-xs text-brand-muted mr-1">¿Eliminar?</span>
                              <button onClick={() => deleteMut.mutate(u.id)} disabled={deleteMut.isPending} aria-label="Confirmar" className="p-1.5 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 cursor-pointer disabled:opacity-50">
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => setDeleteId(null)} aria-label="Cancelar" className="p-1.5 rounded-lg hover:bg-brand-surface text-brand-muted cursor-pointer">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            !esYo && !esAdmin && (
                              <>
                                <button onClick={() => openEdit(u)} className="p-1.5 rounded-lg hover:bg-brand-primary/15 text-brand-muted hover:text-brand-primary cursor-pointer" aria-label={`Editar a ${u.nombre_completo || u.email}`}>
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => setDeleteId(u.id)} className="p-1.5 rounded-lg hover:bg-red-500/15 text-brand-muted hover:text-red-400 cursor-pointer" aria-label={`Eliminar a ${u.nombre_completo || u.email}`}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {usuarios.length === 0 && <p className="px-5 py-8 text-center text-sm text-brand-muted">Aún no hay usuarios.</p>}
          </div>
        )}

        {invitaciones.length > 0 && (
          <div className="mt-6">
            <h2 className="text-xs font-semibold text-brand-muted uppercase tracking-widest mb-2">Invitaciones pendientes</h2>
            <div className="glass rounded-xl border border-brand-border divide-y divide-brand-border/50">
              {invitaciones.map((inv) => (
                <div key={inv.id} className="px-5 py-3 flex items-center justify-between text-sm">
                  <span className="font-mono text-xs text-brand-text">{inv.email}</span>
                  <span className="text-[10px] text-brand-muted">{ROL_LABEL[inv.rol_codigo] ?? inv.rol_codigo} · expira {new Date(inv.expira_en).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {modal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && setModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="glass rounded-xl border border-brand-border p-6 w-full max-w-md"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-bold text-brand-text">
                  {modal === 'invitar' ? 'Invitar usuario' : `Editar — ${editing?.email}`}
                </h2>
                <button onClick={() => setModal(null)} aria-label="Cerrar" className="p-1.5 rounded-lg hover:bg-brand-surface text-brand-muted cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {modal === 'invitar' ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-brand-muted mb-1.5 uppercase tracking-wide">Correo</label>
                    <input type="email" value={inviteForm.email} onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))} placeholder="persona@empresa.com" className={inputBase} autoFocus />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-brand-muted mb-1.5 uppercase tracking-wide">Nombre completo</label>
                    <input type="text" value={inviteForm.nombre_completo} onChange={(e) => setInviteForm((f) => ({ ...f, nombre_completo: e.target.value }))} placeholder="Nombre y apellido" className={inputBase} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-brand-muted mb-1.5 uppercase tracking-wide">Rol</label>
                    <select value={inviteForm.rol_codigo} onChange={(e) => setInviteForm((f) => ({ ...f, rol_codigo: e.target.value as RolInvitable }))} className={inputBase}>
                      {ROLES.map((r) => <option key={r} value={r}>{ROL_LABEL[r]}</option>)}
                    </select>
                  </div>
                  {inviteMut.isError && (
                    <p className="text-xs text-red-400">
                      {(inviteMut.error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'No se pudo invitar'}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-brand-muted mb-1.5 uppercase tracking-wide">Nombre completo</label>
                    <input type="text" value={editForm.nombre_completo} onChange={(e) => setEditForm((f) => ({ ...f, nombre_completo: e.target.value }))} className={inputBase} autoFocus />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-brand-muted mb-1.5 uppercase tracking-wide">Cargo (visual)</label>
                    <input type="text" value={editForm.cargo_visible} onChange={(e) => setEditForm((f) => ({ ...f, cargo_visible: e.target.value }))} placeholder="Gerente, Asesor…" className={inputBase} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-brand-muted mb-1.5 uppercase tracking-wide">Rol</label>
                    <select value={editForm.rol_codigo} onChange={(e) => setEditForm((f) => ({ ...f, rol_codigo: e.target.value as RolInvitable }))} className={inputBase}>
                      {ROLES.map((r) => <option key={r} value={r}>{ROL_LABEL[r]}</option>)}
                    </select>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-brand-text">
                    <input type="checkbox" checked={editForm.activo} onChange={(e) => setEditForm((f) => ({ ...f, activo: e.target.checked }))} />
                    Cuenta activa
                  </label>
                  {editMut.isError && (
                    <p className="text-xs text-red-400">
                      {(editMut.error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'No se pudo guardar'}
                    </p>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setModal(null)} className="px-4 py-2 rounded-lg text-sm text-brand-muted hover:text-brand-text hover:bg-brand-surface cursor-pointer">Cancelar</button>
                <button
                  onClick={() => {
                    if (modal === 'invitar') {
                      inviteMut.mutate({ email: inviteForm.email.trim(), nombre_completo: inviteForm.nombre_completo.trim(), rol_codigo: inviteForm.rol_codigo })
                    } else if (editing) {
                      editMut.mutate({
                        id: editing.id,
                        body: {
                          nombre_completo: editForm.nombre_completo || undefined,
                          cargo_visible: editForm.cargo_visible || null,
                          rol_codigo: editForm.rol_codigo,
                          activo: editForm.activo,
                        },
                      })
                    }
                  }}
                  disabled={inviteMut.isPending || editMut.isPending}
                  className="px-5 py-2 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:bg-brand-primary/90 disabled:opacity-60 cursor-pointer"
                >
                  {inviteMut.isPending || editMut.isPending ? 'Guardando…' : modal === 'invitar' ? 'Enviar invitación' : 'Guardar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppLayout>
  )
}
