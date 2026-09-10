import { useState } from "react";
import {
  ArrowRight,
  Check,
  LockKeyhole,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
const scenarios = [
  {
    label: "Proyectos",
    prompt: "Crea una tarea para revisar las medidas del mesón.",
    response:
      "Puedo proponer una tarea para tu proyecto. Antes de guardarla, revisa y confirma el cambio.",
    action: "Crear tarea",
    detail: "Revisar medidas del mesón",
    done: "Tarea añadida al ejemplo local.",
  },
  {
    label: "Inventario",
    prompt: "Quiero registrar el sobrante de esta lámina.",
    response:
      "Puedo ayudarte con el banco de retales. En el producto confirmaríamos material, medidas y precio de recuperación antes de guardar.",
    action: "Registrar retal",
    detail: "Sobrante de lámina · Datos de ejemplo",
    done: "Retal añadido al ejemplo local.",
  },
  {
    label: "Cotización",
    prompt: "Ayúdame a crear una cotización para este proyecto.",
    response:
      "Podemos definir las piezas y calcular la propuesta en la conversación. Tú revisas el desglose antes de confirmar su creación.",
    action: "Crear cotización",
    detail: "Propuesta ilustrativa · Sin precio comercial",
    done: "Cotización añadida al ejemplo local.",
  },
];
export function CostAssistant() {
  const [selected, setSelected] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const scenario = scenarios[selected];
  function reset() {
    setConfirmed(false);
    setCancelled(false);
  }
  return (
    <section
      className="cost-section section"
      id="cost"
      aria-labelledby="cost-title"
    >
      <div className="cost-glow" aria-hidden="true" />
      <div className="container cost-layout">
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
          <div className="human-rule">
            <ShieldCheck size={23} />
            <div>
              <strong>Sin tu confirmación, no hay cambios.</strong>
              <p>
                Cualquier acción que escriba o borre datos necesita tu
                aprobación antes de ejecutarse.
              </p>
            </div>
          </div>
          <a className="text-button light-link" href="#contacto">
            Conoce c?mo acceder <ArrowRight size={18} />
          </a>
        </div>
        <div className="chat-window">
          <div className="chat-header">
            <span className="assistant-avatar">
              <Sparkles size={21} />
            </span>
            <div>
              <h3>Cost</h3>
              <p>Tu asistente de taller</p>
            </div>
            <span className="chat-demo">DEMO GUIADA</span>
          </div>
          <div
            className="scenario-tabs"
            role="group"
            aria-label="Escenario de la conversación"
          >
            {scenarios.map((item, index) => (
              <button
                key={item.label}
                type="button"
                aria-pressed={selected === index}
                className={selected === index ? "active" : ""}
                onClick={() => {
                  setSelected(index);
                  reset();
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="chat-content">
            <p className="user-bubble">{scenario.prompt}</p>
            <div className="assistant-message">
              <Sparkles size={16} />
              <p>{scenario.response}</p>
            </div>
            <div className="confirmation-card">
              <div className="confirmation-heading">
                <LockKeyhole size={15} />
                <span>REQUIERE TU CONFIRMACIÓN</span>
              </div>
              <h4>{scenario.action}</h4>
              <p>{scenario.detail}</p>
              {!confirmed && !cancelled ? (
                <div className="confirmation-buttons">
                  <button
                    className="button button-small"
                    type="button"
                    onClick={() => setConfirmed(true)}
                  >
                    Confirmar ejemplo <Check size={15} />
                  </button>
                  <button
                    type="button"
                    className="cancel-button"
                    onClick={() => setCancelled(true)}
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <div className="confirmation-result" role="status">
                  <p>
                    <Check size={17} />
                    {confirmed
                      ? scenario.done
                      : "Acción cancelada. Nada cambió."}
                  </p>
                  <button type="button" className="text-button" onClick={reset}>
                    <RotateCcw size={14} /> Repetir ejemplo
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="chat-footer">
            <InfoIcon />
            <p>
              Conversación de ejemplo, no IA en vivo. Ninguna acción modifica
              datos reales.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
function InfoIcon() {
  return <ShieldCheck size={17} aria-hidden="true" />;
}
