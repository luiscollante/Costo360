import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { DEMO_CONTACT_URL, PRODUCT_LOGIN_URL } from "../lib/content";
import { motion, useScroll } from "framer-motion";

const links = [
  ["#producto", "El producto"],
  ["#simulador", "Simulador"],
  ["#cost", "Conoce a Cost"],
  ["#planes", "Planes"],
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("");
  const { scrollYProgress } = useScroll();
  const toggle = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const sections = links
      .map(([id]) => document.querySelector(id))
      .filter((el): el is HTMLElement => el instanceof HTMLElement);
    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(`#${entry.target.id}`);
          else visible.delete(`#${entry.target.id}`);
        }
        setActive(links.find(([id]) => visible.has(id))?.[0] ?? "");
      },
      { rootMargin: "-15% 0px -35% 0px" },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);
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
      <motion.div
        className="reading-progress"
        style={{ scaleX: scrollYProgress }}
        aria-hidden="true"
      />
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
            <a
              key={href}
              href={href}
              aria-current={active === href ? "location" : undefined}
            >
              {active === href && (
                <motion.span
                  className="nav-active-light"
                  layoutId="nav-light"
                  transition={{ type: "spring", stiffness: 320, damping: 32 }}
                  aria-hidden="true"
                />
              )}
              {label}
            </a>
          ))}
        </div>
        <div className="nav-actions">
          <a href={PRODUCT_LOGIN_URL} className="login-link">
            Iniciar sesión <ArrowUpRight size={15} />
          </a>
          <a
            href={DEMO_CONTACT_URL ? "#contacto" : "#producto"}
            className="button button-small"
          >
            {DEMO_CONTACT_URL ? "Hablemos" : "Ver producto"}{" "}
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
          <a href="#planes" onClick={() => setOpen(false)}>
            Comprar un plan
          </a>
        </div>
      </nav>
    </header>
  );
}
