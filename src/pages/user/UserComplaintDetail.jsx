// USER: complaint detail — summary, assignment info and lifecycle timeline.

import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import * as complaintService from '../../services/complaintService'
import * as assignmentService from '../../services/assignmentService'
import { buildTimeline } from '../../utils/timeline'
import { fmtDateTime } from '../../utils/format'
import ComplaintSummary from '../../components/ComplaintSummary'
import Timeline, { ComplaintLifecycle } from '../../components/Timeline'
import { DeptBadge, StatusBadge } from '../../components/badges'
import { EmptyState, Spinner } from '../../components/ui'
import { IconArrowRight, IconWrench } from '../../components/icons'

export default function UserComplaintDetail() {
  const { id } = useParams()
  const [complaint, setComplaint] = useState(null)
  const [assignment, setAssignment] = useState(null)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    let alive = true
    Promise.all([complaintService.complaintById(id), assignmentService.assignmentForComplaint(id)])
      .then(([c, a]) => {
        if (!alive) return
        setComplaint(c)
        setAssignment(a)
      })
      .catch(() => alive && setMissing(true))
    return () => {
      alive = false
    }
  }, [id])

  if (missing) {
    return (
      <div className="card">
        <EmptyState title="Complaint not found" hint="It may have been removed, or the link is incorrect." />
      </div>
    )
  }
  if (!complaint) return <Spinner />

  const estimatedResolution = {
    CRITICAL: 'Within 4 hours',
    HIGH: 'Within 1 business day',
    MEDIUM: 'Within 2 business days',
    LOW: 'Within 3 business days',
  }[complaint.priority] || 'Based on service desk review'

  return (
    <>
      <div className="page-header">
        <div>
          <Link to="/user/complaints" className="small link">
            ← Back to my complaints
          </Link>
          <h1 className="page-title mt-8">Ticket details</h1>
        </div>
      </div>

      <div className="detail-grid">
        <div className="stack">
          <ComplaintSummary complaint={complaint} />
          <ComplaintLifecycle complaint={complaint} assignment={assignment} events={buildTimeline(complaint, assignment)} />
          <div className="card">
            <div className="panel">
              <h3 className="card-title mb-16">Full activity history</h3>
              <Timeline events={buildTimeline(complaint, assignment)} />
            </div>
          </div>
        </div>

        <div className="stack">
          <div className="card">
            <div className="panel">
              <h3 className="card-title">Assignment</h3>
              <p className="card-sub">Which department is handling your ticket</p>
            </div>
            {!assignment ? (
              <EmptyState
                icon={<IconWrench size={24} />}
                title="Not assigned yet"
                hint="An administrator will route this complaint to a department shortly."
              />
            ) : (
              <div className="panel">
                <div className="kv-list">
                  <div className="kv-row">
                    <span className="kv-key">Department</span>
                    <span className="kv-val">
                      <DeptBadge department={assignment.department} />
                    </span>
                  </div>
                  <div className="kv-row">
                    <span className="kv-key">Handled by</span>
                    <span className="kv-val">{assignment.staffName || '—'}</span>
                  </div>
                  <div className="kv-row">
                    <span className="kv-key">Assigned on</span>
                    <span className="kv-val">{fmtDateTime(assignment.assignedAt)}</span>
                  </div>
                  <div className="kv-row">
                    <span className="kv-key">Status</span>
                    <span className="kv-val">
                      <StatusBadge status={assignment.status} />
                    </span>
                  </div>
                  <div className="kv-row">
                    <span className="kv-key">Estimated resolution</span>
                    <span className="kv-val">{estimatedResolution}</span>
                  </div>
                </div>
                {assignment.note && (
                  <>
                    <hr className="divider" />
                    <div className="small muted strong">Note from admin</div>
                    <p className="small mt-8">{assignment.note}</p>
                  </>
                )}
                {assignment.resolutionNote && (
                  <>
                    <hr className="divider" />
                    <div className="small muted strong">Resolution</div>
                    <p className="small mt-8">{assignment.resolutionNote}</p>
                  </>
                )}
              </div>
            )}
            {!assignment && (
              <div className="panel detail-estimate"><div className="kv-row"><span className="kv-key">Estimated resolution</span><span className="kv-val">{estimatedResolution}</span></div></div>
            )}
          </div>

          <div className="card">
            <div className="panel">
              <h3 className="card-title">Need help?</h3>
              <p className="card-sub mt-8">
                If this issue is urgent or getting worse, raise another complaint marked CRITICAL and reference{' '}
                <strong>#{complaint.id}</strong>.
              </p>
              <Link className="btn btn-outline btn-sm mt-16" to="/user/complaints/new">
                Raise new complaint <IconArrowRight size={14} />
              </Link>
            </div>
          </div>
          {complaint.status === 'CLOSED' && (
            <div className="card resolution-actions-card">
              <div className="panel">
                <span className="dashboard-eyebrow">RESOLUTION COMPLETE</span>
                <h3 className="card-title mt-8">How did we do?</h3>
                {assignment?.resolutionNote && <p className="small muted mt-8">{assignment.resolutionNote}</p>}
                <div className="resolution-actions">
                  <button type="button" className="btn btn-outline btn-sm" disabled title="Feedback API is not available yet">Share feedback</button>
                  <button type="button" className="btn btn-ghost btn-sm" disabled title="Reopen API is not available yet">Reopen complaint</button>
                </div>
                <p className="hint mt-8">Feedback and reopening will become available when the service API supports them.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}