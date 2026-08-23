import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings2, FileSignature } from 'lucide-react';
import { BorderBeam } from '@/components/ui/border-beam';
import QuoteModal from './QuoteModal';
import { calcularCotizacion, PROPIEDADES_MATERIAL } from '@/lib/calculos';
import type { MaterialCategory } from '@/lib/calculos';

type MaterialOption = {
  id: MaterialCategory;
  name: string;
  img: string;
};

const MATERIALS: MaterialOption[] = [
  { id: 'Mármol', name: 'Mármol Carrara', img: '/Muestra Mármol Blanco Carrara Calacatta.png' },
  { id: 'Granito', name: 'Granito San Gabriel', img: '/Muestra Granito Negro San Gabriel Pulido.png' },
  { id: 'Quarztone', name: 'Cuarzo Estelar', img: '/Muestra Cuarzo Blanco Estelar con Microdestellos.png' },
  { id: 'Sinterizado', name: 'Piedra Sinterizada', img: '/Muestra Piedra Sinterizada Calacatta Gold (Estilo Neolith Dekton).png' },
];

export default function InteractiveDemo() {
  const [material, setMaterial] = useState<MaterialOption>(MATERIALS[0]);
  const [area, setArea] = useState(5);
  const [waste, setWaste] = useState(PROPIEDADES_MATERIAL['Mármol'].merma_base * 100);
  const [profitMargin, setProfitMargin] = useState(30);
  const [includeAIU, setIncludeAIU] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Auto-update waste when material changes to its default merma
  useEffect(() => {
    setWaste(PROPIEDADES_MATERIAL[material.id as MaterialCategory].merma_base * 100);
  }, [material]);

  // Lógica Matemática Real de CostoMarmol
  const calcResult = calcularCotizacion({
    categoria: material.id as MaterialCategory,
    area_m2: area,
    desperdicio_pct: waste,
    margen_pct: profitMargin,
    precio_m2: PROPIEDADES_MATERIAL[material.id as MaterialCategory].defaultPrice,
    aiu_activo: includeAIU
  });

  const formatCOP = (val: number) => `$${Math.round(val).toLocaleString('es-CO')}`;

  return (
    <section id="simulator" className="py-24 relative overflow-hidden bg-brand-bg">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* Controles del Simulador */}
          <div>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary font-bold text-sm mb-6 shadow-sm"
            >
              <Settings2 size={16} />
              <span>Simulador en Tiempo Real</span>
            </motion.div>
            
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-brand-text-dark mb-6">
              Calcula con <span className="text-brand-primary-light">Precisión Absoluta</span>
            </h2>
            
            <p className="text-lg text-brand-muted mb-10 font-medium leading-relaxed">
              Modifica los valores y observa cómo Costo360 ejecuta el motor matemático real para calcular suministro, producción, insumos y el AIU exacto.
            </p>
            
            {/* Material Selector */}
            <div className="mb-8">
              <label className="block text-sm font-bold text-brand-text-dark mb-3">Material Base</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {MATERIALS.map((mat) => {
                  const props = PROPIEDADES_MATERIAL[mat.id as MaterialCategory];
                  return (
                    <button
                      key={mat.id}
                      onClick={() => setMaterial(mat)}
                      className={`relative rounded-xl overflow-hidden border-2 transition-all duration-300 ${
                        material.id === mat.id ? 'border-brand-primary shadow-md scale-[1.02]' : 'border-transparent hover:border-brand-border/50'
                      }`}
                    >
                      <div className="aspect-square w-full">
                        <img src={mat.img} alt={mat.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="absolute inset-x-0 bottom-0 bg-brand-surface/90 backdrop-blur-sm p-2 text-center">
                        <p className="text-[10px] font-bold text-brand-text-dark leading-tight">{mat.name}</p>
                        <p className="text-[10px] text-brand-primary-light font-semibold">{formatCOP(props.defaultPrice)}/m²</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sliders */}
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <label className="text-sm font-bold text-brand-text-dark">Área a Instalar (m²)</label>
                  <span className="text-sm text-brand-primary-light font-mono font-bold">{area} m²</span>
                </div>
                <input 
                  type="range" min="1" max="50" step="0.5" value={area} onChange={(e) => setArea(Number(e.target.value))}
                  className="w-full h-2 bg-brand-border/30 rounded-lg appearance-none cursor-pointer accent-brand-primary"
                />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <label className="text-sm font-bold text-brand-text-dark">Desperdicio Técnico / Retal (%)</label>
                  <span className="text-sm text-brand-primary-light font-mono font-bold">{waste}%</span>
                </div>
                <input 
                  type="range" min="0" max="40" value={waste} onChange={(e) => setWaste(Number(e.target.value))}
                  className="w-full h-2 bg-brand-border/30 rounded-lg appearance-none cursor-pointer accent-brand-primary"
                />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <label className="text-sm font-bold text-brand-text-dark">Margen de Ganancia Neto (%)</label>
                  <span className="text-sm text-brand-primary-light font-mono font-bold">{profitMargin}%</span>
                </div>
                <input 
                  type="range" min="10" max="60" value={profitMargin} onChange={(e) => setProfitMargin(Number(e.target.value))}
                  className="w-full h-2 bg-brand-border/30 rounded-lg appearance-none cursor-pointer accent-brand-primary"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="text-sm font-bold text-brand-text-dark">Incluir Normativa AIU Completa</label>
                <button 
                  onClick={() => setIncludeAIU(!includeAIU)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${includeAIU ? 'bg-brand-primary' : 'bg-brand-border/50'}`}
                >
                  <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${includeAIU ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Resultado Visual (Glassmorphism Panel) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="relative lg:ml-auto w-full max-w-md"
          >
            {/* Sombra ambientada dorada */}
            <div className="absolute inset-0 bg-brand-gold/10 blur-[80px] rounded-full pointer-events-none" />
            
            <div className="relative glass-gold rounded-3xl p-8 shadow-2xl overflow-hidden group">
              <BorderBeam size={150} duration={5} colorFrom="#C9A45C" colorTo="#DDB97A" />
              
              <h3 className="text-xl font-extrabold text-brand-text-dark mb-6 tracking-tight flex items-center justify-between">
                Presupuesto Sugerido
                <span className="text-xs font-medium text-brand-gold bg-brand-gold/10 px-2 py-1 rounded-md border border-brand-gold/20">COP</span>
              </h3>
              
              <div className="space-y-4 mb-8">
                <div className="flex justify-between pb-3 border-b border-brand-border">
                  <span className="text-brand-muted font-medium text-sm">Suministro de Material</span>
                  <span className="font-mono text-brand-text-dark font-bold">{formatCOP(calcResult.costo_material)}</span>
                </div>
                <div className="flex justify-between pb-3 border-b border-brand-border">
                  <span className="text-brand-muted font-medium text-sm">Mano de Obra & Producción</span>
                  <span className="font-mono text-brand-text-dark font-bold">{formatCOP(calcResult.costo_mano_obra)}</span>
                </div>
                <div className="flex justify-between pb-3 border-b border-brand-border">
                  <span className="text-brand-muted font-medium text-sm">Insumos y Consumibles</span>
                  <span className="font-mono text-brand-text-dark font-bold">{formatCOP(calcResult.costo_insumos)}</span>
                </div>
                {includeAIU && (
                  <div className="flex justify-between pb-3 border-b border-brand-border">
                    <span className="text-brand-muted font-medium text-sm">AIU + IVA</span>
                    <span className="font-mono text-brand-text-dark font-bold">{formatCOP(calcResult.aiu_desglose.total_aiu)}</span>
                  </div>
                )}
                <div className="flex justify-between pb-3 border-b border-brand-border">
                  <span className="text-brand-primary-light font-bold text-sm">Utilidad Neta ({profitMargin}%)</span>
                  <span className="font-mono text-brand-primary-light font-bold">+{formatCOP(calcResult.margen_comercial)}</span>
                </div>
              </div>
              
              <div className="pt-4 border-t border-brand-gold/20">
                <div className="flex justify-between items-end mb-6">
                  <span className="text-lg text-brand-text-dark font-extrabold">Precio Venta Sugerido</span>
                  <div className="text-right">
                    <AnimatePresence mode="popLayout">
                      <motion.span 
                        key={calcResult.precio_sugerido}
                        initial={{ scale: 1.1, color: '#C9A45C', opacity: 0 }}
                        animate={{ scale: 1, color: '#FFFFFF', opacity: 1 }}
                        className="text-4xl font-black font-mono inline-block tracking-tight text-brand-text-dark"
                      >
                        {formatCOP(calcResult.precio_sugerido)}
                      </motion.span>
                    </AnimatePresence>
                  </div>
                </div>

                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="w-full py-4 rounded-xl bg-brand-primary text-white font-bold flex items-center justify-center gap-2 hover:bg-brand-primary-light transition-colors shadow-md group/btn"
                >
                  <FileSignature size={18} className="group-hover/btn:scale-110 transition-transform" />
                  Ver Desglose Completo
                </button>
              </div>
            </div>
          </motion.div>

        </div>
      </div>

      <QuoteModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        data={{ 
          area, 
          waste, 
          material, 
          calcResult, 
          formatCOP 
        }} 
      />
    </section>
  );
}
