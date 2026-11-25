// USER dashboard: stats + recent complaints + latest notifications.

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import * as complaintService from '../../services/complaintService'
import * as notificationService from '../../services/notificationService'
import { onDataChanged } from '../../utils/events'
import { timeAgo, ticketId } from '../../utils/format'
import { StatusBadge, PriorityBadge } from '../../components/badges'
import { EmptyState } from '../../components/ui'
import { IconArrowRight, IconBell, IconCheck, IconPlus, IconSearch, IconTicket } from '../../components/icons'
import DashboardAnalytics from '../../components/DashboardAnalytics'
import { STATUS_LABELS, STATUSES } from '../../constants'

function DashboardSkeleton() {
  return <div className="user-dashboard-skeleton" aria-label="Loading dashboard">
    <div className="skeleton-line skeleton-title" />
    <div className="skeleton-stat-grid">{[1, 2, 3, 4, 5].map((item) => <div className="skeleton-block" key={item} />)}</div>
    <div className="skeleton-content-grid"><div className="skeleton-block" /><div className="skeleton-block" /></div>
  </div>
}

export default function UserDashboard() {
  const { user } = useAuth()
  const [complaints, setComplaints] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  useEffect(() => {
    let alive = true
    complaintService
      .myComplaints(user.id)
      .then((c) => alive && setComplaints(c))
      .catch(() => alive && setComplaints([]))
    const loadNotifications = () => {
      notificationService.myNotifications(user.id).then((n) => alive && setNotifications(n.slice(0, 5))).catch(() => {})
      notificationService.unreadCount(user.id).then((count) => alive && setUnreadCount(count)).catch(() => {})
    }
    loadNotifications()
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

  const filteredComplaints = useMemo(() => {
    const availableComplaints = complaints || []
    const normalizedQuery = query.trim().toLowerCase()
    return availableComplaints.filter((complaint) => {
      const matchesStatus = statusFilter === 'ALL'
        || (statusFilter === 'DONE' && ['RESOLVED', 'CLOSED'].includes(complaint.status))
        || complaint.status === statusFilter
      const matchesQuery = !normalizedQuery || complaint.title?.toLowerCase().includes(normalizedQuery) || String(complaint.id).toLowerCase().includes(normalizedQuery)
      return matchesStatus && matchesQuery
    }).slice(0, 5)
  }, [complaints, query, statusFilter])

  if (!complaints) return <DashboardSkeleton />

  const count = (status) => complaints.filter((c) => c.status === status).length
  const activeComplaint = complaints.find((c) => ['OPEN', 'ASSIGNED', 'IN_PROGRESS'].includes(c.status))

  const analyticsMetrics = [
    { key: 'OPEN', label: 'Open', shortLabel: 'Open', value: count('OPEN'), tone: 'open' },
    { key: 'ASSIGNED', label: 'Assigned', shortLabel: 'Assigned', value: count('ASSIGNED'), tone: 'assigned' },
    { key: 'IN_PROGRESS', label: 'In Progress', shortLabel: 'Working', value: count('IN_PROGRESS'), tone: 'in-progress' },
    { key: 'DONE', label: 'Resolved', shortLabel: 'Resolved', value: count('RESOLVED') + count('CLOSED'), tone: 'resolved' },
    { key: 'ESCALATED', label: 'Escalated', shortLabel: 'Escalated', value: count('ESCALATED'), tone: 'escalated' },
  ]

  return (
    <>
      <div className="page-header">
        <div>
          <p className="dashboard-eyebrow">PERSONAL SERVICE DESK</p>
          <h1 className="page-title">Welcome back, {user.name?.split(' ')[0]}</h1>
          <p className="page-sub">Here is the latest movement across your complaints.</p>
        </div>
        <div className="header-actions">
          <Link className="btn btn-primary" to="/user/complaints/new">
            <IconPlus size={16} /> Create Complaint
          </Link>
          <Link className="btn btn-outline" to="/notifications"><IconBell size={16} /> Notifications {unreadCount > 0 && <span className="notification-count">{unreadCount}</span>}</Link>
        </div>
      </div>

      <DashboardAnalytics
        metrics={analyticsMetrics}
        distributionMetrics={analyticsMetrics.filter((metric) => metric.key !== 'ESCALATED')}
        totalCount={complaints.length}
        records={complaints}
        selectedKey={statusFilter}
        onMetricSelect={(metric) => setStatusFilter((current) => current === metric.key ? 'ALL' : metric.key)}
      />

      <div className="user-dashboard-grid">
        <section className={`card active-complaint-card ${activeComplaint ? '' : 'active-complaint-empty'}`}>
          <div className="active-complaint-top"><span className="dashboard-eyebrow">ACTIVE COMPLAINT</span><span className="active-pulse" /></div>
          {activeComplaint ? <>
            <div className="active-complaint-id">{ticketId(activeComplaint.id)}</div>
            <h2>{activeComplaint.title}</h2>
            <p>{activeComplaint.description || 'Your complaint is moving through the resolution process.'}</p>
            <div className="active-complaint-meta"><StatusBadge status={activeComplaint.status} /><PriorityBadge priority={activeComplaint.priority} /><span>{timeAgo(activeComplaint.createdAt)}</span></div>
            <Link className="btn btn-light btn-sm" to={`/user/complaints/${activeComplaint.id}`}>Track complaint <IconArrowRight size={15} /></Link>
          </> : <EmptyState icon={<IconCheck size={25} />} title="You are all caught up" hint="New complaints will appear here while they are active." />}
        </section>

        <section className="card quick-actions-card">
          <div className="panel"><span className="dashboard-eyebrow">QUICK ACTIONS</span><h2 className="card-title mt-8">What would you like to do?</h2>
            <div className="quick-actions"><Link to="/user/complaints/new" className="quick-action"><span className="quick-action-icon"><IconPlus size={18} /></span><span><strong>Raise a complaint</strong><small>Tell us what needs attention</small></span><IconArrowRight size={16} /></Link><Link to="/user/complaints" className="quick-action"><span className="quick-action-icon olive"><IconTicket size={18} /></span><span><strong>Track all complaints</strong><small>Review your complete history</small></span><IconArrowRight size={16} /></Link></div>
          </div>
        </section>

        <section className="card">
          <div className="panel row-between">
            <div>
              <h2 className="card-title">Recent complaints</h2>
              <p className="card-sub">Search and filter your tickets</p>
            </div>
            <Link className="btn btn-outline btn-sm" to="/user/complaints">
              View all
            </Link>
          </div>
          <div className="dashboard-filter-row"><label className="dashboard-search"><IconSearch size={16} /><input placeholder="Search complaints" value={query} onChange={(event) => setQuery(event.target.value)} /></label><select className="select dashboard-status-filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="ALL">All statuses</option><option value="DONE">Resolved / Closed</option><option value="ESCALATED">Escalated</option>{STATUSES.map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}</select></div>
          {complaints.length === 0 ? (
            <EmptyState
              icon={<IconTicket size={26} />}
              title="No complaints yet"
              hint='Click "New Complaint" to raise your first issue.'
            />
          ) : (
            filteredComplaints.map((c) => (
              <Link
                key={c.id}
                to={`/user/complaints/${c.id}`}
                style={{ display: 'block', color: 'inherit', textDecoration: 'none !important' }}
              >
                <div className="notif-item">
                  <span className={`notif-dot ${c.status === 'RESOLVED' || c.status === 'CLOSED' ? 'read' : ''}`} />
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
              </Link>
            ))
          )}
          {complaints.length > 0 && filteredComplaints.length === 0 && <EmptyState icon={<IconSearch size={25} />} title="No complaints match" hint="Try a different search or status filter." />}
        </section>

        <section className="card">
          <div className="panel row-between">
            <div>
              <h2 className="card-title">Latest notifications</h2>
              <p className="card-sub">Automated alerts about your tickets</p>
            </div>
            <Link className="btn btn-outline btn-sm" to="/notifications">
              View all
            </Link>
          </div>
          {notifications.length === 0 ? (
            <EmptyState icon={<IconBell size={26} />} title="No notifications yet" hint="Alerts will appear here as your tickets progress." />
          ) : (
            notifications.map((n) => (
              <div key={n.id} className={`notif-item ${n.read ? '' : 'unread'}`}>
                <span className={`notif-dot ${n.read ? 'read' : ''}`} />
                <div>
                  <div className="notif-msg">{n.message}</div>
                  <div className="notif-time">{timeAgo(n.createdAt)}</div>
                </div>
              </div>
            ))
          )}
        </section>
      </div>
    </>
  )
}