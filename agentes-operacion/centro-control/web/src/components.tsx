import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { AlertCircle, LoaderCircle, X, Search, Plus, Pencil, ArchiveRestore, Archive } from 'lucide-react'
import { api, dateText, label, money, title } from './api'
import type { List, Meta, Row, User } from './api'

export function useLoad<T>(path: string, revision = 0) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setError(''); setData(null)
    api<T>(path, { signal: controller.signal }).then(setData).catch(e => { if (!controller.signal.aborted) setError(e.message) }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [path, revision])
  return { data, error, loading }
}

export function Alert({ children }: { children: ReactNode }) { return <div className="alert" role="alert"><AlertCircle size={18}/><div>{children}</div></div> }
export function Loading() { return <div className="loading" role="status"><LoaderCircle className="spin" size={20}/> Cargando información…</div> }
export function Empty({ text = 'Todavía no hay registros.', children }: { text?: string; children?: ReactNode }) { return <div className="empty"><div className="empty-icon">◎</div><h3>{text}</h3><p>La información que registres aquí estará disponible para ti y para el agente.</p>{children}</div> }
export function Badge({ text }: { text: string | null | undefined }) {
  const tone = ['Cliente', 'Ganada', 'Hecha', 'Resuelto', 'Activa', 'Autorizado', 'Pagada', 'confirmada'].includes(text || '') ? 'green' : ['Perdida', 'Alta', 'No contactar', 'rechazada', 'Cancelada'].includes(text || '') ? 'red' : 'gold'
  return <span className={'badge ' + tone}>{text || 'Sin definir'}</span>
}

export function Modal({ heading, onClose, children, wide = false }: { heading: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => { const dialog = ref.current!; dialog.showModal(); return () => dialog.close() }, [])
  return <dialog ref={ref} className={wide ? 'modal wide' : 'modal'} aria-label={heading} onCancel={e => { e.preventDefault(); onClose() }}>
    <div className="modal-heading"><h2>{heading}</h2><button className="icon-button" aria-label="Cerrar ventana" onClick={onClose}><X size={20}/></button></div>{children}
  </dialog>
}

export function ParentPicker({ kind, value, required, onChange }: { kind: string; value: string; required: boolean; onChange: (value: string) => void }) {
  const [q, setQ] = useState('')
  const list = useLoad<List>(`/records/${kind}?limit=100&q=${encodeURIComponent(q)}`)
  const current = useLoad<Row>(value ? `/records/${kind}/${value}` : '/health')
  const items = list.data?.items || []
  if (current.data?.id && !items.some(x => x.id === current.data?.id)) items.unshift(current.data)
  return <div className="parent-picker"><input aria-label="Buscar empresa o proveedor por nombre" placeholder="Buscar por nombre…" value={q} onChange={e => setQ(e.target.value)} maxLength={160}/>
    <select required={required} value={value} onChange={e => onChange(e.target.value)} aria-label="Seleccionar registro relacionado"><option value="">Selecciona un registro</option>{items.map(row => <option value={row.id} key={row.id}>{title(row)}{row.archived ? ' (archivado)' : ''}</option>)}</select>
    {list.error && <small role="alert">{list.error}</small>}{(list.data?.total || 0) > 100 && <small>Hay más resultados. Escribe el nombre para encontrarlos.</small>}
  </div>
}

export function Editor({ kind, row, parent, meta, onClose, onSaved }: { kind: string; row?: Row; parent?: string; meta: Meta; onClose: () => void; onSaved: () => void }) {
  const definition = meta[kind]
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    for (const [key, schema] of Object.entries(definition.schema.properties)) {
      initial[key] = String(row?.data[key] ?? schema.default ?? '')
      if (!row && schema.format === 'date') initial[key] = new Date().toLocaleDateString('en-CA')
    }
    if (parent && definition.parent) initial[definition.parent[0]] = parent
    return initial
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [dirty, setDirty] = useState(false)
  const close = () => { if (!busy && (!dirty || window.confirm('Tienes cambios sin guardar. ¿Descartarlos?'))) onClose() }
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError('')
    const data: Record<string, string | null> = {}
    for (const [key, schema] of Object.entries(definition.schema.properties)) {
      data[key] = values[key] === '' && schema.anyOf?.some(x => x.type === 'null') ? null : values[key]
    }
    try {
      await api(`/records/${kind}${row ? '/' + row.id : ''}`, { method: row ? 'PATCH' : 'POST', body: JSON.stringify(row ? { data, version: row.version } : data) })
      onSaved(); onClose()
    } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }
  return <Modal heading={row ? 'Editar registro' : 'Nuevo registro'} onClose={close}>
    <p className="modal-intro">{row ? 'Los cambios quedarán registrados en el historial.' : 'Registra solo información que conozcas. Puedes completar el resto después.'}</p>
    <form onSubmit={submit}><div className="form-grid">{Object.entries(definition.schema.properties).map(([key, schema]) => {
      const required = definition.schema.required?.includes(key) || false
      const resolved = schema.anyOf?.find(x => x.type !== 'null') || schema
      const isDate = resolved.format === 'date'
      const isMoney = ['importe', 'importe_mensual', 'valor_mensual'].includes(key)
      const isLong = ['notas', 'descripcion', 'detalle', 'motivo_perdida', 'proximo_paso'].includes(key)
      const change = (value: string) => { setDirty(true); setValues(v => ({ ...v, [key]: value })) }
      return <label key={key} className={isLong || definition.parent?.[0] === key ? 'span-2' : ''}><span>{label(key)}{required && <b className="required"> *</b>}</span>
        {definition.parent?.[0] === key ? <ParentPicker kind={definition.parent[1]} value={values[key]} required={required} onChange={change}/> :
          resolved.enum ? <select required={required} value={values[key]} onChange={e => change(e.target.value)}><option value="">Selecciona…</option>{resolved.enum.map(option => <option key={option}>{option}</option>)}</select> :
          isLong ? <textarea rows={3} required={required} maxLength={schema.maxLength || 3000} value={values[key]} onChange={e => change(e.target.value)}/> :
          <input type={isDate ? 'date' : isMoney ? 'number' : key === 'email' ? 'email' : 'text'} step={isMoney ? '0.01' : undefined} min={isMoney ? '0' : undefined} max={isMoney ? '1000000000' : undefined} maxLength={schema.maxLength || 254} required={required} value={values[key]} onChange={e => change(e.target.value)}/>}
      </label>
    })}</div>{kind === 'suscripciones' && <p className="note">Registrar una suscripción no cobra dinero ni activa una cuenta en el producto.</p>}{kind === 'actividades' && <p className="note">Esto registra un seguimiento; no envía correos ni mensajes.</p>}
      {error && <Alert>{error}</Alert>}<div className="form-actions"><button type="button" className="secondary" onClick={close} disabled={busy}>Cancelar</button><button className="primary" disabled={busy}>{busy ? 'Guardando…' : 'Guardar registro'}</button></div>
    </form>
  </Modal>
}

/** Dato secundario de la fila (valor, fecha o contacto); '' si no hay. */
const detalle = (row: Row) => row.data.valor_mensual !== undefined ? money(row.data.valor_mensual) : row.data.importe !== undefined ? money(row.data.importe) : row.data.importe_mensual !== undefined ? money(row.data.importe_mensual) : row.data.vence ? dateText(row.data.vence) : row.data.telefono || row.data.origen || ''

export function Records({ kind, revision, user, onEdit, onDetail, parent, onArchive }: { kind: string; revision: number; user: User; onEdit: (kind: string, row?: Row, parent?: string) => void; onDetail: (row: Row) => void; parent?: string; onArchive: (row: Row) => void }) {
  const [q, setQ] = useState('')
  const [offset, setOffset] = useState(0)
  const [archived, setArchived] = useState(false)
  const [board, setBoard] = useState(kind === 'oportunidades')
  const result = useLoad<List>(`/records/${kind}?q=${encodeURIComponent(q)}&offset=${offset}&limit=50&archived=${archived}${parent ? '&parent_id=' + parent : ''}`, revision)
  const stages = ['Nuevo', 'Contactado', 'Demostración', 'Propuesta', 'Negociación', 'Ganada', 'Perdida']
  const items = result.data?.items || []
  return <section className="records-panel">
    <div className="toolbar"><div className="search"><Search size={17}/><input aria-label="Buscar registros" placeholder="Buscar por nombre, título o correo…" maxLength={160} value={q} onChange={e => { setQ(e.target.value); setOffset(0) }}/></div>
      <label className="check"><input type="checkbox" checked={archived} onChange={e => { setArchived(e.target.checked); setOffset(0) }}/> Archivados</label>
      {kind === 'oportunidades' && <button className="secondary" onClick={() => setBoard(!board)}>{board ? 'Ver lista' : 'Ver tablero'}</button>}
      {user.role !== 'lectura' && <button className="primary" onClick={() => onEdit(kind, undefined, parent)}><Plus size={17}/> Nuevo registro</button>}
    </div>
    {result.error && <Alert>{result.error}</Alert>}{result.loading ? <Loading/> : !items.length ? <Empty text={q ? 'No encontramos coincidencias.' : archived ? 'No hay registros archivados.' : 'Tu próximo avance empieza aquí.'}/> : board ?
      <div className="pipeline">{stages.map(stage => { const group = items.filter(r => r.data.etapa === stage); return <section className="pipeline-column" key={stage}><div className="column-heading"><span>{stage}</span><span>{group.length}</span></div><div className="column-value">{money(group.reduce((sum, r) => sum + Number(r.data.valor_mensual), 0))}<small> / mes previsto</small></div>
        {group.map(row => <button className="deal-card" key={row.id} onClick={() => onDetail(row)}><span className="deal-plan">{row.data.plan}</span><strong>{title(row)}</strong><span className="deal-value">{money(row.data.valor_mensual)}<small> / mes</small></span><span className="deal-next">{row.data.proximo_paso || 'Define el siguiente paso'}</span><span className="deal-date">{dateText(row.data.fecha_seguimiento)}</span></button>)}{!group.length && <div className="column-empty">Sin oportunidades</div>}
      </section> })}</div> :
      <div className="table-wrap"><table><caption className="sr-only">Registros de {kind}</caption><thead><tr><th>Registro</th><th>Estado / categoría</th><th>Detalle</th><th>Actualizado</th><th><span className="sr-only">Acciones</span></th></tr></thead><tbody>{items.map(row => <tr key={row.id}>
        <td><button className="record-link" onClick={() => onDetail(row)}>{title(row)}</button><small className="subline">{row.data.email || row.data.ciudad || row.data.proximo_paso || row.data.segmento || ''}</small></td>
        <td><Badge text={row.archived ? 'Archivado' : row.data.etapa || row.data.estado || row.data.permiso_contacto || row.data.tipo || row.data.categoria}/></td>
        <td className={detalle(row) ? 'cell-detalle' : 'cell-detalle vacio'}>{detalle(row) || '—'}</td>
        <td className="muted">{dateText(row.updated_at)}</td><td><div className="row-actions">{user.role !== 'lectura' && !row.archived && <button className="icon-button" aria-label={'Editar ' + title(row)} onClick={() => onEdit(kind, row)}><Pencil size={16}/></button>}{user.role === 'fundador' && <button className="icon-button" aria-label={(row.archived ? 'Restaurar ' : 'Archivar ') + title(row)} onClick={() => onArchive(row)}>{row.archived ? <ArchiveRestore size={16}/> : <Archive size={16}/>}</button>}</div></td>
      </tr>)}</tbody></table></div>}
    {result.data && <div className="pagination"><span>{items.length ? offset + 1 : 0}–{offset + items.length} de {result.data.total} registros{board && ' · el tablero muestra esta página'}</span><div><button className="secondary" disabled={!offset} onClick={() => setOffset(Math.max(0, offset-50))}>Anterior</button><button className="secondary" disabled={offset+50 >= result.data.total} onClick={() => setOffset(offset+50)}>Siguiente</button></div></div>}
  </section>
}
