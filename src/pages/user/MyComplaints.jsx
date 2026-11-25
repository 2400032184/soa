// USER: list of my complaints with status tabs + search.

import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import * as complaintService from '../../services/complaintService'
import { onDataChanged } from '../../utils/events'
import { fmtDateTime, ticketId } from '../../utils/format'
import { PriorityBadge, StatusBadge } from '../../components/badges'
import { EmptyState, Spinner } from '../../components/ui'
import { IconTicket } from '../../components/icons'
import { ComplaintCard, ComplaintViewToggle } from '../../components/ComplaintCollection'
import { PRIORITIES, STATUSES, STATUS_LABELS } from '../../constants'

export default function MyComplaints() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [complaints, setComplaints] = useState(null)
  const [viewMode, setViewMode] = useState('cards')
  const requestedStatus = searchParams.get('status')
  const requestedPriority = searchParams.get('priority')
  const tab = STATUSES.includes(requestedStatus) ? requestedStatus : 'ALL'
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
    complaintService
      .myComplaints(user.id)
      .then((c) => alive && setComplaints(c))
      .catch(() => alive && setComplaints([]))
    const off = onDataChanged(() => {
      complaintService
        .myComplaints(user.id)
        .then((c) => alive && setComplaints(c))
        .catch(() => {})
    })
    return () => {
      alive = false
      off()
    }
  }, [user.id])

  const filtered = useMemo(() => {
    if (!complaints) return []
    const q = query.trim().toLowerCase()
    return complaints.filter((c) => {
      if (tab !== 'ALL' && c.status !== tab) return false
      if (priority !== 'ALL' && c.priority !== priority) return false
      if (!q) return true
      return (
        c.title?.toLowerCase().includes(q) ||
        String(c.id).toLowerCase().includes(q) ||
        c.category?.toLowerCase().includes(q)
      )
    })
  }, [complaints, tab, priority, query])

  if (!complaints) return <Spinner />

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">My Complaints</h1>
          <p className="page-sub">{complaints.length} ticket(s) raised by you</p>
        </div>
        <Link className="btn btn-primary" to="/user/complaints/new">
          + New Complaint
        </Link>
      </div>

      <div className="filter-bar">
        <div className="tabs">
          <button type="button" className={`tab ${tab === 'ALL' ? 'active' : ''}`} onClick={() => updateFilter('status', 'ALL')}>
            All ({complaints.length})
          </button>
          {STATUSES.map((s) => (
            <button key={s} type="button" className={`tab ${tab === s ? 'active' : ''}`} onClick={() => updateFilter('status', s)}>
              {STATUS_LABELS[s]} ({complaints.filter((c) => c.status === s).length})
            </button>
          ))}
        </div>
        <input
          className="input search-input"
          style={{ marginLeft: 'auto' }}
          placeholder="Search title / id…"
          value={query}
          onChange={(e) => updateFilter('search', e.target.value)}
        />
        <select className="select" value={priority} onChange={(event) => updateFilter('priority', event.target.value)} aria-label="Filter by priority">
          <option value="ALL">All priorities</option>
          {PRIORITIES.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <ComplaintViewToggle value={viewMode} onChange={setViewMode} />
      </div>

      {viewMode === 'cards' ? (
        <div className="complaint-card-grid">
          {filtered.map((complaint) => (
            <ComplaintCard
              key={complaint.id}
              complaint={complaint}
              onClick={() => navigate(`/user/complaints/${complaint.id}`)}
            />
          ))}
        </div>
      ) : <div className="card table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Ticket</th>
              <th>Title</th>
              <th>Category</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Raised on</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="row-click" onClick={() => navigate(`/user/complaints/${c.id}`)}>
                <td className="cell-strong nowrap">{ticketId(c.id)}</td>
                <td className="cell-strong">{c.title}</td>
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
        <EmptyState icon={<IconTicket size={26} />} title="No matching complaints" hint="Try a different filter or search term." />
      )}
    </>
  )
}