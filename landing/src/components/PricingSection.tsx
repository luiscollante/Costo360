import { ArrowUpRight, Check, UserRound, UsersRound } from "lucide-react";
import { PRODUCT_CHECKOUT_URL } from "../lib/content";

// Mismo set de funciones para los 3 planes -- lo único que cambia entre
// planes es el cupo de usuarios y el precio (ver tabla `planes` del backend,
// no hay columnas de features por plan). Mostrar esto explícito en vez de
// una sola frase genérica es lo que reemplaza el "Precio a consultar" /
// descripción vaga de antes.
const features = [
  "Cotización Directa, Express y con AIU",
  "Nesting 2D con plano de corte imprimible",
  "Inventario de láminas y banco de retales",
  "Proyectos: tablero Kanban, hitos y horas",
  "Asistente Cost (IA) con confirmación humana",
];

const plans = [
  {
    name: "Starter",
    codigo: "starter",
    price: "$150.000",
    count: "1",
    unit: "usuario",
    subtitle: "Tu taller, un punto de partida.",
    icon: UserRound,
  },
  {
    name: "Pro",
    codigo: "pro",
    price: "$375.000",
    count: "3",
    unit: "usuarios",
    subtitle: "Más personas, un mismo equipo.",
    icon: UsersRound,
  },
  {
    name: "Enterprise",
    codigo: "enterprise",
    price: "$2.410.000",
    count: "10",
    unit: "usuarios como máximo",
    subtitle: "Espacio para un equipo más amplio.",
    icon: UsersRound,
  },
];
export function PricingSection() {
  return (
    <section
      className="section container pricing"
      id="planes"
      aria-labelledby="pricing-title"
    >
      <div className="section-heading centered">
        <p className="eyebrow">05 / UN PLAN PARA TU EQUIPO</p>
        <h2 id="pricing-title">
          El siguiente paso de tu taller.
          <br />
          <span>A tu escala.</span>
        </h2>
        <p>
          Suscripciones mensuales por taller, en pesos colombianos.
          <br className="desktop-break" /> Elige el plan que se adapta a tu
          equipo.
        </p>
      </div>
      <div className="plans-grid">
        {plans.map(
          ({ name, codigo, price, count, unit, subtitle, icon: Icon }) => (
            <article
              key={name}
              className={`plan-card ${name === "Pro" ? "plan-featured" : ""}`}
            >
              <div className="plan-heading">
                <Icon size={22} />
                <h3>{name}</h3>
                {name === "Pro" && <span>EN EQUIPO</span>}
              </div>
              <p className="plan-subtitle">{subtitle}</p>
              <div className="plan-capacity">
                {name === "Enterprise" && <span className="up-to">Hasta</span>}
                <strong>{count}</strong>
                <span>{unit}</span>
              </div>
              <ul className="plan-features">
                {features.map((feature) => (
                  <li key={feature}>
                    <Check size={13} />
                    {feature}
                  </li>
                ))}
              </ul>
              <div className="plan-price">
                {price} <span>COP / mes</span>
              </div>
              <a
                href={`${PRODUCT_CHECKOUT_URL}?plan=${codigo}`}
                className={`button ${name === "Pro" ? "" : "button-outline"}`}
              >
                Comprar {name} <ArrowUpRight size={17} />
              </a>
              <p className="plan-footnote">
                <Check size={14} /> Activación inmediata, sin instalación
              </p>
            </article>
          ),
        )}
      </div>
      <p className="pricing-note">
        Las mismas funciones en los 3 planes -- la diferencia es el número de
        usuarios que caben en tu cuenta.
      </p>
    </section>
  );
}
