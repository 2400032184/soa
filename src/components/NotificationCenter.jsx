import { useState } from 'react'
import { initials, timeAgo } from '../utils/format'
import {
  IconAlert,
  IconArrowRight,
  IconBell,
  IconCheck,
  IconRefresh,
  IconUsers,
  IconWrench,
  IconX,
} from './icons'

function notificationType(type, notification = {}) {
  const normalized = String(type || '').toUpperCase()
  if (normalized.includes('MENTION')) return { label: 'Mention', className: 'notification-type-mention', icon: IconUsers }
  if (normalized.includes('SYSTEM')) return { label: 'System alert', className: 'notification-type-system', icon: IconAlert }
  if (notification.important || String(notification.priority || '').toUpperCase() === 'HIGH' || normalized.includes('ESCALAT')) {
    return { label: 'Important', className: 'notification-type-escalated', icon: IconAlert }
  }
  if (normalized.includes('ASSIGN')) return { label: 'Assignment', className: 'notification-type-assignment', icon: IconUsers }
  if (normalized.includes('STATUS') || normalized.includes('RESOLV')) return { label: 'Status update', className: 'notification-type-status', icon: IconCheck }
  if (normalized.includes('REOPEN')) return { label: 'Reopened', className: 'notification-type-reopened', icon: IconRefresh }
  return { label: 'New complaint', className: 'notification-type-created', icon: IconWrench }
}

export function NotificationAvatar({ notification }) {
  const image = notification.avatarUrl || notification.avatar || notification.actorAvatar || notification.senderAvatar
  const name = notification.actorName || notification.senderName || notification.userName || 'ResolveNow'
  const [imageFailed, setImageFailed] = useState(false)

  return (
    <span className="notification-avatar" aria-hidden="true">
      {image && !imageFailed ? (
        <img src={image} alt="" onError={() => setImageFailed(true)} />
      ) : (
        <span>{initials(name)}</span>
      )}
      <i />
    </span>
  )
}

export function NotificationBell({ unread, isOpen, isRinging, isWiggling, isGlowing, onClick }) {
  return (
    <button
      type="button"
      className={`bell-btn ${isOpen ? 'is-open' : ''} ${isRinging ? 'is-ringing' : ''} ${isWiggling ? 'is-wiggling' : ''} ${isGlowing ? 'is-glowing' : ''}`}
      title="Notifications"
      aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
      onClick={onClick}
      aria-expanded={isOpen}
      aria-controls="dashboard-notification-dropdown"
    >
      <IconBell size={19} />
      {unread > 0 && <span className="bell-badge">{unread > 99 ? '99+' : unread}</span>}
    </button>
  )
}

export function NotificationCard({ item, index = 0, onOpen, toast = false }) {
  const meta = notificationType(item.type, item)
  const TypeIcon = meta.icon

  return (
    <button
      type="button"
      className={`notification-card notification-enter ${meta.className} ${item.read ? 'is-read' : 'unread'}${toast ? ' notification-toast-card' : ''}`}
      style={{ '--notification-index': index }}
      onClick={() => onOpen(item)}
      aria-label={`${item.read ? 'Read' : 'Unread'} ${meta.label}: ${item.message}`}
    >
      <NotificationAvatar notification={item} />
      <span className="notification-card-content">
        <span className="notification-card-heading">
          <strong>{item.title || meta.label}</strong>
          {!item.read && <i className="notification-unread-dot" aria-label="Unread" />}
        </span>
        <span className="notification-card-message">{item.message}</span>
        <span className="notification-card-meta">
          <span className={`notification-card-type ${meta.className}`}><TypeIcon size={12} />{meta.label}</span>
          <time dateTime={item.createdAt}>{timeAgo(item.createdAt)}</time>
        </span>
      </span>
    </button>
  )
}

export function NotificationPanel({
  items,
  unread,
  error,
  onClose,
  onOpen,
  onViewAll,
  onMarkAllRead,
}) {
  return (
    <>
      <button className="notification-backdrop" type="button" aria-label="Close notifications" onClick={onClose} />
      <section
        className="notification-dropdown"
        id="dashboard-notification-dropdown"
        role="dialog"
        aria-modal="false"
        aria-labelledby="notification-panel-title"
      >
        <header className="notification-dropdown-head">
          <span className="notification-panel-heading">
            <span className="notification-panel-icon"><IconBell size={17} /></span>
            <span>
              <strong id="notification-panel-title">Notifications</strong>
              <small>{unread ? `${unread} unread` : 'You’re all caught up'}</small>
            </span>
          </span>
          <span className="notification-panel-actions">
            {unread > 0 && <button type="button" onClick={onMarkAllRead}>Mark all read</button>}
            <button type="button" className="notification-close" aria-label="Close notifications" onClick={onClose}><IconX size={17} /></button>
          </span>
        </header>
        {error && <p className="notification-error" role="alert">{error}</p>}
        {items.length ? (
          <div className="notification-dropdown-list" aria-live="polite">
            {items.map((item, index) => <NotificationCard key={item.id} item={item} index={index} onOpen={onOpen} />)}
          </div>
        ) : (
          <div className="notification-dropdown-empty"><IconBell size={22} /><span>No notifications yet</span><small>Updates will appear here.</small></div>
        )}
        <button type="button" className="notification-dropdown-footer" onClick={onViewAll}>
          Open notification center <IconArrowRight size={14} />
        </button>
      </section>
    </>
  )
}

export function NotificationToast({ item, onOpen, onClose }) {
  return (
    <aside className="notification-toast" role="status" aria-live="polite">
      <div className="notification-toast-topline"><span>New notification</span><button type="button" aria-label="Dismiss notification" onClick={onClose}><IconX size={15} /></button></div>
      <NotificationCard item={item} onOpen={onOpen} toast />
    </aside>
  )
}
