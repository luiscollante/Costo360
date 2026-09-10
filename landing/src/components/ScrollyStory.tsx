import {
  ArrowDownRight,
  Ruler,
  SlidersHorizontal,
  FileCheck2,
} from "lucide-react";
import { ProcessFilm } from "./ProcessFilm";
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
export function ScrollyStory({ paused }: { paused: boolean }) {
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
      <div className="steps">
        {steps.map(({ icon: Icon, title, text, label }, index) => (
          <article className="step" key={title}>
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
      <ProcessFilm paused={paused} />
    </section>
  );
}
