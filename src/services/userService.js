// User management client (Admin) — via API Gateway

import api from '../api/client'
import { withFallback } from '../api/fallback'
import * as mock from '../api/mockApi'

function toArray(data) {
  if (Array.isArray(data)) return data
  return data?.content || data?.data || []
}

export function listUsers(role) {
  return withFallback(
    async () => toArray((await api.get('/api/users', { params: role ? { role } : {} })).data),
    () => mock.mockListUsers(role),
  )
}

export function createStaff(payload) {
  return withFallback(
    async () => (await api.post('/api/users/staff', payload)).data,
    () => mock.mockCreateStaff(payload),
  )
}