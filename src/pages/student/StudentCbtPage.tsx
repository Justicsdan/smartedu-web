import { useState, useEffect, useCallback, useRef } from 'react'
import { dbProxy } from '../../lib/dbProxy'
import { useAuth } from '../../contexts/AuthContext'
import {
  ClipboardList, Play, CheckCircle2, XCircle, Clock, AlertCircle, Loader2, RefreshCw,
  BookOpen, Timer, ChevronLeft, ChevronRight, Grid3x3, X, Award, Trophy,
  HelpCircle, Eye, Send, Lock, Inbox,
} from 'lucide-react'

function pickString(record: any, ...keys: string[]): string {
  for (const k of keys) {
    const v = record?.[k]
    if (v !== null && v !== undefined && String(v).trim() !== '') return String(v).trim()
  }
  return ''
}

function pickNumber(record: any, ...keys: string[]): number {
  for (const k of keys) {
    const v = record?.[k]
    if (v !== null && v !== undefined && !isNaN(Number(v))) return Number(v)
  }
  return 0
}

function formatDateTime(dateVal: any): string {
  if (!dateVal) return ''
  const d = new Date(dateVal)
  if (isNaN(d.getTime())) return String(dateVal)
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function formatTime(seconds: number): string {
  if (seconds <= 0) return '00:00'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function isExamActive(exam: any): boolean {
  const now = Date.now()
  const start = exam.start_time ? new Date(exam.start_time).getTime() : 0
  const end = exam.end_time ? new Date(exam.end_time).getTime() : Infinity
  return start <= now && now <= end
}

type Mode = 'list' | 'exam' | 'result'

export default function StudentCbtPage() {
  const { user } = useAuth() as { user: any }
  const [mode, setMode] = useState<Mode>('list')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [exams, setExams] = useState<any[]>([])
  const [attempts, setAttempts] = useState<Record<string, any>>({})
  const [activeExam, setActiveExam] = useState<any>(null)
  const [activeAttempt, setActiveAttempt] = useState<any>(null)
  const studentId = user?.id || user?.student_id || user?.studentId || ''
  const classId = user?.class_id || user?.classId || ''
  const schoolId = user?.school_id || user?.schoolId || ''

  const loadData = useCallback(async () => {
    if (!user) return
    setLoading(true); setError('')
    try {
      const { data: examData, error: examErr } = await dbProxy
        .from('cbt_exams')
        .select('*')
        .eq('class_id', classId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
      if (examErr) throw examErr
      const examList = (examData || []).map((e: any) => ({ ...e, subjects: null, classes: null }))
      const { data: attemptData, error: attemptErr } = await dbProxy
        .from('cbt_attempts')
        .select('*')
        .eq('student_id', studentId || user.id)
        .order('time_submitted', { ascending: false })
      if (!attemptErr && attemptData) {
        const map: Record<string, any> = {}
        attemptData.forEach((a) => {
          const eid = a.exam_id
          if (eid && !map[eid]) map[eid] = a
        })
        setAttempts(map)
      }
      setExams(examList)
    } catch (e: any) {
      console.error('CBT load error:', e)
      setError(e?.message || 'Failed to load CBT exams')
    } finally { setLoading(false) }
  }, [user, classId, studentId])

  useEffect(() => { loadData() }, [loadData])

  const startExam = (exam: any) => { setActiveExam(exam); setMode('exam') }
  const viewResult = (exam: any, attempt: any) => { setActiveExam(exam); setActiveAttempt(attempt); setMode('result') }
  const exitTo = (m: Mode) => {
    setMode(m); setActiveExam(null); setActiveAttempt(null)
    if (m === 'list') loadData()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-slate-600">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          <span className="text-sm font-medium">Loading CBT exams…</span>
        </div>
      </div>
    )
  }

  if (mode === 'exam' && activeExam) {
    return <ExamTakingView exam={activeExam} studentId={studentId || user.id} schoolId={schoolId}
      onExit={() => exitTo('list')}
      onViewResult={(attempt) => { setActiveAttempt(attempt); setMode('result') }} />
  }

  if (mode === 'result' && activeExam && activeAttempt) {
    return <ResultDetailView exam={activeExam} attempt={activeAttempt} onBack={() => exitTo('list')} />
  }

  return (
    <div className="px-3 sm:px-4 lg:px-6 py-4 sm:py-6 max-w-4xl mx-auto space-y-5 bg-gradient-to-br from-slate-50 via-white to-emerald-50/40 min-h-screen">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              CBT Center
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 bg-clip-text text-transparent">CBT Exams</h1>
          <p className="mt-1.5 text-sm text-slate-500">{exams.length} exam{exams.length !== 1 ? 's' : ''} available</p>
        </div>
        <button onClick={loadData} disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 transition text-slate-700 font-semibold text-sm shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all">
          <RefreshCw size={14} strokeWidth={2.2} className={loading ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-800">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <div className="font-semibold">Couldn't load CBT exams</div>
            <div className="text-red-700/90 text-xs mt-0.5">{error}</div>
          </div>
        </div>
      )}

      {exams.length === 0 && !error && (
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-slate-200/60 p-12 flex flex-col items-center justify-center text-center shadow-lg shadow-slate-200/40 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/40 via-transparent to-cyan-50/40 pointer-events-none"></div>
          <div className="relative">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-emerald-500 to-cyan-600 rounded-3xl flex items-center justify-center mb-5 shadow-xl shadow-emerald-500/30">
              <Inbox size={36} strokeWidth={2} className="text-white" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">No CBT exams available</h3>
            <p className="mt-2 text-sm text-slate-500 max-w-xs mx-auto">Your exams will appear here when teachers create them.</p>
          </div>
        </div>
      )}

      {exams.length > 0 && (
        <div className="space-y-3">
          {exams.map((exam) => {
            const examId = exam.id
            const attempt = attempts[examId]
            const alreadyTaken = !!attempt
            const isActive = isExamActive(exam)
            const score = pickNumber(attempt, 'score')
            const totalMarks = pickNumber(attempt, 'total_marks')
            const pct = totalMarks > 0 ? (score / totalMarks) * 100 : 0
            const passMark = pickNumber(exam, 'pass_mark') || 50
            const passed = alreadyTaken && pct >= passMark
            const subj = exam.subjects || {}
            const cls = exam.classes || {}
            const subjectName = subj.name || subj.code || 'Subject'
            const className = cls.name ? (cls.section ? `${cls.name} ${cls.section}` : cls.name) : ''
            const duration = pickNumber(exam, 'duration_minutes') || 60
            const totalQuestions = pickNumber(exam, 'total_questions')
            const statusMeta = alreadyTaken
              ? (passed ? { label: 'Passed', color: '#10b981', bg: '#ecfdf5', icon: CheckCircle2 }
                        : { label: 'Failed', color: '#f59e0b', bg: '#fffbeb', icon: XCircle })
              : isActive
                ? { label: 'Available', color: '#10b981', bg: '#ecfdf5', icon: Play }
                : { label: 'Upcoming', color: '#64748b', bg: '#f1f5f9', icon: Lock }
            const Icon = statusMeta.icon
            return (
              <article key={examId} className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg shadow-slate-200/40 hover:shadow-xl hover:shadow-slate-300/40 border-2 overflow-hidden transition-all duration-200 hover:-translate-y-0.5"
                style={{ borderColor: alreadyTaken ? statusMeta.color + '40' : isActive ? '#10b98140' : '#e2e8f0' }}>
                <div className="flex items-start gap-3 px-4 sm:px-5 py-4 border-b border-slate-100">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center shadow-md"
                    style={{ background: alreadyTaken ? (passed ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #f59e0b, #d97706)') : isActive ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #94a3b8, #64748b)', boxShadow: '0 4px 12px ' + (alreadyTaken ? (passed ? '#10b98140' : '#f59e0b40') : isActive ? '#10b98140' : '#94a3b840') }}>
                    <Icon size={20} strokeWidth={2.2} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-slate-900 tracking-tight break-words">
                        {pickString(exam, 'title', 'name') || 'CBT Exam'}
                      </h3>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider"
                        style={{ backgroundColor: statusMeta.bg, color: statusMeta.color }}>
                        {statusMeta.label}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                        <BookOpen size={10} strokeWidth={2.2} />{subjectName}
                      </span>
                      {className && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">{className}</span>
                      )}
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                      <span className="inline-flex items-center gap-1">
                        <Timer size={12} className="text-orange-500" strokeWidth={2.2} />
                        <span className="font-medium text-orange-700">{duration} min</span>
                      </span>
                      {totalQuestions > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <HelpCircle size={12} className="text-slate-400" strokeWidth={2.2} />
                          <span>{totalQuestions} questions</span>
                        </span>
                      )}
                      {alreadyTaken && totalMarks > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <Award size={12} className="text-blue-500" strokeWidth={2.2} />
                          <span className="font-medium text-blue-700">Total: {totalMarks} marks</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {alreadyTaken && (
                  <div className="px-4 sm:px-5 py-3 bg-slate-50/60 border-t border-slate-100">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">Your Score</div>
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-bold text-blue-700">{score}</span>
                            <span className="text-sm text-slate-500">/ {totalMarks}</span>
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold"
                              style={{ backgroundColor: passed ? '#ecfdf5' : '#fffbeb', color: passed ? '#059669' : '#d97706' }}>
                              {pct.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        {attempt.time_submitted && (
                          <div className="hidden sm:block ml-4 pl-4 border-l border-slate-200">
                            <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">Submitted</div>
                            <div className="text-xs text-slate-600">{formatDateTime(attempt.time_submitted)}</div>
                          </div>
                        )}
                      </div>
                      <button onClick={() => viewResult(exam, attempt)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white text-xs font-semibold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all">
                        <Eye size={13} strokeWidth={2.4} />View Results
                      </button>
                    </div>
                  </div>
                )}

                {!alreadyTaken && (
                  <div className="px-4 sm:px-5 py-3 border-t border-slate-100 flex items-center justify-end">
                    {isActive ? (
                      <button onClick={() => startExam(exam)}
                        className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white text-sm font-bold shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/40 hover:-translate-y-0.5 transition-all">
                        <Play size={14} strokeWidth={2.4} />Start Exam
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-500 text-xs font-semibold">
                        <Lock size={12} strokeWidth={2.2} />Not Available Yet
                      </span>
                    )}
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ExamTakingView({ exam, studentId, schoolId, onExit, onViewResult }: {
  exam: any; studentId: string; schoolId: string;
  onExit: () => void; onViewResult: (attempt: any) => void
}) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [questions, setQuestions] = useState<any[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [currentIndex, setCurrentIndex] = useState(0)
  const [remaining, setRemaining] = useState(pickNumber(exam, 'duration_minutes') * 60 || 3600)
  const [submitting, setSubmitting] = useState(false)
  const [showNavGrid, setShowNavGrid] = useState(false)
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const [submittedAttempt, setSubmittedAttempt] = useState<any>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const loadQuestions = async () => {
      try {
        const { data, error: qErr } = await dbProxy
          .from('cbt_questions').select('*')
          .eq('exam_id', exam.id)
          .order('question_order', { ascending: true })
        if (qErr) throw qErr
        setQuestions(data || [])
      } catch (e: any) {
        console.error('Question load error:', e)
        setError(e?.message || 'Failed to load questions')
      } finally { setLoading(false) }
    }
    loadQuestions()
  }, [exam.id])

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          if (timerRef.current) clearInterval(timerRef.current)
          handleSubmit(true)
          return 0
        }
        return r - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = async (autoSubmitted = false) => {
    if (submitting) return
    setSubmitting(true)
    if (timerRef.current) clearInterval(timerRef.current)
    try {
      const totalMarks = questions.reduce((s, q) => s + pickNumber(q, 'marks'), 0)
      let score = 0
      questions.forEach((q) => {
        const ans = answers[q.id]
        if (ans && ans.toLowerCase() === (q.correct_option || '').toLowerCase()) {
          score += pickNumber(q, 'marks')
        }
      })
      const attemptPayload = {
        exam_id: exam.id, student_id: studentId, school_id: schoolId,
        answers: answers, score, total_marks: totalMarks,
        time_started: new Date(Date.now() - (pickNumber(exam, 'duration_minutes') * 60 - remaining) * 1000).toISOString(),
        time_submitted: new Date().toISOString(),
        is_submitted: true,
        attempt_number: 1,
      }
      
      // 1. Update UI instantly with local data (no waiting for database)
      setSubmittedAttempt(attemptPayload)
      
      // 2. Save to database in the background
      const insRes = await dbProxy.from('cbt_attempts').insert(attemptPayload).select()
      const insErr = insRes.error
      if (insErr) throw insErr
    } catch (e: any) {
      console.error('Submit error:', e)
      setError(e?.message || 'Failed to submit exam')
    } finally { setSubmitting(false) }
  }

  const selectOption = (questionId: string, option: string) => {
    if (submittedAttempt) return
    setAnswers((prev) => ({ ...prev, [questionId]: option }))
  }

  const goToQuestion = (idx: number) => { setCurrentIndex(idx); setShowNavGrid(false) }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="flex flex-col items-center gap-3 text-slate-600">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          <span className="text-sm font-medium">Loading exam…</span>
        </div>
      </div>
    )
  }

  if (error && !submittedAttempt) {
    return (
      <div className="flex items-center justify-center min-h-[80vh] px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-red-200 p-8 max-w-md text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center text-red-600 mx-auto mb-4">
            <AlertCircle size={28} strokeWidth={2} />
          </div>
          <h3 className="text-base font-bold text-slate-900">Couldn't start exam</h3>
          <p className="mt-1 text-sm text-slate-600">{error}</p>
          <button onClick={onExit}
            className="mt-4 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm">Go Back</button>
        </div>
      </div>
    )
  }

  if (submittedAttempt) {
    const score = pickNumber(submittedAttempt, 'score')
    const total = pickNumber(submittedAttempt, 'total_marks')
    const pct = total > 0 ? (score / total) * 100 : 0
    const passMark = pickNumber(exam, 'pass_mark') || 50
    const passed = pct >= passMark
    return (
      <div className="flex items-center justify-center min-h-[80vh] px-4 py-8 bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-slate-200/60 p-8 max-w-md w-full text-center relative overflow-hidden">
          <div className={`absolute inset-0 ${passed ? 'bg-gradient-to-br from-emerald-50/40 via-transparent to-green-50/40' : 'bg-gradient-to-br from-amber-50/40 via-transparent to-orange-50/40'} pointer-events-none`}></div>
          <div className="relative">
            <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-xl ${passed ? 'bg-gradient-to-br from-emerald-500 to-green-600 shadow-emerald-500/30' : 'bg-gradient-to-br from-amber-500 to-orange-500 shadow-amber-500/30'}`}>
              {passed ? <Trophy size={36} strokeWidth={2} className="text-white" /> : <RefreshCw size={36} strokeWidth={2} className="text-white" />}
            </div>
            <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 bg-clip-text text-transparent">{passed ? 'PASSED' : 'NOT YET'}</h2>
            <p className="mt-2 text-sm text-slate-500">
              {submittedAttempt.auto_submitted ? 'Time expired — auto-submitted' : 'Exam submitted successfully'}
            </p>
            <div className="mt-6 py-5 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-2xl border border-slate-200/60">
              <div className="text-5xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">{score} <span className="text-2xl text-slate-400">/ {total}</span></div>
              <div className={`mt-2 inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${passed ? 'bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-700 border border-emerald-200' : 'bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 border border-amber-200'}`}>
                {pct.toFixed(1)}%
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button onClick={onExit}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 font-semibold text-sm hover:bg-slate-50 hover:shadow-md transition">Back to Exams</button>
              <button onClick={() => onViewResult(submittedAttempt)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold text-sm shadow-lg shadow-blue-500/30 hover:-translate-y-0.5 transition-all">View Details</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const isLow = remaining > 0 && remaining <= 60
  const isExpired = remaining <= 0
  const timerColor = isExpired ? '#ef4444' : isLow ? '#f59e0b' : '#1e7a3c'
  const currentQ = questions[currentIndex]
  const answeredCount = Object.keys(answers).length

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 flex flex-col">
      <div className="bg-white/80 backdrop-blur-sm shadow-md border-b border-slate-200/60 px-4 py-3 flex items-center justify-between gap-3 sticky top-0 z-10">
        <button onClick={() => setShowExitConfirm(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition">
          <ChevronLeft size={16} strokeWidth={2.4} />
          <span className="hidden sm:inline">Exit</span>
        </button>
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full shadow-md" style={{ backgroundColor: timerColor + '15', boxShadow: '0 4px 12px ' + timerColor + '30' }}>
          <Timer size={16} style={{ color: timerColor }} strokeWidth={2.4} />
          <span className="font-bold text-sm tabular-nums" style={{ color: timerColor }}>{formatTime(remaining)}</span>
        </div>
        <div className="text-sm">
          <span className="font-bold text-slate-900">Q{currentIndex + 1}</span>
          <span className="text-slate-400"> / {questions.length}</span>
        </div>
        <div className="text-xs text-slate-500 hidden sm:block">{answeredCount} answered</div>
      </div>

      <div className="flex-1 px-4 sm:px-6 py-6 max-w-3xl mx-auto w-full">
        {questions.length === 0 ? (
          <div className="text-center py-16 text-slate-400">No questions found for this exam.</div>
        ) : (
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg shadow-slate-200/40 border border-slate-200/60 p-5 sm:p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 text-white font-bold flex items-center justify-center text-sm shadow-md shadow-emerald-500/30">{currentIndex + 1}</div>
              <h2 className="flex-1 text-base sm:text-lg font-semibold text-slate-900 leading-relaxed tracking-tight">{currentQ?.question_text || ''}</h2>
              {currentQ?.marks && (
                <span className="flex-shrink-0 px-2 py-1 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold uppercase">{currentQ.marks} mark{currentQ.marks !== 1 ? 's' : ''}</span>
              )}
            </div>
            <div className="space-y-2.5 mt-4">
              {['a', 'b', 'c', 'd'].map((opt) => {
                const text = currentQ?.[`option_${opt}`]
                if (!text) return null
                const isSelected = answers[currentQ?.id] === opt
                return (
                  <button key={opt} onClick={() => selectOption(currentQ.id, opt)}
                    className={`w-full text-left px-4 py-3.5 rounded-xl border-2 transition-all flex items-center gap-3 ${
                      isSelected ? 'border-emerald-500 bg-gradient-to-r from-emerald-50 to-green-50 shadow-md shadow-emerald-500/20' : 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-slate-50 hover:shadow-sm'
                    }`}>
                    <span className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold transition-all ${
                      isSelected ? 'bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-md shadow-emerald-500/30' : 'bg-slate-100 text-slate-600'
                    }`}>{opt.toUpperCase()}</span>
                    <span className="flex-1 text-sm sm:text-base text-slate-800">{text}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white/80 backdrop-blur-sm border-t border-slate-200/60 px-4 py-3 flex items-center justify-between gap-3 shadow-lg shadow-slate-200/40">
        <button onClick={() => goToQuestion(Math.max(0, currentIndex - 1))} disabled={currentIndex === 0}
          className="inline-flex items-center gap-1 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold text-sm hover:bg-slate-50 hover:shadow-md transition disabled:opacity-40 disabled:cursor-not-allowed">
          <ChevronLeft size={14} strokeWidth={2.4} />
          <span className="hidden sm:inline">Prev</span>
        </button>
        <button onClick={() => setShowNavGrid(!showNavGrid)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold text-sm hover:bg-slate-200 transition">
          <Grid3x3 size={14} strokeWidth={2.2} />
          <span className="hidden sm:inline">Navigator</span>
        </button>
        {currentIndex < questions.length - 1 ? (
          <button onClick={() => goToQuestion(currentIndex + 1)}
            className="inline-flex items-center gap-1 px-5 py-2 rounded-xl bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 text-white font-semibold text-sm shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all">
            <span className="hidden sm:inline">Next</span>
            <ChevronRight size={14} strokeWidth={2.4} />
          </button>
        ) : (
          <button onClick={() => handleSubmit(false)} disabled={submitting}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-semibold text-sm shadow-lg shadow-emerald-500/30 hover:-translate-y-0.5 transition-all disabled:opacity-50">
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} strokeWidth={2.4} />}Submit
          </button>
        )}
      </div>

      {showNavGrid && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4" onClick={() => setShowNavGrid(false)}>
          <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
                  <Grid3x3 size={18} strokeWidth={2.2} />
                </div>
                <h3 className="text-base font-bold text-slate-900">Question Navigator</h3>
              </div>
              <button onClick={() => setShowNavGrid(false)} className="p-1.5 rounded-md text-slate-500 hover:bg-slate-200"><X size={18} /></button>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-5 gap-2">
                {questions.map((q, i) => {
                  const isAnswered = !!answers[q.id]
                  const isCurrent = i === currentIndex
                  return (
                    <button key={q.id} onClick={() => goToQuestion(i)}
                      className={`aspect-square rounded-lg font-bold text-sm transition ${
                        isCurrent ? 'bg-emerald-600 text-white ring-2 ring-emerald-300'
                          : isAnswered ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}>{i + 1}</button>
                  )
                })}
              </div>
              <div className="mt-4 flex items-center justify-center gap-4 text-xs text-slate-600">
                <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-600" />Current</span>
                <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-100" />Answered</span>
                <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-slate-100" />Unanswered</span>
              </div>
              <button onClick={() => handleSubmit(false)} disabled={submitting}
                className="mt-5 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm disabled:opacity-50">
                {submitting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} strokeWidth={2.4} />}
                Submit Exam ({answeredCount}/{questions.length} answered)
              </button>
            </div>
          </div>
        </div>
      )}

      {showExitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={() => setShowExitConfirm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-4 mx-auto">
              <AlertCircle size={24} strokeWidth={2} />
            </div>
            <h3 className="text-base font-bold text-slate-900 text-center">Leave Exam?</h3>
            <p className="mt-1 text-sm text-slate-600 text-center">Your progress will be lost if you leave now.</p>
            <div className="mt-5 flex gap-3">
              <button onClick={() => setShowExitConfirm(false)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-semibold text-sm hover:bg-slate-50">Stay</button>
              <button onClick={onExit}
                className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-sm shadow-sm">Leave</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ResultDetailView({ exam, attempt, onBack }: { exam: any; attempt: any; onBack: () => void }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [questions, setQuestions] = useState<any[]>([])

  useEffect(() => {
    const loadQuestions = async () => {
      try {
        const { data, error: qErr } = await dbProxy
          .from('cbt_questions').select('*')
          .eq('exam_id', exam.id)
          .order('question_order', { ascending: true })
        if (qErr) throw qErr
        setQuestions(data || [])
      } catch (e: any) {
        console.error('Result detail load error:', e)
        setError(e?.message || 'Failed to load questions')
      } finally { setLoading(false) }
    }
    loadQuestions()
  }, [exam.id])

  const score = pickNumber(attempt, 'score')
  const total = pickNumber(attempt, 'total_marks')
  const pct = total > 0 ? (score / total) * 100 : 0
  const passMark = pickNumber(exam, 'pass_mark') || 50
  const passed = pct >= passMark

  const getAns = (qId: string): string | null => {
    const a = attempt.answers
    if (!a) return null
    if (typeof a === 'object') {
      const v = (a as any)[qId]
      return v ? String(v) : null
    }
    return null
  }

  let cc = 0, wc = 0, sc = 0
  questions.forEach((q) => {
    const a = getAns(q.id)
    if (!a) sc++
    else if (a.toLowerCase() === (q.correct_option || '').toLowerCase()) cc++
    else wc++
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-slate-600">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          <span className="text-sm font-medium">Loading results…</span>
        </div>
      </div>
    )
  }

  return (
    <div className="px-3 sm:px-4 lg:px-6 py-4 sm:py-6 max-w-4xl mx-auto space-y-5 bg-gradient-to-br from-slate-50 via-white to-emerald-50/40 min-h-screen">
      <div className="flex items-center justify-between gap-4">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition">
          <ChevronLeft size={16} strokeWidth={2.4} />Back to Exams
        </button>
      </div>

      <div className="rounded-3xl shadow-2xl overflow-hidden relative"
        style={{ background: passed ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #ea580c 0%, #f59e0b 100%)', boxShadow: passed ? '0 20px 50px -10px rgba(16, 185, 129, 0.4)' : '0 20px 50px -10px rgba(245, 158, 11, 0.4)' }}>
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/10 pointer-events-none"></div>
        <div className="relative px-5 sm:px-6 py-8 text-center text-white">
          <div className="inline-flex items-center gap-2 text-sm font-bold tracking-widest uppercase opacity-90">
            {passed ? <Trophy size={16} strokeWidth={2.4} /> : <RefreshCw size={16} strokeWidth={2.4} />}
            {passed ? 'Passed' : 'Not Yet'}
          </div>
          <div className="mt-3 text-4xl sm:text-5xl font-bold">{score} <span className="text-2xl opacity-80">/ {total}</span></div>
          <div className="mt-1 text-base opacity-90">{pct.toFixed(1)}%</div>
          <div className="mt-5 grid grid-cols-3 gap-3 max-w-sm mx-auto">
            <div>
              <CheckCircle2 size={20} className="mx-auto mb-1" />
              <div className="text-xl font-bold">{cc}</div>
              <div className="text-[10px] uppercase tracking-wider opacity-80">Correct</div>
            </div>
            <div>
              <XCircle size={20} className="mx-auto mb-1" />
              <div className="text-xl font-bold">{wc}</div>
              <div className="text-[10px] uppercase tracking-wider opacity-80">Wrong</div>
            </div>
            <div>
              <Clock size={20} className="mx-auto mb-1" />
              <div className="text-xl font-bold">{sc}</div>
              <div className="text-[10px] uppercase tracking-wider opacity-80">Skipped</div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-800">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">{error}</div>
        </div>
      )}

      <div>
        <h3 className="text-base font-bold text-slate-900 tracking-tight mb-3">{questions.length} Question{questions.length !== 1 ? 's' : ''}</h3>
        <div className="space-y-3">
          {questions.map((q, i) => {
            const ans = getAns(q.id)
            const correct = (q.correct_option || '').toLowerCase()
            const isCorrect = ans && ans.toLowerCase() === correct
            const isSkipped = !ans
            const marks = pickNumber(q, 'marks') || 1
            const color = isSkipped ? '#64748b' : isCorrect ? '#10b981' : '#ef4444'
            const bg = isSkipped ? '#f1f5f9' : isCorrect ? '#ecfdf5' : '#fef2f2'
            const Icon = isSkipped ? Clock : isCorrect ? CheckCircle2 : XCircle
            return (
              <div key={q.id} className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg shadow-slate-200/40 border-2 p-4 sm:p-5 hover:shadow-xl transition-all" style={{ borderColor: color + '40' }}>
                <div className="flex items-start gap-3 mb-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shadow-md" style={{ background: isSkipped ? 'linear-gradient(135deg, #94a3b8, #64748b)' : isCorrect ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #ef4444, #dc2626)', color: 'white', boxShadow: '0 4px 12px ' + color + '40' }}>{i + 1}</div>
                  <h4 className="flex-1 text-sm font-semibold text-slate-900 leading-relaxed tracking-tight">{q.question_text}</h4>
                  <Icon size={18} style={{ color }} strokeWidth={2.4} className="flex-shrink-0 mt-0.5" />
                </div>
                <div className="space-y-1.5 ml-12">
                  {['a', 'b', 'c', 'd'].map((opt) => {
                    const text = q[`option_${opt}`]
                    if (!text) return null
                    const isStudent = ans?.toLowerCase() === opt
                    const isCorrectOpt = correct === opt
                    let style: React.CSSProperties = { backgroundColor: '#f8fafc', borderColor: '#e2e8f0', color: '#475569' }
                    if (isCorrectOpt && isStudent) { style = { backgroundColor: '#ecfdf5', borderColor: '#10b981', color: '#065f46' } }
                    else if (isStudent && !isCorrectOpt) { style = { backgroundColor: '#fef2f2', borderColor: '#ef4444', color: '#991b1b' } }
                    else if (isCorrectOpt) { style = { backgroundColor: '#ecfdf5', borderColor: '#6ee7b7', color: '#047857' } }
                    return (
                      <div key={opt} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs mr-1.5 mb-1.5" style={style}>
                        <span className="font-bold">{opt.toUpperCase()}.</span>
                        <span>{text}</span>
                        {isCorrectOpt && isStudent && <CheckCircle2 size={11} strokeWidth={2.4} />}
                        {isStudent && !isCorrectOpt && <XCircle size={11} strokeWidth={2.4} />}
                      </div>
                    )
                  })}
                </div>
                <div className="mt-3 ml-12 flex items-center justify-between text-xs">
                  <div>
                    {isSkipped ? <span className="italic text-slate-500">Not answered</span>
                      : <span className="font-semibold" style={{ color }}>Your answer: {ans?.toUpperCase()}</span>}
                    {!isCorrect && !isSkipped && <span className="ml-3 font-semibold text-emerald-700">Correct: {correct.toUpperCase()}</span>}
                  </div>
                  <span className="text-slate-400">{marks} mark{marks !== 1 ? 's' : ''}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
