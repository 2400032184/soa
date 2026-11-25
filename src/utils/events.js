// Tiny window-event bus so pages can tell each other "data changed"
// (e.g. after assigning a complaint, the navbar badge refreshes).

const EVT = 'rn:data-changed'

export function emitDataChanged() {
  window.dispatchEvent(new Event(EVT))
}

/** Subscribe to data-change events. Returns an unsubscribe function. */
export function onDataChanged(cb) {
  window.addEventListener(EVT, cb)
  return () => window.removeEventListener(EVT, cb)
}