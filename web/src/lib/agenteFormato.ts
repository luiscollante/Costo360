import { formatCOP, formatFecha } from '@/lib/utils'
import type { Propuesta } from '@/api/agente'

/** Campos de una fila afectada que YA se muestran aparte (título/nombre
 * principal, o el id que siempre se pinta al lado) — el resto se lista como
 * detalle genérico, para que la tarjeta funcione igual de bien con tareas,
 * cotizaciones o cualquier dominio futuro sin tener que tocar este archivo
 * cada vez que se agrega una tool nueva.
 *
 * Extraído de `AgentePage.tsx` en el Ciclo 3 (chat flotante global) para que
 * la página dedicada y el widget flotante compartan exactamente la misma
 * lógica de formato — nunca dos copias que puedan divergir. */
// Candidatos a nombre principal, en orden de preferencia — el primero con
// valor real "gana" para ESA fila puntual (nunca se oculta toda la lista:
// solo el campo que de verdad ganó, para no esconder p. ej. "Categoría" de
// una lámina que sí tiene referencia y por eso usó "referencia" como título).
export const CAMPOS_PRINCIPAL = ['numero', 'cliente', 'titulo', 'referencia', 'material_categoria', 'nombre_interno', 'concepto'] as const
// Ids/flags internos sin valor para que un humano confirme una acción —
// estos SÍ se ocultan siempre, sin importar qué ganó como principal.
export const CAMPOS_OCULTOS = new Set(['id', 'base_id', 'es_propio', 'activo', 'actualizado_en'])

/** `referencia` puede ser `""` en vez de `null` (ej. una lámina de inventario
 * sin referencia todavía) — sin este chequeo, un string vacío "gana" como
 * nombre principal y la tarjeta muestra un título en negrita vacío. */
export function tieneValor(v: unknown): boolean {
  return v != null && v !== ''
}

const CAMPOS_MONEDA = new Set([
  'precio', 'precio_m2', 'precio_lamina', 'costo_unitario',
  'precio_recuperacion', 'precio_mercado_m2', 'valor_cop',
  'terminada', 'acabados', 'estructura', 'comercial',
  'precio_sugerido', 'costo_total',
])

/** true tanto para 'precio_m2' como para su variante 'precio_m2_propuesto' —
 * mismo espíritu que `etiqueta()`: una tool nueva que proponga cambiar un
 * campo de moneda no necesita venir a agregar la variante "_propuesto" aquí
 * también (hallazgo real: `costo_unitario_propuesto` de Inventario no
 * formateaba como moneda porque solo `precio_m2_propuesto` estaba listado
 * a mano). */
function esCampoMoneda(campo: string): boolean {
  const base = campo.endsWith('_propuesto') ? campo.slice(0, -'_propuesto'.length) : campo
  return CAMPOS_MONEDA.has(base)
}

// Parámetros es el único dominio con campos de PORCENTAJE de verdad (guardados
// como fracción 0.05=5% en la base, pero mostrados ×100 con signo % — nunca la
// fracción cruda, que sería justo la ambigüedad que este dominio busca evitar).
// margen_pct de Cotización ya viene en puntos de porcentaje (40 = 40%), igual
// que valor_pct — la misma función de formato sirve para los dos sin cambios.
const CAMPOS_PORCENTAJE = new Set(['valor_pct', 'margen_pct'])

function esCampoPorcentaje(campo: string): boolean {
  const base = campo.endsWith('_propuesto') ? campo.slice(0, -'_propuesto'.length) : campo
  return CAMPOS_PORCENTAJE.has(base)
}

const ETIQUETAS: Record<string, string> = {
  cliente: 'Cliente', precio: 'Precio', fecha: 'Fecha', estado: 'Estado',
  project_id: 'Proyecto', categoria: 'Categoría', proveedor: 'Proveedor',
  referencia: 'Referencia', precio_m2: 'Precio actual', precio_m2_propuesto: 'Precio propuesto',
  es_override: 'Es copia de Costo360', activo: 'Activo',
  material_categoria: 'Categoría', cantidad_laminas: 'Cantidad de láminas',
  costo_unitario: 'Costo unitario', stock_minimo: 'Stock mínimo',
  ancho_cm: 'Ancho (cm)', alto_cm: 'Alto (cm)', espesor_cm: 'Espesor (cm)',
  ubicacion: 'Ubicación', notas: 'Notas',
  m2_disponibles: 'm² disponibles', m2_original: 'm² original',
  precio_recuperacion: 'Precio de recuperación', precio_mercado_m2: 'Precio de mercado (m²)',
  fecha_ingreso: 'Fecha de ingreso',
  material: 'Material', nombre_interno: 'Tarifa', concepto: 'Concepto',
  inductor: 'Tipo de cálculo', unidad: 'Unidad', valor_cop: 'Valor', valor_pct: 'Valor (%)',
  terminada: 'Casa terminada', acabados: 'En acabados', estructura: 'En estructura',
  comercial: 'Local comercial',
  tipo_proyecto: 'Tipo de proyecto', precio_sugerido: 'Precio sugerido',
  costo_total: 'Costo total', margen_pct: 'Margen',
}

/** Cualquier "<campo>_propuesto" (no solo precio_m2_propuesto) recibe una
 * etiqueta legible automáticamente — así una tool nueva que proponga cambiar
 * cualquier campo no necesita venir a agregar una entrada aquí. */
export function etiqueta(campo: string): string {
  if (ETIQUETAS[campo]) return ETIQUETAS[campo]
  if (campo.endsWith('_propuesto')) {
    const base = campo.slice(0, -'_propuesto'.length)
    return `${ETIQUETAS[base] ?? base} (nuevo)`
  }
  return campo
}

/** Genera el mensaje de Cost que se agrega a la conversación después de
 * confirmar una propuesta — confirmar/descartar pasa por un endpoint HTTP
 * aparte, NUNCA por el modelo (regla de seguridad), así que sin este mensaje
 * la conversación se queda sin ningún rastro de que la acción ocurrió: si el
 * usuario pregunta después "¿lo borraste?", el modelo no tiene forma de
 * saberlo y busca la fila de nuevo (que ya no existe), sonando como si
 * hubiera "olvidado" lo que él mismo preparó. */
export function mensajeConfirmacion(p: Propuesta): string {
  const fila = p.filas_afectadas[0] as Record<string, unknown> | undefined
  const campoPrincipal = fila && CAMPOS_PRINCIPAL.find((c) => tieneValor(fila[c]))
  const idOFallback = fila && (tieneValor(fila.id) ? String(fila.id) : 'lo solicitado')
  const principal = fila ? String(campoPrincipal ? fila[campoPrincipal] : idOFallback) : 'la acción'
  return p.es_destructiva
    ? `Listo, ya borré **${principal}** — no debería aparecer más.`
    : `Listo, ya confirmé el cambio en **${principal}**.`
}

export function valorLegible(campo: string, valor: unknown): string {
  if (esCampoMoneda(campo) && typeof valor === 'number') return formatCOP(valor)
  if (esCampoPorcentaje(campo) && typeof valor === 'number') return `${valor}%`
  if (campo === 'fecha' && typeof valor === 'string') return formatFecha(valor)
  if (typeof valor === 'boolean') return valor ? 'Sí' : 'No'
  return String(valor)
}
