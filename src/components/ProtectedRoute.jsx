// Route guard: requires a session, and optionally specific roles.

import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { homeFor } from '../utils/nav'

export default function ProtectedRoute({ roles, children }) {
  const { user } = useAuth()
  const location = useLocation()

  if (!user) {
    return <Navigate to="/access" state={{ from: location.pathname }} replace />
  }
  if (roles && !roles.includes(user.role)) {
    return <Navigate to={homeFor(user.role)} replace />
  }
  return children
}