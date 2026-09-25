import { ArrowUpRight, ArrowUp, Check } from "lucide-react";
import { PRODUCT_LOGIN_URL } from "../lib/content";
import { MagneticLink } from "./ui/Tactile";
export function Footer() {
  return (
    <>
      <section
        className="atelier-cta"
        id="contacto"
        aria-labelledby="contact-title"
      >
        <div className="container atelier-cta-grid">
          <div className="atelier-copy">
            <p className="eyebrow">TU PRÓXIMA COTIZACIÓN EMPIEZA AQUÍ</p>
            <h2 id="contact-title">
              Haz que cada
              <br />
              cotización cuente.
              <br />
              <em>
                Empieza con
                <br />
                Costo360 hoy.
              </em>
            </h2>
            <p>
              La próxima vez que te pidan un precio, ten tus cuentas a la mano.
              Reúne tus costos, revisa lo que vas a cobrar y presenta una
              propuesta clara con Costo360.
            </p>
            <div className="atelier-actions">
              <button
                className="button"
                onClick={() =>
                  window.dispatchEvent(new Event("costo360:open-chat"))
                }
              >
                Conversemos sobre tu taller <ArrowUpRight size={18} />
              </button>
              <MagneticLink href="#planes" className="button button-outline">
                Ver planes <ArrowUpRight size={17} />
              </MagneticLink>
            </div>
            <div className="atelier-proof">
              <span>
                <Check size={16} /> Cost en todos los planes
              </span>
              <span>
                <Check size={16} /> Suscripción mensual por empresa
              </span>
            </div>
          </div>
          <div className="atelier-cta-art">
            <img
              src="/media/editorial/cta-workshop.webp"
              alt="Cost te da la bienvenida junto a un mesón de piedra terminado. Ilustración de marca."
              width="1536"
              height="1024"
              loading="lazy"
              decoding="async"
            />
            <div className="atelier-cta-note">
              <span>TU EXPERIENCIA, CON LAS CUENTAS CLARAS</span>
              <strong>
                Tu próximo trabajo.
                <br />
                Una decisión más clara.
              </strong>
            </div>
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
              <a href="#simulador">Prueba el plano de corte</a>
              <a href="#cost">Asistente Cost</a>
              <a href="#planes">Planes</a>
              <a href="#faq">Preguntas frecuentes</a>
              <a href="/privacidad/">Privacidad y datos personales</a>
              <a href={PRODUCT_LOGIN_URL}>
                Ir a la plataforma <ArrowUpRight size={14} />
              </a>
            </nav>
          </div>
          <div className="footer-bottom">
            <p>
              © {new Date().getFullYear()} Costo360 S.A.S. (en constitución) ·{" "}
              <a href="/privacidad/">Política de tratamiento de datos</a>
            </p>
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
