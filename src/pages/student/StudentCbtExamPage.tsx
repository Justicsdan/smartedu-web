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
    try {
      // Get correct answers to compute score
      let score = 0
      let totalMarks = 0
      let correct = 0, wrong = 0, unanswered = 0

      for (const q of questions) {
        const total = Number(q.marks) || 1
        totalMarks += total
        const ans = answers[q.id]
        if (!ans) {
          unanswered++
        } else if (ans.toLowerCase() === (q.correct_option || '').toLowerCase()) {
          score += total
          correct++
        } else {
          wrong++
        }
      }

      // Save attempt
      const { error: insertErr } = await dbProxy.from('cbt_attempts').insert({
        school_id: schoolId,
        exam_id: examId,
        student_id: studentId,
        answers: answers,
        score: score,
        total_marks: totalMarks,
        time_started: startTimeRef.current.toISOString(),
        time_submitted: new Date().toISOString(),
        is_submitted: true,
        attempt_number: 1,
      })
      if (insertErr) throw insertErr

      if (timerRef.current) clearInterval(timerRef.current)

      setResult({ score, total_marks: totalMarks, correct, wrong, unanswered })
      setSubmitted(true)
    } catch (e: any) {
      setError('Submission failed: ' + e.message)
    } finally {
      setSubmitting(false)
    }
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
      <div className="flex-1 flex flex-col items-center justify-center bg-white">
        <div className="w-10 h-10 border-4 border-[#0D47A1] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-gray-500">Loading exam...</p>
      </div>
    )
  }

  if (error && !submitted) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-white p-8">
        <AlertCircle size={64} className="text-red-300 mb-4" />
        <p className="text-red-500 text-center mb-6">{error}</p>
        <button onClick={() => navigate('/dashboard/student/cbt')} className="px-6 py-3 bg-[#0D47A1] text-white rounded-lg font-semibold">Go Back</button>
      </div>
    )
  }

  // Result screen
  if (submitted && result) {
    const showImmediate = exam?.show_result_immediately !== false
    if (!showImmediate) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center bg-white p-8">
          <CheckCircle size={72} className="text-[#2E7D32] mb-5" />
          <h1 className="text-2xl font-bold text-[#1B2A4A]">Exam Submitted!</h1>
          <p className="text-gray-500 text-center mt-3 max-w-sm">Your result will be available once published by your teacher.</p>
          <button onClick={() => navigate('/dashboard/student/cbt')} className="mt-8 px-8 py-3 bg-[#0D47A1] text-white rounded-lg font-semibold">Back to Exams</button>
        </div>
      )
    }
    const score = result.score || 0
    const total = result.total_marks || 0
    const pct = total > 0 ? ((score / total) * 100).toFixed(1) : '0.0'
    const passed = Number(pct) >= (Number(exam?.pass_mark) || 50)

    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-white p-8">
        {passed ? <CheckCircle size={72} className="text-[#2E7D32] mb-5" /> : <AlertCircle size={72} className="text-orange-300 mb-5" />}
        <h1 className="text-2xl font-bold text-[#1B2A4A]">Exam Submitted!</h1>
        <div className="mt-6 p-6 rounded-2xl bg-[#F8F9FA] text-center">
          <div className="text-4xl font-bold text-[#0D47A1]">{score} / {total}</div>
          <div className="text-lg text-gray-500 mt-1">{pct}%</div>
          <div className="flex justify-around mt-4">
            <div><div className="text-xl font-bold text-green-500">{result.correct}</div><div className="text-[12px] text-gray-400">Correct</div></div>
            <div><div className="text-xl font-bold text-red-500">{result.wrong}</div><div className="text-[12px] text-gray-400">Wrong</div></div>
            <div><div className="text-xl font-bold text-gray-400">{result.unanswered}</div><div className="text-[12px] text-gray-400">Skipped</div></div>
          </div>
        </div>
        <button onClick={() => navigate('/dashboard/student/cbt')} className="mt-8 px-8 py-3 bg-[#0D47A1] text-white rounded-lg font-semibold">Back to Exams</button>
      </div>
    )
  }

  // Exam UI
  const isLow = remainingSeconds > 0 && remainingSeconds <= 60
  const timerColor = remainingSeconds <= 0 ? '#EF4444' : isLow ? '#F97316' : '#1B2A4A'
  const q = questions[currentIndex]
  const selectedOpt = q ? answers[q.id] || '' : ''

  return (
    <div className="flex-1 flex flex-col bg-[#F8F9FA]" style={{ minHeight: 'calc(100vh - 72px)' }}>
      {/* Top bar */}
      <div className="bg-white px-4 py-3 shadow-sm flex items-center justify-between">
        <div className="px-3 py-1.5 rounded-lg flex items-center gap-2" style={{ backgroundColor: timerColor + '1A' }}>
          <Clock size={18} style={{ color: timerColor }} />
          <span className="text-base font-bold" style={{ color: timerColor, fontVariantNumeric: 'tabular-nums' }}>{formatTime(remainingSeconds)}</span>
        </div>
        <span className="text-sm font-semibold text-[#1B2A4A]">Question {currentIndex + 1} of {questions.length}</span>
        <span className="text-xs text-gray-400">{answeredCount} answered</span>
      </div>

      {/* Question area */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {questions.length === 0 ? (
          <p className="text-gray-400 text-center">No questions found.</p>
        ) : (
          <div className="max-w-2xl mx-auto">
            <p className="text-base font-semibold text-[#1B2A4A] leading-relaxed">{q.question_text}</p>
            {q.marks && <p className="text-xs text-gray-400 mt-2">{q.marks} mark{Number(q.marks) > 1 ? 's' : ''}</p>}
            <div className="mt-6 space-y-3">
              {['a', 'b', 'c', 'd'].map(opt => {
                const val = (q as any)['option_' + opt]
                if (!val) return null
                const isSelected = selectedOpt.toLowerCase() === opt
                return (
                  <button
                    key={opt}
                    onClick={() => selectOption(q.id, opt)}
                    className={'w-full text-left p-4 rounded-xl border transition ' + (isSelected ? 'border-[#0D47A1] border-2 bg-[#0D47A1]/8' : 'border-gray-200 bg-white hover:border-gray-300')}
                  >
                    <div className="flex items-center gap-3">
                      <div className={'w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold ' + (isSelected ? 'bg-[#0D47A1] text-white' : 'bg-gray-100 text-gray-500')}>
                        {opt.toUpperCase()}
                      </div>
                      <span className="text-[15px] text-[#1B2A4A] flex-1">{val}</span>
                      {isSelected && <CheckCircle size={20} className="text-[#0D47A1]" />}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div className="bg-white px-4 py-3 shadow-lg">
        {showNavGrid && (
          <div className="mb-3 p-3 rounded-xl bg-gray-50 border border-gray-200 flex flex-wrap gap-2 justify-center">
            {questions.map((qq, i) => {
              const isAnswered = !!answers[qq.id]
              const isCurrent = i === currentIndex
              return (
                <button
                  key={i}
                  onClick={() => { setCurrentIndex(i); setShowNavGrid(false) }}
                  className={'w-10 h-10 rounded-lg text-[13px] font-semibold border transition ' + (isCurrent ? 'bg-[#0D47A1] text-white border-[#0D47A1]' : isAnswered ? 'bg-[#2E7D32] text-white border-[#2E7D32]' : 'bg-white text-gray-500 border-gray-300')}
                >
                  {i + 1}
                </button>
              )
            })}
          </div>
        )}
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <button onClick={() => currentIndex > 0 && setCurrentIndex(currentIndex - 1)} disabled={currentIndex === 0} className="flex items-center gap-1 text-[#0D47A1] font-semibold text-sm disabled:opacity-30">
            <ChevronLeft size={18} /> Prev
          </button>
          <button onClick={() => setShowNavGrid(!showNavGrid)} className="flex items-center gap-1 text-gray-500 font-semibold text-sm">
            <Grid3x3 size={18} /> {answeredCount}/{questions.length}
          </button>
          <button onClick={() => setShowSubmitConfirm(true)} disabled={submitting} className="px-4 py-2 bg-[#2E7D32] text-white rounded-lg font-semibold text-sm disabled:opacity-50">
            {submitting ? <Loader2 size={16} className="animate-spin" /> : 'Submit'}
          </button>
          <button onClick={() => currentIndex < questions.length - 1 && setCurrentIndex(currentIndex + 1)} disabled={currentIndex === questions.length - 1} className="flex items-center gap-1 text-[#0D47A1] font-semibold text-sm disabled:opacity-30">
            Next <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Submit confirmation */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowSubmitConfirm(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Submit Exam?</h3>
            {questions.length - answeredCount > 0 && (
              <p className="text-sm text-gray-500 mb-4">You have {questions.length - answeredCount} unanswered question(s).</p>
            )}
            <div className="flex gap-3">
              <button onClick={() => setShowSubmitConfirm(false)} className="flex-1 h-12 rounded-lg border border-gray-300 text-gray-600 font-semibold text-sm">Cancel</button>
              <button onClick={() => submitExam(false)} className="flex-1 h-12 rounded-lg bg-[#2E7D32] text-white font-semibold text-sm">Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
