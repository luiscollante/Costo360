// Motor del chat: Gemini redacta, el servidor valida y completa. Sin estado.
import { GoogleGenAI } from "@google/genai";
import { enlaces, llenarMarcadores, revisar } from "./validar.js";
import { PROMPT, RESPALDO } from "./prompt.js";

const MODELO = "gemini-3.5-flash";
const USD_IN = 1.5 / 1e6;
const USD_OUT = 9 / 1e6;
export const USD_ESTIMADO = 0.004; // reserva conservadora por llamada

const INTENCIONES = new Set(["explorar", "precio", "comprar", "soporte", "humano", "fuera_de_alcance", "abuso"]);
const PLANES = new Set(["starter", "pro", "enterprise"]);

/** El texto del visitante nunca puede cerrar la etiqueta ni inyectar marcadores. */
const limpiarVisitante = (t) => String(t).slice(0, 600).replace(/[{}]/g, "").replace(/<\/?visitante>/gi, "");

function contenidos(mensaje, historial) {
  const turnos = historial.slice(-6).map((m) => ({
    role: m.role === "user" ? "user" : "model",
    // Lo que el navegador dice que respondió el asistente también es dato no confiable.
    parts: [{ text: m.role === "user" ? `<visitante>${limpiarVisitante(m.content)}</visitante>` : `[respuesta previa del asistente] ${limpiarVisitante(m.content).slice(0, 500)}` }],
  }));
  return [...turnos, { role: "user", parts: [{ text: `<visitante>${limpiarVisitante(mensaje)}</visitante>` }] }];
}

function interpretar(raw) {
  let d;
  try { d = JSON.parse(raw); } catch { return { error: "JSON inválido" }; }
  if (typeof d?.respuesta !== "string") return { error: "sin respuesta" };
  return {
    respuesta: d.respuesta.trim(),
    intencion: INTENCIONES.has(d.intencion) ? d.intencion : "explorar",
    enlaces: Array.isArray(d.enlaces) ? d.enlaces.filter((x) => typeof x === "string") : [],
    pedir_contacto: d.pedir_contacto === true,
    necesidad: typeof d.necesidad === "string" ? d.necesidad.slice(0, 160) : "",
    usuarios: Number.isInteger(d.usuarios) && d.usuarios > 0 && d.usuarios < 10000 ? d.usuarios : null,
    plan_sugerido: PLANES.has(d.plan_sugerido) ? d.plan_sugerido : null,
  };
}

/**
 * Responde un turno. `llamar(contents, system)` es inyectable para pruebas.
 * Devuelve { texto, enlaces, intencion, pedir_contacto, ..., usd, respaldo, fallas }.
 */
export async function responder(mensaje, historial, { llamar = llamarGemini, reservar = async () => true } = {}) {
  const visitante = [mensaje, ...historial.filter((m) => m.role === "user").map((m) => m.content)].join(" ");
  let usd = 0;
  let fallas = [];
  let extra = "";
  for (let intento = 0; intento < 2; intento++) {
    if (!(await reservar(USD_ESTIMADO))) {
      return { texto: RESPALDO.limite, enlaces: enlaces(["planes", "whatsapp"]), intencion: "explorar", pedir_contacto: false, usd, respaldo: true, fallas: ["tope diario"] };
    }
    let raw, uso;
    try {
      ({ raw, uso } = await llamar(contenidos(mensaje + extra, historial), PROMPT));
    } catch (e) {
      fallas.push("proveedor: " + (e?.name || "error"));
      break;
    }
    usd += (uso?.promptTokenCount || 0) * USD_IN + ((uso?.candidatesTokenCount || 0) + (uso?.thoughtsTokenCount || 0)) * USD_OUT;
    const d = interpretar(raw);
    if (d.error) { fallas.push(d.error); continue; }
    const problemas = revisar(d.respuesta, visitante);
    const lleno = problemas.length ? null : llenarMarcadores(d.respuesta);
    if (lleno?.texto) {
      return { ...d, texto: lleno.texto, enlaces: enlaces(d.enlaces), usd, respaldo: false, fallas };
    }
    fallas = fallas.concat(problemas.length ? problemas : [lleno.error]);
    // Reintento con el motivo (el visitante nunca ve la versión rechazada).
    extra = `\n\n[NOTA DEL SISTEMA, no del visitante: tu respuesta anterior fue rechazada por: ${fallas.slice(-3).join("; ")}. Corrige: usa solo marcadores para cifras, sin promesas prohibidas, sin voseo, máximo 90 palabras.]`;
  }
  const saludo = historial.length === 0;
  return {
    texto: saludo ? RESPALDO.saludo : RESPALDO.general,
    enlaces: enlaces(["planes", "producto"]),
    intencion: "explorar", pedir_contacto: false, necesidad: "", usuarios: null, plan_sugerido: null,
    usd, respaldo: true, fallas,
  };
}

let _ai = null;
export async function llamarGemini(contents, system) {
  if (!_ai) {
    const apiKey = process.env.ATENCION_GEMINI_API_KEY;
    if (!apiKey) throw Object.assign(new Error("sin clave"), { name: "SinClave" });
    _ai = new GoogleGenAI({ apiKey });
  }
  const r = await _ai.models.generateContent({
    model: MODELO,
    contents,
    config: {
      systemInstruction: system,
      responseMimeType: "application/json",
      temperature: 0.3,
      maxOutputTokens: 700,
      thinkingConfig: { thinkingLevel: "minimal" },
      abortSignal: AbortSignal.timeout(12000),
    },
  });
  return { raw: r.text ?? "", uso: r.usageMetadata };
}
