import { productScreens, costScreen } from "./productScreens";

// URLs públicas. Atención usa un servicio separado, sin acceso al backend del producto.
export const SITE_URL = "https://costo360-landing.vercel.app";
export const PRODUCT_LOGIN_URL = "https://costo360-web.vercel.app/login";
export const PRODUCT_CHECKOUT_URL = "https://costo360-web.vercel.app/checkout";
// Pendiente de confirmación del fundador: URL de agenda, WhatsApp o mailto real.
// Vacío = no se presenta un formulario ni se simula el envío de una solicitud.
export const DEMO_CONTACT_URL: string = "";

export const materials = [
  { name: "Mármol", reference: "Blanco Carrara", image: "/media/marble.webp" },
  {
    name: "Granito",
    reference: "Negro San Gabriel",
    image: "/media/granite.webp",
  },
  {
    name: "Sinterizado",
    reference: "Calacatta Gold",
    image: "/media/sintered.webp",
  },
];

export const faqs = [
  {
    question: "¿Las imágenes muestran el producto real o una simulación?",
    answer:
      "Las pantallas del recorrido y de Cost pertenecen al producto real, en una cuenta con datos de prueba. Las cifras son ejemplos, no resultados de clientes. También puedes probar aquí cómo acomodar piezas en una lámina: utiliza el mismo cálculo de Costo360, sin guardar tus datos ni crear una cotización.",
  },
  {
    question: "¿Qué es Costo360 y para quién está diseñado?",
    answer:
      "Costo360 es una empresa de tecnología para marmolerías y talleres de piedra en Colombia. Te ayuda a cotizar con tus propios costos, revisar cómo aprovechar las láminas, tener ubicados los retales y organizar los trabajos pendientes. Está pensado para quienes trabajan con mármol, granito, sinterizado y cuarcita.",
  },
  {
    question: "¿Cómo cotizo un mesón de mármol con Costo360?",
    answer:
      "Eliges el material y escribes las medidas y cantidades de las piezas. Añades mano de obra, zócalos, insumos y otros costos del trabajo con las tarifas de tu taller. Revisas cuánto cuesta y lo que vas a cobrar, y generas un PDF para compartir con tu cliente. También hay una modalidad Express para cotizar de forma más rápida.",
  },
  {
    question: "¿Cómo me ayuda a aprovechar mejor una lámina?",
    answer:
      "Costo360 compara distintas formas de acomodar tus piezas rectangulares en la lámina. Te muestra un plano, cuánto material usas, qué retal queda y qué piezas no caben. Solo gira una pieza cuando es necesario para que quepa; tú revisas el plano y el sentido de la veta antes de cortar. Puedes probarlo aquí con tus medidas. El aprovechamiento depende de cada trabajo, por eso no prometemos un porcentaje fijo de ahorro.",
  },
  {
    question: "¿Cost puede modificar mis datos sin permiso?",
    answer:
      "No. Puedes pedirle que busque información de tu taller, calcule una cotización o prepare una tarea. Antes de crear, cambiar o borrar información, Cost te pide que revises y confirmes. Tú mantienes la última palabra.",
  },
  {
    question: "¿Cuánto cuesta el software para mi marmolería?",
    answer:
      "Pagas una suscripción mensual por tu empresa: Starter cuesta $150.000 COP para 1 persona, Pro $375.000 COP para 3 y Enterprise $875.000 COP para hasta 10. Todos incluyen cotizaciones, materiales, proyectos y Cost. Cambian el tamaño del equipo, la capacidad mensual de uso de Cost y los días que puedes consultar sus acciones: 1, 30 y 90, respectivamente. El acceso se habilita tras confirmar el pago y configurar tu cuenta.",
  },
  {
    question: "¿Cost está incluido en Starter?",
    answer:
      "Sí, también te acompaña si trabajas solo. Cost puede buscar datos de tu taller, calcular y preparar registros para que los revises. Su uso tiene referencias mensuales por empresa. Cada persona dispone de una referencia de 5 mensajes de voz en Starter, 10 en Pro o 15 en Enterprise; la medición es aproximada y depende de la duración. El tiempo que guardamos las acciones de Cost no limita el historial de tus cotizaciones.",
  },
  {
    question: "¿Puedo hacer cotizaciones con AIU en Colombia?",
    answer:
      "Sí. Si un trabajo requiere separar Administración, Imprevistos y Utilidad (AIU), cuentas con una modalidad específica para preparar esa cotización. Revisa con tu contador qué impuestos y condiciones corresponden a tu contrato.",
  },
  {
    question: "¿Reemplaza la contabilidad o la facturación electrónica DIAN?",
    answer:
      "No. Costo360 no hace facturación electrónica DIAN, contabilidad ni logística del taller. Genera cotizaciones y cuentas de cobro en PDF, y se enfoca en los costos, el material y el seguimiento de proyectos.",
  },
];

export function structuredData() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: "Costo360",
        url: SITE_URL,
        logo: `${SITE_URL}/logo_versiones_oscuras.png`,
        areaServed: "CO",
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${SITE_URL}/#software`,
        name: "Costo360",
        url: SITE_URL,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        screenshot: [...productScreens, costScreen].map((screen) => ({
          "@type": "ImageObject",
          contentUrl: `${SITE_URL}${screen.src}`,
          caption: `${screen.alt} Cuenta demo con datos de prueba, no resultados de clientes.`,
          width: screen.width,
          height: screen.height,
        })),
        inLanguage: "es-CO",
        publisher: { "@id": `${SITE_URL}/#organization` },
        description:
          "Software de Costo360 para marmolerías y talleres de piedra en Colombia, con Cost incluido en todos los planes. Suscripción mensual por taller: Starter $150.000 COP (1 usuario), Pro $375.000 COP (3 usuarios) y Enterprise $875.000 COP (hasta 10 usuarios). Uso de IA sujeto a cupos mensuales por empresa.",
        featureList: [
          "Cotización Directa, Express y AIU",
          "Cotizaciones y cuentas de cobro en PDF",
          "Catálogo editable por taller",
          "Inventario de láminas y banco de retales",
          "Nesting 2D con rotación solo cuando hace falta y plano descargable",
          "Parámetros de costo del taller",
          "Dashboard e historial de cotizaciones",
          "Proyectos Kanban, tareas, hitos y registro de horas",
          "Asistente Cost con confirmación humana para escritura y borrado",
          "Roles Admin, Gerencia y Operativo",
        ],
      },
      {
        "@type": "FAQPage",
        "@id": `${SITE_URL}/#faq`,
        mainEntity: faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: { "@type": "Answer", text: faq.answer },
        })),
      },
    ],
  };
}
