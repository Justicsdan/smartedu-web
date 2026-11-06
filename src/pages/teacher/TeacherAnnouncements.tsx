import { useState, useEffect } from "react"
import { dbProxy } from '../../lib/dbProxy'
import { useAuth } from '../../contexts/AuthContext'
import {
  Plus, Loader2, AlertCircle, CheckCircle, X, Save, Megaphone,
  Pin, Trash2, Eye, EyeOff, Users, GraduationCap,
} from 'lucide-react'

interface Announcement {
  id: string
  title: string
  content: string
  target_audience: string
  class_id: string | null
  is_pinned: boolean
  is_published: boolean
  created_at: string
}

function timeAgo(dateVal: string | null): string {
  if (!dateVal) return ''
  const dt = new Date(dateVal)
  if (isNaN(dt.getTime())) return ''
  const diff = Date.now() - dt.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return dt.toLocaleDateString()
}

export default function TeacherAnnouncements() {
  const { user } = useAuth()
  const teacherId = user?.id || ''
  const schoolId = user?.school_id || user?.schoolId || ''

  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [targetAudience, setTargetAudience] = useState('students')
  const [selectedClassId, setSelectedClassId] = useState('')
  const [isPinned, setIsPinned] = useState(false)

  useEffect(() => {
    if (!teacherId || !schoolId) return
    ;(async () => {
      try {
        const [aRes, cRes] = await Promise.all([
          dbProxy.from('announcements').select('*').eq('school_id', schoolId).eq('author_id', teacherId).order('is_pinned', { ascending: false }).order('created_at', { ascending: false }),
          dbProxy.from('classes').select('id, name, section').eq('school_id', schoolId).order('name'),
        ])
        setAnnouncements((aRes.data || []) as Announcement[])
        setClasses(cRes.data || [])
      } catch (e: any) {
        setError(e.message || 'Failed to load')
      } finally {
        setLoading(false)
      }
    })()
  }, [teacherId, schoolId])

  const handleCreate = async () => {
    if (!title.trim() || !content.trim()) { setError('Title and content are required'); return }
    setSaving(true); setError('')
    try {
      const payload = {
        school_id: schoolId,
        author_id: teacherId,
        author_type: 'teacher',
        title: title.trim(),
        content: content.trim(),
        target_audience: targetAudience,
        class_id: targetAudience === 'students' && selectedClassId ? selectedClassId : null,
        is_pinned: isPinned,
        is_published: true,
        published_at: new Date().toISOString(),
      }
      const { error } = await dbProxy.from('announcements').insert(payload)
      if (error) throw error
      const { data } = await dbProxy.from('announcements').select('*').eq('school_id', schoolId).eq('author_id', teacherId).order('is_pinned', { ascending: false }).order('created_at', { ascending: false })
      setAnnouncements((data || []) as Announcement[])
      setShowModal(false)
      setTitle(''); setContent(''); setTargetAudience('students'); setSelectedClassId(''); setIsPinned(false)
      setSuccessMsg('Announcement created')
    } catch (e: any) {
      setError(e.message || 'Create failed')
    } finally {
      setSaving(false)
    }
  }

  const togglePin = async (a: Announcement) => {
    try {
      const { error } = await dbProxy.from('announcements').update({ is_pinned: !a.is_pinned }).eq('id', a.id)
      if (error) throw error
      setAnnouncements(prev => prev.map(x => x.id === a.id ? { ...x, is_pinned: !a.is_pinned } : x))
    } catch (e: any) { setError(e.message) }
  }

  const handleDelete = async (id: string) => {
    try {
      const { error } = await dbProxy.from('announcements').delete().eq('id', id)
      if (error) throw error
      setAnnouncements(prev => prev.filter(a => a.id !== id))
      setDeleteConfirm(null)
      setSuccessMsg('Announcement deleted')
    } catch (e: any) { setError(e.message) }
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh] bg-gradient-to-br from-slate-50 via-white to-blue-50/30"><div className="w-14 h-14 border-4 border-blue-500 border-t-transparent rounded-full animate-spin shadow-lg shadow-blue-500/20" /></div>
  }

  return (
    <div className="px-3 sm:px-4 lg:px-6 py-4 sm:py-6 max-w-4xl mx-auto space-y-5 bg-gradient-to-br from-slate-50 via-white to-blue-50/30 min-h-screen">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Announcements</h1>
          <p className="text-sm text-slate-500 mt-1">{announcements.length} announcement{announcements.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowModal(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition shadow-sm">
          <Plus size={14} strokeWidth={2.4} />New
        </button>
      </div>

      {error && <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-800"><AlertCircle size={18} className="flex-shrink-0 mt-0.5" /><p className="text-sm flex-1">{error}</p></div>}
      {successMsg && <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800"><CheckCircle size={18} className="flex-shrink-0 mt-0.5" /><p className="text-sm flex-1">{successMsg}</p></div>}

      {announcements.length === 0 ? (
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg shadow-slate-200/40 border border-slate-200/60 py-16 text-center">
          <div className="w-16 h-16 mx-auto bg-blue-50 rounded-2xl flex items-center justify-center mb-4 text-blue-400"><Megaphone size={32} strokeWidth={2} /></div>
          <h3 className="text-base font-bold text-slate-900 mb-1">No Announcements</h3>
          <p className="text-sm text-slate-500">Click "New" to create one.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map(a => {
            const cls = a.class_id ? classes.find(c => c.id === a.class_id) : null
            return (
              <div key={a.id} className={`bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg shadow-slate-200/40 border border-slate-200/60 overflow-hidden transition hover:shadow-md ${a.is_pinned ? 'border-blue-300 ring-1 ring-blue-100' : 'border-slate-200'}`}>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {a.is_pinned && <Pin size={14} className="text-blue-600 flex-shrink-0" />}
                        <h3 className="text-sm font-bold text-slate-900 truncate">{a.title}</h3>
                      </div>
                      <p className="text-sm text-slate-600 whitespace-pre-wrap line-clamp-2">{a.content}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => togglePin(a)} className={`p-1.5 rounded transition ${a.is_pinned ? 'text-blue-600 bg-blue-50' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'}`}>
                        <Pin size={14} />
                      </button>
                      <button onClick={() => setDeleteConfirm(a.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-50">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                      <Users size={11} /> {a.target_audience === 'all' ? 'Everyone' : a.target_audience}
                    </span>
                    {cls && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">{cls.name}{cls.section ? ` ${cls.section}` : ''}</span>}
                    <span className="text-xs text-slate-400 ml-auto">{timeAgo(a.created_at)}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700"><Megaphone size={18} strokeWidth={2.2} /></div>
                <h3 className="text-base font-bold text-slate-900">New Announcement</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-md text-slate-500 hover:bg-slate-200"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Title *</label>
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Announcement title…"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Content *</label>
                <textarea value={content} onChange={e => setContent(e.target.value)} rows={4} placeholder="Write content…"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition resize-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Audience</label>
                <select value={targetAudience} onChange={e => { setTargetAudience(e.target.value); setSelectedClassId('') }}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition">
                  <option value="students">Students</option>
                  <option value="all">Everyone</option>
                </select>
              </div>
              {targetAudience === 'students' && classes.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Specific Class (optional)</label>
                  <select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition">
                    <option value="">All Students</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}{c.section ? ` (${c.section})` : ''}</option>)}
                  </select>
                </div>
              )}
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input type="checkbox" checked={isPinned} onChange={e => setIsPinned(e.target.checked)} className="rounded" />
                Pin to top
              </label>
            </div>
            <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-semibold text-sm hover:bg-slate-50">Cancel</button>
              <button onClick={handleCreate} disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-sm disabled:opacity-50">
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                {saving ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center text-red-600"><Trash2 size={24} strokeWidth={2} /></div>
              <h3 className="text-lg font-bold text-slate-900">Delete?</h3>
            </div>
            <p className="text-sm text-slate-600 mb-5">This cannot be undone.</p>
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
