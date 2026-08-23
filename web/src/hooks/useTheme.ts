import { useState, useEffect } from 'react'

export type Theme = 'dark' | 'light'

const STORAGE_KEY = 'cm-theme'

let _theme: Theme = (() => {
  try {
    const s = localStorage.getItem(STORAGE_KEY) as Theme | null
    if (s === 'dark' || s === 'light') return s
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } catch { return 'dark' }
})()

const _listeners = new Set<(t: Theme) => void>()

function applyTheme(t: Theme) {
  _theme = t
  document.documentElement.setAttribute('data-theme', t)
  try { localStorage.setItem(STORAGE_KEY, t) } catch {}
  _listeners.forEach(fn => fn(t))
}

export function useTheme() {
  const [theme, setLocal] = useState<Theme>(_theme)

  useEffect(() => {
    setLocal(_theme)
    _listeners.add(setLocal)
    return () => { _listeners.delete(setLocal) }
  }, [])

  return { theme, toggleTheme: () => applyTheme(_theme === 'dark' ? 'light' : 'dark') }
}
