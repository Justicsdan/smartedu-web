import { useState, useEffect, useCallback } from 'react'
import { dbProxy } from '../../lib/dbProxy'
import { useAuth } from '../../contexts/AuthContext'
import {
  ClipboardCheck, AlertCircle, Award, Loader2, X, CheckCircle,
  FileText, Search, Filter,
} from 'lucide-react'

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', label: 'Pending' },
  approved: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', label: 'Approved' },
  rejected: { bg: 'bg-red-50 border-red-200', text: 'text-red-700', label: 'Rejected' },
}

export default function TertiaryLessonPlansPage() {
  const { user } = useAuth() as { user: any }
  const isLecturer = user?.role === 'teacher'
  const lecturerId = user?.id || user?.teacher_id || user?.teacherId || ''
  const schoolId = user?.school_id || user?.schoolId || (!isLecturer ? user?.id : '') || ''
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [plans, setPlans] = useState<any[]>([])
  const [teachers, setTeachers] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [filterTeacher, setFilterTeacher] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [search, setSearch] = useState('')
  const [reviewPlan, setReviewPlan] = useState<any | null>(null)
  const [reviewComment, setReviewComment] = useState('')
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formCourseId, setFormCourseId] = useState('')
  const [formWeekNumber, setFormWeekNumber] = useState('1')
  const [formTitle, setFormTitle] = useState('')
  const [formObjectives, setFormObjectives] = useState('')
  const [formActivities, setFormActivities] = useState('')
  const [formMaterials, setFormMaterials] = useState('')
  const [formAssessment, setFormAssessment] = useState('')
  const [formNotes, setFormNotes] = useState('')
  const [formAttachmentUrl, setFormAttachmentUrl] = useState('')

  const load = useCallback(async () => {
    if (!schoolId) { setError('No school ID'); setLoading(false); return }
    setLoading(true); setError('')
    try {
      const [pRes, tRes, crsRes] = await Promise.all([
        dbProxy.from('lesson_plans').select('*').eq('school_id', schoolId).order('submitted_at', { ascending: false }),
        dbProxy.from('teachers').select('id, first_name, last_name').eq('school_id', schoolId).order('first_name'),
        dbProxy.from('uni_courses').select('id, course_code, course_title').eq('school_id', schoolId).order('course_code'),
      ])
      setPlans(pRes.data || [])
      setTeachers(tRes.data || [])
      setCourses(crsRes.data || [])
    } catch (e: any) {
      setError(e?.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [schoolId])

  useEffect(() => { load() }, [load])

  const effectiveTeacherFilter = isLecturer && lecturerId ? lecturerId : filterTeacher
  const filtered = plans.filter(p => {
    if (effectiveTeacherFilter && p.teacher_id !== effectiveTeacherFilter) return false
    if (filterStatus && p.status !== filterStatus) return false
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


  const openCreateModal = () => {
    setEditingPlanId(null)
    setFormCourseId('')
    setFormWeekNumber('1')
    setFormTitle('')
    setFormObjectives('')
    setFormActivities('')
    setFormMaterials('')
    setFormAssessment('')
    setFormNotes('')
    setFormAttachmentUrl('')
    setShowSubmitModal(true)
  }

  const openEditModal = (plan: any) => {
    setEditingPlanId(plan.id)
    setFormCourseId(plan.course_id || '')
    setFormWeekNumber(String(plan.week_number || 1))
    setFormTitle(plan.title || '')
    setFormObjectives(plan.objectives || '')
    setFormActivities(plan.activities || '')
    setFormMaterials(plan.materials || '')
    setFormAssessment(plan.assessment || '')
    setFormNotes(plan.notes || '')
    setFormAttachmentUrl(plan.attachment_url || '')
    setShowSubmitModal(true)
  }

  const handleSubmitPlan = async (e: any) => {
    e.preventDefault()
    if (!schoolId || !lecturerId) {
      setError('Missing lecturer or institution account info')
      return
    }
    if (!formTitle.trim()) {
      setError('Lecture plan title is required')
      return
    }
    setSubmitting(true); setError(''); setSuccess('')
    try {
      const payload: Record<string, any> = {
        school_id: schoolId,
        teacher_id: lecturerId,
        course_id: formCourseId || null,
        week_number: Number(formWeekNumber) || 1,
        title: formTitle.trim(),
        objectives: formObjectives.trim() || null,
        activities: formActivities.trim() || null,
        materials: formMaterials.trim() || null,
        assessment: formAssessment.trim() || null,
        notes: formNotes.trim() || null,
        attachment_url: formAttachmentUrl.trim() || null,
        status: 'pending',
        submitted_at: new Date().toISOString(),
      }
      if (editingPlanId) {
        const { error: updErr } = await dbProxy
          .from('lesson_plans')
          .update({
            ...payload,
            status: 'pending',
            admin_comment: null,
            reviewed_by: null,
            reviewed_at: null,
          })
          .eq('id', editingPlanId)
        if (updErr) throw updErr
        setSuccess('Lecture plan updated and resubmitted for review')
      } else {
        const { error: insErr } = await dbProxy.from('lesson_plans').insert(payload)
        if (insErr) throw insErr
        setSuccess('Lecture plan submitted for review')
      }
      setShowSubmitModal(false)
      setEditingPlanId(null)
      setFormCourseId(''); setFormWeekNumber('1')
      setFormTitle(''); setFormObjectives(''); setFormActivities('')
      setFormMaterials(''); setFormAssessment(''); setFormNotes(''); setFormAttachmentUrl('')
      load()
    } catch (err: any) {
      setError(err?.message || 'Failed to submit lecture plan')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-gradient-to-br from-slate-50 via-white to-violet-50/30">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 border-4 border-violet-500 border-t-transparent rounded-full animate-spin shadow-lg shadow-violet-500/20" />
          <span className="text-sm font-semibold text-slate-700">Loading lecture plans...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="px-3 sm:px-4 lg:px-6 py-4 sm:py-6 max-w-6xl mx-auto space-y-5 bg-gradient-to-br from-slate-50 via-white to-violet-50/30 min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-[10px] font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse"></span>
              University
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 bg-clip-text text-transparent">
            {isLecturer ? 'My Lecture Plans' : 'Lecture Plans Review'}
          </h1>
          <p className="text-sm text-slate-500 mt-1.5">
            {isLecturer ? 'Submit and track lecture plans for your courses' : 'Review lecturer lecture plans for courses'}
          </p>
        </div>
        {isLecturer && (
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 self-start sm:self-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white text-sm font-bold shadow-lg shadow-violet-500/30 transition"
          >
            <FileText size={15} />
            Submit Lecture Plan
          </button>
        )}
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
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 shadow-md" style={{ background: 'linear-gradient(135deg, #8B5CF6, #7c3aed)' }}>
            <ClipboardCheck size={18} strokeWidth={2.2} className="text-white" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{plans.length}</div>
          <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 mt-0.5">Total Plans</div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-4 shadow-lg shadow-slate-200/40">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 shadow-md" style={{ background: 'linear-gradient(135deg, #F59E0B, #d97706)' }}>
            <FileText size={18} strokeWidth={2.2} className="text-white" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{plans.filter(p => p.status === 'pending').length}</div>
          <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 mt-0.5">Pending</div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-4 shadow-lg shadow-slate-200/40">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 shadow-md" style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
            <CheckCircle size={18} strokeWidth={2.2} className="text-white" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{plans.filter(p => p.status === 'approved').length}</div>
          <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 mt-0.5">Approved</div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-4 shadow-lg shadow-slate-200/40">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 shadow-md" style={{ background: 'linear-gradient(135deg, #EF4444, #dc2626)' }}>
            <X size={18} strokeWidth={2.2} className="text-white" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{plans.filter(p => p.status === 'rejected').length}</div>
          <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 mt-0.5">Rejected</div>
        </div>
      </div>

      <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-sm p-4">
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
          {!isLecturer && (
            <select value={filterTeacher} onChange={e => setFilterTeacher(e.target.value)} className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-700">
              <option value="">All Lecturers</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
            </select>
          )}
          <div className="relative flex-1 min-w-[120px]">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search title..."
              className="w-full pl-7 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-700" />
          </div>
          <span className="text-xs text-slate-500">{filtered.length} of {plans.length}</span>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-slate-200/60 py-16 text-center shadow-lg shadow-slate-200/40">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-violet-500 to-purple-600 rounded-3xl flex items-center justify-center mb-5 shadow-xl shadow-violet-500/30">
            <ClipboardCheck size={36} className="text-white" strokeWidth={2} />
          </div>
          <h3 className="text-lg font-bold text-slate-900 tracking-tight">No lecture plans to review</h3>
          <p className="mt-2 text-sm text-slate-500 max-w-sm mx-auto">When lecturers submit plans, they'll appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(p => {
            const teacher = teachers.find(t => t.id === p.teacher_id)
            const course = courses.find(c => c.id === p.course_id)
            const sty = STATUS_STYLES[p.status] || STATUS_STYLES.pending
            return (
              <div key={p.id} className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-lg shadow-slate-200/40 p-4 hover:shadow-xl transition">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="text-sm font-bold text-slate-900">{p.title}</p>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${sty.bg} ${sty.text}`}>{sty.label}</span>
                    </div>
                    <p className="text-xs text-slate-500">
                      <span className="font-semibold text-slate-700">{teacher ? `${teacher.first_name} ${teacher.last_name}` : '—'}</span>
                      <span className="mx-1.5">·</span> Week {p.week_number}
                      {course ? ` · ${course.course_code}` : ''}
                    </p>
                    {p.objectives && <p className="text-xs text-slate-600 mt-2 line-clamp-2">{p.objectives}</p>}
                    {p.attachment_url && (
                      <a href={p.attachment_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-2 text-xs text-violet-600 hover:text-violet-700 font-semibold">
                        <FileText size={11} /> View attachment
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isLecturer && p.teacher_id === lecturerId && (p.status === 'pending' || p.status === 'rejected') && (
                      <button
                        type="button"
                        onClick={() => openEditModal(p)}
                        className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 text-xs font-bold shadow-sm transition"
                      >
                        {p.status === 'rejected' ? 'Edit & Resubmit' : 'Edit'}
                      </button>
                    )}
                    <button onClick={() => openReview(p)} className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white text-xs font-bold shadow-md shadow-violet-500/30 hover:-translate-y-0.5 transition-all">
                      {isLecturer ? 'View' : 'Review'}
                    </button>
                  </div>
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
              <h2 className="text-lg font-bold text-gray-800">Review Lecture Plan</h2>
              <button onClick={() => setReviewPlan(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-base font-bold text-slate-900">{reviewPlan.title}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {(() => {
                    const t = teachers.find(t => t.id === reviewPlan.teacher_id)
                    const c = courses.find(c => c.id === reviewPlan.course_id)
                    return [t ? `${t.first_name} ${t.last_name}` : '', `Week ${reviewPlan.week_number}`, c?.course_code].filter(Boolean).join(' · ')
                  })()}
                </p>
              </div>
              {reviewPlan.objectives && <div><p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Objectives</p><p className="text-sm text-slate-700 whitespace-pre-wrap">{reviewPlan.objectives}</p></div>}
              {reviewPlan.activities && <div><p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Activities</p><p className="text-sm text-slate-700 whitespace-pre-wrap">{reviewPlan.activities}</p></div>}
              {reviewPlan.materials && <div><p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Materials</p><p className="text-sm text-slate-700 whitespace-pre-wrap">{reviewPlan.materials}</p></div>}
              {reviewPlan.assessment && <div><p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Assessment</p><p className="text-sm text-slate-700 whitespace-pre-wrap">{reviewPlan.assessment}</p></div>}
              {reviewPlan.notes && <div><p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Notes</p><p className="text-sm text-slate-700 whitespace-pre-wrap">{reviewPlan.notes}</p></div>}
              {reviewPlan.attachment_url && (
                <a href={reviewPlan.attachment_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-50 hover:bg-violet-100 text-violet-700 text-sm font-bold">
                  <FileText size={14} /> View Attachment
                </a>
              )}
              <div className="pt-3 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Admin Comment {reviewPlan.status === 'rejected' ? '*' : '(required if rejecting)'}</label>
                <textarea value={reviewComment} onChange={e => setReviewComment(e.target.value)} rows={3} placeholder="Feedback for the lecturer..."
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 outline-none transition resize-none" />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-5 border-t border-gray-100 sticky bottom-0 bg-white">
              <button onClick={() => setReviewPlan(null)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg">Close</button>
              {!isLecturer && (
                <>
                  <button onClick={() => handleReview('rejected')} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold shadow-md shadow-red-500/30">
                    <X size={16} strokeWidth={2.4} /> Reject
                  </button>
                  <button onClick={() => handleReview('approved')} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-md shadow-emerald-500/30">
                    <CheckCircle size={16} strokeWidth={2.4} /> Approve
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowSubmitModal(false)}>
          <form onSubmit={handleSubmitPlan} className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h2 className="text-lg font-bold text-gray-800">{editingPlanId ? 'Edit & Resubmit Lecture Plan' : 'Submit Lecture Plan'}</h2>
              <button type="button" onClick={() => { setShowSubmitModal(false); setEditingPlanId(null) }} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Course</label>
                  <select value={formCourseId} onChange={e => setFormCourseId(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900">
                    <option value="">— Select Course —</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.course_code} — {c.course_title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Week</label>
                  <input type="number" min={1} max={30} value={formWeekNumber} onChange={e => setFormWeekNumber(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Topic / Title *</label>
                <input type="text" required value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="e.g., Introduction to Relational Algebra" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Learning Objectives</label>
                <textarea rows={2} value={formObjectives} onChange={e => setFormObjectives(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Lecture Activities</label>
                  <textarea rows={2} value={formActivities} onChange={e => setFormActivities(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Materials / Readings</label>
                  <textarea rows={2} value={formMaterials} onChange={e => setFormMaterials(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Assessment / Lab</label>
                  <input type="text" value={formAssessment} onChange={e => setFormAssessment(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Attachment URL</label>
                  <input type="url" value={formAttachmentUrl} onChange={e => setFormAttachmentUrl(e.target.value)} placeholder="https://..." className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Additional Notes</label>
                <textarea rows={2} value={formNotes} onChange={e => setFormNotes(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900" />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-5 border-t border-gray-100 sticky bottom-0 bg-white">
              <button type="button" onClick={() => { setShowSubmitModal(false); setEditingPlanId(null) }} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg">Cancel</button>
              <button type="submit" disabled={submitting} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-bold shadow-md shadow-violet-500/30">
                {submitting && <Loader2 size={14} className="animate-spin" />}
                {editingPlanId ? 'Save & Resubmit' : 'Submit Plan'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
