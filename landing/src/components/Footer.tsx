import { ArrowUpRight, ArrowUp } from "lucide-react";
import { DEMO_CONTACT_URL, PRODUCT_LOGIN_URL } from "../lib/content";
import { MagneticLink } from "./ui/Tactile";
export function Footer() {
  return (
    <>
      <section
        className="contact-section container"
        id="contacto"
        aria-labelledby="contact-title"
      >
        <div className="contact-art" aria-hidden="true">
          <div />
          <div />
          <div />
        </div>
        <div className="contact-copy">
          <p className="eyebrow">TU PRÓXIMA COTIZACIÓN EMPIEZA AQUÍ</p>
          <h2 id="contact-title">
            Tú conoces la piedra.
            <br />
            <span>Dale claridad a tus costos.</span>
          </h2>
          <p>
            Cotiza, organiza tus materiales y coordina tus proyectos con
            Costo360. Elige una suscripción mensual con Cost incluido.
          </p>
          <div className="contact-actions">
            {DEMO_CONTACT_URL ? (
              <a
                className="button"
                href={DEMO_CONTACT_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                Solicitar una demo <ArrowUpRight size={18} />
              </a>
            ) : (
              <MagneticLink href="#planes">
                Encuentra tu plan <ArrowUpRight size={18} />
              </MagneticLink>
            )}
            <a className="text-button" href={PRODUCT_LOGIN_URL}>
              Ya tengo una cuenta <ArrowUpRight size={17} />
            </a>
          </div>
        </div>
      </section>
      <footer className="site-footer">
        <div className="container">
          <div className="footer-main">
            <div className="footer-brand">
              <a
                className="brand"
                href="#inicio"
                aria-label="Costo360, volver al inicio"
              >
                <img
                  src="/logo_versiones_oscuras.png"
                  alt="Costo360"
                  width="640"
                  height="213"
                  loading="lazy"
                />
              </a>
              <p>
                Tecnología para empresas de la industria de la piedra.
                <br />
                Pensado para el oficio. Hecho en Colombia.
              </p>
            </div>
            <nav aria-label="Enlaces del pie de página">
              <a href="#producto">Producto real</a>
              <a href="#solucion">La solución</a>
              <a href="#simulador">Simulador ilustrativo</a>
              <a href="#cost">Asistente Cost</a>
              <a href="#planes">Planes</a>
              <a href="#faq">Preguntas frecuentes</a>
              <a href={PRODUCT_LOGIN_URL}>
                Ir a la plataforma <ArrowUpRight size={14} />
              </a>
            </nav>
          </div>
          <div className="footer-bottom">
            <p>© {new Date().getFullYear()} Costo360</p>
            <span>Del oficio a los datos.</span>
            <a href="#inicio" className="back-top" aria-label="Volver arriba">
              <ArrowUp size={18} />
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
