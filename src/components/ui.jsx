// Small shared UI primitives.

import { useEffect } from 'react'
import { IconX } from './icons'

export function Spinner() {
  return (
    <div className="center-spin" role="status" aria-label="Loading">
      <div className="spinner" />
    </div>
  )
}

export function EmptyState({ icon = null, title = 'Nothing here yet', hint = '' }) {
  return (
    <div className="empty-state" role="status">
      {icon && <div className="empty-icon">{icon}</div>}
      <div className="strong">{title}</div>
      {hint && <div className="small mt-8">{hint}</div>}
    </div>
  )
}

export function Modal({ open, title, onClose, children, footer }) {
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-head">
          <h3 id="modal-title" className="card-title">{title}</h3>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close">
            <IconX size={16} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  )
}

export function StatCard({ icon, tone = 'si-indigo', value, label }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${tone}`}>{icon}</div>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  )
}