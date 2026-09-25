import { useState } from "react";
import {
  ArrowUpRight,
  Check,
  ChartNoAxesCombined,
  Layers3,
  Play,
} from "lucide-react";
import { materials } from "../lib/content";
import { MagneticLink } from "./ui/Tactile";

export function Hero() {
  const [selected, setSelected] = useState(0);
  return (
    <section className="atelier-hero" id="inicio" aria-labelledby="hero-title">
      <div className="container atelier-hero-layout">
        <div className="atelier-copy">
          <p className="eyebrow">
            <span className="editorial-rule" /> HECHO PARA EL OFICIO. PENSADO
            PARA TU EMPRESA.
          </p>
          <h1 id="hero-title">
            Deja de cotizar
            <br />a ojo.
            <br />
            Empieza a saber
            <br />
            <em>cuánto ganas.</em>
          </h1>
          <p className="hero-description">
            ¿Terminas un trabajo y no sabes cuánto te quedó? Costo360 ayuda a
            marmolerías y talleres de piedra a reunir material, mano de obra e
            insumos para <strong>saber cuánto cuesta antes de dar un precio.</strong>
          </p>
          <div className="atelier-actions">
            <MagneticLink href="#producto">
              Quiero conocer Costo360 <ArrowUpRight size={18} />
            </MagneticLink>
            <a className="text-button" href="#simulador">
              <Play size={14} /> Ver cómo funciona
            </a>
          </div>
          <div className="atelier-proof">
            <span>
              <Check size={16} /> Para talleres de piedra en Colombia
            </span>
            <span>
              <Check size={16} /> Cost incluido desde Starter
            </span>
          </div>
        </div>
        <div className="atelier-hero-art">
          <img
            className="atelier-scene-image"
            src="/media/editorial/hero-workshop.webp"
            alt="Cost junto a un despiece de mármol en un taller de piedra. Ilustración de marca."
            width="1536"
            height="1024"
            fetchPriority="high"
          />
          <div className="atelier-callout hero-value">
            <ChartNoAxesCombined size={23} />
            <div>
              <strong>Cuida lo que ganas</strong>
              <span>Conoce tus costos antes de cotizar.</span>
            </div>
          </div>
          <div className="atelier-sample" aria-live="polite">
            <img
              src={materials[selected].image}
              alt=""
              width="42"
              height="42"
            />
            <div>
              <span>MATERIALES DE TU OFICIO</span>
              <strong>
                {materials[selected].name} / {materials[selected].reference}
              </strong>
            </div>
          </div>
          <div className="atelier-callout hero-control">
            <Layers3 size={23} />
            <div>
              <strong>Cada pieza cuenta</strong>
              <span>Revisa qué necesitas antes de empezar.</span>
            </div>
          </div>
          <div
            className="atelier-materials"
            role="group"
            aria-label="Material de la visualización"
          >
            {materials.map((item, i) => (
              <button
                key={item.name}
                aria-label={`Ver ${item.name}`}
                aria-pressed={selected === i}
                onClick={() => setSelected(i)}
              >
                <span style={{ backgroundImage: `url('${item.image}')` }} />
                {item.name}
              </button>
            ))}
          </div>
          <span className="atelier-art-caption">
            Ilustración de marca · Explora las pantallas reales a continuación.
          </span>
        </div>
      </div>
    </section>
  );
}
