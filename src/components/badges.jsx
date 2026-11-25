// Colored pill badges for domain values.

import { STATUS_LABELS } from '../constants'

export function StatusBadge({ status }) {
  const s = String(status || 'OPEN').toUpperCase()
  return <span className={`badge b-${s.toLowerCase().replace('_', '')}`}>{STATUS_LABELS[s] || s}</span>
}

export function PriorityBadge({ priority }) {
  const p = String(priority || 'MEDIUM').toUpperCase()
  return <span className={`badge b-${p.toLowerCase()}`}>{p}</span>
}

export function RoleBadge({ role }) {
  const r = String(role || 'USER').toUpperCase()
  return <span className={`badge b-role-${r.toLowerCase()}`}>{r}</span>
}

export function DeptBadge({ department }) {
  if (!department) return null
  return <span className="badge b-dept">{String(department).toUpperCase()}</span>
}