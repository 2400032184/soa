// STAFF: full work queue with status filter.

import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import * as assignmentService from '../../services/assignmentService'
import * as complaintService from '../../services/complaintService'
import { onDataChanged } from '../../utils/events'
import { fmtDateTime, ticketId } from '../../utils/format'
import { PriorityBadge, StatusBadge } from '../../components/badges'
import { EmptyState, Spinner } from '../../components/ui'
import { IconTicket } from '../../components/icons'
import { ComplaintCard, ComplaintViewToggle } from '../../components/ComplaintCollection'
import { PRIORITIES, STATUSES, STATUS_LABELS } from '../../constants'

export default function StaffAssignments() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [assignments, setAssignments] = useState(null)
  const [viewMode, setViewMode] = useState('cards')
  const query = searchParams.get('search') || ''
  const requestedStatus = searchParams.get('status')
  const requestedPriority = searchParams.get('priority')
  const tab = STATUSES.includes(requestedStatus) ? requestedStatus : 'ALL'
  const priority = PRIORITIES.includes(requestedPriority) ? requestedPriority : 'ALL'
  const updateFilter = (key, value) => {
    const next = new URLSearchParams(searchParams)
    if (value && value !== 'ALL') next.set(key, value)
    else next.delete(key)
    setSearchParams(next, { replace: true })
  }
  const normalizedQuery = query.trim().toLowerCase()

  useEffect(() => {
    let alive = true
    const load = () => assignmentService
        .staffAssignments(user.id)
        .then(async (items) => {
          const hydrated = await Promise.all(items.map(async (assignment) => {
            if (assignment.complaint || !assignment.complaintId) return assignment
            try {
              const complaint = await complaintService.complaintById(assignment.complaintId)
              return { ...assignment, complaint }
            } catch (error) {
              console.error(`Unable to load complaint ${assignment.complaintId} for assignment`, error)
              return assignment
            }
          }))
          if (alive) setAssignments(hydrated)
        })
        .catch(() => alive && setAssignments([]))
    load()
    const off = onDataChanged(load)
    return () => {
      alive = false
      off()
    }
  }, [user.id])

  const filtered = useMemo(() => {
    if (!assignments) return []
    return assignments.filter((assignment) => (
      (tab === 'ALL' || assignment.status === tab) &&
      (priority === 'ALL' || assignment.complaint?.priority === priority) &&
      (!normalizedQuery ||
        assignment.complaint?.title?.toLowerCase().includes(normalizedQuery) ||
        String(assignment.complaintId || '').toLowerCase().includes(normalizedQuery) ||
        assignment.complaint?.category?.toLowerCase().includes(normalizedQuery) ||
        assignment.complaint?.createdBy?.name?.toLowerCase().includes(normalizedQuery))
    ))
  }, [assignments, tab, priority, normalizedQuery])

  if (!assignments) return <Spinner />

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">My Assignments</h1>
          <p className="page-sub">{filtered.length} of {assignments.length} shown</p>
        </div>
      </div>

      <div className="filter-bar">
        <div className="tabs">
          <button type="button" className={`tab ${tab === 'ALL' ? 'active' : ''}`} onClick={() => updateFilter('status', 'ALL')}>
            All ({assignments.length})
          </button>
          {STATUSES.map((s) => (
            <button key={s} type="button" className={`tab ${tab === s ? 'active' : ''}`} onClick={() => updateFilter('status', s)}>
              {STATUS_LABELS[s]} ({assignments.filter((a) => a.status === s).length})
            </button>
          ))}
        </div>
        <select className="select" value={priority} onChange={(event) => updateFilter('priority', event.target.value)} aria-label="Filter by priority">
          <option value="ALL">All priorities</option>
          {PRIORITIES.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <input
          className="input search-input"
          placeholder="Search title / ticket…"
          value={query}
          onChange={(event) => updateFilter('search', event.target.value)}
          aria-label="Search assignments"
        />
        <ComplaintViewToggle value={viewMode} onChange={setViewMode} />
      </div>

      {viewMode === 'cards' ? (
        <div className="complaint-card-grid">
          {filtered.map((assignment) => {
            const complaint = assignment.complaint || { id: assignment.complaintId }
            return (
              <ComplaintCard
                key={assignment.id}
                complaint={complaint}
                assignmentStatus={assignment.status}
                assignedAt={assignment.assignedAt}
                onClick={() => navigate(`/staff/complaints/${complaint.id || assignment.complaintId}`)}
              />
            )
          })}
        </div>
      ) : <div className="card table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Ticket</th>
              <th>Title</th>
              <th>Customer</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Assigned on</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => {
              const c = a.complaint || {}
              return (
                <tr key={a.id} className="row-click" onClick={() => navigate(`/staff/complaints/${c.id || a.complaintId}`)}>
                  <td className="cell-strong nowrap">{ticketId(c.id || a.complaintId)}</td>
                  <td className="cell-strong">{c.title || '—'}</td>
                  <td>{c.createdBy?.name || '—'}</td>
                  <td>
                    <PriorityBadge priority={c.priority} />
                  </td>
                  <td>
                    <StatusBadge status={a.status} />
                  </td>
                  <td className="cell-muted nowrap">{fmtDateTime(a.assignedAt)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>}
      {filtered.length === 0 && (
        <EmptyState icon={<IconTicket size={26} />} title="No matching assignments" hint="Try a different status filter." />
      )}
    </>
  )
}