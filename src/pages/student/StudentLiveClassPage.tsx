import { useState, useEffect, useCallback } from 'react'
import { dbProxy } from '../../lib/dbProxy'
import { useAuth } from '../../contexts/AuthContext'
import {
  Video, VideoOff, Calendar, Clock, Users, Loader2, AlertCircle, RefreshCw,
  Play, PhoneOff, BookOpen, Radio, Inbox,
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

function formatTime(dateVal: any): string {
  if (!dateVal) return ''
  const d = new Date(dateVal)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function timeAgo(dateVal: any): string {
  if (!dateVal) return ''
  const dt = new Date(dateVal)
  if (isNaN(dt.getTime())) return ''
  const diff = Date.now() - dt.getTime()
  const min = Math.floor(diff / 60000)
  const hr = Math.floor(min / 60)
  if (min < 1) return 'Just now'
  if (min < 60) return `${min}m ago`
  if (hr < 24) return `${hr}h ago`
  return formatDateTime(dateVal)
}

function isLiveNow(item: any): boolean {
  // Live if status='live' OR (started_at exists AND ended_at is null)
  if (item.status === 'live' || item.status === 'active') return true
  if (item.started_at && !item.ended_at) return true
  return false
}

function isUpcoming(item: any): boolean {
  if (item.status === 'ended' || item.ended_at) return false
  if (!item.scheduled_at) return false
  const start = new Date(item.scheduled_at).getTime()
  return start > Date.now()
}

function buildJitsiUrl(roomName: string, displayName: string): string {
  const safeRoom = roomName.replace(/[^a-zA-Z0-9-_]/g, '')
  const safeName = encodeURIComponent(displayName || 'Student')
  return `https://meet.jit.si/${safeRoom}#config.prejoinPageEnabled=false&config.disableDeepLinking=true&userInfo.displayName=${safeName}&config.startWithVideoMuted=false&config.startWithAudioMuted=false`
}

export default function StudentLiveClassPage() {
  const { user } = useAuth() as { user: any }
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [classes, setClasses] = useState<any[]>([])
  const [activeClass, setActiveClass] = useState<any>(null)
  const studentId = user?.id || user?.student_id || user?.studentId || ''
  const classId = user?.class_id || user?.classId || ''
  const schoolId = user?.school_id || user?.schoolId || ''
  const displayName = [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim() || 'Student'

  const loadClasses = useCallback(async () => {
    if (!user) return
    setLoading(true); setError('')
    try {
      // Plain select — no joins (live_classes has no FK relationships in schema cache)
      const { data: rawClasses, error: err } = await dbProxy
        .from('live_classes')
        .select('*')
        .eq('school_id', schoolId)
        .order('scheduled_at', { ascending: false })
      if (err) throw err

      const allClasses = rawClasses || []
      const classIds = Array.from(new Set(allClasses.map((c: any) => c.class_id).filter(Boolean))) as string[]
      const subjectIds = Array.from(new Set(allClasses.map((c: any) => c.subject_id).filter(Boolean))) as string[]
      const teacherIds = Array.from(new Set(allClasses.map((c: any) => c.created_by || c.teacher_id).filter(Boolean))) as string[]

      const [cRes, sRes, tRes] = await Promise.all([
        classIds.length
          ? dbProxy.from('classes').select('id, name, section').in('id', classIds)
          : Promise.resolve({ data: [], error: null }),
        subjectIds.length
          ? dbProxy.from('subjects').select('id, name, code').in('id', subjectIds)
          : Promise.resolve({ data: [], error: null }),
        teacherIds.length
          ? dbProxy.from('teachers').select('id, first_name, last_name').in('id', teacherIds)
          : Promise.resolve({ data: [], error: null }),
      ])

      const classMap: Record<string, any> = {}
      ;(cRes.data || []).forEach((c: any) => { classMap[c.id] = c })
      const subjectMap: Record<string, any> = {}
      ;(sRes.data || []).forEach((s: any) => { subjectMap[s.id] = s })
      const teacherMap: Record<string, any> = {}
      ;(tRes.data || []).forEach((t: any) => { teacherMap[t.id] = t })

      const enriched = allClasses.map((c: any) => ({
        ...c,
        classes: c.class_id ? classMap[c.class_id] : null,
        subjects: c.subject_id ? subjectMap[c.subject_id] : null,
        teachers: (c.created_by || c.teacher_id) ? teacherMap[c.created_by || c.teacher_id] : null,
      }))
      const visible = enriched.filter((c: any) => {
        const audience = (c.audience || 'class').toLowerCase()
        if (audience === 'all' || audience === 'students') return true
        if (audience === 'teachers') return false
        return c.class_id && classId && String(c.class_id) === String(classId)
      })
      setClasses(visible)
    } catch (e: any) {
      console.error('Live class load error:', e)
      setError(e?.message || 'Failed to load live classes. Check console for details.')
    } finally { setLoading(false) }
  }, [user, schoolId, classId])

  useEffect(() => { loadClasses() }, [loadClasses])

  useEffect(() => {
    const id = setInterval(() => { setClasses((prev) => [...prev]) }, 30000)
    return () => clearInterval(id)
  }, [])

  const handleJoin = (cls: any) => { setActiveClass(cls) }
  const handleLeave = () => { setActiveClass(null) }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-slate-600">
          <div className="w-14 h-14 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin shadow-lg shadow-emerald-500/20" />
          <span className="text-sm font-semibold text-slate-700">Loading live classes...</span>
        </div>
      </div>
    )
  }

  if (activeClass) {
    const roomName = activeClass.room_name || `smartedu_${activeClass.id}_${schoolId}`.replace(/[^a-zA-Z0-9-_]/g, '')
    const jitsiUrl = buildJitsiUrl(roomName, displayName)
    const cls = activeClass.classes || {}
    const subj = activeClass.subjects || {}
    const teacher = activeClass.teachers || {}
    const teacherName = [teacher.first_name, teacher.last_name].filter(Boolean).join(' ').trim() || 'Teacher'
    const className = cls.name ? (cls.section ? `${cls.name} ${cls.section}` : cls.name) : ''
    const subjectName = subj.name || subj.code || ''
    return (
      <div className="flex flex-col h-screen">
        <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-100 text-red-700 text-[10px] font-bold uppercase tracking-wider">
                <Radio size={10} strokeWidth={2.4} />Live
              </span>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate">{pickString(activeClass, 'title', 'name') || 'Live Class'}</h2>
            </div>
            <div className="text-xs text-slate-500 mt-0.5 truncate">
              {teacherName}{subjectName && ` • ${subjectName}`}{className && ` • ${className}`}
            </div>
          </div>
          <button onClick={handleLeave}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-sm shadow-sm">
            <PhoneOff size={14} strokeWidth={2.4} />
            <span className="hidden sm:inline">Leave</span>
          </button>
        </div>
        <div className="flex-1 bg-gradient-to-r from-slate-900 to-slate-700 relative">
          <iframe src={jitsiUrl}
            allow="camera; microphone; fullscreen; display-capture; autoplay"
            className="absolute inset-0 w-full h-full border-0" title="Live Class" />
        </div>
      </div>
    )
  }

  const liveNow = classes.filter(isLiveNow)
  const upcoming = classes.filter(isUpcoming)
  const past = classes.filter((c) => !isLiveNow(c) && !isUpcoming(c)).slice(0, 2)

  return (
    <div className="px-3 sm:px-4 lg:px-6 py-4 sm:py-6 max-w-4xl mx-auto space-y-5 bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 min-h-screen">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Classes
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 bg-clip-text text-transparent">Live Class</h1>
        </div>
          <p className="mt-0.5 text-sm text-slate-500">{liveNow.length} live now • {upcoming.length} upcoming</p>
        </div>
        <button onClick={loadClasses} disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 transition text-slate-700 font-semibold text-sm shadow-sm">
          <RefreshCw size={14} strokeWidth={2.2} className={loading ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-800">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <div className="font-semibold">Couldn't load live classes</div>
            <div className="text-red-700/90 text-xs mt-0.5">{error}</div>
          </div>
        </div>
      )}

      {classes.length === 0 && !error && (
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg shadow-slate-200/40 border border-slate-200/60 p-10 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-4">
            <Inbox size={32} strokeWidth={2} />
          </div>
          <h3 className="text-base font-bold text-slate-900">No live classes scheduled</h3>
          <p className="mt-1 text-sm text-slate-500 max-w-xs">When your teachers start or schedule a live class, it will appear here.</p>
        </div>
      )}

      {liveNow.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
            </span>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Live Now</h2>
          </div>
          <div className="space-y-3">
            {liveNow.map((c) => (<LiveClassCard key={c.id} cls={c} onJoin={handleJoin} variant="live" />))}
          </div>
        </div>
      )}

      {upcoming.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Clock size={16} className="text-amber-600" strokeWidth={2.4} />
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Upcoming</h2>
          </div>
          <div className="space-y-3">
            {upcoming.map((c) => (<LiveClassCard key={c.id} cls={c} onJoin={handleJoin} variant="upcoming" />))}
          </div>
        </div>
      )}

      {past.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <VideoOff size={16} className="text-slate-500" strokeWidth={2.4} />
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Past Classes</h2>
          </div>
          <div className="space-y-3">
            {past.map((c) => (<LiveClassCard key={c.id} cls={c} onJoin={handleJoin} variant="past" />))}
          </div>
        </div>
      )}
    </div>
  )
}

function LiveClassCard({ cls, onJoin, variant }: {
  cls: any; onJoin: (cls: any) => void; variant: 'live' | 'upcoming' | 'past'
}) {
  const subj = cls.subjects || {}
  const clsData = cls.classes || {}
  const teacher = cls.teachers || {}
  const subjectName = subj.name || subj.code || ''
  const className = clsData.name ? (clsData.section ? `${clsData.name} ${clsData.section}` : clsData.name) : ''
  const teacherName = [teacher.first_name, teacher.last_name].filter(Boolean).join(' ').trim() || 'Teacher'
  const title = pickString(cls, 'title', 'name') || 'Live Class'
  const audience = (cls.audience || 'class').toLowerCase()
  const meta = variant === 'live'
    ? { label: 'Live Now', color: '#ef4444', bg: '#fef2f2', icon: Radio }
    : variant === 'upcoming'
      ? { label: 'Upcoming', color: '#f59e0b', bg: '#fffbeb', icon: Clock }
      : { label: 'Ended', color: '#64748b', bg: '#f1f5f9', icon: VideoOff }
  const Icon = meta.icon
  return (
    <article className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg shadow-slate-200/40 border border-slate-200/60-2 overflow-hidden"
      style={{ borderColor: variant === 'live' ? '#ef444440' : '#e2e8f0' }}>
      <div className="flex items-start gap-3 px-4 sm:px-5 py-4 border-b border-slate-100">
        <div className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: meta.bg, color: meta.color }}>
          <Icon size={20} strokeWidth={2.2} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-bold text-slate-900 tracking-tight break-words">{title}</h3>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider"
              style={{ backgroundColor: meta.bg, color: meta.color }}>{meta.label}</span>
            {audience === 'all' && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-blue-100 text-blue-700">School-wide</span>
            )}
            {audience === 'students' && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-100 text-emerald-700">All Students</span>
            )}
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
              <BookOpen size={10} strokeWidth={2.2} />{subjectName || 'General'}
            </span>
            {className && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                <Users size={10} strokeWidth={2.2} />{className}
              </span>
            )}
            <span>•</span>
            <span>{teacherName}</span>
          </div>
          <div className="mt-2 flex items-center gap-3 text-xs text-slate-500 flex-wrap">
            {cls.scheduled_at && (
              <span className="inline-flex items-center gap-1">
                <Calendar size={12} className="text-slate-400" strokeWidth={2.2} />
                <span>{formatDateTime(cls.scheduled_at)}</span>
              </span>
            )}
            {cls.started_at && !cls.ended_at && (
              <span className="inline-flex items-center gap-1">
                <Clock size={12} className="text-red-500" strokeWidth={2.2} />
                <span className="text-red-600 font-semibold">Live now</span>
              </span>
            )}
            {variant === 'past' && cls.ended_at && (
              <span className="text-slate-400">Ended {timeAgo(cls.ended_at)}</span>
            )}
          </div>
        </div>
      </div>
      <div className="px-4 sm:px-5 py-3 border-t border-slate-100 flex items-center justify-end">
        {variant === 'live' ? (
          <button onClick={() => onJoin(cls)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold shadow-sm transition">
            <Play size={14} strokeWidth={2.4} />Join Now
          </button>
        ) : variant === 'upcoming' ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700">
            <Clock size={13} strokeWidth={2.4} />
            Starts {timeAgo(cls.scheduled_at).replace(' ago', '')}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
            <VideoOff size={13} strokeWidth={2.2} />Class ended
          </span>
        )}
      </div>
    </article>
  )
}
