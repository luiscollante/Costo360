// Validación de cada respuesta de la IA ANTES de mostrarla (plan auditado V2).
import { COMPETIDORES, ENLACES, PRUEBA_PRO_ACTIVA, PROHIBIDO, VOSEO, valorMarcador } from "./catalogo.js";

const MARCADOR = /\{([a-z_]+):([a-z_]+)\}/g;
const LLAVES_SUELTAS = /[{}]/;

/** Reemplaza marcadores. Devuelve null si hay alguno desconocido o mal formado. */
export function llenarMarcadores(texto) {
  let error = null;
  const lleno = texto.replace(MARCADOR, (_, tipo, clave) => {
    const v = valorMarcador(tipo, clave);
    if (v === null) error = `marcador desconocido {${tipo}:${clave}}`;
    return v ?? "";
  });
  if (error) return { error };
  if (LLAVES_SUELTAS.test(lleno)) return { error: "marcador mal formado" };
  return { texto: lleno };
}

const normal = (s) => s.toLowerCase();
const oraciones = (t) => t.split(/(?<=[.!?¿¡\n])\s+/);

/**
 * Revisa el texto YA escrito por la IA (antes de llenar marcadores).
 * `visitante` = texto del visitante (sus propios números están permitidos).
 */
export function revisar(texto, visitante = "") {
  const fallas = [];
  if (!texto || !texto.trim()) fallas.push("vacía");
  const palabras = texto.trim().split(/\s+/).length;
  if (palabras > 110) fallas.push(`demasiado larga (${palabras} palabras)`);

  // 1) Precios, porcentajes y cantidades con unidad SOLO vía marcador.
  const sinMarcadores = texto.replace(MARCADOR, "").replace(/costo\s*360/gi, "Costo");
  const numerosVisitante = new Set((visitante.replace(/costo\s*360/gi, "").match(/\d[\d.,]*/g) || []).map((n) => n.replace(/[.,]/g, "")));
  for (const m of sinMarcadores.matchAll(/(\$|cop\b|us\$|usd)?\s*(\d[\d.,]*)\s*(%|cop\b|pesos|d[oó]lares|usuarios?|mensajes|d[ií]as|meses|m²|m2)?/gi)) {
    const [, antes, numero, despues] = m;
    const limpio = numero.replace(/[.,]/g, "");
    if (numerosVisitante.has(limpio)) continue;
    const conUnidad = Boolean(antes || despues);
    const valor = Number(limpio);
    if (conUnidad && !(despues && /d[ií]as/i.test(despues) && valor === 7 && PRUEBA_PRO_ACTIVA)) {
      fallas.push(`cifra sin marcador: "${m[0].trim()}"`);
    } else if (!conUnidad && (valor > 10 || limpio.length > 2)) {
      fallas.push(`número no permitido: "${numero}"`);
    }
  }

  // 2) Enlaces: la IA no escribe URLs; los enlaces los agrega el servidor.
  if (/https?:\/\/|www\.|\.com\b/i.test(sinMarcadores.replace(/costo360\.com/gi, ""))) fallas.push("enlace escrito a mano");

  // 3) Promesas prohibidas.
  for (const patron of PROHIBIDO) {
    const hit = texto.match(patron);
    if (!hit) continue;
    const oracion = oraciones(texto).find((o) => patron.test(o)) || "";
    const niega = /\b(no|ni|nunca|sin)\b/i.test(oracion);
    const esPrueba = PRUEBA_PRO_ACTIVA && /7 d[ií]as/i.test(oracion) && /pro/i.test(oracion);
    if (/gratis|gratuit/i.test(hit[0]) && (esPrueba || niega)) continue;
    if (/factura|descuento|reembols|cup[oó]n|24|garantiz/i.test(hit[0]) && niega) continue;
    if (/integraci|app |sin conexi|offline/i.test(hit[0]) && niega) continue;
    fallas.push(`promesa prohibida: "${hit[0]}"`);
  }

  // 4) Voseo (lista cerrada, palabra completa, con tildes).
  const t = normal(texto);
  for (const forma of VOSEO) {
    if (new RegExp(`(^|[^a-záéíóúñ])${forma}([^a-záéíóúñ]|$)`, "i").test(t)) fallas.push(`voseo: "${forma}"`);
  }

  // 5) Competidores por nombre (decisión del fundador): nunca, ni repitiendo al visitante.
  const comp = texto.match(COMPETIDORES);
  if (comp) fallas.push(`nombra a un competidor: "${comp[0]}"`);
  return fallas;
}

/** Enlaces pedidos por la IA → solo los autorizados, máximo 2. */
export function enlaces(claves = []) {
  return [...new Set(claves)].filter((k) => ENLACES[k]).slice(0, 2).map((k) => ({ ...ENLACES[k] }));
}
