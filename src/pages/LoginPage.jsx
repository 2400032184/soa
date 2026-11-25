// JWT login page.

import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiError } from '../api/client'
import { homeFor } from '../utils/nav'
import { resetDemoData } from '../api/mockApi'
import { IconLifeBuoy } from '../components/icons'

const DEMO_ACCOUNTS = [
  { role: 'USER', email: 'user@resolvenow.com', password: 'user123' },
  { role: 'ADMIN', email: 'admin@resolvenow.com', password: 'admin123' },
  { role: 'STAFF', email: 'ravi@resolvenow.com', password: 'staff123' },
]

export default function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to={homeFor(user.role)} replace />

  const from = location.state?.from

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!email.trim() || !password) {
      setError('Please enter both email and password.')
      return
    }
    setBusy(true)
    try {
      const u = await login(email.trim(), password)
      navigate(from || homeFor(u.role), { replace: true })
    } catch (err) {
      setError(apiError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">
          <IconLifeBuoy size={26} />
        </div>
        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-sub">Sign in to the ResolveNow service desk.</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={submit} noValidate>
          <div className="field">
            <label className="label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="input"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              autoFocus
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="small mt-16" style={{ textAlign: 'center' }}>
          New customer?{' '}
          <Link className="link" to="/register">
            Create an account
          </Link>
        </p>

        <div className="demo-box">
          <div className="demo-box-title">Demo accounts (click to fill)</div>
          {DEMO_ACCOUNTS.map((a) => (
            <div key={a.role} className="cred-row">
              <span>
                <span className="chip">{a.role}</span>{' '}
                <span className="muted">
                  {a.email} / {a.password}
                </span>
              </span>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => {
                  setEmail(a.email)
                  setPassword(a.password)
                  setError('')
                }}
              >
                Fill
              </button>
            </div>
          ))}
          <div className="cred-row">
            <span className="muted small">Backend offline? The app runs in demo mode automatically.</span>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              title="Reset demo data to the original seed"
              onClick={() => {
                resetDemoData()
                setError('Demo data has been reset.')
              }}
            >
              Reset demo data
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}