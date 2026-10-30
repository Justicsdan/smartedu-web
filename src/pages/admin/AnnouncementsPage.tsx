import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import {
  Plus, Loader2, AlertCircle, CheckCircle, X, Save, Megaphone,
  Pin, Trash2, Eye, EyeOff, Users, GraduationCap, School,
} from 'lucide-react'

interface Announcement {
  id: string
  school_id: string
  author_id: string
  author_type: string
  title: string
  content: string
  target_audience: string
  class_id: string | null
  is_pinned: boolean
  is_published: boolean
  published_at: string | null
  created_at: string
  updated_at: string
}

interface ClassRow { id: string; name: string; section: string | null }

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

const AUDIENCE_LABELS: Record<string, { label: string; icon: any; color: string }> = {
  all: { label: 'Everyone', icon: School, color: 'bg-indigo-100 text-indigo-700' },
  students: { label: 'Students', icon: GraduationCap, color: 'bg-blue-100 text-blue-700' },
  teachers: { label: 'Teachers', icon: Users, color: 'bg-green-100 text-green-700' },
}

export default function AnnouncementsPage() {
  const { user } = useAuth()
  const schoolId = user?.id || ''

  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  // Form state
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [targetAudience, setTargetAudience] = useState('all')
  const [selectedClassId, setSelectedClassId] = useState('')
  const [isPinned, setIsPinned] = useState(false)
  const [publishNow, setPublishNow] = useState(true)

  useEffect(() => {
    if (!schoolId) return
    ;(async () => {
      setLoading(true)
      try {
        const [aRes, cRes] = await Promise.all([
          supabase.from('announcements').select('*').eq('school_id', schoolId).order('is_pinned', { ascending: false }).order('created_at', { ascending: false }),
          supabase.from('classes').select('id, name, section').eq('school_id', schoolId).order('name'),
        ])
        if (aRes.error) throw aRes.error
        if (cRes.error) throw cRes.error
        setAnnouncements((aRes.data || []) as Announcement[])
        setClasses(cRes.data || [])
      } catch (e: any) {
        setError(e.message || 'Failed to load')
      } finally {
        setLoading(false)
      }
    })()
  }, [schoolId])

  const resetForm = () => {
    setTitle('')
    setContent('')
    setTargetAudience('all')
    setSelectedClassId('')
    setIsPinned(false)
    setPublishNow(true)
  }

  const handleCreate = async () => {
    if (!title.trim() || !content.trim()) { setError('Title and content are required'); return }
    setSaving(true); setError('')
    try {
      const payload = {
        school_id: schoolId,
        author_id: schoolId,
        author_type: 'school_admin',
        title: title.trim(),
        content: content.trim(),
        target_audience: targetAudience,
        class_id: targetAudience === 'students' && selectedClassId ? selectedClassId : null,
        is_pinned: isPinned,
        is_published: publishNow,
        published_at: publishNow ? new Date().toISOString() : null,
        attachment_url: null,
        expires_at: null,
      }
      const { error } = await supabase.from('announcements').insert(payload)
      if (error) throw error
      const { data } = await supabase.from('announcements').select('*').eq('school_id', schoolId).order('is_pinned', { ascending: false }).order('created_at', { ascending: false })
      setAnnouncements((data || []) as Announcement[])
      setShowModal(false)
      resetForm()
      setSuccessMsg('Announcement created')
    } catch (e: any) {
      setError(e.message || 'Create failed')
    } finally {
      setSaving(false)
    }
  }

  const togglePublish = async (a: Announcement) => {
    try {
      const newVal = !a.is_published
      const { error } = await supabase.from('announcements').update({
        is_published: newVal,
        published_at: newVal ? new Date().toISOString() : null,
      }).eq('id', a.id)
      if (error) throw error
      setAnnouncements(prev => prev.map(x => x.id === a.id ? { ...x, is_published: newVal, published_at: newVal ? new Date().toISOString() : null } : x))
      setSuccessMsg(newVal ? 'Announcement published' : 'Announcement unpublished')
    } catch (e: any) {
      setError(e.message || 'Toggle failed')
    }
  }

  const togglePin = async (a: Announcement) => {
    try {
      const newVal = !a.is_pinned
      const { error } = await supabase.from('announcements').update({ is_pinned: newVal }).eq('id', a.id)
      if (error) throw error
      setAnnouncements(prev => {
        const updated = prev.map(x => x.id === a.id ? { ...x, is_pinned: newVal } : x)
        // Re-sort: pinned first, then by created_at desc
        return updated.sort((x, y) => {
          if (x.is_pinned !== y.is_pinned) return x.is_pinned ? -1 : 1
          return new Date(y.created_at).getTime() - new Date(x.created_at).getTime()
        })
      })
    } catch (e: any) {
      setError(e.message || 'Pin toggle failed')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('announcements').delete().eq('id', id)
      if (error) throw error
      setAnnouncements(prev => prev.filter(a => a.id !== id))
      setDeleteConfirm(null)
      setSuccessMsg('Announcement deleted')
    } catch (e: any) {
      setError(e.message || 'Delete failed')
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-[#1A237E] animate-spin" /></div>
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Announcements</h1>
          <p className="text-sm text-gray-500 mt-1">{announcements.length} announcement{announcements.length !== 1 ? 's' : ''} · {announcements.filter(a => a.is_published).length} published</p>
        </div>
        <button onClick={() => { resetForm(); setShowModal(true) }} className="flex items-center gap-2 px-4 py-2 bg-[#1A237E] text-white rounded-lg text-sm font-medium hover:bg-[#283593] transition">
          <Plus className="w-4 h-4" /> New Announcement
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      {successMsg && (
        <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-green-700">{successMsg}</p>
        </div>
      )}

      {announcements.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <div className="w-16 h-16 mx-auto bg-blue-50 rounded-2xl flex items-center justify-center mb-3"><Megaphone className="w-8 h-8 text-blue-400" /></div>
          <h3 className="text-gray-700 font-medium mb-1">No Announcements</h3>
          <p className="text-gray-400 text-sm">Click "New Announcement" to create your first one.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map(a => {
            const aud = AUDIENCE_LABELS[a.target_audience] || AUDIENCE_LABELS.all
            const AudIcon = aud.icon
            const cls = a.class_id ? classes.find(c => c.id === a.class_id) : null
            return (
              <div key={a.id} className={`bg-white rounded-xl border overflow-hidden ${a.is_pinned ? 'border-[#1A237E] shadow-sm' : 'border-gray-100'}`}>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {a.is_pinned && <Pin className="w-3.5 h-3.5 text-[#1A237E] flex-shrink-0" />}
                        <h3 className="text-sm font-semibold text-gray-800 truncate">{a.title}</h3>
                      </div>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">{a.content}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => togglePin(a)} className={`p-1.5 rounded transition ${a.is_pinned ? 'text-[#1A237E] bg-indigo-50' : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50'}`} title={a.is_pinned ? 'Unpin' : 'Pin to top'}>
                        <Pin className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => togglePublish(a)} className={`p-1.5 rounded transition ${a.is_published ? 'text-green-600 bg-green-50' : 'text-gray-400 hover:text-green-600 hover:bg-green-50'}`} title={a.is_published ? 'Unpublish' : 'Publish'}>
                        {a.is_published ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => setDeleteConfirm(a.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition" title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${aud.color}`}>
                      <AudIcon className="w-3 h-3" /> {aud.label}
                    </span>
                    {cls && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-medium">
                        {cls.name}{cls.section ? ` (${cls.section})` : ''}
                      </span>
                    )}
                    {!a.is_published && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs font-medium">
                        <EyeOff className="w-3 h-3" /> Draft
                      </span>
                    )}
                    <span className="text-xs text-gray-400 ml-auto">{timeAgo(a.created_at)}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center"><Megaphone className="w-4 h-4 text-[#1A237E]" /></div>
                <h2 className="text-lg font-bold text-gray-800">New Announcement</h2>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Title *</label>
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Announcement title..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Content *</label>
                <textarea value={content} onChange={e => setContent(e.target.value)} rows={4} placeholder="Write announcement content..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30 resize-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Target Audience</label>
                <select value={targetAudience} onChange={e => { setTargetAudience(e.target.value); setSelectedClassId('') }} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30">
                  <option value="all">Everyone</option>
                  <option value="students">Students Only</option>
                  <option value="teachers">Teachers Only</option>
                </select>
              </div>
              {targetAudience === 'students' && classes.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Specific Class (optional)</label>
                  <select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30">
                    <option value="">All Students</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}{c.section ? ` (${c.section})` : ''}</option>)}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button onClick={() => setIsPinned(!isPinned)} className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition ${isPinned ? 'border-[#1A237E] bg-indigo-50 text-[#1A237E]' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  <Pin className="w-4 h-4" /> Pin to top
                </button>
                <button onClick={() => setPublishNow(!publishNow)} className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition ${publishNow ? 'border-green-600 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  <Eye className="w-4 h-4" /> Publish now
                </button>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-5 border-t border-gray-100 sticky bottom-0 bg-white">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg">Cancel</button>
              <button onClick={handleCreate} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-[#1A237E] text-white rounded-lg text-sm font-medium hover:bg-[#283593] transition disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Creating...' : 'Create Announcement'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0"><Trash2 className="w-5 h-5 text-red-600" /></div>
              <div>
                <h3 className="font-bold text-gray-800">Delete Announcement?</h3>
                <p className="text-sm text-gray-500 mt-1">This will permanently remove the announcement. This cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 py-2.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
