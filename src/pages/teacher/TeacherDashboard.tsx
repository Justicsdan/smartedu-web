import { useState, useEffect } from 'react'
import { dbProxy } from '../../lib/dbProxy'
import { useAuth } from '../../contexts/AuthContext'
import {
  Users, BookOpen, ClipboardList, Calendar, Loader2, AlertCircle,
  TrendingUp, Award,
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

export default function TeacherDashboard() {
  const { user } = useAuth() as { user: any }
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [settings, setSettings] = useState<any>(null)
  const [stats, setStats] = useState({
    myClasses: 0,
    myStudents: 0,
    mySubjects: 0,
    assignments: 0,
    formMasterClass: '' as string,
    isFormMaster: false,
    isSubjectTeacher: false,
  })

  const schoolId = user?.school_id || user?.schoolId || ''
  const teacherId = user?.id || ''
  const displayName = fullName(user) || 'Teacher'
  const schoolPrimary = settings?.primary_color || '#1e7a3c'

  useEffect(() => {
    if (!teacherId || !schoolId) return
    ;(async () => {
      try {
        const { data: setRes } = await dbProxy
          .from('school_settings')
          .select('*')
          .eq('school_id', schoolId)
          .maybeSingle()
        if (setRes) setSettings(setRes)

        // Detect roles
        const { data: fmClass } = await dbProxy
          .from('classes')
          .select('id, name, section')
          .eq('school_id', schoolId)
          .eq('class_teacher_id', teacherId)
          .maybeSingle()
        const isFM = !!fmClass

        const { data: csData } = await dbProxy
          .from('class_subjects')
          .select('id, class_id, subject_id')
          .eq('school_id', schoolId)
          .eq('teacher_id', teacherId)
        const csList = csData || []
        const isST = csList.length > 0

        // Count unique classes from class_subjects
        const classIds = new Set(csList.map((cs: any) => cs.class_id))
        const subjectIds = new Set(csList.map((cs: any) => cs.subject_id))

        // Count students in form master class
        let studentCount = 0
        if (isFM && fmClass) {
          const { data: studs } = await dbProxy
            .from('students')
            .select('id')
            .eq('class_id', fmClass.id)
            .eq('is_active', true)
          studentCount = (studs || []).length
        }

        // Count assignments
        const { data: assigns } = await dbProxy
          .from('assignments')
          .select('id')
          .eq('school_id', schoolId)
          .eq('teacher_id', teacherId)
        const assignCount = (assigns || []).length

        setStats({
          myClasses: isST ? classIds.size : 0,
          myStudents: studentCount,
          mySubjects: isST ? subjectIds.size : 0,
          assignments: assignCount,
          formMasterClass: fmClass ? `${fmClass.name}${fmClass.section ? ' ' + fmClass.section : ''}` : '',
          isFormMaster: isFM,
          isSubjectTeacher: isST,
        })
      } catch (e: any) {
        console.error('Teacher dashboard error:', e)
        setError(e?.message || 'Failed to load')
      } finally {
        setLoading(false)
      }
    })()
  }, [teacherId, schoolId])

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

  return (
    <div className="px-3 sm:px-4 lg:px-6 py-4 sm:py-6 max-w-5xl mx-auto space-y-5">
      {/* Welcome banner */}
      <div
        className="relative overflow-hidden rounded-2xl shadow-md"
        style={{ background: `linear-gradient(135deg, ${schoolPrimary} 0%, ${schoolPrimary}dd 60%, ${schoolPrimary}aa 100%)` }}
      >
        <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/10 rounded-full pointer-events-none" />
        <div className="absolute -right-4 top-8 w-24 h-24 bg-white/5 rounded-full pointer-events-none" />
        <div className="relative px-4 sm:px-6 py-5">
          <div className="text-[11px] uppercase tracking-widest text-white/80 font-semibold">
            Teacher Dashboard
          </div>
          <h1 className="mt-0.5 text-xl sm:text-2xl lg:text-3xl font-bold text-white tracking-tight">
            Welcome, {displayName}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-white/90 text-sm">
            {stats.formMasterClass && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/15 backdrop-blur-sm font-medium">
                Form Master: {stats.formMasterClass}
              </span>
            )}
            {stats.isSubjectTeacher && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/15 backdrop-blur-sm font-medium">
                {stats.mySubjects} Subject{stats.mySubjects !== 1 ? 's' : ''} · {stats.myClasses} Class{stats.myClasses !== 1 ? 'es' : ''}
              </span>
            )}
            {!stats.isFormMaster && !stats.isSubjectTeacher && (
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
          <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{stats.myClasses}</div>
          <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">My Classes</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 sm:p-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-2.5" style={{ backgroundColor: '#ECFDF5', color: '#10B981' }}>
            <Users size={16} strokeWidth={2.2} />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{stats.myStudents}</div>
          <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">My Students</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 sm:p-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-2.5" style={{ backgroundColor: '#FFFBEB', color: '#F59E0B' }}>
            <BookOpen size={16} strokeWidth={2.2} />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{stats.mySubjects}</div>
          <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">Subjects</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 sm:p-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-2.5" style={{ backgroundColor: '#F5F3FF', color: '#8B5CF6' }}>
            <ClipboardList size={16} strokeWidth={2.2} />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{stats.assignments}</div>
          <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">Assignments</div>
        </div>
      </div>

      {/* Coming soon notice */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 text-center">
        <div className="w-16 h-16 mx-auto bg-blue-50 rounded-2xl flex items-center justify-center mb-4 text-blue-400">
          <TrendingUp size={32} strokeWidth={2} />
        </div>
        <h3 className="text-base font-bold text-slate-900">Teacher Portal — Under Construction</h3>
        <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
          The teacher dashboard is ready. Full page functionality (enter scores, manage assignments, 
          take attendance, create CBT exams, publish results) will be built next — one page at a time.
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {stats.isFormMaster && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
              <Award size={13} strokeWidth={2.4} /> Form Master
            </span>
          )}
          {stats.isSubjectTeacher && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
              <BookOpen size={13} strokeWidth={2.4} /> Subject Teacher
            </span>
          )}
          {!stats.isFormMaster && !stats.isSubjectTeacher && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold">
              <AlertCircle size={13} strokeWidth={2.4} /> No roles assigned yet
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
