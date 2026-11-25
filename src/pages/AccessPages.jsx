import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { apiError } from '../api/client'
import { resetDemoData } from '../api/mockApi'
import { IconArrowRight, IconGrid, IconLifeBuoy, IconShield, IconTicket, IconUsers } from '../components/icons'
import { useAuth } from '../context/AuthContext'
import { homeFor } from '../utils/nav'
import homepage from '../assets/homepage.jpeg'

const ROLES = [
  { key: 'user', value: 'USER', label: 'Customer', title: 'User access', description: 'Raise a request and follow its progress.', icon: IconTicket },
  { key: 'staff', value: 'STAFF', label: 'Service staff', title: 'Staff access', description: 'Work through the requests assigned to you.', icon: IconUsers },
  { key: 'admin', value: 'ADMIN', label: 'Administrator', title: 'Admin access', description: 'Oversee service operations and support teams.', icon: IconShield },
]

const DEMO_ACCOUNTS = {
  USER: { email: 'user@resolvenow.com', password: 'user123' },
  STAFF: { email: 'ravi@resolvenow.com', password: 'staff123' },
  ADMIN: { email: 'admin@resolvenow.com', password: 'admin123' },
}

function usePublicTheme() {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('resolvenow_dashboard_theme') || 'light'
    } catch {
      return 'light'
    }
  })

  const toggleTheme = () => {
    setTheme((current) => {
      const next = current === 'dark' ? 'light' : 'dark'
      try {
        localStorage.setItem('resolvenow_dashboard_theme', next)
      } catch {
        // Theme preference is still applied for this visit when storage is unavailable.
      }
      return next
    })
  }

  return [theme, toggleTheme]
}

function PublicHeader({ theme, onToggleTheme, backTo = '/' }) {
  return (
    <header className="public-navbar access-navbar">
      <Link className="brand public-brand" to="/">
        <span className="brand-logo public-brand-logo"><IconLifeBuoy size={19} /></span>
        <span className="brand-name public-brand-name">Resolve<span>Now</span></span>
      </Link>
      <div className="access-navbar-actions">
        <Link className="access-back-link" to={backTo}>Back</Link>
        <button
          type="button"
          className="public-theme-toggle"
          onClick={onToggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          <span aria-hidden="true">{theme === 'dark' ? '☼' : '☾'}</span>
          {theme === 'dark' ? 'Light' : 'Dark'}
        </button>
      </div>
    </header>
  )
}

export function RoleSelectionPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [theme, toggleTheme] = usePublicTheme()

  if (user) return <Navigate to={homeFor(user.role)} replace />

  const requestedPath = location.state?.from || ''
  const recommendedRole = requestedPath.startsWith('/admin')
    ? 'admin'
    : requestedPath.startsWith('/staff')
      ? 'staff'
      : requestedPath.startsWith('/user')
        ? 'user'
        : ''

  return (
    <div className={`public-experience access-page theme-${theme}`}>
      <PublicHeader theme={theme} onToggleTheme={toggleTheme} />
      <main className="role-choice-main">
        <div className="role-choice-intro">
          <span className="access-kicker"><IconLifeBuoy size={15} /> RESOLVENOW ACCESS</span>
          <h1>Welcome to your<br /><em>side of the service.</em></h1>
          <p>Choose a workspace to continue. We’ll take you to a sign in and account setup designed for your role.</p>
        </div>
        <div className="role-choice-grid">
          {ROLES.map((role, index) => {
            const RoleIcon = role.icon
            return (
              <button
                type="button"
                key={role.value}
                className={`role-choice-card role-choice-${role.key}${recommendedRole === role.key ? ' is-recommended' : ''}`}
                onClick={() => navigate(`/access/${role.key}`, { state: { from: requestedPath } })}
                style={{ '--role-card-index': index }}
              >
                <span className="role-choice-card-top">
                  <span className="role-choice-icon"><RoleIcon size={21} /></span>
                  {recommendedRole === role.key && <span className="role-recommended">Continue here</span>}
                  {!recommendedRole && <span className="role-choice-number">0{index + 1}</span>}
                </span>
                <span className="role-choice-copy">
                  <small>{role.label}</small>
                  <strong>{role.title}</strong>
                  <span>{role.description}</span>
                </span>
                <span className="role-choice-continue">Continue <IconArrowRight size={16} /></span>
              </button>
            )
          })}
        </div>
        <p className="role-choice-footnote"><IconGrid size={14} /> Your workspace and permissions stay tailored to your role.</p>
      </main>
    </div>
  )
}

export function RoleAuthPage() {
  const { role: roleKey } = useParams()
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { user, login, register, logout } = useAuth()
  const [theme, toggleTheme] = usePublicTheme()
  const role = ROLES.find((item) => item.key === String(roleKey || '').toLowerCase())
  const [mode, setMode] = useState(searchParams.get('mode') === 'register' ? 'register' : 'login')
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [registerForm, setRegisterForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (!role) return <Navigate to="/access" replace />
  if (user) return <Navigate to={homeFor(user.role)} replace />

  const toggleMode = () => {
    setError('')
    setMode((current) => current === 'login' ? 'register' : 'login')
  }

  const submitLogin = async (event) => {
    event.preventDefault()
    setError('')
    if (!loginForm.email.trim() || !loginForm.password) {
      setError('Enter your email and password to continue.')
      return
    }
    setBusy(true)
    try {
      const signedInUser = await login(loginForm.email.trim(), loginForm.password)
      if (signedInUser.role !== role.value) {
        logout()
        setError(`That account belongs to ${signedInUser.role.toLowerCase()} access. Choose the matching workspace and try again.`)
        return
      }
      navigate(location.state?.from || homeFor(signedInUser.role), { replace: true })
    } catch (requestError) {
      setError(apiError(requestError))
    } finally {
      setBusy(false)
    }
  }

  const submitRegister = async (event) => {
    event.preventDefault()
    setError('')
    const { name, email, password, confirm } = registerForm
    if (!name.trim() || !email.trim() || !password || !confirm) {
      setError('Complete each field to create your account.')
      return
    }
    if (password.length < 6) {
      setError('Choose a password with at least 6 characters.')
      return
    }
    if (password !== confirm) {
      setError('Your passwords do not match.')
      return
    }
    setBusy(true)
    try {
      const createdUser = await register({
        name: name.trim(),
        email: email.trim(),
        password,
        role: role.value,
      })
      if (createdUser.role !== role.value) {
        logout()
        setError('The account was created with a different workspace role. Please contact your service administrator.')
        return
      }
      navigate(homeFor(createdUser.role), { replace: true })
    } catch (requestError) {
      setError(apiError(requestError))
    } finally {
      setBusy(false)
    }
  }

  const useDemoAccount = () => {
    const demo = DEMO_ACCOUNTS[role.value]
    setLoginForm(demo)
    setMode('login')
    setError('')
  }

  const RoleIcon = role.icon

  return (
    <div className={`public-experience access-page theme-${theme}`}>
      <PublicHeader theme={theme} onToggleTheme={toggleTheme} backTo="/access" />
      <main className="role-auth-main">
        <div className="role-auth-intro">
          <Link className="auth-role-back" to="/access">← All workspaces</Link>
          <span className="access-kicker"><RoleIcon size={15} /> {role.label.toUpperCase()} WORKSPACE</span>
          <h1>{mode === 'login' ? 'Good to have you' : 'Make yourself'}<br /><em>{mode === 'login' ? 'back with us.' : 'at home here.'}</em></h1>
          <p>Secure access to the people, updates, and work that matter to you.</p>
        </div>
        <section className={`role-auth-card${mode === 'register' ? ' is-register' : ''}`} aria-label={`${role.title} sign in and sign up`}>
          <div className="role-auth-form-window">
            <div className="role-auth-form-track">
              <div className="role-auth-form-pane" aria-hidden={mode !== 'login'}>
                <form className="role-auth-form" onSubmit={submitLogin}>
                  <span className="auth-role-label">{role.label} sign in</span>
                  <h2>Welcome back</h2>
                  <p>Sign in to continue to your workspace.</p>
                  {error && mode === 'login' && <div className="alert alert-error" role="alert">{error}</div>}
                  <label className="access-field">
                    <span>Email address</span>
                    <input
                      type="email"
                      value={loginForm.email}
                      onChange={(event) => setLoginForm((form) => ({ ...form, email: event.target.value }))}
                      autoComplete="email"
                      placeholder="you@example.com"
                      required
                    />
                  </label>
                  <label className="access-field">
                    <span>Password</span>
                    <input
                      type="password"
                      value={loginForm.password}
                      onChange={(event) => setLoginForm((form) => ({ ...form, password: event.target.value }))}
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      required
                    />
                  </label>
                  <button className="public-button public-button-primary auth-submit" type="submit" disabled={busy}>
                    {busy ? 'Signing in…' : 'Sign in'} <IconArrowRight size={16} />
                  </button>
                  <div className="access-form-bottom">
                    <span>New to this workspace?</span>
                    <button type="button" onClick={toggleMode}>Create account</button>
                  </div>
                  <button type="button" className="demo-account-button" onClick={useDemoAccount}>Use demo {role.label.toLowerCase()} account</button>
                  <button
                    type="button"
                    className="demo-account-button"
                    onClick={() => {
                      resetDemoData()
                      setError('Demo data has been reset to its original sample.')
                    }}
                  >
                    Reset demo data
                  </button>
                </form>
              </div>
              <div className="role-auth-form-pane" aria-hidden={mode !== 'register'}>
                <form className="role-auth-form" onSubmit={submitRegister}>
                  <span className="auth-role-label">{role.label} registration</span>
                  <h2>Create your account</h2>
                  <p>Your ResolveNow workspace starts here.</p>
                  {error && mode === 'register' && <div className="alert alert-error" role="alert">{error}</div>}
                  <label className="access-field">
                    <span>Full name</span>
                    <input
                      type="text"
                      value={registerForm.name}
                      onChange={(event) => setRegisterForm((form) => ({ ...form, name: event.target.value }))}
                      autoComplete="name"
                      placeholder="Your name"
                      required
                    />
                  </label>
                  <label className="access-field">
                    <span>Email address</span>
                    <input
                      type="email"
                      value={registerForm.email}
                      onChange={(event) => setRegisterForm((form) => ({ ...form, email: event.target.value }))}
                      autoComplete="email"
                      placeholder="you@example.com"
                      required
                    />
                  </label>
                  <div className="access-field-row">
                    <label className="access-field">
                      <span>Password</span>
                      <input
                        type="password"
                        value={registerForm.password}
                        onChange={(event) => setRegisterForm((form) => ({ ...form, password: event.target.value }))}
                        autoComplete="new-password"
                        placeholder="At least 6 characters"
                        required
                      />
                    </label>
                    <label className="access-field">
                      <span>Confirm password</span>
                      <input
                        type="password"
                        value={registerForm.confirm}
                        onChange={(event) => setRegisterForm((form) => ({ ...form, confirm: event.target.value }))}
                        autoComplete="new-password"
                        placeholder="Repeat password"
                        required
                      />
                    </label>
                  </div>
                  <button className="public-button public-button-primary auth-submit" type="submit" disabled={busy}>
                    {busy ? 'Creating account…' : 'Create account'} <IconArrowRight size={16} />
                  </button>
                  <div className="access-form-bottom">
                    <span>Already have an account?</span>
                    <button type="button" onClick={toggleMode}>Sign in</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
          <div className="role-auth-visual" style={{ '--auth-artwork': `url("${homepage}")` }} aria-live="polite">
            <div className="role-auth-visual-shade" />
            <div className="role-auth-visual-copy">
              <span className="visual-brand-mark"><IconLifeBuoy size={20} /></span>
              <span className="access-kicker">RESOLVENOW · {role.label.toUpperCase()}</span>
              <h2>{mode === 'login' ? 'Your next clear answer starts here.' : 'A better support experience starts here.'}</h2>
              <p>{mode === 'login' ? 'Sign in and pick up every conversation right where it left off.' : `Your ${role.label.toLowerCase()} workspace keeps every update close and every next step clear.`}</p>
              <button className="visual-mode-toggle" type="button" onClick={toggleMode}>
                {mode === 'login' ? 'New here? Create an account' : 'Already with us? Sign in'} <IconArrowRight size={15} />
              </button>
            </div>
            <span className="auth-visual-caption">Thoughtful support. Clear next steps.</span>
          </div>
        </section>
        <p className="role-auth-footnote">A considered space to keep every request moving forward.</p>
      </main>
    </div>
  )
}
