export type ToastKind = 'success' | 'error'
type ToastListener = (type: ToastKind, message: string) => void

let listener: ToastListener | null = null

export function setToastListener(fn: ToastListener | null): void {
  listener = fn
}

export function showToast(type: ToastKind, message: string): void {
  listener?.(type, message)
}
