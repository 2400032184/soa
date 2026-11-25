// Read-only summary card for a complaint (shared by all role dashboards).

import { DeptBadge, PriorityBadge, StatusBadge } from './badges'
import { fmtDateTime, ticketId } from '../utils/format'
import { ComplaintImage } from './ComplaintCollection'

export default function ComplaintSummary({ complaint }) {
  if (!complaint) return null
  return (
    <div className="card">
      <ComplaintImage complaint={complaint} className="complaint-summary-image" />
      <div className="panel">
        <div className="row-between">
          <div>
            <span className="muted small strong">{ticketId(complaint.id)}</span>
            <h2 className="page-title" style={{ fontSize: 20 }}>
              {complaint.title}
            </h2>
          </div>
          <StatusBadge status={complaint.status} />
        </div>
        <p className="mt-12" style={{ whiteSpace: 'pre-wrap' }}>
          {complaint.description}
        </p>
      </div>
      <div className="panel">
        <div className="kv-list">
          <div className="kv-row">
            <span className="kv-key">Priority</span>
            <span className="kv-val">
              <PriorityBadge priority={complaint.priority} />
            </span>
          </div>
          <div className="kv-row">
            <span className="kv-key">Category</span>
            <span className="kv-val">
              <DeptBadge department={complaint.category} />
            </span>
          </div>
          <div className="kv-row">
            <span className="kv-key">Raised by</span>
            <span className="kv-val">{complaint.createdBy?.name || '—'}</span>
          </div>
          <div className="kv-row">
            <span className="kv-key">Created</span>
            <span className="kv-val">{fmtDateTime(complaint.createdAt)}</span>
          </div>
          <div className="kv-row">
            <span className="kv-key">Last updated</span>
            <span className="kv-val">{fmtDateTime(complaint.updatedAt)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}