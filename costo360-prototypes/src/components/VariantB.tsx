'use client';

import { Command, Terminal, Search, ChevronRight, Folder, FileText, Database } from 'lucide-react';

export default function VariantB() {
  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-300 font-mono text-sm">
      {/* Top Utility Bar */}
      <div className="h-8 bg-neutral-950 border-b border-neutral-800 flex items-center px-4 justify-between text-xs">
        <div className="flex items-center gap-4">
          <span className="text-white font-bold tracking-widest">C360_PROTO_TERM</span>
          <span className="text-neutral-500">v2.4.1</span>
        </div>
        <div className="flex items-center gap-4 text-neutral-500">
          <span>SRV_STAT: ON</span>
          <span className="text-green-500">-</span>
        </div>
      </div>

      <div className="flex h-[calc(100vh-2rem)]">
        {/* Left Sidebar */}
        <div className="w-64 border-r border-neutral-800 bg-neutral-950/50 p-4">
          <div className="mb-6">
            <div className="text-neutral-500 mb-2 font-semibold">WORKSPACE</div>
            <ul className="space-y-1">
              <li className="flex items-center gap-2 px-2 py-1 bg-neutral-800 text-white rounded"><Folder size={14}/> Dashboard</li>
              <li className="flex items-center gap-2 px-2 py-1 hover:bg-neutral-800/50 rounded cursor-pointer"><FileText size={14}/> Proyectos Activos</li>
              <li className="flex items-center gap-2 px-2 py-1 hover:bg-neutral-800/50 rounded cursor-pointer"><Database size={14}/> Base de Recursos</li>
            </ul>
          </div>
          
          <div>
            <div className="text-neutral-500 mb-2 font-semibold">QUICK ACTIONS</div>
            <ul className="space-y-1 text-xs">
              <li className="px-2 py-1 hover:bg-neutral-800/50 rounded cursor-pointer flex justify-between">
                <span>Nuevo Proyecto</span> <kbd className="text-neutral-500">'N</kbd>
              </li>
              <li className="px-2 py-1 hover:bg-neutral-800/50 rounded cursor-pointer flex justify-between">
                <span>Registrar Gasto</span> <kbd className="text-neutral-500">'G</kbd>
              </li>
              <li className="px-2 py-1 hover:bg-neutral-800/50 rounded cursor-pointer flex justify-between">
                <span>Generar Cierre</span> <kbd className="text-neutral-500">'R</kbd>
              </li>
            </ul>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Command Palette Mock */}
          <div className="p-4 border-b border-neutral-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Buscar recursos, proyectos o comandos (Presiona 'K)..." 
                className="w-full bg-neutral-950 border border-neutral-700 rounded-md py-2 pl-10 pr-4 text-white focus:outline-none focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
                <kbd className="bg-neutral-800 px-2 py-0.5 rounded text-xs border border-neutral-700">'</kbd>
                <kbd className="bg-neutral-800 px-2 py-0.5 rounded text-xs border border-neutral-700">K</kbd>
              </div>
            </div>
          </div>

          {/* High Density Data Table */}
          <div className="flex-1 p-6 overflow-auto">
            <div className="flex justify-between items-end mb-4">
              <div>
                <h1 className="text-white text-lg font-bold mb-1">PROYECTOS_ACTIVOS</h1>
                <p className="text-neutral-500 text-xs">Desglose de costos directos en tiempo real</p>
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700 rounded shadow-sm text-xs transition-colors">
                  EXPORTAR
                </button>
                <button className="px-3 py-1 bg-white hover:bg-neutral-200 text-black border border-white rounded shadow-sm text-xs font-semibold transition-colors">
                  NUEVO
                </button>
              </div>
            </div>

            <div className="border border-neutral-800 rounded-md overflow-hidden bg-neutral-950/30">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-900 border-b border-neutral-800 text-neutral-400">
                  <tr>
                    <th className="px-4 py-3 font-semibold">ID</th>
                    <th className="px-4 py-3 font-semibold">PROYECTO</th>
                    <th className="px-4 py-3 font-semibold">CENTRO_COSTO</th>
                    <th className="px-4 py-3 font-semibold text-right">PRESUPUESTO</th>
                    <th className="px-4 py-3 font-semibold text-right">EJECUTADO</th>
                    <th className="px-4 py-3 font-semibold text-right">DESVIACION</th>
                    <th className="px-4 py-3 font-semibold text-center">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {[
                    { id: "PRJ-092", name: "Remodelación Planta", cc: "OP-NORTE", p: 450000, e: 432000, d: "-4.0%", s: "OK" },
                    { id: "PRJ-093", name: "Mantenimiento Flota", cc: "LOG-CENTRAL", p: 120000, e: 135000, d: "+12.5%", s: "WARN" },
                    { id: "PRJ-094", name: "Ampliación Oficinas", cc: "ADM-SUR", p: 85000, e: 42000, d: "-50.5%", s: "OK" },
                    { id: "PRJ-095", name: "Instalación HVAC", cc: "OP-NORTE", p: 210000, e: 215000, d: "+2.3%", s: "WARN" },
                    { id: "PRJ-096", name: "Software ERP", cc: "IT-CORP", p: 300000, e: 350000, d: "+16.6%", s: "CRIT" },
                  ].map((row, i) => (
                    <tr key={i} className="hover:bg-neutral-800/50 group cursor-pointer">
                      <td className="px-4 py-2 text-neutral-500 group-hover:text-neutral-300">{row.id}</td>
                      <td className="px-4 py-2 font-medium text-neutral-200">{row.name}</td>
                      <td className="px-4 py-2 text-neutral-400">{row.cc}</td>
                      <td className="px-4 py-2 text-right">${row.p.toLocaleString()}</td>
                      <td className="px-4 py-2 text-right">${row.e.toLocaleString()}</td>
                      <td className={`px-4 py-2 text-right ${row.d.startsWith('+') ? 'text-red-400' : 'text-green-400'}`}>{row.d}</td>
                      <td className="px-4 py-2 text-center">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          row.s === 'OK' ? 'bg-green-500/20 text-green-400' :
                          row.s === 'WARN' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {row.s}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Console Log Area */}
            <div className="mt-6 border border-neutral-800 rounded-md bg-black p-3 h-32 overflow-y-auto">
              <div className="flex items-center gap-2 text-neutral-500 mb-1 border-b border-neutral-800 pb-1">
                <Terminal size={14} /> <span>ACTIVITY_LOG</span>
              </div>
              <div className="text-neutral-400 space-y-1 text-xs">
                <div><span className="text-neutral-600">[10:42:01]</span> INFO: Sync de costos materiales finalizado.</div>
                <div><span className="text-neutral-600">[10:45:22]</span> <span className="text-yellow-500">WARN:</span> PRJ-093 ha superado el umbral de desvío del 10%.</div>
                <div><span className="text-neutral-600">[10:48:10]</span> INFO: Nuevo usuario registrado: J. Perez.</div>
                <div className="flex items-center gap-2"><span className="text-green-500">❯</span> <span className="animate-pulse">_</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
