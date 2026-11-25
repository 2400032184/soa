// Auth Service client (via API Gateway → /api/auth/**)

import api from '../api/client'
import { withFallback } from '../api/fallback'
import * as mock from '../api/mockApi'

function decodeJwtUser(token) {
  try {
    const part = token.split('.')[1]
    if (!part) return null
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'))
    const claims = JSON.parse(json)
    let role = claims.role || claims.authorities?.[0] || claims.scope || 'USER'
    if (typeof role === 'object') role = role.authority || 'USER'
    role = String(role).replace(/^ROLE_/, '').toUpperCase()
    return {
      id: claims.uid ?? claims.userId ?? claims.sub,
      name: claims.name || claims.fullName || claims.sub,
      email: claims.email || claims.sub,
      role,
    }
  } catch {
    return null
  }
}

function normalizeAuth(data, fallbackEmail = '') {
  const token = data.token || data.accessToken || data.jwt || data.id_token
  const tokenUser = token ? decodeJwtUser(token) : null
  const source = data.user || data.profile || {}
  let role = source.role || data.role || tokenUser?.role || 'USER'
  if (typeof role === 'object') role = role.authority || 'USER'
  const user = {
    ...tokenUser,
    ...source,
    id: source.id ?? data.id ?? data.userId ?? tokenUser?.id ?? null,
    name: source.name || source.fullName || source.username || data.name || data.fullName || data.username || tokenUser?.name || fallbackEmail,
    email: fallbackEmail || source.email || data.email || tokenUser?.email || '',
    role: String(role).replace(/^ROLE_/, '').toUpperCase(),
  }

  return { token, user }
}

export function login(email, password) {
  return withFallback(
    async () => normalizeAuth((await api.post('/api/auth/login', { email, password })).data, email),
    () => mock.mockLogin(email, password),
  )
}

export function register({ name, email, password, role = 'USER' }) {
  const normalizedRole = String(role || 'USER').toUpperCase()

  return withFallback(
    async () => normalizeAuth((await api.post('/api/auth/register', { name, email, password, role: normalizedRole })).data, email),
    () => mock.mockRegister({ name, email, password, role: normalizedRole }),
  )
}