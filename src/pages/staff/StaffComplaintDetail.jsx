// STAFF: work a complaint — start progress, resolve with a note, or close.

import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import * as complaintService from '../../services/complaintService'
import * as assignmentService from '../../services/assignmentService'
import { apiError } from '../../api/client'
import { emitDataChanged } from '../../utils/events'
import { buildTimeline } from '../../utils/timeline'
import ComplaintSummary from '../../components/ComplaintSummary'
import Timeline, { ComplaintLifecycle } from '../../components/Timeline'
import { DeptBadge, StatusBadge } from '../../components/badges'
import { EmptyState, Modal, Spinner } from '../../components/ui'
import { IconCheck, IconClock, IconWrench } from '../../components/icons'

function deadlineFor(assignment) {
  const explicit = assignment?.estimatedResolutionAt || assignment?.estimatedDueAt || assignment?.dueAt
  if (explicit) return new Date(explicit)
  const estimate = String(assignment?.estimatedResolution || '').match(/(\d+)\s*(hour|day)/i)
  if (!estimate || !assignment?.assignedAt) return null
  const hours = Number(estimate[1]) * (estimate[2].toLowerCase().startsWith('day') ? 24 : 1)
  return new Date(new Date(assignment.assignedAt).getTime() + hours * 60 * 60 * 1000)
}

function formatRemaining(deadline, now) {
  if (!deadline || Number.isNaN(deadline.getTime())) return null
  const difference = deadline.getTime() - now
  const hours = Math.floor(Math.abs(difference) / (60 * 60 * 1000))
  const minutes = Math.floor((Math.abs(difference) % (60 * 60 * 1000)) / (60 * 1000))
  return `${difference < 0 ? 'Overdue by ' : ''}${hours}h ${minutes}m`
}

export default function StaffComplaintDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const toast = useToast()

  const [complaint, setComplaint] = useState(null)
  const [assignment, setAssignment] = useState(null)
  const [missing, setMissing] = useState(false)
  const [form, setForm] = useState({ status: '', note: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirmAction, setConfirmAction] = useState(null)
  const [now, setNow] = useState(Date.now())

  const load = () =>
    Promise.all([complaintService.complaintById(id), assignmentService.assignmentForComplaint(id)])
      .then(([c, a]) => {
        setComplaint(c)
        setAssignment(a)
        setForm({ status: a?.status || '', note: '' })
      })
      .catch(() => setMissing(true))

  useEffect(() => {
    let alive = true
    load().catch(() => alive && setMissing(true))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(timer)
  }, [])

  if (missing) {
    return (
      <div className="card">
        <EmptyState title="Assignment not found" hint="This complaint may not be assigned to you." />
      </div>
    )
  }
  if (!complaint) return <Spinner />

  const submit = async () => {
    setError('')
    if (!assignment) return setError('This complaint is not assigned yet.')
    if (!confirmAction?.status) return
    if (confirmAction.status === 'RESOLVED' && !form.note.trim()) {
      setError('Add a resolution note before marking the complaint completed.')
      setConfirmAction(null)
      return
    }
    setBusy(true)
    try {
      await assignmentService.updateStatus(user.name, {
        assignmentId: assignment.id,
        status: confirmAction.status,
        resolutionNote: form.note.trim(),
      })
      emitDataChanged()
      toast.push(confirmAction.status === 'IN_PROGRESS' ? 'Work started — the customer has been notified.' : 'Complaint marked completed — the customer has been notified.', 'success')
      setConfirmAction(null)
      await load()
    } catch (err) {
      setError(apiError(err))
    } finally {
      setBusy(false)
    }
  }

  const completed = assignment?.status === 'RESOLVED' || assignment?.status === 'CLOSED'
  const deadline = deadlineFor(assignment)
  const remaining = formatRemaining(deadline, now)

  return (
    <>
      <div className="page-header">
        <div>
          <Link to="/staff/assignments" className="small link">
            ← Back to my assignments
          </Link>
          <h1 className="page-title mt-8">Work on ticket</h1>
        </div>
      </div>

      <div className="detail-grid">
        <div className="stack">
          <ComplaintSummary complaint={complaint} />
          <ComplaintLifecycle complaint={complaint} assignment={assignment} events={buildTimeline(complaint, assignment)} />
          <div className="card"><div className="panel"><h3 className="card-title mb-16">Full activity history</h3><Timeline events={buildTimeline(complaint, assignment)} /></div></div>
        </div>

        <div className="stack">
          {error && <div className="alert alert-error">{error}</div>}

          <div className="card">
            <div className="panel">
              <span className="dashboard-eyebrow">STAFF ACTIONS</span>
              <h3 className="card-title mt-8">Work on this complaint</h3>
              <p className="card-sub">
                Current: {assignment ? <StatusBadge status={assignment.status} /> : <em>not assigned</em>}
              </p>
            </div>
            <form onSubmit={(event) => { event.preventDefault(); setConfirmAction({ status: form.status }) }}>
              <div className="panel">
                <div className="field">
                  <label className="label" htmlFor="wnote">Progress or resolution note <span className="required">*</span></label>
                  <textarea
                    id="wnote"
                    className="textarea"
                    placeholder={
                      'Add context for the customer and service desk.'
                    }
                    value={form.note}
                    onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                    disabled={!assignment}
                  />
                </div>
                <div className="staff-status-actions"><button type="button" className="btn btn-primary" disabled={busy || !assignment || assignment?.status !== 'ASSIGNED'} onClick={() => { setForm((f) => ({ ...f, status: 'IN_PROGRESS' })); setConfirmAction({ status: 'IN_PROGRESS' }) }}><IconWrench size={15} /> Start Work</button><button type="button" className="btn btn-success" disabled={busy || !assignment || assignment?.status !== 'IN_PROGRESS'} onClick={() => { setForm((f) => ({ ...f, status: 'RESOLVED' })); setConfirmAction({ status: 'RESOLVED' }) }}><IconCheck size={15} /> Mark Completed</button></div>
                {!assignment && <p className="hint mt-8">Waiting for an administrator to assign this complaint.</p>}
                {assignment?.status === 'CLOSED' && <p className="hint mt-8">This complaint is resolved. Staff cannot change the final status.</p>}
              </div>
            </form>
          </div>

          {assignment && (
            <div className="card">
              <div className="panel">
                <h3 className="card-title">Admin context</h3>
                <div className="kv-list mt-12">
                  <div className="kv-row"><span className="kv-key">User</span><span className="kv-val">{complaint.createdBy?.name || '—'}</span></div>
                  <div className="kv-row"><span className="kv-key">User email</span><span className="kv-val">{complaint.createdBy?.email || '—'}</span></div>
                  <div className="kv-row">
                    <span className="kv-key">Department</span>
                    <span className="kv-val">
                      <DeptBadge department={assignment.department} />
                    </span>
                  </div>
                  <div className="kv-row">
                    <span className="kv-key">Assigned by</span>
                    <span className="kv-val">{assignment.assignedBy || '—'}</span>
                  </div>
                  <div className="kv-row"><span className="kv-key">Assigned at</span><span className="kv-val">{assignment.assignedAt ? new Date(assignment.assignedAt).toLocaleString() : '—'}</span></div>
                  <div className="kv-row"><span className="kv-key">Estimated resolution</span><span className="kv-val">{assignment.estimatedResolution || 'Not specified'}</span></div>
                  {remaining && <div className={`kv-row ${deadline < new Date(now) ? 'staff-overdue-row' : ''}`}><span className="kv-key"><IconClock size={14} /> {deadline < new Date(now) ? 'Overdue' : 'Time remaining'}</span><span className="kv-val">{remaining}</span></div>}
                </div>
                {assignment.note && (
                  <>
                    <hr className="divider" />
                    <div className="small muted strong">Note from admin</div>
                    <p className="small mt-8">{assignment.note}</p>
                  </>
                )}
                {completed && assignment.resolutionNote && (
                  <>
                    <hr className="divider" />
                    <div className="small muted strong">Resolution on record</div>
                    <p className="small mt-8">{assignment.resolutionNote}</p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      <Modal open={Boolean(confirmAction)} title={confirmAction?.status === 'RESOLVED' ? 'Mark complaint as completed?' : 'Start work on complaint?'} onClose={() => !busy && setConfirmAction(null)} footer={<><button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmAction(null)} disabled={busy}>Cancel</button><button type="button" className="btn btn-primary btn-sm" onClick={submit} disabled={busy}>{busy ? 'Updating…' : 'Confirm change'}</button></>}>
        <p className="small">This will update <strong>#{complaint.id}</strong> from <strong>{assignment?.status?.replace('_', ' ')}</strong> to <strong>{confirmAction?.status === 'RESOLVED' ? 'COMPLETED' : 'IN PROGRESS'}</strong>.</p>
        <p className="small muted mt-8">The customer and service desk will receive the status update. Final resolution remains an administrator-controlled step.</p>
      </Modal>
    </>
  )
}