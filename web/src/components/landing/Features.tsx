import { motion } from 'framer-motion';
import { Calculator, BarChart4, FileSignature, ShieldCheck, Zap, Repeat } from 'lucide-react';

const FEATURES = [
  {
    title: 'Cotización Inteligente',
    description: 'Calcula costos de materiales, AIU y retales automáticamente con precisión milimétrica.',
    icon: Calculator,
    colSpan: 'col-span-1 md:col-span-2 lg:col-span-2',
    delay: 0.1,
  },
  {
    title: 'Analítica en Tiempo Real',
    description: 'Visualiza márgenes de ganancia y rentabilidad en paneles dinámicos.',
    icon: BarChart4,
    colSpan: 'col-span-1 md:col-span-1 lg:col-span-1',
    delay: 0.2,
  },
  {
    title: 'Generación de PDFs',
    description: 'Exporta propuestas formales y cuentas de cobro con la identidad visual de tu marca.',
    icon: FileSignature,
    colSpan: 'col-span-1 md:col-span-1 lg:col-span-1',
    delay: 0.3,
  },
  {
    title: 'Sincronización en la Nube',
    description: 'Tus datos están siempre actualizados en todos tus dispositivos, listos cuando los necesites.',
    icon: Repeat,
    colSpan: 'col-span-1 md:col-span-2 lg:col-span-2',
    delay: 0.4,
  },
  {
    title: 'Flujos Rápidos',
    description: 'Cotizaciones express en menos de 2 minutos para clientes urgentes.',
    icon: Zap,
    colSpan: 'col-span-1 md:col-span-1 lg:col-span-2',
    delay: 0.5,
  },
  {
    title: 'Seguridad Empresarial',
    description: 'Control de accesos y cifrado de extremo a extremo para tu tranquilidad.',
    icon: ShieldCheck,
    colSpan: 'col-span-1 md:col-span-1 lg:col-span-1',
    delay: 0.6,
  }
];

export default function Features() {
  return (
    <section id="features" className="py-24 relative">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-4">
            Un ecosistema diseñado para <span className="text-brand-gold">ganar proyectos</span>
          </h2>
          <p className="text-lg text-brand-muted">
            Deja atrás las hojas de cálculo. Costo360 integra todo lo necesario para presupuestar, cotizar y cobrar de manera profesional.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: feature.delay }}
              className={`${feature.colSpan} group relative rounded-3xl border border-brand-border bg-brand-surface p-8 overflow-hidden hover:border-brand-primary/50 transition-colors`}
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-brand-primary/10 transition-colors pointer-events-none" />
              
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-brand-bg border border-brand-border flex items-center justify-center mb-6 text-brand-gold group-hover:text-brand-primary-light transition-colors">
                  <feature.icon size={24} />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-brand-muted leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
