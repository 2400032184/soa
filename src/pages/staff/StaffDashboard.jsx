// STAFF dashboard: my workload KPIs + latest assignments.

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import * as assignmentService from '../../services/assignmentService'
import * as notificationService from '../../services/notificationService'
import { apiError } from '../../api/client'
import { emitDataChanged, onDataChanged } from '../../utils/events'
import { timeAgo, ticketId } from '../../utils/format'
import { PriorityBadge, StatusBadge, DeptBadge } from '../../components/badges'
import { EmptyState, Modal, Spinner } from '../../components/ui'
import { IconArrowRight, IconCheck, IconClock, IconTicket } from '../../components/icons'
import DashboardAnalytics from '../../components/DashboardAnalytics'

function deadlineFor(assignment) {
  const explicit = assignment?.estimatedResolutionAt || assignment?.estimatedDueAt || assignment?.dueAt
  if (explicit) return new Date(explicit)
  const estimate = String(assignment?.estimatedResolution || '').match(/(\d+)\s*(hour|day)/i)
  if (!estimate || !assignment?.assignedAt) return null
  const hours = Number(estimate[1]) * (estimate[2].toLowerCase().startsWith('day') ? 24 : 1)
  return new Date(new Date(assignment.assignedAt).getTime() + hours * 60 * 60 * 1000)
}

function isOverdue(assignment) {
  const deadline = deadlineFor(assignment)
  return deadline && !Number.isNaN(deadline.getTime()) && deadline.getTime() < Date.now()
}

export default function StaffDashboard() {
  const { user } = useAuth()
  const toast = useToast()
  const [assignments, setAssignments] = useState(null)
  const [unread, setUnread] = useState(0)
  const [confirmAction, setConfirmAction] = useState(null)
  const [actionBusy, setActionBusy] = useState(false)
  const [error, setError] = useState('')
  const [assignmentStatusFilter, setAssignmentStatusFilter] = useState('ALL')

  useEffect(() => {
    let alive = true
    const load = () =>
      assignmentService
        .staffAssignments(user.id)
        .then((a) => alive && setAssignments(a))
        .catch(() => alive && setAssignments([]))
      notificationService.unreadCount(user.id).then((count) => alive && setUnread(count)).catch(() => {})
    load()
    const off = onDataChanged(load)
    return () => {
      alive = false
      off()
    }
  }, [user.id])

  if (!assignments) return <Spinner />

  const count = (s) => assignments.filter((a) => a.status === s).length
  const pending = count('ASSIGNED')
  const inProgress = count('IN_PROGRESS')
  const done = count('RESOLVED') + count('CLOSED')
  const overdue = assignments.filter((assignment) => isOverdue(assignment)).length
  const analyticsMetrics = [
    { key: 'ASSIGNED', label: 'New assignments', shortLabel: 'New', value: pending, tone: 'assigned' },
    { key: 'IN_PROGRESS', label: 'In Progress', shortLabel: 'Working', value: inProgress, tone: 'in-progress' },
    { key: 'DONE', label: 'Completed', shortLabel: 'Done', value: done, tone: 'completed' },
    { key: 'OVERDUE', label: 'Overdue', shortLabel: 'Overdue', value: overdue, tone: 'overdue' },
  ]
  const displayedAssignments = assignments.filter((assignment) => {
    const matchesStatus = assignmentStatusFilter === 'ALL'
      || (assignmentStatusFilter === 'DONE' && ['RESOLVED', 'CLOSED'].includes(assignment.status))
      || (assignmentStatusFilter === 'OVERDUE' && isOverdue(assignment))
      || (!['ALL', 'DONE', 'OVERDUE'].includes(assignmentStatusFilter) && assignment.status === assignmentStatusFilter)
    return matchesStatus
  })
  const distributionMetrics = analyticsMetrics.filter((metric) => metric.key !== 'OVERDUE')

  const runStatusAction = async () => {
    if (!confirmAction) return
    setActionBusy(true)
    setError('')
    try {
      await assignmentService.updateStatus(user.name, {
        assignmentId: confirmAction.assignment.id,
        status: confirmAction.status,
        resolutionNote: confirmAction.status === 'RESOLVED' ? 'Work completed by assigned staff.' : '',
      })
      emitDataChanged()
      toast.push(confirmAction.status === 'IN_PROGRESS' ? 'Work started. The customer has been notified.' : 'Complaint marked completed. The customer has been notified.', 'success')
      setConfirmAction(null)
      await assignmentService.staffAssignments(user.id).then(setAssignments)
    } catch (err) {
      setError(apiError(err))
    } finally {
      setActionBusy(false)
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <span className="dashboard-eyebrow">STAFF WORKSPACE</span>
          <h1 className="page-title">Welcome back, {user.name?.split(' ')[0]}</h1>
          <p className="page-sub">Your assigned complaints, priorities, and next actions in one place.</p>
        </div>
        <div className="header-actions"><Link className="btn btn-outline" to="/notifications"><IconClock size={15} /> Notifications {unread > 0 && <span className="notification-count">{unread}</span>}</Link><Link className="btn btn-primary" to="/staff/assignments">Open My Assignments <IconArrowRight size={15} /></Link></div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      <DashboardAnalytics
        metrics={analyticsMetrics}
        distributionMetrics={distributionMetrics}
        totalCount={assignments.length}
        records={assignments.map((assignment) => ({ ...assignment, createdAt: assignment.assignedAt }))}
        selectedKey={assignmentStatusFilter}
        onMetricSelect={(metric) => setAssignmentStatusFilter((current) => current === metric.key ? 'ALL' : metric.key)}
      />

      <section className="card staff-assignments-card">
        <div className="panel row-between staff-section-heading">
          <div>
            <span className="dashboard-eyebrow">MY ASSIGNED COMPLAINTS</span>
            <h2 className="card-title mt-8">Work queue</h2>
            <p className="card-sub">Only complaints assigned to you are shown here.</p>
          </div>
        </div>
        {assignments.length === 0 ? (
          <EmptyState icon={<IconTicket size={26} />} title="Nothing assigned yet" hint="New assignments will appear here automatically." />
        ) : displayedAssignments.length === 0 ? (
          <EmptyState icon={<IconTicket size={26} />} title="No assignments in this chart" hint="Select the chart again to clear its filter." />
        ) : (
          displayedAssignments.map((a) => {
            const c = a.complaint || {}
            const completed = a.status === 'RESOLVED' || a.status === 'CLOSED'
            return (
              <div key={a.id} className={`staff-assignment-row ${isOverdue(a) ? 'is-overdue' : ''}`}>
                <div className="staff-assignment-main"><div className="staff-ticket-line"><strong>{ticketId(c.id || a.complaintId)}</strong><span>{c.title || '(complaint)'}</span></div><div className="staff-assignment-meta"><span>User: {c.createdBy?.name || '—'}</span><span>Category: {c.category || '—'}</span><DeptBadge department={a.department || c.category} /><PriorityBadge priority={c.priority} /><StatusBadge status={a.status} /></div></div>
                <div className="staff-assignment-times"><span>Assigned {timeAgo(a.assignedAt)}</span><span className={isOverdue(a) ? 'overdue-label' : ''}>{a.estimatedResolution || (isOverdue(a) ? 'Overdue' : 'Estimate not set')}</span></div>
                <div className="staff-assignment-actions"><Link className="btn btn-outline btn-sm" to={`/staff/complaints/${c.id || a.complaintId}`}>View Details</Link>{a.status === 'ASSIGNED' && <button type="button" className="btn btn-primary btn-sm" onClick={() => setConfirmAction({ assignment: a, status: 'IN_PROGRESS', label: 'Start Work' })}>Start Work</button>}{a.status === 'IN_PROGRESS' && <button type="button" className="btn btn-success btn-sm" onClick={() => setConfirmAction({ assignment: a, status: 'RESOLVED', label: 'Mark Completed' })}>Mark Completed</button>}{completed && <span className="completed-label"><IconCheck size={14} /> Completed</span>}</div>
              </div>
            )
          })
        )}
      </section>
      <section className="card staff-notifications-card"><div className="panel row-between"><div><h2 className="card-title">Notifications</h2><p className="card-sub">Stay updated on assignment and status changes.</p></div><span className="notification-count staff-notification-total">{unread} unread</span></div><div className="panel staff-notification-note"><IconClock size={18} /><span>{unread ? `You have ${unread} unread notification${unread === 1 ? '' : 's'} waiting.` : 'You are all caught up.'}</span><Link to="/notifications">Open notifications <IconArrowRight size={14} /></Link></div></section>

      <Modal open={Boolean(confirmAction)} title={confirmAction?.label || 'Confirm status change'} onClose={() => !actionBusy && setConfirmAction(null)} footer={<><button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmAction(null)} disabled={actionBusy}>Cancel</button><button type="button" className="btn btn-primary btn-sm" onClick={runStatusAction} disabled={actionBusy}>{actionBusy ? 'Updating…' : 'Confirm'}</button></>}>
        <p className="small">Are you sure you want to <strong>{confirmAction?.label?.toLowerCase()}</strong> for <strong>{confirmAction && ticketId(confirmAction.assignment.complaint?.id || confirmAction.assignment.complaintId)}</strong>?</p>
        <p className="small muted mt-8">The customer will be notified and the complaint status will be updated immediately.</p>
      </Modal>
    </>
  )
}