import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { GlassCard } from './ui/GlassCard';

const FAQS = [
  {
    q: '¿Qué es exactamente Costo360 y qué NO es?',
    a: 'Costo360 es un software especializado de cotización, cálculo de mermas, optimización de corte 2D y control de proyectos para talleres de piedra natural y superficies compactas en Colombia. NO es un software contable genérico ni un facturador electrónico DIAN — se enfoca 100% en la precisión operativa, el aprovechamiento de láminas y la rentabilidad del taller.',
  },
  {
    q: '¿Cómo funciona el cálculo de mermas y desperdicio?',
    a: 'Costo360 incluye un motor matemático que analiza el área neta de corte frente al formato comercial de la placa (ej: 3.20 × 1.60 m). Además de calcular el desperdicio inevitable, te permite registrar los retales rectangulares utilizables en un banco digital para cobrarlos y aprovecharlos en futuros proyectos pequeños sin darlos por perdidos.',
  },
  {
    q: '¿Puedo personalizar los precios de los materiales según mis proveedores?',
    a: 'Sí, totalmente. El sistema viene con un catálogo base sugerido pero cada taller tiene control de sus propias tarifas de compra por m², precio de corte, biselado y mano de obra. Cuando actualizas el precio de un material, las cotizaciones nuevas se calculan con ese valor sin alterar las ya cerradas.',
  },
  {
    q: '¿Qué pasa si mis operarios no son expertos en computadores?',
    a: 'Costo360 fue diseñado pensando en el día a día real del taller. La interfaz es intuitiva, táctil y visual, con fotos de cada material y botones claros. Además, el asistente "Cost" permite consultar retales, proyectos y tareas con lenguaje natural y en español coloquial.',
  },
  {
    q: '¿Puedo exportar las cotizaciones en PDF con el logo y membrete de mi taller?',
    a: 'Sí. Cada cotización genera un documento PDF profesional con el logotipo de tu empresa, desglose de medidas, especificaciones de la piedra, condiciones comerciales y tiempos de entrega, listo para enviar por WhatsApp o correo electrónico.',
  },
  {
    q: '¿Se necesita instalar algún programa pesado en el computador?',
    a: 'No. Costo360 es una aplicación en la nube accesible desde cualquier navegador web (Chrome, Edge, Safari) en computador, tablet o celular, sin instalaciones complicadas ni servidores locales.',
  },
];

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section id="faq" className="py-24 relative overflow-hidden bg-[#F5E8D2]/40">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#15612E]/10 border border-[#15612E]/20 text-[#15612E] font-bold text-xs mb-4">
            <HelpCircle size={14} />
            <span>Respuestas Claras</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1A1A1A] mb-4 tracking-tight">
            Preguntas Frecuentes del Gremio
          </h2>
          <p className="text-sm sm:text-base text-[#5F5F5F]">
            Todo lo que necesitas saber antes de empezar a digitalizar la cotización de tu marmolería.
          </p>
        </div>

        <div className="space-y-4">
          {FAQS.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <GlassCard
                key={idx}
                spotlight={false}
                className="p-6 rounded-2xl bg-white/90 border-[#E5D5BA] transition-all"
              >
                <button
                  onClick={() => toggle(idx)}
                  aria-expanded={isOpen}
                  className="w-full text-left flex items-center justify-between gap-4 focus:outline-none"
                >
                  <span className="text-base sm:text-lg font-bold text-[#1A1A1A]">
                    {faq.q}
                  </span>
                  <div
                    className={`w-8 h-8 rounded-full bg-[#15612E]/10 flex items-center justify-center text-[#15612E] shrink-0 transition-transform duration-300 ${
                      isOpen ? 'rotate-180 bg-[#15612E] text-white' : ''
                    }`}
                  >
                    <ChevronDown size={18} />
                  </div>
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <p className="text-sm text-[#5F5F5F] leading-relaxed pt-4 border-t border-[#E5D5BA]/60 mt-4 font-normal">
                        {faq.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </GlassCard>
            );
          })}
        </div>

      </div>
    </section>
  );
}
