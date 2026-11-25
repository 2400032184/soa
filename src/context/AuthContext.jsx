// Global authentication state (JWT + user), persisted in localStorage.

import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import * as authService from '../services/authService'

const KEY = 'resolvenow_auth'
const PROFILE_KEY = 'resolvenow_profile'
const AuthContext = createContext(null)

function savedProfileName(user) {
  if (!user?.email) return ''
  try {
    const profileKey = `${PROFILE_KEY}:${user.id || user.email}`
    const stored = localStorage.getItem(profileKey)
    if (stored) {
      const profile = JSON.parse(stored)
      if (typeof profile.name === 'string' && profile.name.trim()) return profile.name.trim()
    }
    const legacy = JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null')
    if (legacy?.email?.toLowerCase() === user.email.toLowerCase() && typeof legacy.name === 'string') {
      return legacy.name.trim()
    }
  } catch (error) {
    console.error('Unable to restore saved profile name', error)
  }
  return ''
}

function readStored() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed?.token && parsed?.user) {
        return {
          ...parsed,
          user: { ...parsed.user, name: savedProfileName(parsed.user) || parsed.user.name },
        }
      }
    }
  } catch {
    /* ignore */
  }
  return { token: null, user: null }
}

export function AuthProvider({ children }) {
  const [state, setState] = useState(readStored)

  const persist = useCallback(({ token, user }) => {
    const currentUser = { ...user, name: savedProfileName(user) || user.name }
    localStorage.setItem(KEY, JSON.stringify({ token, user: currentUser }))
    setState({ token, user: currentUser })
  }, [])

  const login = useCallback(
    async (email, password) => {
      const res = await authService.login(email, password)
      persist(res)
      return res.user
    },
    [persist],
  )

  const register = useCallback(
    async (payload) => {
      const res = await authService.register(payload)
      persist(res)
      return res.user
    },
    [persist],
  )

  const logout = useCallback(() => {
    localStorage.removeItem(KEY)
    setState({ token: null, user: null })
  }, [])

  const updateProfileName = useCallback((name) => {
    const normalizedName = String(name || '').trim()
    if (!normalizedName || !state.user) return
    const user = { ...state.user, name: normalizedName }
    localStorage.setItem(KEY, JSON.stringify({ token: state.token, user }))
    setState((current) => ({ ...current, user }))
  }, [state.token, state.user])

  const value = useMemo(
    () => ({
      token: state.token,
      user: state.user,
      login,
      register,
      logout,
      updateProfileName,
      isAdmin: state.user?.role === 'ADMIN',
      isStaff: state.user?.role === 'STAFF',
      isUser: state.user?.role === 'USER',
    }),
    [state, login, register, logout, updateProfileName],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}