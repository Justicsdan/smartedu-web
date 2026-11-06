import { useState, useEffect, useMemo } from "react"
import { dbProxy } from '../../lib/dbProxy'
import { useAuth } from '../../contexts/AuthContext'
import {
  Plus, Edit3, Trash2, Eye, EyeOff, RefreshCw, Save, X, ChevronDown,
  ChevronUp, Loader2, AlertCircle, CheckCircle, FileText, Clock,
  Users, Award, RotateCcw, Play, Settings2, ListChecks,
} from 'lucide-react'

interface Exam {
  id: string
  title: string
  subject_id: string
  class_id: string
  duration_minutes: number
  total_questions: number
  pass_mark: number
  is_active: boolean
  start_time: string | null
  end_time: string | null
  instructions: string
  shuffle_questions: boolean
  show_result_immediately: boolean
  allow_retake: boolean
  max_attempts: number
  is_proctored: boolean
  created_by: string | null
  subjects?: { name: string; code: string | null }
  classes?: { name: string; section: string | null }
}

interface Question {
  id: string
  exam_id: string
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_option: string
  explanation: string | null
  marks: number
  question_order: number
  image_url: string | null
  time_allocation: number
}

interface AttemptRow {
  id: string
  student_id: string
  attempt_number: number
  score: number
  total_marks: number
  is_submitted: boolean
  time_started: string
  time_submitted: string | null
  students?: { first_name: string; last_name: string; admission_no: string | null }
}

const TIME_OPTIONS = [
  { value: 0, label: 'Not set' },
  { value: 15, label: '15 seconds' },
  { value: 30, label: '30 seconds' },
  { value: 45, label: '45 seconds' },
  { value: 60, label: '1 minute' },
  { value: 90, label: '1 min 30 sec' },
  { value: 120, label: '2 minutes' },
  { value: 180, label: '3 minutes' },
  { value: 300, label: '5 minutes' },
]

function formatTimeAllocation(seconds: number | null): string {
  if (!seconds || seconds === 0) return ''
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (secs === 0) return `${mins}min`
  return `${mins}m ${secs}s`
}

function formatDateTime(iso: string | null): string {
  if (!iso) return 'Not set'
  const d = new Date(iso)
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

interface ExamForm {
  title: string
  subject_id: string
  class_id: string
  duration_minutes: number
  total_questions: number
  pass_mark: number
  is_active: boolean
  start_time: string
  end_time: string
  instructions: string
  shuffle_questions: boolean
  show_result_immediately: boolean
  allow_retake: boolean
  max_attempts: number
  is_proctored: boolean
}

const EMPTY_FORM: ExamForm = {
  title: '', subject_id: '', class_id: '', duration_minutes: 60,
  total_questions: 50, pass_mark: 40, is_active: false,
  start_time: '', end_time: '', instructions: '',
  shuffle_questions: false, show_result_immediately: true,
  allow_retake: false, max_attempts: 1, is_proctored: false,
}


// =========================================================
// Parse pasted questions (port of Flutter _parsePastedQuestions)
// Format: Question text?\nA. opt1\nB. opt2\nC. opt3\nD. opt4\nAns: B
// Separate questions with blank lines
// =========================================================
function parsePastedQuestions(text: string): Array<Record<string, any>> {
  const results: Array<Record<string, any>> = []
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = normalized.split('\n').filter(l => l.trim() !== '')
  let questionText: string | null = null
  let optA: string | null = null
  let optB: string | null = null
  let optC: string | null = null
  let optD: string | null = null
  let correctOption = 'a'

  const saveCurrent = () => {
    if (questionText && questionText.length > 0) {
      results.push({
        question_text: questionText,
        option_a: optA || '',
        option_b: optB || '',
        option_c: optC || '',
        option_d: optD || '',
        correct_option: correctOption,
        marks: 0,
        time_allocation: 0,
      })
    }
    questionText = null
    optA = optB = optC = optD = null
    correctOption = 'a'
  }

  for (const rawLine of lines) {
    const trimmed = rawLine.trim()
    const upper = trimmed.toUpperCase()
    if (upper.startsWith('A.') || upper.startsWith('A)')) { optA = trimmed.substring(2).trim(); continue }
    if (upper.startsWith('B.') || upper.startsWith('B)')) { optB = trimmed.substring(2).trim(); continue }
    if (upper.startsWith('C.') || upper.startsWith('C)')) { optC = trimmed.substring(2).trim(); continue }
    if (upper.startsWith('D.') || upper.startsWith('D)')) { optD = trimmed.substring(2).trim(); continue }
    if (upper.startsWith('ANS')) {
      const ansPart = trimmed.replace(/^ans(wer)?\s*:?\s*/i, '')
      if (ansPart.length > 0) {
        const ch = ansPart[0].toUpperCase()
        if (ch === 'A' || ch === 'B' || ch === 'C' || ch === 'D') {
          correctOption = ch.toLowerCase()
        }
      }
      saveCurrent()
      continue
    }
    let qPart = trimmed
    if (qPart.length > 0 && qPart.charCodeAt(0) >= 48 && qPart.charCodeAt(0) <= 57) {
      qPart = qPart.replace(/^\d+[.)\s]+/, '')
    }
    if (questionText === null) { questionText = qPart } else { questionText = questionText + ' ' + qPart }
  }
  saveCurrent()
  return results
}

export default function CbtPage() {
  const { user } = useAuth()
  const schoolId = user?.id || ''

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const [exams, setExams] = useState<Exam[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [subjects, setSubjects] = useState<any[]>([])
  const [attemptCounts, setAttemptCounts] = useState<Record<string, number>>({})

  const [expandedExamId, setExpandedExamId] = useState<string | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [loadingQuestions, setLoadingQuestions] = useState(false)
  const [showAddQuestion, setShowAddQuestion] = useState(false)
  const [attempts, setAttempts] = useState<AttemptRow[]>([])
  const [showAttempts, setShowAttempts] = useState(false)
  const [studentMap, setStudentMap] = useState<Record<string, { first_name: string; last_name: string; admission_no: string | null }>>({})
  const [attemptFilter, setAttemptFilter] = useState<'all' | 'submitted' | 'in_progress'>('all')
  const [attemptSearch, setAttemptSearch] = useState('')
  const [attemptSort, setAttemptSort] = useState<'recent' | 'highest' | 'lowest' | 'name'>('recent')
  const [detailAttempt, setDetailAttempt] = useState<AttemptRow | null>(null)
  const [detailQuestions, setDetailQuestions] = useState<Question[]>([])
  const [detailAnswers, setDetailAnswers] = useState<Record<string, string>>({})
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [resetOneConfirm, setResetOneConfirm] = useState<string | null>(null)
  const [deleteOneConfirm, setDeleteOneConfirm] = useState<string | null>(null)
  const [retakeOneConfirm, setRetakeOneConfirm] = useState<string | null>(null)
  const [exportingId, setExportingId] = useState<string | null>(null)

  const [showExamModal, setShowExamModal] = useState(false)
  const [editingExamId, setEditingExamId] = useState<string | null>(null)
  const [form, setForm] = useState<ExamForm>(EMPTY_FORM)

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [resetConfirm, setResetConfirm] = useState<string | null>(null)
  const [showBulkImport, setShowBulkImport] = useState(false)
  const [showSync, setShowSync] = useState(false)

  // LOAD: exams + classes + subjects + attempt counts
  useEffect(() => {
    if (!schoolId) return
    ;(async () => {
      setLoading(true)
      try {
        const [exRes, cRes, subRes] = await Promise.all([
          dbProxy.from('cbt_exams')
            .select('*')
            .eq('school_id', schoolId)
            .order('created_at', { ascending: false }),
          dbProxy.from('classes').select('id, name, tier').eq('school_id', schoolId).order('name'),
          dbProxy.from('subjects').select('id, name, code').eq('school_id', schoolId).order('name'),
        ])
        setExams((exRes.data || []) as Exam[])
        setClasses(cRes.data || [])
        setSubjects(subRes.data || [])

        // Load attempt counts
        if ((exRes.data || []).length > 0) {
          const examIds = (exRes.data || []).map(e => e.id)
          const { data: attRows } = await dbProxy
            .from('cbt_attempts')
            .select('exam_id')
            .in('exam_id', examIds)
          const counts: Record<string, number> = {}
          for (const r of (attRows || [])) {
            const id = r.exam_id as string
            counts[id] = (counts[id] || 0) + 1
          }
          setAttemptCounts(counts)
        }
      } catch (e: any) {
        setError(e.message || 'Failed to load')
      } finally {
        setLoading(false)
      }
    })()
  }, [schoolId])

  const [classSubjects, setClassSubjects] = useState<any[]>([])

  // Load class_subjects to know which subjects belong to which class
  useEffect(() => {
    if (!schoolId) return
    dbProxy.from('class_subjects').select('class_id, subject_id').eq('school_id', schoolId)
      .then(({ data }: any) => setClassSubjects(data || []))
  }, [schoolId])

  const subjectsForClass = useMemo(() => {
    if (!form.class_id) return subjects
    const linkedIds = new Set(classSubjects.filter(cs => cs.class_id === form.class_id).map(cs => cs.subject_id))
    const filtered = subjects.filter(s => linkedIds.has(s.id))
    // Only fallback to all if class_subjects haven't loaded yet OR truly none linked
    if (classSubjects.length === 0) return subjects // still loading
    return filtered // even if empty, show empty (don't fallback to all)
  }, [subjects, classSubjects, form.class_id])

  const loadQuestions = async (examId: string) => {
    setLoadingQuestions(true)
    try {
      const { data, error } = await dbProxy
        .from('cbt_questions')
        .select('*')
        .eq('exam_id', examId)
        .order('question_order', { ascending: true })
      if (error) throw error
      setQuestions((data || []) as Question[])
    } catch (e: any) {
      setError(e.message || 'Failed to load questions')
      setQuestions([])
    } finally {
      setLoadingQuestions(false)
    }
  }

  const loadAttempts = async (examId: string) => {
    try {
      const { data, error } = await dbProxy
        .from('cbt_attempts')
        .select('*')
        .eq('exam_id', examId)
        .order('time_started', { ascending: false })
      if (error) throw error
      const rows = (data || []) as AttemptRow[]
      setAttempts(rows)
      const studentIds = Array.from(new Set(rows.map(r => r.student_id).filter(Boolean)))
      if (studentIds.length > 0) {
        try {
          const { data: stuRows } = await dbProxy
            .from('students')
            .select('id, first_name, last_name, admission_no')
            .in('id', studentIds)
          const map: Record<string, { first_name: string; last_name: string; admission_no: string | null }> = {}
          for (const s of (stuRows || [])) {
            map[s.id] = { first_name: s.first_name || '', last_name: s.last_name || '', admission_no: s.admission_no || null }
          }
          setStudentMap(map)
        } catch {
          setStudentMap({})
        }
      } else {
        setStudentMap({})
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load attempts')
      setAttempts([])
      setStudentMap({})
    }
  }

  const resetOneAttempt = async (attemptId: string, examId: string) => {
    try {
      const { error } = await dbProxy.from('cbt_attempts').delete().eq('id', attemptId)
      if (error) throw error
      setAttempts(prev => prev.filter(a => a.id !== attemptId))
      setResetOneConfirm(null)
      setSuccessMsg('Student attempt reset - they can retake the exam')
      setAttemptCounts(prev => ({ ...prev, [examId]: Math.max(0, (prev[examId] || 1) - 1) }))
    } catch (e: any) {
      setError(e.message || 'Reset failed')
    }
  }

  const deleteOneAttempt = async (attemptId: string) => {
    try {
      const { error } = await dbProxy.from('cbt_attempts').delete().eq('id', attemptId)
      if (error) throw error
      setAttempts(prev => prev.filter(a => a.id !== attemptId))
      setDeleteOneConfirm(null)
      setSuccessMsg('Attempt deleted')
    } catch (e: any) {
      setError(e.message || 'Delete failed')
    }
  }

  const allowRetake = async (attempt: AttemptRow, examId: string) => {
    try {
      const { error } = await dbProxy.from('cbt_attempts')
        .update({ is_submitted: false, time_submitted: null, score: 0 })
        .eq('id', attempt.id)
      if (error) throw error
      setAttempts(prev => prev.map(a => a.id === attempt.id ? { ...a, is_submitted: false, time_submitted: null, score: 0 } : a))
      setRetakeOneConfirm(null)
      setSuccessMsg('Student can now retake the exam')
    } catch (e: any) {
      setError(e.message || 'Retake setup failed')
    }
  }

  const viewAttemptDetail = async (attempt: AttemptRow, examId: string) => {
    setDetailAttempt(attempt)
    setLoadingDetail(true)
    try {
      const { data: qs } = await dbProxy.from('cbt_questions')
        .select('*').eq('exam_id', examId).order('question_order', { ascending: true })
      setDetailQuestions((qs || []) as Question[])
      const { data: ans } = await dbProxy.from('cbt_answers')
        .select('question_id, selected_option')
        .eq('attempt_id', attempt.id)
      const amap: Record<string, string> = {}
      for (const r of (ans || [])) {
        amap[r.question_id] = r.selected_option
      }
      setDetailAnswers(amap)
    } catch (e: any) {
      setError(e.message || 'Failed to load detail')
    } finally {
      setLoadingDetail(false)
    }
  }

  const exportAttemptPdf = (attempt: AttemptRow) => {
    const stu = studentMap[attempt.student_id]
    const name = stu ? (stu.first_name + ' ' + stu.last_name).trim() : 'Unknown student'
    const admission = (stu && stu.admission_no) || '-'
    const exam = exams.find(e => e.id === attempt.exam_id)
    const win = window.open('', '_blank')
    if (!win) { setError('Pop-up blocked. Allow pop-ups to export PDF.'); return }
    const html = '<!html><head><title>' + name + ' - CBT Result</title><style>body{font-family:Arial,sans-serif;padding:40px;color:#1e293b}h1{color:#0e7490;border-bottom:2px solid #0e7490;padding-bottom:8px}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{padding:8px 12px;border:1px solid #e2e8f0;text-align:left;font-size:13px}th{background:#f1f5f9}.pass{color:#16a34a;font-weight:bold}.fail{color:#dc2626;font-weight:bold}@media print{body{padding:20px}}</style></head><body><h1>CBT Result - ' + (exam ? exam.title : 'Exam') + '</h1><table><tr><th>Student</th><td>' + name + '</td></tr><tr><th>Admission No</th><td>' + admission + '</td></tr><tr><th>Attempt</th><td>#' + attempt.attempt_number + '</td></tr><tr><th>Score</th><td><b>' + attempt.score + ' / ' + attempt.total_marks + '</b></td></tr><tr><th>Percentage</th><td>' + (attempt.total_marks > 0 ? Math.round((attempt.score / attempt.total_marks) * 100) : 0) + '%</td></tr><tr><th>Status</th><td class="' + (attempt.is_submitted ? 'pass' : 'fail') + '">' + (attempt.is_submitted ? 'Submitted' : 'In Progress') + '</td></tr><tr><th>Started</th><td>' + (attempt.time_started ? new Date(attempt.time_started).toLocaleString() : '-') + '</td></tr><tr><th>Submitted</th><td>' + (attempt.time_submitted ? new Date(attempt.time_submitted).toLocaleString() : '-') + '</td></tr></table><p style="margin-top:24px;font-size:11px;color:#64748b">Generated by SmartEdu on ' + new Date().toLocaleString() + '</p></body></html>'
    win.document.write(html)
    win.document.close()
    setTimeout(() => { win.print() }, 300)
  }

  const toggleExpand = (examId: string) => {
    if (expandedExamId === examId) {
      setExpandedExamId(null)
      setQuestions([])
      setShowAttempts(false)
    } else {
      setExpandedExamId(examId)
      setShowAttempts(false)
      loadQuestions(examId)
    }
  }

  const openCreateModal = () => {
    setForm(EMPTY_FORM)
    setEditingExamId(null)
    setShowExamModal(true)
    setError('')
  }

  const openEditModal = (exam: Exam) => {
    setForm({
      title: exam.title,
      subject_id: exam.subject_id,
      class_id: exam.class_id,
      duration_minutes: exam.duration_minutes,
      total_questions: exam.total_questions,
      pass_mark: exam.pass_mark,
      is_active: exam.is_active,
      start_time: exam.start_time ? new Date(exam.start_time).toISOString().slice(0, 16) : '',
      end_time: exam.end_time ? new Date(exam.end_time).toISOString().slice(0, 16) : '',
      instructions: exam.instructions || '',
      shuffle_questions: exam.shuffle_questions,
      show_result_immediately: exam.show_result_immediately,
      allow_retake: exam.allow_retake,
      max_attempts: exam.max_attempts,
      is_proctored: exam.is_proctored,
    })
    setEditingExamId(exam.id)
    setShowExamModal(true)
    setError('')
  }

  const handleSaveExam = async () => {
    if (!form.title.trim() || !form.subject_id || !form.class_id) {
      setError('Title, subject, and class are required')
      return
    }
    setSaving(true); setError('')
    try {
      const payload: Record<string, any> = {
        school_id: schoolId,
        title: form.title.trim(),
        subject_id: form.subject_id,
        class_id: form.class_id,
        duration_minutes: Number(form.duration_minutes) || 60,
        total_questions: Number(form.total_questions) || 50,
        pass_mark: Number(form.pass_mark) || 40,
        is_active: form.is_active,
        start_time: form.start_time ? new Date(form.start_time).toISOString() : null,
        end_time: form.end_time ? new Date(form.end_time).toISOString() : null,
        instructions: form.instructions,
        shuffle_questions: form.shuffle_questions,
        show_result_immediately: form.show_result_immediately,
        allow_retake: form.allow_retake,
        max_attempts: Number(form.max_attempts) || 1,
        is_proctored: form.is_proctored,
        created_by: user?.id || null,
      }
      if (editingExamId) {
        delete payload.school_id
        delete payload.created_by
        const { error: upErr } = await dbProxy.from('cbt_exams').update(payload).eq('id', editingExamId)
        if (upErr) throw upErr
        setSuccessMsg('Exam updated')
      } else {
        const { error: inErr } = await dbProxy.from('cbt_exams').insert(payload)
        if (inErr) throw inErr
        setSuccessMsg('Exam created')
      }
      setShowExamModal(false)
      // Reload exams
      const { data: newEx } = await dbProxy.from('cbt_exams')
        .select('*')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false })
      setExams((newEx || []) as Exam[])
    } catch (e: any) {
      setError(e.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (examId: string, current: boolean) => {
    try {
      const { error } = await dbProxy
        .from('cbt_exams')
        .update({ is_active: !current })
        .eq('id', examId)
      if (error) throw error
      setExams(prev => prev.map(e => e.id === examId ? { ...e, is_active: !current } : e))
      setSuccessMsg(!current ? 'Exam activated - now visible to students' : 'Exam deactivated')
    } catch (e: any) {
      setError(e.message || 'Toggle failed')
    }
  }

  const handleDeleteExam = async (examId: string) => {
    try {
      // Delete questions first (cascade may handle this, but be explicit)
      await dbProxy.from('cbt_questions').delete().eq('exam_id', examId)
      await dbProxy.from('cbt_attempts').delete().eq('exam_id', examId)
      const { error } = await dbProxy.from('cbt_exams').delete().eq('id', examId)
      if (error) throw error
      setExams(prev => prev.filter(e => e.id !== examId))
      setDeleteConfirm(null)
      setSuccessMsg('Exam deleted')
    } catch (e: any) {
      setError(e.message || 'Delete failed')
    }
  }

  const handleResetAttempts = async (examId: string) => {
    try {
      const { error } = await dbProxy.from('cbt_attempts').delete().eq('exam_id', examId)
      if (error) throw error
      setAttemptCounts(prev => ({ ...prev, [examId]: 0 }))
      setAttempts([])
      setResetConfirm(null)
      setSuccessMsg('All attempts reset')
    } catch (e: any) {
      setError(e.message || 'Reset failed')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-slate-600">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-600" />
          <span className="text-sm font-medium">Loading exams…</span>
        </div>
      </div>
    )
  }

  return (
    <div className="px-3 sm:px-4 lg:px-6 py-4 sm:py-6 max-w-6xl mx-auto space-y-5 bg-gradient-to-br from-slate-50 via-white to-cyan-50/40 min-h-screen">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-700 text-[10px] font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse"></span>
              CBT Center
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 bg-clip-text text-transparent">CBT Exams</h1>
          <p className="text-sm text-slate-500 mt-1.5">Create computer-based tests, manage questions, view attempts.</p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl text-sm font-semibold hover:from-cyan-700 hover:to-blue-700 transition-all shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/40 hover:-translate-y-0.5"
        >
          <Plus className="w-4 h-4" strokeWidth={2.5} /> New Exam
        </button>
      </div>

      {/* Alerts */}
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

      {/* Stats - premium glass cards with gradient icon tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="group bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-4 shadow-lg shadow-slate-200/40 hover:shadow-cyan-500/20 hover:-translate-y-0.5 transition-all duration-200">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center mb-3 shadow-md shadow-cyan-500/30"><FileText size={18} strokeWidth={2.2} className="text-white" /></div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{exams.length}</div>
          <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 mt-0.5">Total Exams</div>
        </div>
        <div className="group bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-4 shadow-lg shadow-slate-200/40 hover:shadow-emerald-500/20 hover:-translate-y-0.5 transition-all duration-200">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center mb-3 shadow-md shadow-emerald-500/30"><Play size={18} strokeWidth={2.2} className="text-white" /></div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{exams.filter(e => e.is_active).length}</div>
          <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 mt-0.5">Active</div>
        </div>
        <div className="group bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-4 shadow-lg shadow-slate-200/40 hover:shadow-amber-500/20 hover:-translate-y-0.5 transition-all duration-200">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mb-3 shadow-md shadow-amber-500/30"><Users size={18} strokeWidth={2.2} className="text-white" /></div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{Object.values(attemptCounts).reduce((a, b) => a + b, 0)}</div>
          <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 mt-0.5">Attempts</div>
        </div>
        <div className="group bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-4 shadow-lg shadow-slate-200/40 hover:shadow-violet-500/20 hover:-translate-y-0.5 transition-all duration-200">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-3 shadow-md shadow-violet-500/30"><ListChecks size={18} strokeWidth={2.2} className="text-white" /></div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{questions.length}</div>
          <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 mt-0.5">Questions</div>
        </div>
      </div>

      {/* Exam list */}
      {exams.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-slate-200/60 py-20 text-center shadow-lg shadow-slate-200/40 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-50/40 via-transparent to-blue-50/40 pointer-events-none"></div>
          <div className="relative">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-cyan-500 to-blue-600 rounded-3xl flex items-center justify-center mb-5 shadow-xl shadow-cyan-500/30"><FileText size={36} strokeWidth={2} className="text-white" /></div>
            <h3 className="text-lg font-bold text-slate-900 mb-2 tracking-tight">No CBT Exams Yet</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">Click "New Exam" to create your first computer-based test and start assessing your students.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {exams.map(exam => {
            const isExpanded = expandedExamId === exam.id
            const attemptCount = attemptCounts[exam.id] || 0
            return (
              <div key={exam.id} className={`bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/60 overflow-hidden shadow-lg shadow-slate-200/40 hover:shadow-xl hover:shadow-slate-300/40 transition-all duration-200 ${exam.is_active ? 'ring-1 ring-cyan-500/20' : ''}`}>
                {/* Exam card header */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gradient-to-r hover:from-slate-50/80 hover:to-transparent transition group"
                  onClick={() => toggleExpand(exam.id)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md ${exam.is_active ? 'bg-gradient-to-br from-emerald-500 to-green-600 shadow-emerald-500/30' : 'bg-gradient-to-br from-slate-300 to-slate-400 shadow-slate-400/30'}`}>
                      <FileText className="w-5 h-5 text-white" strokeWidth={2.2} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate tracking-tight">{exam.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        <span className="inline-flex items-center gap-1">{exam.subjects?.name || '-'} <span className="text-slate-300">/</span> {exam.classes?.name || '-'}</span>
                        <span className="mx-1.5 text-slate-300">|</span>
                        <span className="text-slate-400">{exam.duration_minutes}min</span>
                        <span className="mx-1.5 text-slate-300">|</span>
                        <span className="text-slate-400">{exam.total_questions}Q</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    {attemptCount > 0 && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-blue-50 to-cyan-50 text-blue-700 rounded-full text-xs font-semibold border border-blue-100">
                        <Users className="w-3 h-3" strokeWidth={2.2} /> {attemptCount}
                      </span>
                    )}
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${exam.is_active ? 'bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 border border-emerald-200' : 'bg-slate-50 text-slate-500 border border-slate-200'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${exam.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                      {exam.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center group-hover:bg-white transition">
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-600" /> : <ChevronDown className="w-4 h-4 text-slate-600" />}
                    </div>
                  </div>
                </div>

                {/* Expanded panel */}
                {isExpanded && (
                  <div className="border-t border-slate-100 p-4 space-y-4 bg-gradient-to-br from-slate-50/60 to-white">
                    {/* Exam details - premium stat tiles */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                      <div className="bg-white rounded-xl border border-slate-200/60 p-3 hover:shadow-md transition">
                        <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-1">Duration</p>
                        <p className="text-sm font-bold text-slate-800">{exam.duration_minutes} <span className="text-xs font-medium text-slate-500">min</span></p>
                      </div>
                      <div className="bg-white rounded-xl border border-slate-200/60 p-3 hover:shadow-md transition">
                        <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-1">Pass Mark</p>
                        <p className="text-sm font-bold text-slate-800">{exam.pass_mark}</p>
                      </div>
                      <div className="bg-white rounded-xl border border-slate-200/60 p-3 hover:shadow-md transition">
                        <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-1">Start</p>
                        <p className="text-xs font-bold text-slate-800">{formatDateTime(exam.start_time)}</p>
                      </div>
                      <div className="bg-white rounded-xl border border-slate-200/60 p-3 hover:shadow-md transition">
                        <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-1">End</p>
                        <p className="text-xs font-bold text-slate-800">{formatDateTime(exam.end_time)}</p>
                      </div>
                    </div>

                    {exam.instructions && (
                      <div className="p-3 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-100 rounded-xl">
                        <p className="text-xs font-semibold text-blue-700 mb-1 flex items-center gap-1.5"><FileText className="w-3 h-3" /> Instructions</p>
                        <p className="text-xs text-blue-700/80 whitespace-pre-wrap">{exam.instructions}</p>
                      </div>
                    )}

                    {/* Action buttons - premium pill style */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => toggleActive(exam.id, exam.is_active)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all hover:-translate-y-0.5 ${exam.is_active ? 'bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 hover:shadow-md hover:shadow-orange-500/20' : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 hover:shadow-md hover:shadow-emerald-500/20'}`}
                      >
                        {exam.is_active ? <EyeOff className="w-3.5 h-3.5" strokeWidth={2.2} /> : <Eye className="w-3.5 h-3.5" strokeWidth={2.2} />}
                        {exam.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => openEditModal(exam)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-xs font-semibold hover:bg-indigo-100 hover:shadow-md hover:shadow-indigo-500/20 hover:-translate-y-0.5 transition-all"
                      >
                        <Edit3 className="w-3.5 h-3.5" strokeWidth={2.2} /> Edit
                      </button>
                      <button
                        onClick={() => { setShowBulkImport(true); setExpandedExamId(exam.id) }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-semibold hover:bg-blue-100 hover:shadow-md hover:shadow-blue-500/20 hover:-translate-y-0.5 transition-all"
                      >
                        <ListChecks className="w-3.5 h-3.5" strokeWidth={2.2} /> Bulk Import
                      </button>
                      <button
                        onClick={() => { setShowSync(true); setExpandedExamId(exam.id) }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-50 text-cyan-700 border border-cyan-200 rounded-full text-xs font-semibold hover:bg-cyan-100 hover:shadow-md hover:shadow-cyan-500/20 hover:-translate-y-0.5 transition-all"
                      >
                        <RefreshCw className="w-3.5 h-3.5" strokeWidth={2.2} /> Sync
                      </button>
                      <button
                        onClick={() => {
                          if (showAttempts && expandedExamId === exam.id) {
                            setShowAttempts(false)
                          } else {
                            setShowAttempts(true)
                            loadAttempts(exam.id)
                          }
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-violet-600 text-white rounded-full text-xs font-semibold hover:shadow-lg hover:shadow-purple-500/30 hover:-translate-y-0.5 transition-all"
                      >
                        <Award className="w-3.5 h-3.5" strokeWidth={2.2} /> View Attempts
                      </button>
                      <button
                        onClick={() => setResetConfirm(exam.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-semibold hover:bg-amber-100 hover:shadow-md hover:shadow-amber-500/20 hover:-translate-y-0.5 transition-all"
                      >
                        <RotateCcw className="w-3.5 h-3.5" strokeWidth={2.2} /> Reset
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(exam.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-full text-xs font-semibold hover:bg-red-100 hover:shadow-md hover:shadow-red-500/20 hover:-translate-y-0.5 transition-all ml-auto"
                      >
                        <Trash2 className="w-3.5 h-3.5" strokeWidth={2.2} /> Delete
                      </button>
                    </div>

                    {/* Attempts view - premium panel */}
                    {showAttempts && (
                      <div className="bg-white rounded-2xl border border-slate-200/60 p-4 shadow-lg shadow-slate-200/40">
                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-md shadow-purple-500/30">
                              <Award className="w-4 h-4 text-white" strokeWidth={2.2} />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-800 tracking-tight">Student Attempts</p>
                              <p className="text-[10px] text-slate-500">{attempts.length} total records</p>
                            </div>
                          </div>
                          <button
                            onClick={() => setShowAttempts(false)}
                            className="inline-flex items-center gap-1 text-[11px] text-cyan-700 hover:text-cyan-900 font-semibold px-2.5 py-1 rounded-full hover:bg-cyan-50 transition"
                          >
                            <ChevronUp className="w-3 h-3" /> Back to Questions
                          </button>
                        </div>

                        {attempts.length > 0 && (
                          <div className="grid grid-cols-4 gap-2 mb-3 text-[11px]">
                            <div className="bg-blue-50 rounded p-2 text-center">
                              <div className="font-bold text-blue-700">{attempts.length}</div>
                              <div className="text-blue-600">Total</div>
                            </div>
                            <div className="bg-green-50 rounded p-2 text-center">
                              <div className="font-bold text-green-700">{attempts.filter(a => a.is_submitted).length}</div>
                              <div className="text-green-600">Submitted</div>
                            </div>
                            <div className="bg-orange-50 rounded p-2 text-center">
                              <div className="font-bold text-orange-700">{attempts.filter(a => !a.is_submitted).length}</div>
                              <div className="text-orange-600">In Progress</div>
                            </div>
                            <div className="bg-purple-50 rounded p-2 text-center">
                              <div className="font-bold text-purple-700">{(() => { const s = attempts.filter(a => a.is_submitted && a.total_marks > 0); if (s.length === 0) return '0%'; return Math.round(s.reduce((x, a) => x + (a.score / a.total_marks), 0) / s.length * 100) + '%' })()}</div>
                              <div className="text-purple-600">Avg Score</div>
                            </div>
                          </div>
                        )}

                        {attempts.length > 0 && (
                          <div className="flex flex-wrap items-center gap-2 mb-3">
                            <select value={attemptFilter} onChange={e => setAttemptFilter(e.target.value as any)} className="px-2 py-1 border border-slate-200 rounded text-[11px] text-slate-700">
                              <option value="all">All ({attempts.length})</option>
                              <option value="submitted">Submitted ({attempts.filter(a => a.is_submitted).length})</option>
                              <option value="in_progress">In Progress ({attempts.filter(a => !a.is_submitted).length})</option>
                            </select>
                            <input type="text" placeholder="Search by name or admission no..." value={attemptSearch} onChange={e => setAttemptSearch(e.target.value)} className="flex-1 min-w-[120px] px-2 py-1 border border-slate-200 rounded text-[11px] text-slate-700" />
                            <select value={attemptSort} onChange={e => setAttemptSort(e.target.value as any)} className="px-2 py-1 border border-slate-200 rounded text-[11px] text-slate-700">
                              <option value="recent">Most Recent</option>
                              <option value="highest">Highest Score</option>
                              <option value="lowest">Lowest Score</option>
                              <option value="name">Name (A-Z)</option>
                            </select>
                          </div>
                        )}

                        {attempts.length === 0 ? (
                          <p className="text-xs text-gray-400 text-center py-3">No attempts yet.</p>
                        ) : (
                          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                            {(() => {
                              let filtered = attempts.filter(a => {
                                if (attemptFilter === 'submitted') return a.is_submitted
                                if (attemptFilter === 'in_progress') return !a.is_submitted
                                return true
                              })
                              if (attemptSearch.trim()) {
                                const q = attemptSearch.toLowerCase()
                                filtered = filtered.filter(a => {
                                  const stu = studentMap[a.student_id]
                                  const name = stu ? (stu.first_name + ' ' + stu.last_name).toLowerCase() : ''
                                  const adm = (stu && stu.admission_no || '').toLowerCase()
                                  return name.includes(q) || adm.includes(q)
                                })
                              }
                              filtered = [...filtered].sort((a, b) => {
                                if (attemptSort === 'highest') { return (b.total_marks > 0 ? b.score / b.total_marks : 0) - (a.total_marks > 0 ? a.score / a.total_marks : 0) }
                                if (attemptSort === 'lowest') { return (a.total_marks > 0 ? a.score / a.total_marks : 0) - (b.total_marks > 0 ? b.score / b.total_marks : 0) }
                                if (attemptSort === 'name') {
                                  const na = studentMap[a.student_id] ? (studentMap[a.student_id].first_name + studentMap[a.student_id].last_name) : 'z'
                                  const nb = studentMap[b.student_id] ? (studentMap[b.student_id].first_name + studentMap[b.student_id].last_name) : 'z'
                                  return na.localeCompare(nb)
                                }
                                return new Date(b.time_started).getTime() - new Date(a.time_started).getTime()
                              })
                              if (filtered.length === 0) return <p className="text-xs text-gray-400 text-center py-3">No attempts match your filter.</p>
                              return filtered.map(a => {
                                const stu = studentMap[a.student_id]
                                const name = stu ? (stu.first_name + ' ' + stu.last_name).trim() : 'Unknown student'
                                const admission = (stu && stu.admission_no) || '-'
                                const pct = a.total_marks > 0 ? Math.round((a.score / a.total_marks) * 100) : 0
                                const ex = exams.find(e => e.id === a.exam_id)
                                const passed = ex ? a.score >= ex.pass_mark : false
                                const timeTaken = a.time_submitted && a.time_started ? Math.round((new Date(a.time_submitted).getTime() - new Date(a.time_started).getTime()) / 60000) : null
                                return (
                                  <div key={a.id} className={`bg-white rounded-xl border-l-4 ${a.is_submitted ? (passed ? 'border-l-emerald-500' : 'border-l-red-500') : 'border-l-orange-500'} border border-slate-200/60 p-3 hover:shadow-md transition-all`}>
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <p className="font-medium text-gray-800 text-xs">{name}</p>
                                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${a.is_submitted ? (passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700') : 'bg-orange-100 text-orange-700'}`}>
                                            {a.is_submitted ? (passed ? 'PASS' : 'FAIL') : 'IN PROGRESS'}
                                          </span>
                                        </div>
                                        <p className="text-[10px] text-gray-400 mt-0.5">
                                          Attempt #{a.attempt_number} - ADM: {admission}
                                          {timeTaken !== null && ' - Time: ' + timeTaken + 'min'}
                                        </p>
                                      </div>
                                      <div className="text-right flex-shrink-0">
                                        <p className="font-bold text-gray-800 text-xs">{a.score}/{a.total_marks}</p>
                                        <p className="text-[10px] text-gray-500">{pct}%</p>
                                      </div>
                                    </div>
                                    <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-gray-100">
                                      <button onClick={() => viewAttemptDetail(a, exam.id)} className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] hover:bg-blue-100">View Detail</button>
                                      <button onClick={() => exportAttemptPdf(a)} className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[10px] hover:bg-indigo-100">Export PDF</button>
                                      <button onClick={() => setResetOneConfirm(a.id)} className="px-1.5 py-0.5 bg-yellow-50 text-yellow-700 rounded text-[10px] hover:bg-yellow-100">Reset</button>
                                      <button onClick={() => setRetakeOneConfirm(a.id)} className="px-1.5 py-0.5 bg-cyan-50 text-cyan-700 rounded text-[10px] hover:bg-cyan-100">Allow Retake</button>
                                      <button onClick={() => setDeleteOneConfirm(a.id)} className="px-1.5 py-0.5 bg-red-50 text-red-700 rounded text-[10px] hover:bg-red-100">Delete</button>
                                    </div>
                                  </div>
                                )
                              })
                            })()}
                          </div>
                        )}
                      </div>
                    )}

                    {detailAttempt && (
                      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setDetailAttempt(null)}>
                        <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
                            <h2 className="text-base font-bold text-gray-800">Attempt Detail</h2>
                            <button onClick={() => setDetailAttempt(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
                          </div>
                          <div className="p-5 space-y-3">
                            {loadingDetail ? (
                              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-cyan-600 animate-spin" /></div>
                            ) : (
                              <>
                                {(() => {
                                  const stu = studentMap[detailAttempt.student_id]
                                  const name = stu ? (stu.first_name + ' ' + stu.last_name).trim() : 'Unknown student'
                                  return (
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                      <div className="bg-gray-50 rounded p-2"><b>Student:</b> {name}</div>
                                      <div className="bg-gray-50 rounded p-2"><b>Attempt:</b> #{detailAttempt.attempt_number}</div>
                                      <div className="bg-gray-50 rounded p-2"><b>Score:</b> {detailAttempt.score}/{detailAttempt.total_marks}</div>
                                      <div className="bg-gray-50 rounded p-2"><b>Status:</b> {detailAttempt.is_submitted ? 'Submitted' : 'In Progress'}</div>
                                    </div>
                                  )
                                })()}
                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                  {detailQuestions.map((q, i) => {
                                    const studentAns = detailAnswers[q.id]
                                    const correct = q.correct_option
                                    const isCorrect = studentAns === correct
                                    return (
                                      <div key={q.id} className={`p-2.5 rounded border text-xs ${isCorrect ? 'bg-green-50 border-green-200' : (studentAns ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200')}`}>
                                        <p className="font-medium text-gray-800 mb-1.5"><span className="text-gray-400">Q{i + 1}.</span> {q.question_text}</p>
                                        <div className="grid grid-cols-2 gap-1 text-[10px]">
                                          {(['a', 'b', 'c', 'd'] as const).map(opt => {
                                            const text = q['option_' + opt as keyof Question] as string
                                            const isStudentAns = studentAns === opt
                                            const isCorrectAns = correct === opt
                                            return (
                                              <div key={opt} className={`px-1.5 py-1 rounded ${isCorrectAns ? 'bg-green-200 text-green-800 font-bold' : (isStudentAns ? 'bg-red-200 text-red-800' : 'bg-white text-gray-600')}`}>
                                                <span className="uppercase">{opt}.</span> {text}
                                                {isCorrectAns && ' (correct)'}
                                                {isStudentAns && !isCorrectAns && ' (your answer)'}
                                              </div>
                                            )
                                          })}
                                        </div>
                                      </div>
                                    )
                                  })}
                                  {detailQuestions.length === 0 && <p className="text-xs text-gray-400 text-center py-4">No questions found for this exam.</p>}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {resetOneConfirm && (
                      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setResetOneConfirm(null)}>
                        <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
                          <h3 className="font-bold text-gray-800 mb-2">Reset This Attempt?</h3>
                          <p className="text-sm text-gray-500 mb-4">This will delete the student's attempt so they can retake the exam. This cannot be undone.</p>
                          <div className="flex justify-end gap-2">
                            <button onClick={() => setResetOneConfirm(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">Cancel</button>
                            <button onClick={() => resetOneAttempt(resetOneConfirm, expandedExamId || '')} className="px-4 py-2 bg-yellow-600 text-white rounded-lg text-sm font-medium hover:bg-yellow-700">Reset</button>
                          </div>
                        </div>
                      </div>
                    )}
                    {deleteOneConfirm && (
                      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setDeleteOneConfirm(null)}>
                        <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
                          <h3 className="font-bold text-gray-800 mb-2">Delete This Attempt?</h3>
                          <p className="text-sm text-gray-500 mb-4">This permanently removes the attempt record. This cannot be undone.</p>
                          <div className="flex justify-end gap-2">
                            <button onClick={() => setDeleteOneConfirm(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">Cancel</button>
                            <button onClick={() => deleteOneAttempt(deleteOneConfirm)} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">Delete</button>
                          </div>
                        </div>
                      </div>
                    )}
                    {retakeOneConfirm && (
                      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setRetakeOneConfirm(null)}>
                        <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
                          <h3 className="font-bold text-gray-800 mb-2">Allow Retake?</h3>
                          <p className="text-sm text-gray-500 mb-4">This resets the student's attempt to "In Progress" with score 0. They can take the exam again.</p>
                          <div className="flex justify-end gap-2">
                            <button onClick={() => setRetakeOneConfirm(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">Cancel</button>
                            <button onClick={() => { const att = attempts.find(a => a.id === retakeOneConfirm); if (att && expandedExamId) allowRetake(att, expandedExamId) }} className="px-4 py-2 bg-cyan-600 text-white rounded-lg text-sm font-medium hover:bg-cyan-700">Allow Retake</button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Questions section - hidden while View Attempts is open */}
                    <div className={!showAttempts ? "bg-white rounded-2xl border border-slate-200/60 p-4 shadow-lg shadow-slate-200/40" : "hidden"}>
                      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md shadow-violet-500/30">
                            <ListChecks className="w-4 h-4 text-white" strokeWidth={2.2} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800 tracking-tight">Questions</p>
                            <p className="text-[10px] text-slate-500">{questions.length} total</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setShowAddQuestion(true)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-full text-xs font-semibold hover:shadow-lg hover:shadow-cyan-500/30 hover:-translate-y-0.5 transition-all"
                        >
                          <Plus className="w-3 h-3" strokeWidth={2.5} /> Add Question
                        </button>
                      </div>
                      {loadingQuestions ? (
                        <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 text-[#1A237E] animate-spin" /></div>
                      ) : questions.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-4">No questions yet. Click "Add Question" to create one.</p>
                      ) : (
                        <div className="space-y-2 max-h-80 overflow-y-auto">
                          {questions.map((q, i) => (
                            <div key={q.id} className="p-2.5 bg-gray-50 rounded border border-gray-100">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <p className="text-xs font-medium text-gray-800 flex-1">
                                  <span className="text-gray-400">Q{i + 1}.</span> {q.question_text}
                                </p>
                                <button
                                  onClick={async () => {
                                    try {
                                      await dbProxy.from('cbt_questions').delete().eq('id', q.id)
                                      loadQuestions(exam.id)
                                      setSuccessMsg('Question deleted')
                                    } catch (e: any) {
                                      setError(e.message || 'Delete failed')
                                    }
                                  }}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <div className="grid grid-cols-2 gap-1 text-[11px]">
                                {(['a', 'b', 'c', 'd'] as const).map(opt => {
                                  const text = q[`option_${opt}` as keyof Question] as string
                                  const isCorrect = q.correct_option === opt
                                  return (
                                    <div key={opt} className={`px-2 py-1 rounded ${isCorrect ? 'bg-green-100 text-green-700 font-medium' : 'bg-white text-gray-600'}`}>
                                      <span className="font-semibold uppercase">{opt}.</span> {text}
                                      {isCorrect && <CheckCircle className="inline w-3 h-3 ml-1" />}
                                    </div>
                                  )
                                })}
                              </div>
                              <div className="flex items-center gap-3 mt-1.5 text-[10px] text-gray-500">
                                <span>Marks: {q.marks}</span>
                                {q.time_allocation > 0 && <span>Time: {formatTimeAllocation(q.time_allocation)}</span>}
                                {q.explanation && <span className="italic">Explanation: {q.explanation}</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Per-student modals - OUTSIDE the exam map loop to avoid backdrop-blur containing block issues */}
      {detailAttempt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setDetailAttempt(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h2 className="text-base font-bold text-gray-800">Attempt Detail</h2>
              <button onClick={() => setDetailAttempt(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <div className="p-5 space-y-3">
              {loadingDetail ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-cyan-600 animate-spin" /></div>
              ) : (
                <>
                  {(() => {
                    const stu = studentMap[detailAttempt.student_id]
                    const name = stu ? (stu.first_name + ' ' + stu.last_name).trim() : 'Unknown student'
                    return (
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-gray-50 rounded p-2"><b>Student:</b> {name}</div>
                        <div className="bg-gray-50 rounded p-2"><b>Attempt:</b> #{detailAttempt.attempt_number}</div>
                        <div className="bg-gray-50 rounded p-2"><b>Score:</b> {detailAttempt.score}/{detailAttempt.total_marks}</div>
                        <div className="bg-gray-50 rounded p-2"><b>Status:</b> {detailAttempt.is_submitted ? 'Submitted' : 'In Progress'}</div>
                      </div>
                    )
                  })()}
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {detailQuestions.map((q, i) => {
                      const studentAns = detailAnswers[q.id]
                      const correct = q.correct_option
                      const isCorrect = studentAns === correct
                      return (
                        <div key={q.id} className={`p-2.5 rounded border text-xs ${isCorrect ? 'bg-green-50 border-green-200' : (studentAns ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200')}`}>
                          <p className="font-medium text-gray-800 mb-1.5"><span className="text-gray-400">Q{i + 1}.</span> {q.question_text}</p>
                          <div className="grid grid-cols-2 gap-1 text-[10px]">
                            {(['a', 'b', 'c', 'd'] as const).map(opt => {
                              const text = q['option_' + opt as keyof Question] as string
                              const isStudentAns = studentAns === opt
                              const isCorrectAns = correct === opt
                              return (
                                <div key={opt} className={`px-1.5 py-1 rounded ${isCorrectAns ? 'bg-green-200 text-green-800 font-bold' : (isStudentAns ? 'bg-red-200 text-red-800' : 'bg-white text-gray-600')}`}>
                                  <span className="uppercase">{opt}.</span> {text}
                                  {isCorrectAns && ' (correct)'}
                                  {isStudentAns && !isCorrectAns && ' (your answer)'}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                    {detailQuestions.length === 0 && <p className="text-xs text-gray-400 text-center py-4">No questions found for this exam.</p>}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      {resetOneConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setResetOneConfirm(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-800 mb-2">Reset This Attempt?</h3>
            <p className="text-sm text-gray-500 mb-4">This will delete the student's attempt so they can retake the exam. This cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setResetOneConfirm(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">Cancel</button>
              <button onClick={() => resetOneAttempt(resetOneConfirm, expandedExamId || '')} className="px-4 py-2 bg-yellow-600 text-white rounded-lg text-sm font-medium hover:bg-yellow-700">Reset</button>
            </div>
          </div>
        </div>
      )}
      {deleteOneConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setDeleteOneConfirm(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-800 mb-2">Delete This Attempt?</h3>
            <p className="text-sm text-gray-500 mb-4">This permanently removes the attempt record. This cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteOneConfirm(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">Cancel</button>
              <button onClick={() => deleteOneAttempt(deleteOneConfirm)} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
      {retakeOneConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setRetakeOneConfirm(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-800 mb-2">Allow Retake?</h3>
            <p className="text-sm text-gray-500 mb-4">This resets the student's attempt to "In Progress" with score 0. They can take the exam again.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setRetakeOneConfirm(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">Cancel</button>
              <button onClick={() => {
                const att = attempts.find(a => a.id === retakeOneConfirm)
                if (att && expandedExamId) allowRetake(att, expandedExamId)
              }} className="px-4 py-2 bg-cyan-600 text-white rounded-lg text-sm font-medium hover:bg-cyan-700">Allow Retake</button>
            </div>
          </div>
        </div>
      )}

      {/* Exam create/edit modal */}
      {showExamModal && (
        <ExamModal
          form={form}
          setForm={setForm}
          classes={classes}
          subjects={subjectsForClass}
          editingId={editingExamId}
          saving={saving}
          error={error}
          onClose={() => { setShowExamModal(false); setError('') }}
          onSave={handleSaveExam}
        />
      )}

      {/* Add question modal */}
      {showAddQuestion && expandedExamId && (
        <AddQuestionModal
          examId={expandedExamId}
          onClose={() => setShowAddQuestion(false)}
          onSaved={() => {
            setShowAddQuestion(false)
            loadQuestions(expandedExamId)
            setSuccessMsg('Question added')
          }}
        />
      )}

      {/* Bulk import modal */}
      {showBulkImport && expandedExamId && (
        <BulkImportModal
          examId={expandedExamId}
          onClose={() => setShowBulkImport(false)}
          onImported={() => {
            setShowBulkImport(false)
            loadQuestions(expandedExamId)
            setSuccessMsg('Questions imported')
          }}
        />
      )}

      {/* Sync to scorebook modal */}
      {showSync && expandedExamId && (
        <SyncModal
          exam={exams.find(e => e.id === expandedExamId) as Exam}
          schoolId={schoolId}
          onClose={() => setShowSync(false)}
          onSynced={() => {
            setShowSync(false)
            setSuccessMsg('Scores synced to scorebook')
          }}
        />
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <ConfirmDialog
          title="Delete Exam?"
          message="This will permanently delete the exam, all its questions, and all student attempts. This cannot be undone."
          confirmText="Delete"
          danger
          onConfirm={() => handleDeleteExam(deleteConfirm)}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}

      {/* Reset confirm */}
      {resetConfirm && (
        <ConfirmDialog
          title="Reset All Attempts?"
          message="This will delete all student attempts for this exam. The questions and exam settings will remain."
          confirmText="Reset"
          onConfirm={() => handleResetAttempts(resetConfirm)}
          onCancel={() => setResetConfirm(null)}
        />
      )}
    </div>
  )
}

// =========================================================
// Exam Modal Component
// =========================================================
function ExamModal({ form, setForm, classes, subjects, editingId, saving, error, onClose, onSave }: {
  form: ExamForm
  setForm: (f: ExamForm) => void
  classes: any[]
  subjects: any[]
  editingId: string | null
  saving: boolean
  error: string
  onClose: () => void
  onSave: () => void
}) {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-gray-800">{editingId ? 'Edit Exam' : 'New CBT Exam'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          {error && <div className="p-2 bg-red-50 text-red-700 text-sm rounded">{error}</div>}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Exam Title *</label>
            <input
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="e.g., First Term Mathematics CBT"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 outline-none transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Class *</label>
              <select
                value={form.class_id}
                onChange={e => setForm({ ...form, class_id: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 outline-none transition"
              >
                <option value="">Select class</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name} ({c.tier || 'SSS'})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Subject *</label>
              <select
                value={form.subject_id}
                onChange={e => setForm({ ...form, subject_id: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 outline-none transition"
              >
                <option value="">Select subject</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}{s.code ? ` (${s.code})` : ''}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Duration (min)</label>
              <input
                type="number"
                value={form.duration_minutes}
                onChange={e => setForm({ ...form, duration_minutes: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 outline-none transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Total Questions</label>
              <input
                type="number"
                value={form.total_questions}
                onChange={e => setForm({ ...form, total_questions: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 outline-none transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Pass Mark</label>
              <input
                type="number"
                step="0.1"
                value={form.pass_mark}
                onChange={e => setForm({ ...form, pass_mark: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 outline-none transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Start Time</label>
              <input
                type="datetime-local"
                value={form.start_time}
                onChange={e => setForm({ ...form, start_time: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 outline-none transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">End Time</label>
              <input
                type="datetime-local"
                value={form.end_time}
                onChange={e => setForm({ ...form, end_time: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Instructions</label>
            <textarea
              value={form.instructions}
              onChange={e => setForm({ ...form, instructions: e.target.value })}
              rows={2}
              placeholder="Optional instructions shown to students before exam"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 outline-none transition resize-none"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <label className="flex items-center gap-2 text-xs text-gray-700">
              <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} className="rounded" />
              Active
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-700">
              <input type="checkbox" checked={form.shuffle_questions} onChange={e => setForm({ ...form, shuffle_questions: e.target.checked })} className="rounded" />
              Shuffle Questions
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-700">
              <input type="checkbox" checked={form.show_result_immediately} onChange={e => setForm({ ...form, show_result_immediately: e.target.checked })} className="rounded" />
              Show Result Immediately
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-700">
              <input type="checkbox" checked={form.allow_retake} onChange={e => setForm({ ...form, allow_retake: e.target.checked })} className="rounded" />
              Allow Retake
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-700">
              <input type="checkbox" checked={form.is_proctored} onChange={e => setForm({ ...form, is_proctored: e.target.checked })} className="rounded" />
              Proctored
            </label>
            {form.allow_retake && (
              <div>
                <label className="block text-xs text-gray-600 mb-0.5">Max Attempts</label>
                <input
                  type="number"
                  value={form.max_attempts}
                  onChange={e => setForm({ ...form, max_attempts: Number(e.target.value) })}
                  className="w-full px-2 py-1 border border-slate-200 rounded text-xs text-slate-900"
                />
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 p-5 border-t border-gray-100 sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg">Cancel</button>
          <button
            onClick={onSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg text-sm font-semibold hover:bg-cyan-700 shadow-sm transition disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving...' : editingId ? 'Update Exam' : 'Create Exam'}
          </button>
        </div>
      </div>
    </div>
  )
}

// =========================================================
// Add Question Modal
// =========================================================
function AddQuestionModal({ examId, onClose, onSaved }: { examId: string; onClose: () => void; onSaved: () => void }) {
  const [questionText, setQuestionText] = useState('')
  const [optionA, setOptionA] = useState('')
  const [optionB, setOptionB] = useState('')
  const [optionC, setOptionC] = useState('')
  const [optionD, setOptionD] = useState('')
  const [correctOption, setCorrectOption] = useState('a')
  const [explanation, setExplanation] = useState('')
  const [marks, setMarks] = useState(1)
  const [timeAllocation, setTimeAllocation] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!questionText.trim() || !optionA.trim() || !optionB.trim() || !optionC.trim() || !optionD.trim()) {
      setError('Question text and all 4 options are required')
      return
    }
    setSaving(true); setError('')
    try {
      const { error: inErr } = await dbProxy.from('cbt_questions').insert({
        exam_id: examId,
        question_text: questionText.trim(),
        option_a: optionA.trim(),
        option_b: optionB.trim(),
        option_c: optionC.trim(),
        option_d: optionD.trim(),
        correct_option: correctOption,
        explanation: explanation.trim(),
        marks: Number(marks) || 1,
        time_allocation: Number(timeAllocation) || 0,
        question_order: 0,
      })
      if (inErr) throw inErr
      onSaved()
    } catch (e: any) {
      setError(e.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-gray-800">Add Question</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-3">
          {error && <div className="p-2 bg-red-50 text-red-700 text-sm rounded">{error}</div>}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Question Text *</label>
            <textarea
              value={questionText}
              onChange={e => setQuestionText(e.target.value)}
              rows={3}
              placeholder="Enter the question..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 outline-none transition resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Option A *</label>
              <input value={optionA} onChange={e => setOptionA(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 outline-none transition" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Option B *</label>
              <input value={optionB} onChange={e => setOptionB(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 outline-none transition" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Option C *</label>
              <input value={optionC} onChange={e => setOptionC(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 outline-none transition" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Option D *</label>
              <input value={optionD} onChange={e => setOptionD(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 outline-none transition" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Correct Option</label>
              <select
                value={correctOption}
                onChange={e => setCorrectOption(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 outline-none transition"
              >
                <option value="a">A</option>
                <option value="b">B</option>
                <option value="c">C</option>
                <option value="d">D</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Marks</label>
              <input
                type="number"
                value={marks}
                onChange={e => setMarks(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 outline-none transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Time Limit</label>
              <select
                value={timeAllocation}
                onChange={e => setTimeAllocation(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 outline-none transition"
              >
                {TIME_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Explanation (optional)</label>
            <textarea
              value={explanation}
              onChange={e => setExplanation(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 outline-none transition resize-none"
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 p-5 border-t border-gray-100 sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg text-sm font-semibold hover:bg-cyan-700 shadow-sm transition disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving...' : 'Add Question'}
          </button>
        </div>
      </div>
    </div>
  )
}

// =========================================================
// Bulk Import Modal (port of Flutter _showBulkImportDialog)
// =========================================================
function BulkImportModal({ examId, onClose, onImported }: {
  examId: string
  onClose: () => void
  onImported: () => void
}) {
  const [step, setStep] = useState<0 | 1>(0)
  const [text, setText] = useState('')
  const [marks, setMarks] = useState(2)
  const [timeAllocation, setTimeAllocation] = useState(0)
  const [parsed, setParsed] = useState<Array<Record<string, any>>>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleParse = () => {
    if (marks < 1) { setError('Marks must be at least 1'); return }
    const p = parsePastedQuestions(text)
    if (p.length === 0) {
      setError('No questions found. Use blank lines between questions.')
      return
    }
    for (const q of p) {
      q.marks = marks
      q.time_allocation = timeAllocation
    }
    setParsed(p)
    setStep(1)
    setError('')
  }

  const handleImport = async () => {
    setSaving(true); setError('')
    try {
      const payload = parsed.map((q, i) => ({
        exam_id: examId,
        question_text: q.question_text,
        option_a: q.option_a,
        option_b: q.option_b,
        option_c: q.option_c,
        option_d: q.option_d,
        correct_option: q.correct_option,
        explanation: '',
        marks: q.marks,
        time_allocation: q.time_allocation,
        question_order: i,
      }))
      const { error: inErr } = await dbProxy.from('cbt_questions').insert(payload)
      if (inErr) throw inErr
      onImported()
    } catch (e: any) {
      setError(e.message || 'Import failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-gray-800">
            {step === 0 ? 'Bulk Import Questions' : `Preview (${parsed.length} questions)`}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          {error && <div className="p-2 bg-red-50 text-red-700 text-sm rounded">{error}</div>}

          {step === 0 ? (
            <>
              <p className="text-xs text-gray-500">Paste questions below. Separate each question with a blank line.</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Marks per question *</label>
                  <input type="number" value={marks} onChange={e => setMarks(Number(e.target.value))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 outline-none transition" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Time per question</label>
                  <select value={timeAllocation} onChange={e => setTimeAllocation(Number(e.target.value))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 outline-none transition">
                    {TIME_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="p-3 bg-gray-100 rounded-lg">
                <pre className="text-[11px] font-mono text-gray-600 whitespace-pre-wrap">What is 2+2?
A. 3
B. 4
C. 5
D. 6
Ans: B

Capital of Nigeria?
A. Lagos
B. Abuja
C. Kano
D. Ibadan
Ans: B</pre>
              </div>
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                rows={12}
                placeholder="Paste questions here..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30 resize-none"
              />
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-green-700">
                {parsed.length} questions parsed. Each worth {marks} marks{timeAllocation > 0 ? `, ${formatTimeAllocation(timeAllocation)} each` : ''}.
              </p>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {parsed.map((q, i) => (
                  <div key={i} className="p-3 bg-gray-50 rounded border border-gray-200">
                    <p className="text-xs font-semibold text-gray-800">{i + 1}. {q.question_text}</p>
                    <p className="text-[11px] text-gray-500 mt-1">A. {q.option_a}   B. {q.option_b}</p>
                    <p className="text-[11px] text-gray-500">C. {q.option_c}   D. {q.option_d}</p>
                    <p className="text-[11px] text-[#1A237E] font-semibold mt-1">
                      Answer: {q.correct_option.toUpperCase()} | Marks: {q.marks}{q.time_allocation > 0 ? ` | ${formatTimeAllocation(q.time_allocation)}` : ''}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 p-5 border-t border-gray-100 sticky bottom-0 bg-white">
          {step === 1 && (
            <button onClick={() => setStep(0)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg">Back</button>
          )}
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg">Cancel</button>
          {step === 0 ? (
            <button onClick={handleParse} className="px-4 py-2 bg-cyan-600 text-white rounded-lg text-sm font-semibold hover:bg-cyan-700 shadow-sm transition">Parse</button>
          ) : (
            <button onClick={handleImport} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Importing...' : `Import All (${parsed.length})`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// =========================================================
// Sync Modal — copy CBT scores into scores table (port of Flutter syncCbtToScores)
// =========================================================
function SyncModal({ exam, schoolId, onClose, onSynced }: {
  exam: Exam
  schoolId: string
  onClose: () => void
  onSynced: () => void
}) {
  const [assessmentKey, setAssessmentKey] = useState('exam')
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState('')

  const handleSync = async () => {
    setSyncing(true); setError(''); setResult('')
    try {
      // Resolve current session + term (dbProxy returns arrays, not .maybeSingle())
      const { data: sessionArr } = await dbProxy
        .from('academic_sessions')
        .select('id')
        .eq('school_id', schoolId)
        .eq('is_current', true)
      const curSession = (sessionArr && sessionArr[0]) || null
      const { data: termArr } = await dbProxy
        .from('terms')
        .select('id')
        .eq('school_id', schoolId)
        .eq('is_current', true)
      const curTerm = (termArr && termArr[0]) || null
      if (!curSession?.id || !curTerm?.id) {
        setError('No active session/term found. Set one in Academic page.')
        setSyncing(false)
        return
      }

      // 1. Fetch all attempts for this exam
      const { data: attempts, error: aErr } = await dbProxy
        .from('cbt_attempts')
        .select('student_id, score')
        .eq('exam_id', exam.id)
      if (aErr) throw aErr
      if (!attempts || attempts.length === 0) {
        setError('No student attempts found for this exam.')
        setSyncing(false)
        return
      }

      // 2. Fetch existing scores for this class/subject/term
      const { data: existingScores, error: sErr } = await dbProxy
        .from('scores')
        .select('id, student_id, scores_json')
        .eq('class_id', exam.class_id)
        .eq('subject_id', exam.subject_id)
        .eq('session_id', curSession.id)
        .eq('term_id', curTerm.id)
      if (sErr) throw sErr

      const scoreMap: Record<string, any> = {}
      for (const s of (existingScores || [])) {
        scoreMap[s.student_id] = s
      }

      let updatedCount = 0
      let insertedCount = 0
      for (const attempt of attempts) {
        const studentId = attempt.student_id
        const score = Number(attempt.score) || 0
        const existing = scoreMap[studentId]
        const scoresJson: Record<string, any> = existing?.scores_json ? { ...existing.scores_json } : {}
        scoresJson[assessmentKey] = score

        // Recompute total
        let total = 0
        for (const k in scoresJson) {
          const v = scoresJson[k]
          if (typeof v === 'number') total += v
          else if (typeof v === 'string') total += Number(v) || 0
        }

        if (existing?.id) {
          const { error: upErr } = await dbProxy
            .from('scores')
            .update({ scores_json: scoresJson, total })
            .eq('id', existing.id)
          if (upErr) throw upErr
          updatedCount++
        } else {
          const { error: inErr } = await dbProxy
            .from('scores')
            .insert({
              school_id: schoolId,
              student_id: studentId,
              class_id: exam.class_id,
              subject_id: exam.subject_id,
              session_id: curSession.id,
              term_id: curTerm.id,
              scores_json: scoresJson,
              total,
            })
          if (inErr) throw inErr
          insertedCount++
        }
      }

      setResult(`Synced ${attempts.length} attempts. ${updatedCount} updated, ${insertedCount} inserted into scores table.`)
      setTimeout(() => onSynced(), 1500)
    } catch (e: any) {
      setError(e.message || 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">Sync to Scorebook</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-600">
            Copy CBT attempt scores into the regular scorebook for <span className="font-medium">{exam.title}</span>.
            Students' scores will be added to the selected assessment column.
          </p>
          {error && <div className="p-2 bg-red-50 text-red-700 text-sm rounded">{error}</div>}
          {result && <div className="p-2 bg-green-50 text-green-700 text-sm rounded">{result}</div>}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Assessment Column</label>
            <select
              value={assessmentKey}
              onChange={e => setAssessmentKey(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 outline-none transition"
            >
              <option value="exam">Exam (overwrite exam column)</option>
              <option value="ca1">CA1</option>
              <option value="ca2">CA2</option>
              <option value="assignment">Assignment</option>
              <option value="midterm">Mid-term</option>
              <option value="ca">CA (for BECE)</option>
            </select>
            <p className="text-xs text-gray-400 mt-1">Choose which assessment column to write scores into. Existing values in that column will be overwritten.</p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 p-5 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg">Cancel</button>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg text-sm font-medium hover:bg-cyan-700 transition disabled:opacity-50"
          >
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
      </div>
    </div>
  )
}

// =========================================================
// Confirm Dialog
// =========================================================
function ConfirmDialog({ title, message, confirmText, danger, onConfirm, onCancel }: {
  title: string
  message: string
  confirmText: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-start gap-3 mb-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${danger ? 'bg-red-100' : 'bg-yellow-100'}`}>
            <AlertCircle className={`w-5 h-5 ${danger ? 'text-red-600' : 'text-yellow-600'}`} />
          </div>
          <div>
            <h3 className="font-bold text-gray-800">{title}</h3>
            <p className="text-sm text-gray-500 mt-1">{message}</p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg">Cancel</button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-white rounded-lg text-sm font-medium transition ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-yellow-600 hover:bg-yellow-700'}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
