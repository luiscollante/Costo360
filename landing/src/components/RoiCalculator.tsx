import { useState, useMemo } from 'react';
import { TrendingUp } from 'lucide-react';
import { formatCOP } from '@/lib/utils';
import { BorderBeam } from './ui/BorderBeam';

export function RoiCalculator() {
  const [slabsPerMonth, setSlabsPerMonth] = useState<number>(18);
  const [avgSlabPrice, setAvgSlabPrice] = useState<number>(1400000); // $1.4M COP placa promedio

  const calculations = useMemo(() => {
    // Ahorro estimado conservador del 14% de placa ahorrada vía Nesting y control de retales
    const savingsRatio = 0.14;
    const monthlyTotalSpent = slabsPerMonth * avgSlabPrice;
    const monthlySavings = monthlyTotalSpent * savingsRatio;
    const annualSavings = monthlySavings * 12;

    // Costo del Plan Pro de Costo360 ($375.000 COP / mes)
    const costo360Monthly = 375000;
    const roiMultiplier = Math.round(monthlySavings / costo360Monthly);

    return {
      monthlySavings,
      annualSavings,
      roiMultiplier,
    };
  }, [slabsPerMonth, avgSlabPrice]);

  return (
    <section id="roi" className="py-24 relative overflow-hidden bg-white/60 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        <div className="max-w-4xl mx-auto glass-panel p-8 sm:p-12 rounded-3xl shadow-2xl border border-[rgba(212,175,55,0.4)] relative bg-white/95">
          <BorderBeam size={100} duration={6} colorFrom="#D4AF37" colorTo="#15612E" />

          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold text-[#15612E] uppercase tracking-widest bg-[#15612E]/10 px-3.5 py-1 rounded-full">
              Calculadora de Retorno de Inversión
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1A1A1A] mt-4 mb-3 tracking-tight">
              ¿Cuánto Dinero Pierdes Hoy en el Piso del Taller?
            </h2>
            <p className="text-sm sm:text-base text-[#5F5F5F]">
              Descubre cuánto dinero en pesos colombianos recupera tu marmolería reduciendo la merma con el algoritmo de Nesting de Costo360.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            
            {/* Controles de Entrada */}
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">
                    Placas Cortadas al Mes
                  </label>
                  <span className="font-mono text-base font-bold text-[#15612E] bg-[#15612E]/10 px-3 py-0.5 rounded-lg">
                    {slabsPerMonth} placas
                  </span>
                </div>
                <input
                  type="range"
                  min="4"
                  max="60"
                  step="1"
                  value={slabsPerMonth}
                  onChange={(e) => setSlabsPerMonth(parseInt(e.target.value))}
                  className="w-full h-2.5 bg-[#E5D5BA] rounded-lg appearance-none cursor-pointer accent-[#15612E]"
                />
                <div className="flex justify-between text-[11px] text-[#8A8A8A] mt-1">
                  <span>4 placas (Taller artesanal)</span>
                  <span>25 placas</span>
                  <span>60+ placas (Industrial)</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">
                    Costo Promedio por Placa
                  </label>
                  <span className="font-mono text-sm font-bold text-[#6E5410] bg-[#F5EBD5] px-2.5 py-0.5 rounded-lg">
                    {formatCOP(avgSlabPrice)}
                  </span>
                </div>
                <input
                  type="range"
                  min="800000"
                  max="3500000"
                  step="100000"
                  value={avgSlabPrice}
                  onChange={(e) => setAvgSlabPrice(parseInt(e.target.value))}
                  className="w-full h-2.5 bg-[#E5D5BA] rounded-lg appearance-none cursor-pointer accent-[#D4AF37]"
                />
                <div className="flex justify-between text-[11px] text-[#8A8A8A] mt-1">
                  <span>$800.000 (Granito nacional)</span>
                  <span>$3.500.000 (Dekton / Calacatta)</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#F5E8D2]/60 border border-[#E5D5BA] text-xs text-[#5F5F5F] leading-relaxed">
                <p className="font-bold text-[#1A1A1A] mb-1 flex items-center gap-1.5">
                  <TrendingUp size={14} className="text-[#15612E]" />
                  Base del Cálculo:
                </p>
                Ahorro conservador del 14% de merma rescatada entre Nesting 2D y reutilización de retales catalogados en banco digital.
              </div>
            </div>

            {/* Resultado de Retorno */}
            <div className="glass-emerald-dark p-8 rounded-3xl text-white text-center relative overflow-hidden border border-[#D4AF37]/30">
              <span className="text-xs uppercase tracking-widest text-[#F5E8D2] font-semibold">
                Dinero Rescatado Estimado
              </span>

              <div className="my-4">
                <p className="text-4xl sm:text-5xl font-extrabold font-mono text-gold-gradient tracking-tight">
                  {formatCOP(calculations.monthlySavings)}
                </p>
                <p className="text-xs text-[#A8D5BA] mt-1">al mes en material que antes se iba a la basura</p>
              </div>

              <div className="pt-4 border-t border-white/15 my-4">
                <p className="text-xs text-white/80">Proyección Anual de Recuperación:</p>
                <p className="text-2xl font-bold font-mono text-white mt-1">
                  {formatCOP(calculations.annualSavings)} <span className="text-xs text-[#F0C447]">COP / año</span>
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white/10 text-xs font-semibold text-[#F5E8D2] flex items-center justify-center gap-2">
                <span>Retorno de Inversión:</span>
                <span className="bg-[#15612E] px-2 py-0.5 rounded-md font-mono text-white font-bold">
                  {calculations.roiMultiplier}x veces el costo de la suscripción
                </span>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
