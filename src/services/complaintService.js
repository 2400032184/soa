// Complaint Service client (via API Gateway → /api/complaints/**)

import api from '../api/client'
import { withFallback } from '../api/fallback'
import * as mock from '../api/mockApi'

function toArray(data) {
  if (Array.isArray(data)) return data
  return data?.content || data?.data || data?._embedded?.complaints || []
}

function normalizeComplaint(c) {
  if (!c) return c
  const out = { ...c }
  out.status = String(out.status || 'OPEN').toUpperCase()
  out.priority = String(out.priority || 'MEDIUM').toUpperCase()
  out.category = String(out.category || 'GENERAL').toUpperCase()
  if (typeof out.createdBy === 'string') {
    out.createdBy = { id: null, name: out.createdBy, email: '' }
  }
  if (!Array.isArray(out.reporters) && out.createdBy) out.reporters = [out.createdBy]
  out.reportCount = Math.max(Number(out.reportCount) || 0, out.reporters?.length || 0, 1)
  return out
}

function duplicateKey(complaint) {
  const title = String(complaint.title || '').trim().toLowerCase().replace(/\s+/g, ' ')
  const category = String(complaint.category || 'GENERAL').trim().toUpperCase()
  return `${category}:${title}`
}

function reportKey(reporter) {
  return String(reporter.id || reporter.email || reporter.name || '').trim().toLowerCase()
}

function withDuplicateReports(complaints) {
  const groups = new Map()
  complaints.forEach((complaint) => {
    const key = duplicateKey(complaint)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(complaint)
  })

  const reportersByKey = new Map()
  groups.forEach((group, key) => {
    const reporters = new Map()
    group.forEach((complaint) => {
      const sources = [...(complaint.reporters || []), complaint.createdBy].filter(Boolean)
      sources.forEach((reporter) => {
        const identity = reportKey(reporter)
        if (identity) reporters.set(identity, reporter)
      })
    })
    reportersByKey.set(key, [...reporters.values()])
  })

  return complaints.map((complaint) => {
    const reporters = reportersByKey.get(duplicateKey(complaint)) || []
    const reportCount = Math.max(reporters.length, Number(complaint.reportCount) || 1)
    const priority = reportCount > 1 && complaint.priority !== 'CRITICAL' ? 'HIGH' : complaint.priority
    return { ...complaint, reporters, reportCount, priority }
  })
}

export function createComplaint(actor, payload) {
  return withFallback(
    async () => normalizeComplaint((await api.post('/api/complaints', payload)).data),
    () => mock.mockCreateComplaint(actor, payload),
  )
}

export function myComplaints(userId) {
  return withFallback(
    async () => toArray((await api.get('/api/complaints/my')).data).map(normalizeComplaint),
    () => mock.mockMyComplaints(userId),
  )
}

export function allComplaints() {
  return withFallback(
    async () => withDuplicateReports(toArray((await api.get('/api/complaints')).data).map(normalizeComplaint)),
    () => withDuplicateReports(mock.mockAllComplaints()),
  )
}

export function complaintById(id) {
  return withFallback(
    async () => normalizeComplaint((await api.get(`/api/complaints/${id}`)).data),
    () => mock.mockComplaintById(id),
  )
}