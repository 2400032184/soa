// Automated alerts feed — shared across all roles.

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import * as notificationService from '../services/notificationService'
import { onDataChanged, emitDataChanged } from '../utils/events'
import { timeAgo } from '../utils/format'
import { EmptyState, Spinner } from '../components/ui'
import { IconAlert, IconBell, IconCheck, IconRefresh, IconUsers, IconWrench } from '../components/icons'

function notificationType(type) {
  const normalized = String(type || '').toUpperCase()
  if (normalized.includes('ESCALAT')) return { label: 'Escalated', className: 'notification-type-escalated', icon: IconAlert }
  if (normalized.includes('DUPLICATE')) return { label: 'Shared report', className: 'notification-type-escalated', icon: IconUsers }
  if (normalized.includes('ASSIGN')) return { label: 'Assignment', className: 'notification-type-assignment', icon: IconUsers }
  if (normalized.includes('STATUS') || normalized.includes('RESOLV')) return { label: 'Status update', className: 'notification-type-status', icon: IconCheck }
  if (normalized.includes('REOPEN')) return { label: 'Reopened', className: 'notification-type-reopened', icon: IconRefresh }
  return { label: 'New complaint', className: 'notification-type-created', icon: IconWrench }
}

function notificationSource(notification) {
  const actor = notification.actorName || notification.senderName || notification.createdBy?.name
  const role = notification.actorRole || notification.senderRole || notification.createdBy?.role
  const type = String(notification.type || '').toUpperCase()
  const inferredRole = type.includes('ASSIGN') || type.includes('COMPLETED_REVIEW')
    ? 'ADMIN'
    : type.includes('STATUS') || type.includes('RESOLV')
      ? 'STAFF'
      : type.includes('COMPLAINT') || type.includes('DUPLICATE')
        ? 'USER'
        : 'SYSTEM'
  return {
    name: actor || (inferredRole === 'SYSTEM' ? 'ResolveNow' : inferredRole === 'ADMIN' ? 'Administrator' : inferredRole === 'STAFF' ? 'Service staff' : 'Customer'),
    role: String(role || inferredRole).toUpperCase(),
    inferred: !actor || !role,
  }
}

export default function Notifications() {
  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [items, setItems] = useState(null)

  const load = () =>
    notificationService
      .myNotifications(user.id)
      .then(setItems)
      .catch(() => setItems([]))

  useEffect(() => {
    let alive = true
    load().then(() => {})
    const off = onDataChanged(() => alive && load())
    return () => {
      alive = false
      off()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id])

  const open = async (n) => {
    const wasUnread = !n.read
    try {
      if (wasUnread) await notificationService.markRead(n.id)
    } catch {
      /* non-fatal */
    }
    emitDataChanged()
    if (n.complaintId) {
      navigate(
        user.role === 'ADMIN'
          ? `/admin/complaints/${n.complaintId}`
          : user.role === 'STAFF'
            ? `/staff/complaints/${n.complaintId}`
            : `/user/complaints/${n.complaintId}`,
      )
    }
    if (wasUnread) toast.push('Notification marked as read.', 'success')
  }

  const markAll = async () => {
    try {
      await notificationService.markAllRead(user.id)
      emitDataChanged()
      setItems((list) => list?.map((n) => ({ ...n, read: true })) ?? list)
      toast.push('All notifications marked as read.', 'success')
    } catch {
      /* ignore */
    }
  }

  const markOne = async (event, notification) => {
    event.stopPropagation()
    if (notification.read) return
    try {
      await notificationService.markRead(notification.id)
      setItems((list) => list?.map((item) => item.id === notification.id ? { ...item, read: true } : item) ?? list)
      emitDataChanged()
      toast.push('Notification marked as read.', 'success')
    } catch {
      /* ignore */
    }
  }

  if (!items) return <Spinner />
  const unread = items.filter((n) => !n.read).length

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-sub">
            {unread > 0 ? `${unread} unread alert(s)` : 'You are all caught up'}
          </p>
        </div>
        {unread > 0 && (
          <button type="button" className="btn btn-outline" onClick={markAll}>
            <IconCheck size={16} /> Mark all as read
          </button>
        )}
      </div>

      <div className="notifications-page-card card">
        {items.length === 0 ? (
          <EmptyState icon={<IconBell size={26} />} title="No notifications yet" hint="Alerts about your complaints will appear here." />
        ) : (
          items.map((n) => {
            const meta = notificationType(n.type)
            const TypeIcon = meta.icon
            const source = notificationSource(n)
            return <div key={n.id} className={`notification-page-item ${n.read ? '' : 'unread'} ${meta.className}`} onClick={() => open(n)} role="button" tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && open(n)}>
              <span className="notification-page-icon"><TypeIcon size={18} /></span>
              <div className="notification-page-content">
                <div className="notification-page-meta"><span className="notification-type-label">{meta.label}</span><span className="notif-time">{timeAgo(n.createdAt)}</span></div>
                <div className="notif-msg">{n.message}</div>
                <div className="notification-origin">
                  <span>{source.inferred ? `Likely source: ${source.name} · ${source.role}` : `From ${source.name} · ${source.role}`}</span>
                  {n.complaintId && <span className="notification-ticket">Complaint #{n.complaintId}</span>}
                </div>
              </div>
              {!n.read ? <button type="button" className="notification-mark-read" onClick={(event) => markOne(event, n)}>Mark read</button> : <span className="notification-read-label"><IconCheck size={14} /> Read</span>}
            </div>
          })
        )}
      </div>
    </>
  )
}