import { useEffect, useState } from 'react'
import { ArrowRight, Building2, CheckCheck, Clock3, Headphones, MessageSquare, Send, ShieldCheck, Sparkles, Target, TrendingUp } from 'lucide-react'
import { api, dateText, label, money, title } from './api'
import type { Audit, Message, Proposal, Row, Summary, User } from './api'
import { Alert, Badge, Empty, Loading, Modal, Records, useLoad } from './components'

const ORIGENES: Record<string, string> = { 'agente-autonomo': '🤖 Agente de operaciones', sincronizacion: 'Sincronización con Costo360', 'chat-landing': 'Chat de la página web', agente: 'Asistente (confirmado por ti)', manual: 'Manual' }

export function Dashboard({ revision, onGo, onDetail }: { revision: number; onGo: (page: string) => void; onDetail: (row: Row) => void }) {
  const result = useLoad<Summary>('/summary', revision)
  if (result.error) return <Alert>{result.error}</Alert>
  if (!result.data) return <Loading/>
  const data = result.data
  const metrics = [
    { label: 'Empresas en tu CRM', value: data.empresas, sub: `${data.clientes} registradas como clientes`, icon: Building2, page: 'empresas' },
    { label: 'Oportunidades abiertas', value: data.oportunidades_abiertas, sub: 'Relaciones que puedes convertir', icon: Target, page: 'oportunidades' },
    { label: 'Tareas vencidas', value: data.tareas_vencidas, sub: 'Dales prioridad hoy', icon: Clock3, page: 'tareas' },
    { label: 'Solicitudes abiertas', value: data.tickets_abiertos, sub: 'Acompaña a tus clientes', icon: Headphones, page: 'tickets' },
  ]
  return <>
    <section className="welcome"><div><span className="eyebrow light">TU EMPRESA, CONECTADA</span><h2>Menos pendientes sueltos.<br/>Más relaciones que crecen.</h2><p>Clientes, conversaciones y próximos pasos en un mismo lugar.</p><button className="gold-button" onClick={() => onGo('oportunidades')}>Ver mis oportunidades <ArrowRight size={17}/></button></div><div className="welcome-art" aria-hidden="true"><div className="orbit one"/><div className="orbit two"/><div className="orbit three"/><div className="orbit-core"><Building2 size={42}/></div><span className="orbit-dot d1"/><span className="orbit-dot d2"/><span className="orbit-dot d3"/></div></section>
    <div className="metrics">{metrics.map(m => <button className="metric" key={m.label} onClick={() => onGo(m.page)}><div className="metric-label">{m.label}<m.icon size={19}/></div><strong>{m.value}</strong><span>{m.sub}</span></button>)}</div>
    <div className="dashboard-grid"><section className="panel"><div className="panel-heading"><div><span className="eyebrow">FOCO DEL DÍA</span><h2>Próximas acciones</h2></div><button className="text-button" onClick={() => onGo('tareas')}>Ver todas <ArrowRight size={15}/></button></div>{!data.proximas_tareas.length ? <Empty text="Tu agenda está despejada."/> : data.proximas_tareas.map(row => <button className="task-row" key={row.id} onClick={() => onDetail(row)}><span className="task-square"/><span className="grow"><strong>{title(row)}</strong><small>{row.data.responsable} · {dateText(row.data.vence)}</small></span><Badge text={row.data.prioridad}/></button>)}</section>
    <section className="panel"><div className="panel-heading"><div><span className="eyebrow">RELACIONES EN MOVIMIENTO</span><h2>Seguimiento comercial</h2></div><TrendingUp size={22}/></div>{!data.seguimientos.length ? <Empty text="Cada oportunidad merece un siguiente paso."/> : data.seguimientos.map(row => <button className="follow-row" key={row.id} onClick={() => onDetail(row)}><div className="avatar small">{title(row).slice(0, 1)}</div><span className="grow"><strong>{title(row)}</strong><small>{row.data.proximo_paso || 'Sin próximo paso'} · {dateText(row.data.fecha_seguimiento)}</small></span><ArrowRight size={15}/></button>)}<div className="pipeline-total"><span>Potencial mensual de oportunidades abiertas</span><strong>{money(data.valor_pipeline)}</strong><small>No representa dinero cobrado.</small></div></section></div>
    <button className="agent-invite" onClick={() => onGo('agente')}><span className="agent-symbol"><Sparkles size={25}/></span><span className="grow"><strong>Piensa y trabaja con tu agente</strong><small>Consulta el CRM, prepara seguimientos y revisa cada cambio antes de ejecutarlo.</small></span><ArrowRight size={21}/></button>
  </>
}

export function Detail({ initial, revision, user, onClose, onEdit, onDetail, onArchive }: { initial: Row; revision: number; user: User; onClose: () => void; onEdit: (kind: string, row?: Row, parent?: string) => void; onDetail: (row: Row) => void; onArchive: (row: Row) => void }) {
  const result = useLoad<Row>(`/records/${initial.kind}/${initial.id}`, revision)
  const [tab, setTab] = useState('datos')
  const row = result.data || initial
  const tabs = row.kind === 'empresas' ? ['datos', 'contactos', 'oportunidades', 'actividades', 'tareas', 'tickets', 'suscripciones', 'historial'] : row.kind === 'proveedores' ? ['datos', 'compras', 'historial'] : ['datos', 'historial']
  return <Modal heading={title(row)} onClose={onClose} wide>
    <div className="detail-summary"><div className="avatar">{title(row).slice(0, 1)}</div><div className="grow"><span className="eyebrow">EXPEDIENTE · {row.kind}</span><p>{row.data.ciudad || row.data.plan || 'Información centralizada y trazable'}</p></div><Badge text={row.archived ? 'Archivado' : row.data.estado || row.data.etapa || 'Activo'}/>{user.role !== 'lectura' && !row.archived && <button className="secondary" onClick={() => onEdit(row.kind, row)}>Editar</button>}{user.role === 'fundador' && <button className="secondary" onClick={() => onArchive(row)}>{row.archived ? 'Restaurar' : 'Archivar'}</button>}</div>
    <nav className="tabs" aria-label="Secciones del expediente">{tabs.map(t => <button aria-current={tab === t ? 'page' : undefined} className={tab === t ? 'active' : ''} key={t} onClick={() => setTab(t)}>{label(t)}</button>)}</nav>
    {result.error && <Alert>{result.error}</Alert>}{tab === 'datos' ? <><dl className="data-grid">{Object.entries(row.data).map(([key, value]) => <div key={key} className={key === 'notas' || key === 'descripcion' ? 'span-2' : ''}><dt>{label(key)}</dt><dd>{value || 'Sin registrar'}</dd></div>)}</dl><p className="record-meta">Identificador: {row.id} · Versión {row.version} · Actualizado {dateText(row.updated_at)}</p></> : tab === 'historial' ? <AuditView recordId={row.id} revision={revision}/> : <Records key={tab} kind={tab} parent={row.id} revision={revision} user={user} onEdit={onEdit} onDetail={onDetail} onArchive={onArchive}/>}
  </Modal>
}

export function Proposals({ revision, refresh }: { revision: number; refresh: () => void }) {
  const result = useLoad<Proposal[]>('/proposals', revision)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [time, setTime] = useState(Date.now())
  useEffect(() => { const id = window.setInterval(() => setTime(Date.now()), 10000); return () => clearInterval(id) }, [])
  async function resolve(p: Proposal, accept: boolean) {
    setBusy(p.id); setError('')
    try { await api(`/proposals/${p.id}/${accept ? 'confirm' : 'reject'}`, { method: 'POST' }); refresh() } catch (e) { setError((e as Error).message) } finally { setBusy('') }
  }
  return <><div className="info-banner"><ShieldCheck size={22}/><span><strong>Tú tienes la última palabra.</strong> El agente no puede pulsar estos botones. Las propuestas caducan a los 15 minutos y se rechazan si el registro cambió.</span></div>{(error || result.error) && <Alert>{error || result.error}</Alert>}{result.loading ? <Loading/> : !result.data?.length ? <Empty text="No tienes propuestas por revisar."/> : <div className="proposal-list">{result.data.map(p => {
    const expired = new Date(p.expires).getTime() <= time
    const pending = p.state === 'pendiente' && !expired
    return <article className="panel proposal" key={p.id}><div className="panel-heading"><div><span className="eyebrow">{p.kind} · {p.action}</span><h2>{p.before ? title(p.before) : p.data.nombre || p.data.titulo || p.data.concepto || 'Nueva suscripción'}</h2></div><Badge text={p.state === 'pendiente' && expired ? 'Caducada' : p.state}/></div>
      {p.record_id && <p className="record-meta">Registro exacto: {p.record_id} · Versión consultada: {p.version}</p>}
      {Object.keys(p.data).length ? <div className="table-wrap"><table><caption className="sr-only">Cambios que se aplicarán al confirmar</caption><thead><tr><th>Campo</th>{p.before && <th>Actual consultado</th>}<th>Propuesto</th></tr></thead><tbody>{Object.entries(p.data).map(([key, value]) => <tr key={key}><td>{label(key)}</td>{p.before && <td>{p.before.data[key] || '—'}</td>}<td className="proposed-value">{value || 'Vacío'}</td></tr>)}</tbody></table></div> : <p className="note">{p.action === 'archivar' ? 'Se ocultará de los listados activos. Sus datos se conservarán y podrás restaurarlos. No se archivarán registros relacionados automáticamente.' : 'El registro volverá a aparecer en los listados activos.'}</p>}
      {pending && <div className="form-actions"><span className="muted">Aún no ejecutado</span><button className="secondary" disabled={!!busy} onClick={() => resolve(p, false)}>Rechazar</button><button className="primary" disabled={!!busy} onClick={() => resolve(p, true)}><CheckCheck size={17}/>{busy === p.id ? 'Procesando…' : 'Confirmar ' + p.action}</button></div>}
    </article>
  })}</div>}</>
}

export function AgentScreen({ revision, refresh, onGo }: { revision: number; refresh: () => void; onGo: (page: string) => void }) {
  const status = useLoad<{ configured: boolean; model: string | null; daily_limit: number; calls_today: number }>('/agent/status', revision)
  const history = useLoad<Message[]>('/agent/history', revision)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [draft, setDraft] = useState('')
  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (!message.trim() || busy) return
    setBusy(true); setError(''); setDraft(message)
    try { await api('/agent/chat', { method: 'POST', body: JSON.stringify({ message }) }); setMessage(''); refresh() } catch (e) { setError((e as Error).message) } finally { setBusy(false); setDraft('') }
  }
  return <div className="agent-layout"><section className="panel conversation"><div className="panel-heading"><div className="agent-heading"><span className="agent-symbol"><Sparkles size={24}/></span><div><h2>Tu agente de operación</h2><small>Gemini · herramientas controladas · confirmación humana</small></div></div><button className="secondary" onClick={() => onGo('aprobaciones')}>Ver propuestas</button></div>
    {status.data && !status.data.configured && <div className="info-banner"><ShieldCheck size={19}/><span><strong>Integración pendiente de configuración.</strong> El motor está instalado, pero no se ha configurado una clave y modelo de Gemini para este CRM. No se simulan respuestas.</span></div>}
    {(error || history.error || status.error) && <Alert>{error || history.error || status.error}</Alert>}
    <div className="messages" aria-live="polite">{history.loading ? <Loading/> : !history.data?.length ? <div className="agent-empty"><Sparkles size={36}/><h2>¿En qué avanzamos hoy?</h2><p>Puedo consultar tu CRM y preparar cambios para que tú los revises.</p><div className="suggestions">{['¿Qué seguimientos tengo pendientes?', 'Lista las oportunidades abiertas.', 'Ayúdame a organizar las tareas de hoy.'].map(text => <button className="secondary" key={text} onClick={() => setMessage(text)}>{text}</button>)}</div></div> : history.data.map(m => <article className={'message ' + (m.role === 'user' ? 'from-user' : '')} key={m.id}><span className="eyebrow">{m.role === 'user' ? 'TÚ' : 'AGENTE / SISTEMA'}</span><p>{m.text}</p>{m.evidence.length > 0 && <details><summary>{m.evidence.length} evidencia(s) / acción(es) del sistema</summary>{m.evidence.map((trace, index) => <pre key={index}>{JSON.stringify(trace, null, 2)}</pre>)}</details>}</article>)}{busy && <article className="message from-user"><span className="eyebrow">TÚ</span><p>{draft}</p></article>}{busy && <div className="thinking" role="status"><span/> Consultando y preparando una respuesta…</div>}</div>
    <form className="chat-form" onSubmit={submit}><label className="sr-only" htmlFor="chat-message">Mensaje para el agente</label><textarea id="chat-message" value={message} onChange={e => setMessage(e.target.value)} placeholder="Pregúntame sobre clientes, oportunidades y pendientes…" maxLength={4000} rows={2} disabled={busy}/><button className="primary" disabled={busy || !message.trim() || !status.data?.configured} aria-label="Enviar mensaje al agente"><Send size={19}/></button></form><p className="chat-disclaimer">La IA puede equivocarse. Verifica la evidencia y los cambios propuestos. Nunca compartas contraseñas aquí.</p>
  </section><aside className="agent-policy panel"><ShieldCheck size={28}/><h3>Capacidad con límites</h3><ul><li>Consulta los datos reales del CRM.</li><li>Prepara creaciones y cambios.</li><li>No confirma sus propuestas.</li><li>No borra permanentemente.</li><li>No envía mensajes ni hace pagos.</li><li>No accede al producto de tus clientes.</li></ul><div className="usage"><span>Llamadas de hoy (UTC)</span><strong>{status.data?.calls_today ?? '—'} <small>/ {status.data?.daily_limit ?? '—'}</small></strong><p>El límite es por llamadas, no una garantía de gasto monetario.</p></div></aside></div>
}

export function AuditView({ recordId, revision }: { recordId?: string; revision: number }) {
  const [offset, setOffset] = useState(0)
  const result = useLoad<Audit[]>(`/audit?offset=${offset}${recordId ? '&record_id=' + recordId : ''}`, revision)
  if (result.error) return <Alert>{result.error}</Alert>
  return <section className="panel audit-panel">{result.loading ? <Loading/> : !result.data?.length ? <Empty text="No hay cambios en esta página del historial."/> : result.data.map(item => <details className="audit-item" key={item.id}><summary><MessageSquare size={17}/><span className="grow"><strong>{label(item.action)} · {title(item.after)}</strong><small>{dateText(item.created_at)} · origen: {ORIGENES[item.origin] || item.origin}</small></span><span className="muted">Ver cambios</span></summary><p className="record-meta">Usuario interno: {item.actor_id} · Registro: {item.record_id}</p><div className="audit-diff"><div><h4>Antes</h4><pre>{JSON.stringify(item.before?.data || null, null, 2)}</pre></div><div><h4>Después</h4><pre>{JSON.stringify({ ...item.after.data, archivado: item.after.archived }, null, 2)}</pre></div></div></details>)}<div className="pagination"><span>Página {offset/50 + 1}</span><div><button className="secondary" disabled={!offset} onClick={() => setOffset(offset-50)}>Anterior</button><button className="secondary" disabled={(result.data?.length || 0) < 50} onClick={() => setOffset(offset+50)}>Siguiente</button></div></div></section>
}
