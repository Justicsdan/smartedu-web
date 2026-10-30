import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
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
          supabase.from('live_classes')
            .select('*')
            .eq('school_id', schoolId)
            .in('status', ['scheduled', 'live'])
            .order('scheduled_at', { ascending: true }),
          supabase.from('classes').select('id, name, section').eq('school_id', schoolId).order('name'),
          supabase.from('subjects').select('id, name').eq('school_id', schoolId).order('name'),
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
    const { data: newLc } = await supabase.from('live_classes')
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

      const { error: inErr } = await supabase.from('live_classes').insert(payload)
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
      const { error } = await supabase.from('live_classes')
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
      const { error } = await supabase.from('live_classes').delete().eq('id', id)
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
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-[#1A237E] animate-spin" /></div>
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Live Classes</h1>
          <p className="text-sm text-gray-500 mt-1">Start, schedule, and monitor live video classes</p>
        </div>
        <button onClick={() => { resetForm(); setShowStartModal(true) }} className="flex items-center gap-2 px-4 py-2 bg-[#1A237E] text-white rounded-lg text-sm font-medium hover:bg-[#283593] transition">
          <Plus className="w-4 h-4" /> Start / Schedule
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

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center"><Radio className="w-5 h-5 text-red-600" /></div>
          <div><p className="text-xs text-gray-500">Live Now</p><p className="text-lg font-bold text-gray-800">{liveCount}</p></div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center"><Calendar className="w-5 h-5 text-blue-600" /></div>
          <div><p className="text-xs text-gray-500">Scheduled</p><p className="text-lg font-bold text-gray-800">{scheduledCount}</p></div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center"><Video className="w-5 h-5 text-green-600" /></div>
          <div><p className="text-xs text-gray-500">Total Active</p><p className="text-lg font-bold text-gray-800">{liveClasses.length}</p></div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
        <div className="w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-orange-600 text-xs font-bold">i</span>
        </div>
        <p className="text-sm text-orange-700">
          Live classes open in-browser (no app required). The host (Admin/Teacher) enters first and becomes the moderator. Students join as guests.
        </p>
      </div>

      {/* Live Classes List */}
      {liveClasses.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <div className="w-16 h-16 mx-auto bg-blue-50 rounded-2xl flex items-center justify-center mb-3"><Video className="w-8 h-8 text-blue-400" /></div>
          <h3 className="text-gray-700 font-medium mb-1">No Live Classes</h3>
          <p className="text-gray-400 text-sm">Click "Start / Schedule" to begin a live class or schedule one for later.</p>
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
              <div key={lc.id} className={`bg-white rounded-xl border overflow-hidden ${isLive ? 'border-red-300 shadow-sm' : 'border-gray-100'}`}>
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${isLive ? 'bg-red-50' : 'bg-blue-50'}`}>
                      {isLive ? <Radio className="w-5 h-5 text-red-600" /> : <Calendar className="w-5 h-5 text-blue-600" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{title}</p>
                      <p className="text-xs text-gray-400 flex items-center gap-2">
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
                    <button onClick={() => setDeleteConfirm(lc.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition">
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowStartModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h2 className="text-lg font-bold text-gray-800">Start / Schedule Live Class</h2>
              <button onClick={() => setShowStartModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Audience</label>
                <select value={audience} onChange={e => { setAudience(e.target.value); setSelectedClassId(''); setSelectedSubjectId('') }} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30">
                  {AUDIENCE_OPTIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                </select>
              </div>

              {audience === 'class' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Select Class *</label>
                    <select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30">
                      <option value="">Select class</option>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.name}{c.section ? ` (${c.section})` : ''}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Select Subject *</label>
                    <select value={selectedSubjectId} onChange={e => setSelectedSubjectId(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30">
                      <option value="">Select subject</option>
                      {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </>
              )}

              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-xs text-gray-600 mb-2">Leave date/time empty to start <span className="font-semibold text-red-600">LIVE NOW</span></p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">Date</label>
                    <input type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#1A237E]/30" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">Time</label>
                    <input type="time" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)} className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#1A237E]/30" />
                  </div>
                </div>
              </div>

              <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-xs text-orange-700">
                  Live classes open in-browser (no app required). You enter first as the host/moderator. Students join as guests.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-5 border-t border-gray-100 sticky bottom-0 bg-white">
              <button onClick={() => setShowStartModal(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg">Cancel</button>
              <button onClick={startClass} disabled={starting || (audience === 'class' && (!selectedClassId || !selectedSubjectId))} className="flex items-center gap-2 px-4 py-2 bg-[#1A237E] text-white rounded-lg text-sm font-medium hover:bg-[#283593] transition disabled:opacity-50">
                {starting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
                {starting ? 'Starting...' : scheduledDate && scheduledTime ? 'Schedule' : 'Start Live Now'}
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
                <h3 className="font-bold text-gray-800">Delete Live Class?</h3>
                <p className="text-sm text-gray-500 mt-1">This will permanently remove the class. This cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition">Cancel</button>
              <button onClick={() => deleteClass(deleteConfirm)} className="flex-1 py-2.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
