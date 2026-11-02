import { useState, useEffect, useCallback } from 'react'
import { dbProxy } from '../../lib/dbProxy'
import { useAuth } from '../../contexts/AuthContext'
import {
  MessageSquare, Send, Loader2, AlertCircle, RefreshCw, CheckCircle2,
  Clock, XCircle, Plus, X, Inbox,
} from 'lucide-react'

function pickString(record: any, ...keys: string[]): string {
  for (const k of keys) {
    const v = record?.[k]
    if (v !== null && v !== undefined && String(v).trim() !== '') return String(v).trim()
  }
  return ''
}

function formatDateTime(dateVal: any): string {
  if (!dateVal) return ''
  const d = new Date(dateVal)
  if (isNaN(d.getTime())) return String(dateVal)
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function timeAgo(dateVal: any): string {
  if (!dateVal) return ''
  const dt = new Date(dateVal)
  if (isNaN(dt.getTime())) return ''
  const diff = Date.now() - dt.getTime()
  const min = Math.floor(diff / 60000)
  const hr = Math.floor(min / 60)
  const day = Math.floor(hr / 24)
  if (min < 1) return 'Just now'
  if (min < 60) return `${min}m ago`
  if (hr < 24) return `${hr}h ago`
  if (day < 7) return `${day}d ago`
  return formatDateTime(dateVal)
}

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  pending: { label: 'Pending', color: '#f59e0b', bg: '#fffbeb', icon: Clock },
  open: { label: 'Open', color: '#3b82f6', bg: '#eff6ff', icon: Clock },
  in_progress: { label: 'In Progress', color: '#3b82f6', bg: '#eff6ff', icon: Clock },
  resolved: { label: 'Resolved', color: '#10b981', bg: '#ecfdf5', icon: CheckCircle2 },
  closed: { label: 'Closed', color: '#64748b', bg: '#f1f5f9', icon: XCircle },
  rejected: { label: 'Rejected', color: '#ef4444', bg: '#fef2f2', icon: XCircle },
}

function getStatusMeta(status: string) {
  return STATUS_META[(status || '').toLowerCase()] || STATUS_META.pending
}

const CATEGORIES = ['Academic', 'Bullying', 'Facilities', 'Health', 'Teacher', 'Administrative', 'Financial', 'Other']

export default function StudentComplaintsPage() {
  const { user } = useAuth() as { user: any }
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [complaints, setComplaints] = useState<any[]>([])
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ category: 'Academic', subject: '', description: '' })
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')
  const studentId = user?.id || user?.student_id || user?.studentId || ''
  const schoolId = user?.school_id || user?.schoolId || ''

  const loadComplaints = useCallback(async () => {
    if (!user) return
    setLoading(true); setError('')
    try {
      const { data, error: err } = await dbProxy
        .from('complaints').select('*')
        .eq('student_id', studentId || user.id)
        .order('created_at', { ascending: false })
      if (err) throw err
      setComplaints(data || [])
    } catch (e: any) {
      console.error('Complaints load error:', e)
      setError(e?.message || 'Failed to load complaints')
    } finally { setLoading(false) }
  }, [user, studentId])

  useEffect(() => { loadComplaints() }, [loadComplaints])

  const handleSubmit = async () => {
    setFormError(''); setFormSuccess('')
    if (!form.subject.trim()) { setFormError('Please enter a subject'); return }
    if (form.description.trim().length < 10) { setFormError('Please provide a description (at least 10 characters)'); return }
    setSubmitting(true)
    try {
      const payload = {
        student_id: studentId || user.id,
        school_id: schoolId,
        category: form.category,
        subject: form.subject.trim(),
        description: form.description.trim(),
        status: 'pending',
        submitted_at: new Date().toISOString(),
      }
      const { data, error: insErr } = await dbProxy.from('complaints').insert(payload).select().single()
      if (insErr) throw insErr
      setComplaints((prev) => [data, ...prev])
      setFormSuccess('Complaint submitted successfully')
      setForm({ category: 'Academic', subject: '', description: '' })
      setTimeout(() => { setShowModal(false); setFormSuccess('') }, 1200)
    } catch (e: any) {
      console.error('Complaint submit error:', e)
      setFormError(e?.message || 'Failed to submit complaint')
    } finally { setSubmitting(false) }
  }

  const closeModal = () => {
    if (submitting) return
    setShowModal(false)
    setForm({ category: 'Academic', subject: '', description: '' })
    setFormError(''); setFormSuccess('')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-slate-600">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          <span className="text-sm font-medium">Loading complaints…</span>
        </div>
      </div>
    )
  }

  return (
    <div className="px-3 sm:px-4 lg:px-6 py-4 sm:py-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Complaints</h1>
          <p className="mt-0.5 text-sm text-slate-500">{complaints.length} complaint{complaints.length !== 1 ? 's' : ''} submitted</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadComplaints} disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 transition text-slate-700 font-semibold text-sm shadow-sm">
            <RefreshCw size={14} strokeWidth={2.2} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 transition text-white font-semibold text-sm shadow-sm">
            <Plus size={14} strokeWidth={2.4} /><span>New</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-800">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <div className="font-semibold">Couldn't load complaints</div>
            <div className="text-red-700/90 text-xs mt-0.5">{error}</div>
          </div>
        </div>
      )}

      {complaints.length === 0 && !error && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-4">
            <Inbox size={32} strokeWidth={2} />
          </div>
          <h3 className="text-base font-bold text-slate-900">No complaints yet</h3>
          <p className="mt-1 text-sm text-slate-500 max-w-xs">Have a concern? Submit a complaint and the school administration will respond.</p>
          <button onClick={() => setShowModal(true)}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm">
            <Plus size={14} strokeWidth={2.4} /> Submit a Complaint
          </button>
        </div>
      )}

      {complaints.length > 0 && (
        <div className="space-y-3">
          {complaints.map((c, i) => {
            const status = pickString(c, 'status') || 'pending'
            const meta = getStatusMeta(status)
            const Icon = meta.icon
            const category = pickString(c, 'category') || 'General'
            const subject = pickString(c, 'subject', 'title') || 'Untitled Complaint'
            const description = pickString(c, 'description', 'body', 'message')
            const resolution = pickString(c, 'resolution', 'resolution_notes', 'admin_response')
            const updatedAt = pickString(c, 'updated_at', 'resolved_at') || pickString(c, 'created_at', 'submitted_at')
            return (
              <article key={i} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="flex items-start gap-3 px-4 sm:px-5 py-4 border-b border-slate-100">
                  <div className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: meta.bg, color: meta.color }}>
                    <Icon size={18} strokeWidth={2.2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-slate-900 tracking-tight break-words">{subject}</h3>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider" style={{ backgroundColor: meta.bg, color: meta.color }}>
                        {meta.label}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">{category}</span>
                      <span>•</span>
                      <span>{timeAgo(pickString(c, 'created_at', 'submitted_at'))}</span>
                    </div>
                  </div>
                </div>
                {description && (
                  <div className="px-4 sm:px-5 py-4">
                    <p className="text-sm text-slate-700 whitespace-pre-wrap break-words leading-relaxed">{description}</p>
                  </div>
                )}
                {resolution && (
                  <div className="px-4 sm:px-5 py-4 bg-emerald-50/60 border-t border-emerald-100">
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 size={15} className="flex-shrink-0 mt-0.5 text-emerald-700" strokeWidth={2.2} />
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] uppercase tracking-wider font-bold text-emerald-800 mb-0.5">Resolution</div>
                        <p className="text-sm text-emerald-900 whitespace-pre-wrap break-words leading-relaxed">{resolution}</p>
                        {updatedAt && <p className="text-[10px] text-emerald-700 mt-1.5">Updated {formatDateTime(updatedAt)}</p>}
                      </div>
                    </div>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4" onClick={closeModal}>
          <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
                  <MessageSquare size={18} strokeWidth={2.2} />
                </div>
                <h3 className="text-base font-bold text-slate-900">Submit a Complaint</h3>
              </div>
              <button onClick={closeModal} disabled={submitting} className="p-1.5 rounded-md text-slate-500 hover:bg-slate-200 disabled:opacity-50">
                <X size={18} />
              </button>
            </div>
            <div className="px-5 py-4 space-y-4">
              {formError && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" /><span>{formError}</span>
                </div>
              )}
              {formSuccess && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
                  <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5" /><span>{formSuccess}</span>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Category</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} disabled={submitting}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none text-slate-900 font-medium disabled:bg-slate-50">
                  {CATEGORIES.map((c) => (<option key={c} value={c}>{c}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Subject</label>
                <input type="text" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} disabled={submitting} placeholder="Brief summary of the issue"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none text-slate-900 disabled:bg-slate-50" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} disabled={submitting} rows={4} placeholder="Provide details about your complaint..."
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none text-slate-900 resize-none disabled:bg-slate-50" />
                <div className="mt-1 text-[10px] text-slate-400 text-right">{form.description.length} characters</div>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 flex gap-3">
              <button onClick={closeModal} disabled={submitting}
                className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-semibold text-sm hover:bg-slate-50 disabled:opacity-50">Cancel</button>
              <button onClick={handleSubmit} disabled={submitting || !form.subject.trim() || form.description.trim().length < 10}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                {submitting ? (<><Loader2 size={15} className="animate-spin" />Submitting…</>) : (<><Send size={15} />Submit</>)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
