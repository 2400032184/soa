// Role → home dashboard mapping (used by login redirect & route guards)

export function homeFor(role) {
  switch (String(role || '').toUpperCase()) {
    case 'ADMIN':
      return '/admin/dashboard'
    case 'STAFF':
      return '/staff/dashboard'
    default:
      return '/user/dashboard'
  }
}