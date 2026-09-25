// Capturas reales de Costo360 (cuenta demo "Marmolería Demo", tomadas el
// 2026-09-25 con el diseño actual). Datos de prueba, nunca resultados medidos
// de clientes. La captura 05 sigue excluida: requiere autorización.
export const productScreens = [
  {
    id: "nesting",
    label: "Plano de corte",
    title: "Cada pieza, dentro del plano.",
    description:
      "El motor de nesting prueba 16 formas de acomodar tus piezas sobre la lámina y se queda con la que ubica más y desperdicia menos. Solo gira una pieza cuando es la única forma de que quepa, porque la veta importa. Ves el aprovechamiento, el retal y descargas el plano.",
    src: "/media/producto/02-nesting-plano-generado.webp",
    width: 1512,
    height: 795,
    alt: "Pantalla real de nesting de Costo360: plano de corte de una cocina con mesón, isla y salpicadero, con 66,8% de aprovechamiento en una lámina de 3,20 × 1,60 m.",
    note: "Las medidas y el porcentaje corresponden únicamente al ejemplo mostrado.",
  },
  {
    id: "cotizacion",
    label: "Cotización Directa",
    title: "Tu material es el punto de partida.",
    description:
      "El recorrido Material → Piezas → Proyecto → Resultado organiza la cotización. Registra cada pieza con su tipo, medidas y cantidad, mira en vivo cuánto de la lámina consumes y revisa el desglose antes de generar tu propuesta en PDF.",
    src: "/media/producto/06-cotizacion-piezas.webp",
    width: 1512,
    height: 795,
    alt: "Paso Piezas de Cotización Directa en Costo360: mesón de cocina, salpicadero e isla central con su área y el consumo de la placa en 79,7%.",
    note: "Ejemplo con datos de prueba; se muestra el paso de piezas, no una cotización enviada.",
  },
  {
    id: "catalogo",
    label: "Catálogo de materiales",
    title: "Tus referencias. Tus precios.",
    description:
      "Cada taller administra categorías, referencias y precios por m². Puedes adaptar los materiales base de Costo360 a tu operación sin perder la referencia original.",
    src: "/media/producto/03-catalogo-materiales.webp",
    width: 1512,
    height: 795,
    alt: "Catálogo real de materiales de Costo360 con categorías, referencias y precios por metro cuadrado de la cuenta demo.",
    note: "Los precios visibles pertenecen al catálogo de prueba; no son tarifas de suscripción ni una oferta de materiales.",
  },
  {
    id: "proyectos",
    label: "Proyectos",
    title: "Del sí del cliente a la entrega.",
    description:
      "Cuando una cotización se aprueba, el trabajo sigue en Proyectos: etapas, tareas, avance y alertas de riesgo en un tablero que todo el taller entiende.",
    src: "/media/producto/07-proyectos.webp",
    width: 1512,
    height: 794,
    alt: "Tablero real de Proyectos de Costo360 con proyectos activos, su avance y una alerta de riesgo, en la cuenta demo.",
    note: "Proyectos y clientes de prueba.",
  },
  {
    id: "dashboard",
    label: "Dashboard",
    title: "Mira el negocio con contexto.",
    description:
      "Consulta cotizaciones, facturación y margen del mes, el estado de tus cotizaciones y los materiales más cotizados. La información del taller reunida para acompañar tus decisiones.",
    src: "/media/producto/01-dashboard.webp",
    width: 1512,
    height: 795,
    alt: "Dashboard real de Costo360 con cotizaciones, facturación y margen del mes, estado de cotizaciones y materiales más cotizados de una cuenta de demostración.",
    note: "Todas las cifras son datos de prueba. No representan clientes, ingresos ni resultados de Costo360.",
  },
] as const;

export const costScreen = {
  src: "/media/producto/04-cost-respuesta.webp",
  width: 1512,
  height: 795,
  alt: "Cost, el asistente de Costo360, respondiendo con cifras reales de la cuenta demo cuáles fueron los 3 materiales más cotizados en los últimos 90 días.",
};
