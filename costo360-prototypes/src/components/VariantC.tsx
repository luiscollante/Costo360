'use client';

import { motion } from 'framer-motion';
import { Send, Bot, User, Paperclip, BarChart, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function VariantC() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col md:flex-row">
      {/* Main Content (Context) Area */}
      <div className="flex-1 p-6 md:p-10 overflow-y-auto">
        <header className="mb-10">
          <h1 className="text-2xl font-bold text-slate-800">Costo360 Proto Copilot</h1>
          <p className="text-slate-500">Prototipo de asistente operativo</p>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Active Context Card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-2 text-indigo-600 mb-4">
              <BarChart size={18} />
              <h2 className="font-semibold text-sm">Contexto Actual: Proyecto PRJ-093</h2>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-end border-b border-slate-100 pb-4">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Presupuesto</p>
                  <p className="text-2xl font-bold">$120,000</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Ejecutado</p>
                  <p className="text-2xl font-bold text-rose-600">$135,000</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-2">Desglose de sobrecostos principales:</p>
                <ul className="space-y-2 text-sm">
                  <li className="flex justify-between items-center p-2 bg-rose-50 rounded text-rose-700">
                    <span>Mano de Obra Extra</span>
                    <span className="font-semibold">+$8,500</span>
                  </li>
                  <li className="flex justify-between items-center p-2 bg-rose-50 rounded text-rose-700">
                    <span>Materiales de Imprevisto</span>
                    <span className="font-semibold">+$6,500</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Suggested Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-2 text-amber-600 mb-4">
              <AlertTriangle size={18} />
              <h2 className="font-semibold text-sm">Acciones Recomendadas</h2>
            </div>
            <div className="space-y-3">
              {[
                { title: "Generar reporte de desvío detallado", type: "report" },
                { title: "Notificar al director de proyecto (O. Martínez)", type: "notify" },
                { title: "Congelar compras para PRJ-093 temporalmente", type: "action" }
              ].map((action, i) => (
                <button key={i} className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors text-left group">
                  <span className="text-sm font-medium text-slate-700 group-hover:text-indigo-700">{action.title}</span>
                  <ChevronRight size={16} className="text-slate-400 group-hover:text-indigo-500" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Copilot Sidebar */}
      <div className="w-full md:w-96 bg-white border-l border-slate-200 flex flex-col h-screen shrink-0 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <div className="p-4 border-b border-slate-100 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
            <Bot size={18} />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 text-sm">Agente Proto C360</h3>
            <p className="text-xs text-green-500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"></span> En línea
            </p>
          </div>
        </div>

        {/* Chat History */}
        <div className="flex-1 p-4 overflow-y-auto space-y-6">
          <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} className="flex gap-3">
            <div className="w-6 h-6 shrink-0 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mt-1">
              <Bot size={14} />
            </div>
            <div className="bg-slate-100 p-3 rounded-2xl rounded-tl-sm text-sm text-slate-700">
              Hola, noté que el proyecto PRJ-093 superó su presupuesto en un 12.5%. He preparado un desglose preliminar a tu izquierda. ¿Te gustaría que genere un reporte completo o que congele las órdenes de compra pendientes?
            </div>
          </motion.div>

          <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} transition={{delay: 0.5}} className="flex gap-3 flex-row-reverse">
            <div className="w-6 h-6 shrink-0 rounded-full bg-slate-800 text-white flex items-center justify-center mt-1">
              <User size={14} />
            </div>
            <div className="bg-indigo-600 p-3 rounded-2xl rounded-tr-sm text-sm text-white">
              Por favor genera el reporte detallado y envíalo a mi correo.
            </div>
          </motion.div>

          <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} transition={{delay: 1.5}} className="flex gap-3">
            <div className="w-6 h-6 shrink-0 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mt-1">
              <Bot size={14} />
            </div>
            <div className="bg-slate-100 p-3 rounded-2xl rounded-tl-sm text-sm text-slate-700">
              <p className="mb-2">¡Hecho! He generado el reporte analizando las 43 facturas recientes.</p>
              <div className="bg-white border border-slate-200 rounded p-2 flex items-center gap-2 mb-2">
                <FileText size={16} className="text-rose-500" />
                <span className="font-medium text-xs">Desvio_PRJ093_Oct.pdf</span>
                <CheckCircle2 size={14} className="text-green-500 ml-auto" />
              </div>
              <p>También lo he enviado a tu bandeja de entrada.</p>
            </div>
          </motion.div>
        </div>

        {/* Chat Input */}
        <div className="p-4 bg-white border-t border-slate-100">
          <div className="relative flex items-center">
            <button className="absolute left-3 text-slate-400 hover:text-slate-600">
              <Paperclip size={18} />
            </button>
            <input 
              type="text" 
              placeholder="Pide un análisis o acción..." 
              className="w-full bg-slate-50 border border-slate-200 rounded-full py-3 pl-10 pr-12 text-sm focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
            />
            <button className="absolute right-2 w-8 h-8 flex items-center justify-center bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors shadow-sm">
              <Send size={14} className="ml-0.5" />
            </button>
          </div>
          <p className="text-center text-[10px] text-slate-400 mt-3">
            El Agente Costo360 puede cometer errores. Verifica los reportes críticos.
          </p>
        </div>
      </div>
    </div>
  );
}

// Dummy ChevronRight and FileText to keep imports clean
function ChevronRight(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m9 18 6-6-6-6"/></svg>
}
function FileText(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg>
}
