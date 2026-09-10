// Capturas del fundador: cuenta demo, nunca resultados medidos de clientes.
// La captura 05 está excluida: requiere autorización antes de publicarla.
export const productScreens = [
  {
    id: "nesting",
    label: "Plano de corte",
    title: "Cada pieza, dentro del plano.",
    description:
      "El motor Guillotine 2D distribuye las piezas sobre la lámina, calcula el aprovechamiento de esa distribución e identifica cuáles no caben. Un plano visual SVG para revisar el despiece, no una promesa de ahorro fijo.",
    src: "/media/producto/02-nesting-plano-generado.webp",
    width: 1568,
    height: 688,
    alt: "Pantalla real de nesting de Costo360: plano de corte con piezas, dimensiones y aprovechamiento calculado para un ejemplo de prueba.",
    note: "Las medidas y el porcentaje corresponden únicamente al ejemplo mostrado.",
  },
  {
    id: "cotizacion",
    label: "Cotización Directa",
    title: "Tu material es el punto de partida.",
    description:
      "El recorrido Material → Piezas → Proyecto → Resultado organiza la cotización. Define dimensiones y cantidades, incorpora los costos del taller y revisa el desglose antes de generar tu propuesta en PDF.",
    src: "/media/producto/06-wizard-cotizacion.webp",
    width: 1568,
    height: 698,
    alt: "Primer paso real de Cotización Directa en Costo360: selección del material y etapas Material, Piezas, Proyecto y Resultado.",
    note: "Se muestra el primer paso del asistente, no una cotización terminada.",
  },
  {
    id: "catalogo",
    label: "Catálogo de materiales",
    title: "Tus referencias. Tus precios.",
    description:
      "Cada taller administra categorías, referencias y precios por m². Puedes adaptar los materiales base de Costo360 a tu operación sin perder la referencia original.",
    src: "/media/producto/03-catalogo-materiales.webp",
    width: 1568,
    height: 688,
    alt: "Catálogo real de materiales de Costo360 con categorías, referencias y precios por metro cuadrado de la cuenta demo.",
    note: "Los precios visibles pertenecen al catálogo de prueba; no son tarifas de suscripción ni una oferta de materiales.",
  },
  {
    id: "dashboard",
    label: "Dashboard",
    title: "Mira el negocio con contexto.",
    description:
      "Consulta ingresos por mes, distribución por tipo de proyecto, materiales más cotizados y margen promedio. La información del taller reunida en gráficos para acompañar tus decisiones.",
    src: "/media/producto/01-dashboard.webp",
    width: 1568,
    height: 688,
    alt: "Dashboard real de Costo360 con métricas del mes, materiales y gráficos de una cuenta de demostración.",
    note: "Todas las cifras son datos de prueba. No representan clientes, ingresos ni resultados de Costo360.",
  },
] as const;

export const costScreen = {
  src: "/media/producto/04-cost-agente-inicio.webp",
  width: 1568,
  height: 686,
  alt: "Pantalla inicial real del asistente Cost en Costo360, antes de iniciar una conversación.",
};
