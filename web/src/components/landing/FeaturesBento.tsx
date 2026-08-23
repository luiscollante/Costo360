import { motion } from 'framer-motion';
import { Spotlight } from '@/components/ui/spotlight';

const BENTO_FEATURES = [
  {
    title: 'Cubicación y Retal Técnico',
    description: 'Optimización de cortes y cálculo preciso del desperdicio real de la placa.',
    className: 'md:col-span-2 md:row-span-2',
    image: '/Diagrama 3D de Optimización de Corte y Retal (Nesting).png',
    bgColor: 'bg-white/80'
  },
  {
    title: 'Catálogo Vivo',
    description: 'Precios de láminas actualizados en tiempo real.',
    className: 'md:col-span-1',
    image: '/Tarjeta Visual de Catálogo Vivo con Precios.png',
    bgColor: 'bg-white/80'
  },
  {
    title: 'Estructura AIU',
    description: 'Distribución financiera y margen de utilidad neto.',
    className: 'md:col-span-1',
    image: '/Gráfico 3D de Distribución Financiera y AIU.png',
    bgColor: 'bg-white/80'
  },
  {
    title: 'Generador PDF Ejecutivo',
    description: 'Cotizaciones comerciales con tu marca en un clic.',
    className: 'md:col-span-2',
    image: '/Tarjeta 4 del Bento Grid (Generador de PDF Comercial)..png',
    bgColor: 'bg-brand-primary/5 text-white'
  }
];

export default function FeaturesBento() {
  return (
    <section id="features" className="py-24 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-brand-text-dark mb-4">
            Un ecosistema diseñado para <span className="shimmer-text">ganar proyectos</span>
          </h2>
          <p className="text-lg text-brand-muted font-medium">
            Módulos operativos que eliminan horas de cálculos manuales y protegen tu margen de error humano.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[280px]">
          {BENTO_FEATURES.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={`h-full ${feature.className}`}
            >
              <Spotlight 
                className={`h-full rounded-3xl border border-brand-border/40 overflow-hidden relative group shadow-sm ${feature.bgColor}`}
              >
                <div className="p-8 pb-0 flex flex-col h-full relative z-10">
                  <h3 className="text-xl md:text-2xl font-bold text-brand-text-dark mb-2 tracking-tight">
                    {feature.title}
                  </h3>
                  <p className="text-brand-muted font-medium text-sm leading-relaxed max-w-sm mb-6">
                    {feature.description}
                  </p>
                  
                  <div className="mt-auto relative w-full flex-1 flex items-end justify-center overflow-hidden rounded-t-xl group-hover:-translate-y-2 transition-transform duration-500 ease-out">
                    <img 
                      src={feature.image} 
                      alt={feature.title} 
                      className="object-contain object-bottom w-full h-full max-h-[85%] drop-shadow-lg"
                    />
                  </div>
                </div>
              </Spotlight>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
