// Reactive access to the global demo-mode flag.

import { useSyncExternalStore } from 'react'
import { isDemoMode, subscribeDemoMode } from '../api/demoMode'

export function useDemoMode() {
  return useSyncExternalStore(subscribeDemoMode, isDemoMode)
}