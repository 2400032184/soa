// ADMIN: complaint detail — assign/reassign to a department & staff member,
// and override status. Drives the Assignment Service.

import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import * as complaintService from '../../services/complaintService'
import * as assignmentService from '../../services/assignmentService'
import * as userService from '../../services/userService'
import { apiError } from '../../api/client'
import { emitDataChanged } from '../../utils/events'
import { buildTimeline } from '../../utils/timeline'
import { fmtDateTime } from '../../utils/format'
import ComplaintSummary from '../../components/ComplaintSummary'
import Timeline from '../../components/Timeline'
import { DeptBadge, StatusBadge } from '../../components/badges'
import { EmptyState, Spinner } from '../../components/ui'
import { IconCheck, IconWrench } from '../../components/icons'
import { DEPARTMENTS, STATUSES, STATUS_LABELS } from '../../constants'

export default function AdminComplaintDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const toast = useToast()

  const [complaint, setComplaint] = useState(null)
  const [assignment, setAssignment] = useState(null)
  const [staff, setStaff] = useState([])
  const [missing, setMissing] = useState(false)

  const [form, setForm] = useState({ department: '', staffId: '', note: '', estimatedResolution: '' })
  const [statusForm, setStatusForm] = useState({ status: '', note: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [assignmentOpen, setAssignmentOpen] = useState(false)
  const [resolutionConfirmed, setResolutionConfirmed] = useState(false)

  const load = () => {
    return Promise.all([complaintService.complaintById(id), assignmentService.assignmentForComplaint(id)])
      .then(([c, a]) => {
        setComplaint(c)
        setAssignment(a)
        setForm((f) => ({
          ...f,
          department: f.department || c.category || 'GENERAL',
          estimatedResolution: f.estimatedResolution || a?.estimatedResolution || '',
        }))
        setStatusForm({ status: a?.status || '', note: '' })
      })
      .catch(() => setMissing(true))
  }

  useEffect(() => {
    let alive = true
    load().then(() => {})
    userService
      .listUsers('STAFF')
      .then((s) => alive && setStaff(s))
      .catch(() => {})
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (missing) {
    return (
      <div className="card">
        <EmptyState title="Complaint not found" hint="It may have been removed, or the link is incorrect." />
      </div>
    )
  }
  if (!complaint) return <Spinner />

  const submitAssign = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.department) return setError('Please choose a department.')
    if (!form.staffId) return setError('Please choose a staff member.')
    setBusy(true)
    try {
      await assignmentService.assignComplaint(user.name, {
        complaintId: complaint.id,
        department: form.department,
        staffId: form.staffId,
        note: form.note.trim(),
        estimatedResolution: form.estimatedResolution.trim(),
      })
      emitDataChanged()
      toast.push(`Complaint #${complaint.id} assigned — customer and staff have been notified.`, 'success')
      await load()
      setForm((f) => ({ ...f, note: '' }))
      setAssignmentOpen(false)
    } catch (err) {
      setError(apiError(err))
    } finally {
      setBusy(false)
    }
  }

  const staffForDepartment = staff.filter((member) => !form.department || !member.department || member.department === form.department)
  const availabilityFor = (member) => {
    const value = String(member.availability || member.status || '').toUpperCase()
    if (value.includes('OFFLINE')) return { label: 'Offline', className: 'offline' }
    if (value.includes('BUSY') || value.includes('PROGRESS')) return { label: 'Busy', className: 'busy' }
    return { label: 'Available', className: 'available' }
  }

  const submitStatus = async (e) => {
    e.preventDefault()
    setError('')
    if (!assignment) return setError('Assign the complaint first.')
    if (!statusForm.status) return setError('Choose a status.')
    if ((statusForm.status === 'RESOLVED' || statusForm.status === 'CLOSED') && !statusForm.note.trim()) {
      return setError('A resolution note is required when resolving or closing.')
    }
    setBusy(true)
    try {
      await assignmentService.updateStatus(user.name, {
        assignmentId: assignment.id,
        status: statusForm.status,
        resolutionNote: statusForm.note.trim(),
      })
      emitDataChanged()
      toast.push(`Status of #${complaint.id} updated to ${STATUS_LABELS[statusForm.status]}.`, 'success')
      await load()
    } catch (err) {
      setError(apiError(err))
    } finally {
      setBusy(false)
    }
  }

  const confirmResolution = async () => {
    if (!assignment || assignment.status !== 'RESOLVED') return
    setBusy(true)
    setError('')
    try {
      await assignmentService.updateStatus(user.name, {
        assignmentId: assignment.id,
        status: 'CLOSED',
        resolutionNote: assignment.resolutionNote || 'Resolution confirmed by administrator.',
      })
      emitDataChanged()
      setResolutionConfirmed(true)
      toast.push(`Resolution confirmed for #${complaint.id}. The user has been notified.`, 'success')
      await load()
    } catch (err) {
      setError(apiError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <Link to="/admin/complaints" className="small link">
            ← Back to all complaints
          </Link>
          <h1 className="page-title mt-8">Manage ticket</h1>
        </div>
      </div>

      <div className="detail-grid">
        <div className="stack">
          <ComplaintSummary complaint={complaint} />
          <div className="card">
            <div className="panel">
              <h3 className="card-title mb-16">Lifecycle</h3>
              <Timeline events={buildTimeline(complaint, assignment)} />
            </div>
          </div>
        </div>

        <div className="stack">
          {error && <div className="alert alert-error">{error}</div>}

          {/* -------- Assignment panel -------- */}
          <div className="card">
            <div className="panel">
              <h3 className="card-title">{assignment ? 'Reassign ticket' : 'Assign ticket'}</h3>
              <p className="card-sub">
                {assignment
                  ? `Currently with ${assignment.department} · ${assignment.staffName}`
                  : 'Route this complaint to a department and staff member.'}
              </p>
              <button type="button" className="btn btn-primary btn-block mt-16" onClick={() => setAssignmentOpen(true)}>
                <IconWrench size={15} /> {assignment ? 'Open assignment drawer' : 'Start assignment'}
              </button>
            </div>
            <form className={`assignment-drawer ${assignmentOpen ? 'is-open' : ''}`} onSubmit={submitAssign}>
              <div className="assignment-drawer-head"><div><span className="dashboard-eyebrow">ASSIGNMENT WORKFLOW</span><h3 className="card-title">{assignment ? 'Reassign complaint' : 'Assign complaint'}</h3></div><button type="button" className="assignment-drawer-close" onClick={() => setAssignmentOpen(false)} aria-label="Close assignment drawer">×</button></div>
              <div className="panel">
                <div className="field">
                  <label className="label" htmlFor="dept">
                    Department <span className="required">*</span>
                  </label>
                  <select
                    id="dept"
                    className="select"
                    value={form.department}
                    onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                  >
                    <option value="">Select department…</option>
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label className="label" htmlFor="staff">
                    Staff member <span className="required">*</span>
                  </label>
                  <select
                    id="staff"
                    className="select"
                    value={form.staffId}
                    onChange={(e) => setForm((f) => ({ ...f, staffId: e.target.value }))}
                  >
                    <option value="">Select staff…</option>
                    {staffForDepartment.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.department || 'General'})
                      </option>
                    ))}
                  </select>
                  {staff.length === 0 && <span className="hint">No staff accounts yet — create them under “Staff & Users”.</span>}
                  <div className="availability-legend"><span><i className="available" /> Available</span><span><i className="busy" /> Busy</span><span><i className="offline" /> Offline</span></div>
                  <div className="staff-availability-grid">{staffForDepartment.map((member) => { const availability = availabilityFor(member); return <button type="button" className={`staff-availability-card ${form.staffId === member.id ? 'selected' : ''}`} key={member.id} onClick={() => setForm((current) => ({ ...current, staffId: member.id }))}><span className={`availability-dot ${availability.className}`} /><span><strong>{member.name}</strong><small>{availability.label} · {member.department || 'General'}</small></span></button> })}</div>
                </div>
                <div className="field">
                  <label className="label" htmlFor="estimate">Estimated resolution time</label>
                  <input id="estimate" className="input" placeholder="e.g. Within 2 business days" value={form.estimatedResolution} onChange={(e) => setForm((f) => ({ ...f, estimatedResolution: e.target.value }))} />
                </div>
                <div className="field">
                  <label className="label" htmlFor="note">
                    Note for staff / customer
                  </label>
                  <textarea
                    id="note"
                    className="textarea"
                    style={{ minHeight: 70 }}
                    placeholder="Optional context, e.g. suspected cause, SLA expectations…"
                    value={form.note}
                    onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                  />
                </div>
                <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
                  <IconWrench size={15} /> {assignment ? 'Reassign Complaint' : 'Assign Complaint'}
                </button>
              </div>
            </form>
          </div>

          {/* -------- Status panel -------- */}
          <div className="card">
            <div className="panel">
              <h3 className="card-title">Update status</h3>
              <p className="card-sub">Current:{' '}
                {assignment ? <StatusBadge status={assignment.status} /> : <em>not assigned</em>}
              </p>
            </div>
            <form onSubmit={submitStatus}>
              <div className="panel">
                <div className="field">
                  <label className="label" htmlFor="status">
                    New status <span className="required">*</span>
                  </label>
                  <select
                    id="status"
                    className="select"
                    value={statusForm.status}
                    onChange={(e) => setStatusForm((f) => ({ ...f, status: e.target.value }))}
                  >
                    <option value="">Select status…</option>
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label className="label" htmlFor="snote">
                    Resolution / remark
                  </label>
                  <textarea
                    id="snote"
                    className="textarea"
                    style={{ minHeight: 70 }}
                    placeholder={
                      statusForm.status === 'RESOLVED' || statusForm.status === 'CLOSED'
                        ? 'Required — explain how it was resolved.'
                        : 'Optional remark sent to the customer.'
                    }
                    value={statusForm.note}
                    onChange={(e) => setStatusForm((f) => ({ ...f, note: e.target.value }))}
                  />
                </div>
                <button type="submit" className="btn btn-success btn-block" disabled={busy || !assignment}>
                  Update Status
                </button>
                {!assignment && <p className="hint mt-8">Available after the complaint is assigned.</p>}
              </div>
            </form>
          </div>

          {assignment && (
            <div className="card">
              <div className="panel">
                <div className="row-between"><h3 className="card-title">Current assignment</h3>{assignment.status === 'RESOLVED' && <span className="admin-review-badge">Awaiting review</span>}</div>
                <div className="kv-list mt-12">
                  <div className="kv-row">
                    <span className="kv-key">Department</span>
                    <span className="kv-val">
                      <DeptBadge department={assignment.department} />
                    </span>
                  </div>
                  <div className="kv-row">
                    <span className="kv-key">Staff</span>
                    <span className="kv-val">{assignment.staffName}</span>
                  </div>
                  <div className="kv-row">
                    <span className="kv-key">Assigned by</span>
                    <span className="kv-val">{assignment.assignedBy || '—'}</span>
                  </div>
                  <div className="kv-row">
                    <span className="kv-key">Assigned at</span>
                    <span className="kv-val">{fmtDateTime(assignment.assignedAt)}</span>
                  </div>
                  <div className="kv-row">
                    <span className="kv-key">Estimated resolution</span>
                    <span className="kv-val">{assignment.estimatedResolution || 'Not specified'}</span>
                  </div>
                  <div className="kv-row">
                    <span className="kv-key">Complaint status</span>
                    <span className="kv-val"><StatusBadge status={complaint.status} /></span>
                  </div>
                </div>
                {assignment.status === 'RESOLVED' && <button type="button" className="btn btn-success btn-block mt-16" onClick={confirmResolution} disabled={busy}><IconCheck size={15} /> Confirm Resolution</button>}
                {resolutionConfirmed && <div className="resolution-success"><span><IconCheck size={17} /></span><strong>Resolution confirmed</strong><small>User notification sent successfully.</small></div>}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}