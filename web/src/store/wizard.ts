import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { MaterialItem, PiezaItem, CotizacionResult } from '@/types/cotizacion'

interface ProyectoState {
  tipo_proyecto: string
  etapa_label: string
  nombre_cliente: string
  margen_pct: number
  dias: number
  personas: number
  zocalo_activo: boolean
  zocalo_ml: number
  incluir_iva: boolean
  inclusiones: string[]
  exclusiones: string[]
}


interface WizardState {
  paso: number
  materiales: MaterialItem[]
  piezas: PiezaItem[]
  proyecto: ProyectoState
  resultado: CotizacionResult | null

  setPaso: (paso: number) => void
  setMateriales: (materiales: MaterialItem[]) => void
  setPiezas: (piezas: PiezaItem[]) => void
  setProyecto: (proyecto: Partial<ProyectoState>) => void
  setResultado: (resultado: CotizacionResult | null) => void
  reset: () => void
}

const defaultProyecto: ProyectoState = {
  tipo_proyecto: 'Meson',
  etapa_label: 'Casa terminada (limpia)',
  nombre_cliente: '',
  margen_pct: 40,
  dias: 2,
  personas: 2,
  zocalo_activo: false,
  zocalo_ml: 0,
  incluir_iva: true,   // Mármoles C&C es responsable de IVA
  inclusiones: [],
  exclusiones: [],
}

export const useWizardStore = create<WizardState>()(
  persist(
    (set) => ({
      paso: 0,
      materiales: [],
      piezas: [],
      proyecto: { ...defaultProyecto },
      resultado: null,

      setPaso: (paso) => set({ paso }),
      setMateriales: (materiales) => set({ materiales }),
      setPiezas: (piezas) => set({ piezas }),
      setProyecto: (proyecto) =>
        set((s) => ({ proyecto: { ...s.proyecto, ...proyecto } })),
      setResultado: (resultado) => set({ resultado }),
      reset: () =>
        set({
          paso: 0,
          materiales: [],
          piezas: [],
          proyecto: { ...defaultProyecto },
          resultado: null,
        }),
    }),
    {
      name: 'costo360-wizard-v1',
      // No persistas acciones (funciones) — solo el estado serializable
      partialize: (s) => ({
        paso: s.paso,
        materiales: s.materiales,
        piezas: s.piezas,
        proyecto: s.proyecto,
        resultado: s.resultado,
      }),
    }
  )
)
