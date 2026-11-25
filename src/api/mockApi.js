// ============================================================
// Demo-mode mock API (localStorage backed)
//
// Mirrors the real microservice endpoints 1:1 so the whole UI can be
// demonstrated without the Spring Cloud backend running. Data persists
// in the browser and can be reset from the login screen.
// ============================================================

const KEY = 'resolvenow_demo_db_v1'

/* ---------------- helpers ---------------- */

const nowIso = () => new Date().toISOString()

function daysAgo(n, h = 10, m = 0) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}

function fakeToken(user) {
  const payload = { sub: user.email, uid: user.id, name: user.name, role: user.role, exp: Date.now() + 86400000 }
  try {
    return `demo.${window.btoa(JSON.stringify(payload))}.token`
  } catch {
    return `demo.${user.id}.token`
  }
}

function publicUser(u) {
  return { id: u.id, name: u.name, email: u.email, role: u.role, department: u.department || null }
}

function fail(message) {
  const e = new Error(message)
  e.mockRejected = true
  throw e
}

/* ---------------- seed data ---------------- */

function seedDb() {
  const users = [
    { id: 'u1', name: 'System Admin', email: 'admin@resolvenow.com', password: 'admin123', role: 'ADMIN', department: null },
    { id: 'u2', name: 'Ravi Kumar', email: 'ravi@resolvenow.com', password: 'staff123', role: 'STAFF', department: 'NETWORK' },
    { id: 'u3', name: 'Meena Iyer', email: 'meena@resolvenow.com', password: 'staff123', role: 'STAFF', department: 'BILLING' },
    { id: 'u4', name: 'Arjun Patel', email: 'arjun@resolvenow.com', password: 'staff123', role: 'STAFF', department: 'TECHNICAL' },
    { id: 'u5', name: 'Joshika B', email: 'user@resolvenow.com', password: 'user123', role: 'USER', department: null },
    { id: 'u6', name: 'Asha Rao', email: 'asha@resolvenow.com', password: 'user123', role: 'USER', department: null },
  ]

  const owner = publicUser(users[4])
  const secondReporter = publicUser(users[5])

  const complaints = [
    {
      id: 'C101',
      title: 'Internet outage in Block B',
      description:
        'The entire second floor of Block B has had no internet connectivity since Monday morning. Around 20 employees are affected and work is stalled.',
      category: 'NETWORK',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      createdBy: owner,
      reporters: [owner, secondReporter],
      reportCount: 2,
      createdAt: daysAgo(4, 9, 15),
      updatedAt: daysAgo(1, 14, 30),
      events: [
        { type: 'CREATED', at: daysAgo(4, 9, 15), by: owner.name, detail: 'Complaint submitted' },
        { type: 'ASSIGNED', at: daysAgo(3, 11, 0), by: 'System Admin', detail: 'Assigned to NETWORK · Ravi Kumar' },
        { type: 'STATUS', at: daysAgo(1, 14, 30), by: 'Ravi Kumar', detail: 'Status changed to IN_PROGRESS' },
      ],
    },
    {
      id: 'C102',
      title: 'Invoice amount mismatch for March',
      description:
        'The March invoice shows ₹2,400 more than the agreed plan price. Please verify the billing cycle and share a corrected invoice.',
      category: 'BILLING',
      priority: 'MEDIUM',
      status: 'OPEN',
      createdBy: owner,
      createdAt: daysAgo(2, 12, 40),
      updatedAt: daysAgo(2, 12, 40),
      events: [{ type: 'CREATED', at: daysAgo(2, 12, 40), by: owner.name, detail: 'Complaint submitted' }],
    },
    {
      id: 'C103',
      title: 'VPN connection failing after client update',
      description:
        'After updating to the latest VPN client version, connections drop every few minutes with error code 809. Urgent — affects remote deployments.',
      category: 'TECHNICAL',
      priority: 'CRITICAL',
      status: 'ASSIGNED',
      createdBy: owner,
      createdAt: daysAgo(1, 16, 5),
      updatedAt: daysAgo(1, 17, 30),
      events: [
        { type: 'CREATED', at: daysAgo(1, 16, 5), by: owner.name, detail: 'Complaint submitted' },
        { type: 'ASSIGNED', at: daysAgo(1, 17, 30), by: 'System Admin', detail: 'Assigned to TECHNICAL · Arjun Patel' },
      ],
    },
    {
      id: 'C104',
      title: 'Refund not credited for cancelled plan',
      description: 'Cancelled my annual plan on the 3rd but the refund of ₹4,999 has still not been credited to my account.',
      category: 'ACCOUNTS',
      priority: 'LOW',
      status: 'RESOLVED',
      createdBy: owner,
      createdAt: daysAgo(6, 10, 0),
      updatedAt: daysAgo(2, 15, 45),
      events: [
        { type: 'CREATED', at: daysAgo(6, 10, 0), by: owner.name, detail: 'Complaint submitted' },
        { type: 'ASSIGNED', at: daysAgo(5, 11, 20), by: 'System Admin', detail: 'Assigned to ACCOUNTS · Meena Iyer' },
        { type: 'STATUS', at: daysAgo(2, 15, 45), by: 'Meena Iyer', detail: 'Status changed to RESOLVED' },
      ],
    },
    {
      id: 'C105',
      title: 'Not receiving email alerts for tickets',
      description: 'I stopped receiving email notifications whenever a ticket I follow is updated.',
      category: 'GENERAL',
      priority: 'LOW',
      status: 'CLOSED',
      createdBy: owner,
      createdAt: daysAgo(9, 11, 30),
      updatedAt: daysAgo(7, 13, 0),
      events: [
        { type: 'CREATED', at: daysAgo(9, 11, 30), by: owner.name, detail: 'Complaint submitted' },
        { type: 'ASSIGNED', at: daysAgo(8, 10, 10), by: 'System Admin', detail: 'Assigned to GENERAL · Ravi Kumar' },
        { type: 'STATUS', at: daysAgo(8, 12, 0), by: 'Ravi Kumar', detail: 'Status changed to RESOLVED' },
        { type: 'STATUS', at: daysAgo(7, 13, 0), by: 'System Admin', detail: 'Status changed to CLOSED' },
      ],
    },
    {
      id: 'C106',
      title: 'Office printer not connecting to Wi-Fi',
      description: 'The HP LaserJet in the accounts bay keeps dropping off the office Wi-Fi network and needs a manual restart each time.',
      category: 'NETWORK',
      priority: 'MEDIUM',
      status: 'OPEN',
      createdBy: owner,
      createdAt: daysAgo(0, 9, 50),
      updatedAt: daysAgo(0, 9, 50),
      events: [{ type: 'CREATED', at: daysAgo(0, 9, 50), by: owner.name, detail: 'Complaint submitted' }],
    },
  ]

  const assignments = [
    {
      id: 'A201',
      complaintId: 'C101',
      department: 'NETWORK',
      staffId: 'u2',
      staffName: 'Ravi Kumar',
      note: 'Suspected faulty fiber switch on 2nd floor. Replacement ordered.',
      assignedBy: 'System Admin',
      assignedAt: daysAgo(3, 11, 0),
      status: 'IN_PROGRESS',
      resolutionNote: '',
      updatedAt: daysAgo(1, 14, 30),
    },
    {
      id: 'A202',
      complaintId: 'C103',
      department: 'TECHNICAL',
      staffId: 'u4',
      staffName: 'Arjun Patel',
      note: 'Looks like a regression in the new client build. Investigating rollback options.',
      assignedBy: 'System Admin',
      assignedAt: daysAgo(1, 17, 30),
      status: 'ASSIGNED',
      resolutionNote: '',
      updatedAt: daysAgo(1, 17, 30),
    },
    {
      id: 'A203',
      complaintId: 'C104',
      department: 'ACCOUNTS',
      staffId: 'u3',
      staffName: 'Meena Iyer',
      note: 'Refund batch verification pending with bank.',
      assignedBy: 'System Admin',
      assignedAt: daysAgo(5, 11, 20),
      status: 'RESOLVED',
      resolutionNote: 'Refund of ₹4,999 processed via NEFT on reference REF88231. Should reflect within 2 working days.',
      updatedAt: daysAgo(2, 15, 45),
    },
    {
      id: 'A204',
      complaintId: 'C105',
      department: 'GENERAL',
      staffId: 'u2',
      staffName: 'Ravi Kumar',
      note: '',
      assignedBy: 'System Admin',
      assignedAt: daysAgo(8, 10, 10),
      status: 'CLOSED',
      resolutionNote: 'Alerts were landing in spam due to SPF misconfiguration. Fixed and verified.',
      updatedAt: daysAgo(7, 13, 0),
    },
  ]

  const notifications = [
    {
      id: 'N301',
      userId: 'u5',
      message: 'Your complaint #C103 "VPN connection failing after client update" was assigned to TECHNICAL · Arjun Patel.',
      type: 'ASSIGNMENT',
      read: false,
      complaintId: 'C103',
      createdAt: daysAgo(1, 17, 30),
    },
    {
      id: 'N302',
      userId: 'u5',
      message: 'Update on #C101 "Internet outage in Block B": status is now IN_PROGRESS.',
      type: 'STATUS',
      read: false,
      complaintId: 'C101',
      createdAt: daysAgo(1, 14, 30),
    },
    {
      id: 'N303',
      userId: 'u5',
      message: 'Your complaint #C104 was marked RESOLVED by Meena Iyer.',
      type: 'STATUS',
      read: true,
      complaintId: 'C104',
      createdAt: daysAgo(2, 15, 45),
    },
    {
      id: 'N304',
      userId: 'u2',
      message: 'You have been assigned complaint #C101 "Internet outage in Block B".',
      type: 'ASSIGNMENT',
      read: false,
      complaintId: 'C101',
      createdAt: daysAgo(3, 11, 0),
    },
  ]

  return { seq: { c: 107, a: 205, n: 305 }, users, complaints, assignments, notifications }
}

/* ---------------- persistence ---------------- */

let cache = null

function db() {
  if (cache) return cache
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      cache = JSON.parse(raw)
      migrateDemoData(cache)
      persist()
      return cache
    }
  } catch {
    /* corrupted store → reseed */
  }
  cache = seedDb()
  persist()
  return cache
}

function migrateDemoData(data) {
  if (!Array.isArray(data.users) || !Array.isArray(data.complaints)) return
  let secondReporter = data.users.find((user) => user.id === 'u6')
  if (!secondReporter) {
    secondReporter = { id: 'u6', name: 'Asha Rao', email: 'asha@resolvenow.com', password: 'user123', role: 'USER', department: null }
    data.users.push(secondReporter)
  }
  const sharedIssue = data.complaints.find((complaint) => complaint.id === 'C101')
  if (!sharedIssue || Number(sharedIssue.reportCount) > 1) return
  const reporters = [sharedIssue.createdBy, publicUser(secondReporter)].filter(Boolean)
  sharedIssue.reporters = reporters
  sharedIssue.reportCount = reporters.length
  if (sharedIssue.priority !== 'CRITICAL') sharedIssue.priority = 'HIGH'
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(cache))
  } catch {
    /* storage full / private mode — demo continues in memory */
  }
}

/** Wipe demo data back to the original seed. */
export function resetDemoData() {
  cache = seedDb()
  persist()
}

function nextId(kind, prefix) {
  const d = db()
  const n = d.seq[kind]++
  persist()
  return `${prefix}${n}`
}

function pushEvent(complaint, type, by, detail) {
  complaint.events.push({ type, at: nowIso(), by, detail })
  complaint.updatedAt = nowIso()
}

function pushNotification(userId, message, type, complaintId, actorName, actorRole) {
  const d = db()
  d.notifications.push({
    id: nextId('n', 'N'),
    userId,
    message,
    type,
    actorName: actorName || 'ResolveNow',
    actorRole: actorRole || 'SYSTEM',
    read: false,
    complaintId: complaintId || null,
    createdAt: nowIso(),
  })
  persist()
}

const byNewest = (a, b) => new Date(b.createdAt) - new Date(a.createdAt)

function findComplaint(id) {
  return db().complaints.find((c) => String(c.id) === String(id))
}
function latestAssignment(complaintId) {
  return (
    db()
      .assignments.filter((a) => String(a.complaintId) === String(complaintId))
      .sort((a, b) => new Date(b.assignedAt) - new Date(a.assignedAt))[0] || null
  )
}

/* ---------------- auth ---------------- */

export function mockLogin(email, password) {
  const user = db().users.find((u) => u.email.toLowerCase() === String(email).toLowerCase())
  if (!user || user.password !== password) fail('Invalid email or password')
  return { token: fakeToken(user), user: publicUser(user) }
}

export function mockRegister({ name, email, password, role = 'USER' }) {
  const d = db()
  if (d.users.some((u) => u.email.toLowerCase() === String(email).toLowerCase())) {
    fail('An account with this email already exists')
  }
  const resolvedRole = String(role || 'USER').toUpperCase()
  const user = { id: nextId('u', 'u'), name, email, password, role: resolvedRole, department: null }
  d.users.push(user)
  persist()
  return { token: fakeToken(user), user: publicUser(user) }
}

export function mockCreateStaff({ name, email, password, department }) {
  const d = db()
  if (d.users.some((u) => u.email.toLowerCase() === String(email).toLowerCase())) {
    fail('An account with this email already exists')
  }
  const user = { id: nextId('u', 'u'), name, email, password, role: 'STAFF', department: department || 'GENERAL' }
  d.users.push(user)
  persist()
  return publicUser(user)
}

export function mockListUsers(role) {
  const d = db()
  return role ? d.users.filter((u) => u.role === role).map(publicUser) : d.users.map(publicUser)
}

/* ---------------- complaints ---------------- */

export function mockCreateComplaint(actor, { title, description, category, priority, imageUrl }) {
  const d = db()
  const normalizedTitle = String(title || '').trim().toLowerCase().replace(/\s+/g, ' ')
  const duplicate = d.complaints.find((item) => (
    String(item.title || '').trim().toLowerCase().replace(/\s+/g, ' ') === normalizedTitle
    && String(item.category || 'GENERAL').toUpperCase() === String(category || 'GENERAL').toUpperCase()
  ))
  if (duplicate) {
    const reporters = Array.isArray(duplicate.reporters) ? duplicate.reporters : [duplicate.createdBy].filter(Boolean)
    if (!reporters.some((reporter) => reporter.id === actor.id)) reporters.push(publicUser(actor))
    duplicate.reporters = reporters
    duplicate.reportCount = reporters.length
    if (reporters.length > 1 && duplicate.priority !== 'CRITICAL') duplicate.priority = 'HIGH'
    duplicate.updatedAt = nowIso()
    duplicate.events = duplicate.events || []
    duplicate.events.push({
      type: 'DUPLICATE_REPORT',
      at: duplicate.updatedAt,
      by: actor.name,
      detail: `${reporters.length} people have reported this issue`,
    })
    persist()
    d.users
      .filter((user) => user.role === 'ADMIN')
      .forEach((admin) => pushNotification(admin.id, `${actor.name} also reported "${duplicate.title}". ${reporters.length} people are affected.`, 'DUPLICATE_REPORT', duplicate.id, actor.name, 'USER'))
    return { ...duplicate }
  }

  const complaint = {
    id: nextId('c', 'C'),
    title,
    description,
    category,
    priority,
    imageUrl: imageUrl || '',
    reporters: [publicUser(actor)],
    reportCount: 1,
    status: 'OPEN',
    createdBy: publicUser(actor),
    createdAt: nowIso(),
    updatedAt: nowIso(),
    events: [{ type: 'CREATED', at: nowIso(), by: actor.name, detail: 'Complaint submitted' }],
  }
  d.complaints.push(complaint)
  persist()

  // Notify every admin about the new complaint
  d.users
    .filter((u) => u.role === 'ADMIN')
    .forEach((admin) =>
      pushNotification(admin.id, `New ${priority} priority complaint #${complaint.id}: "${title}".`, 'NEW_COMPLAINT', complaint.id, actor.name, 'USER'),
    )
  return { ...complaint }
}

export function mockMyComplaints(userId) {
  return db()
    .complaints.filter((c) => c.createdBy?.id === userId || c.reporters?.some((reporter) => reporter.id === userId))
    .sort(byNewest)
    .map((c) => ({ ...c }))
}

export function mockAllComplaints() {
  return db()
    .complaints.slice()
    .sort(byNewest)
    .map((c) => ({ ...c }))
}

export function mockComplaintById(id) {
  const c = findComplaint(id)
  if (!c) fail(`Complaint #${id} not found`)
  const reporters = Array.isArray(c.reporters) ? c.reporters : [c.createdBy].filter(Boolean)
  return { ...c, reporters, reportCount: Math.max(reporters.length, Number(c.reportCount) || 1) }
}

/* ---------------- assignment service ---------------- */

export function mockAssignComplaint(actorName, { complaintId, department, staffId, note }) {
  const d = db()
  const complaint = findComplaint(complaintId)
  if (!complaint) fail(`Complaint #${complaintId} not found`)
  const staff = d.users.find((u) => u.id === staffId && u.role === 'STAFF')
  if (!staff) fail('Selected staff member was not found')

  let assignment = latestAssignment(complaintId)
  if (assignment) {
    Object.assign(assignment, {
      department,
      staffId: staff.id,
      staffName: staff.name,
      note: note || '',
      assignedBy: actorName,
      assignedAt: nowIso(),
      status: 'ASSIGNED',
      resolutionNote: '',
      updatedAt: nowIso(),
    })
  } else {
    assignment = {
      id: nextId('a', 'A'),
      complaintId,
      department,
      staffId: staff.id,
      staffName: staff.name,
      note: note || '',
      assignedBy: actorName,
      assignedAt: nowIso(),
      status: 'ASSIGNED',
      resolutionNote: '',
      updatedAt: nowIso(),
    }
    d.assignments.push(assignment)
  }

  complaint.status = 'ASSIGNED'
  pushEvent(complaint, 'ASSIGNED', actorName, `Assigned to ${department} · ${staff.name}`)
  persist()

  pushNotification(
    complaint.createdBy?.id,
    `Your complaint #${complaint.id} "${complaint.title}" was assigned to ${department} · ${staff.name}.`,
    'ASSIGNMENT',
    complaint.id,
    actorName,
    'ADMIN',
  )
  pushNotification(staff.id, `You have been assigned complaint #${complaint.id} "${complaint.title}".`, 'ASSIGNMENT', complaint.id, actorName, 'ADMIN')

  return { ...assignment }
}

export function mockUpdateStatus(actorName, { assignmentId, status, resolutionNote }) {
  const d = db()
  const assignment = d.assignments.find((a) => a.id === assignmentId)
  if (!assignment) fail('Assignment not found')
  const complaint = findComplaint(assignment.complaintId)
  if (!complaint) fail('Linked complaint not found')
  if ((status === 'RESOLVED' || status === 'CLOSED') && !String(resolutionNote || '').trim()) {
    fail('A resolution note is required when resolving or closing a complaint')
  }

  assignment.status = status
  assignment.resolutionNote = resolutionNote || ''
  assignment.updatedAt = nowIso()
  complaint.status = status
  pushEvent(complaint, 'STATUS', actorName, `Status changed to ${status.replace('_', ' ')}`)
  persist()

  pushNotification(
    complaint.createdBy?.id,
    `Update on #${complaint.id} "${complaint.title}": status is now ${status.replace('_', ' ')}.`,
    'STATUS',
    complaint.id,
    actorName,
    'STAFF',
  )
  if (status === 'RESOLVED') {
    d.users
      .filter((account) => account.role === 'ADMIN')
      .forEach((admin) => pushNotification(admin.id, `Complaint #${complaint.id} "${complaint.title}" is completed and awaiting your resolution confirmation.`, 'COMPLETED_REVIEW', complaint.id, actorName, 'STAFF'))
  }
  return { ...assignment }
}

export function mockStaffAssignments(staffId) {
  return db()
    .assignments.filter((a) => a.staffId === staffId)
    .sort((a, b) => new Date(b.assignedAt) - new Date(a.assignedAt))
    .map((a) => ({ ...a, complaint: { ...(findComplaint(a.complaintId) || {}) } }))
}

export function mockAssignmentForComplaint(complaintId) {
  const a = latestAssignment(complaintId)
  return a ? { ...a } : null
}

/* ---------------- notification service ---------------- */

export function mockMyNotifications(userId) {
  return db()
    .notifications.filter((n) => n.userId === userId)
    .sort(byNewest)
    .map((n) => ({ ...n }))
}

export function mockUnreadCount(userId) {
  return db().notifications.filter((n) => n.userId === userId && !n.read).length
}

export function mockMarkRead(id) {
  const n = db().notifications.find((x) => x.id === id)
  if (n) {
    n.read = true
    persist()
  }
  return { ok: true }
}

export function mockMarkAllRead(userId) {
  db()
    .notifications.filter((n) => n.userId === userId && !n.read)
    .forEach((n) => {
      n.read = true
    })
  persist()
  return { ok: true }
}