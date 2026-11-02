import { useState, useEffect, useMemo } from "react"
import { dbProxy } from '../../lib/dbProxy'
import { useAuth } from '../../contexts/AuthContext'
import {
  Loader2, AlertCircle, CheckCircle, Plus, X, Save, Trash2,
  ClipboardList, Eye, Send, Calendar, BookOpen, Users, FileText,
  Clock, CheckCircle2,
} from 'lucide-react'

interface Assignment {
  id: string
  title: string
  description: string
  class_id: string
  subject_id: string
  total_marks: number
  due_date: string | null
  is_published: boolean
  created_at: string
}

interface StudentLite {
  id: string
  first_name: string
  last_name: string
  admission_no: string
}

interface Submission {
  id: string
  student_id: string
  submission_text: string
  score: number | null
  feedback: string | null
  submitted_at: string
}

function studentName(s: StudentLite): string {
  return `${s.first_name ?? ''} ${s.last_name ?? ''}`.trim()
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

export default function TeacherAssignments() {
  const { user } = useAuth()
  const teacherId = user?.id || ''
  const schoolId = user?.school_id || user?.schoolId || ''

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [classSubjects, setClassSubjects] = useState<any[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [subjects, setSubjects] = useState<any[]>([])

  const [showModal, setShowModal] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [viewSubmissions, setViewSubmissions] = useState<Assignment | null>(null)

  // Form state
  const [form, setForm] = useState({
    title: '',
    description: '',
    class_id: '',
    subject_id: '',
    total_marks: 20,
    due_date: '',
  })

  // Submissions state
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [submissionStudents, setSubmissionStudents] = useState<StudentLite[]>([])
  const [gradingId, setGradingId] = useState<string | null>(null)
  const [gradeScore, setGradeScore] = useState('')
  const [gradeFeedback, setGradeFeedback] = useState('')

  useEffect(() => {
    if (!teacherId || !schoolId) return
    ;(async () => {
      setLoading(true)
      try {
        const [aRes, csRes] = await Promise.all([
          dbProxy.from('assignments').select('*').eq('school_id', schoolId).eq('teacher_id', teacherId).order('created_at', { ascending: false }),
          dbProxy.from('class_subjects').select('id, class_id, subject_id').eq('school_id', schoolId).eq('teacher_id', teacherId),
        ])
        if (aRes.error) throw aRes.error
        setAssignments((aRes.data || []) as Assignment[])
        setClassSubjects(csRes.data || [])

        const classIds = Array.from(new Set((csRes.data || []).map((cs: any) => cs.class_id)))
        const subjectIds = Array.from(new Set((csRes.data || []).map((cs: any) => cs.subject_id)))

        if (classIds.length > 0) {
          const { data: cData } = await dbProxy.from('classes').select('id, name, section').in('id', classIds).order('name')
          setClasses(cData || [])
        }
        if (subjectIds.length > 0) {
          const { data: sData } = await dbProxy.from('subjects').select('id, name, code').in('id', subjectIds).order('name')
          setSubjects(sData || [])
        }
      } catch (e: any) {
        setError(e.message || 'Failed to load')
      } finally {
        setLoading(false)
      }
    })()
  }, [teacherId, schoolId])

  const classMap = useMemo(() => {
    const m: Record<string, any> = {}
    classes.forEach(c => { m[c.id] = c })
    return m
  }, [classes])

  const subjectMap = useMemo(() => {
    const m: Record<string, any> = {}
    subjects.forEach(s => { m[s.id] = s })
    return m
  }, [subjects])

  const availableSubjects = useMemo(() => {
    if (!form.class_id) return []
    const subjectIds = classSubjects.filter(cs => cs.class_id === form.class_id).map(cs => cs.subject_id)
    return subjects.filter(s => subjectIds.includes(s.id))
  }, [classSubjects, subjects, form.class_id])

  const handleCreate = async () => {
    if (!form.title.trim() || !form.class_id || !form.subject_id) {
      setError('Title, class, and subject are required')
      return
    }
    setSaving(true); setError('')
    try {
      const payload = {
        school_id: schoolId,
        teacher_id: teacherId,
        title: form.title.trim(),
        description: form.description.trim(),
        class_id: form.class_id,
        subject_id: form.subject_id,
        total_marks: Number(form.total_marks) || 20,
        due_date: form.due_date || null,
        is_published: true,
      }
      const { error: inErr } = await dbProxy.from('assignments').insert(payload)
      if (inErr) throw inErr
      const { data: newData } = await dbProxy.from('assignments').select('*').eq('school_id', schoolId).eq('teacher_id', teacherId).order('created_at', { ascending: false })
      setAssignments((newData || []) as Assignment[])
      setShowModal(false)
      setForm({ title: '', description: '', class_id: '', subject_id: '', total_marks: 20, due_date: '' })
      setSuccessMsg('Assignment created')
    } catch (e: any) {
      setError(e.message || 'Create failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const { error } = await dbProxy.from('assignments').delete().eq('id', id)
      if (error) throw error
      setAssignments(prev => prev.filter(a => a.id !== id))
      setDeleteConfirm(null)
      setSuccessMsg('Assignment deleted')
    } catch (e: any) {
      setError(e.message || 'Delete failed')
    }
  }

  const togglePublish = async (a: Assignment) => {
    try {
      const { error } = await dbProxy.from('assignments').update({ is_published: !a.is_published }).eq('id', a.id)
      if (error) throw error
      setAssignments(prev => prev.map(x => x.id === a.id ? { ...x, is_published: !a.is_published } : x))
      setSuccessMsg(a.is_published ? 'Unpublished' : 'Published')
    } catch (e: any) {
      setError(e.message || 'Toggle failed')
    }
  }

  const loadSubmissions = async (assignment: Assignment) => {
    setViewSubmissions(assignment)
    try {
      const [subRes, studRes] = await Promise.all([
        dbProxy.from('assignment_submissions').select('*').eq('assignment_id', assignment.id).order('submitted_at', { ascending: false }),
        dbProxy.from('students').select('id, first_name, last_name, admission_no').eq('class_id', assignment.class_id).order('first_name'),
      ])
      setSubmissions((subRes.data || []) as Submission[])
      setSubmissionStudents((studRes.data || []) as StudentLite[])
    } catch (e: any) {
      setError(e.message || 'Failed to load submissions')
    }
  }

  const startGrading = (sub: Submission) => {
    setGradingId(sub.id)
    setGradeScore(sub.score != null ? String(sub.score) : '')
    setGradeFeedback(sub.feedback || '')
  }

  const saveGrade = async (subId: string) => {
    setSaving(true); setError('')
    try {
      const { error } = await dbProxy.from('assignment_submissions')
        .update({ score: Number(gradeScore) || 0, feedback: gradeFeedback.trim() || null })
        .eq('id', subId)
      if (error) throw error
      setSubmissions(prev => prev.map(s => s.id === subId ? { ...s, score: Number(gradeScore) || 0, feedback: gradeFeedback.trim() || null } : s))
      setGradingId(null)
      setSuccessMsg('Grade saved')
    } catch (e: any) {
      setError(e.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const studentMap = useMemo(() => {
    const m: Record<string, StudentLite> = {}
    submissionStudents.forEach(s => { m[s.id] = s })
    return m
  }, [submissionStudents])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-slate-600">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="text-sm font-medium">Loading…</span>
        </div>
      </div>
    )
  }

  return (
    <div className="px-3 sm:px-4 lg:px-6 py-4 sm:py-6 max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Assignments</h1>
          <p className="text-sm text-slate-500 mt-1">{assignments.length} assignment{assignments.length !== 1 ? 's' : ''} created</p>
        </div>
        <button onClick={() => { setForm({ title: '', description: '', class_id: '', subject_id: '', total_marks: 20, due_date: '' }); setShowModal(true) }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition shadow-sm">
          <Plus size={14} strokeWidth={2.4} />New Assignment
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-800">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          <p className="text-sm flex-1">{error}</p>
        </div>
      )}
      {successMsg && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800">
          <CheckCircle size={18} className="flex-shrink-0 mt-0.5" />
          <p className="text-sm flex-1">{successMsg}</p>
        </div>
      )}

      {/* Assignment list */}
      {assignments.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 py-16 text-center">
          <div className="w-16 h-16 mx-auto bg-blue-50 rounded-2xl flex items-center justify-center mb-4 text-blue-400">
            <ClipboardList size={32} strokeWidth={2} />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">No Assignments Yet</h3>
          <p className="text-sm text-slate-500">Click "New Assignment" to create one for your students.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {assignments.map(a => {
            const cls = classMap[a.class_id]
            const subj = subjectMap[a.subject_id]
            const isOverdue = a.due_date && new Date(a.due_date).getTime() < Date.now()
            return (
              <div key={a.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="text-sm font-bold text-slate-900">{a.title}</h3>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${a.is_published ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          {a.is_published ? 'Published' : 'Draft'}
                        </span>
                      </div>
                      {a.description && <p className="text-sm text-slate-600 whitespace-pre-wrap line-clamp-2">{a.description}</p>}
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-500 flex-wrap">
                        <span className="inline-flex items-center gap-1"><BookOpen size={11} />{subj?.name || '-'}</span>
                        <span className="inline-flex items-center gap-1"><Users size={11} />{cls?.name || '-'}</span>
                        <span>{a.total_marks} marks</span>
                        {a.due_date && (
                          <span className={`inline-flex items-center gap-1 ${isOverdue ? 'text-red-600' : ''}`}>
                            <Calendar size={11} />{new Date(a.due_date).toLocaleDateString()}
                          </span>
                        )}
                        <span>{timeAgo(a.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-slate-100">
                    <button onClick={() => loadSubmissions(a)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold border border-blue-200 transition">
                      <Eye size={13} strokeWidth={2.2} />Submissions
                    </button>
                    <button onClick={() => togglePublish(a)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-semibold border border-slate-200 transition">
                      {a.is_published ? 'Unpublish' : 'Publish'}
                    </button>
                    <button onClick={() => setDeleteConfirm(a.id)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold border border-red-200 transition">
                      <Trash2 size={13} strokeWidth={2.2} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700">
                  <ClipboardList size={18} strokeWidth={2.2} />
                </div>
                <h3 className="text-base font-bold text-slate-900">New Assignment</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-md text-slate-500 hover:bg-slate-200">
                <X size={18} />
              </button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Title *</label>
                <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g., Chapter 5 Exercises"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Description / Instructions</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3}
                  placeholder="Write assignment instructions…"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Class *</label>
                  <select value={form.class_id} onChange={e => setForm({ ...form, class_id: e.target.value, subject_id: '' })}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition">
                    <option value="">Select class</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}{c.section ? ` ${c.section}` : ''}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Subject *</label>
                  <select value={form.subject_id} onChange={e => setForm({ ...form, subject_id: e.target.value })} disabled={!form.class_id}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition disabled:bg-slate-50">
                    <option value="">{form.class_id ? 'Select subject' : 'Class first'}</option>
                    {availableSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Total Marks</label>
                  <input type="number" value={form.total_marks} onChange={e => setForm({ ...form, total_marks: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Due Date</label>
                  <input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition" />
                </div>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 flex gap-3">
              <button onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-semibold text-sm hover:bg-slate-50">Cancel</button>
              <button onClick={handleCreate} disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-sm disabled:opacity-50">
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                {saving ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submissions Modal */}
      {viewSubmissions && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4" onClick={() => { setViewSubmissions(null); setGradingId(null) }}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700">
                  <FileText size={18} strokeWidth={2.2} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-slate-900 truncate">Submissions — {viewSubmissions.title}</h3>
                  <p className="text-xs text-slate-500">{submissions.length} submitted · {submissionStudents.length - submissions.length} pending</p>
                </div>
              </div>
              <button onClick={() => { setViewSubmissions(null); setGradingId(null) }} className="p-1.5 rounded-md text-slate-500 hover:bg-slate-200">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {submissions.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="w-16 h-16 mx-auto bg-slate-100 rounded-2xl flex items-center justify-center mb-4 text-slate-400">
                    <Inbox size={32} strokeWidth={2} />
                  </div>
                  <p className="text-sm text-slate-500">No submissions yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {submissions.map(sub => {
                    const student = studentMap[sub.student_id]
                    const name = student ? studentName(student) : 'Unknown'
                    const admNo = student?.admission_no || '-'
                    const isGrading = gradingId === sub.id
                    const isGraded = sub.score !== null && sub.score !== undefined
                    return (
                      <div key={sub.id} className={`p-4 rounded-xl border ${isGraded ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200 bg-white'}`}>
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                              {name.charAt(0) || '?'}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-800 truncate">{name}</p>
                              <p className="text-xs text-slate-400">{admNo} · {timeAgo(sub.submitted_at)}</p>
                            </div>
                          </div>
                          {isGraded && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                              <CheckCircle2 size={11} strokeWidth={2.4} />{sub.score}/{viewSubmissions.total_marks}
                            </span>
                          )}
                        </div>
                        <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-700 whitespace-pre-wrap break-words leading-relaxed">
                          {sub.submission_text || '(empty)'}
                        </div>
                        {sub.feedback && !isGrading && (
                          <div className="mt-2 p-2.5 rounded-lg bg-emerald-50 border border-emerald-100 text-xs text-emerald-800">
                            <span className="font-semibold">Feedback: </span>{sub.feedback}
                          </div>
                        )}
                        {isGrading ? (
                          <div className="mt-3 space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[10px] text-slate-500 mb-1">Score (/{viewSubmissions.total_marks})</label>
                                <input type="number" value={gradeScore} onChange={e => setGradeScore(e.target.value)}
                                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition" />
                              </div>
                              <div>
                                <label className="block text-[10px] text-slate-500 mb-1">Feedback</label>
                                <input type="text" value={gradeFeedback} onChange={e => setGradeFeedback(e.target.value)}
                                  placeholder="Optional…"
                                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition" />
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => setGradingId(null)} className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 text-xs font-semibold hover:bg-slate-50">Cancel</button>
                              <button onClick={() => saveGrade(sub.id)} disabled={saving}
                                className="flex-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-50">
                                {saving ? 'Saving…' : 'Save Grade'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => startGrading(sub)}
                            className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold border border-blue-200 transition">
                            {isGraded ? 'Edit Grade' : 'Grade'}
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center text-red-600">
                <Trash2 size={24} strokeWidth={2} />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Delete Assignment?</h3>
            </div>
            <p className="text-sm text-slate-600 mb-5">This will permanently delete the assignment and all student submissions. This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-50">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 text-white font-semibold text-sm hover:bg-red-700 shadow-sm">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
