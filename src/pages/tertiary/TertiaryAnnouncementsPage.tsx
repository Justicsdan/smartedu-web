import { useState, useEffect, useCallback } from 'react'
import { dbProxy } from '../../lib/dbProxy'
import { useAuth } from '../../contexts/AuthContext'
import {
  Megaphone, Plus, AlertCircle, Award, Loader2, Trash2, X, Save, Pin,
} from 'lucide-react'

export default function TertiaryAnnouncementsPage() {
  const { user } = useAuth() as { user: any }
  const schoolId = user?.school_id || user?.schoolId || user?.id || ''
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [items, setItems] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', content: '', is_pinned: false, target_audience: 'all' })

  const load = useCallback(async () => {
    if (!schoolId) { setError('No school ID'); setLoading(false); return }
    setLoading(true); setError('')
    try {
      const { data, error } = await dbProxy.from('announcements').select('*').eq('school_id', schoolId).order('is_pinned', { ascending: false }).order('published_at', { ascending: false })
      if (error) throw error
      setItems(data || [])
    } catch (e: any) {
      setError(e?.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [schoolId])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      setError('Title and content are required')
      return
    }
    setError(''); setSuccess('')
    try {
      const { error } = await dbProxy.from('announcements').insert({
        school_id: schoolId,
        author_id: user?.id,
        author_type: 'school_admin',
        title: form.title.trim(),
        content: form.content.trim(),
        is_pinned: form.is_pinned,
        is_published: true,
        target_audience: form.target_audience,
        published_at: new Date().toISOString(),
      })
      if (error) throw error
      setSuccess('Announcement posted')
      setShowForm(false)
      setForm({ title: '', content: '', is_pinned: false, target_audience: 'all' })
      load()
    } catch (e: any) {
      setError(e?.message || 'Save failed')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this announcement?')) return
    try {
      await dbProxy.from('announcements').delete().eq('id', id)
      setSuccess('Announcement deleted')
      load()
    } catch (e: any) {
      setError(e?.message || 'Delete failed')
    }
  }

  const togglePin = async (id: string, current: boolean) => {
    try {
      await dbProxy.from('announcements').update({ is_pinned: !current }).eq('id', id)
      load()
    } catch (e: any) {
      setError(e?.message || 'Toggle failed')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-gradient-to-br from-slate-50 via-white to-violet-50/30">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 border-4 border-violet-500 border-t-transparent rounded-full animate-spin shadow-lg shadow-violet-500/20" />
          <span className="text-sm font-semibold text-slate-700">Loading announcements...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="px-3 sm:px-4 lg:px-6 py-4 sm:py-6 max-w-4xl mx-auto space-y-5 bg-gradient-to-br from-slate-50 via-white to-violet-50/30 min-h-screen">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-[10px] font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse"></span>
              University
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 bg-clip-text text-transparent">Announcements</h1>
          <p className="text-sm text-slate-500 mt-1.5">Post university-wide notices and updates</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white text-sm font-bold shadow-lg shadow-violet-500/30 hover:-translate-y-0.5 transition-all">
          <Plus size={14} strokeWidth={2.4} /> New Announcement
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

      {items.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-slate-200/60 py-20 text-center shadow-lg shadow-slate-200/40">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-violet-500 to-purple-600 rounded-3xl flex items-center justify-center mb-5 shadow-xl shadow-violet-500/30">
            <Megaphone size={36} className="text-white" strokeWidth={2} />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2 tracking-tight">No Announcements Yet</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">Click "New Announcement" to post your first notice.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(a => (
            <div key={a.id} className={`bg-white/90 backdrop-blur-sm rounded-2xl border ${a.is_pinned ? 'border-amber-200 shadow-amber-100/40' : 'border-slate-200/60'} shadow-lg shadow-slate-200/40 p-4`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md ${a.is_pinned ? 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/30' : 'bg-gradient-to-br from-violet-500 to-purple-600 shadow-violet-500/30'}`}>
                    <Megaphone size={18} strokeWidth={2.2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-slate-900">{a.title}</p>
                      {a.is_pinned && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-wider"><Pin size={10} /> Pinned</span>}
                    </div>
                    <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{a.content}</p>
                    <p className="text-[10px] text-slate-400 mt-2">
                      {a.published_at ? new Date(a.published_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'} · For: {a.target_audience || 'all'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => togglePin(a.id, a.is_pinned)} className="w-8 h-8 rounded-lg bg-amber-50 hover:bg-amber-100 flex items-center justify-center text-amber-600 transition" title="Pin/Unpin">
                    <Pin size={15} strokeWidth={2.2} />
                  </button>
                  <button onClick={() => handleDelete(a.id)} className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-600 transition" title="Delete">
                    <Trash2 size={15} strokeWidth={2.2} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800">New Announcement</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Title *</label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Mid-semester break announcement"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 outline-none transition" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Content *</label>
                <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} rows={5} placeholder="Write the announcement..."
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 outline-none transition resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Target Audience</label>
                  <select value={form.target_audience} onChange={e => setForm({ ...form, target_audience: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 outline-none transition">
                    <option value="all">All Students</option>
                    <option value="students">Specific Level</option>
                  </select>
                </div>
                <label className="flex items-end gap-2 text-xs text-gray-700 pb-3">
                  <input type="checkbox" checked={form.is_pinned} onChange={e => setForm({ ...form, is_pinned: e.target.checked })} className="rounded mb-1" />
                  Pin to top
                </label>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-5 border-t border-gray-100">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg">Cancel</button>
              <button onClick={handleSave} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white text-sm font-bold shadow-lg shadow-violet-500/30 hover:-translate-y-0.5 transition-all">
                <Save size={16} strokeWidth={2.4} /> Post
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
