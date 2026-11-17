import { type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface Props {
  allowedRoles?: string[]
  children: ReactNode
}

export default function TertiaryProtectedRoute({ children, allowedRoles }: Props) {
  const { user } = useAuth() as { user: any }

  if (!user) {
    return <Navigate to="/login-method" replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/login-method" replace />
  }

  return <>{children}</>
}
