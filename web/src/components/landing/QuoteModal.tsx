import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Printer } from 'lucide-react';
import type { CalculoOutput } from '@/lib/calculos';

interface QuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    area: number;
    waste: number;
    material: any;
    calcResult: CalculoOutput;
    formatCOP: (val: number) => string;
  };
}

export default function QuoteModal({ isOpen, onClose, data }: QuoteModalProps) {
  if (!isOpen || !data?.calcResult) return null;

  const { formatCOP, calcResult, material, area, waste } = data;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-3xl bg-brand-surface rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-brand-border/50"
          >
            {/* Header / Membrete */}
            <div className="px-8 py-6 border-b border-brand-border flex justify-between items-center bg-brand-bg">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-black text-brand-gold tracking-tight">COSTO<span className="text-white">360</span></span>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-brand-border rounded-full transition-colors text-brand-muted hover:text-white">
                <X size={20} />
              </button>
            </div>

            {/* Document Content */}
            <div className="p-8 overflow-y-auto flex-1 bg-brand-surface">
              <div className="mb-8">
                <h2 className="text-2xl font-black text-white uppercase tracking-tight">Cotización Formal de Producción</h2>
                <p className="text-sm text-brand-muted font-medium">Cotización No. 00360 • Fecha: {new Date().toLocaleDateString()}</p>
              </div>

              <div className="bg-brand-bg rounded-xl border border-brand-border overflow-hidden mb-8">
                <table className="w-full text-left text-sm">
                  <thead className="bg-brand-input text-brand-gold font-bold uppercase text-xs">
                    <tr>
                      <th className="px-6 py-4">Descripción del Rubro</th>
                      <th className="px-6 py-4 text-right">Cant.</th>
                      <th className="px-6 py-4 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border">
                    {/* Suministro */}
                    <tr>
                      <td className="px-6 py-4 font-medium text-white">
                        Suministro de {material.name}
                        <br/>
                        <span className="text-xs text-brand-muted font-normal">Incluye merma técnica calculada del {waste}%</span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-brand-muted">{area} m²</td>
                      <td className="px-6 py-4 text-right font-mono text-white">{formatCOP(calcResult.costo_material)}</td>
                    </tr>
                    
                    {/* Producción */}
                    <tr>
                      <td className="px-6 py-4 font-medium text-white">
                        Mano de Obra y Producción
                        <br/>
                        <span className="text-xs text-brand-muted font-normal">Corte, canteo, pulido e instalación estándar</span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-brand-muted">Global</td>
                      <td className="px-6 py-4 text-right font-mono text-white">{formatCOP(calcResult.costo_mano_obra)}</td>
                    </tr>

                    {/* Insumos */}
                    <tr>
                      <td className="px-6 py-4 font-medium text-white">
                        Insumos y Consumibles
                        <br/>
                        <span className="text-xs text-brand-muted font-normal">Discos diamantados, pegamentos, selladores y provisión de riesgo</span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-brand-muted">Global</td>
                      <td className="px-6 py-4 text-right font-mono text-white">{formatCOP(calcResult.costo_insumos)}</td>
                    </tr>

                    {/* AIU */}
                    {calcResult.aiu_desglose.total_aiu > 0 && (
                      <tr className="bg-brand-input-deep/50">
                        <td className="px-6 py-4 font-medium text-brand-gold">
                          Factor A.I.U (Normativo)
                          <br/>
                          <span className="text-xs text-brand-muted font-normal">Administración (2%), Imprevistos (2%), Utilidad (5%) + IVA(19%) sobre U</span>
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-brand-muted">-</td>
                        <td className="px-6 py-4 text-right font-mono text-brand-gold">{formatCOP(calcResult.aiu_desglose.total_aiu)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end mb-8">
                <div className="w-80 bg-brand-bg rounded-xl p-6 border border-brand-gold/30 shadow-[0_0_20px_rgba(201,164,92,0.05)]">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-brand-muted font-bold text-sm">Costo Operativo Base</span>
                    <span className="font-mono text-white">{formatCOP(calcResult.costo_directo + calcResult.aiu_desglose.total_aiu)}</span>
                  </div>
                  <div className="flex justify-between items-center mb-4 pb-4 border-b border-brand-border">
                    <span className="text-brand-primary-light font-bold text-sm">Margen Neto de Utilidad</span>
                    <span className="font-mono text-brand-primary-light">{formatCOP(calcResult.margen_comercial)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white font-black text-lg uppercase">Total a Pagar</span>
                    <span className="font-mono text-brand-gold font-black text-2xl">{formatCOP(calcResult.precio_sugerido)}</span>
                  </div>
                </div>
              </div>

              <div className="text-xs text-brand-muted leading-relaxed">
                <p className="font-bold text-white mb-1">Notas Comerciales:</p>
                <p>1. Esta es una cotización autogenerada por el simulador interactivo de Costo360.</p>
                <p>2. Los cálculos están basados en tarifas reales del mercado colombiano de la piedra natural para {new Date().getFullYear()}.</p>
                <p>3. El costo por merma técnica previene pérdidas ocultas durante el corte del material.</p>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="px-8 py-4 bg-brand-bg border-t border-brand-border flex gap-4 justify-end">
              <button onClick={onClose} className="px-6 py-2 rounded-lg font-bold text-brand-muted hover:text-white hover:bg-brand-surface transition-colors">
                Cerrar
              </button>
              <button className="px-6 py-2 rounded-lg border border-brand-border font-bold text-white bg-brand-surface hover:bg-brand-border transition-colors flex items-center gap-2">
                <Printer size={16} /> Imprimir
              </button>
              <button className="px-6 py-2 rounded-lg bg-brand-primary text-white font-bold hover:bg-brand-primary-light transition-colors flex items-center gap-2">
                <Download size={16} /> Descargar PDF
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
