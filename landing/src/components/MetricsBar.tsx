import { motion } from 'framer-motion';
import { TrendingDown, Clock, CheckCircle2, DollarSign } from 'lucide-react';

const METRICS = [
  {
    icon: TrendingDown,
    value: '-18%',
    label: 'Reducción de Merma',
    desc: 'Mediante el algoritmo de corte inteligente Nesting 2D',
  },
  {
    icon: Clock,
    value: '4 min',
    label: 'Tiempo de Cotización',
    desc: 'De 2 a 3 horas manuales a minutos con desglose completo',
  },
  {
    icon: DollarSign,
    value: '$100%',
    label: 'Protección de Margen',
    desc: 'Costos directos, mano de obra e insumos calculados al centavo',
  },
  {
    icon: CheckCircle2,
    value: '99.4%',
    label: 'Precisión de Entregables',
    desc: 'PDFs ejecutivos listos para aprobación y firma inmediata',
  },
];

export function MetricsBar() {
  return (
    <section className="py-12 border-y border-[#E5D5BA]/60 bg-white/40 backdrop-blur-sm relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {METRICS.map((item, idx) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="flex items-start gap-4 p-4 rounded-2xl transition-all hover:bg-white/60"
              >
                <div className="p-3 rounded-xl bg-[#15612E]/10 text-[#15612E] shrink-0">
                  <Icon size={24} />
                </div>
                <div>
                  <p className="text-3xl font-extrabold text-[#1A1A1A] tracking-tight font-mono">
                    {item.value}
                  </p>
                  <p className="text-sm font-bold text-[#15612E]">{item.label}</p>
                  <p className="text-xs text-[#5F5F5F] leading-snug mt-1">{item.desc}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
