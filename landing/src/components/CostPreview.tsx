import { useState } from "react";
import { ArrowRight, Check, MessageSquareText, Sparkles } from "lucide-react";

const examples = [
  {
    label: "Cotización",
    prompt: "Ayúdame a cotizar un mesón con las tarifas de mi taller.",
    action:
      "Consulta materiales y parámetros. Calcula la propuesta para que revises el detalle.",
    tags: ["Materiales", "Parámetros", "Cotización"],
  },
  {
    label: "Inventario",
    prompt: "Quiero registrar una nueva lámina de granito en el inventario.",
    action:
      "Prepara el registro con las medidas, el costo y la ubicación que le indiques. Te pide confirmación antes de crearlo.",
    tags: ["Láminas", "Dimensiones", "Confirmación"],
  },
  {
    label: "Proyectos",
    prompt: "Ayúdame a crear una tarea de instalación para este proyecto.",
    action:
      "Prepara la tarea vinculada al proyecto. Tú revisas la información y autorizas su creación.",
    tags: ["Proyecto", "Tarea", "Confirmación"],
  },
];

export function CostPreview() {
  const [selected, setSelected] = useState(0);
  const example = examples[selected];
  return (
    <div className="cost-preview">
      <div className="cost-preview-top">
        <span>
          <Sparkles size={18} /> Cost, a tu lado
        </span>
        <span className="cost-demo-label">EJEMPLO ILUSTRATIVO</span>
      </div>
      <h3>Así le puedes pedir ayuda.</h3>
      <div
        className="cost-examples"
        role="group"
        aria-label="Ejemplos de ayuda de Cost"
      >
        {examples.map(({ label }, index) => (
          <button
            key={label}
            type="button"
            aria-pressed={selected === index}
            onClick={() => setSelected(index)}
          >
            {label}
          </button>
        ))}
      </div>
      <div aria-live="polite" aria-atomic="true">
        <div className="cost-example-content" key={selected}>
          <div className="example-prompt">
            <MessageSquareText size={19} />
            <p>“{example.prompt}”</p>
          </div>
          <div className="example-path" aria-hidden="true">
            <span>
              <Check size={13} /> Consulta
            </span>
            <ArrowRight size={16} />
            <span>
              <Sparkles size={13} /> Prepara
            </span>
            <ArrowRight size={16} />
            <span>Tú decides</span>
          </div>
          <p className="example-action">{example.action}</p>
          <div className="example-tags">
            {example.tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        </div>
      </div>
      <p className="example-note">
        Elige un caso para explorar. Esta vista muestra ejemplos de uso; no
        ejecuta acciones.
      </p>
    </div>
  );
}
