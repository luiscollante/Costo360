import { Check, Sparkles, ArrowRight } from 'lucide-react';
import { BorderBeam } from './ui/BorderBeam';
import { GlassCard } from './ui/GlassCard';

const PLANS = [
  {
    name: 'Starter',
    subtitle: 'Para talleres individuales o en despegue',
    price: '$150.000',
    period: 'COP / mes',
    featured: false,
    users: '1 Usuario (Administrador)',
    features: [
      'Cotizador Directo y Modo Express',
      'Catálogo base de materiales y tarifas',
      'Banco digital de retales básico',
      'Generador de entregables PDF comerciales',
      'Acceso móvil y web sincronizado',
      'Soporte estándar por correo',
    ],
    cta: 'Elegir Plan Starter',
    ctaLink: 'https://app.costo360.com/registro?plan=starter',
  },
  {
    name: 'Pro',
    subtitle: 'El estándar para talleres en crecimiento',
    price: '$375.000',
    period: 'COP / mes',
    featured: true,
    badge: 'Más Popular · Mayor Retorno',
    users: '3 Usuarios (1 Admin + 2 Operativos)',
    features: [
      'Todo lo incluido en Starter',
      'Motor 2D de Nesting (Optimización de corte)',
      'Asistente Inteligente Cost con IA',
      'Módulo de Gestión de Proyectos (Tablero Kanban)',
      'Control de partes de horas e hitos de obra',
      'Campana de notificaciones automáticas',
      'Soporte prioritario por WhatsApp',
    ],
    cta: 'Probar Plan Pro Gratis',
    ctaLink: 'https://app.costo360.com/registro?plan=pro',
  },
  {
    name: 'Enterprise',
    subtitle: 'Para industrias y talleres consolidados',
    price: '$2.410.000',
    period: 'COP / mes',
    featured: false,
    users: 'Hasta 10 Usuarios de Equipo',
    features: [
      'Todo lo incluido en Pro',
      'Modo Analista de BI Senior y KPIs de negocio',
      'Multi-sucursal y control por roles personalizados',
      'Registro completo de auditoría y trazabilidad',
      'Capacitación inicial personalizada para operarios',
      'Gerente de cuenta dedicado',
    ],
    cta: 'Contactar a Ventas',
    ctaLink: 'https://app.costo360.com/contacto?plan=enterprise',
  },
];

export function PricingSection() {
  return (
    <section id="precios" className="py-24 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold text-[#6E5410] uppercase tracking-widest bg-[#F5EBD5] px-3.5 py-1 rounded-full border border-[#E5D5BA]">
            Suscripciones Transparentes
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#1A1A1A] mt-4 mb-4 tracking-tight">
            Inversión Clara que se Paga Sola el Primer Mes
          </h2>
          <p className="text-base sm:text-lg text-[#5F5F5F]">
            Sin letras pequeñas ni costos ocultos. Facturación mensual en pesos colombianos pensada para la economía real del taller.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          {PLANS.map((plan, idx) => (
            <div key={idx} className="relative flex flex-col h-full">
              {plan.featured ? (
                <div className="glass-emerald-dark text-white p-8 rounded-3xl shadow-2xl relative flex flex-col justify-between h-full border border-[#D4AF37]/50">
                  <BorderBeam size={100} duration={6} colorFrom="#D4AF37" colorTo="#F0C447" />

                  <div>
                    {plan.badge && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#15612E] text-xs font-bold text-[#F0C447] mb-4">
                        <Sparkles size={12} />
                        <span>{plan.badge}</span>
                      </div>
                    )}

                    <h3 className="text-2xl font-extrabold text-white">{plan.name}</h3>
                    <p className="text-xs text-[#A8D5BA] mt-1 mb-4">{plan.subtitle}</p>

                    <div className="mb-6 pb-6 border-b border-white/15">
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-extrabold font-mono text-white text-gold-gradient">
                          {plan.price}
                        </span>
                        <span className="text-xs text-[#F5E8D2] font-semibold">{plan.period}</span>
                      </div>
                      <p className="text-xs text-[#E8F0EB] mt-2 font-bold flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#F0C447]" />
                        {plan.users}
                      </p>
                    </div>

                    <p className="text-xs font-bold uppercase tracking-wider text-[#F5E8D2] mb-4">
                      ¿Qué incluye el plan?
                    </p>
                    <ul className="space-y-3 text-xs text-[#E8F0EB] mb-8">
                      {plan.features.map((feat, fIdx) => (
                        <li key={fIdx} className="flex items-center gap-2.5">
                          <Check size={16} className="text-[#F0C447] shrink-0" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <a
                    href={plan.ctaLink}
                    className="w-full py-4 px-6 rounded-full bg-[#15612E] hover:bg-[#1A7A3A] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xl hover:scale-[1.02] transition-all border border-[#D4AF37]/60"
                  >
                    <span>{plan.cta}</span>
                    <ArrowRight size={16} />
                  </a>
                </div>
              ) : (
                <GlassCard variant="hover" className="p-8 rounded-3xl flex flex-col justify-between h-full bg-white/90 border-[#E5D5BA]">
                  <div>
                    <h3 className="text-2xl font-extrabold text-[#1A1A1A]">{plan.name}</h3>
                    <p className="text-xs text-[#5F5F5F] mt-1 mb-4">{plan.subtitle}</p>

                    <div className="mb-6 pb-6 border-b border-[#E5D5BA]">
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-extrabold font-mono text-[#1A1A1A]">
                          {plan.price}
                        </span>
                        <span className="text-xs text-[#8A8A8A] font-semibold">{plan.period}</span>
                      </div>
                      <p className="text-xs text-[#15612E] mt-2 font-bold flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#15612E]" />
                        {plan.users}
                      </p>
                    </div>

                    <p className="text-xs font-bold uppercase tracking-wider text-[#1A1A1A] mb-4">
                      ¿Qué incluye el plan?
                    </p>
                    <ul className="space-y-3 text-xs text-[#4A4A4A] mb-8">
                      {plan.features.map((feat, fIdx) => (
                        <li key={fIdx} className="flex items-center gap-2.5">
                          <Check size={16} className="text-[#15612E] shrink-0" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <a
                    href={plan.ctaLink}
                    className="w-full py-3.5 px-6 rounded-full glass-panel hover:bg-[#15612E] hover:text-white text-[#1A1A1A] font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all border border-[#E5D5BA]"
                  >
                    <span>{plan.cta}</span>
                    <ArrowRight size={16} />
                  </a>
                </GlassCard>
              )}
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
