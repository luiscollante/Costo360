import { motion } from 'framer-motion';
import { Database, Lock, Smartphone, CloudLightning } from 'lucide-react';

const SPECS = [
  {
    icon: Database,
    title: 'Base de Datos Escalable',
    value: 'PostgreSQL + Supabase',
  },
  {
    icon: Lock,
    title: 'Seguridad',
    value: 'Autenticación JWT',
  },
  {
    icon: CloudLightning,
    title: 'Rendimiento',
    value: '< 50ms Latencia',
  },
  {
    icon: Smartphone,
    title: 'Plataformas',
    value: 'Web & Android APK',
  },
];

export default function SpecsSection() {
  return (
    <section id="especificaciones" className="py-24 bg-brand-bg relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-brand-surface/50 via-brand-bg to-brand-bg pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
        <div className="flex flex-col md:flex-row gap-12 items-center justify-between">
          <div className="flex-1">
            <motion.h2 
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-6"
            >
              Arquitectura sólida para <br />
              <span className="text-brand-gold">empresas exigentes</span>
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-lg text-brand-muted max-w-xl"
            >
              Diseñado desde cero para garantizar disponibilidad, velocidad y protección de los datos comerciales más sensibles de tu operación.
            </motion.p>
          </div>

          <div className="flex-1 w-full max-w-lg">
            <div className="rounded-3xl border border-brand-border bg-brand-surface overflow-hidden">
              <div className="flex flex-col divide-y divide-brand-border/50">
                {SPECS.map((spec, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.1 }}
                    className="flex items-center gap-4 p-6 hover:bg-brand-bg/50 transition-colors"
                  >
                    <div className="p-2 rounded-lg bg-brand-border/30 text-brand-primary-light">
                      <spec.icon size={20} />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-brand-muted uppercase tracking-wider">{spec.title}</h4>
                      <p className="text-lg font-semibold text-white mt-1">{spec.value}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
