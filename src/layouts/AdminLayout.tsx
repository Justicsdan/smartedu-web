import { useState, useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  LayoutDashboard, Users, GraduationCap, BookOpen, Calendar,
  Pencil, ClipboardList, UploadCloud, Settings, KeyRound,
  CreditCard, Megaphone, BookOpenCheck, FileText, BarChart3,
  Video, LogOut, Bot, Menu
} from 'lucide-react'

// Curriculum mode determines which scoring pages are visible
// Traditional mode (default): Scores + Publish + Reports
// ACE mode: PACE Scores + ACE Reports (replaces Scores/Publish/Reports)
const TRADITIONAL_ONLY_PATHS = ['/dashboard/schooladmin/scores', '/dashboard/schooladmin/publish', '/dashboard/schooladmin/reports']
const ACE_ONLY_PATHS = ['/dashboard/schooladmin/pace-scores', '/dashboard/schooladmin/ace-reports']

const allNavItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard/schooladmin' },
  { icon: Users, label: 'Students', path: '/dashboard/schooladmin/students' },
  { icon: GraduationCap, label: 'Teachers', path: '/dashboard/schooladmin/teachers' },
  { icon: BookOpen, label: 'Classes', path: '/dashboard/schooladmin/classes' },
  { icon: Calendar, label: 'Academic', path: '/dashboard/schooladmin/academic' },
  // Traditional scoring
  { icon: Pencil, label: 'Scores', path: '/dashboard/schooladmin/scores', traditionalOnly: true },
  { icon: ClipboardList, label: 'CBT', path: '/dashboard/schooladmin/cbt' },
  { icon: UploadCloud, label: 'Publish', path: '/dashboard/schooladmin/publish', traditionalOnly: true },
  { icon: Settings, label: 'Settings', path: '/dashboard/schooladmin/settings' },
  { icon: KeyRound, label: 'Credentials', path: '/dashboard/schooladmin/credentials' },
  { icon: CreditCard, label: 'Fees', path: '/dashboard/schooladmin/fees' },
  { icon: Megaphone, label: 'Announcements', path: '/dashboard/schooladmin/announcements' },
  // ACE scoring (replaces traditional scores/publish/reports)
  { icon: BookOpenCheck, label: 'PACE Scores', path: '/dashboard/schooladmin/pace-scores', aceOnly: true },
  { icon: FileText, label: 'ACE Reports', path: '/dashboard/schooladmin/ace-reports', aceOnly: true },
  { icon: BarChart3, label: 'Reports', path: '/dashboard/schooladmin/reports', traditionalOnly: true },
  { icon: Video, label: 'Live Class', path: '/dashboard/schooladmin/live-class' },
]

export default function AdminLayout() {
  const navigate = useNavigate()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [isAceMode, setIsAceMode] = useState(false)

  const user = JSON.parse(localStorage.getItem('smartedu_user') || '{}')
  const schoolName = user.name || user.school_name || user.schoolName || 'School Portal'
  const schoolLogoUrl = user.logo_url || user.school_logo_url || user.schoolLogoUrl || ''
  const schoolId = user.id || user.school_id || ''

  // Load curriculum_mode from school_settings to filter sidebar items
  useEffect(() => {
    if (!schoolId) return
    ;(async () => {
      try {
        const { data } = await supabase
          .from('school_settings')
          .select('curriculum_mode')
          .eq('school_id', schoolId)
          .maybeSingle()
        const mode = (data?.curriculum_mode || '').toLowerCase()
        setIsAceMode(mode === 'ace')
      } catch (e) {
        console.error('Failed to load curriculum_mode:', e)
      }
    })()
  }, [schoolId])

  // Filter nav items based on curriculum mode (mirrors Flutter's isAce conditional)
  const visibleNavItems = allNavItems.filter(item => {
    if (item.aceOnly && !isAceMode) return false
    if (item.traditionalOnly && isAceMode) return false
    return true
  })

  const handleNavClick = (idx: number, path: string) => {
    setSelectedIdx(idx)
    setDrawerOpen(false)
    navigate(path)
  }

  const handleLogout = () => {
    localStorage.removeItem('smartedu_token')
    localStorage.removeItem('smartedu_user')
    navigate('/')
  }

  const Sidebar = () => (
    <div className="w-[260px] bg-[#1A237E] h-full flex flex-col shrink-0">
      <div className="p-5 flex items-center gap-3">
        {schoolLogoUrl ? (
          <img src={`${schoolLogoUrl}?width=80&height=80`} alt="Logo" className="w-10 h-10 rounded-full object-cover border border-white/20" />
        ) : (
          <div className="w-10 h-10 bg-orange-400 rounded-lg flex items-center justify-center">
            <GraduationCap size={20} className="text-white" />
          </div>
        )}
        <span className="text-white font-bold text-base">Admin Portal</span>
      </div>

      <div className="px-5 pb-3">
        <p className="text-white/70 text-[13px] font-medium truncate">{user.name || user.username || 'Admin'}</p>
        <p className="text-white/50 text-[11px]">{schoolName}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {visibleNavItems.map((item, idx) => {
          const Icon = item.icon
          return (
            <button
              key={idx}
              onClick={() => handleNavClick(idx, item.path)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl mb-1 transition ${
                selectedIdx === idx
                  ? 'bg-orange-400 text-white'
                  : 'text-white/70 hover:bg-white/5'
              }`}
            >
              <Icon size={18} />
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          )
        })}
      </div>

      <div className="p-3 border-t border-white/10">
        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-red-400 hover:bg-red-500/10 transition">
          <LogOut size={18} />
          <span className="text-sm font-medium">Logout</span>
        </button>
      </div>
    </div>
  )

  return (
    <div className="h-screen flex bg-[#F7F8FA] overflow-hidden">
      <div className="hidden md:block"><Sidebar /></div>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDrawerOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0"><Sidebar /></div>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="h-[72px] bg-white shadow-sm flex items-center px-5 gap-3 shrink-0">
          <button onClick={() => setDrawerOpen(true)} className="md:hidden text-[#1A237E]">
            <Menu size={24} />
          </button>

          {schoolLogoUrl && (
            <img src={`${schoolLogoUrl}?width=80&height=80`} alt="Logo" className="hidden md:block w-10 h-10 rounded-full object-cover border border-gray-200" />
          )}

          <div className="flex-1 min-w-0">
            <h1 className="text-[16px] font-bold text-[#1A237E] truncate">{schoolName}</h1>
            <p className="text-[11px] text-gray-500">Admin Portal</p>
          </div>

          <button className="text-[#1A237E] hover:scale-110 transition" title="Ask AI">
            <Bot size={20} />
          </button>
          <button onClick={handleLogout} className="text-gray-400 hover:scale-110 transition" title="Logout">
            <LogOut size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
