// POST /api/atencion/chat — chat público de la landing (Vercel Function, Node).
import { checkBotId } from "botid/server";
import { responder } from "../_lib/agente.js";
import { chatEncendido, hashIp, permitido, registrarTurno, reservar, ajustar } from "../_lib/db.js";
import { ENLACES } from "../_lib/catalogo.js";

const ORIGENES = new Set(["https://costo360.com", "https://www.costo360.com"]);
const json = (cuerpo, status = 200) =>
  new Response(JSON.stringify(cuerpo), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
const apagado = () =>
  json({ apagado: true, texto: "El chat está en pausa por unos minutos. Puedes escribirle directamente al fundador de Costo360.", enlaces: [ENLACES.whatsapp, ENLACES.planes] });

function validarEntrada(body) {
  if (!body || typeof body.message !== "string") return null;
  const message = body.message.trim();
  if (!message || message.length > 600) return null;
  const history = Array.isArray(body.history) ? body.history.slice(-8) : [];
  if (!history.every((m) => m && ["user", "assistant"].includes(m.role) && typeof m.content === "string")) return null;
  const session = typeof body.session === "string" && /^[a-zA-Z0-9-]{16,64}$/.test(body.session) ? body.session : null;
  if (!session) return null;
  if (body.website) return null; // honeypot: los humanos no ven este campo
  return { message, history, session };
}

export async function POST(request) {
  const origen = request.headers.get("origin");
  const produccion = process.env.VERCEL_ENV === "production";
  if (produccion && !ORIGENES.has(origen)) return json({ detail: "Origen no autorizado." }, 403);
  if (Number(request.headers.get("content-length") || 0) > 20000) return json({ detail: "Mensaje demasiado largo." }, 413);

  if (produccion) {
    try {
      const bot = await checkBotId();
      if (bot.isBot) return json({ detail: "No pudimos verificar tu navegador." }, 403);
    } catch { /* BotID no disponible: siguen los demás controles */ }
  }

  const entrada = validarEntrada(await request.json().catch(() => null));
  if (!entrada) return json({ detail: "Consulta inválida." }, 400);
  if (process.env.ATENCION_ENABLED === "0" || !(await chatEncendido())) return apagado();

  const ip = request.headers.get("x-real-ip") || "local";
  if (!(await permitido(hashIp(ip), entrada.session))) {
    return json({ detail: "Llegaste al máximo de mensajes por hoy. Puedes escribirle al fundador por WhatsApp." }, 429);
  }

  const inicio = Date.now();
  let reservado = 0;
  const r = await responder(entrada.message, entrada.history, {
    reservar: async (usd) => { reservado += usd; return reservar(usd); },
  });
  await ajustar(reservado, r.usd).catch(() => {});
  await registrarTurno(entrada.session, {
    intencion: r.intencion, valido: !r.respaldo, respaldo: r.respaldo,
    plan_sugerido: r.plan_sugerido ?? null, usd: r.usd, ms: Date.now() - inicio,
  }).catch(() => {});

  return json({
    texto: r.texto,
    enlaces: r.enlaces,
    pedir_contacto: r.pedir_contacto,
    contexto: { necesidad: r.necesidad || "", usuarios: r.usuarios ?? null, plan_sugerido: r.plan_sugerido ?? null },
    modo: r.respaldo ? "guia" : "ia",
  });
}
