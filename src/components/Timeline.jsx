// Lifecycle timelines for a complaint.

import { useState } from 'react'
import { fmtDateTime } from '../utils/format'
import { IconCheck, IconFileText, IconShield, IconUsers, IconWrench } from './icons'

const LIFECYCLE_STAGES = [
  { key: 'CREATED', label: 'Created', note: 'Complaint submitted', icon: IconFileText },
  { key: 'ASSIGNED', label: 'Assigned', note: 'Department and owner added', icon: IconUsers },
  { key: 'IN_PROGRESS', label: 'In Progress', note: 'Support team is working', icon: IconWrench },
  { key: 'RESOLVED', label: 'Completed', note: 'A solution has been provided', icon: IconCheck },
  { key: 'CLOSED', label: 'Resolved', note: 'Request confirmed complete', icon: IconShield },
]

function eventStatus(event) {
  if (event.type === 'CREATED') return 'CREATED'
  if (event.type === 'ASSIGNED') return 'ASSIGNED'
  const match = /(?:to|is now) ([A-Z_]+)/.exec(event.detail || '')
  return String(event.status || match?.[1] || '').toUpperCase()
}

function stageTimestamp(stageKey, events) {
  const matching = events.filter((event) => {
    const status = eventStatus(event)
    if (stageKey === 'RESOLVED') return status === 'RESOLVED'
    if (stageKey === 'CLOSED') return status === 'CLOSED'
    return status === stageKey
  })
  return matching.length ? matching[matching.length - 1].at : null
}

export function ComplaintLifecycle({ complaint, assignment, events = [] }) {
  const [selectedStage, setSelectedStage] = useState(0)
  const currentKey = complaint?.status === 'CLOSED' ? 'CLOSED' : complaint?.status === 'RESOLVED' ? 'RESOLVED' : complaint?.status || 'OPEN'
  const currentIndex = Math.max(0, LIFECYCLE_STAGES.findIndex((stage) => stage.key === (currentKey === 'OPEN' ? 'CREATED' : currentKey)))
  const selected = LIFECYCLE_STAGES[selectedStage]
  const SelectedIcon = selected.icon
  const selectedTimestamp = stageTimestamp(selected.key, events)
  const assignedText = assignment ? `${assignment.department || 'Service desk'}${assignment.staffName ? ` · ${assignment.staffName}` : ''}` : 'Waiting for assignment'

  const detailForStage = {
    CREATED: { label: 'Submitted by', value: complaint?.createdBy?.name || 'You', extra: complaint?.createdAt ? fmtDateTime(complaint.createdAt) : 'Timestamp unavailable' },
    ASSIGNED: { label: 'Handling team', value: assignedText, extra: assignment?.assignedAt ? fmtDateTime(assignment.assignedAt) : 'Not assigned yet' },
    IN_PROGRESS: { label: 'Current owner', value: assignment?.staffName || 'Support team', extra: assignment?.note || 'The team is reviewing your complaint.' },
    RESOLVED: { label: 'Completion note', value: assignment?.resolutionNote || 'Resolution is being finalized.', extra: assignment?.updatedAt ? fmtDateTime(assignment.updatedAt) : 'Timestamp unavailable' },
    CLOSED: { label: 'Final status', value: 'Complaint resolved and closed', extra: assignment?.updatedAt ? fmtDateTime(assignment.updatedAt) : 'Timestamp unavailable' },
  }[selected.key]

  return <section className="lifecycle-tracker-card" aria-label="Complaint lifecycle tracker">
    <div className="lifecycle-tracker-header"><div><span className="dashboard-eyebrow">TRACKING JOURNEY</span><h3 className="card-title">Complaint lifecycle</h3><p className="card-sub">Select a stage to see what happened</p></div><span className="lifecycle-current-status">{currentKey.replace('_', ' ')}</span></div>
    <div className="lifecycle-stepper">
      <div className="lifecycle-progress-line"><span style={{ width: `${(currentIndex / (LIFECYCLE_STAGES.length - 1)) * 100}%` }} /></div>
      {LIFECYCLE_STAGES.map((stage, index) => {
        const StageIcon = stage.icon
        const complete = index < currentIndex
        const current = index === currentIndex
        return <button type="button" className={`lifecycle-step ${complete ? 'complete' : ''} ${current ? 'current' : ''} ${selectedStage === index ? 'selected' : ''}`} key={stage.key} onClick={() => setSelectedStage(index)} aria-label={`${stage.label} stage`}><span className="lifecycle-step-icon">{complete ? <IconCheck size={17} /> : <StageIcon size={17} />}</span><strong>{stage.label}</strong><small>{stageTimestamp(stage.key, events) ? fmtDateTime(stageTimestamp(stage.key, events)) : current ? 'Current stage' : 'Not reached'}</small></button>
      })}
    </div>
    <div className="lifecycle-stage-detail"><div className="lifecycle-detail-icon"><SelectedIcon size={19} /></div><div><span>{selected.note}</span><strong>{detailForStage.label}: {detailForStage.value}</strong><small>{selectedTimestamp ? fmtDateTime(selectedTimestamp) : detailForStage.extra}</small></div></div>
  </section>
}

function dotClass(ev) {
  if (ev.type === 'CREATED') return 'gray'
  if (ev.type === 'ASSIGNED') return 'amber'
  if (ev.type === 'STATUS') {
    const match = /to ([A-Z_]+)/.exec(ev.detail || '')
    const s = String(ev.status || match?.[1] || '').toUpperCase()
    if (s === 'RESOLVED' || s === 'CLOSED') return 'green'
    if (s === 'IN_PROGRESS') return 'purple'
    return 'amber'
  }
  return ''
}

export default function Timeline({ events }) {
  if (!events || events.length === 0) {
    return <p className="muted small">No activity recorded yet.</p>
  }
  return (
    <ul className="timeline">
      {events.map((ev, i) => (
        <li key={`${ev.at}-${i}`} className="tl-item">
          <span className={`tl-dot ${dotClass(ev)}`} />
          <div className="tl-body">
            <span className="tl-title">{ev.by || 'System'}</span>
            <span className="tl-time">{new Date(ev.at).toLocaleString()}</span>
            <div className="tl-desc">{ev.detail}</div>
          </div>
        </li>
      ))}
    </ul>
  )
}