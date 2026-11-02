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
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-slate-600">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          <span className="text-sm font-medium">Loading dashboard…</span>
        </div>
      </div>
    )
  }

  return (
    <div className="px-3 sm:px-4 lg:px-6 py-4 sm:py-6 max-w-7xl mx-auto space-y-5">
      {/* Welcome banner */}
      <div className="relative overflow-hidden rounded-2xl shadow-md"
        style={{ background: `linear-gradient(135deg, ${schoolPrimary} 0%, ${schoolPrimary}dd 60%, ${schoolPrimary}aa 100%)` }}>
        <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/10 rounded-full pointer-events-none" />
        <div className="absolute -right-4 top-8 w-24 h-24 bg-white/5 rounded-full pointer-events-none" />
        <div className="relative px-4 sm:px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <div className="text-[11px] uppercase tracking-widest text-white/80 font-semibold">Admin Dashboard</div>
            <h1 className="mt-0.5 text-xl sm:text-2xl lg:text-3xl font-bold text-white tracking-tight">{schoolName}</h1>
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

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map((card, idx) => {
          const Icon = card.icon
          return (
            <button key={idx} onClick={() => navigate(card.path)}
              className="group bg-white rounded-xl shadow-sm border border-slate-200 p-3 sm:p-4 hover:shadow-md hover:border-slate-300 hover:-translate-y-0.5 transition-all text-left">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-2.5 transition-transform group-hover:scale-110"
                style={{ backgroundColor: card.bg, color: card.color }}>
                <Icon size={16} strokeWidth={2.2} />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                {loading ? '…' : (stats as any)[card.countKey] || 0}
              </div>
              <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">{card.label}</div>
            </button>
          )
        })}
      </div>

      {/* Quick access */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/60">
          <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700">
            <LayoutDashboard size={18} strokeWidth={2.2} />
          </div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight">Quick Access</h3>
        </div>
        <div className="px-5 py-4 grid grid-cols-3 md:grid-cols-6 gap-3">
          {quickAccess.map((item, idx) => {
            const Icon = item.icon
            return (
              <button key={idx} onClick={() => navigate(item.path)}
                className="group flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-slate-50 transition">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                  style={{ backgroundColor: item.color + '15', color: item.color }}>
                  <Icon size={20} strokeWidth={2.2} />
                </div>
                <span className="text-xs font-semibold text-slate-700">{item.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Recording progress */}
      {sessionInfo && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/60">
            <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center text-violet-700">
              <ClipboardList size={18} strokeWidth={2.2} />
            </div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">Recording Progress</h3>
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

      {/* Visual analytics */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/60">
          <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
            <BarChart3 size={18} strokeWidth={2.2} />
          </div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight">Visual Analytics</h3>
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
