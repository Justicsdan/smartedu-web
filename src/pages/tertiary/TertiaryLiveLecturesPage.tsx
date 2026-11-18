import { useState, useEffect, useCallback } from 'react'
import { dbProxy } from '../../lib/dbProxy'
import { useAuth } from '../../contexts/AuthContext'
import {
  Video, Plus, AlertCircle, Award, Loader2, Trash2, X, Save,
  Calendar, Clock, Users, Search, PlayCircle,
} from 'lucide-react'

export default function TertiaryLiveLecturesPage() {
  const { user } = useAuth() as { user: any }
  const schoolId = user?.school_id || user?.schoolId || user?.id || ''
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [lectures, setLectures] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    course_id: '', scheduled_at: '', duration_minutes: 60,
    join_url: '', target_audience: 'all', instructions: '',
  })

  const load = useCallback(async () => {
    if (!schoolId) { setError('No school ID'); setLoading(false); return }
    setLoading(true); setError('')
    try {
      const [lecRes, crsRes] = await Promise.all([
        dbProxy.from('live_classes').select('*').eq('school_id', schoolId).order('scheduled_at', { ascending: false }),
        dbProxy.from('uni_courses').select('id, course_code, course_title').eq('school_id', schoolId).order('course_code'),
      ])
      setLectures(lecRes.data || [])
      setCourses(crsRes.data || [])
    } catch (e: any) {
      setError(e?.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [schoolId])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    if (!form.course_id || !form.scheduled_at) {
      setError('Course and scheduled time are required')
      return
    }
    setError(''); setSuccess('')
    try {
      const { error } = await dbProxy.from('live_classes').insert({
        school_id: schoolId,
        course_id: form.course_id,
        teacher_id: user?.id,
        room_name: 'lecture-' + Date.now().toString(36),
        class_id: null,
        scheduled_at: new Date(form.scheduled_at).toISOString(),
        duration_minutes: Number(form.duration_minutes) || 60,
        status: 'scheduled',
        audience: form.target_audience,
        join_url: form.join_url,
        instructions: form.instructions,
      })
      if (error) throw error
      setSuccess('Live lecture scheduled')
      setShowForm(false)
      setForm({ course_id: '', scheduled_at: '', duration_minutes: 60, join_url: '', target_audience: 'all', instructions: '' })
      load()
    } catch (e: any) {
      setError(e?.message || 'Save failed')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this scheduled lecture?')) return
    try {
      await dbProxy.from('live_classes').delete().eq('id', id)
      setSuccess('Lecture deleted')
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
          <span className="text-sm font-semibold text-slate-700">Loading live lectures...</span>
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
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 bg-clip-text text-transparent">Live Lectures</h1>
          <p className="text-sm text-slate-500 mt-1.5">Schedule and host virtual lectures via Zoom, Meet, or Teams</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white text-sm font-bold shadow-lg shadow-violet-500/30 hover:-translate-y-0.5 transition-all">
          <Plus size={14} strokeWidth={2.4} /> Schedule Lecture
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

      {lectures.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-slate-200/60 py-20 text-center shadow-lg shadow-slate-200/40">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-violet-500 to-purple-600 rounded-3xl flex items-center justify-center mb-5 shadow-xl shadow-violet-500/30">
            <Video size={36} className="text-white" strokeWidth={2} />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2 tracking-tight">No Live Lectures Yet</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">Click "Schedule Lecture" to set up your first virtual class.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {lectures.map(lec => {
            const course = courses.find(c => c.id === lec.course_id)
            const date = new Date(lec.scheduled_at)
            const isUpcoming = date.getTime() > Date.now()
            return (
              <div key={lec.id} className={`bg-white/90 backdrop-blur-sm rounded-2xl border ${isUpcoming ? 'border-violet-200' : 'border-slate-200'} shadow-lg shadow-slate-200/40 p-4`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md ${isUpcoming ? 'bg-gradient-to-br from-violet-500 to-purple-600 shadow-violet-500/30' : 'bg-slate-300 shadow-slate-300/30'}`}>
                      <Video size={18} strokeWidth={2.2} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{course ? `${course.course_code} — ${course.course_title}` : 'Unknown course'}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{lec.status || 'scheduled'}</p>
                    </div>
                  </div>
                  <button onClick={() => handleDelete(lec.id)} className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-600 transition" title="Delete">
                    <Trash2 size={15} strokeWidth={2.2} />
                  </button>
                </div>
                <div className="space-y-1.5 text-xs text-slate-600">
                  <p className="flex items-center gap-2"><Calendar size={12} /> {date.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                  <p className="flex items-center gap-2"><Clock size={12} /> {lec.duration_minutes} minutes</p>
                  <p className="flex items-center gap-2"><Users size={12} /> {lec.audience || 'all'}</p>
                </div>
                {lec.join_url && (
                  <a href={lec.join_url} target="_blank" rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white text-xs font-bold shadow-md shadow-emerald-500/30 transition-all">
                    <PlayCircle size={14} strokeWidth={2.2} /> Join Lecture
                  </a>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800">Schedule Live Lecture</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Course *</label>
                <select value={form.course_id} onChange={e => setForm({ ...form, course_id: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 outline-none transition">
                  <option value="">— Select Course —</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.course_code} — {c.course_title}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Scheduled Time *</label>
                  <input type="datetime-local" value={form.scheduled_at} onChange={e => setForm({ ...form, scheduled_at: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 outline-none transition" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Duration (min)</label>
                  <input type="number" value={form.duration_minutes} onChange={e => setForm({ ...form, duration_minutes: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 outline-none transition" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Lecture URL (Zoom, Meet, Teams)</label>
                <input value={form.join_url} onChange={e => setForm({ ...form, join_url: e.target.value })} placeholder="https://meet.google.com/..."
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 outline-none transition" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Target Audience</label>
                <select value={form.target_audience} onChange={e => setForm({ ...form, target_audience: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 outline-none transition">
                  <option value="all">All Students</option>
                  <option value="class">Specific Level</option>
                  <option value="students">Specific Students</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-5 border-t border-gray-100">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg">Cancel</button>
              <button onClick={handleSave} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white text-sm font-bold shadow-lg shadow-violet-500/30 hover:-translate-y-0.5 transition-all">
                <Save size={16} strokeWidth={2.4} /> Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
