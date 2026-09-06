import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ChevronRight, ShieldCheck, Sparkles, Layers, RefreshCw } from 'lucide-react';
import { BorderBeam } from './ui/BorderBeam';
import { Particles } from './ui/Particles';

interface SlabMaterial {
  id: string;
  name: string;
  category: string;
  dimensions: string;
  avgPrice: string;
  image: string;
  colorLight: string;
}

const SLABS: SlabMaterial[] = [
  {
    id: 'carrara',
    name: 'Mármol Blanco Carrara',
    category: 'Piedra Natural',
    dimensions: '3.00 × 1.80 m (5.40 m²)',
    avgPrice: '$480.000 / m²',
    image: '/Muestra Mármol Blanco Carrara Calacatta.png',
    colorLight: 'rgba(212, 175, 55, 0.4)',
  },
  {
    id: 'sangabriel',
    name: 'Granito Negro San Gabriel',
    category: 'Granito Pulido',
    dimensions: '2.90 × 1.75 m (5.07 m²)',
    avgPrice: '$320.000 / m²',
    image: '/Muestra Granito Negro San Gabriel Pulido.png',
    colorLight: 'rgba(255, 255, 255, 0.25)',
  },
  {
    id: 'sinterizado',
    name: 'Piedra Sinterizada Gold',
    category: 'Ultra Compacta (Dekton/Neolith)',
    dimensions: '3.20 × 1.60 m (5.12 m²)',
    avgPrice: '$890.000 / m²',
    image: '/Muestra Piedra Sinterizada Calacatta Gold (Estilo Neolith Dekton).png',
    colorLight: 'rgba(240, 196, 71, 0.5)',
  },
];

export function Hero() {
  const [selectedSlab, setSelectedSlab] = useState<SlabMaterial>(SLABS[0]);
  const [rotate, setRotate] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - card.left - card.width / 2;
    const y = e.clientY - card.top - card.height / 2;
    setRotate({
      x: -(y / card.height) * 22,
      y: (x / card.width) * 22,
    });
  };

  const handleMouseLeave = () => {
    setRotate({ x: 0, y: 0 });
  };

  return (
    <section className="relative min-h-[92vh] pt-32 pb-20 flex flex-col justify-center overflow-hidden">
      {/* Fondo de partículas sutiles de polvo de piedra */}
      <Particles className="opacity-25" quantity={40} color="#15612E" />
      <Particles className="opacity-20" quantity={25} color="#D4AF37" />

      {/* Brillo radial de fondo en crema y esmeralda */}
      <div
        className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-radial from-[rgba(21,97,46,0.12)] via-[rgba(212,175,55,0.06)] to-transparent blur-3xl"
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Bloque Izquierdo: Mensaje Principal */}
          <div className="lg:col-span-7 max-w-2xl">
            {/* Kicker Pill */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/70 backdrop-blur-md border border-[#E5D5BA] mb-6 shadow-sm relative overflow-hidden"
            >
              <BorderBeam size={50} duration={6} colorFrom="#D4AF37" colorTo="#15612E" />
              <span className="w-2 h-2 rounded-full bg-[#15612E] animate-pulse" />
              <span className="text-xs sm:text-sm font-bold text-[#1A1A1A]">
                Software Especializado para Talleres de Marmolería en Colombia
              </span>
              <ChevronRight size={14} className="text-[#6E5410]" />
            </motion.div>

            {/* Titular Principal H1 */}
            <motion.h1
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#1A1A1A] leading-[1.08] mb-6"
            >
              Domina el Arte de la Piedra con{' '}
              <span className="text-[#15612E] inline-block relative">
                Precisión Industrial
                <svg
                  className="absolute -bottom-2 left-0 w-full h-3 text-[#D4AF37]/50"
                  viewBox="0 0 200 8"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M1 5.5C40 2 120 2 199 5.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
              </span>
            </motion.h1>

            {/* Subtítulo Descriptivo */}
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-base sm:text-lg text-[#4A4A4A] mb-8 leading-relaxed font-normal"
            >
              La única plataforma B2B en Colombia diseñada exclusivamente para marmolerías. Cotiza cocinas y baños en minutos, optimiza planos de corte (Nesting 2D), rescata tus retales y protege tu margen de utilidad con recetas reales de mano de obra e insumos.
            </motion.p>

            {/* Botones de Conversión */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 mb-10"
            >
              <a
                href="#simulador"
                className="relative px-8 py-4 bg-[#15612E] hover:bg-[#1A7A3A] text-white rounded-full font-bold flex items-center justify-center gap-3 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] group"
              >
                <BorderBeam size={60} duration={4} colorFrom="#D4AF37" colorTo="#F0C447" />
                <span>Simular Cotización en Vivo</span>
                <ArrowRight size={18} className="group-hover:translate-x-1.5 transition-transform" />
              </a>

              <a
                href="#modulos"
                className="px-8 py-4 glass-panel hover:bg-white text-[#1A1A1A] rounded-full font-bold flex items-center justify-center gap-2 transition-all duration-300 shadow-sm hover:shadow-md border border-[#E5D5BA]"
              >
                <Layers size={18} className="text-[#15612E]" />
                <span>Ver Módulos de Operación</span>
              </a>
            </motion.div>

            {/* Micro-puntos de Confianza */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="flex flex-wrap items-center gap-6 text-xs sm:text-sm font-medium text-[#5F5F5F]"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-[#15612E]" />
                <span>Desarrollado para Colombia (Pesos COP y AIU)</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-[#6E5410]" />
                <span>Reduce hasta 18% de merma en taller</span>
              </div>
            </motion.div>
          </div>

          {/* Bloque Derecho: Visor 3D Interactivo de Losa Mineral */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="lg:col-span-5 relative"
          >
            {/* Contenedor 3D Perspectiva */}
            <div
              style={{ perspective: 1000 }}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              className="cursor-grab active:cursor-grabbing relative"
            >
              <motion.div
                animate={{
                  rotateX: rotate.x,
                  rotateY: rotate.y,
                }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                className="glass-panel p-6 rounded-3xl shadow-2xl border border-[rgba(212,175,55,0.4)] relative bg-white/85"
              >
                {/* Header del Visor */}
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#E5D5BA]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#15612E]" />
                    <span className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">
                      Simulador Táctil de Losa 3D
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-[#6E5410] bg-[#F5EBD5] px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <RefreshCw size={10} className="animate-spin" /> Mueve el mouse para rotar
                  </span>
                </div>

                {/* Superficie de la Losa con Veta y Reflejo Especular */}
                <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden shadow-inner bg-[#212121] border border-[#E5D5BA] group">
                  <img
                    src={selectedSlab.image}
                    alt={selectedSlab.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />

                  {/* Reflejo de luz dinámico que reacciona a la rotación */}
                  <div
                    className="pointer-events-none absolute inset-0 transition-opacity duration-300"
                    style={{
                      background: `linear-gradient(${120 + rotate.y * 3}deg, rgba(255,255,255,0.4) 0%, transparent 60%)`,
                    }}
                  />

                  {/* Badge Flotante de Medidas */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between p-2.5 rounded-xl bg-black/60 backdrop-blur-md text-white border border-white/20">
                    <div>
                      <p className="text-xs font-bold text-white">{selectedSlab.name}</p>
                      <p className="text-[10px] text-[#F5E8D2]">{selectedSlab.dimensions}</p>
                    </div>
                    <span className="text-xs font-mono font-bold text-[#F0C447] bg-[#00311D] px-2 py-1 rounded-md">
                      {selectedSlab.avgPrice}
                    </span>
                  </div>
                </div>

                {/* Selector de Materiales de la Losa */}
                <div className="mt-4 pt-3">
                  <p className="text-xs font-bold text-[#1A1A1A] mb-2">Selecciona un material para examinar:</p>
                  <div className="grid grid-cols-3 gap-2">
                    {SLABS.map((slab) => (
                      <button
                        key={slab.id}
                        onClick={() => setSelectedSlab(slab)}
                        className={`p-2 rounded-xl text-left transition-all text-xs font-semibold border ${
                          selectedSlab.id === slab.id
                            ? 'bg-[#15612E] text-white border-[#15612E] shadow-md'
                            : 'glass-panel text-[#4A4A4A] hover:bg-white border-[#E5D5BA]'
                        }`}
                      >
                        <p className="truncate font-bold">{slab.name.split(' ')[0]}</p>
                        <p className="text-[10px] opacity-80 truncate">{slab.category.split(' ')[0]}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
