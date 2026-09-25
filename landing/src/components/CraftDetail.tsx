import { useState } from "react";
import {
  Layers3,
  HardHat,
  Settings2,
  TriangleAlert,
  ArrowRight,
  FileCheck2,
  Calculator,
  Ruler,
} from "lucide-react";
const details = [
  {
    title: "Material",
    icon: Layers3,
    short: "Tipo, medidas y rendimiento.",
    text: "Cada piedra tiene su costo. Parte de tu catálogo, las medidas y las cantidades que necesita el trabajo.",
  },
  {
    title: "Mano de obra",
    icon: HardHat,
    short: "El valor de tu oficio.",
    text: "Incluye el trabajo que hace posible cada pieza: cortes, ensambles, instalación y acabados según las tarifas de tu taller.",
  },
  {
    title: "Insumos y maquinaria",
    icon: Settings2,
    short: "Lo pequeño también cuenta.",
    text: "Organiza los insumos y costos de maquinaria que configuras para no dejarlos por fuera de la cotización.",
  },
  {
    title: "Riesgo de rotura",
    icon: TriangleAlert,
    short: "Anticípate a los imprevistos.",
    text: "Una pieza que se rompe puede cambiar las cuentas del trabajo. Incluye el riesgo de rotura con el valor que definas para tu taller, antes de presentar el precio.",
  },
];
export function CraftDetail() {
  const [active, setActive] = useState(0);
  return (
    <section
      className="atelier-detail"
      id="solucion"
      aria-labelledby="detail-title"
    >
      <div className="container">
        <div className="atelier-detail-grid">
          <div className="atelier-copy">
            <p className="eyebrow">
              <span className="editorial-rule" /> EL COSTO ESTÁ EN LOS DETALLES
            </p>
            <h2 id="detail-title">
              El detalle hace
              <br />
              <em>la diferencia.</em>
              <small>También en tus números.</small>
            </h2>
            <p>
              Cotizaste la piedra, pero ¿incluiste el pegante, los cortes y
              la instalación? Lo que olvidas cobrar sale de tu bolsillo.
              Revisa cada costo antes de enviar la propuesta.
            </p>
            <div
              className="detail-explanation"
              aria-live="polite"
              aria-atomic="true"
            >
              <span>0{active + 1} / QUÉ HAY DETRÁS DEL PRECIO</span>
              <h3>{details[active].title}</h3>
              <p>{details[active].text}</p>
            </div>
          </div>
          <div className="detail-art">
            <img
              src="/media/editorial/detail-countertop.webp"
              width="1448"
              height="1086"
              alt="Vista ilustrativa por capas de un mesón de mármol y las herramientas del taller."
              loading="lazy"
              decoding="async"
            />
            <div
              className="detail-hotspots"
              role="group"
              aria-label="Factores del costo"
            >
              {details.map(({ title, icon: Icon, short }, i) => (
                <button
                  className={`atelier-callout detail-spot detail-spot-${i}`}
                  key={title}
                  aria-pressed={active === i}
                  onClick={() => setActive(i)}
                >
                  <Icon size={24} />
                  <span>
                    <strong>{title}</strong>
                    <span>{short}</span>
                  </span>
                  <i aria-hidden="true" />
                </button>
              ))}
            </div>
            <span className="detail-hint">
              Selecciona un detalle para explorarlo.
            </span>
          </div>
        </div>
        <div className="atelier-process">
          {[
            {
              icon: Ruler,
              title: "Material",
              text: "Selecciona la piedra y define las medidas.",
            },
            {
              icon: Calculator,
              title: "Costos",
              text: "Revisa el cálculo con las tarifas de tu taller.",
            },
            {
              icon: FileCheck2,
              title: "Propuesta",
              text: "Presenta una cotización profesional en PDF.",
            },
          ].map(({ icon: Icon, title, text }, i) => (
            <div key={title}>
              <span className="process-number">0{i + 1}</span>
              <Icon size={28} />
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
              {i < 2 && <ArrowRight className="process-arrow" size={23} />}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
