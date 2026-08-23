import { motion } from 'framer-motion';
import { ArrowRight, ChevronRight } from 'lucide-react';
import { BorderBeam } from '@/components/ui/border-beam';
import { Particles } from '@/components/ui/particles';

export default function Hero() {
  return (
    <div className="relative min-h-screen pt-32 pb-20 flex flex-col justify-center overflow-hidden">
      {/* Background Particles */}
      <Particles className="opacity-40" quantity={80} color="#1F6F54" />
      <Particles className="opacity-30" quantity={40} color="#C9A45C" />

      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          <div className="max-w-2xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 backdrop-blur-md border border-brand-gold/30 mb-8 relative overflow-hidden group"
            >
              <BorderBeam size={60} duration={4} delay={0} colorFrom="#C9A45C" colorTo="#E8D5A3" />
              <span className="w-2 h-2 rounded-full bg-brand-gold animate-pulse" />
              <span className="text-sm font-semibold text-brand-text-dark shimmer-text">Plataforma de Costos para Talleres de Piedra</span>
              <ChevronRight size={16} className="text-brand-gold ml-1" />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-5xl md:text-6xl font-extrabold tracking-tight text-brand-text-dark leading-[1.1] mb-6"
            >
              Domina el Arte de la Piedra con <span className="text-brand-gold">Precisión Industrial</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg text-brand-text mb-10 max-w-xl leading-relaxed font-medium"
            >
              La única plataforma B2B en Colombia diseñada exclusivamente para talleres de mármol, granito y piedra natural. Cotiza en segundos, reduce la merma con IA y protege tu margen de utilidad.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <a
                href="#simulator"
                className="group relative px-8 py-4 bg-brand-primary rounded-full text-white font-semibold flex items-center justify-center gap-2 overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
              >
                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                <span className="relative z-10 flex items-center gap-2 text-brand-text-dark">
                  Pruébalo Gratis <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </span>
              </a>
              
              <a
                href="#features"
                className="px-8 py-4 glass rounded-full text-brand-text-dark font-semibold flex items-center justify-center hover:bg-brand-surface transition-all duration-300 border-brand-border"
              >
                Ver Plataforma
              </a>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9, rotateY: -15 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            transition={{ duration: 0.8, delay: 0.4, type: 'spring' }}
            className="relative lg:ml-auto perspective-1000"
          >
            {/* Ambient glow behind mockup */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-brand-primary/10 blur-[100px] rounded-full pointer-events-none" />
            
            <motion.div
              animate={{ y: [0, -15, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="relative z-10"
            >
              <img 
                src="/Mockup Flotante del Simulador Interactivo.png" 
                alt="Simulador Interactivo Costo360" 
                className="w-full h-auto max-w-2xl drop-shadow-2xl object-contain"
              />
            </motion.div>
          </motion.div>

        </div>
      </div>
    </div>
  );
}
