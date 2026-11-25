// Shared domain constants for ResolveNow

export const ROLES = {
  USER: 'USER',
  ADMIN: 'ADMIN',
  STAFF: 'STAFF',
}

export const STATUSES = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']

export const STATUS_LABELS = {
  OPEN: 'Open',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
}

export const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

export const DEPARTMENTS = ['NETWORK', 'BILLING', 'TECHNICAL', 'ACCOUNTS', 'GENERAL']

// Statuses a STAFF member may set while working a complaint
export const STAFF_STATUSES = ['IN_PROGRESS', 'RESOLVED', 'CLOSED']

export const CATEGORY_HINTS = {
  NETWORK: 'Connectivity, Wi-Fi, VPN, outages',
  BILLING: 'Invoices, payments, plan charges',
  TECHNICAL: 'Software, hardware, access issues',
  ACCOUNTS: 'Refunds, account changes, KYC',
  GENERAL: 'Anything else',
}