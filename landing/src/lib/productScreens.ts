// Capturas reales de Costo360 (cuenta demo "Marmolería Demo", tomadas el
// 2026-09-25 con el diseño actual). Datos de prueba, nunca resultados medidos
// de clientes. La captura 05 sigue excluida: requiere autorización.
export const productScreens = [
  {
    id: "nesting",
    label: "Plano de corte",
    title: "Revisa si el material alcanza antes de cortar.",
    description:
      "Ingresa las medidas y mira cómo quedan tus piezas en la lámina, qué sobra y qué no cabe. Costo360 compara distintas formas de acomodarlas y solo gira una pieza si es necesario para que quepa. Revisa el plano y descárgalo antes de cortar.",
    src: "/media/producto/02-nesting-plano-generado.webp",
    width: 1512,
    height: 795,
    alt: "Pantalla real de nesting de Costo360: plano de corte de una cocina con mesón, isla y salpicadero, con 66,8% de aprovechamiento en una lámina de 3,20 × 1,60 m.",
    note: "Las medidas y el porcentaje corresponden únicamente al ejemplo mostrado.",
  },
  {
    id: "cotizacion",
    label: "Cotización Directa",
    title: "Da un precio con las cuentas claras.",
    description:
      "No tienes que sacar las mismas cuentas una y otra vez. Elige el material, agrega las piezas y revisa cuánto consumen de la lámina. Después comprueba los costos antes de preparar la cotización para tu cliente.",
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
      "Deja de buscar el precio del material entre mensajes y listas sueltas. Reúne tus referencias y precios por metro cuadrado, y actualízalos para usarlos en tus próximas cotizaciones.",
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
      "¿Qué falta para entregar y quién lo tiene pendiente? Organiza cada proyecto por etapas, asigna tareas y revisa el avance para coordinar al equipo sin tener que preguntar por todo.",
    src: "/media/producto/07-proyectos.webp",
    width: 1512,
    height: 794,
    alt: "Tablero real de Proyectos de Costo360 con proyectos activos, su avance y una alerta de riesgo, en la cuenta demo.",
    note: "Proyectos y clientes de prueba.",
  },
  {
    id: "dashboard",
    label: "Resumen del negocio",
    title: "Mira cómo van tus cotizaciones.",
    description:
      "Revisa cuánto has cotizado, en qué estado están las propuestas y qué materiales te piden más. Usa los costos y las ganancias estimadas que muestran tus cotizaciones para decidir con más información.",
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
