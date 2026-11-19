import { useState, useEffect, useCallback } from 'react'
import { dbProxy } from '../../lib/dbProxy'
import { useAuth } from '../../contexts/AuthContext'
import {
  ClipboardCheck, AlertCircle, Award, Loader2, X, Save, CheckCircle,
  FileText, Clock, Search, Calendar, BookOpen, Filter,
} from 'lucide-react'

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', label: 'Pending' },
  approved: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', label: 'Approved' },
  rejected: { bg: 'bg-red-50 border-red-200', text: 'text-red-700', label: 'Rejected' },
}

export default function AdminLessonPlansPage() {
  const { user } = useAuth() as { user: any }
  const schoolId = user?.school_id || user?.schoolId || user?.id || ''
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [plans, setPlans] = useState<any[]>([])
  const [teachers, setTeachers] = useState<any[]>([])
  const [subjects, setSubjects] = useState<any[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [filterTeacher, setFilterTeacher] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterWeek, setFilterWeek] = useState('')
  const [search, setSearch] = useState('')
  const [reviewPlan, setReviewPlan] = useState<any | null>(null)
  const [reviewComment, setReviewComment] = useState('')

  const load = useCallback(async () => {
    if (!schoolId) { setError('No school ID'); setLoading(false); return }
    setLoading(true); setError('')
    try {
      const [pRes, tRes, subRes, clsRes] = await Promise.all([
        dbProxy.from('lesson_plans').select('*').eq('school_id', schoolId).order('submitted_at', { ascending: false }),
        dbProxy.from('teachers').select('id, first_name, last_name').eq('school_id', schoolId).order('first_name'),
        dbProxy.from('subjects').select('id, name, code').eq('school_id', schoolId).order('name'),
        dbProxy.from('classes').select('id, name, section').eq('school_id', schoolId).order('name'),
      ])
      setPlans(pRes.data || [])
      setTeachers(tRes.data || [])
      setSubjects(subRes.data || [])
      setClasses(clsRes.data || [])
    } catch (e: any) {
      setError(e?.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [schoolId])

  useEffect(() => { load() }, [load])

  const filtered = plans.filter(p => {
    if (filterTeacher && p.teacher_id !== filterTeacher) return false
    if (filterStatus && p.status !== filterStatus) return false
    if (filterWeek && String(p.week_number) !== filterWeek) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      if (!p.title?.toLowerCase().includes(q)) return false
    }
    return true
  })

  const openReview = (p: any) => {
    setReviewPlan(p)
    setReviewComment(p.admin_comment || '')
  }

  const handleReview = async (status: 'approved' | 'rejected') => {
    if (!reviewPlan) return
    if (status === 'rejected' && !reviewComment.trim()) {
      setError('Comment is required when rejecting')
      return
    }
    setError(''); setSuccess('')
    try {
      const { error } = await dbProxy.from('lesson_plans').update({
        status,
        admin_comment: reviewComment.trim() || null,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      }).eq('id', reviewPlan.id)
      if (error) throw error
      setSuccess(`Plan ${status}`)
      setReviewPlan(null)
      setReviewComment('')
      load()
    } catch (e: any) {
      setError(e?.message || 'Update failed')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-rose-600" />
          <span className="text-sm font-medium text-slate-600">Loading lesson plans...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="px-3 sm:px-4 lg:px-6 py-4 sm:py-6 max-w-6xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Lesson Plans Review</h1>
        <p className="text-sm text-slate-500 mt-1.5">Review and approve teacher lesson plans</p>
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

      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200/60 p-4 shadow-sm">
          <div className="text-2xl font-bold text-slate-900">{plans.length}</div>
          <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 mt-0.5">Total Plans</div>
        </div>
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

      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Filter size={14} className="text-slate-400" />
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-700">
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <select value={filterTeacher} onChange={e => setFilterTeacher(e.target.value)} className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-700">
            <option value="">All Teachers</option>
            {teachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
          </select>
          <select value={filterWeek} onChange={e => setFilterWeek(e.target.value)} className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-700">
            <option value="">All Weeks</option>
            {[1,2,3,4,5,6,7,8,9,10,11,12,13].map(w => <option key={w} value={String(w)}>Week {w}</option>)}
          </select>
          <div className="relative flex-1 min-w-[120px]">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search title..."
              className="w-full pl-7 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-700" />
          </div>
          <span className="text-xs text-slate-500">{filtered.length} of {plans.length}</span>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/60 py-16 text-center shadow-sm">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-rose-500 to-pink-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-rose-500/30">
            <ClipboardCheck size={28} className="text-white" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No lesson plans to review</h3>
          <p className="mt-2 text-sm text-slate-500">When teachers submit plans, they'll appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(p => {
            const teacher = teachers.find(t => t.id === p.teacher_id)
            const subject = subjects.find(s => s.id === p.subject_id)
            const cls = classes.find(c => c.id === p.class_id)
            const sty = STATUS_STYLES[p.status] || STATUS_STYLES.pending
            return (
              <div key={p.id} className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-4 hover:shadow-md transition">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="text-sm font-bold text-slate-900">{p.title}</p>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${sty.bg} ${sty.text}`}>{sty.label}</span>
                    </div>
                    <p className="text-xs text-slate-500">
                      <span className="font-semibold text-slate-700">{teacher ? `${teacher.first_name} ${teacher.last_name}` : '—'}</span>
                      <span className="mx-1.5">·</span> Week {p.week_number}
                      {subject ? ` · ${subject.name}` : ''}
                      {cls ? ` · ${cls.name}` : ''}
                    </p>
                    {p.objectives && <p className="text-xs text-slate-600 mt-2 line-clamp-2">{p.objectives}</p>}
                    {p.attachment_url && (
                      <a href={p.attachment_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-2 text-xs text-rose-600 hover:text-rose-700 font-semibold">
                        <FileText size={11} /> View attachment
                      </a>
                    )}
                    {p.admin_comment && (
                      <div className={`mt-2 p-2 rounded-lg text-xs ${p.status === 'approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                        <span className="font-bold">Your feedback:</span> {p.admin_comment}
                      </div>
                    )}
                  </div>
                  <button onClick={() => openReview(p)} className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white text-xs font-bold shadow-md shadow-rose-500/30 hover:-translate-y-0.5 transition-all">
                    Review
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {reviewPlan && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setReviewPlan(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h2 className="text-lg font-bold text-gray-800">Review Lesson Plan</h2>
              <button onClick={() => setReviewPlan(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-base font-bold text-slate-900">{reviewPlan.title}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {(() => {
                    const t = teachers.find(t => t.id === reviewPlan.teacher_id)
                    const s = subjects.find(s => s.id === reviewPlan.subject_id)
                    const c = classes.find(c => c.id === reviewPlan.class_id)
                    return [
                      t ? `${t.first_name} ${t.last_name}` : '',
                      `Week ${reviewPlan.week_number}`,
                      s?.name,
                      c?.name,
                    ].filter(Boolean).join(' · ')
                  })()}
                </p>
              </div>
              {reviewPlan.objectives && <div><p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Objectives</p><p className="text-sm text-slate-700 whitespace-pre-wrap">{reviewPlan.objectives}</p></div>}
              {reviewPlan.activities && <div><p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Activities</p><p className="text-sm text-slate-700 whitespace-pre-wrap">{reviewPlan.activities}</p></div>}
              {reviewPlan.materials && <div><p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Materials</p><p className="text-sm text-slate-700 whitespace-pre-wrap">{reviewPlan.materials}</p></div>}
              {reviewPlan.assessment && <div><p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Assessment</p><p className="text-sm text-slate-700 whitespace-pre-wrap">{reviewPlan.assessment}</p></div>}
              {reviewPlan.notes && <div><p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Notes</p><p className="text-sm text-slate-700 whitespace-pre-wrap">{reviewPlan.notes}</p></div>}
              {reviewPlan.attachment_url && (
                <a href={reviewPlan.attachment_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-sm font-bold">
                  <FileText size={14} /> View Attachment
                </a>
              )}
              <div className="pt-3 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Admin Comment {reviewPlan.status === 'rejected' ? '*' : '(required if rejecting)'}</label>
                <textarea value={reviewComment} onChange={e => setReviewComment(e.target.value)} rows={3} placeholder="Feedback for the teacher..."
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-rose-500 focus:ring-2 focus:ring-rose-100 outline-none transition resize-none" />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-5 border-t border-gray-100 sticky bottom-0 bg-white">
              <button onClick={() => setReviewPlan(null)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg">Cancel</button>
              <button onClick={() => handleReview('rejected')} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold shadow-md shadow-red-500/30">
                <X size={16} strokeWidth={2.4} /> Reject
              </button>
              <button onClick={() => handleReview('approved')} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-md shadow-emerald-500/30">
                <CheckCircle size={16} strokeWidth={2.4} /> Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
