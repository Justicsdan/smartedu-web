import { useState, useEffect } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { dbProxy } from '../lib/dbProxy'
import {
  LayoutDashboard, BookOpen, Users, ClipboardList,
  FileText, Settings, LogOut, GraduationCap, Menu,
} from 'lucide-react'

interface NavItem { label: string; icon: any; path: string }

const ADMIN_NAV: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard/tertiary/admin' },
  { label: 'Courses', icon: BookOpen, path: '/dashboard/tertiary/admin/courses' },
  { label: 'Students', icon: Users, path: '/dashboard/tertiary/admin/students' },
  { label: 'Enrollments', icon: ClipboardList, path: '/dashboard/tertiary/admin/enrollments' },
  { label: 'Results', icon: FileText, path: '/dashboard/tertiary/admin/results' },
  { label: 'Settings', icon: Settings, path: '/dashboard/tertiary/admin/settings' },
]

const STUDENT_NAV: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard/tertiary/student' },
  { label: 'My Results', icon: FileText, path: '/dashboard/tertiary/student/results' },
  { label: 'Course Registration', icon: ClipboardList, path: '/dashboard/tertiary/student/registration' },
  { label: 'Profile', icon: Users, path: '/dashboard/tertiary/student/profile' },
]

const INSTITUTION_LABELS: Record<string, string> = {
  university: 'University',
  polytechnic: 'Polytechnic',
  college_of_education: 'College of Education',
  monotechnic: 'Monotechnic',
  nursing_school: 'College of Nursing',
  college_of_agriculture: 'College of Agriculture',
  ieic: 'Innovation Enterprise Inst.',
}

export default function TertiaryLayout() {
  const { user, logout } = useAuth() as { user: any; logout: () => void }
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [schoolInfo, setSchoolInfo] = useState<{ name?: string; school_type?: string }>({})

  const isAdmin = user?.role === 'school_admin'
  const nav = isAdmin ? ADMIN_NAV : STUDENT_NAV
  const displayName = [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim()
    || user?.name || (isAdmin ? 'Admin' : 'Student')

  useEffect(() => {
    const schoolId = user?.school_id || user?.schoolId || (isAdmin ? user?.id : '')
    if (!schoolId) return
    dbProxy.from('schools').select('name, school_type').eq('id', schoolId).maybeSingle()
      .then(({ data }: any) => {
        if (data) setSchoolInfo(data)
      })
      .catch(() => {})
  }, [user, isAdmin])

  const institutionLabel = INSTITUTION_LABELS[schoolInfo.school_type || ''] || 'Higher Institution'

  const handleLogout = () => {
    logout()
    navigate('/login-method', { replace: true })
  }

  const SidebarContent = (
    <div className="flex flex-col h-full">
      <div className="px-5 py-5 border-b border-violet-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30 shrink-0">
            <GraduationCap size={18} className="text-white" strokeWidth={2.2} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 leading-tight truncate">
              {schoolInfo.name || 'SmartEdu'}
            </p>
            <p className="text-[10px] font-semibold text-violet-600 uppercase tracking-wider truncate">
              {institutionLabel}
            </p>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {nav.map((item) => {
          const Icon = item.icon
          const active = location.pathname === item.path
          return (
            <Link key={item.path} to={item.path}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                active
                  ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-md shadow-violet-500/30'
                  : 'text-slate-600 hover:bg-violet-50 hover:text-violet-700'
              }`}>
              <Icon size={16} strokeWidth={2.2} />
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="px-3 py-4 border-t border-violet-100">
        <button onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all w-full">
          <LogOut size={16} strokeWidth={2.2} />
          Logout
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="hidden md:flex w-64 bg-white border-r border-slate-200 flex-col">
        {SidebarContent}
      </aside>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-64 bg-white flex flex-col">
            {SidebarContent}
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="md:hidden p-2 -ml-2 rounded-lg hover:bg-slate-100">
              <Menu size={20} className="text-slate-700" />
            </button>
            <p className="text-sm font-bold text-slate-900">
              {institutionLabel} {isAdmin ? 'Admin' : 'Student Portal'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <p className="text-xs font-semibold text-slate-900">{displayName}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">{user?.role?.replace('_', ' ')}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-md">
              {displayName.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
