/**
 * Silueta del layout mientras se carga el perfil (`profile-pending`). No hace
 * ninguna llamada ni lee datos — solo pinta el marco para que el primer paint
 * sea inmediato y no se expulse a un usuario logueado a /login (R7).
 */
export default function AppShellSkeleton() {
  return (
    <div className="flex min-h-screen bg-brand-bg">
      <aside
        className="glass-emerald hidden lg:flex w-56 shrink-0 flex-col h-screen sticky top-0"
        aria-hidden="true"
      >
        <div className="px-4 py-3 border-b border-white/15">
          <div className="h-6 w-28 mx-auto rounded bg-white/15" />
        </div>
        <div className="flex-1 p-3 space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-8 rounded-lg bg-white/10" />
          ))}
        </div>
      </aside>

      <main className="flex-1 p-4 sm:p-6 lg:p-8 lg:pt-20" aria-busy="true" aria-live="polite">
        <span className="sr-only">Cargando…</span>
        <div className="h-8 w-52 rounded bg-brand-border/60 mb-6" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-brand-border/40" />
          ))}
        </div>
        <div className="h-64 rounded-xl bg-brand-border/30" />
      </main>
    </div>
  )
}
