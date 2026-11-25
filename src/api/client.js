// Central axios instance.
//
// - Base URL defaults to '' so requests go through the Vite dev-server
//   proxy (see vite.config.js) straight to the Spring Cloud API Gateway.
//   Override with VITE_API_URL for production builds if needed.
// - Attaches the JWT from localStorage on every request.
// - Detects "backend down" conditions so services can fall back to demo mode.

import axios from 'axios'
import { enableDemoMode } from './demoMode'

export const API_BASE = import.meta.env.VITE_API_URL || ''

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 8000,
})

api.interceptors.request.use((config) => {
  try {
    const raw = localStorage.getItem('resolvenow_auth')
    if (raw) {
      const { token } = JSON.parse(raw)
      if (token) config.headers.Authorization = `Bearer ${token}`
    }
  } catch {
    /* ignore malformed auth cache */
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // Invalid/expired token → clear session and send user to login
    if (err?.response?.status === 401) {
      try {
        localStorage.removeItem('resolvenow_auth')
      } catch {
        /* ignore */
      }
      if (window.location.pathname !== '/') {
        window.location.assign('/')
      }
    }
    return Promise.reject(err)
  },
)

/**
 * True when the backend appears unreachable:
 *  - no response at all (network error / DNS), or
 *  - a 5xx whose body is not JSON (e.g. the Vite proxy's plain-text
 *    "cannot proxy" 500 when the gateway is offline).
 * Genuine application errors (4xx, or JSON 5xx from Spring) return false.
 */
export function looksLikeBackendDown(err) {
  if (!err || !err.response) return true
  const status = err.response.status
  if (status < 500) return false
  const ct = String(err.response.headers?.['content-type'] || '')
  return !ct.includes('json')
}

/** Human-friendly message out of an axios/backend error. */
export function apiError(err) {
  if (err?.response) {
    const d = err.response.data
    if (typeof d === 'string' && d.trim()) return d.length > 200 ? `Request failed (${err.response.status})` : d
    return d?.message || d?.error || `Request failed (${err.response.status})`
  }
  return err?.message || 'Network error — is the API Gateway running?'
}

// Convenience: enable demo mode on first sign of an unreachable backend.
export function armDemoFallback() {
  enableDemoMode()
}

export default api