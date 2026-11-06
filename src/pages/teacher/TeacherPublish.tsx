import { useState, useEffect } from "react"
import { dbProxy } from '../../lib/dbProxy'
import { useAuth } from '../../contexts/AuthContext'
import {
  Loader2, AlertCircle, CheckCircle, Send, Calculator, Users,
  ChevronDown, ChevronUp, Eye, EyeOff,
} from 'lucide-react'

interface Summary {
  id?: string
  student_id: string
  total_score: number
  average_score: number
  grade: string
  position: number
  position_out_of: number
  is_published: boolean
}

interface StudentLite {
  id: string
  first_name: string
  last_name: string
  admission_no: string
}

function studentName(s: StudentLite): string {
  return `${s.first_name ?? ''} ${s.last_name ?? ''}`.trim()
}

export default function TeacherPublish() {
  const { user } = useAuth() as { user: any }
  const teacherId = user?.id || ''
  const schoolId = user?.school_id || user?.schoolId || ''

  const [loading, setLoading] = useState(true)
  const [computing, setComputing] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [classInfo, setClassInfo] = useState<any>(null)
  const [sessionId, setSessionId] = useState('')
  const [termId, setTermId] = useState('')
  const [students, setStudents] = useState<StudentLite[]>([])
  const [summaries, setSummaries] = useState<Summary[]>([])
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null)

  useEffect(() => {
    if (!teacherId || !schoolId) return
    ;(async () => {
      try {
        const [fmRes, sessRes, termRes] = await Promise.all([
          dbProxy.from('classes').select('id, name, section, tier').eq('school_id', schoolId).eq('class_teacher_id', teacherId).maybeSingle(),
          dbProxy.from('academic_sessions').select('id').eq('school_id', schoolId).eq('is_current', true).maybeSingle(),
          dbProxy.from('terms').select('id').eq('school_id', schoolId).eq('is_current', true).maybeSingle(),
        ])
        if (fmRes.data) {
          setClassInfo(fmRes.data)
          if (sessRes.data) setSessionId(sessRes.data.id)
          if (termRes.data) setTermId(termRes.data.id)
          const { data: studs } = await dbProxy.from('students').select('id, first_name, last_name, admission_no').eq('class_id', fmRes.data.id).order('first_name')
          setStudents((studs || []) as StudentLite[])
          const { data: sums } = await dbProxy.from('student_term_summaries').select('*').eq('school_id', schoolId).eq('class_id', fmRes.data.id).eq('session_id', sessRes.data?.id || '').eq('term_id', termRes.data?.id || '')
          setSummaries((sums || []) as Summary[])
        }
      } catch (e: any) { setError(e.message) } finally { setLoading(false) }
    })()
  }, [teacherId, schoolId])

  const summaryFor = (sid: string) => summaries.find(s => s.student_id === sid)
  const publishedCount = summaries.filter(s => s.is_published).length

  const togglePublishOne = async (sid: string, publish: boolean) => {
    try {
      await dbProxy.from('student_term_summaries').update({ is_published: publish, published_at: publish ? new Date().toISOString() : null }).eq('student_id', sid).eq('class_id', classInfo.id).eq('session_id', sessionId).eq('term_id', termId)
      const { data } = await dbProxy.from('student_term_summaries').select('*').eq('school_id', schoolId).eq('class_id', classInfo.id).eq('session_id', sessionId).eq('term_id', termId)
      setSummaries((data || []) as Summary[])
      setSuccessMsg(publish ? 'Published' : 'Unpublished')
    } catch (e: any) { setError(e.message) }
  }

  const publishAll = async () => {
    setPublishing(true); setError('')
    try {
      await dbProxy.from('student_term_summaries').update({ is_published: true, published_at: new Date().toISOString() }).eq('school_id', schoolId).eq('class_id', classInfo.id).eq('session_id', sessionId).eq('term_id', termId)
      const { data } = await dbProxy.from('student_term_summaries').select('*').eq('school_id', schoolId).eq('class_id', classInfo.id).eq('session_id', sessionId).eq('term_id', termId)
      setSummaries((data || []) as Summary[])
      setSuccessMsg('All results published!')
    } catch (e: any) { setError(e.message) } finally { setPublishing(false) }
  }

  if (loading) return <div className="flex items-center justify-center min-h-[60vh] bg-gradient-to-br from-slate-50 via-white to-blue-50/30"><div className="w-14 h-14 border-4 border-blue-500 border-t-transparent rounded-full animate-spin shadow-lg shadow-blue-500/20" /></div>

  if (!classInfo) {
    return (
      <div className="px-3 sm:px-4 lg:px-6 py-4 sm:py-6 max-w-4xl mx-auto bg-gradient-to-br from-slate-50 via-white to-blue-50/30 min-h-screen">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg shadow-slate-200/40 border border-slate-200/60 py-16 text-center">
          <div className="w-16 h-16 mx-auto bg-amber-50 rounded-2xl flex items-center justify-center mb-4 text-amber-400"><Users size={32} /></div>
          <h3 className="text-base font-bold text-slate-900 mb-1">Not a Form Master</h3>
          <p className="text-sm text-slate-500">Only form masters can publish results.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-3 sm:px-4 lg:px-6 py-4 sm:py-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
              Publish
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 bg-clip-text text-transparent">Publish Results</h1>
        </div>
          <p className="text-sm text-slate-500 mt-1">{classInfo.name}{classInfo.section ? ` ${classInfo.section}` : ''} · {publishedCount}/{summaries.length} published</p>
        </div>
        <button onClick={publishAll} disabled={publishing || summaries.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition disabled:opacity-50 shadow-sm">
          {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {publishing ? 'Publishing…' : 'Publish All'}
        </button>
      </div>

      {error && <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-800"><AlertCircle size={18} className="flex-shrink-0 mt-0.5" /><p className="text-sm flex-1">{error}</p></div>}
      {successMsg && <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800"><CheckCircle size={18} className="flex-shrink-0 mt-0.5" /><p className="text-sm flex-1">{successMsg}</p></div>}

      {summaries.length === 0 ? (
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg shadow-slate-200/40 border border-slate-200/60 py-16 text-center">
          <div className="w-16 h-16 mx-auto bg-slate-100 rounded-2xl flex items-center justify-center mb-4 text-slate-400"><Calculator size={32} /></div>
          <h3 className="text-base font-bold text-slate-900 mb-1">No Summaries Computed</h3>
          <p className="text-sm text-slate-500">Ask admin to compute positions first from the admin Publish page.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {summaries.map((s, i) => {
            const student = students.find(st => st.id === s.student_id)
            if (!student) return null
            const isExpanded = expandedStudent === s.student_id
            return (
              <div key={s.student_id} className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg shadow-slate-200/40 border border-slate-200/60 overflow-hidden">
                <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition" onClick={() => setExpandedStudent(isExpanded ? null : s.student_id)}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                      {studentName(student).charAt(0) || '?'}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{studentName(student)}</p>
                      <p className="text-xs text-slate-400">{student.admission_no || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right"><p className="text-xs text-slate-400">Avg</p><p className="text-sm font-semibold text-slate-800">{s.average_score?.toFixed(1) || '-'}</p></div>
                    <div className="text-right"><p className="text-xs text-slate-400">Pos</p><p className="text-sm font-semibold text-slate-800">{s.position || '-'}/{s.position_out_of || '-'}</p></div>
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${s.is_published ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {s.is_published ? 'Published' : 'Hidden'}
                    </span>
                    {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                  </div>
                </div>
                {isExpanded && (
                  <div className="border-t border-slate-100 p-4 bg-slate-50/40 flex items-center justify-between">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div><p className="text-xs text-slate-400">Total</p><p className="font-semibold text-slate-800">{s.total_score || '-'}</p></div>
                      <div><p className="text-xs text-slate-400">Grade</p><p className="font-semibold text-slate-800">{s.grade || '-'}</p></div>
                      <div><p className="text-xs text-slate-400">Position</p><p className="font-semibold text-slate-800">{s.position || '-'}/{s.position_out_of || '-'}</p></div>
                    </div>
                    <button onClick={() => togglePublishOne(s.student_id, !s.is_published)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${s.is_published ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'}`}>
                      {s.is_published ? <EyeOff size={13} /> : <Eye size={13} />}
                      {s.is_published ? 'Unpublish' : 'Publish'}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
