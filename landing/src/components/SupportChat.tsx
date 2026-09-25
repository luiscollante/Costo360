import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Copy, MessageCircle, Send, X } from "lucide-react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  links?: { label: string; href: string }[];
};
const allowedLinks = new Set([
  "#planes",
  "#producto",
  "#simulador",
  "https://costo360-web.vercel.app/login",
]);
const welcome: ChatMessage = {
  role: "assistant",
  content:
    "Hola, soy el asistente de atención de Costo360. Tú conoces la piedra; yo te ayudo a descubrir cómo llevar más claridad a tus costos y orden a tu taller. ¿Qué te gustaría mejorar primero: tus cotizaciones, el control de materiales o la coordinación de tu equipo?",
};

export function SupportChat() {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const last = useRef<HTMLDivElement>(null);
  const request = useRef<AbortController | null>(null);
  const sending = useRef(false);
  const [messages, setMessages] = useState<ChatMessage[]>([welcome]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("Orientación sobre Costo360");
  const [copied, setCopied] = useState(false);
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    const open = () => {
      dialog.current?.showModal();
      input.current?.focus();
    };
    window.addEventListener("costo360:open-chat", open);
    return () => window.removeEventListener("costo360:open-chat", open);
  }, []);
  useEffect(() => {
    last.current?.scrollIntoView({ block: "nearest" });
  }, [messages, busy]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || sending.current) return;
    sending.current = true;
    setBusy(true);
    setError("");
    setDraft("");
    setCopied(false);
    const history = messages
      .slice(-8)
      .map(({ role, content }) => ({ role, content: content.slice(0, 2400) }));
    setMessages((old) => [...old, { role: "user", content }]);
    const controller = new AbortController();
    request.current = controller;
    const timer = window.setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch("/api/atencion/chat", {
        method: "POST",
        credentials: "omit",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content, history }),
        signal: controller.signal,
      });
      if (!response.ok)
        throw new Error(
          response.status === 429
            ? "Hay varias consultas en curso. Espera un minuto y vuelve a intentarlo."
            : response.status === 413
              ? "La consulta es demasiado larga. Resume lo que necesitas para continuar."
              : "El chat no está disponible ahora. Puedes consultar los planes y el recorrido del producto.",
        );
      const data = await response.json();
      if (typeof data.text !== "string" || !["guia", "ia"].includes(data.mode))
        throw new Error("No recibí una respuesta válida. Inténtalo de nuevo.");
      const links = Array.isArray(data.links)
        ? data.links.filter(
            (link: { label?: unknown; href?: unknown }) =>
              typeof link.label === "string" &&
              typeof link.href === "string" &&
              allowedLinks.has(link.href),
          )
        : [];
      setMessages((old) => [
        ...old,
        { role: "assistant", content: data.text, links },
      ]);
      setMode(
        data.mode === "ia"
          ? "IA · respuestas de la guía de Costo360"
          : "Guía automática · sin IA generativa",
      );
    } catch (e) {
      setError(
        e instanceof Error && e.name !== "AbortError"
          ? e.message
          : "La respuesta tardó demasiado. Puedes volver a intentarlo.",
      );
      setDraft(content);
    } finally {
      window.clearTimeout(timer);
      sending.current = false;
      setBusy(false);
      input.current?.focus();
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(
        messages
          .map(
            (m) =>
              `${m.role === "user" ? "Visitante" : "Costo360"}: ${m.content}`,
          )
          .join("\n\n"),
      );
      setCopied(true);
    } catch {
      setError(
        "No se pudo copiar automáticamente. Puedes seleccionar el texto de la conversación.",
      );
    }
  }
  return (
    <>
      <button
        className="support-launcher"
        onClick={() => {
          dialog.current?.showModal();
          input.current?.focus();
        }}
        aria-haspopup="dialog"
        aria-controls="support-dialog"
      >
        <MessageCircle size={20} aria-hidden="true" />
        <span>Hablemos de tu empresa</span>
      </button>
      <dialog
        className="support-dialog"
        id="support-dialog"
        ref={dialog}
        aria-labelledby="support-title"
      >
        <header className="support-heading">
          <div>
            <p className="support-kicker">COSTO360 / ATENCIÓN</p>
            <h2 id="support-title">Tu siguiente paso, más claro.</h2>
          </div>
          <button
            className="support-close"
            aria-label="Cerrar chat"
            onClick={() => dialog.current?.close()}
          >
            <X size={22} />
          </button>
        </header>
        <div className="support-status">{mode}</div>
        <div
          className="support-messages"
          role="log"
          aria-label="Conversación con atención de Costo360"
          aria-live="polite"
          aria-relevant="additions"
        >
          {messages.map((message, i) => (
            <div key={i} className={`support-message support-${message.role}`}>
              <span className="support-speaker">
                {message.role === "user" ? "Tú" : "Atención Costo360"}
              </span>
              <p>{message.content}</p>
              {message.links?.map((link) => (
                <a
                  className="support-link"
                  key={link.href}
                  href={link.href}
                  onClick={() => dialog.current?.close()}
                >
                  {link.label}
                  <ArrowUpRight size={15} aria-hidden="true" />
                </a>
              ))}
            </div>
          ))}
          {busy && (
            <p className="support-wait">Buscando la orientación adecuada…</p>
          )}
          <div ref={last} />
        </div>
        {messages.length === 1 && (
          <div className="support-suggestions">
            {[
              "¿Qué plan me conviene?",
              "Mi primera cotización",
              "¿Qué hace Cost?",
            ].map((label) => (
              <button key={label} onClick={() => void send(label)}>
                {label}
              </button>
            ))}
          </div>
        )}
        {error && (
          <p className="support-error" role="alert">
            {error}{" "}
            <a href="#planes" onClick={() => dialog.current?.close()}>
              Ver planes
            </a>
          </p>
        )}
        <form
          className="support-form"
          onSubmit={(event) => {
            event.preventDefault();
            void send(draft);
          }}
        >
          <label className="sr-only" htmlFor="support-message">
            Tu consulta sobre Costo360
          </label>
          <input
            id="support-message"
            ref={input}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Cuéntanos qué necesitas…"
            maxLength={1500}
            required
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={busy || !draft.trim()}
            aria-label="Enviar consulta"
          >
            <Send size={19} />
          </button>
        </form>
        <footer className="support-footer">
          <span>
            Con IA, Google procesa tu consulta. No compartas datos
            confidenciales.
          </span>
          <button onClick={() => void copy()}>
            <Copy size={13} aria-hidden="true" />
            {copied ? "Copiada" : "Copiar conversación"}
          </button>
        </footer>
      </dialog>
    </>
  );
}
