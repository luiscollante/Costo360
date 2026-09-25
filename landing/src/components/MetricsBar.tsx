import { Calculator, FileText, ScanLine, Sparkles } from "lucide-react";
const capabilities = [
  {
    icon: Calculator,
    title: "Cotiza sin adivinar",
    text: "Ten en cuenta cada costo",
  },
  {
    icon: ScanLine,
    title: "Aprovecha tu material",
    text: "Mira cómo caben tus piezas",
  },
  { icon: FileText, title: "Propuestas en PDF", text: "Listas para compartir" },
  {
    icon: Sparkles,
    title: "Menos trabajo repetido",
    text: "Cost propone. Tú confirmas.",
  },
];
export function MetricsBar() {
  return (
    <section className="capabilities" aria-label="Capacidades del producto">
      <div className="container capability-grid">
        {capabilities.map(({ icon: Icon, title, text }) => (
          <div className="capability" key={title}>
            <Icon size={23} strokeWidth={1.5} />
            <div>
              <h2>{title}</h2>
              <p>{text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
