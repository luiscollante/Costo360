import { useEffect, useState } from "react";
import { ArrowUpRight, ScanLine } from "lucide-react";
import { productScreens } from "../lib/productScreens";
import { motion } from "framer-motion";

export function ProductTour() {
  const [selected, setSelected] = useState(0);
  const [enhanced, setEnhanced] = useState(false);
  useEffect(() => setEnhanced(true), []);

  return (
    <section
      className="product-tour section container"
      id="producto"
      aria-labelledby="product-title"
    >
      <div className="section-heading split-heading">
        <div>
          <p className="eyebrow">
            <ScanLine size={16} /> DENTRO DE COSTO360
          </p>
          <h2 id="product-title">
            Menos cuentas sueltas.
            <br />
            <span>Más claridad en cada trabajo.</span>
          </h2>
        </div>
        <div className="tour-intro">
          <img
            className="tour-intro-image"
            src="/media/editorial/tour-workbench.webp"
            alt="Ilustración de una mesa de taller con muestras de piedra, medidas, calculadora y bocetos de un mesón."
            width={1440}
            height={480}
            loading="lazy"
            decoding="async"
          />
          <p>
            Buscar precios, repetir cálculos y preguntar cómo va cada entrega
            te quita tiempo. Mira cómo puedes reunir ese trabajo en Costo360.
          </p>
        </div>
      </div>
      {enhanced && (
        <div
          className="tour-selector"
          role="group"
          aria-label="Pantallas del producto"
        >
          {productScreens.map((screen, index) => (
            <button
              key={screen.id}
              type="button"
              aria-pressed={selected === index}
              aria-controls={`screen-${screen.id}`}
              onClick={() => setSelected(index)}
            >
              {selected === index && (
                <motion.span
                  className="tour-selection"
                  layoutId="product-selection"
                  transition={{ type: "spring", stiffness: 280, damping: 30 }}
                  aria-hidden="true"
                />
              )}
              <span className="mono">0{index + 1}</span>
              <span>{screen.label}</span>
            </button>
          ))}
        </div>
      )}
      <div className="tour-panels">
        {productScreens.map((screen, index) => (
          <article
            key={screen.id}
            id={`screen-${screen.id}`}
            hidden={enhanced && selected !== index}
            className="tour-panel"
            aria-labelledby={`title-${screen.id}`}
          >
            <div className="tour-description">
              <h3 id={`title-${screen.id}`}>{screen.title}</h3>
              <p>{screen.description}</p>
            </div>
            <figure className="product-capture">
              <div className="capture-chrome" aria-hidden="true">
                <span className="chrome-dots">
                  <i />
                  <i />
                  <i />
                </span>
                <span>Costo360 / {screen.label}</span>
                <ScanLine size={15} />
              </div>
              <a
                href={screen.src}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Ampliar captura: ${screen.label} (abre una pestaña nueva)`}
              >
                <img
                  src={screen.src}
                  alt={screen.alt}
                  width={screen.width}
                  height={screen.height}
                  loading="lazy"
                  decoding="async"
                />
                <span className="capture-zoom">
                  Ampliar captura <ArrowUpRight size={16} />
                </span>
              </a>
              <figcaption>
                <strong>Producto real · Datos de prueba.</strong> {screen.note}
              </figcaption>
            </figure>
          </article>
        ))}
      </div>
      <div className="tour-next">
        <p>¿Quieres experimentar con las medidas?</p>
        <a href="#simulador" className="text-button">
          Prueba con tus medidas <ArrowUpRight size={17} />
        </a>
      </div>
    </section>
  );
}
