import { ArrowUpRight, Check, UserRound, UsersRound } from "lucide-react";
const plans = [
  {
    name: "Starter",
    count: "1",
    unit: "usuario",
    subtitle: "Tu taller, un punto de partida.",
    icon: UserRound,
    description: "Para centralizar el trabajo en una cuenta de usuario.",
  },
  {
    name: "Pro",
    count: "3",
    unit: "usuarios",
    subtitle: "Más personas, un mismo equipo.",
    icon: UsersRound,
    description: "Para compartir el uso de Costo360 con tu equipo.",
  },
  {
    name: "Enterprise",
    count: "10",
    unit: "usuarios como máximo",
    subtitle: "Espacio para un equipo más amplio.",
    icon: UsersRound,
    description: "Para talleres que necesitan acceso para hasta diez personas.",
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
          Suscripciones mensuales. Conversemos sobre tus necesidades
          <br className="desktop-break" /> y confirma con el equipo el precio y
          alcance de cada plan.
        </p>
      </div>
      <div className="plans-grid">
        {plans.map(
          ({ name, count, unit, subtitle, icon: Icon, description }) => (
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
              <p className="plan-description">{description}</p>
              <div className="plan-price">
                Precio a consultar <span>/ mes</span>
              </div>
              <a
                href="#contacto"
                className={`button ${name === "Pro" ? "" : "button-outline"}`}
              >
                Acceso al plan {name} <ArrowUpRight size={17} />
              </a>
              <p className="plan-footnote">
                <Check size={14} /> Alta por invitación
              </p>
            </article>
          ),
        )}
      </div>
      <p className="pricing-note">
        Las capacidades del producto no implican que estén incluidas en todos
        los planes. Confirma funciones, condiciones y precio antes de contratar.
      </p>
    </section>
  );
}
