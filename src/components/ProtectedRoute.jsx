import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function ProtectedRoute({ children }) {
  const { user, loading, role } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-base-bg">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-200 border-t-neutral-900" />
      </div>
    )
  }
  if (!user) return <Navigate to="/signin" replace />

  // HR/Admin accounts land on their own dashboard, not the employee Home.
  if (role === 'admin' && location.pathname === '/app/home') {
    return <Navigate to="/app/dash/hr" replace />
  }

  return children
}

export function RoleRoute({ allow, children }) {
  const { role } = useAuth()
  if (!allow.includes(role)) return <Navigate to={role === 'admin' ? '/app/dash/hr' : '/app/home'} replace />
  return children
}
