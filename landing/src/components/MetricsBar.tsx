import { Calculator, FileText, ScanLine, Sparkles } from "lucide-react";
const capabilities = [
  {
    icon: Calculator,
    title: "Costos desglosados",
    text: "Directa, Express y AIU",
  },
  {
    icon: ScanLine,
    title: "Cortes con criterio",
    text: "Optimización Guillotine 2D",
  },
  { icon: FileText, title: "Propuestas en PDF", text: "Listas para compartir" },
  {
    icon: Sparkles,
    title: "IA bajo tu control",
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
