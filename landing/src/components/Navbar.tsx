import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { DEMO_CONTACT_URL, PRODUCT_LOGIN_URL } from "../lib/content";

const links = [
  ["#solucion", "La solución"],
  ["#simulador", "Explorar demo"],
  ["#cost", "Conoce a Cost"],
  ["#planes", "Planes"],
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape" && open) {
        setOpen(false);
        toggle.current?.focus();
      }
    }
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [open]);
  return (
    <header className="site-header">
      <nav className="nav-shell container" aria-label="Navegación principal">
        <a className="brand" href="#inicio" aria-label="Costo360, inicio">
          <img
            src="/logo_versiones_oscuras.png"
            width="640"
            height="213"
            alt="Costo360"
          />
        </a>
        <div className="desktop-links">
          {links.map(([href, label]) => (
            <a key={href} href={href}>
              {label}
            </a>
          ))}
        </div>
        <div className="nav-actions">
          <a href={PRODUCT_LOGIN_URL} className="login-link">
            Iniciar sesión <ArrowUpRight size={15} />
          </a>
          <a
            href={DEMO_CONTACT_URL ? "#contacto" : "#simulador"}
            className="button button-small"
          >
            {DEMO_CONTACT_URL ? "Hablemos" : "Ver demo"}{" "}
            <ArrowUpRight size={16} />
          </a>
          <button
            ref={toggle}
            type="button"
            className="menu-toggle icon-button"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={open}
            aria-controls="mobile-navigation"
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
        <div
          id="mobile-navigation"
          className="mobile-navigation"
          hidden={!open}
        >
          {links.map(([href, label]) => (
            <a key={href} href={href} onClick={() => setOpen(false)}>
              {label}
            </a>
          ))}
          <a href={PRODUCT_LOGIN_URL}>
            Iniciar sesión <ArrowUpRight size={16} />
          </a>
          <a href="#contacto" onClick={() => setOpen(false)}>
            Acceso por invitación
          </a>
        </div>
      </nav>
    </header>
  );
}
