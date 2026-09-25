import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Activity, ArrowRight, Building2, CheckSquare2, ChevronRight, ClipboardCheck, CreditCard, Eye, EyeOff, Gauge, Headphones, RefreshCw, History, LayoutDashboard, LogOut, Menu, ShieldCheck, ShoppingCart, Sparkles, Target, Truck, Users, X } from 'lucide-react'
import { api, setCsrf, title } from './api'
import type { Meta, Row, User } from './api'
import { Alert, Editor, Loading, Modal, Records, useLoad } from './components'
import { AgentScreen, AuditView, Dashboard, Detail, Proposals } from './screens'
import { ConsumoIA } from './consumo'
import './style.css'

type Health = { demo: boolean; online?: boolean; gemini_configured: boolean }
const sections = [
  { group: 'DIRECCIÓN', items: [{ id: 'inicio', label: 'Vista general', icon: LayoutDashboard }] },
  { group: 'RELACIONES Y CRECIMIENTO', items: [{ id: 'empresas', label: 'Empresas', icon: Building2 }, { id: 'contactos', label: 'Contactos', icon: Users }, { id: 'oportunidades', label: 'Oportunidades', icon: Target }, { id: 'actividades', label: 'Actividades', icon: Activity }] },
  { group: 'OPERACIÓN', items: [{ id: 'tareas', label: 'Tareas y seguimiento', icon: CheckSquare2 }, { id: 'tickets', label: 'Atención al cliente', icon: Headphones }, { id: 'suscripciones', label: 'Suscripciones', icon: CreditCard }, { id: 'proveedores', label: 'Proveedores', icon: Truck }, { id: 'compras', label: 'Compras', icon: ShoppingCart }] },
  { group: 'CONTROL Y CONFIANZA', items: [{ id: 'consumo', label: 'Consumo de IA', icon: Gauge }, { id: 'aprobaciones', label: 'Aprobaciones', icon: ClipboardCheck }, { id: 'auditoria', label: 'Historial de cambios', icon: History }] },
]
const descriptions: Record<string, string> = {
  inicio: 'Lo importante de tu operación, sin perder de vista a tus clientes.', empresas: 'De la primera conversación a una relación de largo plazo.', contactos: 'Conoce a las personas que están detrás de cada empresa.', oportunidades: 'Cada oportunidad, con una etapa clara y un próximo paso.', actividades: 'La memoria de cada llamada, reunión y conversación.', tareas: 'Que ningún compromiso se quede sin seguimiento.', tickets: 'Acompaña a tus clientes y resuelve lo que necesitan.', suscripciones: 'Registro administrativo de planes y renovaciones. No ejecuta cobros.', proveedores: 'Tus aliados y servicios, organizados en un solo lugar.', compras: 'Registra necesidades y gastos. Ninguna acción transfiere dinero.', aprobaciones: 'Revisa exactamente qué cambiará antes de autorizarlo.', auditoria: 'Quién cambió qué y cuándo, tanto de forma manual como con IA.', consumo: 'Cuánto usa cada empresa de Cost, la voz y los renders este mes, para recargar a tiempo.', agente: 'Pregunta, consulta y prepara acciones sin perder el control.',
}

function Login({ onLogin, health }: { onLogin: (user: User) => void; health: Health | null }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  // En línea, después de la contraseña se pide el código de 6 dígitos de
  // Microsoft Authenticator (o un código de recuperación).
  const [pideCodigo, setPideCodigo] = useState(false)
  const [codigo, setCodigo] = useState('')
  const [recordar, setRecordar] = useState(true)
  const [verClave, setVerClave] = useState(false)
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError('')
    try {
      const result = await api<{ user?: User; csrf?: string; mfa_required?: boolean }>('/login', { method: 'POST', body: JSON.stringify({ email, password }) })
      if (result.mfa_required) { setPassword(''); setPideCodigo(true); return }
      setCsrf(result.csrf!); onLogin(result.user!)
    } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }
  async function submitCodigo(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError('')
    try { const result = await api<{ user: User; csrf: string }>('/login/codigo', { method: 'POST', body: JSON.stringify({ codigo: codigo.trim(), recordar }) }); setCsrf(result.csrf); onLogin(result.user) }
    catch (e) { setError((e as Error).message); setCodigo('') } finally { setBusy(false) }
  }
  if (pideCodigo) return <div className="login-page"><section className="login-story"><img src="/logo.png" alt="Costo360"/><span className="eyebrow light">VERIFICACIÓN EN DOS PASOS</span><h1>Un paso más.</h1><p>Abre Microsoft Authenticator y escribe el código de 6 dígitos de Costo360.</p></section><section className="login-form"><div><span className="eyebrow">COSTO360 S.A.S.</span><h2>Código de verificación</h2><p className="muted">El código cambia cada 30 segundos. Si perdiste el celular, usa uno de tus códigos de recuperación.</p><form onSubmit={submitCodigo}><label>Código<input inputMode="numeric" autoComplete="one-time-code" autoFocus required minLength={6} maxLength={20} value={codigo} onChange={e => setCodigo(e.target.value)}/></label><label className="check-row"><input type="checkbox" checked={recordar} onChange={e => setRecordar(e.target.checked)}/><span>Recordar este dispositivo por 30 días (no volverá a pedir el código aquí)</span></label>{error && <Alert>{error}</Alert>}<button className="primary" disabled={busy}>{busy ? 'Verificando…' : 'Verificar y entrar'}<ArrowRight size={18}/></button></form><button className="secondary" onClick={() => { setPideCodigo(false); setCodigo(''); setError('') }}>Volver</button></div></section></div>
  return <div className="login-page"><section className="login-story"><img src="/logo.png" alt="Costo360"/><span className="eyebrow light">CENTRO DE CONTROL · USO INTERNO</span><h1>Tu empresa.<br/>Una sola visión.</h1><p>Construye relaciones, coordina tu operación y trabaja con IA. Siempre con el control en tus manos.</p><div className="login-points"><span><Building2 size={20}/> CRM propio</span><span><Sparkles size={20}/> IA con herramientas</span><span><ShieldCheck size={20}/> Control humano</span></div></section><section className="login-form"><div><span className="eyebrow">COSTO360 S.A.S.</span><h2>Bienvenido a tu centro de control</h2><p className="muted">Acceso privado para el fundador y su equipo.</p>{health?.demo && <div className="demo-login"><strong>Demostración local · datos ficticios</strong><p>demo@costo360.local<br/>Contraseña: Demo-local-360!</p><button className="secondary" onClick={() => { setEmail('demo@costo360.local'); setPassword('Demo-local-360!') }}>Usar cuenta de demostración</button></div>}<form onSubmit={submit}><label>Correo electrónico<input type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)}/></label><label>Contraseña<span className="password-field"><input type={verClave ? 'text' : 'password'} autoComplete="current-password" required maxLength={256} value={password} onChange={e => setPassword(e.target.value)}/><button type="button" className="password-eye" aria-label={verClave ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={verClave} onClick={() => setVerClave(v => !v)}>{verClave ? <EyeOff size={18}/> : <Eye size={18}/>}</button></span></label>{error && <Alert>{error}</Alert>}<button className="primary" disabled={busy}>{busy ? 'Ingresando…' : 'Entrar a mi empresa'}<ArrowRight size={18}/></button></form><p className="login-footnote">{health?.online ? 'Acceso protegido con verificación en dos pasos. Cada inicio de sesión se notifica por Telegram.' : 'Piloto local. Para datos reales crea tu cuenta desde la consola; no uses la cuenta demo.'}</p></div></section></div>
}

function Workspace({ user, health, logout, logoutAll }: { user: User; health: Health | null; logout: () => void; logoutAll: () => void }) {
  const [page, setPage] = useState('inicio')
  const [revision, setRevision] = useState(0)
  const [sidebar, setSidebar] = useState(false)
  const [editor, setEditor] = useState<{ kind: string; row?: Row; parent?: string } | null>(null)
  const [detail, setDetail] = useState<Row | null>(null)
  const [archive, setArchive] = useState<Row | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState('')
  const meta = useLoad<Meta>('/catalogue')
  const refresh = () => setRevision(x => x + 1)
  const go = (value: string) => { setPage(value); setSidebar(false); setDetail(null); setError('') }
  const edit = (kind: string, row?: Row, parent?: string) => setEditor({ kind, row, parent })
  const name = page === 'agente' ? 'Agente de operación' : sections.flatMap(s => s.items).find(x => x.id === page)?.label || 'Centro de control'
  useEffect(() => { document.title = name + ' · Costo360' }, [name])
  useEffect(() => { if (!toast) return; const id = window.setTimeout(() => setToast(''), 5000); return () => clearTimeout(id) }, [toast])
  async function sincronizar() {
    setBusy(true); setError('')
    try {
      const r = await api<{ talleres: number; creados: number; actualizados: number; contactos: number; errores: string[] }>('/sync/clientes', { method: 'POST' })
      setToast(`Clientes de Costo360 al día: ${r.talleres} talleres (${r.creados} nuevos, ${r.actualizados} actualizados, ${r.contactos} contactos).` + (r.errores.length ? ` Con ${r.errores.length} aviso(s).` : ''))
      if (r.errores.length) setError(r.errores.join(' · '))
      refresh()
    } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }
  async function requestArchive() {
    if (!archive) return
    setBusy(true); setError('')
    try {
      await api('/proposals', { method: 'POST', body: JSON.stringify({ kind: archive.kind, action: archive.archived ? 'restaurar' : 'archivar', record_id: archive.id, version: archive.version }) })
      setArchive(null); go('aprobaciones'); refresh()
    } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }
  return <div className="app-shell"><a href="#main" className="skip-link">Ir al contenido</a>{sidebar && <button className="nav-backdrop" aria-label="Cerrar navegación" onClick={() => setSidebar(false)}/>}
    <aside className={'sidebar ' + (sidebar ? 'open' : '')}><div className="brand"><img src="/logo.png" alt="Costo360"/><span>CENTRO DE CONTROL</span><button className="mobile-close icon-button" aria-label="Cerrar menú" onClick={() => setSidebar(false)}><X size={19}/></button></div><div className="workspace-label"><span className="workspace-icon">C</span><span><strong>Costo360 S.A.S.</strong><small>Espacio de trabajo interno</small></span></div>
      <nav aria-label="Navegación principal">{sections.map((section, index) => <div key={section.group} className="nav-group"><span className="nav-label">{section.group}</span>{section.items.map(item => <button key={item.id} aria-current={page === item.id ? 'page' : undefined} className={'nav-item ' + (page === item.id ? 'active' : '')} onClick={() => go(item.id)}><item.icon size={18}/><span>{item.label}</span>{page === item.id && <ChevronRight size={14}/>}</button>)}{index === 0 && <button className={'agent-nav ' + (page === 'agente' ? 'active' : '')} onClick={() => go('agente')} aria-current={page === 'agente' ? 'page' : undefined}><Sparkles size={19}/><span>Agente de operación</span><small>IA</small></button>}</div>)}</nav>
      <div className="user-card"><span className="avatar small">{user.name.slice(0, 1)}</span><div className="grow"><strong>{user.name}</strong><small>{user.role === 'fundador' ? 'CEO / Fundador' : user.role}</small></div><button className="icon-button" aria-label="Cerrar sesión" onClick={logout}><LogOut size={17}/></button></div>
      {health?.online && <button className="secondary logout-all" onClick={logoutAll}>Cerrar sesión en todos los dispositivos</button>}
    </aside><main id="main" className="main-content"><header className="topbar"><button className="mobile-menu icon-button" aria-label="Abrir navegación" onClick={() => setSidebar(true)}><Menu size={22}/></button><span>Costo360 S.A.S. <ChevronRight size={14}/> <strong>{name}</strong></span><div className="topbar-right"><span className="local-pill"><i/> {health?.online ? 'En línea · protegido' : health?.demo ? 'Demostración local' : 'Espacio privado local'}</span><span className="avatar tiny">{user.name.slice(0, 1)}</span></div></header>
      {health?.demo && <div className="demo-strip">Datos ficticios para explorar el sistema. No hay clientes reales ni servicios externos conectados.</div>}
      <div className="page-content"><div className="page-heading"><div><span className="eyebrow">{page === 'inicio' ? 'TU CENTRO DE OPERACIONES' : 'CENTRO DE CONTROL'}</span><h1>{name}</h1><p>{descriptions[page]}</p></div>{page === 'empresas' && user.role === 'fundador' && <button className="secondary ask-agent" disabled={busy} onClick={sincronizar}><RefreshCw size={17}/> {busy ? 'Sincronizando…' : 'Sincronizar con Costo360'}</button>}{page !== 'agente' && <button className="secondary ask-agent" onClick={() => go('agente')}><Sparkles size={17}/> Consultar al agente</button>}</div>
      {(error || meta.error) && <Alert>{error || meta.error}</Alert>}
      {page === 'inicio' ? <Dashboard revision={revision} onGo={go} onDetail={setDetail}/> : page === 'agente' ? <AgentScreen revision={revision} refresh={refresh} onGo={go}/> : page === 'aprobaciones' ? <Proposals revision={revision} refresh={refresh}/> : page === 'auditoria' ? <AuditView revision={revision}/> : page === 'consumo' ? <ConsumoIA revision={revision}/> : meta.loading ? <Loading/> : <Records key={page} kind={page} revision={revision} user={user} onEdit={edit} onDetail={setDetail} onArchive={setArchive}/>}
      <footer className="page-footer"><ShieldCheck size={14}/> Sistema propio · datos locales · cambios trazables <span>Costo360 S.A.S.</span></footer></div>
    </main>{toast && <div className="toast" role="status"><CheckSquare2 size={19}/>{toast}</div>}
    {detail && <Detail key={detail.id} initial={detail} revision={revision} user={user} onClose={() => setDetail(null)} onEdit={edit} onDetail={setDetail} onArchive={setArchive}/>}
    {editor && meta.data && <Editor kind={editor.kind} row={editor.row} parent={editor.parent} meta={meta.data} onClose={() => setEditor(null)} onSaved={() => { refresh(); setToast('Registro guardado. El historial ya está actualizado.') }}/>} 
    {archive && <Modal heading={archive.archived ? 'Preparar restauración' : 'Preparar archivo'} onClose={() => { if (!busy) setArchive(null) }}><p className="modal-intro">{title(archive)}</p><p>Prepararemos una propuesta con el identificador y la versión exactos. Deberás confirmarla en la bandeja de aprobaciones. No se borrará información permanentemente.</p>{error && <Alert>{error}</Alert>}<div className="form-actions"><button className="secondary" disabled={busy} onClick={() => setArchive(null)}>Cancelar</button><button className="primary" disabled={busy} onClick={requestArchive}>{busy ? 'Preparando…' : 'Revisar propuesta'}</button></div></Modal>}
  </div>
}

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [starting, setStarting] = useState(true)
  const [error, setError] = useState('')
  const health = useLoad<Health>('/health')
  useEffect(() => {
    const controller = new AbortController()
    api<{ user: User; csrf: string }>('/me', { signal: controller.signal }).then(result => { setCsrf(result.csrf); setUser(result.user) }).catch(() => {}).finally(() => { if (!controller.signal.aborted) setStarting(false) })
    const expired = () => { setUser(null); setCsrf('') }
    window.addEventListener('crm-session-expired', expired)
    return () => { controller.abort(); window.removeEventListener('crm-session-expired', expired) }
  }, [])
  async function logout() { try { await api('/logout', { method: 'POST' }); setUser(null); setCsrf('') } catch (e) { setError((e as Error).message) } }
  async function logoutAll() { try { await api('/logout/todas', { method: 'POST' }); setUser(null); setCsrf('') } catch (e) { setError((e as Error).message) } }
  if (starting) return <Loading/>
  if (health.error) return <div className="connection-error"><Alert>No se puede conectar al servidor del CRM. {health.error}</Alert><button className="primary" onClick={() => location.reload()}>Reintentar</button></div>
  return <>{error && <Alert>{error}</Alert>}{user ? <Workspace user={user} health={health.data} logout={logout} logoutAll={logoutAll}/> : <Login onLogin={setUser} health={health.data}/>}</>
}

createRoot(document.getElementById('root')!).render(<StrictMode><App/></StrictMode>)
