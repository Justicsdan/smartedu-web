import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import {
  Loader2, AlertCircle, CheckCircle, Save, X, ChevronRight,
  BookOpen, Eye, EyeOff, Send, Calculator,
} from 'lucide-react'

interface AceReport {
  id: string
  student_id: string
  class_id: string
  session_id: string
  term_id: string
  day_in_term: number
  days_absent: number
  teacher_comment: string
  supervisor_comment: string
  principal_comment: string
  reading_progress: string
  reading_wpm: number
  reading_composite: number
  reading_comprehension: number
  hacs_score: number
  nce_score: number
  total_score: number
  paces_completed: number
  paces_avg: number
  paces_total: number
  is_published: boolean
  published_at: string | null
}

interface StudentLite {
  id: string
  first_name: string
  middle_name: string | null
  last_name: string
  admission_no: string
}

function studentName(s: StudentLite): string {
  return [s.first_name, s.middle_name, s.last_name].filter(Boolean).join(' ').trim()
}

export default function AceReportsPage() {
  const { user } = useAuth()
  const schoolId = user?.id || ''

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const [classes, setClasses] = useState<any[]>([])
  const [classId, setClassId] = useState('')
  const [students, setStudents] = useState<StudentLite[]>([])
  const [reports, setReports] = useState<Record<string, AceReport | null>>({})
  const [paceCounts, setPaceCounts] = useState<Record<string, number>>({})
  const [editingStudent, setEditingStudent] = useState<StudentLite | null>(null)
  const [sessionId, setSessionId] = useState('')
  const [termId, setTermId] = useState('')

  useEffect(() => {
    if (!schoolId) return
    ;(async () => {
      setLoading(true)
      try {
        const [cRes, ssRes, tRes] = await Promise.all([
          supabase.from('classes').select('id, name, section').eq('school_id', schoolId).order('name'),
          supabase.from('academic_sessions').select('id').eq('school_id', schoolId).eq('is_current', true).maybeSingle(),
          supabase.from('terms').select('id').eq('school_id', schoolId).eq('is_current', true).maybeSingle(),
        ])
        setClasses(cRes.data || [])
        setSessionId(ssRes.data?.id || '')
        setTermId(tRes.data?.id || '')
      } catch (e: any) {
        setError(e.message || 'Failed to load')
      } finally {
        setLoading(false)
      }
    })()
  }, [schoolId])

  const loadData = async (cid: string) => {
    setLoading(true); setError('')
    try {
      const { data: studs } = await supabase
        .from('students')
        .select('id, first_name, middle_name, last_name, admission_no')
        .eq('class_id', cid)
        .eq('is_active', true)
        .order('first_name')
      const list = (studs || []) as StudentLite[]
      setStudents(list)

      const repMap: Record<string, AceReport | null> = {}
      const paceMap: Record<string, number> = {}
      for (const s of list) {
        const { data: rep } = await supabase
          .from('ace_term_reports')
          .select('*')
          .eq('student_id', s.id)
          .eq('session_id', sessionId)
          .eq('term_id', termId)
          .maybeSingle()
        repMap[s.id] = rep as AceReport || null

        const { data: paces } = await supabase
          .from('ace_pace_scores')
          .select('id')
          .eq('student_id', s.id)
          .eq('session_id', sessionId)
          .eq('term_id', termId)
        paceMap[s.id] = (paces || []).length
      }
      setReports(repMap)
      setPaceCounts(paceMap)
    } catch (e: any) {
      setError(e.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  if (loading && classes.length === 0) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-[#1A237E] animate-spin" /></div>
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">ACE Reports</h1>
        <p className="text-sm text-gray-500 mt-1">Generate and publish ACE term reports with PACE summaries</p>
      </div>

      {error && (
        <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      {successMsg && (
        <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-green-700">{successMsg}</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <label className="block text-xs font-medium text-gray-600 mb-1.5">Select Class</label>
        <select value={classId} onChange={e => { setClassId(e.target.value); if (e.target.value) loadData(e.target.value) }} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30">
          <option value="">Select class</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}{c.section ? ` (${c.section})` : ''}</option>)}
        </select>
      </div>

      {!classId ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <div className="w-16 h-16 mx-auto bg-blue-50 rounded-2xl flex items-center justify-center mb-3"><BookOpen className="w-8 h-8 text-blue-400" /></div>
          <p className="text-gray-400 text-sm">Select a class to begin</p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-[#1A237E] animate-spin" /></div>
      ) : students.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <p className="text-gray-400 text-sm">No students in this class.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {students.map(s => {
            const rep = reports[s.id]
            const pc = paceCounts[s.id] || 0
            return (
              <div key={s.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between hover:shadow-sm transition cursor-pointer" onClick={() => setEditingStudent(s)}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                    {studentName(s).charAt(0) || '?'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{studentName(s)}</p>
                    <p className="text-xs text-gray-400">{pc} PACE{pc !== 1 ? 's' : ''} recorded</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {rep?.is_published ? (
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">Published</span>
                  ) : rep?.hacs_score != null ? (
                    <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-medium">HACS: {Number(rep.hacs_score).toFixed(1)}</span>
                  ) : (
                    <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded text-xs font-medium">Draft</span>
                  )}
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {editingStudent && (
        <AceReportModal
          student={editingStudent}
          existingReport={reports[editingStudent.id]}
          paceCount={paceCounts[editingStudent.id] || 0}
          schoolId={schoolId}
          classId={classId}
          sessionId={sessionId}
          termId={termId}
          onClose={() => setEditingStudent(null)}
          onSaved={() => {
            setEditingStudent(null)
            if (classId) loadData(classId)
            setSuccessMsg('ACE report saved')
          }}
        />
      )}
    </div>
  )
}

function AceReportModal({ student, existingReport, paceCount, schoolId, classId, sessionId, termId, onClose, onSaved }: {
  student: StudentLite
  existingReport: AceReport | null
  paceCount: number
  schoolId: string
  classId: string
  sessionId: string
  termId: string
  onClose: () => void
  onSaved: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    day_in_term: existingReport?.day_in_term || 0,
    days_absent: existingReport?.days_absent || 0,
    teacher_comment: existingReport?.teacher_comment || '',
    supervisor_comment: existingReport?.supervisor_comment || '',
    principal_comment: existingReport?.principal_comment || '',
    reading_progress: existingReport?.reading_progress || '',
    reading_wpm: existingReport?.reading_wpm || 0,
    reading_composite: existingReport?.reading_composite || 0,
    reading_comprehension: existingReport?.reading_comprehension || 0,
  })

  const updateField = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    setSaving(true); setError('')
    try {
      const payload = {
        school_id: schoolId,
        student_id: student.id,
        class_id: classId,
        session_id: sessionId,
        term_id: termId,
        day_in_term: Number(form.day_in_term) || 0,
        days_absent: Number(form.days_absent) || 0,
        teacher_comment: form.teacher_comment,
        supervisor_comment: form.supervisor_comment,
        principal_comment: form.principal_comment,
        reading_progress: form.reading_progress,
        reading_wpm: Number(form.reading_wpm) || 0,
        reading_composite: Number(form.reading_composite) || 0,
        reading_comprehension: Number(form.reading_comprehension) || 0,
        paces_completed: paceCount,
        paces_total: paceCount,
        is_published: existingReport?.is_published || false,
      }

      if (existingReport?.id) {
        const { error } = await supabase.from('ace_term_reports').update(payload).eq('id', existingReport.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('ace_term_reports').insert(payload)
        if (error) throw error
      }
      onSaved()
    } catch (e: any) {
      setError(e.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handlePublish = async () => {
    setPublishing(true); setError('')
    try {
      // Save first if not yet saved
      if (!existingReport?.id) {
        await handleSave()
      }
      const { error } = await supabase
        .from('ace_term_reports')
        .update({ is_published: true, published_at: new Date().toISOString() })
        .eq('student_id', student.id)
        .eq('session_id', sessionId)
        .eq('term_id', termId)
      if (error) throw error
      onSaved()
    } catch (e: any) {
      setError(e.message || 'Publish failed')
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-gray-800">ACE Report — {studentName(student)}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          {error && <div className="p-2 bg-red-50 text-red-700 text-sm rounded">{error}</div>}

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">PACEs recorded: <span className="font-semibold">{paceCount}</span></p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Day in Term</label>
              <input type="number" value={form.day_in_term} onChange={e => updateField('day_in_term', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Days Absent</label>
              <input type="number" value={form.days_absent} onChange={e => updateField('days_absent', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Reading WPM</label>
              <input type="number" value={form.reading_wpm} onChange={e => updateField('reading_wpm', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Reading Composite</label>
              <input type="number" value={form.reading_composite} onChange={e => updateField('reading_composite', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Reading Comp.</label>
              <input type="number" value={form.reading_comprehension} onChange={e => updateField('reading_comprehension', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Reading Progress</label>
            <textarea value={form.reading_progress} onChange={e => updateField('reading_progress', e.target.value)} rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30 resize-none" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Teacher Comment</label>
            <textarea value={form.teacher_comment} onChange={e => updateField('teacher_comment', e.target.value)} rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30 resize-none" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Supervisor Comment</label>
            <textarea value={form.supervisor_comment} onChange={e => updateField('supervisor_comment', e.target.value)} rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30 resize-none" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Principal Comment</label>
            <textarea value={form.principal_comment} onChange={e => updateField('principal_comment', e.target.value)} rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30 resize-none" />
          </div>

          {existingReport?.hacs_score != null && (
            <div className="grid grid-cols-3 gap-3 p-3 bg-gray-50 rounded-lg">
              <div><p className="text-xs text-gray-500">HACS Score</p><p className="text-sm font-semibold text-gray-800">{Number(existingReport.hacs_score).toFixed(1)}</p></div>
              <div><p className="text-xs text-gray-500">NCE Score</p><p className="text-sm font-semibold text-gray-800">{existingReport.nce_score ? Number(existingReport.nce_score).toFixed(1) : '-'}</p></div>
              <div><p className="text-xs text-gray-500">Total</p><p className="text-sm font-semibold text-gray-800">{existingReport.total_score ? Number(existingReport.total_score).toFixed(1) : '-'}</p></div>
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 p-5 border-t border-gray-100 sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-[#1A237E] text-white rounded-lg text-sm font-medium hover:bg-[#283593] transition disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button onClick={handlePublish} disabled={publishing} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition disabled:opacity-50">
            {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {publishing ? 'Publishing...' : 'Publish'}
          </button>
        </div>
      </div>
    </div>
  )
}
