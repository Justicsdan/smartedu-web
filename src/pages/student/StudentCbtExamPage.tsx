import { useState, useEffect, useRef } from 'react'
import { dbProxy } from '../../lib/dbProxy'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Clock, ChevronLeft, ChevronRight, CheckCircle, XCircle,
  AlertCircle, Loader2, Grid3x3, PlayCircle,
} from 'lucide-react'

export default function StudentCbtExamPage() {
  const navigate = useNavigate()
  const { examId } = useParams()
  const user = JSON.parse(localStorage.getItem('smartedu_user') || '{}')
  const studentId = user.id || ''
  const schoolId = user.school_id || user.schoolId || ''

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exam, setExam] = useState<any>(null)
  const [questions, setQuestions] = useState<any[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [currentIndex, setCurrentIndex] = useState(0)
  const [remainingSeconds, setRemainingSeconds] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [showNavGrid, setShowNavGrid] = useState(false)
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false)
  const timerRef = useRef<any>(null)
  const startTimeRef = useRef<Date>(new Date())

  useEffect(() => {
    if (!examId) return
    startExam()
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [examId])

  const startExam = async () => {
    try {
      // Check if already attempted
      const existingRes = await dbProxy.from('cbt_attempts').select('id').eq('exam_id', examId).eq('student_id', studentId).eq('is_submitted', true)
      const existing = Array.isArray(existingRes.data) ? existingRes.data[0] : existingRes.data
      if (existing) {
        setError('You have already taken this exam.')
        setLoading(false)
        return
      }

      // Load exam
      const examRes = await dbProxy.from('cbt_exams').select('id, title, duration_minutes, total_questions, pass_mark, show_result_immediately').eq('id', examId).eq('school_id', schoolId).eq('is_active', true)
      const examData = Array.isArray(examRes.data) ? examRes.data[0] : examRes.data
      const examErr = examRes.error
      if (examErr || !examData) {
        setError('Exam not available')
        setLoading(false)
        return
      }
      setExam(examData)

      // Load questions
      const qRes = await dbProxy.from('cbt_questions').select('id, question_text, option_a, option_b, option_c, option_d, correct_option, marks, question_order').eq('exam_id', examId).eq('school_id', schoolId).order('question_order', { ascending: true })
      const qData = qRes.data
      const qErr = qRes.error
      if (qErr) throw qErr
      setQuestions(qData || [])

      // Start timer
      const duration = (examData.duration_minutes || 60) * 60
      setRemainingSeconds(duration)
      startTimeRef.current = new Date()

      timerRef.current = setInterval(() => {
        setRemainingSeconds(prev => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current)
            autoSubmit()
            return 0
          }
          return prev - 1
        })
      }, 1000)

      setLoading(false)
    } catch (e: any) {
      setError(e.message)
      setLoading(false)
    }
  }

  const autoSubmit = async () => {
    if (submitted || submitting) return
    if (Object.keys(answers).length > 0) {
      await submitExam(true)
    } else {
      setSubmitted(true)
      setError('Time expired with no answers submitted.')
    }
  }

  const submitExam = async (auto = false) => {
    if (submitting || submitted) return
    setSubmitting(true)
    setShowSubmitConfirm(false)

    let score = 0
    let totalMarks = 0
    let correct = 0, wrong = 0, unanswered = 0

    for (const q of questions) {
      const total = Number(q.marks) || 1
      totalMarks += total
      const ans = answers[q.id]
      if (!ans) { unanswered++ }
      else if (ans.toLowerCase() === (q.correct_option || '').toLowerCase()) { score += total; correct++ }
      else { wrong++ }
    }

    if (timerRef.current) clearInterval(timerRef.current)
    setResult({ score, total_marks: totalMarks, correct, wrong, unanswered })
    setSubmitted(true)
    setSubmitting(false)

    dbProxy.from('cbt_attempts').insert({
      school_id: schoolId, exam_id: examId, student_id: studentId,
      answers: answers, score: score, total_marks: totalMarks,
      time_started: startTimeRef.current.toISOString(),
      time_submitted: new Date().toISOString(),
      is_submitted: true, attempt_number: 1,
    }).then(({ error }) => { if (error) console.error('Save failed:', error) })
      .catch((e) => console.error('Save error:', e))
  }

  const formatTime = (s: number) => {
    if (s <= 0) return '00:00'
    const m = Math.floor(s / 60)
    const sec = s % 60
    return String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0')
  }

  const selectOption = (qId: string, option: string) => {
    if (submitted) return
    setAnswers(prev => ({ ...prev, [qId]: option }))
  }

  const answeredCount = Object.keys(answers).length

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
        <div className="w-14 h-14 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-5 shadow-lg shadow-emerald-500/20" />
        <p className="text-slate-600 font-semibold">Loading exam...</p>
      </div>
    )
  }

  if (error && !submitted) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-white to-red-50/30 p-8">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center mb-5 shadow-xl shadow-red-500/30">
          <AlertCircle size={36} className="text-white" />
        </div>
        <p className="text-slate-700 font-semibold text-center mb-6 max-w-sm">{error}</p>
        <button onClick={() => navigate('/dashboard/student/cbt')} className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold shadow-lg shadow-blue-500/30 hover:-translate-y-0.5 transition-all">Go Back</button>
      </div>
    )
  }

  // Result screen
  if (submitted && result) {
    const showImmediate = exam?.show_result_immediately !== false
    if (!showImmediate) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 p-8">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center mb-6 shadow-2xl shadow-emerald-500/30">
            <CheckCircle size={48} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 bg-clip-text text-transparent">Exam Submitted!</h1>
          <p className="text-slate-500 text-center mt-3 max-w-sm">Your result will be available once published by your teacher.</p>
          <button onClick={() => navigate('/dashboard/student/cbt')} className="mt-8 px-8 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold shadow-lg shadow-blue-500/30 hover:-translate-y-0.5 transition-all">Back to Exams</button>
        </div>
      )
    }
    const score = result.score || 0
    const total = result.total_marks || 0
    const pct = total > 0 ? ((score / total) * 100).toFixed(1) : '0.0'
    const passed = Number(pct) >= (Number(exam?.pass_mark) || 50)

    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 p-8">
        <div className={`w-24 h-24 rounded-3xl flex items-center justify-center mb-6 shadow-2xl ${passed ? 'bg-gradient-to-br from-emerald-500 to-green-600 shadow-emerald-500/30' : 'bg-gradient-to-br from-amber-500 to-orange-500 shadow-amber-500/30'}`}>
          {passed ? <CheckCircle size={48} className="text-white" /> : <AlertCircle size={48} className="text-white" />}
        </div>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 bg-clip-text text-transparent">Exam Submitted!</h1>
        <div className="mt-6 p-8 rounded-3xl bg-white/80 backdrop-blur-sm border border-slate-200/60 text-center shadow-xl w-full max-w-md">
          <div className="text-5xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">{score} <span className="text-2xl text-slate-400">/ {total}</span></div>
          <div className={`mt-2 inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${passed ? 'bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-700 border border-emerald-200' : 'bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 border border-amber-200'}`}>{pct}%</div>
          <div className="grid grid-cols-3 gap-3 mt-5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-100">
              <div className="text-xl font-bold text-emerald-600">{result.correct}</div>
              <div className="text-[10px] uppercase tracking-wider font-semibold text-emerald-700">Correct</div>
            </div>
            <div className="p-2 rounded-xl bg-gradient-to-br from-red-50 to-rose-50 border border-red-100">
              <div className="text-xl font-bold text-red-600">{result.wrong}</div>
              <div className="text-[10px] uppercase tracking-wider font-semibold text-red-700">Wrong</div>
            </div>
            <div className="p-2 rounded-xl bg-gradient-to-br from-slate-50 to-gray-50 border border-slate-200">
              <div className="text-xl font-bold text-slate-500">{result.unanswered}</div>
              <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-600">Skipped</div>
            </div>
          </div>
        </div>
        <button onClick={() => navigate('/dashboard/student/cbt')} className="mt-8 px-8 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold shadow-lg shadow-blue-500/30 hover:-translate-y-0.5 transition-all">Back to Exams</button>
      </div>
    )
  }

  // Exam UI
  const isLow = remainingSeconds > 0 && remainingSeconds <= 60
  const timerColor = remainingSeconds <= 0 ? '#EF4444' : isLow ? '#F97316' : '#1B2A4A'
  const q = questions[currentIndex]
  const selectedOpt = q ? answers[q.id] || '' : ''

  return (
    <div className="flex-1 flex flex-col bg-gradient-to-br from-slate-50 via-white to-emerald-50/30" style={{ minHeight: 'calc(100vh - 72px)' }}>
      {/* Top bar - premium */}
      <div className="bg-white/80 backdrop-blur-sm px-4 py-3 shadow-md flex items-center justify-between sticky top-0 z-10 border-b border-slate-200/60">
        <div className="px-3 py-1.5 rounded-full flex items-center gap-2 shadow-md" style={{ backgroundColor: timerColor + '1A', boxShadow: '0 4px 12px ' + timerColor + '30' }}>
          <Clock size={18} style={{ color: timerColor }} strokeWidth={2.4} />
          <span className="text-base font-bold" style={{ color: timerColor, fontVariantNumeric: 'tabular-nums' }}>{formatTime(remainingSeconds)}</span>
        </div>
        <span className="text-sm font-semibold text-slate-800">Question {currentIndex + 1} of {questions.length}</span>
        <span className="text-xs text-slate-500">{answeredCount} answered</span>
      </div>

      {/* Question area - premium */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {questions.length === 0 ? (
          <p className="text-slate-400 text-center">No questions found.</p>
        ) : (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg shadow-slate-200/40 border border-slate-200/60 p-6">
              <div className="flex items-start gap-3 mb-2">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 text-white font-bold flex items-center justify-center text-sm shadow-md shadow-emerald-500/30">{currentIndex + 1}</div>
                <p className="flex-1 text-base font-semibold text-slate-900 leading-relaxed tracking-tight">{q.question_text}</p>
              </div>
              {q.marks && <p className="text-xs text-slate-400 mt-2 ml-13">{q.marks} mark{Number(q.marks) > 1 ? 's' : ''}</p>}
            </div>
            <div className="mt-5 space-y-3">
              {['a', 'b', 'c', 'd'].map(opt => {
                const val = (q as any)['option_' + opt]
                if (!val) return null
                const isSelected = selectedOpt.toLowerCase() === opt
                return (
                  <button
                    key={opt}
                    onClick={() => selectOption(q.id, opt)}
                    className={'w-full text-left p-4 rounded-2xl border-2 transition-all flex items-center gap-3 ' + (isSelected ? 'border-emerald-500 bg-gradient-to-r from-emerald-50 to-green-50 shadow-md shadow-emerald-500/20' : 'border-slate-200 bg-white hover:border-emerald-300 hover:shadow-sm')}
                  >
                    <div className={'w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold transition-all ' + (isSelected ? 'bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-md shadow-emerald-500/30' : 'bg-slate-100 text-slate-600')}>
                      {opt.toUpperCase()}
                    </div>
                    <span className="text-[15px] text-slate-800 flex-1">{val}</span>
                    {isSelected && <CheckCircle size={20} className="text-emerald-600" strokeWidth={2.4} />}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bottom bar - premium */}
      <div className="sticky bottom-0 z-20 bg-white/95 backdrop-blur-md border-t-2 border-slate-200/80 px-4 py-4 shadow-2xl shadow-slate-300/40">
        {showNavGrid && (
          <div className="mb-3 p-3 rounded-2xl bg-slate-50/80 border border-slate-200/60 flex flex-wrap gap-2 justify-center">
            {questions.map((qq, i) => {
              const isAnswered = !!answers[qq.id]
              const isCurrent = i === currentIndex
              return (
                <button
                  key={i}
                  onClick={() => { setCurrentIndex(i); setShowNavGrid(false) }}
                  className={'w-10 h-10 rounded-lg text-[13px] font-semibold border transition-all hover:-translate-y-0.5 ' + (isCurrent ? 'bg-gradient-to-br from-emerald-500 to-green-600 text-white border-emerald-500 shadow-md shadow-emerald-500/30' : isAnswered ? 'bg-gradient-to-br from-emerald-100 to-green-100 text-emerald-700 border-emerald-200' : 'bg-white text-slate-500 border-slate-200')}
                >
                  {i + 1}
                </button>
              )
            })}
          </div>
        )}
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <button onClick={() => currentIndex > 0 && setCurrentIndex(currentIndex - 1)} disabled={currentIndex === 0} className="flex items-center gap-1 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-100 font-semibold text-sm disabled:opacity-30 transition">
            <ChevronLeft size={18} strokeWidth={2.4} /> Prev
          </button>
          <button onClick={() => setShowNavGrid(!showNavGrid)} className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold text-sm hover:bg-slate-200 transition">
            <Grid3x3 size={18} strokeWidth={2.2} /> {answeredCount}/{questions.length}
          </button>
          <button onClick={() => setShowSubmitConfirm(true)} disabled={submitting} className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-semibold text-sm shadow-lg shadow-emerald-500/30 hover:-translate-y-0.5 transition-all disabled:opacity-50">
            {submitting ? <Loader2 size={16} className="animate-spin" /> : 'Submit'}
          </button>
          <button onClick={() => currentIndex < questions.length - 1 && setCurrentIndex(currentIndex + 1)} disabled={currentIndex === questions.length - 1} className="flex items-center gap-1 px-4 py-2 rounded-xl bg-gradient-to-r from-slate-700 to-slate-800 text-white font-semibold text-sm shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-30">
            Next <ChevronRight size={18} strokeWidth={2.4} />
          </button>
        </div>
      </div>

      {/* Submit confirmation */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowSubmitConfirm(false)}>
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mb-4 mx-auto shadow-lg shadow-amber-500/30">
              <AlertCircle size={28} className="text-white" strokeWidth={2.2} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2 text-center tracking-tight">Submit Exam?</h3>
            {questions.length - answeredCount > 0 && (
              <p className="text-sm text-slate-500 mb-5 text-center">You have <b className="text-amber-700">{questions.length - answeredCount}</b> unanswered question(s).</p>
            )}
            <div className="flex gap-3">
              <button onClick={() => setShowSubmitConfirm(false)} className="flex-1 h-12 rounded-xl border border-slate-300 bg-white text-slate-700 font-semibold text-sm hover:bg-slate-50 transition">Cancel</button>
              <button onClick={() => submitExam(false)} className="flex-1 h-12 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-semibold text-sm shadow-lg shadow-emerald-500/30 transition">Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
