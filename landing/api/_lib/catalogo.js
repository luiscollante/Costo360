// Catálogo aprobado del chat de atención de Costo360 (única fuente de verdad).
// Precios y cupos = los mismos de la landing (src/lib/content.ts) y de la tabla
// `planes` de la plataforma; la prueba `evals/catalogo.test.mjs` falla si divergen.
// La IA NUNCA escribe precios, cupos ni enlaces: usa marcadores {precio:pro},
// {usuarios:pro}, {enlace:planes}… que el servidor reemplaza desde aquí.

export const VERSION = "2026-09-25.2";

export const PLANES = {
  starter: { nombre: "Starter", precio: 150000, usuarios: 1, voz: 5, registro: 1 },
  pro: { nombre: "Pro", precio: 375000, usuarios: 3, voz: 10, registro: 30 },
  enterprise: { nombre: "Enterprise", precio: 875000, usuarios: 10, voz: 15, registro: 90 },
};

// La prueba gratuita de 7 días del plan Pro se anuncia SOLO cuando el sistema
// de pruebas esté construido (recordatorio, cobro y cierre automáticos).
export const PRUEBA_PRO_ACTIVA = process.env.ATENCION_PRUEBA_PRO === "1";

export const WHATSAPP = "573004143787";
export const CORREO = "atencion@costo360.com";

export const ENLACES = {
  planes: { href: "#planes", label: "Comparar planes" },
  producto: { href: "#producto", label: "Ver el producto por dentro" },
  simulador: { href: "#simulador", label: "Probar el simulador de nesting" },
  cost: { href: "#cost", label: "Conocer a Cost" },
  login: { href: "https://costo360-web.vercel.app/login", label: "Entrar a mi cuenta" },
  comprar_starter: { href: "https://costo360-web.vercel.app/checkout?plan=starter", label: "Empezar con Starter" },
  comprar_pro: { href: "https://costo360-web.vercel.app/checkout?plan=pro", label: "Empezar con Pro" },
  comprar_enterprise: { href: "https://costo360-web.vercel.app/checkout?plan=enterprise", label: "Empezar con Enterprise" },
  whatsapp: { href: `https://wa.me/${WHATSAPP}`, label: "Hablar con el fundador" },
  privacidad: { href: "/privacidad/", label: "Aviso de privacidad" },
};

const cop = (n) => "$" + n.toLocaleString("es-CO").replace(/,/g, ".") + " COP";

/** Valor de cada marcador permitido. Todo marcador fuera de esta tabla = falla. */
export function valorMarcador(tipo, clave) {
  const plan = PLANES[clave];
  if (tipo === "precio" && plan) return cop(plan.precio);
  if (tipo === "usuarios" && plan) return plan.usuarios === 1 ? "1 usuario" : `${plan.usuarios} usuarios`;
  if (tipo === "voz" && plan) return `${plan.voz} mensajes de voz al mes por usuario`;
  if (tipo === "registro" && plan) return plan.registro === 1 ? "1 día" : `${plan.registro} días`;
  if (tipo === "plan" && plan) return plan.nombre;
  return null;
}

// Hechos verificados (derivados del piloto revisado por el fundador,
// agentes-operacion/atencion/knowledge.py). La IA solo puede afirmar esto.
export const HECHOS = `
PRODUCTO: Costo360 es software en la web para marmolerías y talleres que transforman piedra en Colombia (mármol, granito, sinterizado, cuarzo, cuarcita). Conecta cotizaciones, costos, materiales y proyectos. No vende piedra ni instala.
COTIZAR: modalidades Directa, Express y AIU. Configuras tus tarifas (mano de obra, insumos, maquinaria, riesgo de rotura), eliges material, ingresas piezas con medidas y cantidades, revisas el desglose y el margen, y generas un PDF profesional para tu cliente. También cuentas de cobro en PDF (no son factura electrónica DIAN).
MARGEN: muestra el desglose de costos antes de presentar el precio; no garantiza ganancias, da información para decidir.
MATERIALES: catálogo propio de materiales y precios por m², inventario de láminas y banco de retales para reaprovechar sobrantes.
NESTING: el motor prueba 16 formas de acomodar piezas rectangulares en la lámina y elige la que ubica más piezas y aprovecha más; gira una pieza solo si es la única forma de que quepa (por la veta). Muestra aprovechamiento, retal y qué no cabe; el plano se descarga. No hay porcentaje de ahorro garantizado. En la landing hay un simulador con el mismo cálculo.
PROYECTOS: tablero con etapas, tareas, responsables, fechas, hitos, horas y alertas de riesgo.
COST: asistente con IA incluido en TODOS los planes, también Starter. Consulta datos del taller, calcula cotizaciones y prepara acciones; la persona confirma antes de crear, editar o borrar. Tiene voz con cupo mensual por usuario y un registro de acciones que se conserva según el plan.
EQUIPO: Starter es para 1 usuario, Pro para 3, Enterprise para hasta 10. Cada persona entra con su usuario y sus permisos.
PLANES: suscripción mensual por taller/empresa. Todos incluyen cotizaciones, PDF, materiales, inventario, retales, nesting, proyectos y Cost. Cambian usuarios, capacidad mensual de IA, voz y conservación del registro de Cost.
COMPRA: se compra desde la tarjeta del plan en la landing, con pago en línea; el acceso se habilita al confirmar el pago y configurar la cuenta. El chat no cobra, no activa cuentas ni confirma pagos.
NO HACE: contabilidad, facturación electrónica DIAN, nómina, logística. No hay app móvil nativa confirmada, ni integraciones confirmadas, ni modo sin internet.
ACCESO: quien ya es cliente entra desde "Entrar a mi cuenta" y usa la recuperación de contraseña; nunca debe compartir contraseñas en el chat.
HUMANO: para reembolsos, reclamos, casos especiales o equipos de más de 10 personas, el fundador atiende por WhatsApp.
EMPRESA: Costo360 S.A.S. está en proceso de constitución.
`.trim();

export const PRUEBA_TEXTO = PRUEBA_PRO_ACTIVA
  ? "PRUEBA: el plan Pro tiene una prueba gratuita de 7 días."
  : "PRUEBA: hoy NO hay prueba gratuita ni demo gratis. No la ofrezcas.";

// Afirmaciones que nunca pueden aparecer (el validador las bloquea).
export const PROHIBIDO = [
  /\d+\s*%\s*(de\s+)?(ahorro|menos desperdicio|m[aá]s ganancia|m[aá]s rentab)/i,
  /ahorr(a|as|ar[aá]s)\s+(hasta|un|el)\s+\d/i,
  /garantiz/i,
  /recuper(as|a|ar[aá]s)\s+(lo|la|el|tu)\s+(de la |la )?(suscripci|inversi|plan)/i,
  /se paga(r[aá])? sol[oa]/i,
  /(multiplica|duplica|triplica)(s|r[aá]s)?\s+(tus|las|sus)/i,
  /24\s*\/\s*7|las 24 horas/i,
  /factura(ci[oó]n)?\s+electr[oó]nica(?!\s+DIAN\s*(no|,? no))/i,
  /descuento/i,
  /reembols/i,
  /cup[oó]n/i,
  /\bgratis\b|\bgratuit[ao]\b/i,
  /testimoni|nuestros clientes (dicen|afirman)|m[aá]s de \d+ (talleres|clientes|empresas)/i,
  /integraci[oó]n con|se integra con|app (m[oó]vil|nativa)|sin conexi[oó]n|offline/i,
];

// Voseo: lista cerrada de formas (nunca terminaciones sueltas: "más", "después"…).
// Competidores: nunca por nombre (decisión del fundador), aunque el visitante los nombre.
export const COMPETIDORES = /(siigo|alegra|helisa|world\s*office|contapyme|odoo|sap|quickbooks|zoho|loggro|monica|marmosoft|moraware|slabsmith|cutlist)/i;

export const VOSEO = [
  "vos", "tenés", "querés", "podés", "sabés", "decís", "sos", "hacé", "mirá", "fijate", "andá",
  "contame", "decime", "escribime", "avisame", "mandame", "pensá", "elegí", "probá", "venís", "hablás",
  "necesitás", "tenés", "usás", "trabajás", "vendés", "cotizás", "sentís", "podrías vos",
];
