import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { BackgroundBeams } from '@/components/ui/background-beams';

export default function CTASection() {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="max-w-5xl mx-auto px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative rounded-[2.5rem] bg-[#07100D] border border-brand-primary/30 p-10 md:p-20 overflow-hidden text-center z-10"
        >
          <BackgroundBeams />
          
          <div className="relative z-10 max-w-2xl mx-auto flex flex-col items-center">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-6">
              ¿Listo para transformar la rentabilidad de tu negocio?
            </h2>
            <p className="text-lg text-brand-text/80 mb-10">
              Únete a las empresas que ya optimizaron sus procesos de cotización y gestión de costos con Costo360.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-base font-semibold bg-brand-gold text-brand-bg hover:bg-brand-gold-light transition-all shadow-[0_0_20px_rgba(201,164,92,0.3)] hover:shadow-[0_0_30px_rgba(201,164,92,0.5)]"
            >
              Comenzar prueba gratuita <ArrowRight size={18} />
            </Link>
            <p className="mt-6 text-sm text-brand-muted">
              Sin tarjeta de crédito requerida. Configuración en minutos.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
