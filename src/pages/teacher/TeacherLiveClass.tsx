import { useState, useEffect, useMemo } from "react"
import { dbProxy } from '../../lib/dbProxy'
import { useAuth } from '../../contexts/AuthContext'
import {
  Loader2, AlertCircle, CheckCircle, Plus, X, Video, Radio,
  Calendar, Clock, Square, Trash2, Phone,
} from 'lucide-react'

interface LiveClass {
  id: string
  room_name: string
  status: string
  started_at: string | null
  ended_at: string | null
  scheduled_at: string | null
  audience: string
  class_id: string | null
  subject_id: string | null
}

function buildJitsiUrl(roomName: string, displayName: string): string {
  const params = new URLSearchParams({
    'userInfo.displayName': displayName,
    'config.prejoinPageEnabled': 'false',
    'config.disableDeepLinking': 'true',
    'config.startWithAudioMuted': 'true',
    'config.startWithVideoMuted': 'false',
  })
  return `https://meet.jit.si/${roomName}?${params.toString()}`
}

function formatDateTime(iso: string | null): string {
  if (!iso) return 'Now'
  const d = new Date(iso)
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function TeacherLiveClass() {
  const { user } = useAuth()
  const teacherId = user?.id || ''
  const schoolId = user?.school_id || user?.schoolId || ''
  const displayName = `Teacher - ${user?.first_name || ''} ${user?.last_name || ''}`.trim()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [liveClasses, setLiveClasses] = useState<LiveClass[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [subjects, setSubjects] = useState<any[]>([])
  const [classSubjects, setClassSubjects] = useState<any[]>([])
  const [showModal, setShowModal] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)
  const [endingId, setEndingId] = useState<string | null>(null)
  const [activeRoom, setActiveRoom] = useState<{ roomName: string; title: string } | null>(null)

  const [audience, setAudience] = useState('class')
  const [selectedClassId, setSelectedClassId] = useState('')
  const [selectedSubjectId, setSelectedSubjectId] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')

  useEffect(() => {
    if (!teacherId || !schoolId) return
    ;(async () => {
      try {
        const [lcRes, csRes] = await Promise.all([
          dbProxy.from('live_classes').select('*').eq('school_id', schoolId).eq('teacher_id', teacherId).in('status', ['scheduled', 'live']).order('scheduled_at', { ascending: true }),
          dbProxy.from('class_subjects').select('id, class_id, subject_id').eq('school_id', schoolId).eq('teacher_id', teacherId),
        ])
        setLiveClasses((lcRes.data || []) as LiveClass[])
        setClassSubjects(csRes.data || [])
        const classIds = Array.from(new Set((csRes.data || []).map((cs: any) => cs.class_id)))
        const subjectIds = Array.from(new Set((csRes.data || []).map((cs: any) => cs.subject_id)))
        if (classIds.length > 0) {
          const { data: cData } = await dbProxy.from('classes').select('id, name, section').in('id', classIds).order('name')
          setClasses(cData || [])
        }
        if (subjectIds.length > 0) {
          const { data: sData } = await dbProxy.from('subjects').select('id, name').in('id', subjectIds).order('name')
          setSubjects(sData || [])
        }
      } catch (e: any) { setError(e.message) } finally { setLoading(false) }
    })()
  }, [teacherId, schoolId])

  const classMap = useMemo(() => { const m: Record<string, any> = {}; classes.forEach(c => { m[c.id] = c }); return m }, [classes])
  const subjectMap = useMemo(() => { const m: Record<string, any> = {}; subjects.forEach(s => { m[s.id] = s }); return m }, [subjects])

  const availableSubjects = useMemo(() => {
    if (!selectedClassId) return []
    const subjectIds = classSubjects.filter(cs => cs.class_id === selectedClassId).map(cs => cs.subject_id)
    return subjects.filter(s => subjectIds.includes(s.id))
  }, [classSubjects, subjects, selectedClassId])

  const startClass = async () => {
    if (audience === 'class' && (!selectedClassId || !selectedSubjectId)) { setError('Select class and subject'); return }
    setStarting(true); setError('')
    try {
      const timestamp = Date.now()
      const roomName = `smartedu_${schoolId}_${teacherId}_${timestamp}`.replace(/-/g, '')
      let scheduledDateTime: string | null = null
      if (scheduledDate && scheduledTime) scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`).toISOString()

      const payload: any = {
        school_id: schoolId, teacher_id: teacherId,
        class_id: audience === 'class' ? selectedClassId : null,
        subject_id: audience === 'class' ? selectedSubjectId : null,
        audience, room_name: roomName,
        status: scheduledDateTime ? 'scheduled' : 'live',
        started_at: scheduledDateTime ? null : new Date().toISOString(),
        scheduled_at: scheduledDateTime,
      }
      const { error: inErr } = await dbProxy.from('live_classes').insert(payload)
      if (inErr) throw inErr

      const { data: newLc } = await dbProxy.from('live_classes').select('*').eq('school_id', schoolId).eq('teacher_id', teacherId).in('status', ['scheduled', 'live']).order('scheduled_at', { ascending: true })
      setLiveClasses((newLc || []) as LiveClass[])
      setShowModal(false)

      if (!scheduledDateTime) {
        const title = audience === 'class' ? `${classMap[selectedClassId]?.name || ''} - ${subjectMap[selectedSubjectId]?.name || ''}` : 'Live Class'
        setActiveRoom({ roomName, title })
        setSuccessMsg('Live class started')
      } else {
        setSuccessMsg('Class scheduled')
      }
      setAudience('class'); setSelectedClassId(''); setSelectedSubjectId(''); setScheduledDate(''); setScheduledTime('')
    } catch (e: any) { setError(e.message) } finally { setStarting(false) }
  }

  const joinClass = (lc: LiveClass) => {
    const title = lc.audience === 'class' && lc.class_id ? `${classMap[lc.class_id]?.name || ''} - ${subjectMap[lc.subject_id]?.name || ''}` : 'Live Class'
    setActiveRoom({ roomName: lc.room_name, title })
  }

  const forceEnd = async (id: string) => {
    setEndingId(id)
    try {
      const { error } = await dbProxy.from('live_classes').update({ status: 'ended', ended_at: new Date().toISOString() }).eq('id', id)
      if (error) throw error
      setLiveClasses(prev => prev.filter(lc => lc.id !== id))
      setSuccessMsg('Class ended')
    } catch (e: any) { setError(e.message) } finally { setEndingId(null) }
  }

  const handleDelete = async (id: string) => {
    try {
      const { error } = await dbProxy.from('live_classes').delete().eq('id', id)
      if (error) throw error
      setLiveClasses(prev => prev.filter(lc => lc.id !== id))
      setDeleteConfirm(null)
    } catch (e: any) { setError(e.message) }
  }

  if (activeRoom) {
    const jitsiUrl = buildJitsiUrl(activeRoom.roomName, displayName)
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col">
        <div className="bg-slate-900 px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Radio className="w-5 h-5 text-red-400 animate-pulse" />
            <div><p className="text-white text-sm font-semibold">{activeRoom.title}</p><p className="text-white/50 text-xs">Live</p></div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setActiveRoom(null)} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 text-white rounded-lg text-sm font-medium hover:bg-white/20 transition"><Phone className="w-4 h-4 rotate-[135deg]" /> Leave</button>
            <button onClick={() => { const lc = liveClasses.find(l => l.room_name === activeRoom.roomName); if (lc) forceEnd(lc.id); setActiveRoom(null) }} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition"><Square className="w-4 h-4" /> End</button>
          </div>
        </div>
        <div className="flex-1 relative">
          <iframe src={jitsiUrl} className="absolute inset-0 w-full h-full" style={{ border: 'none' }} allow="camera; microphone; fullscreen; display-capture; autoplay" />
        </div>
      </div>
    )
  }

  if (loading) return <div className="flex items-center justify-center min-h-[60vh] bg-gradient-to-br from-slate-50 via-white to-blue-50/30"><div className="w-14 h-14 border-4 border-blue-500 border-t-transparent rounded-full animate-spin shadow-lg shadow-blue-500/20" /></div>

  return (
    <div className="px-3 sm:px-4 lg:px-6 py-4 sm:py-6 max-w-4xl mx-auto space-y-5 bg-gradient-to-br from-slate-50 via-white to-blue-50/30 min-h-screen">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Live Classes</h1>
          <p className="text-sm text-slate-500 mt-1">Start, schedule, and monitor live video classes</p>
        </div>
        <button onClick={() => setShowModal(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition shadow-sm">
          <Plus size={14} strokeWidth={2.4} />Start / Schedule
        </button>
      </div>

      {error && <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-800"><AlertCircle size={18} className="flex-shrink-0 mt-0.5" /><p className="text-sm flex-1">{error}</p></div>}
      {successMsg && <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800"><CheckCircle size={18} className="flex-shrink-0 mt-0.5" /><p className="text-sm flex-1">{successMsg}</p></div>}

      {liveClasses.length === 0 ? (
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg shadow-slate-200/40 border border-slate-200/60 py-16 text-center">
          <div className="w-16 h-16 mx-auto bg-blue-50 rounded-2xl flex items-center justify-center mb-4 text-blue-400"><Video size={32} strokeWidth={2} /></div>
          <h3 className="text-base font-bold text-slate-900 mb-1">No Live Classes</h3>
          <p className="text-sm text-slate-500">Click "Start / Schedule" to begin.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {liveClasses.map(lc => {
            const isLive = lc.status === 'live'
            const isReady = lc.status === 'scheduled' && lc.scheduled_at && new Date(lc.scheduled_at).getTime() <= Date.now()
            const cls = lc.class_id ? classMap[lc.class_id] : null
            const subj = lc.subject_id ? subjectMap[lc.subject_id] : null
            return (
              <div key={lc.id} className={`bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg shadow-slate-200/40 border border-slate-200/60 overflow-hidden transition hover:shadow-md ${isLive ? 'border-red-300 ring-1 ring-red-100' : 'border-slate-200'}`}>
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${isLive ? 'bg-red-50' : 'bg-blue-50'}`}>
                      {isLive ? <Radio className="w-5 h-5 text-red-600" /> : <Calendar className="w-5 h-5 text-blue-600" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {cls ? `${cls.name}${cls.section ? ` ${cls.section}` : ''}` : 'Live Class'}{subj ? ` · ${subj.name}` : ''}
                      </p>
                      <p className="text-xs text-slate-400">{isLive ? 'Live now' : `Scheduled: ${formatDateTime(lc.scheduled_at)}`}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {(isLive || isReady) && <button onClick={() => joinClass(lc)} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition"><Video size={13} />{isLive ? 'Join' : 'Start'}</button>}
                    {isLive && <button onClick={() => forceEnd(lc.id)} disabled={endingId === lc.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-semibold hover:bg-red-100 transition disabled:opacity-50">{endingId === lc.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Square className="w-3.5 h-3.5" />}End</button>}
                    <button onClick={() => setDeleteConfirm(lc.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-base font-bold text-slate-900">Start / Schedule</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-md text-slate-500 hover:bg-slate-200"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Audience</label>
                <select value={audience} onChange={e => { setAudience(e.target.value); setSelectedClassId(''); setSelectedSubjectId('') }} className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition">
                  <option value="class">Specific Class</option>
                  <option value="students">All Students</option>
                </select>
              </div>
              {audience === 'class' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Class *</label>
                    <select value={selectedClassId} onChange={e => { setSelectedClassId(e.target.value); setSelectedSubjectId('') }} className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition">
                      <option value="">Select class</option>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.name}{c.section ? ` (${c.section})` : ''}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Subject *</label>
                    <select value={selectedSubjectId} onChange={e => setSelectedSubjectId(e.target.value)} disabled={!selectedClassId} className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition disabled:bg-slate-50">
                      <option value="">{selectedClassId ? 'Select subject' : 'Class first'}</option>
                      {availableSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </>
              )}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-xs text-slate-600 mb-2">Leave empty to start <span className="font-semibold text-red-600">LIVE NOW</span></p>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="block text-[10px] text-slate-500 mb-1">Date</label><input type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none transition" /></div>
                  <div><label className="block text-[10px] text-slate-500 mb-1">Time</label><input type="time" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none transition" /></div>
                </div>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-semibold text-sm hover:bg-slate-50">Cancel</button>
              <button onClick={startClass} disabled={starting || (audience === 'class' && (!selectedClassId || !selectedSubjectId))} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-sm disabled:opacity-50">
                {starting ? <Loader2 size={15} className="animate-spin" /> : <Video size={15} />}
                {starting ? 'Starting…' : scheduledDate && scheduledTime ? 'Schedule' : 'Start Live'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4"><div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center text-red-600"><Trash2 size={24} strokeWidth={2} /></div><h3 className="text-lg font-bold text-slate-900">Delete?</h3></div>
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
