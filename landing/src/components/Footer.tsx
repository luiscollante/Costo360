import { ArrowUpRight, ArrowUp, Pause, Play } from "lucide-react";
import { DEMO_CONTACT_URL, PRODUCT_LOGIN_URL } from "../lib/content";
export function Footer({
  paused,
  onToggleMotion,
}: {
  paused: boolean;
  onToggleMotion: () => void;
}) {
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
            Costo360 está en etapa de lanzamiento y el acceso es por invitación.
            Conoce cómo se conectan las piezas de tu taller.
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
              <a className="button" href="#simulador">
                Explorar demostración <ArrowUpRight size={18} />
              </a>
            )}
            <a className="text-button" href={PRODUCT_LOGIN_URL}>
              Ya tengo una invitación <ArrowUpRight size={17} />
            </a>
          </div>
          {!DEMO_CONTACT_URL && (
            <p className="contact-pending">
              El canal público de solicitud de demos estará disponible
              próximamente. Esta página no recoge ni envía solicitudes.
            </p>
          )}
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
                Software de cotización para talleres de piedra.
                <br />
                Pensado para el oficio. Hecho en Colombia.
              </p>
            </div>
            <nav aria-label="Enlaces del pie de página">
              <a href="#solucion">La solución</a>
              <a href="#simulador">Demo interactiva</a>
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
            <button
              type="button"
              onClick={onToggleMotion}
              aria-pressed={paused}
              className="motion-toggle"
            >
              {paused ? <Play size={14} /> : <Pause size={14} />}
              {paused ? "Reanudar movimiento" : "Pausar movimiento"}
            </button>
            <a href="#inicio" className="back-top" aria-label="Volver arriba">
              <ArrowUp size={18} />
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
