import { type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface Props {
  allowedRoles?: string[]
  children: ReactNode
}

export default function ProtectedRoute({ allowedRoles, children }: Props) {
  const { user } = useAuth() as { user: any }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  const role = (user.role || '').toLowerCase()

  // Super admin bypasses all restrictions
  if (role === 'super_admin' || role === 'superadmin') {
    return <>{children}</>
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const normalizedAllowed = allowedRoles.map(r => r.toLowerCase())
    if (!normalizedAllowed.includes(role)) {
      const target = role === 'student' ? '/dashboard/student'
        : role === 'teacher' ? '/dashboard/teacher'
        : role === 'school_admin' || role === 'schooladmin' ? '/dashboard/schooladmin'
        : '/login-method'
      return <Navigate to={target} replace />
    }
  }

  return <>{children}</>
}
