// POST /api/atencion/lead — el visitante deja sus datos CON consentimiento
// (Ley 1581 de 2012 y Decreto 1377 de 2013). Sin la casilla marcada no se guarda nada.
import { checkBotId } from "botid/server";
import { guardarLead, hashIp, permitido } from "../_lib/db.js";

export const CONSENTIMIENTO_VERSION = "2026-09-25";
const ORIGENES = new Set(["https://costo360.com", "https://www.costo360.com"]);
const json = (c, s = 200) => new Response(JSON.stringify(c), { status: s, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

const texto = (v, max) => (typeof v === "string" ? v.trim().replace(/[\u0000-\u001f<>]/g, "").slice(0, max) : "");

async function avisar(lead) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return;
  const planes = { starter: "Starter", pro: "Pro", enterprise: "Enterprise" };
  const lineas = [
    "🔥 Nuevo prospecto desde el chat de costo360.com",
    `👤 ${lead.nombre}${lead.taller ? " · " + lead.taller : ""}`,
    lead.whatsapp ? `📱 WhatsApp: ${lead.whatsapp}` : null,
    lead.correo ? `✉️ ${lead.correo}` : null,
    lead.necesidad ? `🎯 Necesidad: ${lead.necesidad}` : null,
    lead.usuarios ? `👥 Personas: ${lead.usuarios}` : null,
    lead.plan_sugerido ? `💼 Plan sugerido: ${planes[lead.plan_sugerido]}` : null,
    "✅ Autorizó el tratamiento de sus datos. Entra al Centro de Control en máximo 10 minutos.",
  ].filter(Boolean);
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text: lineas.join("\n") }),
      signal: AbortSignal.timeout(4000),
    });
  } catch { /* el lead ya quedó guardado; el aviso es best-effort */ }
}

export async function POST(request) {
  const produccion = process.env.VERCEL_ENV === "production";
  if (produccion && !ORIGENES.has(request.headers.get("origin"))) return json({ detail: "Origen no autorizado." }, 403);
  if (produccion) {
    try { if ((await checkBotId()).isBot) return json({ detail: "No pudimos verificar tu navegador." }, 403); } catch {}
  }
  const b = await request.json().catch(() => null);
  if (!b || b.website) return json({ detail: "Datos inválidos." }, 400);
  if (b.consentimiento !== true) return json({ detail: "Necesitamos tu autorización para guardar tus datos." }, 400);

  const nombre = texto(b.nombre, 80);
  const whatsapp = texto(b.whatsapp, 20).replace(/[^\d+]/g, "");
  const correo = texto(b.correo, 120).toLowerCase();
  const sesion = typeof b.session === "string" && /^[a-zA-Z0-9-]{16,64}$/.test(b.session) ? b.session : null;
  if (!sesion || nombre.length < 2) return json({ detail: "Escribe tu nombre." }, 400);
  if (whatsapp && !/^\+?\d{7,15}$/.test(whatsapp)) return json({ detail: "Revisa tu número de WhatsApp." }, 400);
  if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return json({ detail: "Revisa tu correo." }, 400);
  if (!whatsapp && !correo) return json({ detail: "Déjanos un WhatsApp o un correo para contactarte." }, 400);

  const ipHash = hashIp(request.headers.get("x-real-ip") || "local");
  if (!(await permitido(ipHash, "lead-" + sesion))) return json({ detail: "Intenta de nuevo más tarde." }, 429);

  const lead = {
    sesion, nombre, whatsapp: whatsapp || null, correo: correo || null,
    taller: texto(b.taller, 80) || null,
    necesidad: texto(b.contexto?.necesidad, 160) || null,
    plan_sugerido: ["starter", "pro", "enterprise"].includes(b.contexto?.plan_sugerido) ? b.contexto.plan_sugerido : null,
    usuarios: Number.isInteger(b.contexto?.usuarios) ? b.contexto.usuarios : null,
    resumen: texto(b.resumen, 600) || null,
    consentimiento_version: CONSENTIMIENTO_VERSION,
    ip_hash: ipHash,
  };
  const id = await guardarLead(lead);
  if (id) await avisar(lead);
  return json({ ok: true });
}
