import { useState } from 'react'
import { fmtDateTime, initials, ticketId } from '../utils/format'
import { DeptBadge, PriorityBadge, StatusBadge } from './badges'
import { IconGrid, IconList, IconUsers } from './icons'

const CATEGORY_IMAGES = {
  NETWORK: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1000&q=82',
  TECHNICAL: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1000&q=82',
  BILLING: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1000&q=82',
  ACCOUNTS: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1000&q=82',
  GENERAL: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1000&q=82',
}

export function ComplaintViewToggle({ value, onChange }) {
  return (
    <div className="complaint-view-toggle" role="group" aria-label="Complaint display mode">
      <button
        type="button"
        className={value === 'cards' ? 'active' : ''}
        aria-label="Show complaints as cards"
        aria-pressed={value === 'cards'}
        onClick={() => onChange('cards')}
      >
        <IconGrid size={15} /><span>Cards</span>
      </button>
      <button
        type="button"
        className={value === 'list' ? 'active' : ''}
        aria-label="Show complaints as a list"
        aria-pressed={value === 'list'}
        onClick={() => onChange('list')}
      >
        <IconList size={15} /><span>List</span>
      </button>
    </div>
  )
}

function ReporterStack({ complaint }) {
  const reporters = Array.isArray(complaint.reporters) && complaint.reporters.length
    ? complaint.reporters
    : complaint.createdBy
      ? [complaint.createdBy]
      : []
  const count = Math.max(Number(complaint.reportCount) || 1, reporters.length)

  return (
    <span className="complaint-reporters" aria-label={`${count} ${count === 1 ? 'person has' : 'people have'} reported this issue`}>
      <span className="complaint-reporter-avatars">
        {reporters.slice(0, 3).map((reporter, index) => (
          <span
            className="complaint-reporter-avatar"
            title={reporter.name || 'Reporter'}
            key={reporter.id || `${reporter.name}-${index}`}
          >
            {reporter.avatar || reporter.avatarUrl ? (
              <img src={reporter.avatar || reporter.avatarUrl} alt="" />
            ) : initials(reporter.name || 'U')}
          </span>
        ))}
      </span>
      <span className="complaint-reporter-count"><IconUsers size={12} /> {count} {count === 1 ? 'report' : 'reports'}</span>
    </span>
  )
}

export function ComplaintImage({ complaint, className = '' }) {
  const providedImage = complaint.imageUrl || complaint.image || complaint.photoUrl || complaint.attachmentUrl
  const fallbackImage = CATEGORY_IMAGES[String(complaint.category || 'GENERAL').toUpperCase()] || CATEGORY_IMAGES.GENERAL
  const [imageSrc, setImageSrc] = useState(providedImage || fallbackImage)
  const [usedFallback, setUsedFallback] = useState(!providedImage)

  const handleImageError = () => {
    if (!usedFallback) {
      setImageSrc(fallbackImage)
      setUsedFallback(true)
    }
  }

  return (
    <img
      className={className}
      src={imageSrc}
      alt={`${complaint.category || 'Service'} issue`}
      loading="lazy"
      onError={handleImageError}
    />
  )
}

export function ComplaintCard({ complaint, onClick, assignmentStatus, assignedAt, showReporters = false }) {
  return (
    <button
      type="button"
      className="complaint-card"
      onClick={onClick}
      aria-label={`Open ${ticketId(complaint.id)}: ${complaint.title || 'Complaint'}`}
    >
      <span className="complaint-card-image">
        <ComplaintImage complaint={complaint} />
        <span className="complaint-card-image-shade" />
        <span className="complaint-card-ticket">{ticketId(complaint.id)}</span>
        <span className="complaint-card-status"><StatusBadge status={assignmentStatus || complaint.status} /></span>
        {showReporters && Number(complaint.reportCount) > 1 && (
          <span className="complaint-card-report-pill"><IconUsers size={13} /> {complaint.reportCount} reports</span>
        )}
      </span>
      <span className="complaint-card-body">
        <span className="complaint-card-meta">
          <DeptBadge department={complaint.category} />
          <PriorityBadge priority={complaint.priority} />
        </span>
        <strong className="complaint-card-title">{complaint.title || 'Untitled complaint'}</strong>
        <span className="complaint-card-description">{complaint.description || 'No description provided.'}</span>
        {showReporters && Number(complaint.reportCount) > 1 && <ReporterStack complaint={complaint} />}
        {!showReporters && complaint.createdBy?.name && <span className="complaint-card-customer">Reported by {complaint.createdBy.name}</span>}
        <span className="complaint-card-footer">
          <time dateTime={assignedAt || complaint.createdAt}>{fmtDateTime(assignedAt || complaint.createdAt)}</time>
          {assignmentStatus && <span>Assigned work</span>}
          {!assignmentStatus && <span>View details <span aria-hidden="true">→</span></span>}
        </span>
      </span>
    </button>
  )
}
