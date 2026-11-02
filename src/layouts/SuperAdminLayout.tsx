import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  LayoutDashboard, Building2, LogOut, Menu, X, ChevronLeft,
  Shield, User, Users, ScrollText,
} from 'lucide-react'

const NAV_ITEMS = [
  { to: '/dashboard/superadmin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/dashboard/superadmin/schools', label: 'Schools', icon: Building2 },
  { to: '/dashboard/superadmin/users', label: 'Users', icon: Users },
  { to: '/dashboard/superadmin/audit-log', label: 'Audit Log', icon: ScrollText },
]

export default function SuperAdminLayout() {
  const { user, logout } = useAuth() as { user: any; logout: () => void | Promise<void> }
  const location = useLocation()
  const navigate = useNavigate()

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)

  const displayName = user?.name || user?.username || 'Super Admin'
  const username = user?.username || ''

  useEffect(() => {
    setSidebarOpen(false); setShowUserMenu(false)
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
    navigate('/super-admin-login')
  }

  const isActive = (item: { to: string; exact?: boolean }): boolean => {
    if (item.exact) return location.pathname === item.to
    return location.pathname === item.to || location.pathname.startsWith(item.to + '/')
  }

  const currentNavLabel = NAV_ITEMS.find(i => isActive(i))?.label || 'Dashboard'

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-slate-900/60 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-72 flex-shrink-0 transform transition-transform duration-300 ease-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} flex flex-col text-white shadow-2xl bg-slate-900`}
      >
        <div className="relative px-5 py-5 border-b border-white/10">
          <button onClick={() => setSidebarOpen(false)}
            className="lg:hidden absolute top-4 right-4 p-1.5 rounded-md text-white/80 hover:bg-white/10">
            <X size={18} />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <Shield size={22} strokeWidth={2.2} className="text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold truncate">SmartEdu Platform</div>
              <div className="text-[11px] text-white/60 truncate">Super Admin Portal</div>
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-violet-600 text-white flex items-center justify-center font-bold text-sm ring-2 ring-white/20">
              <User size={16} strokeWidth={2.2} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold truncate">{displayName}</div>
              <div className="text-[11px] text-white/60 truncate">{username}</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item)
            const Icon = item.icon
            return (
              <Link key={item.to} to={item.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${active ? 'bg-white text-slate-900 shadow-sm' : 'text-white/80 hover:bg-white/10'}`}>
                <Icon size={17} strokeWidth={active ? 2.4 : 2.2} />
                <span className="flex-1">{item.label}</span>
                {active && <ChevronLeft size={14} className="rotate-180" strokeWidth={2.4} />}
              </Link>
            )
          })}
        </nav>

        <div className="px-3 py-3 border-t border-white/10">
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/80 hover:bg-red-500/30 transition">
            <LogOut size={17} strokeWidth={2.2} />
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
              <div className="w-7 h-7 rounded-md bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                <Shield size={14} className="text-white" />
              </div>
              <span className="font-bold text-slate-900 text-sm truncate">Platform Admin</span>
            </div>
            <div className="hidden lg:flex items-center gap-2 text-sm">
              <span className="text-slate-400">Super Admin</span>
              <span className="text-slate-300">/</span>
              <span className="font-semibold text-slate-900">{currentNavLabel}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <button onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 pl-1.5 pr-2 py-1.5 rounded-lg hover:bg-slate-100 transition">
                  <div className="w-7 h-7 rounded-full bg-violet-600 text-white flex items-center justify-center font-bold text-xs">
                    <User size={14} strokeWidth={2.2} />
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
                        <div className="text-xs text-slate-500 truncate">Platform Administrator</div>
                      </div>
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
          © {new Date().getFullYear()} SmartEdu Platform • Super Admin Portal
        </footer>
      </div>
    </div>
  )
}
