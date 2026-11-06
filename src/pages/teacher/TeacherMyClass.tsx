import { useState, useEffect } from "react"
import { dbProxy } from '../../lib/dbProxy'
import { useAuth } from '../../contexts/AuthContext'
import {
  Loader2, AlertCircle, BookOpen, Users, Calendar, GraduationCap,
  Award, TrendingUp,
} from 'lucide-react'

export default function TeacherMyClass() {
  const { user } = useAuth() as { user: any }
  const teacherId = user?.id || ''
  const schoolId = user?.school_id || user?.schoolId || ''

  const [loading, setLoading] = useState(true)
  const [classInfo, setClassInfo] = useState<any>(null)
  const [studentCount, setStudentCount] = useState(0)
  const [subjectCount, setSubjectCount] = useState(0)
  const [sessionId, setSessionId] = useState('')
  const [termId, setTermId] = useState('')
  const [settings, setSettings] = useState<any>(null)

  useEffect(() => {
    if (!teacherId || !schoolId) return
    ;(async () => {
      try {
        const [fmRes, setRes, sessRes, termRes] = await Promise.all([
          dbProxy.from('classes').select('*').eq('school_id', schoolId).eq('class_teacher_id', teacherId).maybeSingle(),
          dbProxy.from('school_settings').select('*').eq('school_id', schoolId).maybeSingle(),
          dbProxy.from('academic_sessions').select('id, name').eq('school_id', schoolId).eq('is_current', true).maybeSingle(),
          dbProxy.from('terms').select('id, name').eq('school_id', schoolId).eq('is_current', true).maybeSingle(),
        ])
        if (fmRes.data) {
          setClassInfo(fmRes.data)
          const { data: studs } = await dbProxy.from('students').select('id').eq('class_id', fmRes.data.id).eq('is_active', true)
          setStudentCount((studs || []).length)
          const { data: subs } = await dbProxy.from('class_subjects').select('id').eq('class_id', fmRes.data.id)
          setSubjectCount((subs || []).length)
        }
        if (setRes.data) setSettings(setRes.data)
        if (sessRes.data) setSessionId(sessRes.data.id)
        if (termRes.data) setTermId(termRes.data.id)
      } catch (e: any) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    })()
  }, [teacherId, schoolId])

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
  }

  if (!classInfo) {
    return (
      <div className="px-3 sm:px-4 lg:px-6 py-4 sm:py-6 max-w-4xl mx-auto bg-gradient-to-br from-slate-50 via-white to-blue-50/30 min-h-screen">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg shadow-slate-200/40 border border-slate-200/60 py-16 text-center">
          <div className="w-16 h-16 mx-auto bg-amber-50 rounded-2xl flex items-center justify-center mb-4 text-amber-400"><BookOpen size={32} strokeWidth={2} /></div>
          <h3 className="text-lg font-bold text-slate-900 mb-2 tracking-tight">Not a Form Master</h3>
          <p className="text-sm text-slate-500">Contact your admin to be assigned as a form teacher.</p>
        </div>
      </div>
    )
  }

  const schoolPrimary = settings?.primary_color || '#1e7a3c'

  return (
    <div className="px-3 sm:px-4 lg:px-6 py-4 sm:py-6 max-w-4xl mx-auto space-y-5">
      <div className="relative overflow-hidden rounded-2xl shadow-md" style={{ background: `linear-gradient(135deg, ${schoolPrimary} 0%, ${schoolPrimary}dd 100%)` }}>
        <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/10 rounded-full pointer-events-none" />
        <div className="relative px-4 sm:px-6 py-5">
          <div className="text-[11px] uppercase tracking-widest text-white/80 font-semibold">My Class</div>
          <h1 className="mt-0.5 text-xl sm:text-2xl font-bold text-white tracking-tight">{classInfo.name}{classInfo.section ? ` ${classInfo.section}` : ''}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-white/90 text-sm">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/15 backdrop-blur-sm font-medium"><GraduationCap size={13} /> {classInfo.tier || 'SSS'}</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/15 backdrop-blur-sm font-medium"><Users size={13} /> {studentCount} students</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/15 backdrop-blur-sm font-medium"><BookOpen size={13} /> {subjectCount} subjects</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg shadow-slate-200/40 border border-slate-200/60 p-3 sm:p-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-2.5" style={{ backgroundColor: '#EEF2FF', color: '#6366F1' }}><Users size={16} strokeWidth={2.2} /></div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900">{studentCount}</div>
          <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">Students</div>
        </div>
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg shadow-slate-200/40 border border-slate-200/60 p-3 sm:p-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-2.5" style={{ backgroundColor: '#ECFDF5', color: '#10B981' }}><BookOpen size={16} strokeWidth={2.2} /></div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900">{subjectCount}</div>
          <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">Subjects</div>
        </div>
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg shadow-slate-200/40 border border-slate-200/60 p-3 sm:p-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-2.5" style={{ backgroundColor: '#FFFBEB', color: '#F59E0B' }}><Calendar size={16} strokeWidth={2.2} /></div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900">{classInfo.class_level || '—'}</div>
          <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">Level</div>
        </div>
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg shadow-slate-200/40 border border-slate-200/60 p-3 sm:p-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-2.5" style={{ backgroundColor: '#F5F3FF', color: '#8B5CF6' }}><Award size={16} strokeWidth={2.2} /></div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900">{classInfo.tier || '—'}</div>
          <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">Tier</div>
        </div>
      </div>

      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg shadow-slate-200/40 border border-slate-200/60 p-5">
        <h3 className="text-sm font-bold text-slate-900 mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <a href="/dashboard/teacher/my-students" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition">
            <Users size={20} className="text-blue-600" strokeWidth={2.2} />
            <span className="text-xs font-semibold text-slate-700">View Students</span>
          </a>
          <a href="/dashboard/teacher/attendance" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition">
            <Calendar size={20} className="text-emerald-600" strokeWidth={2.2} />
            <span className="text-xs font-semibold text-slate-700">Attendance</span>
          </a>
          <a href="/dashboard/teacher/publish" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition">
            <TrendingUp size={20} className="text-violet-600" strokeWidth={2.2} />
            <span className="text-xs font-semibold text-slate-700">Publish</span>
          </a>
          <a href="/dashboard/teacher/announcements" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition">
            <BookOpen size={20} className="text-amber-600" strokeWidth={2.2} />
            <span className="text-xs font-semibold text-slate-700">Announce</span>
          </a>
        </div>
      </div>
    </div>
  )
}
