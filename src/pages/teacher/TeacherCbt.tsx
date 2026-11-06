import { useState, useEffect, useMemo } from "react"
import { dbProxy } from '../../lib/dbProxy'
import { useAuth } from '../../contexts/AuthContext'
import {
  Loader2, AlertCircle, CheckCircle, Plus, X, Save, Trash2,
  Award, Eye, EyeOff, FileText,
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
  created_at: string
}

export default function TeacherCbt() {
  const { user } = useAuth() as { user: any }
  const teacherId = user?.id || ''
  const schoolId = user?.school_id || user?.schoolId || ''

  const [loading, setLoading] = useState(true)
  const [exams, setExams] = useState<Exam[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [subjects, setSubjects] = useState<any[]>([])
  const [classSubjects, setClassSubjects] = useState<any[]>([])
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const [form, setForm] = useState({ title: '', class_id: '', subject_id: '', duration_minutes: 60, total_questions: 50, pass_mark: 40 })

  useEffect(() => {
    if (!teacherId || !schoolId) return
    ;(async () => {
      try {
        const [eRes, csRes] = await Promise.all([
          dbProxy.from('cbt_exams').select('*').eq('school_id', schoolId).eq('created_by', teacherId).order('created_at', { ascending: false }),
          dbProxy.from('class_subjects').select('id, class_id, subject_id').eq('school_id', schoolId).eq('teacher_id', teacherId),
        ])
        setExams((eRes.data || []) as Exam[])
        setClassSubjects(csRes.data || [])
        const classIds = Array.from(new Set((csRes.data || []).map((cs: any) => cs.class_id)))
        const subjectIds = Array.from(new Set((csRes.data || []).map((cs: any) => cs.subject_id)))
        if (classIds.length > 0) { const { data } = await dbProxy.from('classes').select('id, name, section, tier').in('id', classIds).order('name'); setClasses(data || []) }
        if (subjectIds.length > 0) { const { data } = await dbProxy.from('subjects').select('id, name, code').in('id', subjectIds).order('name'); setSubjects(data || []) }
      } catch (e: any) { setError(e.message) } finally { setLoading(false) }
    })()
  }, [teacherId, schoolId])

  const availableSubjects = useMemo(() => {
    if (!form.class_id) return []
    const subjectIds = classSubjects.filter(cs => cs.class_id === form.class_id).map(cs => cs.subject_id)
    return subjects.filter(s => subjectIds.includes(s.id))
  }, [classSubjects, subjects, form.class_id])

  const classMap = useMemo(() => { const m: Record<string, any> = {}; classes.forEach(c => { m[c.id] = c }); return m }, [classes])
  const subjectMap = useMemo(() => { const m: Record<string, any> = {}; subjects.forEach(s => { m[s.id] = s }); return m }, [subjects])

  const handleCreate = async () => {
    if (!form.title.trim() || !form.class_id || !form.subject_id) { setError('Title, class, and subject required'); return }
    setSaving(true); setError('')
    try {
      const { error: inErr } = await dbProxy.from('cbt_exams').insert({
        school_id: schoolId, created_by: teacherId, title: form.title.trim(),
        class_id: form.class_id, subject_id: form.subject_id,
        duration_minutes: Number(form.duration_minutes) || 60,
        total_questions: Number(form.total_questions) || 50,
        pass_mark: Number(form.pass_mark) || 40, is_active: false,
      })
      if (inErr) throw inErr
      const { data } = await dbProxy.from('cbt_exams').select('*').eq('school_id', schoolId).eq('created_by', teacherId).order('created_at', { ascending: false })
      setExams((data || []) as Exam[])
      setShowModal(false)
      setForm({ title: '', class_id: '', subject_id: '', duration_minutes: 60, total_questions: 50, pass_mark: 40 })
      setSuccessMsg('Exam created')
    } catch (e: any) { setError(e.message) } finally { setSaving(false) }
  }

  const toggleActive = async (exam: Exam) => {
    try {
      const { error } = await dbProxy.from('cbt_exams').update({ is_active: !exam.is_active }).eq('id', exam.id)
      if (error) throw error
      setExams(prev => prev.map(e => e.id === exam.id ? { ...e, is_active: !exam.is_active } : e))
      setSuccessMsg(exam.is_active ? 'Deactivated' : 'Activated')
    } catch (e: any) { setError(e.message) }
  }

  const handleDelete = async (id: string) => {
    try {
      await dbProxy.from('cbt_questions').delete().eq('exam_id', id)
      await dbProxy.from('cbt_attempts').delete().eq('exam_id', id)
      const { error } = await dbProxy.from('cbt_exams').delete().eq('id', id)
      if (error) throw error
      setExams(prev => prev.filter(e => e.id !== id))
      setDeleteConfirm(null)
      setSuccessMsg('Exam deleted')
    } catch (e: any) { setError(e.message) }
  }

  if (loading) return <div className="flex items-center justify-center min-h-[60vh] bg-gradient-to-br from-slate-50 via-white to-blue-50/30"><div className="w-14 h-14 border-4 border-blue-500 border-t-transparent rounded-full animate-spin shadow-lg shadow-blue-500/20" /></div>

  return (
    <div className="px-3 sm:px-4 lg:px-6 py-4 sm:py-6 max-w-4xl mx-auto space-y-5 bg-gradient-to-br from-slate-50 via-white to-blue-50/30 min-h-screen">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
              CBT
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 bg-clip-text text-transparent">CBT Exams</h1>
        </div>
          <p className="text-sm text-slate-500 mt-1">{exams.length} exam{exams.length !== 1 ? 's' : ''} · {exams.filter(e => e.is_active).length} active</p>
        </div>
        <button onClick={() => setShowModal(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition shadow-sm">
          <Plus size={14} strokeWidth={2.4} />New Exam
        </button>
      </div>

      {error && <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-800"><AlertCircle size={18} className="flex-shrink-0 mt-0.5" /><p className="text-sm flex-1">{error}</p></div>}
      {successMsg && <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800"><CheckCircle size={18} className="flex-shrink-0 mt-0.5" /><p className="text-sm flex-1">{successMsg}</p></div>}

      {exams.length === 0 ? (
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg shadow-slate-200/40 border border-slate-200/60 py-16 text-center">
          <div className="w-16 h-16 mx-auto bg-blue-50 rounded-2xl flex items-center justify-center mb-4 text-blue-400"><Award size={32} strokeWidth={2} /></div>
          <h3 className="text-base font-bold text-slate-900 mb-1">No CBT Exams</h3>
          <p className="text-sm text-slate-500">Click "New Exam" to create one.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {exams.map(exam => {
            const cls = classMap[exam.class_id]
            const subj = subjectMap[exam.subject_id]
            return (
              <div key={exam.id} className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg shadow-slate-200/40 border border-slate-200/60 overflow-hidden">
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${exam.is_active ? 'bg-emerald-50' : 'bg-slate-100'}`}>
                      <FileText className={`w-5 h-5 ${exam.is_active ? 'text-emerald-600' : 'text-slate-400'}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{exam.title}</p>
                      <p className="text-xs text-slate-400">{subj?.name || '-'} · {cls?.name || '-'} · {exam.duration_minutes}min · {exam.total_questions}Q</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${exam.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{exam.is_active ? 'Active' : 'Inactive'}</span>
                    <button onClick={() => toggleActive(exam)} className={`p-1.5 rounded transition ${exam.is_active ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'}`}>
                      {exam.is_active ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                    <button onClick={() => setDeleteConfirm(exam.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-gradient-to-r from-slate-900 to-slate-700/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-base font-bold text-slate-900">New CBT Exam</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-md text-slate-500 hover:bg-slate-200"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Title *</label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g., First Term Math CBT"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Class *</label>
                  <select value={form.class_id} onChange={e => setForm({ ...form, class_id: e.target.value, subject_id: '' })}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition">
                    <option value="">Select</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}{c.section ? ` ${c.section}` : ''}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Subject *</label>
                  <select value={form.subject_id} onChange={e => setForm({ ...form, subject_id: e.target.value })} disabled={!form.class_id}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition disabled:bg-slate-50">
                    <option value="">{form.class_id ? 'Select' : 'Class first'}</option>
                    {availableSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="block text-xs font-semibold text-slate-700 mb-1.5">Duration</label><input type="number" value={form.duration_minutes} onChange={e => setForm({ ...form, duration_minutes: Number(e.target.value) })} className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition" /></div>
                <div><label className="block text-xs font-semibold text-slate-700 mb-1.5">Questions</label><input type="number" value={form.total_questions} onChange={e => setForm({ ...form, total_questions: Number(e.target.value) })} className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition" /></div>
                <div><label className="block text-xs font-semibold text-slate-700 mb-1.5">Pass %</label><input type="number" value={form.pass_mark} onChange={e => setForm({ ...form, pass_mark: Number(e.target.value) })} className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition" /></div>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-semibold text-sm hover:bg-slate-50">Cancel</button>
              <button onClick={handleCreate} disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-sm disabled:opacity-50">
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}Create
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-gradient-to-r from-slate-900 to-slate-700/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4"><div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center text-red-600"><Trash2 size={24} /></div><h3 className="text-lg font-bold text-slate-900">Delete Exam?</h3></div>
            <p className="text-sm text-slate-600 mb-5">All questions and attempts will be deleted.</p>
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
