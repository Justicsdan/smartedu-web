import { useState, useEffect, useCallback } from 'react'
import { dbProxy } from '../../lib/dbProxy'
import { useAuth } from '../../contexts/AuthContext'
import {
  FileText, Plus, AlertCircle, Award, Loader2, Trash2, X, Save,
  Eye, EyeOff, Users, Clock, BookOpen, Play,
} from 'lucide-react'

export default function TertiaryExamsPage() {
  const { user } = useAuth() as { user: any }
  const isLecturer = user?.role === 'teacher'
  const lecturerId = user?.id || user?.teacher_id || user?.teacherId || ''
  const schoolId = user?.school_id || user?.schoolId || (!isLecturer ? user?.id : '') || ''
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [exams, setExams] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [attemptCounts, setAttemptCounts] = useState<Record<string, number>>({})
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    title: '', course_id: '', duration_minutes: 60, total_questions: 30,
    pass_mark: 40, is_active: false, instructions: '',
  })

  const load = useCallback(async () => {
    if (!schoolId) { setError('No school ID'); setLoading(false); return }
    setLoading(true); setError('')
    try {
      const [exRes, crsRes] = await Promise.all([
        dbProxy.from('cbt_exams').select('*').eq('school_id', schoolId).order('created_at', { ascending: false }),
        dbProxy.from('uni_courses').select('*').eq('school_id', schoolId).order('course_code'),
      ])
      setExams(exRes.data || [])
      const rawCourses = crsRes.data || []
      const hasAssignment = rawCourses.some((c: any) => Boolean(c.lecturer_id) || Boolean(c.teacher_id))
      const scopedCourses =
        isLecturer && lecturerId && hasAssignment
          ? rawCourses.filter((c: any) => c.lecturer_id === lecturerId || c.teacher_id === lecturerId)
          : rawCourses
      setCourses(scopedCourses)
      // Load attempt counts
      if ((exRes.data || []).length > 0) {
        const examIds = (exRes.data || []).map((e: any) => e.id)
        const { data: attRows } = await dbProxy.from('cbt_attempts').select('exam_id').in('exam_id', examIds)
        const counts: Record<string, number> = {}
        for (const r of (attRows || [])) counts[r.exam_id] = (counts[r.exam_id] || 0) + 1
        setAttemptCounts(counts)
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [schoolId])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    if (!form.title.trim() || !form.course_id) {
      setError('Title and course are required')
      return
    }
    setError(''); setSuccess('')
    try {
      const { error } = await dbProxy.from('cbt_exams').insert({
        school_id: schoolId,
        title: form.title.trim(),
        course_id: form.course_id,
        class_id: null,
        duration_minutes: Number(form.duration_minutes) || 60,
        total_questions: Number(form.total_questions) || 30,
        pass_mark: Number(form.pass_mark) || 40,
        is_active: form.is_active,
        instructions: form.instructions,
      })
      if (error) throw error
      setSuccess('Exam created')
      setShowForm(false)
      setForm({ title: '', course_id: '', duration_minutes: 60, total_questions: 30, pass_mark: 40, is_active: false, instructions: '' })
      load()
    } catch (e: any) {
      setError(e?.message || 'Save failed')
    }
  }

  const toggleActive = async (examId: string, current: boolean) => {
    try {
      await dbProxy.from('cbt_exams').update({ is_active: !current }).eq('id', examId)
      setSuccess(!current ? 'Exam activated' : 'Exam deactivated')
      load()
    } catch (e: any) {
      setError(e?.message || 'Toggle failed')
    }
  }

  const handleDelete = async (examId: string) => {
    if (!confirm('Delete this exam? All questions and attempts will be lost.')) return
    try {
      await dbProxy.from('cbt_questions').delete().eq('exam_id', examId)
      await dbProxy.from('cbt_attempts').delete().eq('exam_id', examId)
      await dbProxy.from('cbt_exams').delete().eq('id', examId)
      setSuccess('Exam deleted')
      load()
    } catch (e: any) {
      setError(e?.message || 'Delete failed')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-gradient-to-br from-slate-50 via-white to-violet-50/30">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 border-4 border-violet-500 border-t-transparent rounded-full animate-spin shadow-lg shadow-violet-500/20" />
          <span className="text-sm font-semibold text-slate-700">Loading exams...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="px-3 sm:px-4 lg:px-6 py-4 sm:py-6 max-w-6xl mx-auto space-y-5 bg-gradient-to-br from-slate-50 via-white to-violet-50/30 min-h-screen">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-[10px] font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse"></span>
              University
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 bg-clip-text text-transparent">University Exams</h1>
          <p className="text-sm text-slate-500 mt-1.5">Computer-based tests for course assessments</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white text-sm font-bold shadow-lg shadow-violet-500/30 hover:-translate-y-0.5 transition-all">
          <Plus size={14} strokeWidth={2.4} /> New Exam
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-800">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          <p className="text-sm flex-1">{error}</p>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800">
          <Award size={18} className="flex-shrink-0 mt-0.5" />
          <p className="text-sm flex-1">{success}</p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-4 shadow-lg shadow-slate-200/40">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 shadow-md" style={{ background: 'linear-gradient(135deg, #8B5CF6, #7c3aed)', boxShadow: '0 4px 12px rgba(139, 92, 246, 0.4)' }}>
            <FileText size={18} strokeWidth={2.2} className="text-white" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{exams.length}</div>
          <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 mt-0.5">Total Exams</div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-4 shadow-lg shadow-slate-200/40">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 shadow-md" style={{ background: 'linear-gradient(135deg, #10B981, #059669)', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)' }}>
            <Play size={18} strokeWidth={2.2} className="text-white" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{exams.filter(e => e.is_active).length}</div>
          <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 mt-0.5">Active</div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-4 shadow-lg shadow-slate-200/40">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 shadow-md" style={{ background: 'linear-gradient(135deg, #F59E0B, #d97706)', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.4)' }}>
            <Users size={18} strokeWidth={2.2} className="text-white" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{Object.values(attemptCounts).reduce((a, b) => a + b, 0)}</div>
          <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 mt-0.5">Attempts</div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-4 shadow-lg shadow-slate-200/40">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 shadow-md" style={{ background: 'linear-gradient(135deg, #3B82F6, #2563eb)', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)' }}>
            <BookOpen size={18} strokeWidth={2.2} className="text-white" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{courses.length}</div>
          <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 mt-0.5">Courses</div>
        </div>
      </div>

      {exams.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-slate-200/60 py-20 text-center shadow-lg shadow-slate-200/40">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-violet-500 to-purple-600 rounded-3xl flex items-center justify-center mb-5 shadow-xl shadow-violet-500/30">
            <FileText size={36} className="text-white" strokeWidth={2} />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2 tracking-tight">No Exams Yet</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">Click "New Exam" to create your first CBT for a course.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {exams.map(exam => {
            const course = courses.find(c => c.id === exam.course_id)
            const attempts = attemptCounts[exam.id] || 0
            return (
              <div key={exam.id} className={`bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/60 overflow-hidden shadow-lg shadow-slate-200/40 ${exam.is_active ? 'ring-1 ring-violet-500/20' : ''}`}>
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md ${exam.is_active ? 'bg-gradient-to-br from-emerald-500 to-green-600 shadow-emerald-500/30' : 'bg-gradient-to-br from-slate-300 to-slate-400 shadow-slate-400/30'}`}>
                      <FileText size={20} className="text-white" strokeWidth={2.2} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{exam.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {course ? `${course.course_code} — ${course.course_title}` : '—'}
                        <span className="mx-1.5 text-slate-300">|</span>
                        <span>{exam.duration_minutes}min</span>
                        <span className="mx-1.5 text-slate-300">|</span>
                        <span>{exam.total_questions}Q</span>
                        <span className="mx-1.5 text-slate-300">|</span>
                        <span>Pass: {exam.pass_mark}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    {attempts > 0 && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold border border-blue-100">
                        <Users size={12} strokeWidth={2.2} /> {attempts}
                      </span>
                    )}
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${exam.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-50 text-slate-500 border border-slate-200'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${exam.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                      {exam.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <button onClick={() => toggleActive(exam.id, exam.is_active)} className="w-8 h-8 rounded-lg bg-violet-50 hover:bg-violet-100 flex items-center justify-center text-violet-600 transition" title="Activate/Deactivate">
                      {exam.is_active ? <EyeOff size={15} strokeWidth={2.2} /> : <Eye size={15} strokeWidth={2.2} />}
                    </button>
                    <button onClick={() => handleDelete(exam.id)} className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-600 transition" title="Delete">
                      <Trash2 size={15} strokeWidth={2.2} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h2 className="text-lg font-bold text-gray-800">New University Exam</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Exam Title *</label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. First Semester CBT — CSC101"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 outline-none transition" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Course *</label>
                <select value={form.course_id} onChange={e => setForm({ ...form, course_id: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 outline-none transition">
                  <option value="">— Select Course —</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.course_code} — {c.course_title}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Duration (min)</label>
                  <input type="number" value={form.duration_minutes} onChange={e => setForm({ ...form, duration_minutes: Number(e.target.value) })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 outline-none transition" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Total Qs</label>
                  <input type="number" value={form.total_questions} onChange={e => setForm({ ...form, total_questions: Number(e.target.value) })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 outline-none transition" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Pass Mark</label>
                  <input type="number" value={form.pass_mark} onChange={e => setForm({ ...form, pass_mark: Number(e.target.value) })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 outline-none transition" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Instructions (optional)</label>
                <textarea value={form.instructions} onChange={e => setForm({ ...form, instructions: e.target.value })} rows={2} placeholder="Instructions shown to students before the exam"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 outline-none transition resize-none" />
              </div>
              <label className="flex items-center gap-2 text-xs text-gray-700">
                <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} className="rounded" />
                Activate immediately (students can take this exam)
              </label>
            </div>
            <div className="flex items-center justify-end gap-2 p-5 border-t border-gray-100 sticky bottom-0 bg-white">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg">Cancel</button>
              <button onClick={handleSave} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white text-sm font-bold shadow-lg shadow-violet-500/30 hover:-translate-y-0.5 transition-all">
                <Save size={16} strokeWidth={2.4} /> Create Exam
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
