import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calculator, Sparkles, FileText, Check } from 'lucide-react';
import { formatCOP } from '@/lib/utils';
import { BorderBeam } from './ui/BorderBeam';

interface MaterialDef {
  id: string;
  name: string;
  category: string;
  basePriceM2: number;
  baseWastePct: number;
  image: string;
}

const MATERIALS: MaterialDef[] = [
  {
    id: 'marmol',
    name: 'Mármol Blanco Carrara',
    category: 'Mármol Italiano',
    basePriceM2: 450000,
    baseWastePct: 15,
    image: '/Muestra Mármol Blanco Carrara Calacatta.png',
  },
  {
    id: 'granito',
    name: 'Granito Negro San Gabriel',
    category: 'Granito Natural',
    basePriceM2: 320000,
    baseWastePct: 12,
    image: '/Muestra Granito Negro San Gabriel Pulido.png',
  },
  {
    id: 'cuarzo',
    name: 'Cuarzo Blanco Estelar',
    category: 'Superficie de Cuarzo',
    basePriceM2: 520000,
    baseWastePct: 10,
    image: '/Muestra Cuarzo Blanco Estelar con Microdestellos.png',
  },
  {
    id: 'sinterizado',
    name: 'Piedra Sinterizada Gold',
    category: 'Ultra Compacta (Dekton/Neolith)',
    basePriceM2: 890000,
    baseWastePct: 18,
    image: '/Muestra Piedra Sinterizada Calacatta Gold (Estilo Neolith Dekton).png',
  },
];

export function InteractiveStudio() {
  const [selectedMat, setSelectedMat] = useState<MaterialDef>(MATERIALS[0]);
  const [areaM2, setAreaM2] = useState<number>(6.5);
  const [wastePct, setWastePct] = useState<number>(15);
  const [marginPct, setMarginPct] = useState<number>(35);
  const [includeAIU, setIncludeAIU] = useState<boolean>(true);
  const [pdfGenerated, setPdfGenerated] = useState<boolean>(false);

  // Al cambiar material, adaptamos la merma típica
  const handleSelectMaterial = (mat: MaterialDef) => {
    setSelectedMat(mat);
    setWastePct(mat.baseWastePct);
  };

  // Motor matemático en tiempo real (Costo360 logic)
  const calculation = useMemo(() => {
    const supplyBase = areaM2 * selectedMat.basePriceM2;
    const wasteCost = supplyBase * (wastePct / 100);
    const supplyTotal = supplyBase + wasteCost;

    // Mano de obra por m² y acabado
    const laborCost = areaM2 * 65000;

    // Consumibles (desgaste de disco de diamante, resinas, lijas, pegante epóxico)
    const consumablesCost = areaM2 * 28000;

    const directCostTotal = supplyTotal + laborCost + consumablesCost;

    // AIU: Administración 10%, Imprevistos 5%, Utilidad según margen
    const aiuPct = includeAIU ? 0.15 : 0;
    const aiuAmount = directCostTotal * aiuPct;

    // Margen comercial
    const costWithAIU = directCostTotal + aiuAmount;
    const finalPrice = costWithAIU / (1 - marginPct / 100);
    const estimatedProfit = finalPrice - directCostTotal;

    return {
      supplyBase,
      wasteCost,
      supplyTotal,
      laborCost,
      consumablesCost,
      directCostTotal,
      aiuAmount,
      finalPrice,
      estimatedProfit,
    };
  }, [selectedMat, areaM2, wastePct, marginPct, includeAIU]);

  const handleGenerateSample = () => {
    setPdfGenerated(true);
    setTimeout(() => {
      setPdfGenerated(false);
    }, 4000);
  };

  return (
    <section id="simulador" className="py-24 relative overflow-hidden bg-white/50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Cabecera de Sección */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#15612E]/10 border border-[#15612E]/20 text-[#15612E] font-bold text-xs mb-4">
            <Calculator size={14} />
            <span>Motor de Cotización en Tiempo Real</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-[#1A1A1A] mb-4">
            Prueba el Simulador con las Tarifas de tu Taller
          </h2>
          <p className="text-base sm:text-lg text-[#5F5F5F] font-normal leading-relaxed">
            Mueve los deslizadores y comprueba cómo Costo360 desglosa el costo real de suministro, mano de obra, consumibles de corte y AIU antes de entregar la cotización.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Panel Izquierdo: Controles Táctiles */}
          <div className="lg:col-span-7 glass-panel p-6 sm:p-8 rounded-3xl shadow-xl border border-[#E5D5BA] bg-white/90">
            <h3 className="text-lg font-extrabold text-[#1A1A1A] mb-6 flex items-center justify-between">
              <span>1. Configura el Trabajo</span>
              <span className="text-xs font-semibold text-[#6E5410] bg-[#F5EBD5] px-2.5 py-1 rounded-full">
                Receta Automática
              </span>
            </h3>

            {/* Selector de Material con Muestras Reales */}
            <div className="mb-8">
              <label className="block text-xs font-bold text-[#1A1A1A] uppercase tracking-wider mb-3">
                Material de la Placa
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {MATERIALS.map((mat) => (
                  <button
                    key={mat.id}
                    onClick={() => handleSelectMaterial(mat)}
                    className={`p-2.5 rounded-2xl text-left transition-all border relative overflow-hidden group ${
                      selectedMat.id === mat.id
                        ? 'border-[#15612E] bg-[#15612E]/5 shadow-md ring-2 ring-[#15612E]/30'
                        : 'border-[#E5D5BA] bg-white hover:border-[#D4AF37]'
                    }`}
                  >
                    <div className="aspect-square w-full rounded-xl overflow-hidden mb-2 bg-[#212121]">
                      <img
                        src={mat.image}
                        alt={mat.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <p className="text-xs font-bold text-[#1A1A1A] truncate">{mat.name.split(' ')[0]} {mat.name.split(' ')[1]}</p>
                    <p className="text-[11px] font-mono font-semibold text-[#15612E] mt-0.5">
                      {formatCOP(mat.basePriceM2)}/m²
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Sliders de Parámetros */}
            <div className="space-y-6">
              {/* Área en m² */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">
                    Área Total a Cubicar
                  </label>
                  <span className="font-mono text-sm font-bold text-[#15612E] bg-[#15612E]/10 px-2.5 py-0.5 rounded-md">
                    {areaM2} m²
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="25"
                  step="0.5"
                  value={areaM2}
                  onChange={(e) => setAreaM2(parseFloat(e.target.value))}
                  className="w-full h-2 bg-[#E5D5BA] rounded-lg appearance-none cursor-pointer accent-[#15612E]"
                />
                <div className="flex justify-between text-[11px] text-[#8A8A8A] mt-1">
                  <span>1 m² (Vanity pequeño)</span>
                  <span>12 m² (Cocina isla)</span>
                  <span>25 m² (Proyecto comercial)</span>
                </div>
              </div>

              {/* Porcentaje de Merma / Desperdicio */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider flex items-center gap-1.5">
                    Merma y Desperdicio Estimado
                    <span className="text-[11px] text-[#6E5410] font-normal lowercase">(rotura + cortes)</span>
                  </label>
                  <span className="font-mono text-sm font-bold text-[#6E5410] bg-[#F5EBD5] px-2.5 py-0.5 rounded-md">
                    {wastePct}%
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="35"
                  step="1"
                  value={wastePct}
                  onChange={(e) => setWastePct(parseInt(e.target.value))}
                  className="w-full h-2 bg-[#E5D5BA] rounded-lg appearance-none cursor-pointer accent-[#D4AF37]"
                />
              </div>

              {/* Margen de Utilidad Deseado */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">
                    Margen de Utilidad del Taller
                  </label>
                  <span className="font-mono text-sm font-bold text-[#15612E] bg-[#15612E]/10 px-2.5 py-0.5 rounded-md">
                    {marginPct}%
                  </span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="60"
                  step="1"
                  value={marginPct}
                  onChange={(e) => setMarginPct(parseInt(e.target.value))}
                  className="w-full h-2 bg-[#E5D5BA] rounded-lg appearance-none cursor-pointer accent-[#15612E]"
                />
              </div>

              {/* Toggle de AIU */}
              <div className="pt-2 flex items-center justify-between p-3.5 rounded-2xl bg-[#F5E8D2]/60 border border-[#E5D5BA]">
                <div>
                  <p className="text-xs font-bold text-[#1A1A1A]">Estructura Formal AIU (15%)</p>
                  <p className="text-[11px] text-[#5F5F5F]">Administración 10% + Imprevistos 5% para licitaciones</p>
                </div>
                <button
                  onClick={() => setIncludeAIU(!includeAIU)}
                  className={`relative w-12 h-6 rounded-full transition-colors duration-300 focus:outline-none ${
                    includeAIU ? 'bg-[#15612E]' : 'bg-[#8A8A8A]'
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 ${
                      includeAIU ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Panel Derecho: Resumen Financiero y Cotización */}
          <div className="lg:col-span-5 relative">
            <div className="glass-emerald-dark p-6 sm:p-8 rounded-3xl shadow-2xl relative overflow-hidden border border-[#D4AF37]/30 text-white">
              <BorderBeam size={80} duration={5} colorFrom="#D4AF37" colorTo="#F0C447" />

              <div className="flex items-center justify-between mb-6 pb-3 border-b border-white/15">
                <span className="text-xs font-bold tracking-wider uppercase text-[#F5E8D2]">
                  Resumen de Costos en Vivo
                </span>
                <span className="text-[10px] font-mono text-[#F0C447] bg-[#00311D] px-2 py-0.5 rounded-md">
                  COP / es-CO
                </span>
              </div>

              {/* Desglose de Costos */}
              <div className="space-y-3.5 text-xs text-[#E8F0EB] mb-6">
                <div className="flex justify-between py-1 border-b border-white/10">
                  <span className="text-white/80">Suministro Base ({areaM2} m²):</span>
                  <span className="font-mono font-semibold">{formatCOP(calculation.supplyBase)}</span>
                </div>

                <div className="flex justify-between py-1 border-b border-white/10 text-[#F0C447]">
                  <span>+ Desperdicio / Merma ({wastePct}%):</span>
                  <span className="font-mono font-semibold">{formatCOP(calculation.wasteCost)}</span>
                </div>

                <div className="flex justify-between py-1 border-b border-white/10">
                  <span className="text-white/80">Mano de Obra (corte + brillado):</span>
                  <span className="font-mono font-semibold">{formatCOP(calculation.laborCost)}</span>
                </div>

                <div className="flex justify-between py-1 border-b border-white/10">
                  <span className="text-white/80">Consumibles (discos + pegantes):</span>
                  <span className="font-mono font-semibold">{formatCOP(calculation.consumablesCost)}</span>
                </div>

                {includeAIU && (
                  <div className="flex justify-between py-1 border-b border-white/10 text-[#F5E8D2]">
                    <span>AIU Calculado (15%):</span>
                    <span className="font-mono font-semibold">{formatCOP(calculation.aiuAmount)}</span>
                  </div>
                )}

                <div className="flex justify-between pt-2 text-sm font-bold text-white">
                  <span>Costo Directo Total:</span>
                  <span className="font-mono text-[#F0C447]">{formatCOP(calculation.directCostTotal)}</span>
                </div>
              </div>

              {/* Gran Total Sugerido */}
              <div className="p-4 rounded-2xl bg-black/40 border border-[#D4AF37]/40 mb-6 text-center relative overflow-hidden">
                <p className="text-xs uppercase tracking-widest text-[#F5E8D2] font-semibold mb-1">
                  Precio de Cotización Sugerido
                </p>
                <p className="text-3xl sm:text-4xl font-extrabold text-white font-mono tracking-tight text-gold-gradient">
                  {formatCOP(calculation.finalPrice)}
                </p>
                <p className="text-[11px] text-[#A8D5BA] mt-1 flex items-center justify-center gap-1 font-semibold">
                  <Sparkles size={12} className="text-[#F0C447]" />
                  Utilidad Neta Estimada para el Taller: {formatCOP(calculation.estimatedProfit)} ({marginPct}%)
                </p>
              </div>

              {/* Botón de Generar Cotización de Muestra */}
              <button
                onClick={handleGenerateSample}
                className="w-full py-3.5 px-6 rounded-full bg-[#15612E] hover:bg-[#1A7A3A] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all hover:scale-[1.02] border border-[#D4AF37]/50"
              >
                {pdfGenerated ? (
                  <>
                    <Check size={18} className="text-[#F0C447]" />
                    <span>¡Cotización de Muestra Preparada!</span>
                  </>
                ) : (
                  <>
                    <FileText size={18} />
                    <span>Simular PDF Comercial con tu Marca</span>
                  </>
                )}
              </button>

              <AnimatePresence>
                {pdfGenerated && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-3 p-3 rounded-xl bg-white/10 text-xs text-center text-[#F5E8D2] border border-white/20"
                  >
                    En el software real, este botón exporta instantáneamente un PDF ejecutivo con membrete de tu taller, listo para enviar por WhatsApp.
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
