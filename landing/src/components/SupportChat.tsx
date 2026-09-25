import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, CheckCircle2, Copy, MessageCircle, Send, X } from "lucide-react";

/*
 * Chat de atención de Costo360 (primer contacto con los visitantes).
 * La IA redacta con información aprobada; precios y enlaces los pone el
 * servidor. Cuando el visitante quiere comprar o hablar con alguien, se
 * ofrece dejar sus datos CON autorización expresa (Ley 1581 de 2012).
 */

type Enlace = { label: string; href: string };
type ChatMessage = { role: "user" | "assistant"; content: string; links?: Enlace[] };
type Contexto = { necesidad: string; usuarios: number | null; plan_sugerido: string | null };

const WHATSAPP = "https://wa.me/573004143787?text=" + encodeURIComponent("Hola, vengo de la página de Costo360 y quiero saber más.");
const CONSENTIMIENTO_VERSION = "2026-09-25";
const permitido = (href: string) =>
  href.startsWith("#") || href === "/privacidad/" || href.startsWith("https://costo360-web.vercel.app/") || href.startsWith("https://wa.me/573004143787");

const bienvenida: ChatMessage = {
  role: "assistant",
  content:
    "Hola, soy el asistente de Costo360. Te ayudo a descubrir cómo cotizar con tus costos reales, aprovechar mejor cada lámina y ordenar a tu equipo. ¿Cuántas personas usarían el sistema en tu taller?",
};

const nuevaSesion = () =>
  (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/[^a-zA-Z0-9-]/g, "");

function WhatsAppIcono() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="currentColor">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2Zm5.8 14.04c-.24.68-1.42 1.31-1.95 1.36-.5.05-.97.23-3.27-.68-2.77-1.09-4.51-3.93-4.65-4.11-.14-.18-1.11-1.47-1.11-2.81s.7-2 .95-2.27c.25-.27.54-.34.72-.34h.52c.17 0 .39-.06.61.46.24.55.79 1.9.86 2.04.07.14.11.3.02.48-.09.18-.14.3-.27.46-.14.16-.29.36-.41.48-.14.14-.28.29-.12.56.16.27.71 1.17 1.52 1.9 1.05.93 1.93 1.22 2.2 1.36.27.14.43.11.59-.07.16-.18.68-.79.86-1.06.18-.27.36-.23.61-.14.25.09 1.59.75 1.86.89.27.14.45.2.52.32.07.11.07.66-.17 1.33Z" />
    </svg>
  );
}

export function SupportChat() {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const last = useRef<HTMLDivElement>(null);
  const abierto = useRef(0);
  const sesion = useRef(nuevaSesion());
  const [messages, setMessages] = useState<ChatMessage[]>([bienvenida]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [contexto, setContexto] = useState<Contexto>({ necesidad: "", usuarios: null, plan_sugerido: null });
  const [pedirContacto, setPedirContacto] = useState(false);
  const [leadEnviado, setLeadEnviado] = useState(false);
  const [lead, setLead] = useState({ nombre: "", whatsapp: "", correo: "", taller: "", consentimiento: false });
  const [leadError, setLeadError] = useState("");
  const [honeypot, setHoneypot] = useState("");

  const abrir = () => {
    abierto.current ||= Date.now();
    dialog.current?.showModal();
    input.current?.focus();
  };
  useEffect(() => {
    window.addEventListener("costo360:open-chat", abrir);
    return () => window.removeEventListener("costo360:open-chat", abrir);
  }, []);
  useEffect(() => {
    last.current?.scrollIntoView({ block: "nearest" });
  }, [messages, busy, pedirContacto, leadEnviado]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    setBusy(true);
    setError("");
    setDraft("");
    const history = messages.slice(1).slice(-8).map(({ role, content }) => ({ role, content: content.slice(0, 600) }));
    setMessages((old) => [...old, { role: "user", content }]);
    // Un humano no escribe en menos de 1,5 s desde que abre el chat.
    const espera = 1500 - (Date.now() - abierto.current);
    if (espera > 0) await new Promise((r) => setTimeout(r, espera));
    try {
      const response = await fetch("/api/atencion/chat", {
        method: "POST",
        credentials: "omit",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content.slice(0, 600), history, session: sesion.current, website: honeypot }),
        signal: AbortSignal.timeout(30000),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof data.detail === "string" ? data.detail : "El chat no está disponible ahora.");
      const links = (Array.isArray(data.enlaces) ? data.enlaces : []).filter(
        (l: Enlace) => typeof l?.label === "string" && typeof l?.href === "string" && permitido(l.href),
      );
      setMessages((old) => [...old, { role: "assistant", content: String(data.texto || ""), links }]);
      if (data.contexto) setContexto(data.contexto);
      if (data.pedir_contacto && !leadEnviado) setPedirContacto(true);
    } catch (e) {
      setError(e instanceof Error && e.name !== "TimeoutError" ? e.message : "La respuesta tardó demasiado. Inténtalo de nuevo.");
      setDraft(content);
    } finally {
      setBusy(false);
      input.current?.focus();
    }
  }

  async function enviarLead(event: React.FormEvent) {
    event.preventDefault();
    setLeadError("");
    if (!lead.consentimiento) return setLeadError("Para guardar tus datos necesitamos tu autorización.");
    const resumen = messages
      .filter((m) => m.role === "user")
      .map((m) => m.content)
      .join(" · ")
      .slice(0, 500);
    try {
      const r = await fetch("/api/atencion/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...lead, session: sesion.current, contexto, resumen, website: honeypot, consentimiento: true }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(typeof d.detail === "string" ? d.detail : "No pudimos guardar tus datos.");
      setLeadEnviado(true);
      setPedirContacto(false);
    } catch (e) {
      setLeadError(e instanceof Error ? e.message : "No pudimos guardar tus datos.");
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(messages.map((m) => `${m.role === "user" ? "Tú" : "Costo360"}: ${m.content}`).join("\n\n"));
      setCopied(true);
    } catch {
      setError("No se pudo copiar automáticamente.");
    }
  }

  return (
    <>
      <button className="support-launcher" onClick={abrir} aria-haspopup="dialog" aria-controls="support-dialog">
        <MessageCircle size={20} aria-hidden="true" />
        <span>Hablemos de tu taller</span>
      </button>
      <dialog className="support-dialog" id="support-dialog" ref={dialog} aria-labelledby="support-title">
        <header className="support-heading">
          <div>
            <p className="support-kicker">COSTO360 / ATENCIÓN</p>
            <h2 id="support-title">Tu siguiente paso, más claro.</h2>
          </div>
          <button className="support-close" aria-label="Cerrar chat" onClick={() => dialog.current?.close()}>
            <X size={22} />
          </button>
        </header>
        <div className="support-messages" role="log" aria-label="Conversación con atención de Costo360" aria-live="polite" aria-relevant="additions">
          {messages.map((message, i) => (
            <div key={i} className={`support-message support-${message.role}`}>
              <span className="support-speaker">{message.role === "user" ? "Tú" : "Atención Costo360"}</span>
              <p>{message.content}</p>
              {!!message.links?.length && (
                <div className="support-actions">
                  {message.links.map((link) =>
                    link.href.startsWith("https://wa.me/") ? (
                      <a className="support-wa" key={link.href} href={WHATSAPP} target="_blank" rel="noopener noreferrer">
                        <WhatsAppIcono /> Hablar con el fundador
                      </a>
                    ) : (
                      <a
                        className="support-link"
                        key={link.href}
                        href={link.href}
                        {...(link.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : { onClick: () => dialog.current?.close() })}
                      >
                        {link.label} <ArrowUpRight size={15} aria-hidden="true" />
                      </a>
                    ),
                  )}
                </div>
              )}
            </div>
          ))}
          {busy && <p className="support-wait"><i /><i /><i /> Escribiendo…</p>}

          {pedirContacto && !leadEnviado && (
            <form className="support-lead" onSubmit={enviarLead}>
              <p className="support-lead-title">¿Te contactamos? Déjanos tus datos y el fundador te escribe.</p>
              <input aria-label="Tu nombre" placeholder="Tu nombre" required minLength={2} maxLength={80}
                value={lead.nombre} onChange={(e) => setLead({ ...lead, nombre: e.target.value })} />
              <input aria-label="Tu WhatsApp" placeholder="WhatsApp (ej. 300 123 4567)" inputMode="tel" maxLength={20}
                value={lead.whatsapp} onChange={(e) => setLead({ ...lead, whatsapp: e.target.value })} />
              <input aria-label="Tu correo" placeholder="Correo (opcional si dejas WhatsApp)" type="email" maxLength={120}
                value={lead.correo} onChange={(e) => setLead({ ...lead, correo: e.target.value })} />
              <input aria-label="Nombre de tu taller" placeholder="Nombre de tu taller (opcional)" maxLength={80}
                value={lead.taller} onChange={(e) => setLead({ ...lead, taller: e.target.value })} />
              <label className="support-consent">
                <input type="checkbox" checked={lead.consentimiento} onChange={(e) => setLead({ ...lead, consentimiento: e.target.checked })} />
                <span>
                  Autorizo a Costo360 S.A.S. (en constitución) a tratar mis datos para contactarme sobre Costo360, según su{" "}
                  <a href="/privacidad/" target="_blank" rel="noopener">aviso de privacidad</a>. Puedo pedir que los borren cuando quiera.
                </span>
              </label>
              {leadError && <p className="support-error" role="alert">{leadError}</p>}
              <div className="support-lead-actions">
                <button type="submit">Enviar mis datos</button>
                <button type="button" className="support-lead-skip" onClick={() => setPedirContacto(false)}>Ahora no</button>
              </div>
              <small>Versión del aviso: {CONSENTIMIENTO_VERSION}</small>
            </form>
          )}
          {leadEnviado && (
            <p className="support-lead-ok"><CheckCircle2 size={18} aria-hidden="true" /> ¡Listo! Recibimos tus datos; el fundador de Costo360 te escribirá pronto.</p>
          )}
          <div ref={last} />
        </div>

        {messages.length === 1 && (
          <div className="support-suggestions">
            {["Trabajo solo", "Somos 3 en el taller", "¿Cuánto cuesta?", "¿Qué hace Cost?"].map((label) => (
              <button key={label} onClick={() => void send(label)}>{label}</button>
            ))}
          </div>
        )}
        {error && (
          <p className="support-error" role="alert">
            {error}{" "}
            <a href={WHATSAPP} target="_blank" rel="noopener noreferrer">Escríbenos por WhatsApp</a>
          </p>
        )}
        <form className="support-form" onSubmit={(e) => { e.preventDefault(); void send(draft); }}>
          <label className="sr-only" htmlFor="support-message">Tu consulta sobre Costo360</label>
          <input id="support-message" ref={input} value={draft} onChange={(e) => setDraft(e.target.value)}
            placeholder="Cuéntanos qué necesitas…" maxLength={600} required autoComplete="off" />
          {/* Campo trampa para robots: invisible para personas. */}
          <input className="support-hp" tabIndex={-1} autoComplete="off" aria-hidden="true" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} name="website" />
          <button type="submit" disabled={busy || !draft.trim()} aria-label="Enviar consulta"><Send size={19} /></button>
        </form>
        <footer className="support-footer">
          <a className="support-wa support-wa-mini" href={WHATSAPP} target="_blank" rel="noopener noreferrer">
            <WhatsAppIcono /> WhatsApp
          </a>
          <span>
            Respuestas con IA (Google Gemini). No compartas contraseñas ni datos bancarios.{" "}
            <a href="/privacidad/" target="_blank" rel="noopener">Privacidad</a>
          </span>
          <button onClick={() => void copy()}>
            <Copy size={13} aria-hidden="true" />
            {copied ? "Copiada" : "Copiar"}
          </button>
        </footer>
      </dialog>
    </>
  );
}
