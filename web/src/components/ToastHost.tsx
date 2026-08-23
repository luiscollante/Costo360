import { useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import Toast from '@/components/Toast'
import { setToastListener, type ToastKind } from '@/lib/toast'

export default function ToastHost() {
  const [toast, setToast] = useState<{ id: number; type: ToastKind; message: string } | null>(null)

  useEffect(() => {
    setToastListener((type, message) => setToast({ id: Date.now(), type, message }))
    return () => setToastListener(null)
  }, [])

  return (
    <AnimatePresence>
      {toast && (
        <Toast key={toast.id} type={toast.type} message={toast.message} onDismiss={() => setToast(null)} />
      )}
    </AnimatePresence>
  )
}
