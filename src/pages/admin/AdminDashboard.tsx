import { useState, useEffect, useMemo } from "react"
import { dbProxy } from '../../lib/dbProxy'
import SubjectAveragesChart from '../../components/admin/charts/SubjectAveragesChart'
import AttendanceTrendChart from '../../components/admin/charts/AttendanceTrendChart'
import AceSubjectChart from '../../components/admin/charts/AceSubjectChart'
import { useNavigate } from 'react-router-dom'
import {
  Users, GraduationCap, BookOpen, BookMarked, ClipboardList, CheckCircle2,
  BarChart3, UploadCloud, ClipboardCheck, CreditCard, Megaphone, TrendingUp,
  LayoutDashboard, Loader2, AlertCircle, RefreshCw, School, ArrowRight,
} from 'lucide-react'

const statCards = [
  { icon: Users, label: 'Students', countKey: 'students', color: '#6366F1', bg: '#EEF2FF', path: '/dashboard/schooladmin/students' },
  { icon: GraduationCap, label: 'Teachers', countKey: 'teachers', color: '#10B981', bg: '#ECFDF5', path: '/dashboard/schooladmin/teachers' },
  { icon: BookOpen, label: 'Classes', countKey: 'classes', color: '#F59E0B', bg: '#FFFBEB', path: '/dashboard/schooladmin/classes' },
  { icon: BookMarked, label: 'Subjects', countKey: 'subjects', color: '#EC4899', bg: '#FCE7F3', path: '/dashboard/schooladmin/classes' },
  { icon: ClipboardList, label: 'Assignments', countKey: 'assignments', color: '#06B6D4', bg: '#ECFEFF', path: '/dashboard/schooladmin/scores' },
  { icon: CheckCircle2, label: 'Active CBTs', countKey: 'activeCbts', color: '#8B5CF6', bg: '#F5F3FF', path: '/dashboard/schooladmin/cbt' },
]

const quickAccess = [
  { icon: BarChart3, label: 'Results', path: '/dashboard/schooladmin/scores', color: '#3B82F6' },
  { icon: UploadCloud, label: 'Publish', path: '/dashboard/schooladmin/publish', color: '#10B981' },
  { icon: ClipboardCheck, label: 'CBT', path: '/dashboard/schooladmin/cbt', color: '#8B5CF6' },
  { icon: CreditCard, label: 'Fees', path: '/dashboard/schooladmin/fees', color: '#F59E0B' },
  { icon: Megaphone, label: 'Announce', path: '/dashboard/schooladmin/announcements', color: '#EC4899' },
  { icon: TrendingUp, label: 'Reports', path: '/dashboard/schooladmin/reports', color: '#06B6D4' },
]

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [user, setUser] = useState<any>({})
  const [stats, setStats] = useState({ students: 0, teachers: 0, classes: 0, subjects: 0, assignments: 0, activeCbts: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isAceMode, setIsAceMode] = useState(false)
  const [scores, setScores] = useState<any[]>([])
  const [chartSettings, setChartSettings] = useState<Record<string, any> | null>(null)
  const [sessionInfo, setSessionInfo] = useState<{ sessionId: string; termId: string } | null>(null)
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([])
  const [recordingProgress, setRecordingProgress] = useState<{ classId: string; className: string; section: string; total: number; scored: number; pct: number }[]>([])

  const schoolName = user.name || user.school_name || user.schoolName || 'School Portal'
  const schoolLogoUrl = user.logo_url || user.school_logo_url || user.schoolLogoUrl || ''
  const schoolPrimary = chartSettings?.primary_color || '#1e7a3c'
  const currentSession = chartSettings?.current_session || ''
  const currentTerm = chartSettings?.current_term || ''

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('smartedu_user') || '{}')
    setUser(userData)
    fetchStats(userData)
  }, [])

  const fetchStats = async (userData: any) => {
    setLoading(true); setError('')
    try {
      const schoolId = userData.id || userData.school_id || userData.schoolId
      if (!schoolId) { setLoading(false); return }

      const [studentsRes, teachersRes, classesRes, subjectsRes, assignmentsRes, cbtRes] = await Promise.all([
        dbProxy.from('students').select('id').eq('school_id', schoolId).get(),
        dbProxy.from('teachers').select('id').eq('school_id', schoolId).get(),
        dbProxy.from('classes').select('id').eq('school_id', schoolId).get(),
        dbProxy.from('subjects').select('id').eq('school_id', schoolId).get(),
        dbProxy.from('assignments').select('id').eq('school_id', schoolId).get(),
        dbProxy.from('cbt_exams').select('id').eq('school_id', schoolId).eq('is_active', true).get(),
      ])

      setStats({
        students: studentsRes.data?.length || 0,
        teachers: teachersRes.data?.length || 0,
        classes: classesRes.data?.length || 0,
        subjects: subjectsRes.data?.length || 0,
        assignments: assignmentsRes.data?.length || 0,
        activeCbts: cbtRes.data?.length || 0,
      })

      const [scoresRes, settingsRes, sessRes, termRes, subjectsListRes] = await Promise.all([
        dbProxy.from('scores').select('total, subject_id').eq('school_id', schoolId).get(),
        dbProxy.from('school_settings').select('*').eq('school_id', schoolId).maybeSingle(),
        dbProxy.from('academic_sessions').select('id').eq('school_id', schoolId).eq('is_current', true).maybeSingle(),
        dbProxy.from('terms').select('id').eq('school_id', schoolId).eq('is_current', true).maybeSingle(),
        dbProxy.from('subjects').select('id, name').eq('school_id', schoolId).get(),
      ])

      // Stitch subject names into scores
      const subjectsMap: Record<string, string> = {}
      ;(subjectsListRes.data || []).forEach((s: any) => { subjectsMap[s.id] = s.name })
      const stitchedScores = (scoresRes.data || []).map((sc: any) => ({
        ...sc, subject: { name: subjectsMap[sc.subject_id] || 'Unknown' },
      }))
      setScores(stitchedScores as any[])

      if (settingsRes.data) {
        setChartSettings(settingsRes.data)
        setIsAceMode((settingsRes.data.curriculum_mode || '').toLowerCase() === 'ace')
      }
      if (subjectsListRes.data) setSubjects(subjectsListRes.data as any[])
      if (sessRes.data && termRes.data) {
        const activeSessionId = sessRes.data.id
        const activeTermId = termRes.data.id
        setSessionInfo({ sessionId: activeSessionId, termId: activeTermId })

        const [classesRes2, studentsRes2, scoresRes2] = await Promise.all([
          dbProxy.from('classes').select('id, name, section').eq('school_id', schoolId).order('name').get(),
          dbProxy.from('students').select('id, class_id').eq('school_id', schoolId).get(),
          dbProxy.from('scores').select('student_id').eq('school_id', schoolId).eq('session_id', activeSessionId).eq('term_id', activeTermId).get(),
        ])

        const classes = (classesRes2.data || []) as any[]
        const studentsArr = (studentsRes2.data || []) as any[]
        const scoresArr = (scoresRes2.data || []) as any[]

        const classStudents: Record<string, string[]> = {}
        for (const s of studentsArr) {
          if (s.class_id) {
            if (!classStudents[s.class_id]) classStudents[s.class_id] = []
            classStudents[s.class_id].push(s.id)
          }
        }

        const scoredStudentIds = new Set(scoresArr.map((s: any) => s.student_id))
        const progress = classes.map((c: any) => {
          const studentIds = classStudents[c.id] || []
          const total = studentIds.length
          const scored = studentIds.filter(id => scoredStudentIds.has(id)).length
          const pct = total > 0 ? Math.round((scored / total) * 100) : 0
          return { classId: c.id, className: c.name || '', section: c.section || '', total, scored, pct }
        }).filter(p => p.total > 0)
        setRecordingProgress(progress)
      }
    } catch (err: any) {
      console.error('Error fetching stats:', err)
      setError(err?.message || 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  if (loading && !stats.students) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin shadow-lg shadow-emerald-500/20" />
          <span className="text-sm font-semibold text-slate-700">Loading dashboard...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="px-3 sm:px-4 lg:px-6 py-4 sm:py-6 max-w-7xl mx-auto space-y-5 bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 min-h-screen">
      {/* Welcome banner - premium */}
      <div className="relative overflow-hidden rounded-3xl shadow-2xl"
        style={{ background: `linear-gradient(135deg, ${schoolPrimary} 0%, ${schoolPrimary}dd 60%, ${schoolPrimary}aa 100%)`, boxShadow: '0 20px 50px -10px ' + schoolPrimary + '40' }}>
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-white/10 rounded-full pointer-events-none" />
        <div className="absolute -right-4 top-12 w-32 h-32 bg-white/5 rounded-full pointer-events-none" />
        <div className="absolute -left-8 -bottom-8 w-40 h-40 bg-white/5 rounded-full pointer-events-none" />
        <div className="relative px-5 sm:px-7 py-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-sm text-[10px] uppercase tracking-widest text-white font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
              Admin Dashboard
            </div>
            <h1 className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight drop-shadow-sm">{schoolName}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-white/90 text-sm">
              {currentSession && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/15 backdrop-blur-sm font-medium">
                  {currentSession}
                </span>
              )}
              {currentTerm && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/15 backdrop-blur-sm font-medium">
                  {currentTerm}
                </span>
              )}
              <button onClick={() => fetchStats(user)} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/15 hover:bg-white/25 backdrop-blur-sm font-medium transition">
                <RefreshCw size={12} strokeWidth={2.4} className={loading ? 'animate-spin' : ''} /> Refresh
              </button>
            </div>
          </div>
          {schoolLogoUrl && (
            <div className="flex-shrink-0 mx-auto sm:mx-0">
              <img src={`${schoolLogoUrl}?width=200&height=200`} alt="School Logo"
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover bg-white/90 ring-4 ring-white/70 shadow-lg"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <div className="font-semibold">Couldn't load all data</div>
            <div className="text-amber-800/90 text-xs mt-0.5">{error}</div>
          </div>
        </div>
      )}

      {/* Stat cards - premium glass cards with gradient icon tiles */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map((card, idx) => {
          const Icon = card.icon
          return (
            <button key={idx} onClick={() => navigate(card.path)}
              className="group bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-4 shadow-lg shadow-slate-200/40 hover:shadow-xl hover:-translate-y-0.5 transition-all text-left">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110 shadow-md"
                style={{ background: 'linear-gradient(135deg, ' + card.color + ', ' + card.color + 'cc)', boxShadow: '0 4px 12px ' + card.color + '40' }}>
                <Icon size={18} strokeWidth={2.2} className="text-white" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                {loading ? '...' : (stats as any)[card.countKey] || 0}
              </div>
              <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 mt-0.5">{card.label}</div>
            </button>
          )
        })}
      </div>

      {/* Quick access - premium */}
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg shadow-slate-200/40 border border-slate-200/60 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-50/50 to-transparent">
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white shadow-md shadow-blue-500/30">
            <LayoutDashboard size={18} strokeWidth={2.2} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">Quick Access</h3>
            <p className="text-[10px] text-slate-500">Jump to a task</p>
          </div>
        </div>
        <div className="px-5 py-4 grid grid-cols-3 md:grid-cols-6 gap-3">
          {quickAccess.map((item, idx) => {
            const Icon = item.icon
            return (
              <button key={idx} onClick={() => navigate(item.path)}
                className="group flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-slate-50 transition">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-md"
                  style={{ background: 'linear-gradient(135deg, ' + item.color + ', ' + item.color + 'cc)', boxShadow: '0 4px 12px ' + item.color + '40' }}>
                  <Icon size={20} strokeWidth={2.2} className="text-white" />
                </div>
                <span className="text-xs font-semibold text-slate-700">{item.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Recording progress - premium */}
      {sessionInfo && (
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg shadow-slate-200/40 border border-slate-200/60 overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-violet-50/50 to-transparent">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-violet-500/30">
              <ClipboardList size={18} strokeWidth={2.2} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">Recording Progress</h3>
              <p className="text-[10px] text-slate-500">Score entry status by class</p>
            </div>
            <span className="ml-auto text-xs text-slate-500">
              {recordingProgress.length} class{recordingProgress.length !== 1 ? 'es' : ''} with students
            </span>
          </div>
          <div className="px-5 py-4">
            {recordingProgress.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400">No classes with students found</div>
            ) : (
              <div className="space-y-3">
                {recordingProgress.map((p, i) => (
                  <button key={p.classId} onClick={() => navigate('/dashboard/schooladmin/scores')}
                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition text-left group">
                    <div className="w-32 truncate">
                      <p className="text-sm font-semibold text-slate-900 truncate">{p.className}</p>
                      {p.section && <p className="text-[11px] text-slate-500">{p.section}</p>}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: p.pct + '%',
                              backgroundColor: p.pct === 100 ? '#10b981' : p.pct >= 50 ? '#3b82f6' : '#f59e0b',
                            }}
                          />
                        </div>
                        <span className="text-xs font-bold w-10 text-right"
                          style={{ color: p.pct === 100 ? '#10b981' : p.pct >= 50 ? '#3b82f6' : '#f59e0b' }}>
                          {p.pct}%
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">{p.scored} of {p.total} student{p.total !== 1 ? 's' : ''} scored</p>
                    </div>
                    <ArrowRight size={14} className="text-slate-300 group-hover:text-slate-600 group-hover:translate-x-0.5 transition" strokeWidth={2.2} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Visual analytics - premium */}
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg shadow-slate-200/40 border border-slate-200/60 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-emerald-50/50 to-transparent">
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/30">
            <BarChart3 size={18} strokeWidth={2.2} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">Visual Analytics</h3>
            <p className="text-[10px] text-slate-500">Subject averages and attendance trends</p>
          </div>
        </div>
        <div className="px-5 py-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
          {isAceMode ? (
            <AceSubjectChart
              schoolId={user.id || user.school_id || ''}
              sessionId={sessionInfo?.sessionId || ''}
              termId={sessionInfo?.termId || ''}
              subjects={subjects}
              settings={chartSettings}
            />
          ) : (
            <SubjectAveragesChart
              scores={scores}
              subjects={subjects}
              settings={chartSettings}
              isAce={isAceMode}
            />
          )}
          <AttendanceTrendChart
            schoolId={user.id || user.school_id || ''}
            sessionId={sessionInfo?.sessionId || ''}
            termId={sessionInfo?.termId || ''}
            settings={chartSettings}
          />
        </div>
      </div>
    </div>
  )
}
