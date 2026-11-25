// Assignment Service client (via API Gateway → /api/assignments/**)

import api from '../api/client'
import { withFallback } from '../api/fallback'
import * as mock from '../api/mockApi'

function toArray(data) {
  if (Array.isArray(data)) return data
  return data?.content || data?.data || []
}

function normalizeAssignment(a) {
  if (!a) return a
  const out = { ...a }
  out.status = String(out.status || 'ASSIGNED').toUpperCase()
  if (!out.complaint && out.complaintId) {
    // Real backend may embed the complaint; if not, pages fetch it separately.
    out.complaint = null
  }
  return out
}

export function assignComplaint(actorName, payload) {
  return withFallback(
    async () => normalizeAssignment((await api.post('/api/assignments', payload)).data),
    () => mock.mockAssignComplaint(actorName, payload),
  )
}

export function assignmentForComplaint(complaintId) {
  return withFallback(
    async () => {
      const res = await api.get(`/api/assignments/complaint/${complaintId}`)
      const d = res.data
      const first = Array.isArray(d) ? d[0] : d
      return first ? normalizeAssignment(first) : null
    },
    () => mock.mockAssignmentForComplaint(complaintId),
  )
}

export function staffAssignments(staffId) {
  return withFallback(
    async () =>
      toArray((await api.get(`/api/assignments/staff/${staffId}`)).data).map(normalizeAssignment),
    () => mock.mockStaffAssignments(staffId),
  )
}

export function updateStatus(actorName, { assignmentId, status, resolutionNote }) {
  return withFallback(
    async () =>
      normalizeAssignment(
        (
          await api.put(`/api/assignments/${assignmentId}/status`, { status, resolutionNote })
        ).data,
      ),
    () => mock.mockUpdateStatus(actorName, { assignmentId, status, resolutionNote }),
  )
}