import {
  ArrowUpRight,
  BarChart3,
  Check,
  Monitor,
  ShieldCheck,
  Sparkles,
  UsersRound,
  Zap,
} from "lucide-react";
import { PRODUCT_CHECKOUT_URL } from "../lib/content";

// Cupos: ARQUITECTURA_MAESTRA.md §7.1; registro: backend/agente/bitacora.py.
// Cost en Starter: decisión del fundador del 2026-09-22. Su cupo técnico
// debe habilitarse antes de publicar esta oferta (docs/PLANES_LANDING.md).
const plans = [
  {
    name: "Starter",
    codigo: "starter",
    price: "$150.000",
    count: "1",
    unit: "usuario",
    subtitle: "Cotiza con confianza.",
    features: [
      "Cotización Directa, Express y AIU",
      "Cotizaciones y cuentas de cobro en PDF",
      "Inventario, retales y planos de corte",
      "Proyectos, tareas y dashboard",
      "Cost incluido: consulta, calcula y ejecuta*",
      "Registro de acciones de Cost: 1 día",
    ],
  },
  {
    name: "Pro",
    codigo: "pro",
    price: "$375.000",
    count: "3",
    unit: "usuarios",
    subtitle: "Tu equipo, coordinado.",
    features: [
      "Todas las herramientas de Starter",
      "Cotizaciones y proyectos compartidos",
      "Roles Admin, Gerencia y Operativo",
      "Cost para los 3 usuarios",
      "Dashboard para Admin y Gerencia",
      "Registro de acciones de Cost: 30 días",
    ],
  },
  {
    name: "Enterprise",
    codigo: "enterprise",
    price: "$2.410.000",
    count: "Hasta 10",
    unit: "usuarios",
    subtitle: "Más equipo. Más control.",
    features: [
      "Todas las herramientas de Pro",
      "Un mismo entorno para todo el equipo",
      "Permisos según la responsabilidad",
      "Cost para cada usuario",
      "Mayor capacidad mensual para usar Cost",
      "Registro de acciones de Cost: 90 días",
    ],
  },
];

const trustItems = [
  { icon: ShieldCheck, label: "Cotizaciones con tus costos" },
  { icon: BarChart3, label: "Cost incluido en todos los planes" },
  { icon: Monitor, label: "Acceso desde el navegador" },
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
          Menos tareas repetitivas.
          <br />
          <span>Más tiempo para tu taller.</span>
        </h2>
        <p>
          Suscripciones mensuales por taller, en pesos colombianos.
          <br className="desktop-break" /> Cost incluido desde Starter. Elige
          según tu equipo y el seguimiento que necesitas.
        </p>
      </div>
      <div className="plans-grid">
        {plans.map(
          ({ name, codigo, price, count, unit, subtitle, features }) => {
            const featured = name === "Pro";
            return (
              <article
                key={name}
                className={`plan-card plan-card-${codigo} ${featured ? "plan-featured" : ""}`}
              >
                {featured && (
                  <span className="plan-badge">
                    <UsersRound size={13} strokeWidth={2.5} />
                    Para colaborar
                  </span>
                )}
                <div className="plan-header">
                  <img
                    className="plan-stone-art"
                    src={`/media/plans/${codigo}-stone.png`}
                    alt=""
                    width={1280}
                    height={1280}
                    loading="lazy"
                    decoding="async"
                  />
                  <p className="plan-eyebrow">Plan</p>
                  <h3>{name}</h3>
                  <p className="plan-subtitle">{subtitle}</p>
                </div>
                <div className="plan-team">
                  <p className="plan-seats">
                    <strong>{count}</strong> {unit}
                  </p>
                  <p className="plan-team-detail">
                    {codigo === "starter"
                      ? "Tu cuenta de administrador"
                      : codigo === "pro"
                        ? "1 administrador + 2 integrantes"
                        : "1 administrador y su equipo"}
                  </p>
                </div>
                <ul className="plan-features">
                  {features.map((feature) => (
                    <li key={feature}>
                      <span className="check-badge" aria-hidden="true">
                        <Check size={11} strokeWidth={3} />
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <div className="plan-purchase">
                  <div className="plan-price">
                    {price} <span>COP / mes</span>
                  </div>
                  <a
                    href={`${PRODUCT_CHECKOUT_URL}?plan=${codigo}`}
                    className={`button ${featured ? "" : "button-outline"}`}
                  >
                    Comenzar con {name} <ArrowUpRight size={17} />
                  </a>
                  <p className="plan-footnote">
                    <Zap size={13} /> Acceso tras confirmar el pago.
                  </p>
                  {featured && (
                    <div className="plan-mascot-wrap">
                      <p className="plan-mascot-note">
                        Cost se encarga.
                        <br />
                        Tú avanzas.
                      </p>
                      <img
                        src="/media/plans/cost-pricing.png"
                        alt=""
                        className="plan-mascot"
                        width={1280}
                        height={1280}
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                  )}
                </div>
              </article>
            );
          },
        )}
      </div>
      <div className="pricing-cost-included">
        <Sparkles size={23} aria-hidden="true" />
        <div>
          <h3>Cost trabaja tras bambalinas. Tú mantienes el control.</h3>
          <p>
            En todos los planes, consulta tus datos, calcula cotizaciones y
            prepara acciones sobre materiales, inventario y proyectos. Tú
            confirmas; Cost ejecuta.
          </p>
        </div>
      </div>
      <p className="pricing-note" id="pricing-conditions">
        *Cost requiere tu confirmación para crear, editar o borrar datos. El uso
        de Cost tiene referencias mensuales por empresa; la voz se mide por
        usuario (Starter: 5, Pro: 10, Enterprise: 15 mensajes de referencia al
        mes). El registro de acciones de Cost conserva 1 día en Starter, 30 en
        Pro y 90 en Enterprise; estos plazos no corresponden al historial de
        cotizaciones. Los permisos de cada rol determinan el acceso a los datos
        y al dashboard.
      </p>
      <div className="pricing-bottom">
        <ul className="pricing-trust">
          {trustItems.map(({ icon: Icon, label }) => (
            <li className="trust-item" key={label}>
              <Icon size={18} strokeWidth={1.6} aria-hidden="true" />
              <span>{label}</span>
            </li>
          ))}
        </ul>
        <div className="pricing-brand">
          <img
            src="/logo_versiones_oscuras.png"
            alt="Costo360"
            width="640"
            height="213"
            loading="lazy"
          />
          <span>Más control. Mayores posibilidades.</span>
        </div>
      </div>
    </section>
  );
}
