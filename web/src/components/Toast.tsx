import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, AlertCircle } from 'lucide-react'

export interface ToastProps {
  type: 'success' | 'error'
  message: string
  onDismiss: () => void
}

export default function Toast({ type, message, onDismiss }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3500)
    return () => clearTimeout(t)
  }, [onDismiss])

  return (
    <motion.div
      role={type === 'success' ? 'status' : 'alert'}
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.96 }}
      transition={{ duration: 0.2 }}
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium shadow-xl
        ${type === 'success'
          ? 'bg-brand-input-deep border-[#22D3A5]/40 text-[#22D3A5]'
          : 'bg-brand-input-deep border-brand-danger/40 text-brand-danger'
        }`}
      onClick={onDismiss}
    >
      {type === 'success'
        ? <CheckCircle2 className="w-4 h-4 shrink-0" />
        : <AlertCircle className="w-4 h-4 shrink-0" />
      }
      {message}
    </motion.div>
  )
}
