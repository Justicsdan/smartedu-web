import { useState, useEffect, useCallback } from 'react'
import { dbProxy } from '../../lib/dbProxy'
import { useAuth } from '../../contexts/AuthContext'
import {
  BookOpen, Calendar, CheckCircle2, Clock, AlertCircle, Loader2, RefreshCw,
  Send, X, FileText, MessageSquare, Inbox, User, ClipboardList,
} from 'lucide-react'

function pickString(record: any, ...keys: string[]): string {
  for (const k of keys) {
    const v = record?.[k]
    if (v !== null && v !== undefined && String(v).trim() !== '') return String(v).trim()
  }
  return ''
}

function formatShortDate(dateVal: any): string {
  if (!dateVal) return ''
  const d = new Date(dateVal)
  if (isNaN(d.getTime())) return String(dateVal)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function isOverdue(dateVal: any): boolean {
  if (!dateVal) return false
  const d = new Date(dateVal)
  if (isNaN(d.getTime())) return false
  return d.getTime() < Date.now()
}

function timeAgo(dateVal: any): string {
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
  return formatShortDate(dateVal)
}

type SubmissionStatus = 'submitted' | 'graded' | 'overdue' | 'pending'

function getSubmissionStatus(assignment: any, submission: any): SubmissionStatus {
  if (submission) {
    if (submission.feedback || submission.score !== null && submission.score !== undefined) return 'graded'
    return 'submitted'
  }
  if (isOverdue(assignment.due_date)) return 'overdue'
  return 'pending'
}

const STATUS_META: Record<SubmissionStatus, { label: string; color: string; bg: string; icon: any }> = {
  submitted: { label: 'Submitted', color: '#3b82f6', bg: '#eff6ff', icon: CheckCircle2 },
  graded: { label: 'Graded', color: '#10b981', bg: '#ecfdf5', icon: CheckCircle2 },
  overdue: { label: 'Overdue', color: '#ef4444', bg: '#fef2f2', icon: AlertCircle },
  pending: { label: 'Pending', color: '#f59e0b', bg: '#fffbeb', icon: Clock },
}

export default function StudentAssignmentsPage() {
  const { user } = useAuth() as { user: any }
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [assignments, setAssignments] = useState<any[]>([])
  const [submissions, setSubmissions] = useState<Record<string, any>>({})
  const [showModal, setShowModal] = useState(false)
  const [activeAssignment, setActiveAssignment] = useState<any>(null)
  const [submitText, setSubmitText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState('')
  const studentId = user?.id || user?.student_id || user?.studentId || ''
  const classId = user?.class_id || user?.classId || ''
  const schoolId = user?.school_id || user?.schoolId || ''

  const loadData = useCallback(async () => {
    if (!user) return
    setLoading(true); setError('')
    try {
      if (!classId) { setLoading(false); return }
      const { data: assignData, error: assignErr } = await dbProxy
        .from('assignments')
        .select('*')
        .eq('class_id', classId)
        .eq('is_published', true)
        .order('created_at', { ascending: false })
      if (assignErr) throw assignErr
      const assigns = assignData || []

      // Fetch subjects + classes + submissions in parallel (no FK joins)
      const subjectIds = Array.from(new Set(assigns.map((a: any) => a.subject_id).filter(Boolean))) as string[]
      const classIds = Array.from(new Set(assigns.map((a: any) => a.class_id).filter(Boolean))) as string[]
      const assignIds = assigns.map((a: any) => a.id).filter(Boolean)

      const [subRes, clsRes, smRes] = await Promise.all([
        subjectIds.length
          ? dbProxy.from('subjects').select('id, name, code').in('id', subjectIds)
          : Promise.resolve({ data: [], error: null }),
        classIds.length
          ? dbProxy.from('classes').select('id, name, section').in('id', classIds)
          : Promise.resolve({ data: [], error: null }),
        assignIds.length
          ? dbProxy.from('assignment_submissions').select('*').eq('student_id', studentId || user.id).in('assignment_id', assignIds)
          : Promise.resolve({ data: [], error: null }),
      ])

      const subjectMap: Record<string, any> = {}
      ;(subRes.data || []).forEach((s: any) => { subjectMap[s.id] = s })
      const classMap: Record<string, any> = {}
      ;(clsRes.data || []).forEach((c: any) => { classMap[c.id] = c })
      const subMap: Record<string, any> = {}
      ;(smRes.data || []).forEach((s: any) => {
        const aid = s.assignment_id
        if (aid) subMap[aid] = s
      })

      // Stitch relationships client-side
      const enriched = assigns.map((a: any) => ({
        ...a,
        subjects: a.subject_id ? subjectMap[a.subject_id] : null,
        classes: a.class_id ? classMap[a.class_id] : null,
      }))

      setAssignments(enriched)
      setSubmissions(subMap)
    } catch (e: any) {
      console.error('Assignments load error:', e)
      setError(e?.message || 'Failed to load assignments')
    } finally { setLoading(false) }
  }, [user, classId, studentId])

  useEffect(() => { loadData() }, [loadData])

  const openSubmitModal = (a: any) => {
    setActiveAssignment(a); setSubmitText(''); setSubmitError(''); setSubmitSuccess(''); setShowModal(true)
  }

  const closeModal = () => {
    if (submitting) return
    setShowModal(false); setActiveAssignment(null); setSubmitText(''); setSubmitError(''); setSubmitSuccess('')
  }

  const handleSubmit = async () => {
    if (!activeAssignment) return
    setSubmitError(''); setSubmitSuccess('')
    if (submitText.trim().length < 3) { setSubmitError('Please write your answer (at least 3 characters)'); return }
    setSubmitting(true)
    try {
      const payload = {
        school_id: schoolId,
        assignment_id: activeAssignment.id,
        student_id: studentId || user.id,
        submission_text: submitText.trim(),
        submitted_at: new Date().toISOString(),
      }
      const { data, error: insErr } = await dbProxy.from('assignment_submissions').insert(payload).select().single()
      if (insErr) throw insErr
      setSubmissions((prev) => ({ ...prev, [activeAssignment.id]: data }))
      setSubmitSuccess('Submitted successfully')
      setTimeout(() => { closeModal() }, 1000)
    } catch (e: any) {
      console.error('Submit error:', e)
      setSubmitError(e?.message || 'Failed to submit assignment')
    } finally { setSubmitting(false) }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-slate-600">
          <div className="w-14 h-14 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin shadow-lg shadow-emerald-500/20" />
          <span className="text-sm font-semibold text-slate-700">Loading assignments...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="px-3 sm:px-4 lg:px-6 py-4 sm:py-6 max-w-4xl mx-auto space-y-5 bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 min-h-screen">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Assignments</h1>
          <p className="mt-0.5 text-sm text-slate-500">{assignments.length} assignment{assignments.length !== 1 ? 's' : ''} posted</p>
        </div>
        <button onClick={loadData} disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 transition text-slate-700 font-semibold text-sm shadow-sm">
          <RefreshCw size={14} strokeWidth={2.2} className={loading ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-800">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <div className="font-semibold">Couldn't load assignments</div>
            <div className="text-red-700/90 text-xs mt-0.5">{error}</div>
          </div>
        </div>
      )}

      {assignments.length === 0 && !error && (
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg shadow-slate-200/40 border border-slate-200/60 p-10 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-4">
            <Inbox size={32} strokeWidth={2} />
          </div>
          <h3 className="text-base font-bold text-slate-900">No assignments yet</h3>
          <p className="mt-1 text-sm text-slate-500 max-w-xs">Your teachers haven't posted any assignments for your class yet. Check back later.</p>
        </div>
      )}

      {assignments.length > 0 && (
        <div className="space-y-3">
          {assignments.map((a, i) => {
            const subj = a.subjects || {}
            const cls = a.classes || {}
            const subjectName = subj.name || subj.code || 'Subject'
            const className = cls.name ? (cls.section ? `${cls.name} ${cls.section}` : cls.name) : ''
            const submission = submissions[a.id]
            const status = getSubmissionStatus(a, submission)
            const meta = STATUS_META[status]
            const Icon = meta.icon
            const overdue = isOverdue(a.due_date) && !submission
            const description = pickString(a, 'description', 'instructions', 'body', 'content', 'question')
            const title = pickString(a, 'title', 'name') || 'Untitled Assignment'
            return (
              <article key={i} className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg shadow-slate-200/40 border border-slate-200/60 overflow-hidden">
                <div className="flex items-start gap-3 px-4 sm:px-5 py-4 border-b border-slate-100">
                  <div className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: meta.bg, color: meta.color }}>
                    <Icon size={18} strokeWidth={2.2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-slate-900 tracking-tight break-words">{title}</h3>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider"
                        style={{ backgroundColor: meta.bg, color: meta.color }}>{meta.label}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                        <BookOpen size={10} strokeWidth={2.2} />{subjectName}
                      </span>
                      {className && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                          <ClipboardList size={10} strokeWidth={2.2} />{className}
                        </span>
                      )}
                      <span>•</span>
                      <span>{timeAgo(a.created_at)}</span>
                    </div>
                  </div>
                </div>

                {description && (
                  <div className="px-4 sm:px-5 py-4">
                    <div className="flex items-start gap-2.5">
                      <FileText size={14} className="flex-shrink-0 mt-0.5 text-slate-500" strokeWidth={2.2} />
                      <p className="text-sm text-slate-700 whitespace-pre-wrap break-words leading-relaxed flex-1">{description}</p>
                    </div>
                  </div>
                )}

                {a.due_date && (
                  <div className="px-4 sm:px-5 py-2 bg-slate-50/60 border-t border-slate-100 flex items-center gap-2 text-xs">
                    <Calendar size={12} className={overdue ? 'text-red-600' : 'text-slate-500'} strokeWidth={2.2} />
                    <span className={overdue ? 'text-red-600 font-semibold' : 'text-slate-600'}>
                      {overdue ? 'Overdue — was due ' : 'Due '}{formatShortDate(a.due_date)}
                    </span>
                  </div>
                )}

                {submission && (submission.feedback || (submission.score !== null && submission.score !== undefined)) && (
                  <div className="px-4 sm:px-5 py-4 bg-emerald-50/60 border-t border-emerald-100">
                    <div className="flex items-start gap-2.5">
                      <MessageSquare size={14} className="flex-shrink-0 mt-0.5 text-emerald-700" strokeWidth={2.2} />
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] uppercase tracking-wider font-bold text-emerald-800 mb-1">Teacher Feedback</div>
                        {submission.score !== null && submission.score !== undefined && (
                          <div className="text-sm font-bold text-emerald-900 mb-1">Score: {submission.score}{a.max_score ? ` / ${a.max_score}` : ''}</div>
                        )}
                        {submission.feedback && (
                          <p className="text-sm text-emerald-900 whitespace-pre-wrap break-words leading-relaxed">{submission.feedback}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {submission && !submission.feedback && (submission.score === null || submission.score === undefined) && submission.submission_text && (
                  <div className="px-4 sm:px-5 py-4 bg-blue-50/60 border-t border-blue-100">
                    <div className="flex items-start gap-2.5">
                      <User size={14} className="flex-shrink-0 mt-0.5 text-blue-700" strokeWidth={2.2} />
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] uppercase tracking-wider font-bold text-blue-800 mb-1">Your Submission</div>
                        <p className="text-sm text-blue-900 whitespace-pre-wrap break-words leading-relaxed">{submission.submission_text}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="px-4 sm:px-5 py-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  {submission ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                      <CheckCircle2 size={13} strokeWidth={2.4} />
                      {status === 'graded' ? 'Graded' : 'Submitted'}
                    </span>
                  ) : overdue ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600">
                      <AlertCircle size={13} strokeWidth={2.4} />Submission closed
                    </span>
                  ) : (
                    <button onClick={() => openSubmitModal(a)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition">
                      <Send size={12} strokeWidth={2.4} />Submit
                    </button>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}

      {showModal && activeAssignment && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4" onClick={closeModal}>
          <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
                  <Send size={18} strokeWidth={2.2} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-slate-900 truncate">Submit Assignment</h3>
                  <p className="text-[11px] text-slate-500 truncate">
                    {activeAssignment.subjects?.name || 'Subject'}
                    {activeAssignment.due_date && ` • Due ${formatShortDate(activeAssignment.due_date)}`}
                  </p>
                </div>
              </div>
              <button onClick={closeModal} disabled={submitting} className="p-1.5 rounded-md text-slate-500 hover:bg-slate-200 disabled:opacity-50">
                <X size={18} />
              </button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div className="px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-[11px] uppercase tracking-wider font-bold text-slate-500 mb-0.5">Assignment</div>
                <div className="text-sm font-bold text-slate-900">{pickString(activeAssignment, 'title', 'name') || 'Untitled'}</div>
                {pickString(activeAssignment, 'description', 'instructions', 'body', 'content', 'question') && (
                  <p className="mt-1 text-xs text-slate-600 line-clamp-3">
                    {pickString(activeAssignment, 'description', 'instructions', 'body', 'content', 'question')}
                  </p>
                )}
              </div>
              {submitError && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" /><span>{submitError}</span>
                </div>
              )}
              {submitSuccess && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
                  <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5" /><span>{submitSuccess}</span>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Your Answer <span className="text-red-500">*</span>
                </label>
                <textarea value={submitText} onChange={(e) => setSubmitText(e.target.value)} disabled={submitting} rows={6} placeholder="Type your answer here..."
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none text-slate-900 resize-none disabled:bg-slate-50" />
                <div className="mt-1 text-[10px] text-slate-400 text-right">{submitText.length} characters</div>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 flex gap-3">
              <button onClick={closeModal} disabled={submitting}
                className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-semibold text-sm hover:bg-slate-50 disabled:opacity-50">Cancel</button>
              <button onClick={handleSubmit} disabled={submitting || submitText.trim().length < 3}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                {submitting ? (<><Loader2 size={15} className="animate-spin" />Submitting…</>) : (<><Send size={15} />Submit</>)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
