import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import AppLayout from '@/components/AppLayout'
import {
  getUsuarios,
  createUsuario,
  updateUsuario,
  deleteUsuario,
  type UsuarioItem,
  type UsuarioCreate,
  type UsuarioUpdate,
} from '@/api/admin'
import { useAuthStore } from '@/store/auth'
import { UserPlus, Pencil, Trash2, X, Check, Shield } from 'lucide-react'

const ROLES = ['Admin', 'Gerente', 'Operario'] as const
type Rol = (typeof ROLES)[number]

type ModalMode = 'create' | 'edit' | null

interface CreateForm {
  username: string
  password: string
  pin: string
  rol: Rol
  nombre_completo: string
}

interface EditForm {
  nombre_completo: string
  rol: Rol
  password: string
}

const inputBase =
  'w-full px-3 py-2.5 rounded-lg bg-brand-surface border border-brand-border text-sm text-brand-text placeholder:text-brand-muted/40 focus:outline-none focus:border-brand-primary/50 transition-colors'

export default function AdminPage() {
  const qc = useQueryClient()
  const usuarioActual = useAuthStore((s) => s.usuario)

  const [modal, setModal] = useState<ModalMode>(null)
  const [editing, setEditing] = useState<UsuarioItem | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const [createForm, setCreateForm] = useState<CreateForm>({
    username: '', password: '', pin: '', rol: 'Operario', nombre_completo: '',
  })
  const [editForm, setEditForm] = useState<EditForm>({
    nombre_completo: '', rol: 'Operario', password: '',
  })

  const { data: usuarios = [], isPending } = useQuery({
    queryKey: ['admin-usuarios'],
    queryFn: getUsuarios,
  })

  const createMut = useMutation({
    mutationFn: (body: UsuarioCreate) => createUsuario(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-usuarios'] })
      closeModal()
    },
  })

  const editMut = useMutation({
    mutationFn: ({ id, body }: { id: number; body: UsuarioUpdate }) => updateUsuario(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-usuarios'] })
      closeModal()
    },
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteUsuario(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-usuarios'] })
      setDeleteId(null)
    },
  })

  function openCreate() {
    setCreateForm({ username: '', password: '', pin: '', rol: 'Operario', nombre_completo: '' })
    setModal('create')
  }

  function openEdit(u: UsuarioItem) {
    setEditing(u)
    setEditForm({ nombre_completo: u.nombre_completo, rol: u.rol as Rol, password: '' })
    setModal('edit')
  }

  function closeModal() {
    setModal(null)
    setEditing(null)
  }

  function submitCreate() {
    createMut.mutate(createForm)
  }

  function submitEdit() {
    if (!editing) return
    const body: UsuarioUpdate = {
      nombre_completo: editForm.nombre_completo || undefined,
      rol: editForm.rol,
      ...(editForm.password ? { password: editForm.password } : {}),
    }
    editMut.mutate({ id: editing.id, body })
  }

  const rolBadge: Record<string, string> = {
    Admin: 'bg-purple-500/15 text-purple-300 border border-purple-500/30',
    Gerente: 'bg-brand-primary/15 text-brand-text border border-brand-primary/30',
    Operario: 'bg-brand-surface text-brand-muted border border-brand-border',
  }

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="font-mono text-[10px] text-brand-muted/50 tracking-[0.2em]">ADMINISTRACIÓN</span>
              <div className="w-16 h-px bg-brand-border/40" />
            </div>
            <h1 className="text-2xl font-bold text-brand-text tracking-tight flex items-center gap-2">
              <Shield className="w-6 h-6 text-brand-primary" />
              Usuarios
            </h1>
            <p className="text-sm text-brand-muted mt-1">Gestiona los usuarios de la aplicación</p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:bg-brand-primary/90 transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            Nuevo usuario
          </button>
        </div>

        {/* Tabla */}
        {isPending ? (
          <div className="glass rounded-xl border border-brand-border p-12 text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
              className="inline-block w-6 h-6 border-2 border-brand-muted/30 border-t-brand-primary rounded-full mb-3"
            />
            <p className="text-sm text-brand-muted">Cargando usuarios…</p>
          </div>
        ) : (
          <div className="glass rounded-xl border border-brand-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-border">
                  <th className="px-5 py-3 text-left text-[10px] font-semibold text-brand-muted/60 uppercase tracking-widest">Nombre</th>
                  <th className="px-5 py-3 text-left text-[10px] font-semibold text-brand-muted/60 uppercase tracking-widest">Usuario</th>
                  <th className="px-5 py-3 text-left text-[10px] font-semibold text-brand-muted/60 uppercase tracking-widest">Rol</th>
                  <th className="px-5 py-3 text-right text-[10px] font-semibold text-brand-muted/60 uppercase tracking-widest">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => {
                  const esMiCuenta = u.id === usuarioActual?.id
                  return (
                    <tr key={u.id} className="border-b border-brand-border/50 last:border-0 hover:bg-brand-surface/40 transition-colors">
                      <td className="px-5 py-3.5 text-brand-text font-medium">
                        {u.nombre_completo || <span className="text-brand-muted/50 italic">Sin nombre</span>}
                        {esMiCuenta && (
                          <span className="ml-2 text-[9px] text-brand-primary font-mono">(tú)</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-brand-muted font-mono text-xs">{u.username}</td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${rolBadge[u.rol] ?? rolBadge.Operario}`}>
                          {u.rol}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-2">
                          {!esMiCuenta && deleteId === u.id ? (
                            <>
                              <span className="text-xs text-brand-muted mr-1">¿Eliminar?</span>
                              <button
                                onClick={() => deleteMut.mutate(u.id)}
                                disabled={deleteMut.isPending}
                                aria-label="Confirmar eliminación"
                                className="p-1.5 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors cursor-pointer disabled:opacity-50"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeleteId(null)}
                                aria-label="Cancelar"
                                className="p-1.5 rounded-lg hover:bg-brand-surface transition-colors text-brand-muted cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => openEdit(u)}
                                className="p-1.5 rounded-lg hover:bg-brand-primary/15 text-brand-muted hover:text-brand-primary transition-colors cursor-pointer"
                                aria-label={`Editar a ${u.nombre_completo || u.username}`}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              {!esMiCuenta && (
                                <button
                                  onClick={() => setDeleteId(u.id)}
                                  className="p-1.5 rounded-lg hover:bg-red-500/15 text-brand-muted hover:text-red-400 transition-colors cursor-pointer"
                                  aria-label={`Eliminar a ${u.nombre_completo || u.username}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {usuarios.length === 0 && (
              <p className="px-5 py-8 text-center text-sm text-brand-muted">No hay usuarios registrados.</p>
            )}
          </div>
        )}
      </div>

      {/* Modal crear / editar */}
      <AnimatePresence>
        {modal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && closeModal()}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="glass rounded-xl border border-brand-border p-6 w-full max-w-md"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-bold text-brand-text">
                  {modal === 'create' ? 'Nuevo usuario' : `Editar — ${editing?.username}`}
                </h2>
                <button onClick={closeModal} aria-label="Cerrar modal" className="p-1.5 rounded-lg hover:bg-brand-surface text-brand-muted cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {modal === 'create' ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-brand-muted mb-1.5 uppercase tracking-wide">Usuario</label>
                    <input
                      type="text"
                      value={createForm.username}
                      onChange={(e) => setCreateForm((f) => ({ ...f, username: e.target.value }))}
                      placeholder="ej. juan_garcia"
                      className={inputBase}
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-brand-muted mb-1.5 uppercase tracking-wide">Nombre completo</label>
                    <input
                      type="text"
                      value={createForm.nombre_completo}
                      onChange={(e) => setCreateForm((f) => ({ ...f, nombre_completo: e.target.value }))}
                      placeholder="Juan García"
                      className={inputBase}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-brand-muted mb-1.5 uppercase tracking-wide">Contraseña</label>
                      <input
                        type="password"
                        value={createForm.password}
                        onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                        placeholder="Mínimo 6 caracteres"
                        className={inputBase}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-brand-muted mb-1.5 uppercase tracking-wide">PIN recuperación</label>
                      <input
                        type="text"
                        value={createForm.pin}
                        onChange={(e) => setCreateForm((f) => ({ ...f, pin: e.target.value }))}
                        placeholder="Mínimo 4 dígitos"
                        className={inputBase + ' font-mono'}
                        maxLength={10}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-brand-muted mb-1.5 uppercase tracking-wide">Rol</label>
                    <select
                      value={createForm.rol}
                      onChange={(e) => setCreateForm((f) => ({ ...f, rol: e.target.value as Rol }))}
                      className={inputBase}
                    >
                      {ROLES.map((r) => <option key={r}>{r}</option>)}
                    </select>
                  </div>
                  {createMut.isError && (
                    <p className="text-xs text-red-400">
                      {(createMut.error as any)?.response?.data?.detail ?? 'Error al crear usuario'}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-brand-muted mb-1.5 uppercase tracking-wide">Nombre completo</label>
                    <input
                      type="text"
                      value={editForm.nombre_completo}
                      onChange={(e) => setEditForm((f) => ({ ...f, nombre_completo: e.target.value }))}
                      placeholder="Nombre completo"
                      className={inputBase}
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-brand-muted mb-1.5 uppercase tracking-wide">Rol</label>
                    <select
                      value={editForm.rol}
                      onChange={(e) => setEditForm((f) => ({ ...f, rol: e.target.value as Rol }))}
                      className={inputBase}
                    >
                      {ROLES.map((r) => <option key={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-brand-muted mb-1.5 uppercase tracking-wide">
                      Nueva contraseña <span className="text-brand-muted/50 normal-case font-normal">(dejar vacío para no cambiar)</span>
                    </label>
                    <input
                      type="password"
                      value={editForm.password}
                      onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))}
                      placeholder="Nueva contraseña"
                      className={inputBase}
                    />
                  </div>
                  {editMut.isError && (
                    <p className="text-xs text-red-400">
                      {(editMut.error as any)?.response?.data?.detail ?? 'Error al actualizar usuario'}
                    </p>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 rounded-lg text-sm text-brand-muted hover:text-brand-text hover:bg-brand-surface transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={modal === 'create' ? submitCreate : submitEdit}
                  disabled={createMut.isPending || editMut.isPending}
                  className="px-5 py-2 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:bg-brand-primary/90 disabled:opacity-60 transition-colors cursor-pointer"
                >
                  {(createMut.isPending || editMut.isPending) ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppLayout>
  )
}
