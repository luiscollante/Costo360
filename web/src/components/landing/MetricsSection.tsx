import { NumberTicker } from '@/components/ui/number-ticker';

const METRICS = [
  {
    value: 85,
    suffix: '%',
    label: 'Tiempo ahorrado por cotización',
    description: 'De 40 min a solo 3 min'
  },
  {
    value: 18,
    suffix: '%',
    label: 'Margen de utilidad neto protegido',
    description: 'Calculado automáticamente'
  },
  {
    value: 99.8,
    suffix: '%',
    label: 'Precisión en cubicación',
    description: 'Y cálculo de retal técnico'
  },
  {
    value: 12000,
    prefix: '+',
    label: 'Cotizaciones generadas',
    description: 'En toda Latinoamérica'
  }
];

export default function MetricsSection() {
  return (
    <section id="metrics" className="py-20 bg-white/40 border-y border-brand-border/30 relative z-10 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 text-center divide-x divide-brand-border/20">
          {METRICS.map((metric, i) => (
            <div key={i} className="flex flex-col items-center justify-center px-4">
              <div className="text-4xl md:text-5xl font-bold tracking-tighter text-brand-primary mb-2 flex items-center">
                {metric.prefix && <span>{metric.prefix}</span>}
                <NumberTicker 
                  value={metric.value} 
                  delay={0.2} 
                  decimalPlaces={metric.value % 1 !== 0 ? 1 : 0} 
                />
                {metric.suffix && <span>{metric.suffix}</span>}
              </div>
              <p className="text-brand-text-dark font-semibold text-sm uppercase tracking-wide mb-1">
                {metric.label}
              </p>
              <p className="text-brand-muted text-xs font-medium">
                {metric.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
