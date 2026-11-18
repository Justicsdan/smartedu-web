import { useState, useEffect, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { dbProxy } from '../lib/dbProxy'
import { Loader2 } from 'lucide-react'

const HIGHER_ED_TYPES = ['university', 'polytechnic', 'college_of_education', 'monotechnic', 'nursing_school', 'ieic']

interface Props {
  allowedRoles?: string[]
  children: ReactNode
}

export default function TertiaryProtectedRoute({ children, allowedRoles }: Props) {
  const { user } = useAuth() as { user: any }
  const [schoolType, setSchoolType] = useState<string | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    if (!user) { setChecking(false); return }
    const schoolId = user?.school_id || user?.schoolId || user?.id || ''
    if (!schoolId) { setChecking(false); return }
    dbProxy.from('schools').select('school_type').eq('id', schoolId)
      .then(({ data, error }: any) => {
        if (error || !data || !data.length) setSchoolType('')
        else setSchoolType(data[0].school_type || '')
        setChecking(false)
      })
      .catch(() => { setSchoolType(''); setChecking(false) })
  }, [user])

  if (!user) return <Navigate to="/login-method" replace />
  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin text-violet-600" />
          <span className="text-sm text-slate-600">Verifying access...</span>
        </div>
      </div>
    )
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const target = user.role === 'student' ? '/dashboard/student'
      : user.role === 'teacher' ? '/dashboard/teacher'
      : user.role === 'school_admin' ? '/dashboard/schooladmin'
      : user.role === 'super_admin' ? '/dashboard/superadmin'
      : '/login-method'
    return <Navigate to={target} replace />
  }
  if (!HIGHER_ED_TYPES.includes(schoolType || '')) {
    const target = user.role === 'student' ? '/dashboard/student' : '/dashboard/schooladmin'
    return <Navigate to={target} replace />
  }
  return <>{children}</>
}
