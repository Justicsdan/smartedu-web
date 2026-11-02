import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom'
import { dbProxy } from '../lib/dbProxy'
import { useAuth } from '../contexts/AuthContext'
import {
  LayoutDashboard, Users, GraduationCap, BookOpen, Calendar, ClipboardList,
  Award, Send, Settings, FileText, Wallet, Megaphone, Video, BarChart3,
  LogOut, Menu, X, ChevronLeft, School, User,
} from 'lucide-react'

function pickString(record: any, ...keys: string[]): string {
  for (const k of keys) {
    const v = record?.[k]
    if (v !== null && v !== undefined && String(v).trim() !== '') return String(v).trim()
  }
  return ''
}

const NAV_SECTIONS = [
  {
    title: 'Overview',
    items: [
      { to: '/dashboard/schooladmin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    ],
  },
  {
    title: 'People',
    items: [
      { to: '/dashboard/schooladmin/students', label: 'Students', icon: Users },
      { to: '/dashboard/schooladmin/teachers', label: 'Teachers', icon: GraduationCap },
      { to: '/dashboard/schooladmin/classes', label: 'Classes', icon: BookOpen },
    ],
  },
  {
    title: 'Academic',
    items: [
      { to: '/dashboard/schooladmin/academic', label: 'Academic Setup', icon: Calendar },
      { to: '/dashboard/schooladmin/scores', label: 'Enter Scores', icon: ClipboardList },
      { to: '/dashboard/schooladmin/publish', label: 'Publish Results', icon: Send },
      { to: '/dashboard/schooladmin/cbt', label: 'CBT Exams', icon: Award },
    ],
  },
  {
    title: 'Operations',
    items: [
      { to: '/dashboard/schooladmin/fees', label: 'Fees', icon: Wallet },
      { to: '/dashboard/schooladmin/announcements', label: 'Announcements', icon: Megaphone },
      { to: '/dashboard/schooladmin/live-class', label: 'Live Class', icon: Video },
      { to: '/dashboard/schooladmin/credentials', label: 'Credentials', icon: FileText },
    ],
  },
  {
    title: 'Reports',
    items: [
      { to: '/dashboard/schooladmin/reports', label: 'Reports', icon: BarChart3 },
      { to: '/dashboard/schooladmin/pace-scores', label: 'PACE Scores', icon: ClipboardList },
      { to: '/dashboard/schooladmin/ace-reports', label: 'ACE Reports', icon: FileText },
    ],
  },
  {
    title: 'System',
    items: [
      { to: '/dashboard/schooladmin/settings', label: 'Settings', icon: Settings },
    ],
  },
]

export default function AdminLayout() {
  const { user, logout } = useAuth() as { user: any; logout: () => void | Promise<void> }
  const location = useLocation()
  const navigate = useNavigate()

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [settings, setSettings] = useState<any>(null)
  const [scrolled, setScrolled] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)

  const schoolName = pickString(user, 'name') || 'School Admin'
  const logoUrl = pickString(user, 'logo_url')
  const schoolPrimary = settings?.primary_color || '#1e7a3c'
  const currentSession = settings?.current_session || ''
  const currentTerm = settings?.current_term || ''

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { data } = await dbProxy.from('school_settings').select('*').maybeSingle()
        if (data) setSettings(data)
      } catch (e) { console.warn('Settings load failed', e) }
    }
    loadSettings()
  }, [])

  useEffect(() => {
    setSidebarOpen(false)
    setShowUserMenu(false)
  }, [location.pathname])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (sidebarOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [sidebarOpen])

  const handleLogout = async () => {
    try { await logout() } catch {}
    navigate('/login-method')
  }

  const isActive = (item: { to: string; exact?: boolean }): boolean => {
    if (item.exact) return location.pathname === item.to
    return location.pathname === item.to || location.pathname.startsWith(item.to + '/')
  }

  const currentNavItem = NAV_SECTIONS
    .flatMap(s => s.items)
    .find(i => isActive(i))

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-slate-900/60 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-72 flex-shrink-0 transform transition-transform duration-300 ease-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} flex flex-col text-white shadow-2xl`}
        style={{ background: `linear-gradient(180deg, ${schoolPrimary} 0%, ${schoolPrimary}e8 100%)` }}
      >
        {/* School header */}
        <div className="relative px-5 py-5 border-b border-white/15">
          <button onClick={() => setSidebarOpen(false)}
            className="lg:hidden absolute top-4 right-4 p-1.5 rounded-md text-white/80 hover:bg-white/10">
            <X size={18} />
          </button>
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt={schoolName}
                className="w-11 h-11 rounded-xl object-cover bg-white/95 ring-2 ring-white/40"
                onError={(e) => { const t = e.target as HTMLImageElement; t.style.display = 'none' }} />
            ) : (
              <div className="w-11 h-11 rounded-xl bg-white/95 text-slate-700 flex items-center justify-center">
                <School size={22} strokeWidth={2.2} />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold truncate">{schoolName}</div>
              <div className="text-[11px] text-white/80 truncate">Admin Portal</div>
            </div>
          </div>
        </div>

        {/* Nav sections */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title} className="mb-4">
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white/40">
                {section.title}
              </div>
              <div className="space-y-1 mt-1">
                {section.items.map((item) => {
                  const active = isActive(item)
                  const Icon = item.icon
                  return (
                    <Link key={item.to} to={item.to}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${active ? 'bg-white text-slate-900 shadow-sm' : 'text-white/90 hover:bg-white/10'}`}>
                      <Icon size={16} strokeWidth={active ? 2.4 : 2.2} />
                      <span className="flex-1">{item.label}</span>
                      {active && <ChevronLeft size={12} className="rotate-180" strokeWidth={2.4} />}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Session info + logout */}
        <div className="px-3 py-3 border-t border-white/15 space-y-2">
          {(currentSession || currentTerm) && (
            <div className="px-3 py-2 rounded-lg bg-white/10 text-[11px]">
              <div className="font-semibold text-white/90">{currentSession || '—'}</div>
              <div className="text-white/70">{currentTerm || '—'}</div>
            </div>
          )}
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/90 hover:bg-red-500/30 transition">
            <LogOut size={16} strokeWidth={2.2} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className={`sticky top-0 z-20 bg-white/95 backdrop-blur-sm transition-shadow ${scrolled ? 'shadow-sm border-b border-slate-200' : 'border-b border-slate-100'}`}>
          <div className="flex items-center justify-between px-4 sm:px-6 py-3">
            <button onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-md text-slate-700 hover:bg-slate-100">
              <Menu size={20} strokeWidth={2.2} />
            </button>
            <div className="lg:hidden flex items-center gap-2 min-w-0 flex-1 ml-2">
              {logoUrl && <img src={logoUrl} alt="" className="w-7 h-7 rounded-md object-cover" />}
              <span className="font-bold text-slate-900 text-sm truncate">{schoolName}</span>
            </div>
            <div className="hidden lg:flex items-center gap-2 text-sm">
              <span className="text-slate-400">Admin Portal</span>
              <span className="text-slate-300">/</span>
              <span className="font-semibold text-slate-900">{currentNavItem?.label || 'Dashboard'}</span>
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
                    <User size={14} strokeWidth={2.2} />
                  </div>
                  <span className="hidden sm:block text-sm font-medium text-slate-700">Admin</span>
                </button>
                {showUserMenu && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setShowUserMenu(false)} />
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-40">
                      <div className="px-4 py-2 border-b border-slate-100">
                        <div className="text-sm font-bold text-slate-900 truncate">{schoolName}</div>
                        <div className="text-xs text-slate-500">Administrator</div>
                      </div>
                      <Link to="/dashboard/schooladmin/settings"
                        className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                        <Settings size={14} strokeWidth={2.2} />Settings
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
          © {new Date().getFullYear()} {schoolName} • Admin Portal
        </footer>
      </div>
    </div>
  )
}
