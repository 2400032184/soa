// ResolveNow application routes.
//
//   /                     public landing page
//   /login  /register     JWT auth
//   /user/**              USER dashboard (raise & track complaints)
//   /admin/**             ADMIN dashboard (assign & monitor)
//   /staff/**             STAFF dashboard (work assignments)
//   /notifications        alerts feed (any authenticated role)

import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Link } from 'react-router-dom'

import ProtectedRoute from './components/ProtectedRoute'
import AppLayout from './components/AppLayout'

import LandingPage from './pages/LandingPage'
import { RoleAuthPage, RoleSelectionPage } from './pages/AccessPages'
import Notifications from './pages/Notifications'

import UserDashboard from './pages/user/UserDashboard'
import NewComplaint from './pages/user/NewComplaint'
import MyComplaints from './pages/user/MyComplaints'
import UserComplaintDetail from './pages/user/UserComplaintDetail'

import AdminDashboard from './pages/admin/AdminDashboard'
import AdminComplaints from './pages/admin/AdminComplaints'
import AdminComplaintDetail from './pages/admin/AdminComplaintDetail'
import StaffManagement from './pages/admin/StaffManagement'

import StaffDashboard from './pages/staff/StaffDashboard'
import StaffAssignments from './pages/staff/StaffAssignments'
import StaffComplaintDetail from './pages/staff/StaffComplaintDetail'

function NotFound() {
  return (
    <div className="auth-wrap">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <h1 className="auth-title">404</h1>
        <p className="auth-sub">That page does not exist.</p>
        <Link className="btn btn-primary" to="/">
          Back to home
        </Link>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ---------- Public ---------- */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/access" element={<RoleSelectionPage />} />
        <Route path="/access/:role" element={<RoleAuthPage />} />
        <Route path="/login" element={<Navigate to="/access" replace />} />
        <Route path="/register" element={<Navigate to="/access/user?mode=register" replace />} />

        {/* ---------- USER ---------- */}
        <Route
          path="/user"
          element={
            <ProtectedRoute roles={['USER']}>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/user/dashboard" replace />} />
          <Route path="dashboard" element={<UserDashboard />} />
          <Route path="complaints/new" element={<NewComplaint />} />
          <Route path="complaints" element={<MyComplaints />} />
          <Route path="complaints/:id" element={<UserComplaintDetail />} />
        </Route>

        {/* ---------- ADMIN ---------- */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={['ADMIN']}>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="complaints" element={<AdminComplaints />} />
          <Route path="complaints/:id" element={<AdminComplaintDetail />} />
          <Route path="staff" element={<StaffManagement />} />
        </Route>

        {/* ---------- STAFF ---------- */}
        <Route
          path="/staff"
          element={
            <ProtectedRoute roles={['STAFF']}>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/staff/dashboard" replace />} />
          <Route path="dashboard" element={<StaffDashboard />} />
          <Route path="assignments" element={<StaffAssignments />} />
          <Route path="complaints/:id" element={<StaffComplaintDetail />} />
        </Route>

        {/* ---------- Shared (any authenticated role) ---------- */}
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Notifications />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}