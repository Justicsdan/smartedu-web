import { useState, useEffect, useCallback } from 'react'
import { dbProxy } from '../../lib/dbProxy'
import { useAuth } from '../../contexts/AuthContext'
import {
  Megaphone,
  Pin,
  Calendar,
  Loader2,
  AlertCircle,
  RefreshCw,
  Clock,
} from 'lucide-react'

// ───────────────────────────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────────────────────────

interface Announcement {
  id: string
  title: string
  content: string
  body: string
  message: string
  author_id: string | null
  author_type: string | null
  author_name: string
  is_pinned: boolean
  is_published: boolean
  target_audience: string
  class_id: string | null
  published_at: string | null
  expires_at: string | null
  created_at: string | null
  [key: string]: any
}

// ───────────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────────

function pickString(record: any, ...keys: string[]): string {
  for (const k of keys) {
    const v = record?.[k]
    if (v !== null && v !== undefined && String(v).trim() !== '') {
      return String(v).trim()
    }
  }
  return ''
}

function getBody(a: any): string {
  // Try every plausible column name for the announcement body
  return pickString(a, 'content', 'body', 'message', 'text', 'description', 'announcement_text')
}

function getTitle(a: any): string {
  return pickString(a, 'title', 'subject', 'name', 'heading')
}

function timeAgo(dateVal: any): string {
  if (!dateVal) return ''
  const dt = new Date(dateVal)
  if (isNaN(dt.getTime())) return ''
  const diff = Date.now() - dt.getTime()
  const sec = Math.floor(diff / 1000)
  const min = Math.floor(sec / 60)
  const hr = Math.floor(min / 60)
  const day = Math.floor(hr / 24)
  const week = Math.floor(day / 7)
  if (sec < 60) return 'Just now'
  if (min < 60) return `${min}m ago`
  if (hr < 24) return `${hr}h ago`
  if (day < 7) return `${day}d ago`
  if (week < 4) return `${week}w ago`
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatFullDate(dateVal: any): string {
  if (!dateVal) return ''
  const d = new Date(dateVal)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function isExpired(expiresAt: any): boolean {
  if (!expiresAt) return false
  const d = new Date(expiresAt)
  if (isNaN(d.getTime())) return false
  return d.getTime() < Date.now()
}

// ───────────────────────────────────────────────────────────────────
// Main page
// ───────────────────────────────────────────────────────────────────

export default function StudentAnnouncementsPage() {
  const { user } = useAuth() as { user: any }

  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const studentClassId = user?.class_id || user?.classId || ''
  const schoolId = user?.school_id || user?.schoolId || ''

  const loadAnnouncements = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError('')
    try {
      const { data, error: err } = await dbProxy
        .from('announcements')
        .select('*')
        .eq('school_id', schoolId)
        .eq('is_published', true)
        .order('is_pinned', { ascending: false })
        .order('published_at', { ascending: false })

      if (err) throw err

      const now = Date.now()
      const all = (data || []).filter((a: any) => {
        // Expiry filter
        if (a.expires_at) {
          const exp = new Date(a.expires_at)
          if (!isNaN(exp.getTime()) && exp.getTime() < now) return false
        }
        // Class filter: school-wide (class_id null) OR matches student's class
        const aClassId = a.class_id ? String(a.class_id) : ''
        if (aClassId && studentClassId && aClassId !== String(studentClassId)) {
          return false
        }
        // Audience filter
        const audience = (a.target_audience || '').toString().toLowerCase()
        if (audience === 'teachers' || audience === 'teacher') return false
        return true
      })

      // NOTE: 'teachers' table is NOT in the student whitelist — we cannot look up author names
      // by author_id. Use author_type label only.
      const mapped: Announcement[] = all.map((a: any) => {
        const authorName =
          pickString(a, 'author_name') ||
          (a.author_type === 'school_admin'
            ? 'School Admin'
            : a.author_type === 'teacher'
            ? 'Teacher'
            : a.author_type || 'School')
        return {
          ...a,
          title: getTitle(a),
          content: getBody(a),
          body: getBody(a),
          message: getBody(a),
          author_name: authorName,
        } as Announcement
      })

      setAnnouncements(mapped)
    } catch (e: any) {
      console.error('Announcements load error:', e)
      setError(e?.message || 'Failed to load announcements')
    } finally {
      setLoading(false)
    }
  }, [user, schoolId, studentClassId])

  useEffect(() => {
    loadAnnouncements()
  }, [loadAnnouncements])

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // ─── Render ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-slate-600">
          <div className="w-14 h-14 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin shadow-lg shadow-emerald-500/20" />
          <span className="text-sm font-semibold text-slate-700">Loading announcements...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="px-3 sm:px-4 lg:px-6 py-4 sm:py-6 max-w-4xl mx-auto bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 min-h-screen space-y-5">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Announcements
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {announcements.length} announcement{announcements.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={loadAnnouncements}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 transition text-slate-700 font-semibold text-sm shadow-sm disabled:opacity-50"
        >
          <RefreshCw size={14} strokeWidth={2.2} className={loading ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* ── Error banner ────────────────────────────────────────── */}
      {error && (
        <div className="mb-4 flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-800">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <div className="font-semibold">Couldn't load announcements</div>
            <div className="text-red-700/90 text-xs mt-0.5">{error}</div>
          </div>
          <button
            onClick={loadAnnouncements}
            className="text-xs font-semibold px-2.5 py-1 rounded-md bg-red-100 hover:bg-red-200 text-red-800"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Empty state ─────────────────────────────────────────── */}
      {announcements.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-4">
            <Megaphone size={32} strokeWidth={2} />
          </div>
          <h3 className="text-base font-bold text-slate-900">No announcements</h3>
          <p className="mt-1 text-sm text-slate-500 text-center max-w-xs">
            Announcements from your school will appear here. Check back later.
          </p>
        </div>
      )}

      {/* ── List ────────────────────────────────────────────────── */}
      <div className="space-y-3">
        {announcements.map((a) => {
          const isExpanded = expanded.has(a.id)
          const body = a.content || ''
          const isLong = body.length > 240
          const displayBody = isExpanded || !isLong ? body : body.slice(0, 240) + '…'
          const expired = isExpired(a.expires_at)

          return (
            <article
              key={a.id}
              className={`bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg shadow-slate-200/40 border overflow-hidden transition ${
                a.is_pinned
                  ? 'border-emerald-300 ring-1 ring-emerald-100'
                  : 'border-slate-200'
              } ${expired ? 'opacity-60' : ''}`}
            >
              {/* Header row */}
              <div className="flex items-start gap-3 px-4 sm:px-5 py-4 border-b border-slate-100">
                <div
                  className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${
                    a.is_pinned
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {a.is_pinned ? (
                    <Pin size={18} strokeWidth={2.2} />
                  ) : (
                    <Megaphone size={18} strokeWidth={2.2} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-bold text-slate-900 tracking-tight break-words">
                      {a.title || 'Untitled Announcement'}
                    </h2>
                    {a.is_pinned && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">
                        <Pin size={9} strokeWidth={2.5} />
                        Pinned
                      </span>
                    )}
                    {expired && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-wider">
                        Expired
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                    <span className="font-medium text-slate-700">{a.author_name}</span>
                    <span className="text-slate-300">•</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock size={11} strokeWidth={2.2} />
                      {timeAgo(a.published_at || a.created_at)}
                    </span>
                    {a.published_at && (
                      <>
                        <span className="text-slate-300 hidden sm:inline">•</span>
                        <span className="hidden sm:inline-flex items-center gap-1 text-slate-400">
                          <Calendar size={11} strokeWidth={2.2} />
                          {formatFullDate(a.published_at)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Body */}
              {body ? (
                <div className="px-4 sm:px-5 py-4">
                  <p
                    className="text-sm sm:text-[15px] text-slate-800 leading-relaxed whitespace-pre-wrap break-words"
                    style={{ lineHeight: 1.65 }}
                  >
                    {displayBody}
                  </p>
                  {isLong && (
                    <button
                      onClick={() => toggleExpand(a.id)}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                    >
                      {isExpanded ? 'Show less' : 'Read more'}
                    </button>
                  )}
                </div>
              ) : (
                <div className="px-4 sm:px-5 py-4">
                  <p className="text-sm italic text-slate-400">No content provided.</p>
                </div>
              )}
            </article>
          )
        })}
      </div>
    </div>
  )
}
