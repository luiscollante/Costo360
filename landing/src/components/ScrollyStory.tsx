import {
  ArrowDownRight,
  Ruler,
  SlidersHorizontal,
  FileCheck2,
} from "lucide-react";
import { useRef, useState } from "react";
import { motion, useMotionValueEvent, useScroll } from "framer-motion";
const steps = [
  {
    icon: Ruler,
    title: "Empieza por la pieza.",
    text: "Material, medidas y cantidades. Define lo que vas a fabricar, sin perder de vista cada parte del proyecto.",
    label: "MATERIAL + MEDIDAS",
  },
  {
    icon: SlidersHorizontal,
    title: "Ponle tus costos.",
    text: "Mano de obra, insumos, maquinaria y riesgo de rotura. Cotiza con los parámetros que tú configuras para tu taller.",
    label: "TARIFAS DEL TALLER",
  },
  {
    icon: FileCheck2,
    title: "Entrega una propuesta.",
    text: "Revisa el desglose y genera un PDF profesional. Después, da seguimiento al trabajo desde proyectos.",
    label: "COTIZACIÓN + PROYECTO",
  },
];
export function ScrollyStory() {
  const journey = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState(0);
  const { scrollYProgress } = useScroll({
    target: journey,
    offset: ["start center", "end center"],
  });
  useMotionValueEvent(scrollYProgress, "change", (progress) => {
    setStage(Math.min(2, Math.floor(progress * 3)));
  });
  return (
    <section
      className="section container story"
      id="solucion"
      aria-labelledby="story-title"
    >
      <div className="section-heading split-heading">
        <div>
          <p className="eyebrow">01 / UNA FORMA MÁS CLARA DE TRABAJAR</p>
          <h2 id="story-title">
            El detalle hace la diferencia.
            <br />
            <span>También en tus números.</span>
          </h2>
        </div>
        <p>
          Tu experiencia mueve el taller.
          <br />
          Costo360 organiza la información
          <br />
          con la que tomas cada decisión.
        </p>
      </div>
      <div className="workshop-journey" ref={journey}>
        <div className="journey-sticky">
          <div className="journey-scene" data-stage={stage}>
            <div className="journey-scene-top">
              <span className="mono">DEL OFICIO A LOS DATOS</span>
              <span className="mono">0{stage + 1} / 03</span>
            </div>
            <div className="journey-art" aria-hidden="true">
              <div className="journey-blueprint">
                <span className="blueprint-measure">
                  MATERIAL · MEDIDAS · CANTIDAD
                </span>
                <div className="blueprint-stone">
                  <i />
                  <i />
                  <i />
                  <i />
                  <span className="blueprint-scan" />
                </div>
                <span className="blueprint-caption">
                  Cada pieza tiene su lugar.
                </span>
              </div>
              <div className="journey-ledger">
                <span className="ledger-title">
                  El costo está en los detalles.
                </span>
                {[
                  "Material",
                  "Mano de obra",
                  "Insumos y maquinaria",
                  "Riesgo de rotura",
                ].map((item, i) => (
                  <div key={item} style={{ "--row": i } as React.CSSProperties}>
                    <span>{item}</span>
                    <span className="ledger-line" />
                  </div>
                ))}
                <strong>Tus parámetros. Tu cálculo.</strong>
              </div>
              <div className="journey-proposal">
                <FileCheck2 size={28} />
                <span className="proposal-brand">Costo360</span>
                <strong>
                  Tu próxima
                  <br />
                  gran propuesta.
                </strong>
                <div className="proposal-lines">
                  <i />
                  <i />
                  <i />
                </div>
                <span className="proposal-seal">PDF PROFESIONAL</span>
              </div>
            </div>
            <div
              className="journey-controls"
              role="group"
              aria-label="Etapas del proceso"
            >
              {["Material", "Costos", "Propuesta"].map((label, index) => (
                <button
                  key={label}
                  type="button"
                  aria-pressed={stage === index}
                  onClick={() => setStage(index)}
                >
                  <span>0{index + 1}</span>
                  {label}
                </button>
              ))}
            </div>
            <p className="journey-disclaimer">
              Recorrido ilustrativo del proceso.
            </p>
          </div>
        </div>
        <div className="journey-steps">
          <div className="journey-track" aria-hidden="true">
            <motion.div style={{ scaleY: scrollYProgress }} />
          </div>
          {steps.map(({ icon: Icon, title, text, label }, index) => (
            <article
              className="journey-step"
              data-active={stage === index}
              key={title}
            >
              <div className="step-top">
                <span className="step-number">0{index + 1}</span>
                <Icon size={25} strokeWidth={1.4} />
              </div>
              <h3>{title}</h3>
              <p>{text}</p>
              <div className="step-foot">
                <span>{label}</span>
                <ArrowDownRight size={18} />
              </div>
            </article>
          ))}
        </div>
      </div>
      <div className="quote-modes" aria-labelledby="quote-modes-title">
        <h3 id="quote-modes-title">Una modalidad para cada propuesta.</h3>
        <div>
          <article>
            <h4>Directa</h4>
            <p>
              El detalle del proyecto: material, piezas, mano de obra, zócalos y
              adicionales por etapa.
            </p>
          </article>
          <article>
            <h4>Express</h4>
            <p>
              Una versión rápida del asistente para preparar una cotización.
            </p>
          </article>
          <article>
            <h4>AIU</h4>
            <p>
              Administración, Imprevistos y Utilidad para licitaciones y obra
              pública en Colombia. IVA sobre la Utilidad.
            </p>
          </article>
        </div>
        <p className="mode-note">
          La modalidad AIU no sustituye la revisión tributaria que corresponda a
          tu contrato.
        </p>
      </div>
    </section>
  );
}
