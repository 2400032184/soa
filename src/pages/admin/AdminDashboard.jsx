// ADMIN dashboard: service-desk KPIs + department workload + recent tickets.

import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import * as complaintService from '../../services/complaintService'
import * as assignmentService from '../../services/assignmentService'
import { onDataChanged } from '../../utils/events'
import { timeAgo, ticketId } from '../../utils/format'
import { PriorityBadge, StatusBadge } from '../../components/badges'
import { EmptyState, Spinner } from '../../components/ui'
import { IconAlert, IconArrowRight, IconCheck, IconSearch, IconTicket, IconWrench } from '../../components/icons'
import DashboardAnalytics from '../../components/DashboardAnalytics'
import { DEPARTMENTS, PRIORITIES, STATUSES, STATUS_LABELS } from '../../constants'

const escalated = (complaint) => complaint.escalated === true || complaint.isEscalated === true || complaint.status === 'ESCALATED'
const needsAttention = (complaint) => escalated(complaint) || complaint.priority === 'CRITICAL' || complaint.status === 'OPEN'

function deadlineFor(assignment) {
  if (!assignment) return null
  const explicit = assignment.estimatedResolutionAt || assignment.estimatedDueAt || assignment.dueAt
  if (explicit) return new Date(explicit)
  const estimate = String(assignment.estimatedResolution || '').match(/(\d+)\s*(hour|day)/i)
  if (!estimate || !assignment.assignedAt) return null
  const duration = Number(estimate[1]) * (estimate[2].toLowerCase().startsWith('day') ? 24 : 1)
  return new Date(new Date(assignment.assignedAt).getTime() + duration * 60 * 60 * 1000)
}

function urgencyFor(complaint, assignment) {
  if (escalated(complaint) || assignment?.escalated === true || assignment?.isEscalated === true) return 'ESCALATED'
  const deadline = deadlineFor(assignment)
  if (!deadline || Number.isNaN(deadline.getTime())) return complaint.priority === 'HIGH' || complaint.priority === 'CRITICAL' ? 'APPROACHING' : 'ON_TRACK'
  const remaining = deadline.getTime() - Date.now()
  if (remaining < 0) return 'OVERDUE'
  if (remaining <= 24 * 60 * 60 * 1000 || complaint.priority === 'HIGH' || complaint.priority === 'CRITICAL') return 'APPROACHING'
  return 'ON_TRACK'
}

function timeLabel(complaint, assignment, urgency) {
  const deadline = deadlineFor(assignment)
  if (!deadline || Number.isNaN(deadline.getTime())) return complaint.priority === 'CRITICAL' ? 'Priority review' : 'No estimate'
  const difference = Math.abs(deadline.getTime() - Date.now())
  const hours = Math.max(1, Math.round(difference / (60 * 60 * 1000)))
  if (urgency === 'OVERDUE') return `${hours >= 24 ? `${Math.floor(hours / 24)}d ` : ''}${hours % 24}h overdue`
  if (hours < 24) return `${hours}h remaining`
  return `${Math.floor(hours / 24)}d remaining`
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [complaints, setComplaints] = useState(null)
  const [assignments, setAssignments] = useState({})
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [priorityFilter, setPriorityFilter] = useState('ALL')
  const [departmentFilter, setDepartmentFilter] = useState('ALL')
  const [sortBy, setSortBy] = useState('newest')
  const [escalationFilter, setEscalationFilter] = useState('ALL')

  useEffect(() => {
    let alive = true
    const load = () =>
      complaintService
        .allComplaints()
        .then(async (c) => {
          if (!alive) return
          setComplaints(c)
          const assignmentEntries = await Promise.all(c.map(async (complaint) => [complaint.id, await assignmentService.assignmentForComplaint(complaint.id).catch(() => null)]))
          if (alive) setAssignments(Object.fromEntries(assignmentEntries))
        })
        .catch(() => alive && setComplaints([]))
    load()
    const off = onDataChanged(load)
    return () => {
      alive = false
      off()
    }
  }, [])

  const filteredComplaints = useMemo(() => {
    if (!complaints) return []
    const normalizedQuery = query.trim().toLowerCase()
    return [...complaints].filter((complaint) => {
      const matchesQuery = !normalizedQuery || complaint.title?.toLowerCase().includes(normalizedQuery) || String(complaint.id).toLowerCase().includes(normalizedQuery) || complaint.createdBy?.name?.toLowerCase().includes(normalizedQuery)
      const matchesStatus = statusFilter === 'ALL' || (statusFilter === 'ESCALATED' ? escalated(complaint) : complaint.status === statusFilter)
      return matchesQuery && matchesStatus && (priorityFilter === 'ALL' || complaint.priority === priorityFilter) && (departmentFilter === 'ALL' || complaint.category === departmentFilter)
    }).sort((a, b) => sortBy === 'oldest' ? new Date(a.createdAt) - new Date(b.createdAt) : sortBy === 'priority' ? PRIORITIES.indexOf(b.priority) - PRIORITIES.indexOf(a.priority) : new Date(b.createdAt) - new Date(a.createdAt))
  }, [complaints, query, statusFilter, priorityFilter, departmentFilter, sortBy])

  const escalationItems = useMemo(() => (complaints || []).map((complaint) => {
    const assignment = assignments[complaint.id]
    const urgency = urgencyFor(complaint, assignment)
    return { complaint, assignment, urgency, time: timeLabel(complaint, assignment, urgency) }
  }).filter((item) => escalationFilter === 'ALL' || item.urgency === escalationFilter).sort((a, b) => {
    const order = { ESCALATED: 0, OVERDUE: 1, APPROACHING: 2, ON_TRACK: 3 }
    return order[a.urgency] - order[b.urgency]
  }), [complaints, assignments, escalationFilter])

  if (!complaints) return <Spinner />

  const count = (s) => complaints.filter((c) => c.status === s).length
  const escalatedCount = complaints.filter(escalated).length
  const attentionComplaints = complaints.filter(needsAttention).sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
  const escalationCounts = escalationItems.reduce((counts, item) => ({ ...counts, [item.urgency]: (counts[item.urgency] || 0) + 1 }), {})
  const analyticsMetrics = [
    { key: 'OPEN', label: 'Open', shortLabel: 'Open', value: count('OPEN'), tone: 'open' },
    { key: 'ASSIGNED', label: 'Assigned', shortLabel: 'Assigned', value: count('ASSIGNED'), tone: 'assigned' },
    { key: 'IN_PROGRESS', label: 'In Progress', shortLabel: 'Working', value: count('IN_PROGRESS'), tone: 'in-progress' },
    { key: 'RESOLVED', label: 'Resolved', shortLabel: 'Resolved', value: count('RESOLVED'), tone: 'resolved' },
    { key: 'CLOSED', label: 'Closed', shortLabel: 'Closed', value: count('CLOSED'), tone: 'completed' },
    { key: 'ESCALATED', label: 'Escalated', shortLabel: 'Escalated', value: escalatedCount, tone: 'escalated' },
  ]
  const statusChart = [
    { key: 'OPEN', label: 'Open', tone: 'chart-cherry' },
    { key: 'ASSIGNED', label: 'Assigned', tone: 'chart-olive' },
    { key: 'IN_PROGRESS', label: 'In progress', tone: 'chart-bordo' },
    { key: 'RESOLVED', label: 'Resolved', tone: 'chart-green' },
    { key: 'CLOSED', label: 'Closed', tone: 'chart-butter' },
  ].map((item) => ({ ...item, value: count(item.key) }))
  const priorityChart = [
    { key: 'CRITICAL', label: 'Critical', tone: 'priority-critical' },
    { key: 'HIGH', label: 'High', tone: 'priority-high' },
    { key: 'MEDIUM', label: 'Medium', tone: 'priority-medium' },
    { key: 'LOW', label: 'Low', tone: 'priority-low' },
  ].map((item) => ({
    ...item,
    value: complaints.filter((c) => c.priority === item.key).length,
  }))
  const maxPriority = Math.max(1, ...priorityChart.map((item) => item.value))
  const lifecycle = [
    { key: 'OPEN', label: 'Open', note: 'Newly received', tone: 'lifecycle-cherry' },
    { key: 'ASSIGNED', label: 'Assigned', note: 'Owner added', tone: 'lifecycle-olive' },
    { key: 'IN_PROGRESS', label: 'In progress', note: 'Being worked', tone: 'lifecycle-bordo' },
    { key: 'RESOLVED', label: 'Resolved', note: 'Solution provided', tone: 'lifecycle-green' },
    { key: 'CLOSED', label: 'Closed', note: 'Confirmed complete', tone: 'lifecycle-butter' },
  ].map((stage, index, stages) => ({
    ...stage,
    value: count(stage.key),
    progression: index === 0 ? null : count(stages[index - 1].key) ? Math.round((count(stage.key) / count(stages[index - 1].key)) * 100) : 0,
  }))

  const workload = DEPARTMENTS.map((d) => ({
    dept: d,
    total: complaints.filter((c) => c.category === d).length,
  })).sort((a, b) => b.total - a.total)
  const maxWorkload = Math.max(1, ...workload.map((w) => w.total))

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Service Desk Overview</h1>
          <p className="page-sub">Monitor intake, assignments and resolution across all departments.</p>
        </div>
        <div className="header-actions">
          <Link className="btn btn-primary" to="/admin/complaints">
            Manage Complaints
          </Link>
        </div>
      </div>

      <DashboardAnalytics
        metrics={analyticsMetrics}
        distributionMetrics={analyticsMetrics.filter((metric) => metric.key !== 'ESCALATED')}
        totalCount={complaints.length}
        records={complaints}
        selectedKey={statusFilter}
        onMetricSelect={(metric) => setStatusFilter((current) => current === metric.key ? 'ALL' : metric.key)}
        selectedPriority={priorityFilter}
        onPrioritySelect={setPriorityFilter}
        selectedCategory={departmentFilter}
        onCategorySelect={setDepartmentFilter}
      />

      <section className="card admin-controls-card">
        <div className="admin-controls-heading"><div><h2 className="card-title">Complaint queue</h2><p className="card-sub">Search, filter, and prioritize service requests</p></div><span className="admin-result-count">{filteredComplaints.length} shown</span></div>
        <div className="admin-controls"><label className="dashboard-search"><IconSearch size={16} /><input placeholder="Search ticket, title, or customer" value={query} onChange={(event) => setQuery(event.target.value)} /></label><select className="select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="ALL">All statuses</option><option value="ESCALATED">Escalated</option>{STATUSES.map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}</select><select className="select" value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}><option value="ALL">All priorities</option>{PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority}</option>)}</select><select className="select" value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)}><option value="ALL">All departments</option>{DEPARTMENTS.map((department) => <option key={department} value={department}>{department}</option>)}</select><select className="select" value={sortBy} onChange={(event) => setSortBy(event.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="priority">Highest priority</option></select></div>
      </section>

      <section className="card escalation-center-card">
        <div className="panel">
          <div className="admin-controls-heading"><div><span className="dashboard-eyebrow">SERVICE LEVEL MONITOR</span><h2 className="card-title mt-8">Escalation Center</h2><p className="card-sub">Complaints that need an administrator’s attention</p></div><span className="escalation-center-indicator"><span />Monitoring live</span></div>
          <div className="escalation-filters">{[['ALL', 'All', escalationItems.length], ['ON_TRACK', 'On Track', escalationCounts.ON_TRACK || 0], ['APPROACHING', 'Approaching Deadline', escalationCounts.APPROACHING || 0], ['OVERDUE', 'Overdue', escalationCounts.OVERDUE || 0], ['ESCALATED', 'Escalated', escalationCounts.ESCALATED || 0]].map(([key, label, value]) => <button type="button" className={`escalation-filter ${escalationFilter === key ? 'active' : ''}`} key={key} onClick={() => setEscalationFilter(key)}><span>{label}</span><strong>{value}</strong></button>)}</div>
        </div>
        {escalationItems.length ? <div className="escalation-list">{escalationItems.slice(0, 8).map(({ complaint, assignment, urgency, time }) => <div className={`escalation-item urgency-${urgency.toLowerCase()}`} key={complaint.id}><span className="escalation-warning">{urgency === 'ON_TRACK' ? <IconCheck size={16} /> : <IconAlert size={16} />}</span><div className="escalation-main"><div className="escalation-item-title"><strong>{ticketId(complaint.id)}</strong><span>{complaint.title}</span></div><div className="escalation-item-meta"><PriorityBadge priority={complaint.priority} /><StatusBadge status={complaint.status} /><span>{complaint.category}</span>{assignment?.staffName && <span>Assigned to {assignment.staffName}</span>}</div></div><div className="escalation-time"><strong>{time}</strong><small>{urgency === 'OVERDUE' ? 'Overdue duration' : urgency === 'APPROACHING' ? 'Deadline approaching' : urgency === 'ESCALATED' ? 'Needs escalation' : 'Within target'}</small></div><button type="button" className="escalation-action" onClick={() => navigate(`/admin/complaints/${complaint.id}`)}>{urgency === 'ESCALATED' ? 'Review' : 'Escalate'} <IconArrowRight size={13} /></button></div>)}</div> : <EmptyState icon={<IconCheck size={25} />} title="No complaints in this view" hint="Try another urgency filter or adjust the queue filters above." />}
      </section>

      <div className="grid-2">
        <section className="card chart-panel">
          <div className="panel">
            <div className="row-between">
              <div>
                <h2 className="card-title">Complaint status</h2>
                <p className="card-sub">Live breakdown of the service queue</p>
              </div>
              <div className="chart-total">{complaints.length}<span>Total</span></div>
            </div>
            <div className="status-chart" aria-label="Complaint status breakdown">
              <div
                className="status-donut"
                style={{
                  background: `conic-gradient(${statusChart.map((item, index) => {
                    const start = statusChart.slice(0, index).reduce((sum, current) => sum + current.value, 0)
                    const end = start + item.value
                    const startPercent = complaints.length ? (start / complaints.length) * 100 : 0
                    const endPercent = complaints.length ? (end / complaints.length) * 100 : 0
                    const color = item.key === 'OPEN' ? 'var(--cherry)' : item.key === 'ASSIGNED' ? 'var(--olive)' : item.key === 'IN_PROGRESS' ? 'var(--bordo)' : item.key === 'RESOLVED' ? 'var(--green)' : 'var(--chart-closed, #E0B94F)'
                    return `${color} ${startPercent}% ${endPercent}%`
                  }).join(', ')})`,
                }}
              >
                <div className="status-donut-hole"><strong>{count('OPEN')}</strong><span>Open now</span></div>
              </div>
              <div className="chart-legend">
                {statusChart.map((item) => (
                  <div className="chart-legend-item" key={item.key}>
                    <span className={`chart-swatch ${item.tone}`} />
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="card chart-panel">
          <div className="panel">
            <h2 className="card-title">Priority mix</h2>
            <p className="card-sub">Where attention is needed first</p>
            <div className="priority-chart mt-16">
              {priorityChart.map((item) => (
                <div className="priority-row" key={item.key}>
                  <div className="priority-row-label"><span>{item.label}</span><strong>{item.value}</strong></div>
                  <div className="priority-track"><div className={`priority-fill ${item.tone}`} style={{ width: `${(item.value / maxPriority) * 100}%` }} /></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="card lifecycle-panel">
          <div className="panel">
            <div className="row-between">
              <div>
                <h2 className="card-title">Complaint lifecycle</h2>
                <p className="card-sub">Track each request from intake to completion</p>
              </div>
              <span className="lifecycle-live"><span />Live workflow</span>
            </div>
            <div className="lifecycle-track" aria-label="Complaint lifecycle stages">
              {lifecycle.map((stage, index) => (
                <div className="lifecycle-stage-wrap" key={stage.key}>
                  <div className={`lifecycle-stage ${stage.tone}`}>
                    <div className="lifecycle-stage-top"><span>{String(index + 1).padStart(2, '0')}</span><strong>{stage.value}</strong></div>
                    <div className="lifecycle-stage-name">{stage.label}</div>
                    <div className="lifecycle-stage-note">{stage.note}</div>
                  </div>
                  {index < lifecycle.length - 1 && (
                    <div className="lifecycle-connector">
                      <span />
                      <small>{lifecycle[index + 1].progression}%</small>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="card">
          <div className="panel">
            <h2 className="card-title">Department workload</h2>
            <p className="card-sub">Complaint volume by category</p>
            <div className="mt-16">
              {workload.map((w) => (
                <div key={w.dept} className="bar-row">
                  <span className="bar-label">{w.dept}</span>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${(w.total / maxWorkload) * 100}%` }} />
                  </div>
                  <span className="bar-count">{w.total}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="card attention-panel">
          <div className="panel row-between"><div><h2 className="card-title">Needs attention</h2><p className="card-sub">Open, critical, or escalated complaints</p></div><span className="attention-count">{attentionComplaints.length}</span></div>
          {attentionComplaints.length ? attentionComplaints.slice(0, 5).map((complaint) => <button type="button" className="attention-item" key={complaint.id} onClick={() => navigate(`/admin/complaints/${complaint.id}`)}><span className="attention-icon"><IconAlert size={15} /></span><span><strong>{ticketId(complaint.id)} · {complaint.title}</strong><small>{complaint.priority} priority · {complaint.status.replace('_', ' ')}</small></span><IconWrench size={14} /></button>) : <EmptyState icon={<IconCheck size={24} />} title="No urgent complaints" hint="The queue is looking healthy." />}
        </section>

        <section className="card">
          <div className="panel row-between">
            <div>
              <h2 className="card-title">Latest complaints</h2>
              <p className="card-sub">Filtered queue — click to manage</p>
            </div>
            <Link className="btn btn-outline btn-sm" to="/admin/complaints">
              View all
            </Link>
          </div>
          {complaints.length === 0 ? (
            <EmptyState icon={<IconTicket size={26} />} title="No complaints yet" />
          ) : (
            filteredComplaints.slice(0, 6).map((c) => (
              <div key={c.id} className="notif-item row-click" onClick={() => navigate(`/admin/complaints/${c.id}`)} role="button" tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && navigate(`/admin/complaints/${c.id}`)}>
                <span className={`notif-dot ${c.status === 'OPEN' ? '' : 'read'}`} />
                <div style={{ flex: 1 }}>
                  <div className="notif-msg">
                    <span className="muted strong">{ticketId(c.id)}</span> · {c.title}
                  </div>
                  <div className="notif-time" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <StatusBadge status={c.status} />
                    <PriorityBadge priority={c.priority} />
                    <span>{timeAgo(c.createdAt)}</span>
                  </div>
                </div>
              </div>
            ))
          )}
          {complaints.length > 0 && filteredComplaints.length === 0 && <EmptyState icon={<IconSearch size={25} />} title="No complaints match" hint="Try changing the search or filters." />}
        </section>
      </div>
    </>
  )
}