import { Alert, Loading, useLoad } from './components'

type Usuario = { nombre: string; voz_mensajes: number; voz_tope: number; voz_pct: number }
type Empresa = {
  nombre: string; plan: string
  cost_gasto_cop: number; cost_tope_cop: number; cost_pct: number
  render_gasto_usd: number; render_tope_usd: number; render_pct: number
  usuarios: Usuario[]
}
type Aviso = { ambito: string; api: string; umbral: number; detalle: string | null; creado_en: string }
type Consumo = { empresas: Empresa[]; alertas: Aviso[] }

const SERVICIO: Record<string, string> = {
  gemini_cost: 'Cost (chat)', elevenlabs_voz: 'Voz', openai_render: 'Renders', elevenlabs_cuenta: 'Cuenta ElevenLabs',
}
const cop = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

/** Barra de uso: verde < 70%, ámbar 70–99%, rojo ≥ 100% (nunca bloquea: es solo aviso). */
function Uso({ pct, texto }: { pct: number; texto: string }) {
  const nivel = pct >= 100 ? 'alto' : pct >= 70 ? 'medio' : 'bajo'
  return <div className="uso"><div className="uso-barra"><i className={'uso-' + nivel} style={{ width: Math.min(pct, 100) + '%' }}/></div><small><strong>{pct.toFixed(0)}%</strong> · {texto}</small></div>
}

export function ConsumoIA({ revision }: { revision: number }) {
  const r = useLoad<Consumo>('/consumo-ia', revision)
  if (r.error) return <Alert>{r.error}</Alert>
  if (!r.data) return <Loading/>
  const { empresas, alertas } = r.data
  return <div className="consumo">
    <p className="muted">Consumo de este mes (hora Colombia). Nadie se bloquea al pasar su cupo: estos números sirven para saber cuándo recargar. Los avisos también te llegan por Telegram y correo.</p>
    {empresas.length === 0 && <p className="muted">Todavía no hay empresas activas.</p>}
    {empresas.map(e => <section key={e.nombre} className="consumo-empresa">
      <header><strong>{e.nombre}</strong><span className="consumo-plan">{e.plan}</span></header>
      <div className="consumo-grid">
        <div><span className="nav-label">COST (CHAT)</span><Uso pct={e.cost_pct} texto={`${cop(e.cost_gasto_cop)} de ${cop(e.cost_tope_cop)}`}/></div>
        <div><span className="nav-label">RENDERS</span><Uso pct={e.render_pct} texto={`USD ${e.render_gasto_usd.toFixed(2)} de USD ${e.render_tope_usd.toFixed(2)}`}/></div>
      </div>
      <span className="nav-label">VOZ POR USUARIO</span>
      {e.usuarios.map(u => <div key={u.nombre} className="consumo-usuario"><span>{u.nombre}</span><Uso pct={u.voz_pct} texto={`${u.voz_mensajes} de ${u.voz_tope} mensajes`}/></div>)}
    </section>)}
    <h2 className="consumo-titulo">Últimos avisos enviados</h2>
    {alertas.length === 0 ? <p className="muted">Ningún aviso este mes.</p> : <ul className="consumo-avisos">
      {alertas.map(a => <li key={a.ambito + a.api + a.umbral + a.creado_en}><strong>{a.umbral}% · {SERVICIO[a.api] || a.api}</strong> — {a.detalle}<small>{new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(a.creado_en))}</small></li>)}
    </ul>}
  </div>
}
