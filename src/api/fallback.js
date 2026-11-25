// withFallback — run the real API call; if the backend is unreachable,
// switch to demo mode once and serve the request from the mock API instead.

import { isDemoMode, enableDemoMode } from './demoMode'
import { looksLikeBackendDown } from './client'

export async function withFallback(realCall, mockCall) {
  if (isDemoMode()) return mockCall()
  try {
    return await realCall()
  } catch (err) {
    if (looksLikeBackendDown(err)) {
      enableDemoMode()
      return mockCall()
    }
    throw err
  }
}