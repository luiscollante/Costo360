'use client';

import { motion } from 'framer-motion';
import { Activity, BarChart3, CreditCard, DollarSign, Users } from 'lucide-react';

export default function VariantA() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))] pb-24">
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-bold">
              PG
            </div>
            <span className="font-semibold text-lg tracking-tight">Costo360 - Proto Glass</span>
          </div>
          <nav className="flex items-center gap-6 text-sm text-slate-300">
            <a href="#" className="text-white font-medium">Dashboard</a>
            <a href="#" className="hover:text-white transition-colors">Proyectos</a>
            <a href="#" className="hover:text-white transition-colors">Reportes</a>
            <div className="w-8 h-8 rounded-full bg-slate-800 ml-4 border border-white/10" />
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold mb-2">Visión General</h1>
          <p className="text-slate-400">Resumen analítico de operaciones y costos de proyectos activos.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[
            { title: "Gasto Total MTD", amount: "$124,500.00", icon: DollarSign, change: "+12.5%", color: "text-emerald-400" },
            { title: "Proyectos Activos", amount: "14", icon: Activity, change: "+2", color: "text-indigo-400" },
            { title: "Eficiencia Operativa", amount: "94.2%", icon: BarChart3, change: "-1.1%", color: "text-rose-400" },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-white/5 rounded-full blur-2xl" />
              <div className="flex justify-between items-start mb-4 relative z-10">
                <h3 className="text-slate-400 text-sm font-medium">{stat.title}</h3>
                <stat.icon className="text-slate-500 w-5 h-5" />
              </div>
              <div className="flex items-baseline gap-3 relative z-10">
                <span className="text-3xl font-bold">{stat.amount}</span>
                <span className={`text-xs font-semibold ${stat.color}`}>{stat.change}</span>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          <div className="lg:col-span-2 p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <h3 className="text-lg font-medium mb-6">Tendencia de Costos</h3>
            <div className="h-64 flex items-end gap-2 pb-4 border-b border-white/10">
              {[40, 60, 45, 80, 50, 90, 75, 100, 85, 65, 110, 95].map((h, i) => (
                <div key={i} className="flex-1 bg-indigo-500/20 hover:bg-indigo-500/40 transition-colors rounded-t-md relative group cursor-pointer" style={{ height: `${h}%` }}>
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    ${(h * 1.2).toFixed(1)}k
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs text-slate-500 mt-3 px-2">
              <span>Ene</span>
              <span>Mar</span>
              <span>May</span>
              <span>Jul</span>
              <span>Sep</span>
              <span>Nov</span>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <h3 className="text-lg font-medium mb-6">Distribución por Centro</h3>
            <div className="space-y-4">
              {[
                { name: "Maquinaria", value: 45, color: "bg-indigo-500" },
                { name: "Materiales", value: 30, color: "bg-purple-500" },
                { name: "Mano de Obra", value: 15, color: "bg-pink-500" },
                { name: "Indirectos", value: 10, color: "bg-rose-500" },
              ].map((item, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-300">{item.name}</span>
                    <span className="font-semibold">{item.value}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${item.value}%` }}
                      transition={{ duration: 1, delay: 0.5 + (i * 0.1) }}
                      className={`h-full ${item.color}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
