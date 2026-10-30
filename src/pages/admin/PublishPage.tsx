import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import {
  Lock, Unlock, Calculator, Send, Loader2, AlertCircle, CheckCircle,
  Users, ChevronDown, ChevronUp, Save, Eye, EyeOff,
} from 'lucide-react'
import {
  getGradingSystemForTier, computeStudentSummary, computeClassPositions,
  behavioralFieldKeys, behavioralFieldLabels, behavioralOptions,
  type SchoolSettings, type GradeBand,
} from '../../utils/gradingUtils'

interface Student {
  id: string
  first_name: string
  last_name: string
  admission_no: string
  passport_url?: string | null
}

interface Summary {
  id?: string
  student_id: string
  total_score: number
  subjects_taken: number
  average_score: number
  grade: string
  position: number
  position_out_of: number
  days_present: number
  days_absent: number
  is_published: boolean
  published_at: string | null
}

interface Comment {
  id?: string
  student_id: string
  teacher_comment: string
  principal_comment: string
  conduct: string
  attitude: string
  interest: string
  attendance_remark: string
}

type RatingsMap = Record<string, string>

interface StudentData {
  days_present: number
  days_absent: number
  teacher_comment: string
  principal_comment: string
  conduct: string
  attitude: string
  interest: string
  attendance_remark: string
  behavioral_ratings: RatingsMap
}

interface LocalSettings extends SchoolSettings {
  current_session?: string
  current_term?: string
}

function studentName(s: Student): string {
  return `${s.first_name ?? ''} ${s.last_name ?? ''}`.trim()
}

export default function PublishPage() {
  const { user } = useAuth()
  const schoolId = user?.id || ''

  const [loading, setLoading] = useState(true)
  const [computing, setComputing] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [saving, setSaving] = useState<string | null>(null) // studentId being saved
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const [settings, setSettings] = useState<LocalSettings>({})
  const [classes, setClasses] = useState<any[]>([])
  const [classId, setClassId] = useState('')

  const [students, setStudents] = useState<Student[]>([])
  const [summaries, setSummaries] = useState<Summary[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [behavioral, setBehavioral] = useState<any[]>([])
  const [scores, setScores] = useState<any[]>([])
  const [isLocked, setIsLocked] = useState(false)
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null)
  const [studentData, setStudentData] = useState<Record<string, StudentData>>({})

  // LOAD: school settings + classes
  useEffect(() => {
    if (!schoolId) return
    ;(async () => {
      setLoading(true)
      try {
        const { data: sData } = await supabase
          .from('school_settings')
          .select('*')
          .eq('school_id', schoolId)
          .maybeSingle()
        const s: LocalSettings = (sData as any) || {}
        const { data: curSession } = await supabase
          .from('academic_sessions')
          .select('id, name')
          .eq('school_id', schoolId)
          .eq('is_current', true)
          .maybeSingle()
        if (curSession) s.current_session = curSession.id
        const { data: curTerm } = await supabase
          .from('terms')
          .select('id, name')
          .eq('school_id', schoolId)
          .eq('is_current', true)
          .maybeSingle()
        if (curTerm) s.current_term = curTerm.id
        setSettings(s)

        const { data: cData } = await supabase
          .from('classes')
          .select('id, name, tier')
          .eq('school_id', schoolId)
          .order('name')
        setClasses(cData || [])
      } catch (e: any) {
        setError(e.message || 'Failed to load')
      } finally {
        setLoading(false)
      }
    })()
  }, [schoolId])

  const selectedClass = useMemo(() => classes.find(c => c.id === classId), [classes, classId])
  const tier = (selectedClass?.tier as string) || 'SSS'

  const gradingSystem: GradeBand[] = useMemo(
    () => getGradingSystemForTier(tier, settings),
    [tier, settings],
  )

  const sessionId = settings.current_session || ''
  const termId = settings.current_term || ''

  // LOAD: students + summaries + comments + behavioral + scores + lock
  useEffect(() => {
    if (!classId || !sessionId || !termId) {
      setStudents([]); setSummaries([]); setComments([]); setBehavioral([]); setScores([]); setIsLocked(false)
      return
    }
    ;(async () => {
      setLoading(true)
      try {
        const [sRes, sumRes, cRes, bRes, scRes, lockRes] = await Promise.all([
          supabase.from('students').select('id, first_name, last_name, admission_no, passport_url').eq('class_id', classId).order('first_name'),
          supabase.from('student_term_summaries').select('*').eq('school_id', schoolId).eq('class_id', classId).eq('session_id', sessionId).eq('term_id', termId),
          supabase.from('term_comments').select('*').eq('school_id', schoolId).eq('class_id', classId).eq('session_id', sessionId).eq('term_id', termId),
          supabase.from('student_behavioural_ratings').select('*').eq('school_id', schoolId).eq('class_id', classId).eq('session_id', sessionId).eq('term_id', termId),
          supabase.from('scores').select('student_id, total, grade').eq('school_id', schoolId).eq('class_id', classId).eq('session_id', sessionId).eq('term_id', termId),
          supabase.from('score_locks').select('is_locked').eq('school_id', schoolId).eq('class_id', classId).eq('session_id', sessionId).eq('term_id', termId).maybeSingle(),
        ])
        const studs: Student[] = (sRes.data || []).map((s: any) => ({
          id: s.id, first_name: s.first_name ?? '', last_name: s.last_name ?? '',
          admission_no: s.admission_no ?? '', passport_url: s.passport_url ?? null,
        }))
        setStudents(studs)
        setSummaries((sumRes.data || []) as Summary[])
        setComments((cRes.data || []) as Comment[])
        setBehavioral(bRes.data || [])
        setScores(scRes.data || [])
        setIsLocked(!!lockRes.data?.is_locked)
      } catch (e: any) {
        setError(e.message || 'Failed to load')
      } finally {
        setLoading(false)
      }
    })()
  }, [classId, sessionId, termId, schoolId])

  // Prefill studentData from loaded data
  useEffect(() => {
    const map: Record<string, StudentData> = {}
    for (const s of students) {
      const summary = summaries.find(x => x.student_id === s.id)
      const comment = comments.find(x => x.student_id === s.id)
      const beh = behavioral.find(x => x.student_id === s.id)
      const ratings: RatingsMap = {}
      if (beh) {
        for (const key of behavioralFieldKeys) {
          const v = beh[key]
          if (v) ratings[key] = String(v)
        }
      }
      map[s.id] = {
        days_present: summary?.days_present ?? 0,
        days_absent: summary?.days_absent ?? 0,
        teacher_comment: comment?.teacher_comment ?? '',
        principal_comment: comment?.principal_comment ?? '',
        conduct: comment?.conduct ?? '',
        attitude: comment?.attitude ?? '',
        interest: comment?.interest ?? '',
        attendance_remark: comment?.attendance_remark ?? '',
        behavioral_ratings: ratings,
      }
    }
    setStudentData(map)
  }, [students, summaries, comments, behavioral])

  const summaryFor = (sid: string) => summaries.find(s => s.student_id === sid)

  // COMPUTE: recalc all summaries (client-side, matches Flutter)
  const handleCompute = async () => {
    if (!classId) return
    setComputing(true); setError(''); setSuccessMsg('')
    try {
      if (students.length === 0) {
        setError('No students in this class.')
        return
      }
      const allSummaries: Array<{ student_id: string; totalScore: number; subjectsTaken: number; averageScore: number; grade: string }> = []
      for (const student of students) {
        const studentScores = scores.filter(s => s.student_id === student.id)
        const summary = computeStudentSummary(
          studentScores.map(s => ({ total: Number(s.total) || 0, grade: s.grade || '' })),
          gradingSystem,
        )
        allSummaries.push({
          student_id: student.id,
          totalScore: summary.totalScore,
          subjectsTaken: summary.subjectsTaken,
          averageScore: summary.averageScore,
          grade: summary.grade,
        })
      }
      const ranked = computeClassPositions(
        allSummaries.map(s => ({ student_id: s.student_id, averageScore: s.averageScore })),
      )

      // Delete existing summaries for this class+session+term
      await supabase
        .from('student_term_summaries')
        .delete()
        .eq('school_id', schoolId)
        .eq('class_id', classId)
        .eq('session_id', sessionId)
        .eq('term_id', termId)

      // Insert new summaries (preserve is_published from existing)
      const inserts = ranked.map(r => {
        const s = allSummaries.find(x => x.student_id === r.student_id)!
        const existing = summaryFor(r.student_id)
        const data = studentData[r.student_id] || { days_present: 0, days_absent: 0 }
        return {
          school_id: schoolId,
          student_id: r.student_id,
          class_id: classId,
          session_id: sessionId,
          term_id: termId,
          total_score: s.totalScore,
          subjects_taken: s.subjectsTaken,
          average_score: s.averageScore,
          grade: s.grade,
          position: r.position,
          position_out_of: r.positionOutOf,
          days_present: data.days_present,
          days_absent: data.days_absent,
          is_published: existing?.is_published ?? false,
          published_at: existing?.published_at ?? null,
          published_by: existing?.is_published ? (user?.id || null) : null,
        }
      })
      if (inserts.length > 0) {
        const { error: inErr } = await supabase.from('student_term_summaries').insert(inserts)
        if (inErr) throw inErr
      }

      // Reload summaries
      const { data: newSum } = await supabase
        .from('student_term_summaries')
        .select('*')
        .eq('school_id', schoolId)
        .eq('class_id', classId)
        .eq('session_id', sessionId)
        .eq('term_id', termId)
      setSummaries((newSum || []) as Summary[])
      setSuccessMsg(`Computed ${ranked.length} summaries with positions.`)
    } catch (e: any) {
      setError(e.message || 'Compute failed')
    } finally {
      setComputing(false)
    }
  }

  // TOGGLE LOCK
  const handleToggleLock = async () => {
    if (!classId) return
    const wasLocked = isLocked
    const now = new Date().toISOString()
    try {
      const { data: existing } = await supabase
        .from('score_locks')
        .select('id')
        .eq('school_id', schoolId)
        .eq('class_id', classId)
        .eq('session_id', sessionId)
        .eq('term_id', termId)
        .maybeSingle()
      if (existing) {
        await supabase
          .from('score_locks')
          .update({ is_locked: !wasLocked, locked_at: !wasLocked ? now : null, updated_at: now })
          .eq('id', existing.id)
      } else {
        await supabase
          .from('score_locks')
          .insert({ school_id: schoolId, class_id: classId, session_id: sessionId, term_id: termId, is_locked: true, locked_at: now })
      }
      setIsLocked(!wasLocked)
      setSuccessMsg(wasLocked ? 'Scores unlocked.' : 'Scores locked.')
    } catch (e: any) {
      setError(e.message || 'Lock toggle failed')
    }
  }

  // PUBLISH ALL
  const handlePublishAll = async () => {
    if (!classId) return
    setPublishing(true); setError(''); setSuccessMsg('')
    try {
      const now = new Date().toISOString()
      const { error: upErr } = await supabase
        .from('student_term_summaries')
        .update({ is_published: true, published_at: now, published_by: user?.id || null })
        .eq('school_id', schoolId)
        .eq('class_id', classId)
        .eq('session_id', sessionId)
        .eq('term_id', termId)
      if (upErr) throw upErr
      // Reload
      const { data: newSum } = await supabase
        .from('student_term_summaries')
        .select('*')
        .eq('school_id', schoolId)
        .eq('class_id', classId)
        .eq('session_id', sessionId)
        .eq('term_id', termId)
      setSummaries((newSum || []) as Summary[])
      setSuccessMsg('Results published!')
    } catch (e: any) {
      setError(e.message || 'Publish failed')
    } finally {
      setPublishing(false)
    }
  }

  // UNPUBLISH ALL
  const handleUnpublishAll = async () => {
    if (!classId) return
    setPublishing(true); setError(''); setSuccessMsg('')
    try {
      const { error: upErr } = await supabase
        .from('student_term_summaries')
        .update({ is_published: false, published_at: null, published_by: null })
        .eq('school_id', schoolId)
        .eq('class_id', classId)
        .eq('session_id', sessionId)
        .eq('term_id', termId)
      if (upErr) throw upErr
      const { data: newSum } = await supabase
        .from('student_term_summaries')
        .select('*')
        .eq('school_id', schoolId)
        .eq('class_id', classId)
        .eq('session_id', sessionId)
        .eq('term_id', termId)
      setSummaries((newSum || []) as Summary[])
      setSuccessMsg('Results unpublished.')
    } catch (e: any) {
      setError(e.message || 'Unpublish failed')
    } finally {
      setPublishing(false)
    }
  }

  // SAVE ONE STUDENT'S DATA
  const handleSaveStudent = async (sid: string) => {
    const data = studentData[sid]
    if (!data) return
    setSaving(sid); setError(''); setSuccessMsg('')
    try {
      // 1. Upsert term_comments
      const existingComment = comments.find(c => c.student_id === sid)
      const commentPayload = {
        school_id: schoolId,
        student_id: sid,
        class_id: classId,
        session_id: sessionId,
        term_id: termId,
        teacher_comment: data.teacher_comment,
        principal_comment: data.principal_comment,
        conduct: data.conduct,
        attitude: data.attitude,
        interest: data.interest,
        attendance_remark: data.attendance_remark,
      }
      if (existingComment?.id) {
        await supabase.from('term_comments').update(commentPayload).eq('id', existingComment.id)
      } else {
        await supabase.from('term_comments').insert(commentPayload)
      }

      // 2. Update days_present/days_absent on summary
      const summary = summaryFor(sid)
      if (summary?.id) {
        await supabase
          .from('student_term_summaries')
          .update({ days_present: data.days_present, days_absent: data.days_absent })
          .eq('id', summary.id)
      }

      // 3. Upsert student_behavioural_ratings
      const existingBeh = behavioral.find(b => b.student_id === sid)
      const behPayload: Record<string, any> = {
        school_id: schoolId,
        student_id: sid,
        class_id: classId,
        session_id: sessionId,
        term_id: termId,
        recorded_by: user?.id || null,
        updated_at: new Date().toISOString(),
        ...data.behavioral_ratings,
      }
      if (existingBeh?.id) {
        await supabase.from('student_behavioural_ratings').update(behPayload).eq('id', existingBeh.id)
      } else {
        await supabase.from('student_behavioural_ratings').insert(behPayload)
      }

      // Reload all
      const [cRes, bRes, sumRes] = await Promise.all([
        supabase.from('term_comments').select('*').eq('school_id', schoolId).eq('class_id', classId).eq('session_id', sessionId).eq('term_id', termId),
        supabase.from('student_behavioural_ratings').select('*').eq('school_id', schoolId).eq('class_id', classId).eq('session_id', sessionId).eq('term_id', termId),
        supabase.from('student_term_summaries').select('*').eq('school_id', schoolId).eq('class_id', classId).eq('session_id', sessionId).eq('term_id', termId),
      ])
      setComments((cRes.data || []) as Comment[])
      setBehavioral(bRes.data || [])
      setSummaries((sumRes.data || []) as Summary[])
      setSuccessMsg(`Saved data for ${students.find(s => s.id === sid)?.first_name || 'student'}.`)
    } catch (e: any) {
      setError(e.message || 'Save failed')
    } finally {
      setSaving(null)
    }
  }

  // TOGGLE PUBLISH ONE STUDENT
  const handleTogglePublishOne = async (sid: string, publish: boolean) => {
    try {
      const now = publish ? new Date().toISOString() : null
      await supabase
        .from('student_term_summaries')
        .update({ is_published: publish, published_at: now, published_by: publish ? (user?.id || null) : null })
        .eq('school_id', schoolId)
        .eq('student_id', sid)
        .eq('class_id', classId)
        .eq('session_id', sessionId)
        .eq('term_id', termId)
      const { data: newSum } = await supabase
        .from('student_term_summaries')
        .select('*')
        .eq('school_id', schoolId)
        .eq('class_id', classId)
        .eq('session_id', sessionId)
        .eq('term_id', termId)
      setSummaries((newSum || []) as Summary[])
    } catch (e: any) {
      setError(e.message || 'Toggle failed')
    }
  }

  const updateField = (sid: string, field: keyof StudentData, value: any) => {
    setStudentData(prev => ({
      ...prev,
      [sid]: { ...prev[sid], [field]: value },
    }))
  }

  const updateRating = (sid: string, key: string, value: string) => {
    setStudentData(prev => ({
      ...prev,
      [sid]: {
        ...prev[sid],
        behavioral_ratings: { ...prev[sid].behavioral_ratings, [key]: value },
      },
    }))
  }

  const publishedCount = summaries.filter(s => s.is_published).length
  const totalSummaries = summaries.length

  if (loading && students.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-[#1A237E] animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Publish Results</h1>
          <p className="text-sm text-gray-500 mt-1">
            {sessionId && termId ? 'Compute positions, enter comments & behavioral ratings, then publish.' : 'No active session/term set.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleLock}
            disabled={!classId}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 ${
              isLocked ? 'bg-orange-100 text-orange-700 border border-orange-200 hover:bg-orange-200'
                       : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
            }`}
          >
            {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            {isLocked ? 'Locked' : 'Unlocked'}
          </button>
          <button
            onClick={handleCompute}
            disabled={!classId || computing}
            className="flex items-center gap-2 px-3 py-2 bg-[#1A237E] text-white rounded-lg text-sm font-medium hover:bg-[#283593] transition disabled:opacity-50"
          >
            {computing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
            {computing ? 'Computing...' : 'Compute Positions'}
          </button>
          <button
            onClick={publishedCount > 0 ? handleUnpublishAll : handlePublishAll}
            disabled={!classId || publishing || totalSummaries === 0}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 ${
              publishedCount > 0 ? 'bg-red-100 text-red-700 border border-red-200 hover:bg-red-200'
                                 : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {publishing ? 'Working...' : publishedCount > 0 ? 'Unpublish All' : 'Publish All'}
          </button>
        </div>
      </div>

      {/* Alerts */}
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

      {/* Class selector */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <label className="block text-xs font-medium text-gray-600 mb-1.5">Class</label>
        <select
          value={classId}
          onChange={e => setClassId(e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30"
        >
          <option value="">Select class</option>
          {classes.map(c => (
            <option key={c.id} value={c.id}>{c.name} ({c.tier || 'SSS'})</option>
          ))}
        </select>
      </div>

      {/* Stats */}
      {classId && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center"><Users className="w-5 h-5 text-blue-600" /></div>
            <div>
              <p className="text-xs text-gray-500">Students</p>
              <p className="text-lg font-bold text-gray-800">{students.length}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center"><CheckCircle className="w-5 h-5 text-green-600" /></div>
            <div>
              <p className="text-xs text-gray-500">Summaries</p>
              <p className="text-lg font-bold text-gray-800">{totalSummaries}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center"><Send className="w-5 h-5 text-purple-600" /></div>
            <div>
              <p className="text-xs text-gray-500">Published</p>
              <p className="text-lg font-bold text-gray-800">{publishedCount}/{totalSummaries}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isLocked ? 'bg-orange-50' : 'bg-gray-50'}`}>
              <Lock className={`w-5 h-5 ${isLocked ? 'text-orange-600' : 'text-gray-400'}`} />
            </div>
            <div>
              <p className="text-xs text-gray-500">Lock Status</p>
              <p className="text-lg font-bold text-gray-800">{isLocked ? 'Locked' : 'Open'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Student cards */}
      {classId ? (
        <div className="space-y-3">
          {students.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
              <div className="w-16 h-16 mx-auto bg-gray-50 rounded-full flex items-center justify-center mb-3"><Users className="w-8 h-8 text-gray-300" /></div>
              <p className="text-gray-400 text-sm">No students in this class.</p>
            </div>
          ) : (
            students.map((s, i) => {
              const summary = summaryFor(s.id)
              const data = studentData[s.id]
              const isExpanded = expandedStudent === s.id
              const isSaving = saving === s.id
              if (!data) return null
              return (
                <div key={s.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                  {/* Card header */}
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                    onClick={() => setExpandedStudent(isExpanded ? null : s.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 overflow-hidden">
                        {s.passport_url ? <img src={s.passport_url} alt={studentName(s)} className="w-full h-full object-cover" /> : studentName(s).charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{studentName(s)}</p>
                        <p className="text-xs text-gray-400">{s.admission_no || '-'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {summary ? (
                        <>
                          <div className="text-right">
                            <p className="text-xs text-gray-400">Total</p>
                            <p className="text-sm font-semibold text-gray-800">{summary.total_score.toFixed(0)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-400">Avg</p>
                            <p className="text-sm font-semibold text-gray-800">{summary.average_score.toFixed(1)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-400">Grade</p>
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                              summary.grade.startsWith('A') || summary.grade.startsWith('B') ? 'bg-green-100 text-green-700' :
                              summary.grade.startsWith('C') ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>{summary.grade}</span>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-400">Position</p>
                            <p className="text-sm font-semibold text-gray-800">{summary.position}/{summary.position_out_of}</p>
                          </div>
                          {summary.is_published ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                              <Eye className="w-3 h-3" /> Published
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-500 rounded text-xs font-medium">
                              <EyeOff className="w-3 h-3" /> Hidden
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-gray-400">Not computed</span>
                      )}
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </div>
                  </div>

                  {/* Expanded editor */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 p-4 space-y-4 bg-gray-50/30">
                      {/* Attendance */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1.5">Days Present</label>
                          <input
                            type="number"
                            value={data.days_present}
                            onChange={e => updateField(s.id, 'days_present', Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1.5">Days Absent</label>
                          <input
                            type="number"
                            value={data.days_absent}
                            onChange={e => updateField(s.id, 'days_absent', Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30"
                          />
                        </div>
                      </div>

                      {/* Behavioral ratings */}
                      <div>
                        <p className="text-xs font-medium text-gray-700 mb-2">Behavioral Ratings</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                          {behavioralFieldKeys.map(key => (
                            <div key={key}>
                              <label className="block text-[11px] text-gray-500 mb-1">{behavioralFieldLabels[key]}</label>
                              <select
                                value={data.behavioral_ratings[key] || ''}
                                onChange={e => updateRating(s.id, key, e.target.value)}
                                className="w-full px-2 py-1 border border-gray-200 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30"
                              >
                                <option value="">-</option>
                                {behavioralOptions.map(o => <option key={o} value={o}>{o}</option>)}
                              </select>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Comments */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1.5">Teacher Comment</label>
                          <textarea
                            value={data.teacher_comment}
                            onChange={e => updateField(s.id, 'teacher_comment', e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30 resize-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1.5">Principal Comment</label>
                          <textarea
                            value={data.principal_comment}
                            onChange={e => updateField(s.id, 'principal_comment', e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30 resize-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1.5">Conduct</label>
                          <input
                            value={data.conduct}
                            onChange={e => updateField(s.id, 'conduct', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1.5">Attitude</label>
                          <input
                            value={data.attitude}
                            onChange={e => updateField(s.id, 'attitude', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1.5">Interest</label>
                          <input
                            value={data.interest}
                            onChange={e => updateField(s.id, 'interest', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1.5">Attendance Remark</label>
                          <input
                            value={data.attendance_remark}
                            onChange={e => updateField(s.id, 'attendance_remark', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30"
                          />
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        {summary && (
                          <button
                            onClick={() => handleTogglePublishOne(s.id, !summary.is_published)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                              summary.is_published
                                ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                                : 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
                            }`}
                          >
                            {summary.is_published ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            {summary.is_published ? 'Unpublish' : 'Publish'} this student
                          </button>
                        )}
                        <button
                          onClick={() => handleSaveStudent(s.id)}
                          disabled={isSaving}
                          className="flex items-center gap-2 px-3 py-1.5 bg-[#1A237E] text-white rounded-lg text-xs font-medium hover:bg-[#283593] transition disabled:opacity-50 ml-auto"
                        >
                          {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                          {isSaving ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <div className="w-16 h-16 mx-auto bg-blue-50 rounded-2xl flex items-center justify-center mb-3"><Send className="w-8 h-8 text-blue-400" /></div>
          <h3 className="text-gray-700 font-medium mb-1">Select a Class</h3>
          <p className="text-gray-400 text-sm">Choose a class above to compute positions, enter comments, and publish results.</p>
        </div>
      )}
    </div>
  )
}
