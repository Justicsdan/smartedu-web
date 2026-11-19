import { useState, useEffect, useCallback } from 'react'
import { dbProxy } from '../../lib/dbProxy'
import { useAuth } from '../../contexts/AuthContext'
import {
  ClipboardList, Plus, AlertCircle, Award, Loader2, Trash2, X, Save,
  FileText, Clock, CheckCircle, XCircle, Upload, Calendar, BookOpen,
} from 'lucide-react'

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string; icon: any }> = {
  pending: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', label: 'Pending Review', icon: Clock },
  approved: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', label: 'Approved', icon: CheckCircle },
  rejected: { bg: 'bg-red-50 border-red-200', text: 'text-red-700', label: 'Rejected — Resubmit', icon: XCircle },
}

export default function TeacherLessonPlansPage() {
  const { user } = useAuth() as { user: any }
  const schoolId = user?.school_id || user?.schoolId || user?.id || ''
  const teacherId = user?.id || ''
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [plans, setPlans] = useState<any[]>([])
  const [subjects, setSubjects] = useState<any[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [sessions, setSessions] = useState<any[]>([])
  const [terms, setTerms] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState({
    subject_id: '', class_id: '', course_id: '', session_id: '', term_id: '',
    week_number: 1, title: '', objectives: '', activities: '', materials: '',
    assessment: '', notes: '', attachment_url: '',
  })

  const load = useCallback(async () => {
    if (!schoolId || !teacherId) { setError('No school/teacher ID'); setLoading(false); return }
    setLoading(true); setError('')
    try {
      const [pRes, subRes, clsRes, crsRes, sessRes, termRes] = await Promise.all([
        dbProxy.from('lesson_plans').select('*').eq('school_id', schoolId).eq('teacher_id', teacherId).order('created_at', { ascending: false }),
        dbProxy.from('subjects').select('id, name, code').eq('school_id', schoolId).order('name'),
        dbProxy.from('classes').select('id, name, section, tier').eq('school_id', schoolId).order('name'),
        dbProxy.from('uni_courses').select('id, course_code, course_title').eq('school_id', schoolId).order('course_code'),
        dbProxy.from('academic_sessions').select('id, name, is_current').eq('school_id', schoolId).order('is_current', { ascending: false }),
        dbProxy.from('terms').select('id, name, is_current').eq('school_id', schoolId).order('is_current', { ascending: false }),
      ])
      setPlans(pRes.data || [])
      setSubjects(subRes.data || [])
      setClasses(clsRes.data || [])
      setCourses(crsRes.data || [])
      setSessions(sessRes.data || [])
      setTerms(termRes.data || [])
      // Pre-fill current session/term
      const curSess = (sessRes.data || []).find((s: any) => s.is_current)
      const curTerm = (termRes.data || []).find((t: any) => t.is_current)
      if (curSess && !form.session_id) setForm(f => ({ ...f, session_id: curSess.id }))
      if (curTerm && !form.term_id) setForm(f => ({ ...f, term_id: curTerm.id }))
    } catch (e: any) {
      setError(e?.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [schoolId, teacherId])

  useEffect(() => { load() }, [load])

  const handleFileUpload = async (file: File) => {
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf'
      const path = `${schoolId}/${teacherId}/${Date.now()}.${ext}`
      const { data, error } = await uploadToStorage('lesson-plans', path, file)
      if (error) throw error
      const url = `https://tcjsmkhmfjigutfhjtem.supabase.co/storage/v1/object/public/lesson-plans/${path}`
      setForm(f => ({ ...f, attachment_url: url }))
      setSuccess('File uploaded')
    } catch (e: any) {
      setError(e?.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    if (!form.title.trim()) { setError('Title is required'); return }
    if (!form.subject_id && !form.course_id) { setError('Subject or course is required'); return }
    setError(''); setSuccess('')
    try {
      const payload = {
        school_id: schoolId,
        teacher_id: teacherId,
        subject_id: form.subject_id || null,
        class_id: form.class_id || null,
        course_id: form.course_id || null,
        session_id: form.session_id || null,
        term_id: form.term_id || null,
        week_number: Number(form.week_number) || 1,
        title: form.title.trim(),
        objectives: form.objectives.trim(),
        activities: form.activities.trim(),
        materials: form.materials.trim(),
        assessment: form.assessment.trim(),
        notes: form.notes.trim(),
        attachment_url: form.attachment_url || null,
        status: 'pending',
        submitted_at: new Date().toISOString(),
      }
      if (editingId) {
        const { error } = await dbProxy.from('lesson_plans').update({ ...payload, status: 'pending', admin_comment: null, reviewed_by: null, reviewed_at: null }).eq('id', editingId)
        if (error) throw error
        setSuccess('Lesson plan updated and resubmitted')
      } else {
        const { error } = await dbProxy.from('lesson_plans').insert(payload)
        if (error) throw error
        setSuccess('Lesson plan submitted for review')
      }
      setShowForm(false)
      setEditingId(null)
      setForm({ subject_id: '', class_id: '', course_id: '', session_id: form.session_id, term_id: form.term_id, week_number: 1, title: '', objectives: '', activities: '', materials: '', assessment: '', notes: '', attachment_url: '' })
      load()
    } catch (e: any) {
      setError(e?.message || 'Save failed')
    }
  }

  const handleEdit = (p: any) => {
    setEditingId(p.id)
    setForm({
      subject_id: p.subject_id || '',
      class_id: p.class_id || '',
      course_id: p.course_id || '',
      session_id: p.session_id || '',
      term_id: p.term_id || '',
      week_number: p.week_number || 1,
      title: p.title || '',
      objectives: p.objectives || '',
      activities: p.activities || '',
      materials: p.materials || '',
      assessment: p.assessment || '',
      notes: p.notes || '',
      attachment_url: p.attachment_url || '',
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this lesson plan?')) return
    try {
      await dbProxy.from('lesson_plans').delete().eq('id', id)
      setSuccess('Plan deleted')
      load()
    } catch (e: any) {
      setError(e?.message || 'Delete failed')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
          <span className="text-sm font-medium text-slate-600">Loading lesson plans...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="px-3 sm:px-4 lg:px-6 py-4 sm:py-6 max-w-6xl mx-auto space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Lesson Plans</h1>
          <p className="text-sm text-slate-500 mt-1.5">Submit weekly lesson plans for admin review</p>
        </div>
        <button onClick={() => { setEditingId(null); setForm({ subject_id: '', class_id: '', course_id: '', session_id: form.session_id, term_id: form.term_id, week_number: 1, title: '', objectives: '', activities: '', materials: '', assessment: '', notes: '', attachment_url: '' }); setShowForm(true) }}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-sm font-bold shadow-lg shadow-amber-500/30 hover:-translate-y-0.5 transition-all">
          <Plus size={14} strokeWidth={2.4} /> New Lesson Plan
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

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200/60 p-4 shadow-sm">
          <div className="text-2xl font-bold text-amber-600">{plans.filter(p => p.status === 'pending').length}</div>
          <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 mt-0.5">Pending</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/60 p-4 shadow-sm">
          <div className="text-2xl font-bold text-emerald-600">{plans.filter(p => p.status === 'approved').length}</div>
          <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 mt-0.5">Approved</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/60 p-4 shadow-sm">
          <div className="text-2xl font-bold text-red-600">{plans.filter(p => p.status === 'rejected').length}</div>
          <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 mt-0.5">Rejected</div>
        </div>
      </div>

      {plans.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/60 py-16 text-center shadow-sm">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-amber-500/30">
            <ClipboardList size={28} className="text-white" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No lesson plans yet</h3>
          <p className="mt-2 text-sm text-slate-500">Click "New Lesson Plan" to create your first one.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {plans.map(p => {
            const subject = subjects.find(s => s.id === p.subject_id)
            const cls = classes.find(c => c.id === p.class_id)
            const course = courses.find(c => c.id === p.course_id)
            const sty = STATUS_STYLES[p.status] || STATUS_STYLES.pending
            const StatusIcon = sty.icon
            return (
              <div key={p.id} className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="text-sm font-bold text-slate-900">{p.title}</p>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${sty.bg} ${sty.text}`}>
                        <StatusIcon size={10} /> {sty.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Week {p.week_number}
                      {subject ? ` · ${subject.name}` : ''}
                      {course ? ` · ${course.course_code}` : ''}
                      {cls ? ` · ${cls.name}${cls.section ? ' ' + cls.section : ''}` : ''}
                    </p>
                    {p.objectives && <p className="text-xs text-slate-600 mt-2 line-clamp-2">{p.objectives}</p>}
                    {p.attachment_url && (
                      <a href={p.attachment_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-2 text-xs text-amber-600 hover:text-amber-700 font-semibold">
                        <FileText size={11} /> View attachment
                      </a>
                    )}
                    {p.admin_comment && (
                      <div className={`mt-2 p-2 rounded-lg text-xs ${p.status === 'approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                        <span className="font-bold">Admin feedback:</span> {p.admin_comment}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {p.status !== 'approved' && (
                      <button onClick={() => handleEdit(p)} className="w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center text-blue-600 transition" title="Edit & Resubmit">
                        <FileText size={15} />
                      </button>
                    )}
                    <button onClick={() => handleDelete(p.id)} className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-600 transition" title="Delete">
                      <Trash2 size={15} />
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
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h2 className="text-lg font-bold text-gray-800">{editingId ? 'Edit Lesson Plan' : 'New Lesson Plan'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Week Number</label>
                  <input type="number" min={1} max={13} value={form.week_number} onChange={e => setForm({ ...form, week_number: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none transition" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Session</label>
                  <select value={form.session_id} onChange={e => setForm({ ...form, session_id: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none transition">
                    <option value="">— Select —</option>
                    {sessions.map(s => <option key={s.id} value={s.id}>{s.name}{s.is_current ? ' (Current)' : ''}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Title *</label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Quadratic Equations — Solving by Formula"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none transition" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Subject (Traditional)</label>
                  <select value={form.subject_id} onChange={e => setForm({ ...form, subject_id: e.target.value, course_id: '' })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none transition">
                    <option value="">— None —</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Class (Traditional)</label>
                  <select value={form.class_id} onChange={e => setForm({ ...form, class_id: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none transition">
                    <option value="">— None —</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}{c.section ? ' ' + c.section : ''}</option>)}
                  </select>
                </div>
              </div>
              {courses.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Course (Tertiary)</label>
                  <select value={form.course_id} onChange={e => setForm({ ...form, course_id: e.target.value, subject_id: '', class_id: '' })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none transition">
                    <option value="">— None —</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.course_code} — {c.course_title}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Learning Objectives</label>
                <textarea value={form.objectives} onChange={e => setForm({ ...form, objectives: e.target.value })} rows={3} placeholder="By the end of the lesson, students should be able to..."
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none transition resize-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Teaching Activities</label>
                <textarea value={form.activities} onChange={e => setForm({ ...form, activities: e.target.value })} rows={3}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none transition resize-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Materials / Resources</label>
                <textarea value={form.materials} onChange={e => setForm({ ...form, materials: e.target.value })} rows={2} placeholder="Textbooks, handouts, projector, etc."
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none transition resize-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Assessment Methods</label>
                <textarea value={form.assessment} onChange={e => setForm({ ...form, assessment: e.target.value })} rows={2} placeholder="Class exercises, quiz, homework, etc."
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none transition resize-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Additional Notes</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none transition resize-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Attachment (PDF/Word)</label>
                {form.attachment_url ? (
                  <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                    <FileText size={16} className="text-amber-600" />
                    <a href={form.attachment_url} target="_blank" rel="noopener noreferrer" className="text-xs text-amber-700 font-semibold flex-1 truncate">View current attachment</a>
                    <button onClick={() => setForm({ ...form, attachment_url: '' })} className="text-xs text-red-600 hover:underline">Remove</button>
                  </div>
                ) : (
                  <label className={`flex items-center justify-center gap-2 p-3 border-2 border-dashed rounded-lg cursor-pointer transition ${uploading ? 'border-amber-400 bg-amber-50' : 'border-slate-200 hover:border-amber-400 hover:bg-amber-50/50'}`}>
                    <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f) }} disabled={uploading} />
                    {uploading ? <Loader2 size={16} className="animate-spin text-amber-600" /> : <Upload size={16} className="text-slate-400" />}
                    <span className="text-xs text-slate-600">{uploading ? 'Uploading...' : 'Click to upload'}</span>
                  </label>
                )}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-5 border-t border-gray-100 sticky bottom-0 bg-white">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg">Cancel</button>
              <button onClick={handleSave} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-sm font-bold shadow-lg shadow-amber-500/30 hover:-translate-y-0.5 transition-all">
                <Save size={16} strokeWidth={2.4} /> {editingId ? 'Resubmit' : 'Submit for Review'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Storage upload helper (uses Supabase JS client directly for storage)
async function uploadToStorage(bucket: string, path: string, file: File) {
  const supabaseUrl = 'https://tcjsmkhmfjigutfhjtem.supabase.co'
  const anonKey = 'sb_publishable_zWDvjhEldcV8eutnlRypGA_LGpOUhkg'
  const token = localStorage.getItem('smartedu_token') || ''
  const res = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${anonKey}`,
      'x-upsert': 'true',
      'x-auth-token': token,
      'Content-Type': file.type || 'application/octet-stream',
    },
    body: file,
  })
  if (!res.ok) {
    const err = await res.text()
    return { data: null, error: new Error(err) }
  }
  return { data: await res.json(), error: null }
}
