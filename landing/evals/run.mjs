// Corre el golden set contra el motor REAL (Gemini) y califica:
//  1) chequeos deterministas (obligatorios, 100%)
//  2) juez Gemini 3.1 Pro (temperatura 0) con rúbrica de venta 1-5
// Uso: node evals/run.mjs [corridas=2] [--sin-juez]
// Genera evals/reporte.json y evals/reporte.html (para la revisión del fundador).
import { writeFileSync } from "node:fs";
import { responder } from "../api/_lib/agente.js";
import { revisar } from "../api/_lib/validar.js";
import { CASOS } from "./golden.mjs";

const CORRIDAS = Number(process.argv[2] || 2);
const CON_JUEZ = !process.argv.includes("--sin-juez");
const VOSEO = /\b(vos|tenés|querés|podés|sabés|contame|decime|sos)\b/i;

async function juez(caso, conversacion) {
  const rubrica = `Eres un evaluador exigente de chats de venta B2B para Costo360 (software para marmolerías en Colombia; planes Starter $150.000 COP 1 usuario, Pro $375.000 COP 3 usuarios, Enterprise $875.000 COP hasta 10; sin prueba gratis; sin descuentos; no hace contabilidad ni facturación DIAN).
Califica la ÚLTIMA respuesta del asistente de 1 a 5 en: entendimiento (captó la necesidad), honestidad (no inventa ni exagera, recomienda el plan justo), objeciones (maneja la duda con argumentos reales; si no aplica pon 5), cta (un siguiente paso claro y útil), tono (español neutro de Colombia, tuteo, cálido, profesional, sin voseo; en inglés si el visitante escribió en inglés), brevedad.
Responde SOLO JSON: {"entendimiento":n,"honestidad":n,"objeciones":n,"cta":n,"tono":n,"brevedad":n,"comentario":"una frase"}`;
  // Juez: Gemini 3.1 Pro (modelo distinto y más potente que el del chat, temperatura 0).
  // OpenAI quedó sin saldo el 2026-09-25; cuando se recargue se puede volver a gpt-4.1.
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent?key=${process.env.ATENCION_GEMINI_API_KEY}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: rubrica }] },
      contents: [{ role: "user", parts: [{ text: `Caso: ${caso.id} (${caso.cat})

${conversacion}` }] }],
      generationConfig: { temperature: 0, responseMimeType: "application/json" },
    }),
  });
  const d = await r.json();
  return JSON.parse(d.candidates[0].content.parts.map((p) => p.text || "").join(""));
}

function chequear(caso, r, visitante) {
  const e = caso.esperado;
  const fallas = [];
  if (r.respaldo && !caso.respaldo_ok) fallas.push("usó respuesta de respaldo: " + r.fallas.join(" | "));
  if (/[{}]/.test(r.texto)) fallas.push("marcador crudo visible");
  if (VOSEO.test(r.texto)) fallas.push("voseo");
  if (e.plan && r.plan_sugerido !== e.plan) fallas.push(`plan ${r.plan_sugerido} ≠ ${e.plan}`);
  if (e.precio && !r.texto.includes(e.precio)) fallas.push(`falta precio ${e.precio}`);
  if (e.pedir !== undefined && r.pedir_contacto !== e.pedir) fallas.push(`pedir_contacto ${r.pedir_contacto} ≠ ${e.pedir}`);
  if (e.enlace && !r.enlaces.some((l) => l.href.includes(e.enlace === "planes" ? "#planes" : e.enlace === "login" ? "/login" : e.enlace === "whatsapp" ? "wa.me" : e.enlace === "comprar_pro" ? "plan=pro" : e.enlace))) fallas.push(`falta enlace ${e.enlace}`);
  for (const p of e.no || []) if (p.test(r.texto)) fallas.push(`contenido prohibido ${p}`);
  if (!r.respaldo) {
    const extra = revisar(r.texto.replace(/\$[\d.]+ COP|\d+ usuarios?|\d+ d[ií]as?|\d+ mensajes de voz al mes por usuario/g, ""), visitante);
    if (extra.length) fallas.push("revisor: " + extra.join(" | "));
  }
  return fallas;
}

const resultados = [];
let usdTotal = 0;
for (let corrida = 1; corrida <= CORRIDAS; corrida++) {
  for (const caso of CASOS) {
    const historial = [];
    let r;
    const t0 = Date.now();
    for (const turno of caso.turnos) {
      r = await responder(turno, historial);
      usdTotal += r.usd;
      historial.push({ role: "user", content: turno }, { role: "assistant", content: r.texto });
    }
    const ms = Date.now() - t0;
    const visitante = caso.turnos.join(" ");
    const fallas = chequear(caso, r, visitante);
    const conversacion = historial.map((m) => `${m.role === "user" ? "VISITANTE" : "ASISTENTE"}: ${m.content}`).join("\n");
    let nota = null;
    if (CON_JUEZ) {
      try { nota = await juez(caso, conversacion); } catch (e) { nota = { error: String(e) }; }
    }
    const promedio = nota && !nota.error
      ? ["entendimiento", "honestidad", "objeciones", "cta", "tono", "brevedad"].reduce((s, k) => s + nota[k], 0) / 6 : null;
    resultados.push({ corrida, id: caso.id, cat: caso.cat, fallas, nota, promedio, ms, respaldo: r.respaldo, conversacion, texto: r.texto });
    console.log(`${fallas.length ? "✗" : "✓"} [${corrida}] ${caso.id.padEnd(22)} ${promedio ? promedio.toFixed(2) : "  - "}  ${fallas.join(" ; ")}`);
  }
}

const n = resultados.length;
const duros = resultados.filter((x) => x.fallas.length === 0).length;
const notas = resultados.filter((x) => x.promedio !== null);
const promedio = notas.reduce((s, x) => s + x.promedio, 0) / (notas.length || 1);
const sobre4 = notas.filter((x) => x.promedio >= 4).length / (notas.length || 1);
const lat = resultados.map((x) => x.ms).sort((a, b) => a - b);
const resumen = {
  casos: n, chequeos_ok: `${duros}/${n}`, pct_chequeos: +(100 * duros / n).toFixed(1),
  juez_promedio: +promedio.toFixed(2), juez_pct_4_o_mas: +(100 * sobre4).toFixed(1),
  usd_total: +usdTotal.toFixed(4), usd_por_conversacion: +(usdTotal / n).toFixed(5),
  p95_ms: lat[Math.floor(lat.length * 0.95)] ?? 0,
};
console.log("\nRESUMEN", resumen);
writeFileSync(new URL("./reporte.json", import.meta.url), JSON.stringify({ resumen, resultados }, null, 1));

const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
const filas = resultados.filter((x) => x.corrida === 1).map((x) => `
  <section class="${x.fallas.length ? "mal" : "bien"}"><h3>${esc(x.id)} <small>${esc(x.cat)} · juez ${x.promedio?.toFixed(1) ?? "-"}</small></h3>
  <pre>${esc(x.conversacion)}</pre>${x.fallas.length ? `<p class="f">Fallas: ${esc(x.fallas.join(" ; "))}</p>` : ""}
  ${x.nota?.comentario ? `<p class="c">Juez: ${esc(x.nota.comentario)}</p>` : ""}
  <p class="rev">Tu revisión: ☐ Bien ☐ Mal · Nota: __________________</p></section>`).join("");
writeFileSync(new URL("./reporte.html", import.meta.url), `<!doctype html><meta charset="utf-8"><title>Chat Costo360 · pruebas</title>
<style>body{font-family:system-ui;background:#f5e8d2;max-width:900px;margin:auto;padding:20px;color:#1a1a1a}section{background:#fff;border-radius:12px;padding:14px 18px;margin:12px 0;border-left:6px solid #15612e}.mal{border-left-color:#b3261e}pre{white-space:pre-wrap;font-family:inherit;line-height:1.5}.f{color:#b3261e}.c{color:#6e5410}.rev{color:#555;border-top:1px dashed #ccc;padding-top:8px}</style>
<h1>Chat de atención · resultados de prueba</h1><pre>${esc(JSON.stringify(resumen, null, 1))}</pre>${filas}`);
