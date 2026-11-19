import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  CheckCircle,
  CheckCircle2,
  ClipboardList,
  Eye,
  FileText,
  Inbox,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { dbProxy } from '../../lib/dbProxy'

type AssignmentKind = 'essay' | 'short_answer' | 'file_link' | 'practical'

interface Assignment {
  id: string
  school_id: string
  teacher_id?: string | null
  class_id: string
  subject_id: string
  title: string
  description?: string | null
  total_marks: number
  due_date?: string | null
  is_published: boolean
  created_at: string
}

interface StudentLite {
  id: string
  first_name: string
  last_name: string
  admission_no?: string | null
}

interface Submission {
  id: string
  student_id: string
  submission_text?: string | null
  score: number | null
  feedback: string | null
  submitted_at: string
}

function encodeMeta(kind: AssignmentKind, wordTarget: string, body: string): string {
  const cleanBody = body.trim()
  const wt = Number(wordTarget)
  const meta = { kind, wordTarget: wt > 0 ? wt : null }
  return `[META:${JSON.stringify(meta)}]\n${cleanBody}`
}

function decodeMeta(desc: string | null | undefined): {
  kind: AssignmentKind
  wordTarget: number | null
  body: string
} {
  const raw = String(desc || '')
  const m = raw.match(/^\[META:(\{.*?\})\]\s*\n?([\s\S]*)$/)
  if (!m) return { kind: 'essay', wordTarget: null, body: raw }
  try {
    const parsed = JSON.parse(m[1])
    const k = (['essay', 'short_answer', 'file_link', 'practical'].includes(parsed.kind)
      ? parsed.kind
      : 'essay') as AssignmentKind
    return {
      kind: k,
      wordTarget: parsed.wordTarget ? Number(parsed.wordTarget) : null,
      body: m[2] || '',
    }
  } catch {
    return { kind: 'essay', wordTarget: null, body: raw }
  }
}

function countWords(text: string | null | undefined): number {
  const t = String(text || '').trim()
  return t ? t.split(/\s+/).length : 0
}

function studentName(s: StudentLite): string {
  return [s.first_name, s.last_name].filter(Boolean).join(' ') || 'Student'
}

export default function AdminAssignmentsPage() {
  const { user } = useAuth() as { user: any }
  const schoolId = user?.school_id || user?.schoolId || ''

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [syncingScores, setSyncingScores] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [subjects, setSubjects] = useState<any[]>([])

  const [showModal, setShowModal] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [viewSubmissions, setViewSubmissions] = useState<Assignment | null>(null)

  const [assignmentKind, setAssignmentKind] = useState<AssignmentKind>('essay')
  const [wordTarget, setWordTarget] = useState('300')
  const [form, setForm] = useState({
    title: '',
    description: '',
    class_id: '',
    subject_id: '',
    total_marks: 20,
    due_date: '',
  })

  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [submissionStudents, setSubmissionStudents] = useState<StudentLite[]>([])
  const [gradingId, setGradingId] = useState<string | null>(null)
  const [gradeScore, setGradeScore] = useState('')
  const [gradeFeedback, setGradeFeedback] = useState('')

  const loadData = useCallback(async () => {
    if (!schoolId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const [aRes, cRes, sRes] = await Promise.all([
        dbProxy
          .from('assignments')
          .select('*')
          .eq('school_id', schoolId)
          .order('created_at', { ascending: false }),
        dbProxy
          .from('classes')
          .select('id, name, section')
          .eq('school_id', schoolId)
          .order('name'),
        dbProxy
          .from('subjects')
          .select('id, name, code')
          .eq('school_id', schoolId)
          .order('name'),
      ])
      if (aRes.error) throw aRes.error
      setAssignments((aRes.data || []) as Assignment[])
      setClasses(cRes.data || [])
      setSubjects(sRes.data || [])
    } catch (e: any) {
      setError(e?.message || 'Failed to load assignments')
    } finally {
      setLoading(false)
    }
  }, [schoolId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const classMap = useMemo(() => {
    const m: Record<string, any> = {}
    classes.forEach((c) => {
      m[c.id] = c
    })
    return m
  }, [classes])

  const subjectMap = useMemo(() => {
    const m: Record<string, any> = {}
    subjects.forEach((s) => {
      m[s.id] = s
    })
    return m
  }, [subjects])

  const studentMap = useMemo(() => {
    const m: Record<string, StudentLite> = {}
    submissionStudents.forEach((s) => {
      m[s.id] = s
    })
    return m
  }, [submissionStudents])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!schoolId || !form.title.trim() || !form.class_id || !form.subject_id) {
      setError('Title, class, and subject are required')
      return
    }
    setSaving(true)
    setError('')
    setSuccessMsg('')
    try {
      const payload = {
        school_id: schoolId,
        teacher_id: user?.id || null,
        title: form.title.trim(),
        description: encodeMeta(assignmentKind, wordTarget, form.description),
        class_id: form.class_id,
        subject_id: form.subject_id,
        total_marks: Number(form.total_marks) || 20,
        due_date: form.due_date || null,
        is_published: true,
      }
      const { error: inErr } = await dbProxy.from('assignments').insert(payload)
      if (inErr) throw inErr
      setShowModal(false)
      setAssignmentKind('essay')
      setWordTarget('300')
      setForm({
        title: '',
        description: '',
        class_id: '',
        subject_id: '',
        total_marks: 20,
        due_date: '',
      })
      setSuccessMsg('Assignment created')
      await loadData()
    } catch (e: any) {
      setError(e?.message || 'Create failed')
    } finally {
      setSaving(false)
    }
  }

  const togglePublish = async (a: Assignment) => {
    setError('')
    try {
      const { error: upErr } = await dbProxy
        .from('assignments')
        .update({ is_published: !a.is_published })
        .eq('id', a.id)
      if (upErr) throw upErr
      setAssignments((prev) =>
        prev.map((x) => (x.id === a.id ? { ...x, is_published: !a.is_published } : x))
      )
      setSuccessMsg(a.is_published ? 'Unpublished' : 'Published')
    } catch (e: any) {
      setError(e?.message || 'Toggle failed')
    }
  }

  const handleDelete = async (id: string) => {
    setError('')
    try {
      const { error: delErr } = await dbProxy.from('assignments').delete().eq('id', id)
      if (delErr) throw delErr
      setAssignments((prev) => prev.filter((x) => x.id !== id))
      setDeleteConfirm(null)
      setSuccessMsg('Assignment deleted')
    } catch (e: any) {
      setError(e?.message || 'Delete failed')
    }
  }

  const openSubmissions = async (a: Assignment) => {
    setViewSubmissions(a)
    setGradingId(null)
    setError('')
    try {
      const [subRes, studRes] = await Promise.all([
        dbProxy
          .from('assignment_submissions')
          .select('*')
          .eq('assignment_id', a.id)
          .order('submitted_at', { ascending: false }),
        dbProxy
          .from('students')
          .select('id, first_name, last_name, admission_no')
          .eq('class_id', a.class_id)
          .order('first_name'),
      ])
      setSubmissions((subRes.data || []) as Submission[])
      setSubmissionStudents((studRes.data || []) as StudentLite[])
    } catch (e: any) {
      setError(e?.message || 'Failed to load submissions')
    }
  }

  const startGrading = (sub: Submission) => {
    setGradingId(sub.id)
    setGradeScore(sub.score != null ? String(sub.score) : '')
    setGradeFeedback(sub.feedback || '')
  }

  const saveGrade = async (subId: string) => {
    setSaving(true)
    setError('')
    try {
      const maxMarks = Number(viewSubmissions?.total_marks) || 100
      const rawNum = Number(gradeScore)
      if (Number.isNaN(rawNum) || rawNum < 0 || rawNum > maxMarks) {
        setError(`Score must be between 0 and ${maxMarks}`)
        setSaving(false)
        return
      }
      const cleanFeedback = gradeFeedback.trim() || null
      const { error: upErr } = await dbProxy
        .from('assignment_submissions')
        .update({ score: rawNum, feedback: cleanFeedback })
        .eq('id', subId)
      if (upErr) throw upErr
      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === subId ? { ...s, score: rawNum, feedback: cleanFeedback } : s
        )
      )
      setGradingId(null)
      setSuccessMsg('Grade saved')
    } catch (e: any) {
      setError(e?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const syncGradesToScorebook = async (assignment: Assignment) => {
    const gradedSubs = submissions.filter(
      (sub) => sub.score !== null && sub.score !== undefined
    )
    if (gradedSubs.length === 0) {
      setError('Grade at least one submission before syncing to scorebook')
      return
    }
    setSyncingScores(true)
    setError('')
    setSuccessMsg('')
    try {
      const [{ data: curSession }, { data: curTerm }] = await Promise.all([
        dbProxy
          .from('academic_sessions')
          .select('id')
          .eq('school_id', schoolId)
          .eq('is_current', true)
          .maybeSingle(),
        dbProxy
          .from('terms')
          .select('id')
          .eq('school_id', schoolId)
          .eq('is_current', true)
          .maybeSingle(),
      ])
      if (!curSession?.id || !curTerm?.id) {
        throw new Error('Active academic session or term not found')
      }
      const { data: existingScores, error: sErr } = await dbProxy
        .from('scores')
        .select('id, student_id, scores_json')
        .eq('class_id', assignment.class_id)
        .eq('subject_id', assignment.subject_id)
        .eq('session_id', curSession.id)
        .eq('term_id', curTerm.id)
      if (sErr) throw sErr

      const scoreMap: Record<string, any> = {}
      for (const row of existingScores || []) {
        scoreMap[row.student_id] = row
      }

      for (const sub of gradedSubs) {
        const val = Number(sub.score) || 0
        const existing = scoreMap[sub.student_id]
        const scoresJson: Record<string, any> = existing?.scores_json
          ? { ...existing.scores_json }
          : {}
        scoresJson['Assignment'] = val
        let total = 0
        for (const k of Object.keys(scoresJson)) {
          const v = scoresJson[k]
          total += typeof v === 'number' ? v : Number(v) || 0
        }
        if (existing?.id) {
          const { error: uErr } = await dbProxy
            .from('scores')
            .update({ scores_json: scoresJson, total })
            .eq('id', existing.id)
          if (uErr) throw uErr
        } else {
          const { error: iErr } = await dbProxy.from('scores').insert({
            school_id: schoolId,
            student_id: sub.student_id,
            class_id: assignment.class_id,
            subject_id: assignment.subject_id,
            session_id: curSession.id,
            term_id: curTerm.id,
            scores_json: scoresJson,
            total,
          })
          if (iErr) throw iErr
        }
      }
      setSuccessMsg(
        `Synced ${gradedSubs.length} graded submission(s) into student score records (Assignment)`
      )
    } catch (e: any) {
      setError(e?.message || 'Failed to sync scores')
    } finally {
      setSyncingScores(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="px-3 sm:px-4 lg:px-6 py-4 sm:py-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold uppercase tracking-wider mb-1.5">
            Admin · Assessments
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Assignments & Essays
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {assignments.length} assignment{assignments.length !== 1 ? 's' : ''} across school
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50"
          >
            <RefreshCw size={14} /> Refresh
          </button>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold shadow-sm"
          >
            <Plus size={15} /> New Assignment
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm">
          <AlertCircle size={18} /> <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
          <CheckCircle size={18} /> <span>{successMsg}</span>
        </div>
      )}

      {assignments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <ClipboardList className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900">No assignments yet</h3>
          <p className="text-sm text-slate-500 mt-1">
            Create an essay, short-answer, file/link, or practical assignment.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {assignments.map((a) => {
            const meta = decodeMeta(a.description)
            const cls = classMap[a.class_id]
            const subj = subjectMap[a.subject_id]
            return (
              <div
                key={a.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-50 text-rose-700 border border-rose-200">
                        {meta.kind.replace('_', ' ')}
                      </span>
                      {meta.wordTarget && (
                        <span className="text-[11px] text-slate-500">
                          ~{meta.wordTarget} words
                        </span>
                      )}
                      <span className="text-xs font-semibold text-slate-600">
                        {subj?.name || 'Subject'} · {cls?.name || 'Class'}
                        {cls?.section ? ` ${cls.section}` : ''}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900">{a.title}</h3>
                    {meta.body && (
                      <p className="text-xs text-slate-600 mt-1 whitespace-pre-line">
                        {meta.body}
                      </p>
                    )}
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    <div className="font-bold text-slate-800">{a.total_marks} marks</div>
                    <div>{a.is_published ? 'Published' : 'Draft'}</div>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => openSubmissions(a)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold border border-rose-200"
                  >
                    <Eye size={13} /> Grade & Sync
                  </button>
                  <button
                    type="button"
                    onClick={() => togglePublish(a)}
                    className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200"
                  >
                    {a.is_published ? 'Unpublish' : 'Publish'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirm(a.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold border border-red-200"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowModal(false)}
        >
          <form
            onSubmit={handleCreate}
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Create Assignment</h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-3.5 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g., Essay: Role of Civic Education in Society"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Class *
                  </label>
                  <select
                    required
                    value={form.class_id}
                    onChange={(e) => setForm({ ...form, class_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
                  >
                    <option value="">Select class</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.section || ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Subject *
                  </label>
                  <select
                    required
                    value={form.subject_id}
                    onChange={(e) => setForm({ ...form, subject_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
                  >
                    <option value="">Select subject</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Assignment Kind
                  </label>
                  <select
                    value={assignmentKind}
                    onChange={(e) => setAssignmentKind(e.target.value as AssignmentKind)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
                  >
                    <option value="essay">Essay Writing</option>
                    <option value="short_answer">Short Answer</option>
                    <option value="file_link">File / Link Submission</option>
                    <option value="practical">Practical / Project</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Target Words (Optional)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={wordTarget}
                    onChange={(e) => setWordTarget(e.target.value)}
                    placeholder="e.g., 300"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Total Marks
                  </label>
                  <input
                    type="number"
                    value={form.total_marks}
                    onChange={(e) =>
                      setForm({ ...form, total_marks: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={form.due_date}
                    onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Prompt / Instructions & Rubric
                </label>
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Enter essay question, key points to cover, or grading rubric..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                />
              </div>
            </div>
            <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Create Assignment'}
              </button>
            </div>
          </form>
        </div>
      )}

      {viewSubmissions && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => {
            setViewSubmissions(null)
            setGradingId(null)
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Submissions — {viewSubmissions.title}
                </h3>
                <div className="flex items-center gap-2 flex-wrap mt-1">
                  <span className="text-xs text-slate-500">
                    {submissions.length} submitted ·{' '}
                    {Math.max(0, submissionStudents.length - submissions.length)} pending
                  </span>
                  <button
                    type="button"
                    onClick={() => syncGradesToScorebook(viewSubmissions)}
                    disabled={syncingScores}
                    className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold disabled:opacity-50"
                  >
                    {syncingScores ? 'Syncing...' : 'Sync Grades to Scorebook'}
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setViewSubmissions(null)
                  setGradingId(null)
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {submissions.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-500">
                  <Inbox className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  No submissions yet.
                </div>
              ) : (
                submissions.map((sub) => {
                  const st = studentMap[sub.student_id]
                  const isGraded = sub.score !== null && sub.score !== undefined
                  const isEditing = gradingId === sub.id
                  return (
                    <div
                      key={sub.id}
                      className="p-4 rounded-xl border border-slate-200 bg-white space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="text-sm font-bold text-slate-900">
                            {st ? studentName(st) : 'Student'}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {st?.admission_no || '-'} · {countWords(sub.submission_text)}{' '}
                            words
                          </div>
                        </div>
                        {isGraded && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 text-xs font-bold">
                            <CheckCircle2 size={12} /> {sub.score}/
                            {viewSubmissions.total_marks}
                          </span>
                        )}
                      </div>
                      <div className="p-3 rounded-lg bg-slate-50 text-xs text-slate-700 whitespace-pre-wrap">
                        {sub.submission_text || '(empty)'}
                      </div>
                      {sub.feedback && !isEditing && (
                        <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-lg p-2">
                          <strong>Feedback:</strong> {sub.feedback}
                        </div>
                      )}
                      {isEditing ? (
                        <div className="space-y-2 pt-1">
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="number"
                              value={gradeScore}
                              onChange={(e) => setGradeScore(e.target.value)}
                              placeholder={`Score (/${viewSubmissions.total_marks})`}
                              className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
                            />
                            <input
                              type="text"
                              value={gradeFeedback}
                              onChange={(e) => setGradeFeedback(e.target.value)}
                              placeholder="Feedback / rubric note"
                              className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setGradingId(null)}
                              className="flex-1 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => saveGrade(sub.id)}
                              disabled={saving}
                              className="flex-1 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold"
                            >
                              {saving ? 'Saving...' : 'Save Grade'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startGrading(sub)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold border border-rose-200"
                        >
                          <FileText size={12} /> {isGraded ? 'Edit Grade' : 'Grade Essay / Work'}
                        </button>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-slate-900">Delete Assignment?</h3>
            <p className="text-xs text-slate-600">
              This removes the assignment and its student submissions.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2 rounded-lg border border-slate-200 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 py-2 rounded-lg bg-red-600 text-white text-xs font-bold"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
