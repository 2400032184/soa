// Customer self-registration (creates USER accounts).

import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiError } from '../api/client'
import { homeFor } from '../utils/nav'
import { IconLifeBuoy } from '../components/icons'

export default function RegisterPage() {
  const { user, register } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to={homeFor(user.role)} replace />

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    const { name, email, password, confirm } = form
    if (!name.trim() || !email.trim() || !password) {
      setError('All fields are required.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setBusy(true)
    try {
      await register({ name: name.trim(), email: email.trim(), password })
      navigate('/user/dashboard', { replace: true })
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
        <h1 className="auth-title">Create your account</h1>
        <p className="auth-sub">Register to raise and track complaints with ResolveNow.</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={submit} noValidate>
          <div className="field">
            <label className="label" htmlFor="name">
              Full name
            </label>
            <input id="name" className="input" placeholder="Jane Doe" value={form.name} onChange={set('name')} autoFocus />
          </div>
          <div className="field">
            <label className="label" htmlFor="remail">
              Email
            </label>
            <input
              id="remail"
              type="email"
              className="input"
              placeholder="you@company.com"
              value={form.email}
              onChange={set('email')}
              autoComplete="email"
            />
          </div>
          <div className="form-row">
            <div className="field">
              <label className="label" htmlFor="rpassword">
                Password
              </label>
              <input
                id="rpassword"
                type="password"
                className="input"
                placeholder="Min. 6 characters"
                value={form.password}
                onChange={set('password')}
                autoComplete="new-password"
              />
            </div>
            <div className="field">
              <label className="label" htmlFor="rconfirm">
                Confirm password
              </label>
              <input
                id="rconfirm"
                type="password"
                className="input"
                placeholder="Repeat password"
                value={form.confirm}
                onChange={set('confirm')}
                autoComplete="new-password"
              />
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p className="small mt-16" style={{ textAlign: 'center' }}>
          Already registered?{' '}
          <Link className="link" to="/login">
            Sign in
          </Link>
        </p>
        <p className="hint mt-8" style={{ textAlign: 'center' }}>
          Staff & admin accounts are provisioned by the service desk administrator.
        </p>
      </div>
    </div>
  )
}