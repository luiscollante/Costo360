import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ItemAIU, ResultadoAIU } from '@/types/cotizacion'

const DEFAULT_ITEMS: ItemAIU[] = [
  { id: '1', desc: 'Suministro material pétreo (suministro)', und: 'm²', cant: 10, punit: 250000 },
  { id: '2', desc: 'Mano de obra corte y elaboración', und: 'm²', cant: 10, punit: 100000 },
  { id: '3', desc: 'Instalación y nivelación', und: 'm²', cant: 10, punit: 50000 },
  { id: '4', desc: 'Insumos (disco, adhesivo, silicona)', und: 'glb', cant: 1, punit: 150000 },
]

interface AiuWizardState {
  paso: number
  nombreCliente: string
  ciudad: string
  telefono: string
  items: ItemAIU[]
  pctA: number
  pctI: number
  pctU: number
  incluirIva: boolean
  resultado: ResultadoAIU | null

  setPaso: (paso: number) => void
  setNombreCliente: (v: string) => void
  setCiudad: (v: string) => void
  setTelefono: (v: string) => void
  setItems: (items: ItemAIU[]) => void
  setPctA: (v: number) => void
  setPctI: (v: number) => void
  setPctU: (v: number) => void
  setIncluirIva: (v: boolean) => void
  setResultado: (resultado: ResultadoAIU | null) => void
  reset: () => void
}

const defaults = {
  paso: 0,
  nombreCliente: '',
  ciudad: '',
  telefono: '',
  items: DEFAULT_ITEMS,
  pctA: 2.0,
  pctI: 2.0,
  pctU: 5.0,
  incluirIva: true,
  resultado: null,
}

export const useAiuWizardStore = create<AiuWizardState>()(
  persist(
    (set) => ({
      ...defaults,

      setPaso: (paso) => set({ paso }),
      setNombreCliente: (nombreCliente) => set({ nombreCliente }),
      setCiudad: (ciudad) => set({ ciudad }),
      setTelefono: (telefono) => set({ telefono }),
      setItems: (items) => set({ items }),
      setPctA: (pctA) => set({ pctA }),
      setPctI: (pctI) => set({ pctI }),
      setPctU: (pctU) => set({ pctU }),
      setIncluirIva: (incluirIva) => set({ incluirIva }),
      setResultado: (resultado) => set({ resultado }),
      reset: () => set({ ...defaults }),
    }),
    {
      name: 'costo360-aiu-wizard-v1',
      // No persistas acciones (funciones) — solo el estado serializable
      partialize: (s) => ({
        paso: s.paso,
        nombreCliente: s.nombreCliente,
        ciudad: s.ciudad,
        telefono: s.telefono,
        items: s.items,
        pctA: s.pctA,
        pctI: s.pctI,
        pctU: s.pctU,
        incluirIva: s.incluirIva,
        resultado: s.resultado,
      }),
    }
  )
)
