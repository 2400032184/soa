// Synthesize a lifecycle timeline from whatever fields are available
// (used when the backend does not expose an events[] array).

export function buildTimeline(complaint, assignment) {
  if (Array.isArray(complaint?.events) && complaint.events.length > 0) {
    return [...complaint.events].sort((a, b) => new Date(a.at) - new Date(b.at))
  }
  const events = []
  if (complaint?.createdAt) {
    events.push({
      type: 'CREATED',
      at: complaint.createdAt,
      by: complaint.createdBy?.name || 'Customer',
      detail: 'Complaint submitted',
    })
  }
  if (assignment?.assignedAt) {
    events.push({
      type: 'ASSIGNED',
      at: assignment.assignedAt,
      by: assignment.assignedBy || 'Admin',
      detail: `Assigned to ${assignment.department || '—'}${assignment.staffName ? ` · ${assignment.staffName}` : ''}`,
    })
  }
  if (assignment?.status && assignment.updatedAt) {
    events.push({
      type: 'STATUS',
      at: assignment.updatedAt,
      by: assignment.staffName || 'Support staff',
      detail: `Status changed to ${String(assignment.status).replace('_', ' ')}`,
      status: assignment.status,
    })
  }
  return events.sort((a, b) => new Date(a.at) - new Date(b.at))
}