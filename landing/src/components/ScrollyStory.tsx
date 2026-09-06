import { motion } from 'framer-motion';
import { AlertTriangle, Cpu, TrendingUp } from 'lucide-react';
import { GlassCard } from './ui/GlassCard';

const STEPS = [
  {
    step: 'Paso 01',
    badge: 'El Dolor Invisible',
    icon: AlertTriangle,
    iconColor: 'text-[#B23B3B]',
    iconBg: 'bg-[#B23B3B]/10',
    title: 'La Pérdida Oculta de Material',
    description:
      'Un taller promedio en Colombia desperdicia entre el 15% y el 25% de cada placa de mármol o cuarzo por calcular "al ojo" o con bocetos en servilletas. Una sola placa mal cortada representa más de $1.200.000 COP perdidos en el piso.',
    highlight: 'Pérdida promedio: $1.2M COP por placa',
  },
  {
    step: 'Paso 02',
    badge: 'La Inteligencia de Corte',
    icon: Cpu,
    iconColor: 'text-[#15612E]',
    iconBg: 'bg-[#15612E]/10',
    title: 'Optimización 2D (Nesting Inteligente)',
    description:
      'Costo360 toma las medidas de las piezas que necesitas para tu mesón, salpicadero o zócalos y las acomoda matemáticamente sobre las dimensiones reales de la losa, aprovechando cada centímetro y rescatando retales útiles en el inventario digital.',
    highlight: 'Aprovechamiento de hasta el 92% de la placa',
  },
  {
    step: 'Paso 03',
    badge: 'El Cierre Comercial',
    icon: TrendingUp,
    iconColor: 'text-[#D4AF37]',
    iconBg: 'bg-[#D4AF37]/15',
    title: 'Propuesta Impecable que Vende Más',
    description:
      'Tu cliente recibe una cotización ejecutiva en PDF con desglose transparente, fotos de la piedra, condiciones comerciales y tu marca profesional. Ganas confianza, cobras con margen protegido y cierras el proyecto antes que la competencia.',
    highlight: 'Tiempo de respuesta: Menos de 5 minutos',
  },
];

export function ScrollyStory() {
  return (
    <section className="py-24 relative overflow-hidden bg-[#F5E8D2]/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold text-[#6E5410] uppercase tracking-widest bg-[#F5EBD5] px-3.5 py-1 rounded-full border border-[#E5D5BA]">
            El Viaje de Transformación
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#1A1A1A] mt-4 mb-4 tracking-tight">
            De la Incertidumbre en el Taller a la Rentabilidad Blindada
          </h2>
          <p className="text-base sm:text-lg text-[#5F5F5F]">
            Así es como Costo360 cambia las reglas del juego para quien transforma piedra natural en Colombia.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {STEPS.map((item, idx) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.5, delay: idx * 0.15 }}
              >
                <GlassCard variant="hover" className="h-full flex flex-col justify-between p-8 border-[#E5D5BA]">
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <span className="font-mono text-xs font-bold text-[#8A8A8A]">{item.step}</span>
                      <span className="text-[11px] font-bold text-[#15612E] bg-[#15612E]/10 px-2.5 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    </div>

                    <div className={`w-12 h-12 rounded-2xl ${item.iconBg} flex items-center justify-center mb-6`}>
                      <Icon size={24} className={item.iconColor} />
                    </div>

                    <h3 className="text-xl font-bold text-[#1A1A1A] mb-3 tracking-tight">
                      {item.title}
                    </h3>

                    <p className="text-sm text-[#4A4A4A] leading-relaxed mb-6 font-normal">
                      {item.description}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-[#E5D5BA] flex items-center gap-2 text-xs font-semibold text-[#15612E]">
                    <span className="w-2 h-2 rounded-full bg-[#15612E]" />
                    <span>{item.highlight}</span>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
