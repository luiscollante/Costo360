import { motion } from 'framer-motion';
import { Layers, Bot, Compass, FileCheck } from 'lucide-react';
import { GlassCard } from './ui/GlassCard';

export function BentoEcosystem() {
  return (
    <section id="modulos" className="py-24 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Encabezado */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#15612E]/10 border border-[#15612E]/20 text-[#15612E] font-bold text-xs mb-4">
            <Layers size={14} />
            <span>Un Ecosistema Completo de Trabajo</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#1A1A1A] mb-4 tracking-tight">
            Diseñado para Operar y Crecer tu Marmolería
          </h2>
          <p className="text-base sm:text-lg text-[#5F5F5F] font-normal leading-relaxed">
            Elimina hojas de cálculo desactualizadas y errores de cálculo manual. Cada módulo resuelve un punto crítico de la operación diaria del taller.
          </p>
        </div>

        {/* Bento Grid Asimétrico */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-[340px]">
          
          {/* Tarjeta Grande 1: Nesting 2D (Col-8) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="md:col-span-8 h-full"
          >
            <GlassCard variant="hover" className="h-full flex flex-col justify-between group p-6 sm:p-8 bg-white/90">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div>
                  <span className="text-xs font-bold text-[#15612E] uppercase tracking-wider bg-[#15612E]/10 px-2.5 py-1 rounded-md">
                    Motor 2D de Acomodo
                  </span>
                  <h3 className="text-2xl font-extrabold text-[#1A1A1A] mt-2 tracking-tight">
                    Cubicación y Nesting de Placas
                  </h3>
                  <p className="text-sm text-[#5F5F5F] mt-1 max-w-md">
                    Algoritmo de optimización que posiciona mesones, faldones y zócalos minimizando los cortes ciegos y rescatando retales valiosos.
                  </p>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-[#15612E]/10 flex items-center justify-center text-[#15612E] shrink-0">
                  <Compass size={20} />
                </div>
              </div>

              <div className="relative w-full flex-1 rounded-2xl overflow-hidden border border-[#E5D5BA] bg-[#212121]/5 flex items-center justify-center group-hover:scale-[1.01] transition-transform duration-500">
                <img
                  src="/Diagrama 3D de Optimización de Corte y Retal (Nesting).png"
                  alt="Diagrama 3D de Nesting y Optimización de Corte"
                  className="w-full h-full object-contain max-h-[220px] drop-shadow-md"
                />
              </div>
            </GlassCard>
          </motion.div>

          {/* Tarjeta Mediana 2: Asistente Cost con IA (Col-4) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="md:col-span-4 h-full"
          >
            <GlassCard variant="dark" className="h-full flex flex-col justify-between group p-6 sm:p-8">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-[#F0C447] uppercase tracking-wider bg-white/10 px-2.5 py-0.5 rounded-full">
                    Copiloto Inteligente
                  </span>
                  <Bot size={20} className="text-[#F0C447]" />
                </div>
                <h3 className="text-2xl font-extrabold text-white tracking-tight">
                  Cost: Tu Compañero de Taller
                </h3>
                <p className="text-xs sm:text-sm text-[#E8F0EB] mt-2 leading-relaxed">
                  El asistente de IA que entiende de m², boceles, mermas e inventario. Puede consultar proyectos, crear tareas y cotizar, siempre pidiendo confirmación antes de cualquier acción importante.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/15 text-xs font-mono text-[#F5E8D2]">
                <p className="text-[#A8D5BA] mb-1">💬 &ldquo;Cost, ¿cuántos retales de Carrara nos quedan en taller?&rdquo;</p>
                <p className="text-white">&ldquo;Tienes 2 disponibles: uno de 1.40 × 0.80 m y otro de 0.90 × 0.60 m.&rdquo;</p>
              </div>
            </GlassCard>
          </motion.div>

          {/* Tarjeta Mediana 3: Catálogo Vivo (Col-4) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="md:col-span-4 h-full"
          >
            <GlassCard variant="hover" className="h-full flex flex-col justify-between group p-6 sm:p-8 bg-white/90">
              <div>
                <span className="text-xs font-bold text-[#6E5410] uppercase tracking-wider bg-[#F5EBD5] px-2.5 py-1 rounded-md">
                  Tarifas al Día
                </span>
                <h3 className="text-xl font-extrabold text-[#1A1A1A] mt-2 tracking-tight">
                  Catálogo y Precios Vivos
                </h3>
                <p className="text-xs text-[#5F5F5F] mt-1">
                  Ajusta tus precios por m² y espesor según el proveedor. Costo360 replica los cambios a todas tus cotizaciones futuras sin tocar las anteriores.
                </p>
              </div>

              <div className="mt-auto relative w-full h-[150px] rounded-xl overflow-hidden border border-[#E5D5BA]">
                <img
                  src="/Tarjeta Visual de Catálogo Vivo con Precios.png"
                  alt="Catálogo Vivo con Precios de Láminas"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
            </GlassCard>
          </motion.div>

          {/* Tarjeta Grande 4: Generador de PDFs Comerciales (Col-8) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="md:col-span-8 h-full"
          >
            <GlassCard variant="hover" className="h-full flex flex-col justify-between group p-6 sm:p-8 bg-white/90">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div>
                  <span className="text-xs font-bold text-[#15612E] uppercase tracking-wider bg-[#15612E]/10 px-2.5 py-1 rounded-md">
                    Entregable Ejecutivo
                  </span>
                  <h3 className="text-2xl font-extrabold text-[#1A1A1A] mt-2 tracking-tight">
                    Propuestas en PDF con tu Identidad
                  </h3>
                  <p className="text-sm text-[#5F5F5F] mt-1 max-w-md">
                    Genera propuestas formales con logo, renders o fotos de la losa, cláusulas de validez y forma de pago con un solo clic.
                  </p>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-[#D4AF37]/15 flex items-center justify-center text-[#D4AF37] shrink-0">
                  <FileCheck size={20} />
                </div>
              </div>

              <div className="relative w-full flex-1 rounded-2xl overflow-hidden border border-[#E5D5BA] bg-[#212121]/5 flex items-center justify-center group-hover:scale-[1.01] transition-transform duration-500">
                <img
                  src="/Tarjeta 4 del Bento Grid (Generador de PDF Comercial)..png"
                  alt="Generador de PDF Comercial de Costo360"
                  className="w-full h-full object-contain max-h-[220px] drop-shadow-md"
                />
              </div>
            </GlassCard>
          </motion.div>

        </div>

      </div>
    </section>
  );
}
