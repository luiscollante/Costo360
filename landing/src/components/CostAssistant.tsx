import { ArrowRight, ArrowUpRight, ShieldCheck, Sparkles } from "lucide-react";
import { costScreen } from "../lib/productScreens";
import { CostPreview } from "./CostPreview";

export function CostAssistant() {
  return (
    <section
      className="cost-section section atelier-cost"
      id="cost"
      aria-labelledby="cost-title"
    >
      <div className="cost-glow" aria-hidden="true" />
      <div className="container cost-real-layout">
        <div className="cost-copy">
          <p className="eyebrow">04 / CONOCE A COST</p>
          <h2 id="cost-title">
            Delega lo repetitivo.
            <br />
            <em>
              La última palabra
              <br />
              sigue siendo tuya.
            </em>
          </h2>
          <p>
            Cost trabaja tras bambalinas: consulta los datos de tu taller,
            calcula cotizaciones y prepara cambios en materiales, inventario y
            proyectos. Tú revisas y confirmas; él ejecuta. Incluido en todos los
            planes, desde Starter.
          </p>
          <a className="text-button light-link" href="#planes">
            Elige tu plan con Cost <ArrowRight size={18} />
          </a>
          <div className="atelier-proof">
            <span>
              <Sparkles size={17} /> Menos tareas repetitivas
            </span>
            <span>
              <ShieldCheck size={17} /> Tú mantienes el control
            </span>
          </div>
        </div>
        <div className="cost-editorial-stage">
          <img
            className="cost-mascot"
            src="/media/editorial/cost-guide.webp"
            alt="Cost, el asistente de Costo360, con su tableta."
            width="1024"
            height="1536"
            loading="lazy"
            decoding="async"
          />
          <div className="cost-workflow">
            <CostPreview />
            <div className="human-rule">
              <ShieldCheck size={23} />
              <div>
                <strong>Sin tu confirmación, no hay cambios.</strong>
                <p>La decisión permanece en manos de tu equipo.</p>
              </div>
            </div>
          </div>
        </div>
        <details className="cost-real-disclosure">
          <summary>
            Del ejemplo al producto: ver la pantalla real de Cost{" "}
            <ArrowRight size={17} />
          </summary>
          <figure className="product-capture cost-capture">
            <a
              href={costScreen.src}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Ampliar captura: inicio de Cost (abre una pestaña nueva)"
            >
              <img {...costScreen} loading="lazy" decoding="async" />
              <span className="capture-zoom">
                Ampliar captura <ArrowUpRight size={16} />
              </span>
            </a>
            <figcaption>
              <strong>Pantalla real · Cuenta de demostración.</strong> Inicio de
              Cost antes de conversar. Esta captura no es una conversación
              activa ni consulta datos del producto.
            </figcaption>
          </figure>
        </details>
      </div>
    </section>
  );
}
