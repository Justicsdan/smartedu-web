import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom'
import { dbProxy } from '../lib/dbProxy'
import { useAuth } from '../contexts/AuthContext'
import {
  Home, BookOpen, ClipboardList, Quiz, Megaphone, Calendar,
  Wallet, MessageSquare, User, Video, LogOut, Menu, X,
  ChevronLeft, School,
} from 'lucide-react'

function pickString(record: any, ...keys: string[]): string {
  for (const k of keys) {
    const v = record?.[k]
    if (v !== null && v !== undefined && String(v).trim() !== '') return String(v).trim()
  }
  return ''
}

function fullName(s: any): string {
  const first = pickString(s, 'first_name', 'firstName', 'name')
  const last = pickString(s, 'last_name', 'lastName')
  const middle = pickString(s, 'middle_name', 'middleName')
  return [first, middle, last].filter(Boolean).join(' ').trim()
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function admissionNo(s: any): string {
  return pickString(s, 'admission_no', 'admissionNo', 'adm_no')
}

const NAV_ITEMS = [
  { to: '/dashboard/student', label: 'Home', icon: Home, exact: true },
  { to: '/dashboard/student/results', label: 'Results', icon: BookOpen },
  { to: '/dashboard/student/assignments', label: 'Assignments', icon: ClipboardList },
  { to: '/dashboard/student/cbt', label: 'CBT Exams', icon: Quiz },
  { to: '/dashboard/student/announcements', label: 'Announcements', icon: Megaphone },
  { to: '/dashboard/student/attendance', label: 'Attendance', icon: Calendar },
  { to: '/dashboard/student/fees', label: 'Fees', icon: Wallet },
  { to: '/dashboard/student/complaints', label: 'Complaints', icon: MessageSquare },
  { to: '/dashboard/student/profile', label: 'My Profile', icon: User },
  { to: '/dashboard/student/live-class', label: 'Live Class', icon: Video },
]

export default function StudentLayout() {
  const { user, logout } = useAuth() as { user: any; logout: () => void | Promise<void> }
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [schoolInfo, setSchoolInfo] = useState<any>(null)
  const [settings, setSettings] = useState<any>(null)
  const [scrolled, setScrolled] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const schoolId = user?.school_id || user?.schoolId || ''
  const schoolPrimary = settings?.primary_color || user?.primary_color || '#1e7a3c'
  const displayName = fullName(user) || 'Student'
  const admNo = admissionNo(user)

  useEffect(() => {
    if (!schoolId) return
    ;(async () => {
      try {
        const [sRes, setRes] = await Promise.all([
          dbProxy.from('schools').select('id, name, logo_url, motto').eq('id', schoolId).maybeSingle(),
          dbProxy.from('school_settings').select('*').eq('school_id', schoolId).maybeSingle(),
        ])
        if (!sRes.error && sRes.data) setSchoolInfo(sRes.data)
        if (!setRes.error && setRes.data) setSettings(setRes.data)
      } catch (e) { console.warn('Layout: school/settings load failed', e) }
    })()
  }, [schoolId])

  useEffect(() => {
    setSidebarOpen(false); setShowUserMenu(false)
  }, [location.pathname])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (sidebarOpen) { document.body.style.overflow = 'hidden' }
    else { document.body.style.overflow = '' }
    return () => { document.body.style.overflow = '' }
  }, [sidebarOpen])

  const handleLogout = async () => {
    try { await logout() } catch {}
    navigate('/login')
  }

  const isActive = (item: typeof NAV_ITEMS[number]): boolean => {
    if (item.exact) return location.pathname === item.to
    return location.pathname === item.to || location.pathname.startsWith(item.to + '/')
  }

  const currentTerm = settings?.current_term || ''
  const currentSession = settings?.current_session || ''

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-slate-900/60 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-72 flex-shrink-0 transform transition-transform duration-300 ease-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} flex flex-col text-white shadow-2xl`}
        style={{ background: `linear-gradient(180deg, ${schoolPrimary} 0%, ${schoolPrimary}e8 100%)` }}
      >
        <div className="relative px-5 py-5 border-b border-white/15">
          <button onClick={() => setSidebarOpen(false)}
            className="lg:hidden absolute top-4 right-4 p-1.5 rounded-md text-white/80 hover:bg-white/10" aria-label="Close menu">
            <X size={18} />
          </button>
          <div className="flex items-center gap-3">
            {schoolInfo?.logo_url ? (
              <img src={schoolInfo.logo_url} alt={schoolInfo?.name || 'School'}
                className="w-11 h-11 rounded-xl object-cover bg-white/95 ring-2 ring-white/40"
                onError={(e) => { const t = e.target as HTMLImageElement; t.style.display = 'none'; const next = t.nextElementSibling as HTMLElement | null; if (next) next.style.display = 'flex' }} />
            ) : (
              <div className="w-11 h-11 rounded-xl bg-white/95 text-slate-700 flex items-center justify-center">
                <School size={22} strokeWidth={2.2} />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold truncate">{schoolInfo?.name || 'SmartEdu'}</div>
              <div className="text-[11px] text-white/80 truncate">{schoolInfo?.motto || 'Student Portal'}</div>
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-b border-white/15">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/95 text-slate-700 flex items-center justify-center font-bold text-sm ring-2 ring-white/40">
              {initials(displayName)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold truncate">{displayName}</div>
              <div className="text-[11px] text-white/80 truncate">{admNo || 'Student'}</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item)
            const Icon = item.icon
            return (
              <Link key={item.to} to={item.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${active ? 'bg-white text-slate-900 shadow-sm' : 'text-white/90 hover:bg-white/10'}`}>
                <Icon size={17} strokeWidth={active ? 2.4 : 2.2} />
                <span className="flex-1">{item.label}</span>
                {active && <ChevronLeft size={14} className="rotate-180" strokeWidth={2.4} />}
              </Link>
            )
          })}
        </nav>

        <div className="px-3 py-3 border-t border-white/15 space-y-2">
          {(currentSession || currentTerm) && (
            <div className="px-3 py-2 rounded-lg bg-white/10 text-[11px]">
              <div className="font-semibold text-white/90">{currentSession || '—'}</div>
              <div className="text-white/70">{currentTerm || '—'}</div>
            </div>
          )}
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/90 hover:bg-red-500/30 transition">
            <LogOut size={17} strokeWidth={2.2} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className={`sticky top-0 z-20 bg-white/95 backdrop-blur-sm transition-shadow ${scrolled ? 'shadow-sm border-b border-slate-200' : 'border-b border-slate-100'}`}>
          <div className="flex items-center justify-between px-4 sm:px-6 py-3">
            <button onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-md text-slate-700 hover:bg-slate-100" aria-label="Open menu">
              <Menu size={20} strokeWidth={2.2} />
            </button>
            <div className="lg:hidden flex items-center gap-2 min-w-0 flex-1 ml-2">
              {schoolInfo?.logo_url && (
                <img src={schoolInfo.logo_url} alt="" className="w-7 h-7 rounded-md object-cover" />
              )}
              <span className="font-bold text-slate-900 text-sm truncate">{schoolInfo?.name || 'Student Portal'}</span>
            </div>
            <div className="hidden lg:flex items-center gap-2 text-sm">
              <span className="text-slate-400">Student Portal</span>
              <span className="text-slate-300">/</span>
              <span className="font-semibold text-slate-900">{NAV_ITEMS.find((i) => isActive(i))?.label || 'Home'}</span>
            </div>
            <div className="flex items-center gap-2">
              {currentSession && (
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 text-xs">
                  <span className="font-semibold text-slate-700">{currentSession}</span>
                  {currentTerm && (<><span className="text-slate-300">•</span><span className="text-slate-500">{currentTerm}</span></>)}
                </div>
              )}
              <div className="relative">
                <button onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 pl-1.5 pr-2 py-1.5 rounded-lg hover:bg-slate-100 transition">
                  <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs">
                    {initials(displayName)}
                  </div>
                  <span className="hidden sm:block text-sm font-medium text-slate-700 max-w-[120px] truncate">
                    {displayName.split(' ')[0]}
                  </span>
                </button>
                {showUserMenu && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setShowUserMenu(false)} />
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-40">
                      <div className="px-4 py-2 border-b border-slate-100">
                        <div className="text-sm font-bold text-slate-900 truncate">{displayName}</div>
                        <div className="text-xs text-slate-500 truncate">{admNo}</div>
                      </div>
                      <Link to="/dashboard/student/profile"
                        className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                        <User size={14} strokeWidth={2.2} />My Profile
                      </Link>
                      <button onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                        <LogOut size={14} strokeWidth={2.2} />Logout
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 min-w-0">
          <Outlet />
        </main>

        <footer className="px-4 sm:px-6 py-4 text-center text-[11px] text-slate-400 border-t border-slate-100">
          © {new Date().getFullYear()} {schoolInfo?.name || 'SmartEdu'} • Student Portal
        </footer>
      </div>
    </div>
  )
}
