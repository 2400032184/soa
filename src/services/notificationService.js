// Notification Service client (via API Gateway → /api/notifications/**)

import api from '../api/client'
import { withFallback } from '../api/fallback'
import * as mock from '../api/mockApi'

function toArray(data) {
  if (Array.isArray(data)) return data
  return data?.content || data?.data || []
}

export function myNotifications(userId) {
  return withFallback(
    async () => toArray((await api.get('/api/notifications/my')).data),
    () => mock.mockMyNotifications(userId),
  )
}

export function unreadCount(userId) {
  return withFallback(
    async () => {
      const d = (await api.get('/api/notifications/unread-count')).data
      if (typeof d === 'number') return d
      return d?.count ?? d?.unreadCount ?? d?.unread ?? 0
    },
    () => mock.mockUnreadCount(userId),
  )
}

export function markRead(id) {
  return withFallback(
    async () => (await api.put(`/api/notifications/${id}/read`)).data,
    () => mock.mockMarkRead(id),
  )
}

export function markAllRead(userId) {
  return withFallback(
    async () => (await api.put('/api/notifications/read-all')).data,
    () => mock.mockMarkAllRead(userId),
  )
}