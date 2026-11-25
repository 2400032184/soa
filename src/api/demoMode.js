// Demo-mode flag.
//
// If the Spring Cloud backend (API Gateway on :8080) is not reachable,
// the app transparently switches to a localStorage-backed mock API so the
// UI can still be demonstrated end-to-end. A "DEMO MODE" pill appears in
// the navbar while this is active.

let enabled = false
const listeners = new Set()

export function isDemoMode() {
  return enabled
}

export function enableDemoMode() {
  if (enabled) return
  enabled = true
  listeners.forEach((l) => l())
}

/** Subscribe to demo-mode changes. Returns an unsubscribe function. */
export function subscribeDemoMode(cb) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}