import {
  FileText,
  FolderKanban,
  Layers3,
  ShieldCheck,
} from "lucide-react";
import { ModuleArt } from "./ui/ModuleArt";
import { spotlight } from "./ui/Tactile";
import { motion } from "framer-motion";
const modules = [
  {
    icon: Layers3,
    label: "MATERIAL BAJO CONTROL",
    title: "Antes de comprar, mira lo que ya tienes.",
    text: "Es fácil olvidar una lámina o un retal guardado. Consulta qué material tienes, dónde está y cuánto cuesta antes de pedir más.",
    items: [
      "Tus materiales y precios por metro cuadrado",
      "Medidas, cantidades y ubicación de tus láminas",
      "Retales guardados para próximos trabajos",
    ],
  },
  {
    icon: FileText,
    label: "DEL CÁLCULO A LA PROPUESTA",
    title: "Tu trabajo, bien presentado.",
    text: "¿Vuelves a armar la propuesta cada vez que te piden un precio? Reúne los costos y genera un PDF claro para tu cliente. Después, encuentra lo que cotizaste sin buscar entre mensajes.",
    items: [
      "Cotiza según el tipo de trabajo",
      "Cotizaciones y cuentas de cobro en PDF",
      "Encuentra propuestas por cliente, fecha o estado",
    ],
  },
  {
    icon: FolderKanban,
    label: "DESPUÉS DE COTIZAR",
    title: "Que una entrega no te tome por sorpresa.",
    text: "El cliente pregunta cómo va su trabajo y tú también tienes que averiguarlo. Organiza las tareas, sus responsables y las fechas para ver qué falta antes de entregar.",
    items: [
      "Etapas del trabajo y horas dedicadas",
      "Tareas, responsables y comentarios en un lugar",
      "Avisos de fechas próximas y etapas en riesgo",
    ],
  },
  {
    icon: ShieldCheck,
    label: "CADA PERSONA, SU ACCESO",
    title: "Un equipo. Distintas responsabilidades.",
    text: "Cuando más personas cotizan, necesitas orden. Dale a cada integrante su propio acceso y los permisos que corresponden a su trabajo.",
    items: [
      "Administración: configura el taller y el equipo",
      "Gerencia: consulta los números del negocio",
      "Operación: cotiza y consulta su propio trabajo",
    ],
  },
];
export function BentoEcosystem() {
  return (
    <section
      className="section container ecosystem"
      id="modulos"
      aria-labelledby="ecosystem-title"
    >
      <div className="section-heading split-heading">
        <div>
          <p className="eyebrow">03 / CONECTADO CON TU FORMA DE TRABAJAR</p>
          <h2 id="ecosystem-title">
            Más que cotizar.
            <br />
            <span>Una visión completa de tu taller.</span>
          </h2>
        </div>
        <p>
          Que la información no se quede en una libreta, una hoja de cálculo
          o un mensaje perdido. Consulta materiales, propuestas y pendientes
          en el mismo lugar.
        </p>
      </div>
      <div className="module-grid">
        {modules.map(({ icon: Icon, label, title, text, items }, index) => (
          <motion.article
            className="module-card tactile-card"
            key={label}
            onPointerMove={spotlight}
            initial={{ y: 28 }}
            whileInView={{ y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{
              duration: 0.65,
              delay: (index % 2) * 0.08,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <ModuleArt index={index} />
            <div className="card-kicker">
              <Icon size={22} />
              <span>{label}</span>
            </div>
            <h3>{title}</h3>
            <p>{text}</p>
            <details className="module-details">
              <summary>
                Explora lo que puedes hacer <span aria-hidden="true">+</span>
              </summary>
              <ul>
                {items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </details>
          </motion.article>
        ))}
      </div>
      <div className="workshop-costs">
        <div className="workshop-costs-copy">
          <p className="eyebrow">HECHO A LA MEDIDA DE TU TALLER</p>
          <h3>Cada taller tiene sus propias cuentas.</h3>
          <p>
            Tu material, tu mano de obra, tus herramientas. Guarda lo que te
            cuesta trabajar y úsalo en cada cotización, sin volver a sacar
            las mismas cuentas.
          </p>
        </div>
        <img
          src="/media/editorial/workshop-own-costs.webp"
          alt="Ilustración de las manos de un artesano calculando un trabajo, junto a muestras de piedra, insumos y herramientas."
          width={1200}
          height={600}
          loading="lazy"
          decoding="async"
        />
      </div>
    </section>
  );
}
