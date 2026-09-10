import { useEffect, useState } from "react";
import { ArrowUpRight, ScanLine } from "lucide-react";
import { productScreens } from "../lib/productScreens";

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
            No es un mockup.
            <br />
            <span>Es tu próxima herramienta.</span>
          </h2>
        </div>
        <p>
          Capturas reales del producto.
          <br />
          Cuenta de demostración con datos de prueba.
          <br />
          Sin resultados de clientes ni cifras de ahorro prometidas.
        </p>
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
              <span className="mono">0{index + 1}</span>
              {screen.label}
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
          Prueba el modelo interactivo <ArrowUpRight size={17} />
        </a>
      </div>
    </section>
  );
}
