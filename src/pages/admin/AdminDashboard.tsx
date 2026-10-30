import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { Users, GraduationCap, BookOpen, BookMarked, ClipboardList, CheckCircle2, BarChart3, UploadCloud, ClipboardCheck, CreditCard, Megaphone, TrendingUp } from 'lucide-react'


const statCards = [
  { icon: Users, label: 'Students', countKey: 'students', color: '#6366F1', path: '/dashboard/schooladmin/students' },
  { icon: GraduationCap, label: 'Teachers', countKey: 'teachers', color: '#10B981', path: '/dashboard/schooladmin/teachers' },
  { icon: BookOpen, label: 'Classes', countKey: 'classes', color: '#F59E0B', path: '/dashboard/schooladmin/classes' },
  { icon: BookMarked, label: 'Subjects', countKey: 'subjects', color: '#EC4899', path: '/dashboard/schooladmin/classes' },
  { icon: ClipboardList, label: 'Assignments', countKey: 'assignments', color: '#06B6D4', path: '/dashboard/schooladmin/scores' },
  { icon: CheckCircle2, label: 'Active CBTs', countKey: 'activeCbts', color: '#8B5CF6', path: '/dashboard/schooladmin/cbt' },
]

const quickAccess = [
  { icon: BarChart3, label: 'Results', path: '/dashboard/schooladmin/scores' },
  { icon: UploadCloud, label: 'Publish', path: '/dashboard/schooladmin/publish' },
  { icon: ClipboardCheck, label: 'CBT', path: '/dashboard/schooladmin/cbt' },
  { icon: CreditCard, label: 'Fees', path: '/dashboard/schooladmin/fees' },
  { icon: Megaphone, label: 'Announcements', path: '/dashboard/schooladmin/announcements' },
  { icon: TrendingUp, label: 'Reports', path: '/dashboard/schooladmin/reports' },
]

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [user, setUser] = useState<any>({})
  const [stats, setStats] = useState({ students: 0, teachers: 0, classes: 0, subjects: 0, assignments: 0, activeCbts: 0 })
  const [loading, setLoading] = useState(true)
  const [isAceMode, setIsAceMode] = useState(false)

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('smartedu_user') || '{}')
    setUser(userData)
    fetchStats(userData)
  }, [])

  const fetchStats = async (userData: any) => {
    try {
      const schoolId = userData.id || userData.school_id || userData.schoolId
      if (!schoolId) { setLoading(false); return }

      const headers = { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` }

      const [studentsRes, teachersRes, classesRes, subjectsRes, assignmentsRes, cbtRes] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/students?school_id=eq.${schoolId}&select=id&count=exact&limit=0`, { headers }),
        fetch(`${SUPABASE_URL}/rest/v1/teachers?school_id=eq.${schoolId}&select=id&count=exact&limit=0`, { headers }),
        fetch(`${SUPABASE_URL}/rest/v1/classes?school_id=eq.${schoolId}&select=id&count=exact&limit=0`, { headers }),
        fetch(`${SUPABASE_URL}/rest/v1/subjects?school_id=eq.${schoolId}&select=id&count=exact&limit=0`, { headers }),
        fetch(`${SUPABASE_URL}/rest/v1/assignments?school_id=eq.${schoolId}&select=id&count=exact&limit=0`, { headers }),
        fetch(`${SUPABASE_URL}/rest/v1/cbt_exams?school_id=eq.${schoolId}&is_active=eq.true&select=id&count=exact&limit=0`, { headers }),
      ])

      const getCount = (res: Response) => {
        const range = res.headers.get('content-range')
        if (range && range.includes('/')) return parseInt(range.split('/')[1]) || 0
        return 0
      }

      setStats({
        students: getCount(studentsRes),
        teachers: getCount(teachersRes),
        classes: getCount(classesRes),
        subjects: getCount(subjectsRes),
        assignments: getCount(assignmentsRes),
        activeCbts: getCount(cbtRes),
      })
    } catch (err) {
      console.error('Error fetching stats:', err)
    } finally {
      setLoading(false)
    }
  }

  const schoolName = user.name || user.school_name || user.schoolName || 'School Portal'
  const schoolLogoUrl = user.logo_url || user.school_logo_url || user.schoolLogoUrl || ''

  return (
    <div className="p-6 bg-[#F8FAFC] min-h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-gray-500 text-sm">Welcome back!</p>
          <h1 className="text-2xl font-bold text-[#1A237E]">{schoolName}</h1>
        </div>
        {schoolLogoUrl && (
          <div className="w-[110px] h-[110px] bg-white rounded-2xl border-[3px] border-[#1A237E]/30 shadow-md p-2">
            <img src={`${schoolLogoUrl}?width=200&height=200`} alt="School Logo" className="w-full h-full object-contain rounded-xl" />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        {statCards.map((card, idx) => {
          const Icon = card.icon
          return (
            <button key={idx} onClick={() => navigate(card.path)} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md hover:border-gray-200 transition text-left">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: `${card.color}20` }}>
                <Icon size={20} style={{ color: card.color }} />
              </div>
              <p className="text-2xl font-bold text-gray-800">{loading ? '...' : (stats as any)[card.countKey] || 0}</p>
              <p className="text-xs text-gray-500 mt-1">{card.label}</p>
            </button>
          )
        })}
      </div>

      <div className="mb-8">
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <LayoutDashboard size={20} className="text-[#1A237E]" /> Quick Access
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {quickAccess.map((item, idx) => {
            const Icon = item.icon
            return (
              <button key={idx} onClick={() => navigate(item.path)} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md hover:border-gray-200 transition flex flex-col items-center gap-2">
                <Icon size={24} className="text-[#1A237E]" />
                <span className="text-xs font-medium text-gray-600">{item.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <ClipboardList size={20} className="text-[#1A237E]" /> Recording Progress
        </h2>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <p className="text-gray-400 text-sm text-center">Class recording progress will appear here</p>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <BarChart3 size={20} className="text-[#1A237E]" /> Subject Performance
        </h2>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <p className="text-gray-400 text-sm text-center">Analytics charts will appear here</p>
        </div>
      </div>
    </div>
  )
}

// Need to import LayoutDashboard for the section header
import { LayoutDashboard } from 'lucide-react'
