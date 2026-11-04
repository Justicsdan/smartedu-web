import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles: string[]
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user } = useAuth() as { user: any }
  const location = useLocation()

  // Not logged in → send to login
  if (!user) {
    return <Navigate to="/login-method" state={{ from: location }} replace />
  }

  const userRole = String(user.role || '').toLowerCase()
  const isAllowed = allowedRoles.some(r => r.toLowerCase() === userRole)

  // Logged in but wrong role → redirect to their correct dashboard
  if (!isAllowed) {
    const dashboardMap: Record<string, string> = {
      'student': '/dashboard/student',
      'teacher': '/dashboard/teacher',
      'school_admin': '/dashboard/schooladmin',
      'super_admin': '/dashboard/superadmin',
    }
    const correctDashboard = dashboardMap[userRole] || '/'
    return <Navigate to={correctDashboard} replace />
  }

  return <>{children}</>
}
