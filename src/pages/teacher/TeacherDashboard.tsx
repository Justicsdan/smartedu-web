import { useState, useEffect, useMemo } from 'react'
import { dbProxy } from '../../lib/dbProxy'
import { useAuth } from '../../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import {
  Users, BookOpen, ClipboardList, Calendar, Loader2, AlertCircle,
  TrendingUp, Award, GraduationCap, Send, Video, Megaphone,
  CheckCircle2, Clock, FileText, ChevronRight,
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
  return [first, last].filter(Boolean).join(' ').trim()
}

function timeAgo(dateVal: string | null): string {
  if (!dateVal) return ''
  const dt = new Date(dateVal)
  if (isNaN(dt.getTime())) return ''
  const diff = Date.now() - dt.getTime()
  const min = Math.floor(diff / 60000)
  const hr = Math.floor(min / 60)
  const day = Math.floor(hr / 24)
  if (min < 1) return 'Just now'
  if (min < 60) return `${min}m ago`
  if (hr < 24) return `${hr}h ago`
  if (day < 7) return `${day}d ago`
  return dt.toLocaleDateString()
}

export default function TeacherDashboard() {
  const { user } = useAuth() as { user: any }
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [settings, setSettings] = useState<any>(null)
  const [schoolInfo, setSchoolInfo] = useState<any>(null)

  // Role detection
  const [isFormMaster, setIsFormMaster] = useState(false)
  const [isSubjectTeacher, setIsSubjectTeacher] = useState(false)
  const [formMasterClass, setFormMasterClass] = useState<any>(null)

  // Stats
  const [myClassSubjects, setMyClassSubjects] = useState<any[]>([])
  const [myClasses, setMyClasses] = useState<any[]>([])
  const [mySubjects, setMySubjects] = useState<any[]>([])
  const [fmStudentCount, setFmStudentCount] = useState(0)
  const [assignmentCount, setAssignmentCount] = useState(0)
  const [cbtCount, setCbtCount] = useState(0)
  const [recentAssignments, setRecentAssignments] = useState<any[]>([])
  const [upcomingLive, setUpcomingLive] = useState<any[]>([])
  const [recentAnnouncements, setRecentAnnouncements] = useState<any[]>([])
  const [scoredStudents, setScoredStudents] = useState(0)
  const [totalStudentsToScore, setTotalStudentsToScore] = useState(0)

  const schoolId = user?.school_id || user?.schoolId || ''
  const teacherId = user?.id || ''
  const displayName = fullName(user) || 'Teacher'
  const schoolPrimary = settings?.primary_color || '#1e7a3c'
  const currentSession = settings?.current_session || ''
  const currentTerm = settings?.current_term || ''

  useEffect(() => {
    if (!teacherId || !schoolId) return
    ;(async () => {
      try {
        // Load school info + settings
        const [sRes, setRes] = await Promise.all([
          dbProxy.from('schools').select('id, name, logo_url, motto').eq('id', schoolId).maybeSingle(),
          dbProxy.from('school_settings').select('*').eq('school_id', schoolId).maybeSingle(),
        ])
        if (sRes.data) setSchoolInfo(sRes.data)
        if (setRes.data) setSettings(setRes.data)

        // Detect roles
        const { data: fmClass } = await dbProxy
          .from('classes')
          .select('id, name, section, tier')
          .eq('school_id', schoolId)
          .eq('class_teacher_id', teacherId)
          .maybeSingle()
        const isFM = !!fmClass
        setFormMasterClass(fmClass)
        setIsFormMaster(isFM)

        const { data: csData } = await dbProxy
          .from('class_subjects')
          .select('id, class_id, subject_id')
          .eq('school_id', schoolId)
          .eq('teacher_id', teacherId)
        const csList = csData || []
        setIsSubjectTeacher(csList.length > 0)
        setMyClassSubjects(csList)

        // Fetch classes + subjects for this teacher
        const classIds = Array.from(new Set(csList.map((cs: any) => cs.class_id)))
        const subjectIds = Array.from(new Set(csList.map((cs: any) => cs.subject_id)))

        if (classIds.length > 0) {
          const { data: cData } = await dbProxy.from('classes').select('id, name, section, tier').in('id', classIds).order('name')
          setMyClasses(cData || [])
        }
        if (subjectIds.length > 0) {
          const { data: sData } = await dbProxy.from('subjects').select('id, name, code').in('id', subjectIds).order('name')
          setMySubjects(sData || [])
        }

        // Form master student count
        if (isFM && fmClass) {
          const { data: studs } = await dbProxy.from('students').select('id').eq('class_id', fmClass.id).eq('is_active', true)
          setFmStudentCount((studs || []).length)
        }

        // Assignments count + recent
        const { data: assigns } = await dbProxy.from('assignments').select('id, title, class_id, subject_id, due_date, is_published, created_at').eq('school_id', schoolId).eq('teacher_id', teacherId).order('created_at', { ascending: false })
        setAssignmentCount((assigns || []).length)
        setRecentAssignments((assigns || []).slice(0, 5))

        // CBT count
        const { data: cbts } = await dbProxy.from('cbt_exams').select('id').eq('school_id', schoolId).eq('created_by', teacherId)
        setCbtCount((cbts || []).length)

        // Upcoming live classes
        const { data: liveData } = await dbProxy.from('live_classes').select('id, room_name, status, scheduled_at, started_at, class_id, subject_id, audience').eq('school_id', schoolId).eq('teacher_id', teacherId).in('status', ['scheduled', 'live']).order('scheduled_at', { ascending: true })
        setUpcomingLive((liveData || []).slice(0, 3))

        // Recent announcements (by this teacher)
        const { data: annData } = await dbProxy.from('announcements').select('id, title, is_pinned, created_at').eq('school_id', schoolId).eq('author_id', teacherId).order('created_at', { ascending: false }).limit(3)
        setRecentAnnouncements(annData || [])

        // Score progress: how many students have scores entered by this teacher
        if (csList.length > 0) {
          const { data: sessRes } = await dbProxy.from('academic_sessions').select('id').eq('school_id', schoolId).eq('is_current', true).maybeSingle()
          const { data: termRes } = await dbProxy.from('terms').select('id').eq('school_id', schoolId).eq('is_current', true).maybeSingle()
          if (sessRes && termRes) {
            const subjectIdsStr = subjectIds
            const { data: scoresData } = await dbProxy.from('scores').select('student_id').eq('school_id', schoolId).eq('session_id', sessRes.id).eq('term_id', termRes.id).in('subject_id', subjectIdsStr)
            const scoredIds = new Set((scoresData || []).map((s: any) => s.student_id))
            setScoredStudents(scoredIds.size)

            // Count total students across all assigned classes
            let totalStuds = 0
            for (const cid of classIds) {
              const { data: studs } = await dbProxy.from('students').select('id').eq('class_id', cid).eq('is_active', true)
              totalStuds += (studs || []).length
            }
            setTotalStudentsToScore(totalStuds)
          }
        }
      } catch (e: any) {
        console.error('Teacher dashboard error:', e)
        setError(e?.message || 'Failed to load')
      } finally {
        setLoading(false)
      }
    })()
  }, [teacherId, schoolId])

  const classMap = useMemo(() => {
    const m: Record<string, any> = {}
    myClasses.forEach(c => { m[c.id] = c })
    return m
  }, [myClasses])

  const subjectMap = useMemo(() => {
    const m: Record<string, any> = {}
    mySubjects.forEach(s => { m[s.id] = s })
    return m
  }, [mySubjects])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-slate-600">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="text-sm font-medium">Loading dashboard…</span>
        </div>
      </div>
    )
  }

  const scorePct = totalStudentsToScore > 0 ? Math.round((scoredStudents / totalStudentsToScore) * 100) : 0

  return (
    <div className="px-3 sm:px-4 lg:px-6 py-4 sm:py-6 max-w-5xl mx-auto space-y-5">
      {/* Welcome banner */}
      <div className="relative overflow-hidden rounded-2xl shadow-md" style={{ background: `linear-gradient(135deg, ${schoolPrimary} 0%, ${schoolPrimary}dd 60%, ${schoolPrimary}aa 100%)` }}>
        <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/10 rounded-full pointer-events-none" />
        <div className="absolute -right-4 top-8 w-24 h-24 bg-white/5 rounded-full pointer-events-none" />
        <div className="relative px-4 sm:px-6 py-5">
          <div className="text-[11px] uppercase tracking-widest text-white/80 font-semibold">Teacher Dashboard</div>
          <h1 className="mt-0.5 text-xl sm:text-2xl lg:text-3xl font-bold text-white tracking-tight">Welcome, {displayName}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-white/90 text-sm">
            {isFormMaster && formMasterClass && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/15 backdrop-blur-sm font-medium">
                <GraduationCap size={13} /> Form Master: {formMasterClass.name}{formMasterClass.section ? ` ${formMasterClass.section}` : ''}
              </span>
            )}
            {isSubjectTeacher && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/15 backdrop-blur-sm font-medium">
                <BookOpen size={13} /> {mySubjects.length} Subject{mySubjects.length !== 1 ? 's' : ''} · {myClasses.length} Class{myClasses.length !== 1 ? 'es' : ''}
              </span>
            )}
            {!isFormMaster && !isSubjectTeacher && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/15 backdrop-blur-sm font-medium">
                No assignments yet
              </span>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          <div className="text-sm">{error}</div>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 sm:p-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-2.5" style={{ backgroundColor: '#EEF2FF', color: '#6366F1' }}>
            <BookOpen size={16} strokeWidth={2.2} />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{myClasses.length}</div>
          <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">My Classes</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 sm:p-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-2.5" style={{ backgroundColor: '#ECFDF5', color: '#10B981' }}>
            <Users size={16} strokeWidth={2.2} />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{fmStudentCount || totalStudentsToScore}</div>
          <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">{isFormMaster ? 'My Students' : 'Students'}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 sm:p-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-2.5" style={{ backgroundColor: '#FFFBEB', color: '#F59E0B' }}>
            <ClipboardList size={16} strokeWidth={2.2} />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{assignmentCount}</div>
          <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">Assignments</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 sm:p-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-2.5" style={{ backgroundColor: '#F5F3FF', color: '#8B5CF6' }}>
            <Award size={16} strokeWidth={2.2} />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{cbtCount}</div>
          <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">CBT Exams</div>
        </div>
      </div>

      {/* Score progress (subject teachers) */}
      {isSubjectTeacher && totalStudentsToScore > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-blue-600" strokeWidth={2.2} />
              <h3 className="text-sm font-bold text-slate-900">Score Entry Progress</h3>
            </div>
            <span className="text-sm font-bold text-slate-900">{scorePct}%</span>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${scorePct}%`, background: 'linear-gradient(90deg, #3B82F6, #2563EB)' }} />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>{scoredStudents} students scored</span>
            <span>{totalStudentsToScore} total students</span>
          </div>
        </div>
      )}

      {/* Quick access */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/60">
          <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700">
            <ClipboardList size={18} strokeWidth={2.2} />
          </div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight">Quick Access</h3>
        </div>
        <div className="px-5 py-4 grid grid-cols-3 md:grid-cols-6 gap-3">
          {[
            { icon: ClipboardList, label: 'Scores', path: '/dashboard/teacher/scores', color: '#3B82F6', show: isSubjectTeacher },
            { icon: Calendar, label: 'Attendance', path: '/dashboard/teacher/attendance', color: '#10B981', show: isFormMaster },
            { icon: FileText, label: 'Assignments', path: '/dashboard/teacher/assignments', color: '#8B5CF6', show: isSubjectTeacher },
            { icon: Award, label: 'CBT', path: '/dashboard/teacher/cbt', color: '#F59E0B', show: isSubjectTeacher },
            { icon: Send, label: 'Publish', path: '/dashboard/teacher/publish', color: '#EC4899', show: isFormMaster },
            { icon: Video, label: 'Live', path: '/dashboard/teacher/live-class', color: '#EF4444', show: true },
          ].filter(item => item.show).map((item, idx) => {
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

      {/* Two-column layout: My Classes + Recent Assignments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* My Classes (subject teacher) */}
        {isSubjectTeacher && myClasses.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/60">
              <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700">
                <BookOpen size={18} strokeWidth={2.2} />
              </div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">My Classes</h3>
            </div>
            <div className="px-5 py-3">
              {myClasses.map(c => {
                const subjectsForClass = myClassSubjects.filter(cs => cs.class_id === c.id).map(cs => subjectMap[cs.subject_id]).filter(Boolean)
                return (
                  <div key={c.id} className="py-3 border-b border-slate-100 last:border-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900">{c.name}{c.section ? ` ${c.section}` : ''}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {subjectsForClass.map(s => (
                            <span key={s.id} className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700">{s.name}</span>
                          ))}
                        </div>
                      </div>
                      <button onClick={() => navigate('/dashboard/teacher/scores')} className="flex-shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition">
                        <ChevronRight size={16} strokeWidth={2.2} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Recent Assignments */}
        {recentAssignments.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/60">
              <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center text-violet-700">
                <FileText size={18} strokeWidth={2.2} />
              </div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">Recent Assignments</h3>
            </div>
            <div className="px-5 py-3">
              {recentAssignments.map(a => {
                const cls = classMap[a.class_id]
                const subj = subjectMap[a.subject_id]
                const isOverdue = a.due_date && new Date(a.due_date).getTime() < Date.now()
                return (
                  <div key={a.id} className="py-3 border-b border-slate-100 last:border-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900 truncate">{a.title}</p>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                          <span>{subj?.name || '-'}</span>
                          <span>•</span>
                          <span>{cls?.name || '-'}</span>
                          {a.due_date && (
                            <>
                              <span>•</span>
                              <span className={isOverdue ? 'text-red-600' : ''}>{new Date(a.due_date).toLocaleDateString()}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <span className={`flex-shrink-0 inline-block px-2 py-0.5 rounded text-[10px] font-bold ${a.is_published ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {a.is_published ? 'Published' : 'Draft'}
                      </span>
                    </div>
                  </div>
                )
              })}
              <button onClick={() => navigate('/dashboard/teacher/assignments')} className="mt-2 text-xs font-semibold text-blue-600 hover:text-blue-700">
                View all →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Upcoming Live + Announcements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Upcoming Live Classes */}
        {upcomingLive.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/60">
              <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center text-red-700">
                <Video size={18} strokeWidth={2.2} />
              </div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">Live Classes</h3>
            </div>
            <div className="px-5 py-3">
              {upcomingLive.map(lc => {
                const cls = lc.class_id ? classMap[lc.class_id] : null
                const subj = lc.subject_id ? subjectMap[lc.subject_id] : null
                const isLive = lc.status === 'live'
                return (
                  <div key={lc.id} className="py-3 border-b border-slate-100 last:border-0 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {cls ? `${cls.name}${cls.section ? ` ${cls.section}` : ''}` : 'Live Class'}{subj ? ` · ${subj.name}` : ''}
                      </p>
                      <p className="text-xs text-slate-500">
                        {isLive ? <span className="text-red-600 font-semibold">Live now</span> : `Scheduled: ${lc.scheduled_at ? new Date(lc.scheduled_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}`}
                      </p>
                    </div>
                    {isLive && <span className="flex-shrink-0 w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
                  </div>
                )
              })}
              <button onClick={() => navigate('/dashboard/teacher/live-class')} className="mt-2 text-xs font-semibold text-blue-600 hover:text-blue-700">
                View all →
              </button>
            </div>
          </div>
        )}

        {/* Recent Announcements */}
        {recentAnnouncements.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/60">
              <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-pink-100 flex items-center justify-center text-pink-700">
                <Megaphone size={18} strokeWidth={2.2} />
              </div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">My Announcements</h3>
            </div>
            <div className="px-5 py-3">
              {recentAnnouncements.map(a => (
                <div key={a.id} className="py-3 border-b border-slate-100 last:border-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900 truncate flex-1">{a.title}</p>
                    <span className="text-xs text-slate-400 flex-shrink-0">{timeAgo(a.created_at)}</span>
                  </div>
                </div>
              ))}
              <button onClick={() => navigate('/dashboard/teacher/announcements')} className="mt-2 text-xs font-semibold text-blue-600 hover:text-blue-700">
                View all →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* No roles notice */}
      {!isFormMaster && !isSubjectTeacher && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 text-center">
          <div className="w-16 h-16 mx-auto bg-amber-50 rounded-2xl flex items-center justify-center mb-4 text-amber-400">
            <Users size={32} strokeWidth={2} />
          </div>
          <h3 className="text-base font-bold text-slate-900">No Teaching Assignments</h3>
          <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
            You haven't been assigned as a form master or subject teacher yet. Contact your school administrator to get assigned to classes and subjects.
          </p>
        </div>
      )}
    </div>
  )
}
