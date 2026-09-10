import {
  FileText,
  FolderKanban,
  Layers3,
  Settings2,
  ShieldCheck,
} from "lucide-react";
const modules = [
  {
    icon: Layers3,
    label: "MATERIAL BAJO CONTROL",
    title: "Lo que tienes. Lo que puedes aprovechar.",
    text: "Catálogo con referencias y precios por m². Inventario de láminas con cantidad, dimensiones, costo, proveedor, ubicación y stock mínimo.",
    items: [
      "Catálogo editable por taller",
      "Láminas físicas en inventario",
      "Retales con m² y precio de recuperación",
    ],
  },
  {
    icon: FileText,
    label: "DEL CÁLCULO A LA PROPUESTA",
    title: "Tu trabajo, bien presentado.",
    text: "Genera cotizaciones y cuentas de cobro en PDF profesional para compartir con tu cliente. Conserva el contexto de cada propuesta en el historial.",
    items: [
      "Cotización Directa, Express y AIU",
      "Documentos PDF",
      "Historial por cliente, estado, fecha y material",
    ],
  },
  {
    icon: FolderKanban,
    label: "DESPUÉS DE COTIZAR",
    title: "El proyecto sigue. Tú también.",
    text: "Organiza el trabajo posterior a la cotización en un tablero Kanban. Relaciona tareas e hitos para seguir el avance de cada proyecto.",
    items: [
      "Hitos con dependencias y registro de horas",
      "Comentarios y tareas",
      "Avisos de plazos y de hitos en riesgo",
    ],
  },
  {
    icon: ShieldCheck,
    label: "CADA PERSONA, SU ACCESO",
    title: "Un equipo. Distintas responsabilidades.",
    text: "Los roles definen qué puede hacer cada persona dentro del producto. No todos necesitan ver ni administrar lo mismo.",
    items: [
      "Admin: administración del taller y usuarios",
      "Gerencia: Dashboard/BI, sin gestionar usuarios",
      "Operativo: cotiza y ve lo suyo",
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
          Materiales, propuestas y proyectos,
          <br />
          dentro del mismo ecosistema.
          <br />
          Cada módulo tiene un propósito.
        </p>
      </div>
      <div className="module-grid">
        {modules.map(({ icon: Icon, label, title, text, items }) => (
          <article className="module-card" key={label}>
            <div className="card-kicker">
              <Icon size={22} />
              <span>{label}</span>
            </div>
            <h3>{title}</h3>
            <p>{text}</p>
            <ul>
              {items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
      <div className="parameters-strip">
        <span className="parameters-icon">
          <Settings2 size={24} />
        </span>
        <div>
          <h3>No todos los talleres cuestan lo mismo.</h3>
          <p>
            Configura mano de obra, maquinaria, consumibles, merma por material
            y adicionales por etapa de obra. Tus parámetros alimentan tus
            próximas cotizaciones.
          </p>
        </div>
        <span className="mono">
          TUS REGLAS.
          <br />
          TU COSTO360.
        </span>
      </div>
    </section>
  );
}
