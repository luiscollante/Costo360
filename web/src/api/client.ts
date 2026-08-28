import axios, { type InternalAxiosRequestConfig } from 'axios'
import { supabase } from '@/lib/supabaseClient'
import { getDeviceIdSync } from '@/lib/deviceId'

const BASE_URL = import.meta.env.VITE_API_URL ?? ''

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (token) config.headers.Authorization = `Bearer ${token}`
  const dev = getDeviceIdSync()
  if (dev) config.headers['X-Device-Id'] = dev
  return config
})

let refreshing: Promise<unknown> | null = null

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const status = err.response?.status
    const original = err.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined

    if (status === 401 && original && !original._retried) {
      original._retried = true
      try {
        refreshing = refreshing ?? supabase.auth.refreshSession()
        await refreshing
      } catch {
        /* noop */
      } finally {
        refreshing = null
      }
      const { data } = await supabase.auth.getSession()
      if (data.session) return api(original)
      await supabase.auth.signOut()
      if (window.location.pathname !== '/login') window.location.href = '/login'
      return Promise.reject(err)
    }

    if (status === 409 && err.response?.data?.detail?.code === 'SESSION_SUPERSEDED') {
      window.dispatchEvent(new CustomEvent('costo360:session-superseded'))
    }

    return Promise.reject(err)
  },
)
