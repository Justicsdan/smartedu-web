import { useState, useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { dbProxy } from '../lib/dbProxy'
import {
  Home, BarChart3, BookOpen, ClipboardList, Megaphone, Calendar,
  CreditCard, AlertCircle, User, Video, LogOut, Menu, GraduationCap,
  BookOpenCheck,
} from 'lucide-react'

const allNavItems = [
  { icon: Home, label: 'Home', path: '/dashboard/student' },
  // index 1 is mode-aware — set in component
  { icon: BarChart3, label: 'Results', path: '/dashboard/student/results', traditionalOnly: true },
  { icon: BookOpenCheck, label: 'Progress', path: '/dashboard/student/results', aceOnly: true },
  { icon: ClipboardList, label: 'Assignments', path: '/dashboard/student/assignments' },
  { icon: BookOpen, label: 'CBT Exams', path: '/dashboard/student/cbt' },
  { icon: Megaphone, label: 'Announcements', path: '/dashboard/student/announcements' },
  { icon: Calendar, label: 'Attendance', path: '/dashboard/student/attendance' },
  { icon: CreditCard, label: 'Fees', path: '/dashboard/student/fees' },
  { icon: AlertCircle, label: 'Complaints', path: '/dashboard/student/complaints' },
  { icon: User, label: 'My Profile', path: '/dashboard/student/profile' },
  { icon: Video, label: 'Live Class', path: '/dashboard/student/live-class' },
]

export default function StudentLayout() {
  const navigate = useNavigate()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [isAceMode, setIsAceMode] = useState(false)
  const [sessionName, setSessionName] = useState('')
  const [termName, setTermName] = useState('')

  const user = JSON.parse(localStorage.getItem('smartedu_user') || '{}')
  // For student: user.id = student.id, user.school_id = school.id
  const studentId = user.id || ''
  const schoolId = user.school_id || user.schoolId || ''
  const schoolName = user.school_name || user.schoolName || 'Student Portal'
  const schoolLogoUrl = user.school_logo_url || user.schoolLogoUrl || ''
  const studentName = [user.first_name, user.middle_name, user.last_name].filter(Boolean).join(' ') || 'Student'
  const admissionNo = user.admission_no || ''
  const passportUrl = user.passport_url || ''

  useEffect(() => {
    if (!schoolId) return
    ;(async () => {
      try {
        // Load curriculum_mode + active session/term
        const [settingsRes, sessRes, termRes] = await Promise.all([
          dbProxy.from('school_settings').select('curriculum_mode').eq('school_id', schoolId).maybeSingle(),
          dbProxy.from('academic_sessions').select('id, name').eq('school_id', schoolId).eq('is_current', true).maybeSingle(),
          dbProxy.from('terms').select('id, name').eq('school_id', schoolId).eq('is_current', true).maybeSingle(),
        ])
        if (settingsRes.data) setIsAceMode((settingsRes.data.curriculum_mode || '').toLowerCase() === 'ace')
        if (sessRes.data) setSessionName(sessRes.data.name || '')
        if (termRes.data) setTermName(termRes.data.name || '')
      } catch (e) {
        console.error('Failed to load student context:', e)
      }
    })()
  }, [schoolId])

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

  const initials = studentName.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase() || 'S'

  const Sidebar = () => (
    <div className="w-[260px] bg-[#2E7D32] h-full flex flex-col shrink-0">
      <div className="p-5 flex items-center gap-3">
        {schoolLogoUrl ? (
          <img src={schoolLogoUrl + '?width=80&height=80'} alt="Logo" className="w-10 h-10 rounded-full object-cover border border-white/20" />
        ) : (
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
            <GraduationCap size={20} className="text-white" />
          </div>
        )}
        <span className="text-white font-bold text-base truncate">{schoolName}</span>
      </div>

      <div className="px-5 pb-3">
        <p className="text-white/80 text-[13px] font-medium truncate">{studentName}</p>
        {admissionNo && <p className="text-white/40 text-[10px]">ADM: {admissionNo}</p>}
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {visibleNavItems.map((item, idx) => {
          const Icon = item.icon
          return (
            <button
              key={idx}
              onClick={() => handleNavClick(idx, item.path)}
              className={'w-full flex items-center gap-3 px-4 py-2.5 rounded-xl mb-1 transition ' +
                (selectedIdx === idx ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/5')}
            >
              <Icon size={18} />
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          )
        })}
      </div>

      {(sessionName || termName) && (
        <div className="mx-4 mb-3 p-2.5 rounded-lg bg-white/10">
          {sessionName && <p className="text-white text-[11px] font-medium">{sessionName}</p>}
          {termName && <p className="text-white/70 text-[10px]">{termName}</p>}
        </div>
      )}

      <div className="p-3 border-t border-white/10">
        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-red-200 hover:bg-red-500/10 transition">
          <LogOut size={18} />
          <span className="text-sm font-medium">Logout</span>
        </button>
      </div>
    </div>
  )

  return (
    <div className="h-screen flex bg-[#F5F6FA] overflow-hidden">
      <div className="hidden md:block"><Sidebar /></div>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDrawerOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0"><Sidebar /></div>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="h-[72px] bg-white shadow-sm flex items-center px-5 gap-3 shrink-0">
          <button onClick={() => setDrawerOpen(true)} className="md:hidden text-[#2E7D32]">
            <Menu size={24} />
          </button>

          {schoolLogoUrl && (
            <img src={schoolLogoUrl + '?width=80&height=80'} alt="Logo" className="hidden md:block w-10 h-10 rounded-full object-cover border border-gray-200" />
          )}

          <div className="flex-1 min-w-0">
            <h1 className="text-[16px] font-bold text-[#2E7D32] truncate">{schoolName}</h1>
            <p className="text-[11px] text-gray-500">Student Portal</p>
          </div>

          {sessionName && (
            <div className="hidden md:block px-3 py-1.5 rounded-lg bg-[#1A237E]/10">
              <span className="text-[12px] font-medium text-[#1A237E]">{sessionName}</span>
            </div>
          )}
          {termName && (
            <div className="hidden md:block px-3 py-1.5 rounded-lg bg-[#2E7D32]/10">
              <span className="text-[12px] font-medium text-[#2E7D32]">{termName}</span>
            </div>
          )}

          {passportUrl ? (
            <img src={passportUrl + '?width=80&height=80'} alt="" className="w-10 h-10 rounded-full object-cover border border-gray-200" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[#2E7D32]/10 flex items-center justify-center">
              <span className="text-[14px] font-bold text-[#2E7D32]">{initials}</span>
            </div>
          )}

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
