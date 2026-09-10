import { productScreens, costScreen } from "./productScreens";

// Única fuente de URLs públicas. Nunca conectar esta landing al backend.
export const SITE_URL = "https://costo360-landing.vercel.app";
export const PRODUCT_LOGIN_URL = "https://costo360-web.vercel.app/login";
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
      "El recorrido del producto y la pantalla de Cost son capturas reales de una cuenta de demostración, con datos de prueba. Sus cifras no representan resultados de clientes ni precios de suscripción. El simulador de distribución es un ejemplo local simplificado, separado del motor del producto: no guarda datos ni genera una cotización real.",
  },
  {
    question: "¿Qué es Costo360 y para quién está diseñado?",
    answer:
      "Costo360 es un software SaaS B2B de cotización para marmolerías y talleres de transformación de piedra en Colombia. Reúne cotizaciones, catálogo, inventario de láminas, retales, optimización de corte y gestión de proyectos para trabajar con mármol, granito, sinterizado y cuarcita.",
  },
  {
    question: "¿Cómo cotizo un mesón de mármol con Costo360?",
    answer:
      "Seleccionas el material e ingresas el largo, ancho y cantidad de las piezas. La Cotización Directa incorpora mano de obra, zócalos, insumos, riesgo de rotura y adicionales por etapa para desglosar el costo con los parámetros de tu taller. También existe una modalidad Express y puedes generar la cotización en PDF.",
  },
  {
    question: "¿Cómo funciona la optimización de corte o nesting 2D?",
    answer:
      "El motor de empaquetado Guillotine 2D distribuye piezas rectangulares sobre las dimensiones de una lámina y genera un plano visual SVG. Calcula el aprovechamiento de esa distribución e identifica piezas que no caben. El resultado depende de las medidas y piezas del proyecto; no se promete un porcentaje fijo de ahorro.",
  },
  {
    question: "¿Cost puede modificar mis datos sin permiso?",
    answer:
      "No. Cost es un asistente de IA que consulta datos, calcula y propone acciones sobre cotizaciones, proyectos, tareas, catálogo, inventario, retales, nesting y parámetros. Toda acción que escriba o borre datos requiere confirmación humana antes de ejecutarse.",
  },
  {
    question: "¿Cuánto cuesta el software para mi marmolería?",
    answer:
      "Costo360 tiene planes de suscripción mensual: Starter para 1 usuario, Pro para 3 usuarios y Enterprise para hasta 10 usuarios. Los precios vigentes y las funciones incluidas en cada plan se confirman con el equipo antes de contratar. El acceso al producto es por invitación; no hay registro público ni acceso instantáneo.",
  },
  {
    question: "¿Puedo hacer cotizaciones con AIU en Colombia?",
    answer:
      "Sí. Costo360 incluye una modalidad de cotización con Administración, Imprevistos y Utilidad (AIU) para licitaciones y obra pública, con IVA sobre la Utilidad según el Decreto 1372/92. No sustituye la revisión tributaria que corresponda a tu contrato.",
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
          "Software SaaS B2B de cotización para marmolerías y talleres de piedra en Colombia. Acceso por invitación. Planes mensuales Starter (1 usuario), Pro (3 usuarios) y Enterprise (hasta 10 usuarios), con precios por confirmar con el equipo.",
        featureList: [
          "Cotización Directa, Express y AIU",
          "Cotizaciones y cuentas de cobro en PDF",
          "Catálogo editable por taller",
          "Inventario de láminas y banco de retales",
          "Nesting Guillotine 2D con plano SVG",
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
