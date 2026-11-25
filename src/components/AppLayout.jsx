// Authenticated app shell: role-aware navbar + content outlet.

import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import * as notificationService from '../services/notificationService'
import { emitDataChanged, onDataChanged } from '../utils/events'
import { initials } from '../utils/format'
import { useToast } from '../context/ToastContext'
import {
  IconGrid,
  IconLifeBuoy,
  IconLogout,
  IconPlus,
  IconTicket,
  IconUsers,
} from './icons'
import {
  NotificationBell,
  NotificationPanel,
  NotificationToast,
} from './NotificationCenter'
import AssistantWidget from './AssistantWidget'

const PROFILE_KEY = 'resolvenow_profile'

const defaultProfile = (user) => ({
  name: user?.name || 'User',
  email: user?.email || '',
  phone: '',
  address: '',
  bio: '',
  avatar: '',
  age: '24',
  gender: 'Male',
  bloodGroup: 'O+',
  maritalStatus: 'Single',
  languages: 'English',
})

function getStoredProfile(user, storageKey) {
  try {
    let raw = localStorage.getItem(storageKey)
    if (!raw && user?.email) {
      const legacy = JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null')
      if (legacy?.email?.toLowerCase() === user.email.toLowerCase()) raw = JSON.stringify(legacy)
    }
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        ...defaultProfile(user),
        ...parsed,
        name: parsed.name || user?.name || 'User',
        email: user?.email || '',
      }
    }
  } catch {
    /* ignore */
  }

  return defaultProfile(user)
}

function Navbar({
  theme,
  onToggleTheme,
  onSetTheme,
  onFocusProfileField,
  onUpdateProfileField,
  onSaveProfile,
  onCancelProfile,
  profile,
  onOpenProfile,
  onToggleSidebar,
  sidebarOpen,
}) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [unread, setUnread] = useState(0)
  const [notificationItems, setNotificationItems] = useState([])
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [bellWiggling, setBellWiggling] = useState(false)
  const [bellRinging, setBellRinging] = useState(false)
  const [bellGlowing, setBellGlowing] = useState(false)
  const [notificationError, setNotificationError] = useState('')
  const [toastNotification, setToastNotification] = useState(null)
  const notificationRef = useRef(null)
  const bellWiggleTimer = useRef(null)
  const toastTimer = useRef(null)
  const bellGlowTimer = useRef(null)
  const knownNotificationIds = useRef(null)

  const refreshNotifications = () => {
    if (!user) return
    Promise.all([notificationService.unreadCount(user.id), notificationService.myNotifications(user.id)])
      .then(([count, items]) => {
        const freshItems = Array.isArray(items) ? items : []
        const knownIds = knownNotificationIds.current
        if (knownIds) {
          const arriving = freshItems.find((item) => !knownIds.has(String(item.id)) && !item.read)
          if (arriving) {
            setBellRinging(true)
            setBellGlowing(true)
            setToastNotification(arriving)
            clearTimeout(toastTimer.current)
            clearTimeout(bellGlowTimer.current)
            toastTimer.current = setTimeout(() => setToastNotification(null), 5000)
            bellGlowTimer.current = setTimeout(() => setBellGlowing(false), 1600)
            if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
              navigator.vibrate([25, 30, 25])
            }
          }
        }
        knownNotificationIds.current = new Set(freshItems.map((item) => String(item.id)))
        setUnread(count)
        setNotificationItems(freshItems)
        setNotificationError('')
      })
      .catch((error) => {
        console.error('Unable to load notifications', error)
        setNotificationError('Notifications could not be loaded. Please try again.')
      })
  }

  useEffect(() => {
    refreshNotifications()
    const off = onDataChanged(refreshNotifications)
    const timer = setInterval(refreshNotifications, 30000)
    const closeOnOutsideClick = (event) => {
      if (!notificationRef.current?.contains(event.target)) setNotificationsOpen(false)
    }
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setNotificationsOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      off()
      clearInterval(timer)
      clearTimeout(bellWiggleTimer.current)
      clearTimeout(toastTimer.current)
      clearTimeout(bellGlowTimer.current)
      document.removeEventListener('mousedown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const handleLogout = () => {
    logout()
    navigate('/access')
  }

  const handleNotificationToggle = () => {
    setNotificationsOpen((open) => !open)
    setBellRinging(false)
    setBellWiggling(true)
    clearTimeout(bellWiggleTimer.current)
    bellWiggleTimer.current = setTimeout(() => setBellWiggling(false), 650)
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate([35, 25, 35])
    }
  }

  const handleNotificationOpen = async (item) => {
    if (!item.read) {
      try {
        await notificationService.markRead(item.id)
        setNotificationItems((current) => current.map((notification) => (
          notification.id === item.id ? { ...notification, read: true } : notification
        )))
        setUnread((current) => Math.max(0, current - 1))
        emitDataChanged()
      } catch (error) {
        console.error('Unable to mark notification as read', error)
        setNotificationError('This notification could not be marked as read. Please try again.')
        return
      }
    }
    setNotificationsOpen(false)
    setToastNotification(null)
    clearTimeout(toastTimer.current)
    if (item.complaintId) {
      navigate(`${user.role === 'ADMIN' ? '/admin' : user.role === 'STAFF' ? '/staff' : '/user'}/complaints/${item.complaintId}`)
    } else {
      navigate('/notifications')
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllRead(user.id)
      setNotificationItems((current) => current.map((item) => ({ ...item, read: true })))
      setUnread(0)
      setBellRinging(false)
      emitDataChanged()
    } catch (error) {
      console.error('Unable to mark all notifications as read', error)
      setNotificationError('Notifications could not be marked as read. Please try again.')
    }
  }

  const closeToast = () => {
    clearTimeout(toastTimer.current)
    setToastNotification(null)
  }

  const links =
    user?.role === 'ADMIN'
      ? [
          { to: '/admin/dashboard', label: 'Dashboard', icon: <IconGrid size={16} /> },
          { to: '/admin/complaints', label: 'All Complaints', icon: <IconTicket size={16} /> },
          { to: '/admin/staff', label: 'Staff & Users', icon: <IconUsers size={16} /> },
        ]
      : user?.role === 'STAFF'
        ? [
            { to: '/staff/dashboard', label: 'Dashboard', icon: <IconGrid size={16} /> },
            { to: '/staff/assignments', label: 'My Assignments', icon: <IconTicket size={16} /> },
          ]
        : [
            { to: '/user/dashboard', label: 'Dashboard', icon: <IconGrid size={16} /> },
            { to: '/user/complaints/new', label: 'New Complaint', icon: <IconPlus size={16} /> },
            { to: '/user/complaints', label: 'My Complaints', icon: <IconTicket size={16} /> },
          ]

  return (
    <>
      <header className="dashboard-topbar">
        <div className="dashboard-topbar-inner">
          <button
            type="button"
            className="brand dashboard-brand dashboard-brand-button"
            onClick={onToggleSidebar}
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            <span className="brand-logo">
              <IconLifeBuoy size={19} />
            </span>
            <span className="brand-name">
              Resolve<span>Now</span>
            </span>
          </button>

          <div className="dashboard-topbar-tools">
            <div className="notification-menu" ref={notificationRef}>
              <NotificationBell
                unread={unread}
                isOpen={notificationsOpen}
                isRinging={bellRinging}
                isWiggling={bellWiggling}
                isGlowing={bellGlowing}
                onClick={handleNotificationToggle}
              />
              {notificationsOpen && (
                <NotificationPanel
                  items={notificationItems}
                  unread={unread}
                  error={notificationError}
                  onClose={() => setNotificationsOpen(false)}
                  onOpen={handleNotificationOpen}
                  onViewAll={() => { setNotificationsOpen(false); navigate('/notifications') }}
                  onMarkAllRead={handleMarkAllRead}
                />
              )}
            </div>
            <button
              type="button"
              className="theme-toggle-btn"
              onClick={onToggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              <span className="theme-toggle-icon">{theme === 'dark' ? '☀' : '☾'}</span>
              <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
            </button>
            <button type="button" className="user-chip user-chip-button" onClick={onOpenProfile}>
              <span className="avatar">{profile.avatar ? <img src={profile.avatar} alt="Profile" className="profile-avatar-image" /> : initials(profile.name)}</span>
              <span className="user-meta">
                <div className="name">{profile.name}</div>
                <div className="role">{user?.role}</div>
              </span>
            </button>
            <button type="button" className="btn btn-outline btn-sm" onClick={handleLogout}>
              <IconLogout size={15} />
              Logout
            </button>
          </div>
        </div>
      </header>

      {toastNotification && (
        <NotificationToast
          item={toastNotification}
          onOpen={handleNotificationOpen}
          onClose={closeToast}
        />
      )}

      <AssistantWidget
        role={user?.role}
        onSetTheme={onSetTheme}
        onOpenProfile={onOpenProfile}
        onFocusProfileField={onFocusProfileField}
        onUpdateProfileField={onUpdateProfileField}
        onSaveProfile={onSaveProfile}
        onCancelProfile={onCancelProfile}
      />

      <div className="dashboard-shell-body">
        <aside className="dashboard-sidebar" aria-label="Main navigation">
          <div className="sidebar-nav-group">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
                onClick={() => {
                  if (window.innerWidth <= 760 && sidebarOpen) onToggleSidebar()
                }}
              >
                <span className="sidebar-link-icon">{l.icon}</span>
                <span>{l.label}</span>
              </NavLink>
            ))}
          </div>

          <div className="sidebar-profile-block">
            <button type="button" className="sidebar-profile-head sidebar-profile-button" onClick={onOpenProfile}>
              <span className="avatar sidebar-avatar">{profile.avatar ? <img src={profile.avatar} alt="Profile" className="profile-avatar-image" /> : initials(profile.name)}</span>
              <div>
                <div className="sidebar-profile-name">{profile.name}</div>
                <div className="sidebar-profile-role">{user?.role}</div>
              </div>
            </button>
            <button type="button" className="sidebar-logout" onClick={handleLogout}>
              <IconLogout size={14} />
              Logout
            </button>
          </div>
        </aside>

        <main className="main-content dashboard-main">
          <div className="container">
            <Outlet />
          </div>
        </main>
      </div>
    </>
  )
}

export default function AppLayout() {
  const { user, updateProfileName } = useAuth()
  const toast = useToast()
  const profileStorageKey = `${PROFILE_KEY}:${user?.id || user?.email || 'guest'}`
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('resolvenow_dashboard_theme')
      return saved || 'light'
    } catch {
      return 'light'
    }
  })
  const [profileState, setProfileState] = useState(() => ({
    owner: profileStorageKey,
    value: getStoredProfile(user, profileStorageKey),
  }))
  const [profileDraftState, setProfileDraftState] = useState(() => ({
    owner: profileStorageKey,
    value: getStoredProfile(user, profileStorageKey),
  }))
  const [profileOpenState, setProfileOpenState] = useState({ owner: profileStorageKey, value: false })
  const [profileEditingState, setProfileEditingState] = useState({ owner: profileStorageKey, value: false })
  const [sidebarOpen, setSidebarOpen] = useState(() => window.matchMedia('(min-width: 761px)').matches)
  const profile = {
    ...(profileState.owner === profileStorageKey ? profileState.value : getStoredProfile(user, profileStorageKey)),
    name: (profileState.owner === profileStorageKey ? profileState.value.name : getStoredProfile(user, profileStorageKey).name) || user?.name || 'User',
    email: user?.email || '',
  }
  const profileDraft = profileDraftState.owner === profileStorageKey
    ? profileDraftState.value
    : getStoredProfile(user, profileStorageKey)
  const profileOpen = profileOpenState.owner === profileStorageKey && profileOpenState.value
  const isEditingProfile = profileEditingState.owner === profileStorageKey && profileEditingState.value
  const setProfileDraft = (nextDraft) => {
    setProfileDraftState((current) => {
      const currentDraft = current.owner === profileStorageKey ? current.value : profile
      return {
        owner: profileStorageKey,
        value: typeof nextDraft === 'function' ? nextDraft(currentDraft) : nextDraft,
      }
    })
  }
  const setProfileOpen = (value) => setProfileOpenState({ owner: profileStorageKey, value })
  const setIsEditingProfile = (value) => setProfileEditingState({ owner: profileStorageKey, value })

  useEffect(() => {
    try {
      localStorage.setItem('resolvenow_dashboard_theme', theme)
    } catch {
      /* ignore */
    }
  }, [theme])

  useEffect(() => {
    if (profileState.owner !== profileStorageKey) return
    try {
      localStorage.setItem(profileStorageKey, JSON.stringify({
        ...profileState.value,
        name: user?.name || 'User',
        email: user?.email || '',
      }))
    } catch {
      /* ignore */
    }
  }, [profileState, profileStorageKey, user?.name, user?.email])

  const saveProfile = (nextProfile) => {
    const normalizedProfile = {
      ...nextProfile,
      name: nextProfile.name?.trim() || user?.name || 'User',
      email: user?.email || '',
    }
    updateProfileName(normalizedProfile.name)
    setProfileState({ owner: profileStorageKey, value: normalizedProfile })
    setProfileDraft(normalizedProfile)
  }

  const handleProfileChange = (field) => (event) => {
    const value = event.target.value
    setProfileDraft((prev) => ({ ...prev, [field]: value }))
  }

  const handleOpenProfile = (editing = false) => {
    setProfileDraft(profile)
    setIsEditingProfile(editing)
    setProfileOpen(true)
  }

  const handleSaveProfile = () => {
    saveProfile(profileDraft)
    setIsEditingProfile(false)
    setProfileOpen(true)
    toast.push('Profile details saved.', 'success')
  }

  const handleAssistantSaveProfile = () => {
    saveProfile(profileDraft)
    setIsEditingProfile(false)
    setProfileOpen(false)
    toast.push('Profile details saved.', 'success')
  }

  const handleAssistantProfileField = (field, value) => {
    setProfileDraft((current) => ({ ...current, [field]: value }))
  }

  const handleAssistantFocusProfileField = (field) => {
    if (!field) return
    requestAnimationFrame(() => {
      const input = document.querySelector(`[data-profile-field="${field}"]`)
      input?.focus()
      input?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }

  const handleCloseProfile = () => {
    setProfileDraft(profile)
    setIsEditingProfile(false)
    setProfileOpen(false)
  }

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      setProfileDraft((prev) => ({ ...prev, avatar: String(reader.result || '') }))
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className={`app-shell dashboard-shell ${theme === 'dark' ? 'theme-dark' : 'theme-light'} ${sidebarOpen ? 'sidebar-open' : 'sidebar-collapsed'}`}>
      <Navbar
        theme={theme}
        onToggleTheme={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
        onSetTheme={setTheme}
        onFocusProfileField={handleAssistantFocusProfileField}
        onUpdateProfileField={handleAssistantProfileField}
        onSaveProfile={handleAssistantSaveProfile}
        onCancelProfile={handleCloseProfile}
        profile={profile}
        onOpenProfile={handleOpenProfile}
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        sidebarOpen={sidebarOpen}
      />

      {profileOpen && (
        <div className="profile-modal-overlay" onClick={handleCloseProfile}>
          <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="profile-modal-close" onClick={handleCloseProfile}>
              ×
            </button>

            {isEditingProfile ? (
              <>
                <div className="profile-modal-header">
                  <div className="profile-avatar-wrap">
                    {profileDraft.avatar ? (
                      <img src={profileDraft.avatar} alt="Profile" className="profile-avatar-image large" />
                    ) : (
                      <div className="profile-avatar-fallback large">{initials(profileDraft.name)}</div>
                    )}
                    <label className="profile-upload-btn">
                      <input type="file" accept="image/*" onChange={handleAvatarChange} />
                      Upload photo
                    </label>
                  </div>
                </div>

                <div className="profile-modal-body">
                  <div className="profile-form-grid">
                    <label className="profile-field">
                      <span>Full Name</span>
                      <input data-profile-field="name" value={profileDraft.name} onChange={handleProfileChange('name')} required />
                    </label>
                    <label className="profile-field">
                      <span>Email</span>
                      <input data-profile-field="email" type="email" value={profile.email} readOnly />
                    </label>
                    <label className="profile-field">
                      <span>Age</span>
                      <input data-profile-field="age" value={profileDraft.age || ''} onChange={handleProfileChange('age')} />
                    </label>
                    <label className="profile-field">
                      <span>Gender</span>
                      <input data-profile-field="gender" value={profileDraft.gender || ''} onChange={handleProfileChange('gender')} />
                    </label>
                    <label className="profile-field">
                      <span>Phone</span>
                      <input data-profile-field="phone" value={profileDraft.phone || ''} onChange={handleProfileChange('phone')} placeholder="Add phone number" />
                    </label>
                    <label className="profile-field">
                      <span>Address</span>
                      <input data-profile-field="address" value={profileDraft.address || ''} onChange={handleProfileChange('address')} placeholder="Add your address" />
                    </label>
                    <label className="profile-field">
                      <span>Blood Type</span>
                      <input data-profile-field="bloodGroup" value={profileDraft.bloodGroup || ''} onChange={handleProfileChange('bloodGroup')} />
                    </label>
                    <label className="profile-field">
                      <span>Marital Status</span>
                      <input data-profile-field="maritalStatus" value={profileDraft.maritalStatus || ''} onChange={handleProfileChange('maritalStatus')} />
                    </label>
                  </div>

                  <label className="profile-field profile-field-full">
                    <span>Languages Spoken</span>
                    <input data-profile-field="languages" value={profileDraft.languages || ''} onChange={handleProfileChange('languages')} placeholder="English, Telugu, Hindi" />
                  </label>

                  <label className="profile-field profile-field-full">
                    <span>Bio</span>
                    <textarea data-profile-field="bio" rows="4" value={profileDraft.bio || ''} onChange={handleProfileChange('bio')} placeholder="Tell a little about yourself" />
                  </label>
                  <p className="profile-identity-hint">Your name updates across your profile and dashboard. Email stays linked to your sign-in account.</p>
                </div>

                <div className="profile-modal-actions">
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => {
                    setProfileDraft(profile)
                    setIsEditingProfile(false)
                  }}>
                    Cancel
                  </button>
                  <button type="button" className="btn btn-primary btn-sm" onClick={handleSaveProfile}>
                    Save Changes
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="profile-card-shell">
                  <div className="profile-card-header">
                    <div className="profile-avatar-wrap">
                      {profile.avatar ? (
                        <img src={profile.avatar} alt="Profile" className="profile-avatar-image large" />
                      ) : (
                        <div className="profile-avatar-fallback large">{initials(profile.name)}</div>
                      )}
                    </div>
                    <div className="profile-card-name">{profile.name}</div>
                  </div>

                  <div className="profile-card-body">
                    <div className="profile-card-row"><span>Name:</span> <strong>{profile.name}</strong></div>
                    <div className="profile-card-row"><span>Email:</span> <strong>{profile.email || 'Not provided'}</strong></div>
                    <div className="profile-card-row"><span>Age:</span> <strong>{profile.age || 'Not provided'}</strong></div>
                    <div className="profile-card-row"><span>Gender:</span> <strong>{profile.gender || 'Not provided'}</strong></div>
                    <div className="profile-card-row"><span>Phone:</span> <strong>{profile.phone || 'Not provided'}</strong></div>
                    <div className="profile-card-row"><span>Address:</span> <strong>{profile.address || 'Not provided'}</strong></div>
                    <div className="profile-card-row"><span>Blood Type:</span> <strong>{profile.bloodGroup || 'Not provided'}</strong></div>
                    <div className="profile-card-row"><span>Marital Status:</span> <strong>{profile.maritalStatus || 'Not provided'}</strong></div>
                    <div className="profile-card-row"><span>Languages Spoken:</span> <strong>{profile.languages || 'Not provided'}</strong></div>
                  </div>

                  <div className="profile-card-actions">
                    <button type="button" className="btn btn-ghost btn-sm" onClick={handleCloseProfile}>
                      Close
                    </button>
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => setIsEditingProfile(true)}>
                      Edit
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}