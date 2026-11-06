import { useState, useEffect, useMemo } from "react"
import { dbProxy } from '../../lib/dbProxy'
import { useAuth } from '../../contexts/AuthContext'
import {
  Loader2, AlertCircle, CheckCircle, Plus, X, Save, Trash2,
  Video, Radio, Calendar, Clock, Users, GraduationCap, School,
  Square, ChevronRight, Phone,
} from 'lucide-react'

interface LiveClass {
  id: string
  school_id: string
  teacher_id: string
  class_id: string | null
  subject_id: string | null
  room_name: string
  status: string
  started_at: string | null
  ended_at: string | null
  scheduled_at: string | null
  audience: string
}

interface ClassRow { id: string; name: string; section: string | null }
interface SubjectRow { id: string; name: string }

const AUDIENCE_OPTIONS = [
  { value: 'class', label: 'Specific Class', icon: GraduationCap },
  { value: 'students', label: 'All Students (Assembly)', icon: Users },
  { value: 'teachers', label: 'All Teachers (Staff Meeting)', icon: School },
  { value: 'all', label: 'Everyone (School-Wide)', icon: Users },
]

// Mirrors Flutter's jitsi_embed_view_web.dart URL builder
function buildJitsiUrl(roomName: string, displayName: string, schoolName: string): string {
  const params = new URLSearchParams({
    'userInfo.displayName': displayName,
    'config.prejoinPageEnabled': 'false',
    'config.disableDeepLinking': 'true',
    'config.startWithAudioMuted': 'true',
    'config.startWithVideoMuted': 'false',
    'interfaceConfig.SHOW_JITSI_WATERMARK': 'false',
    'interfaceConfig.SHOW_WATERMARK_FOR_GUESTS': 'false',
    'interfaceConfig.MOBILE_APP_PROMPT': 'false',
    'interfaceConfig.TOOLBAR_BUTTONS': JSON.stringify([
      'microphone', 'camera', 'desktop', 'chat', 'raisehand', 'tileview', 'hangup'
    ]),
  })
  return `https://meet.jit.si/${roomName}?${params.toString()}`
}

function getMeetingTitle(live: LiveClass, classMap: Record<string, ClassRow>): string {
  const aud = AUDIENCE_OPTIONS.find(a => a.value === live.audience)
  if (live.audience === 'class') {
    const c = live.class_id ? classMap[live.class_id] : null
    return c ? `${c.name}${c.section ? ` ${c.section}` : ''}` : 'Class'
  }
  return aud?.label || 'Live Class'
}

function formatDateTime(iso: string | null): string {
  if (!iso) return 'Now'
  const d = new Date(iso)
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function LiveClassPage() {
  const { user } = useAuth()
  const schoolId = user?.id || ''
  const schoolName = user?.name || 'School'
  const adminDisplayName = `Admin - ${schoolName}`

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const [classes, setClasses] = useState<ClassRow[]>([])
  const [subjects, setSubjects] = useState<SubjectRow[]>([])
  const [liveClasses, setLiveClasses] = useState<LiveClass[]>([])

  const [showStartModal, setShowStartModal] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)
  const [endingId, setEndingId] = useState<string | null>(null)

  // The class currently being joined (renders iframe overlay)
  const [activeRoom, setActiveRoom] = useState<{ roomName: string; title: string; liveClassId: string } | null>(null)

  // Start/Schedule form
  const [audience, setAudience] = useState('class')
  const [selectedClassId, setSelectedClassId] = useState('')
  const [selectedSubjectId, setSelectedSubjectId] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')

  useEffect(() => {
    if (!schoolId) return
    ;(async () => {
      setLoading(true)
      try {
        const [lcRes, cRes, sRes] = await Promise.all([
          dbProxy.from('live_classes')
            .select('*')
            .eq('school_id', schoolId)
            .in('status', ['scheduled', 'live'])
            .order('scheduled_at', { ascending: true }),
          dbProxy.from('classes').select('id, name, section').eq('school_id', schoolId).order('name'),
          dbProxy.from('subjects').select('id, name').eq('school_id', schoolId).order('name'),
        ])
        if (lcRes.error) throw lcRes.error
        if (cRes.error) throw cRes.error
        if (sRes.error) throw sRes.error
        setLiveClasses((lcRes.data || []) as LiveClass[])
        setClasses((cRes.data || []) as ClassRow[])
        setSubjects((sRes.data || []) as SubjectRow[])
      } catch (e: any) {
        setError(e.message || 'Failed to load')
      } finally {
        setLoading(false)
      }
    })()
  }, [schoolId])

  const classMap = useMemo(() => {
    const m: Record<string, ClassRow> = {}
    for (const c of classes) m[c.id] = c
    return m
  }, [classes])

  const subjectMap = useMemo(() => {
    const m: Record<string, SubjectRow> = {}
    for (const s of subjects) m[s.id] = s
    return m
  }, [subjects])

  const liveCount = liveClasses.filter(lc => lc.status === 'live').length
  const scheduledCount = liveClasses.filter(lc => lc.status === 'scheduled').length

  const resetForm = () => {
    setAudience('class')
    setSelectedClassId('')
    setSelectedSubjectId('')
    setScheduledDate('')
    setScheduledTime('')
  }

  const reloadLiveClasses = async () => {
    const { data: newLc } = await dbProxy.from('live_classes')
      .select('*')
      .eq('school_id', schoolId)
      .in('status', ['scheduled', 'live'])
      .order('scheduled_at', { ascending: true })
    setLiveClasses((newLc || []) as LiveClass[])
  }

  const startClass = async () => {
    if (audience === 'class' && (!selectedClassId || !selectedSubjectId)) {
      setError('Select class and subject')
      return
    }
    setStarting(true); setError('')
    try {
      const timestamp = Date.now()
      const roomName = `smartedu_${schoolId}_${audience}_${timestamp}`.replace(/-/g, '')
      let scheduledDateTime: string | null = null
      if (scheduledDate && scheduledTime) {
        scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
      }

      const payload: any = {
        school_id: schoolId,
        teacher_id: '00000000-0000-0000-0000-000000000000',
        class_id: audience === 'class' ? selectedClassId : null,
        subject_id: audience === 'class' ? selectedSubjectId : null,
        audience,
        room_name: roomName,
        status: scheduledDateTime ? 'scheduled' : 'live',
        started_at: scheduledDateTime ? null : new Date().toISOString(),
        scheduled_at: scheduledDateTime,
      }

      const { error: inErr } = await dbProxy.from('live_classes').insert(payload)
      if (inErr) throw inErr

      await reloadLiveClasses()
      setShowStartModal(false)

      if (!scheduledDateTime) {
        // Started live — open embedded iframe
        const title = audience === 'class'
          ? `${classMap[selectedClassId]?.name || 'Class'} - ${subjectMap[selectedSubjectId]?.name || ''}`
          : AUDIENCE_OPTIONS.find(a => a.value === audience)?.label || 'Live Class'
        setActiveRoom({ roomName, title, liveClassId: roomName })
        setSuccessMsg('Live class started — entering room...')
      } else {
        setSuccessMsg('Class scheduled successfully')
        resetForm()
      }
    } catch (e: any) {
      setError(e.message || 'Failed to start')
    } finally {
      setStarting(false)
    }
  }

  const joinClass = (lc: LiveClass) => {
    const title = getMeetingTitle(lc, classMap)
    setActiveRoom({ roomName: lc.room_name, title, liveClassId: lc.id })
  }

  const forceEndClass = async (id: string) => {
    setEndingId(id)
    try {
      const { error } = await dbProxy.from('live_classes')
        .update({ status: 'ended', ended_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
      setLiveClasses(prev => prev.filter(lc => lc.id !== id))
      setSuccessMsg('Class ended')
    } catch (e: any) {
      setError(e.message || 'Failed to end class')
    } finally {
      setEndingId(null)
    }
  }

  const handleLeaveRoom = () => {
    // Just close the iframe — don't end the class (others may still be in it)
    setActiveRoom(null)
  }

  const handleEndFromRoom = async () => {
    if (!activeRoom) return
    // Find the live class by room_name and end it
    const lc = liveClasses.find(l => l.room_name === activeRoom.roomName)
    if (lc) {
      await forceEndClass(lc.id)
    }
    setActiveRoom(null)
  }

  const deleteClass = async (id: string) => {
    try {
      const { error } = await dbProxy.from('live_classes').delete().eq('id', id)
      if (error) throw error
      setLiveClasses(prev => prev.filter(lc => lc.id !== id))
      setDeleteConfirm(null)
      setSuccessMsg('Class deleted')
    } catch (e: any) {
      setError(e.message || 'Delete failed')
    }
  }

  // =========================================================
  // EMBEDDED JITSI VIEW (fullscreen overlay with iframe)
  // =========================================================
  if (activeRoom) {
    const jitsiUrl = buildJitsiUrl(activeRoom.roomName, adminDisplayName, schoolName)
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col">
        {/* Top bar */}
        <div className="bg-[#1A237E] px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Radio className="w-5 h-5 text-red-400 animate-pulse" />
            <div>
              <p className="text-white text-sm font-semibold">{activeRoom.title}</p>
              <p className="text-white/50 text-xs">{schoolName} · Live</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleLeaveRoom}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 text-white rounded-lg text-sm font-medium hover:bg-white/20 transition"
            >
              <Phone className="w-4 h-4 rotate-[135deg]" /> Leave
            </button>
            <button
              onClick={handleEndFromRoom}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition"
            >
              <Square className="w-4 h-4" /> End Class
            </button>
          </div>
        </div>

        {/* Jitsi iframe */}
        <div className="flex-1 relative">
          <iframe
            src={jitsiUrl}
            className="absolute inset-0 w-full h-full"
            style={{ border: 'none' }}
            allow="camera; microphone; fullscreen; display-capture; autoplay"
          />
          {/* School name badge (mirrors Flutter overlay) */}
          <div className="absolute top-3 right-3 px-3 py-1.5 bg-black/60 rounded-md text-white text-xs font-bold pointer-events-none">
            {schoolName}
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-slate-600">
          <div className="w-14 h-14 border-4 border-red-500 border-t-transparent rounded-full animate-spin shadow-lg shadow-red-500/20" />
          <span className="text-sm font-semibold text-slate-700">Loading live classes...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="px-3 sm:px-4 lg:px-6 py-4 sm:py-6 max-w-5xl mx-auto space-y-5 bg-gradient-to-br from-slate-50 via-white to-red-50/30 min-h-screen">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
              Live Classes
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 bg-clip-text text-transparent">Live Classes</h1>
          <p className="text-sm text-slate-500 mt-1.5">Start, schedule, and monitor live video classes</p>
        </div>
        <button onClick={() => { resetForm(); setShowStartModal(true) }} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white text-sm font-bold shadow-lg shadow-red-500/30 hover:-translate-y-0.5 transition-all">
          <Plus className="w-4 h-4" strokeWidth={2.4} /> Start / Schedule
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-800">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          <p className="text-sm flex-1">{error}</p>
        </div>
      )}
      {successMsg && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800">
          <CheckCircle size={18} className="flex-shrink-0 mt-0.5" />
          <p className="text-sm flex-1">{successMsg}</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg shadow-slate-200/40 border border-slate-200/60 p-3 sm:p-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-2.5" style={{ backgroundColor: '#FEF2F2', color: '#EF4444' }}><Radio size={16} strokeWidth={2.2} /></div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{liveCount}</div>
          <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">Live Now</div>
        </div>
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg shadow-slate-200/40 border border-slate-200/60 p-3 sm:p-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-2.5" style={{ backgroundColor: '#EFF6FF', color: '#3B82F6' }}><Calendar size={16} strokeWidth={2.2} /></div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{scheduledCount}</div>
          <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">Scheduled</div>
        </div>
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg shadow-slate-200/40 border border-slate-200/60 p-3 sm:p-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-2.5" style={{ backgroundColor: '#ECFDF5', color: '#10B981' }}><Video size={16} strokeWidth={2.2} /></div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{liveClasses.length}</div>
          <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">Total Active</div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800">
        <div className="w-5 h-5 rounded-full bg-amber-200 flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-amber-700 text-xs font-bold">i</span>
        </div>
        <p className="text-sm">
          Live classes open in-browser (no app required). The host (Admin/Teacher) enters first and becomes the moderator. Students join as guests.
        </p>
      </div>

      {/* Live Classes List */}
      {liveClasses.length === 0 ? (
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg shadow-slate-200/40 border border-slate-200/60 py-16 text-center">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-red-500 to-rose-600 rounded-3xl flex items-center justify-center mb-5 shadow-xl shadow-red-500/30"><Video size={36} strokeWidth={2} className="text-white" /></div>
          <h3 className="text-lg font-bold text-slate-900 mb-2 tracking-tight">No Live Classes</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">Click "Start / Schedule" to begin a live class or schedule one for later.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {liveClasses.map(lc => {
            const title = getMeetingTitle(lc, classMap)
            const subject = lc.subject_id ? subjectMap[lc.subject_id] : null
            const isLive = lc.status === 'live'
            const isScheduledReady = lc.status === 'scheduled' && lc.scheduled_at && new Date(lc.scheduled_at).getTime() <= Date.now()
            const AudIcon = AUDIENCE_OPTIONS.find(a => a.value === lc.audience)?.icon || Video
            return (
              <div key={lc.id} className={`bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg shadow-slate-200/40 border border-slate-200/60 overflow-hidden transition hover:shadow-md ${isLive ? 'border-red-300 ring-1 ring-red-100' : 'border-slate-200'}`}>
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${isLive ? 'bg-red-50' : 'bg-blue-50'}`}>
                      {isLive ? <Radio className="w-5 h-5 text-red-600" /> : <Calendar className="w-5 h-5 text-blue-600" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{title}</p>
                      <p className="text-xs text-slate-400 flex items-center gap-2">
                        <AudIcon className="w-3 h-3" />
                        {subject ? `${subject.name} · ` : ''}
                        {isLive ? 'Live now' : `Scheduled: ${formatDateTime(lc.scheduled_at)}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {(isLive || isScheduledReady) && (
                      <button onClick={() => joinClass(lc)} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition">
                        <Video className="w-3.5 h-3.5" /> {isLive ? 'Join' : 'Start Now'}
                      </button>
                    )}
                    {isLive && (
                      <button
                        onClick={() => forceEndClass(lc.id)}
                        disabled={endingId === lc.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-medium hover:bg-red-100 transition disabled:opacity-50"
                      >
                        {endingId === lc.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Square className="w-3.5 h-3.5" />}
                        End
                      </button>
                    )}
                    <button onClick={() => setDeleteConfirm(lc.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Start / Schedule Modal */}
      {showStartModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowStartModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white z-10">
              <h2 className="text-lg font-bold text-slate-800">Start / Schedule Live Class</h2>
              <button onClick={() => setShowStartModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Audience</label>
                <select value={audience} onChange={e => { setAudience(e.target.value); setSelectedClassId(''); setSelectedSubjectId('') }} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition">
                  {AUDIENCE_OPTIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                </select>
              </div>

              {audience === 'class' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Select Class *</label>
                    <select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition">
                      <option value="">Select class</option>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.name}{c.section ? ` (${c.section})` : ''}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Select Subject *</label>
                    <select value={selectedSubjectId} onChange={e => setSelectedSubjectId(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition">
                      <option value="">Select subject</option>
                      {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </>
              )}

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-xs text-slate-600 mb-2">Leave date/time empty to start <span className="font-semibold text-red-600">LIVE NOW</span></p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">Date</label>
                    <input type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm text-slate-900 focus:border-red-500 focus:ring-1 focus:ring-red-100 outline-none transition" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">Time</label>
                    <input type="time" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm text-slate-900 focus:border-red-500 focus:ring-1 focus:ring-red-100 outline-none transition" />
                  </div>
                </div>
              </div>

              <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-xs text-orange-700">
                  Live classes open in-browser (no app required). You enter first as the host/moderator. Students join as guests.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-5 border-t border-slate-100 sticky bottom-0 bg-white">
              <button onClick={() => setShowStartModal(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg">Cancel</button>
              <button onClick={startClass} disabled={starting || (audience === 'class' && (!selectedClassId || !selectedSubjectId))} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white text-sm font-bold shadow-lg shadow-red-500/30 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:translate-y-0">
                {starting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
                {starting ? 'Starting...' : scheduledDate && scheduledTime ? 'Schedule' : 'Start Live Now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0"><Trash2 className="w-5 h-5 text-red-600" /></div>
              <div>
                <h3 className="font-bold text-slate-800">Delete Live Class?</h3>
                <p className="text-sm text-slate-500 mt-1">This will permanently remove the class. This cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition">Cancel</button>
              <button onClick={() => deleteClass(deleteConfirm)} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white text-sm font-bold shadow-lg shadow-red-500/30 transition">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
