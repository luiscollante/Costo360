import { motion } from 'framer-motion';

const STATS = [
  { label: 'Cotizaciones generadas', value: '+10,000' },
  { label: 'Precisión en presupuestos', value: '99.9%' },
  { label: 'Tiempo ahorrado', value: '40h/mes' },
  { label: 'Proyectos gestionados', value: '+500' },
];

export default function TrustSection() {
  return (
    <section className="py-12 border-y border-brand-border/50 bg-brand-surface/20">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <p className="text-center text-sm font-medium text-brand-muted mb-8 uppercase tracking-widest">
          Con la confianza de líderes del sector
        </p>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 divide-x divide-brand-border/30">
          {STATS.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="flex flex-col items-center justify-center text-center px-4"
            >
              <span className="text-3xl md:text-4xl font-bold text-brand-text mb-2 tracking-tight">
                {stat.value}
              </span>
              <span className="text-sm font-medium text-brand-muted">
                {stat.label}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
