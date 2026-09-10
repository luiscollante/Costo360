import { ArrowRight, ArrowUpRight, ShieldCheck, Sparkles } from "lucide-react";
import { costScreen } from "../lib/productScreens";

export function CostAssistant() {
  return (
    <section
      className="cost-section section"
      id="cost"
      aria-labelledby="cost-title"
    >
      <div className="cost-glow" aria-hidden="true" />
      <div className="container cost-real-layout">
        <div className="cost-copy">
          <p className="eyebrow">04 / CONOCE A COST</p>
          <div className="cost-symbol" aria-hidden="true">
            <Sparkles size={33} strokeWidth={1.3} />
            <span className="cost-orbit" />
          </div>
          <h2 id="cost-title">
            Una IA que propone.
            <br />
            <span>
              La última palabra
              <br />
              sigue siendo tuya.
            </span>
          </h2>
          <p>
            Cost no es solo un chat de preguntas y respuestas. Consulta los
            datos de tu taller, calcula cotizaciones y propone acciones dentro
            del producto.
          </p>
          <a className="text-button light-link" href="#contacto">
            Conoce cómo acceder <ArrowRight size={18} />
          </a>
        </div>
        <div className="cost-workflow">
          <h3>De la conversación a la acción.</h3>
          <ol>
            <li>
              <span className="mono">01</span>
              <div>
                <h4>Plantea lo que necesitas</h4>
                <p>
                  Trabaja con cotizaciones, proyectos y tareas, catálogo,
                  inventario, retales, nesting o parámetros.
                </p>
              </div>
            </li>
            <li>
              <span className="mono">02</span>
              <div>
                <h4>Revisa la propuesta de Cost</h4>
                <p>
                  El asistente consulta, calcula y propone. Puedes revisar el
                  detalle antes de decidir.
                </p>
              </div>
            </li>
            <li>
              <span className="mono">03</span>
              <div>
                <h4>Tú confirmas el cambio</h4>
                <p>
                  Crear, editar o borrar datos requiere tu aprobación antes de
                  ejecutarse.
                </p>
              </div>
            </li>
          </ol>
          <div className="human-rule">
            <ShieldCheck size={23} />
            <div>
              <strong>Sin tu confirmación, no hay cambios.</strong>
              <p>La decisión permanece en manos de tu equipo.</p>
            </div>
          </div>
        </div>
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
            Cost antes de conversar. Esta landing no ejecuta IA ni consulta
            datos del producto.
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
