import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Building2, Users, FileText, LogOut, Shield,
} from 'lucide-react'

export default function SuperAdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard/superadmin' },
    { label: 'Schools', icon: Building2, path: '/dashboard/superadmin/schools' },
    { label: 'Users', icon: Users, path: '/dashboard/superadmin/users' },
    { label: 'Audit Log', icon: FileText, path: '/dashboard/superadmin/audit' },
  ]

  const handleLogout = () => {
    localStorage.removeItem('smartedu_user')
    navigate('/', { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
        <div className="p-6 border-b border-slate-800/80 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center text-white font-bold shadow-lg shadow-violet-500/25">
            <Shield size={20} />
          </div>
          <div>
            <h2 className="font-bold text-white text-sm tracking-tight">SmartEdu Platform</h2>
            <p className="text-[11px] text-slate-400">Super Admin Portal</p>
          </div>
        </div>

        <div className="p-4 border-b border-slate-800/60 flex items-center gap-3 bg-slate-950/40 mx-3 my-3 rounded-xl border border-slate-800/40">
          <div className="w-8 h-8 rounded-lg bg-violet-500/20 text-violet-400 flex items-center justify-center font-bold text-xs">
            SA
          </div>
          <div className="overflow-hidden">
            <h3 className="text-xs font-semibold text-slate-200 truncate">Platform Owner</h3>
            <p className="text-[10px] text-slate-400 truncate">sysadmin</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-2 space-y-1">
          {navItems.map(item => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                  isActive
                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon size={18} />
                {item.label}
              </button>
            )
          })}
        </nav>

        <div className="p-3 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-red-400 hover:bg-red-500/10 transition"
          >
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50">
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <span>Super Admin</span>
            <span>/</span>
            <span className="text-violet-600 font-bold capitalize">
              {location.pathname.split('/').pop() || 'Dashboard'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-violet-50 text-violet-700 text-xs font-bold border border-violet-100">
              Platform Owner
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>

        <footer className="py-4 text-center text-xs text-slate-400 border-t border-slate-200 bg-white shrink-0">
          &copy; {new Date().getFullYear()} SmartEdu Platform &bull; Super Admin Portal
        </footer>
      </div>
    </div>
  )
}
