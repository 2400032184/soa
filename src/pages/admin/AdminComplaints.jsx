// ADMIN: all complaints with filters; click a row to assign / manage.

import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import * as complaintService from '../../services/complaintService'
import { onDataChanged } from '../../utils/events'
import { fmtDateTime, ticketId } from '../../utils/format'
import { PriorityBadge, StatusBadge } from '../../components/badges'
import { EmptyState, Spinner } from '../../components/ui'
import { IconTicket } from '../../components/icons'
import { ComplaintCard, ComplaintViewToggle } from '../../components/ComplaintCollection'
import { DEPARTMENTS, PRIORITIES, STATUSES, STATUS_LABELS } from '../../constants'

export default function AdminComplaints() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [complaints, setComplaints] = useState(null)
  const [viewMode, setViewMode] = useState('cards')
  const requestedStatus = searchParams.get('status')
  const requestedDepartment = searchParams.get('department')
  const requestedPriority = searchParams.get('priority')
  const status = STATUSES.includes(requestedStatus) ? requestedStatus : 'ALL'
  const dept = DEPARTMENTS.includes(requestedDepartment) ? requestedDepartment : 'ALL'
  const priority = PRIORITIES.includes(requestedPriority) ? requestedPriority : 'ALL'
  const query = searchParams.get('search') || ''
  const updateFilter = (key, value) => {
    const next = new URLSearchParams(searchParams)
    if (value && value !== 'ALL') next.set(key, value)
    else next.delete(key)
    setSearchParams(next, { replace: true })
  }

  useEffect(() => {
    let alive = true
    const load = () =>
      complaintService
        .allComplaints()
        .then((c) => alive && setComplaints(c))
        .catch(() => alive && setComplaints([]))
    load()
    const off = onDataChanged(load)
    return () => {
      alive = false
      off()
    }
  }, [])

  const filtered = useMemo(() => {
    if (!complaints) return []
    const q = query.trim().toLowerCase()
    return complaints.filter((c) => {
      if (status !== 'ALL' && c.status !== status) return false
      if (dept !== 'ALL' && c.category !== dept) return false
      if (priority !== 'ALL' && c.priority !== priority) return false
      if (!q) return true
      return (
        c.title?.toLowerCase().includes(q) ||
        String(c.id).toLowerCase().includes(q) ||
        c.createdBy?.name?.toLowerCase().includes(q)
      )
    })
  }, [complaints, status, dept, priority, query])

  if (!complaints) return <Spinner />

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">All Complaints</h1>
          <p className="page-sub">{filtered.length} of {complaints.length} shown — click a row to assign or update</p>
        </div>
      </div>

      <div className="filter-bar">
        <select className="select" value={status} onChange={(e) => updateFilter('status', e.target.value)} aria-label="Filter by status">
          <option value="ALL">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <select className="select" value={dept} onChange={(e) => updateFilter('department', e.target.value)} aria-label="Filter by department">
          <option value="ALL">All departments</option>
          {DEPARTMENTS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <select className="select" value={priority} onChange={(e) => updateFilter('priority', e.target.value)} aria-label="Filter by priority">
          <option value="ALL">All priorities</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <input
          className="input search-input"
          style={{ marginLeft: 'auto' }}
          placeholder="Search id / title / customer…"
          value={query}
          onChange={(e) => updateFilter('search', e.target.value)}
        />
        <ComplaintViewToggle value={viewMode} onChange={setViewMode} />
      </div>

      {viewMode === 'cards' ? (
        <div className="complaint-card-grid">
          {filtered.map((complaint) => (
            <ComplaintCard
              key={complaint.id}
              complaint={complaint}
              showReporters
              onClick={() => navigate(`/admin/complaints/${complaint.id}`)}
            />
          ))}
        </div>
      ) : <div className="card table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Ticket</th>
              <th>Title</th>
              <th>Customer</th>
              <th>Dept</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Raised</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="row-click" onClick={() => navigate(`/admin/complaints/${c.id}`)}>
                <td className="cell-strong nowrap">{ticketId(c.id)}</td>
                <td className="cell-strong">{c.title}</td>
                <td>{c.createdBy?.name || '—'}</td>
                <td>{c.category}</td>
                <td>
                  <PriorityBadge priority={c.priority} />
                </td>
                <td>
                  <StatusBadge status={c.status} />
                </td>
                <td className="cell-muted nowrap">{fmtDateTime(c.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>}
      {filtered.length === 0 && (
        <EmptyState icon={<IconTicket size={26} />} title="No matching complaints" hint="Adjust the filters above." />
      )}
    </>
  )
}