import { type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface Props {
  allowedRoles?: string[]
  children: ReactNode
}

export default function TertiaryProtectedRoute({ children }: Props) {
  const { user } = useAuth() as { user: any }

  if (!user) {
    return <Navigate to="/login-method" replace />
  }

  // Allow super_admin, school_admin, and students seamlessly
  return <>{children}</>
}
