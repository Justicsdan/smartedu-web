import { useState, useEffect, useMemo } from "react"
import { dbProxy } from '../../lib/dbProxy'
import { useAuth } from '../../contexts/AuthContext'
import {
  Save, Search, AlertCircle, CheckCircle, Loader2, Users, BookOpen,
  Info, Lock, ClipboardList,
} from 'lucide-react'

interface Student {
  id: string
  first_name: string
  last_name: string
  admission_no: string
  passport_url?: string | null
}

interface ClassSubject {
  id: string
  class_id: string
  subject_id: string
}

function studentName(s: Student): string {
  return `${s.first_name ?? ''} ${s.last_name ?? ''}`.trim()
}

export default function TeacherScores() {
  const { user } = useAuth()
  const teacherId = user?.id || ''
  const schoolId = user?.school_id || user?.schoolId || ''

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const [settings, setSettings] = useState<any>({})
  const [classSubjects, setClassSubjects] = useState<ClassSubject[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [subjects, setSubjects] = useState<any[]>([])
  const [sessionId, setSessionId] = useState('')
  const [termId, setTermId] = useState('')

  const [selectedClassId, setSelectedClassId] = useState('')
  const [selectedSubjectId, setSelectedSubjectId] = useState('')

  const [students, setStudents] = useState<Student[]>([])
  const [scoresJson, setScoresJson] = useState<Record<string, Record<string, number | null>>>({})
  const [existingRows, setExistingRows] = useState<Record<string, any>>({})
  const [search, setSearch] = useState('')
  const [isLocked, setIsLocked] = useState(false)

  // Load teacher's assigned classes + subjects + settings
  useEffect(() => {
    if (!teacherId || !schoolId) return
    ;(async () => {
      setLoading(true)
      try {
        const [csRes, setRes, sessRes, termRes] = await Promise.all([
          dbProxy.from('class_subjects').select('id, class_id, subject_id').eq('school_id', schoolId).eq('teacher_id', teacherId),
          dbProxy.from('school_settings').select('*').eq('school_id', schoolId).maybeSingle(),
          dbProxy.from('academic_sessions').select('id, name').eq('school_id', schoolId).eq('is_current', true).maybeSingle(),
          dbProxy.from('terms').select('id, name').eq('school_id', schoolId).eq('is_current', true).maybeSingle(),
        ])
        if (csRes.error) throw csRes.error
        const csList = (csRes.data || []) as ClassSubject[]
        setClassSubjects(csList)
        if (setRes.data) setSettings(setRes.data)
        if (sessRes.data) setSessionId(sessRes.data.id)
        if (termRes.data) setTermId(termRes.data.id)

        // Fetch classes + subjects for this teacher's assignments
        const classIds = Array.from(new Set(csList.map(cs => cs.class_id)))
        const subjectIds = Array.from(new Set(csList.map(cs => cs.subject_id)))

        if (classIds.length > 0) {
          const { data: cData } = await dbProxy.from('classes').select('id, name, section, tier').in('id', classIds).order('name')
          setClasses(cData || [])
        }
        if (subjectIds.length > 0) {
          const { data: sData } = await dbProxy.from('subjects').select('id, name, code').in('id', subjectIds).order('name')
          setSubjects(sData || [])
        }
      } catch (e: any) {
        setError(e.message || 'Failed to load')
      } finally {
        setLoading(false)
      }
    })()
  }, [teacherId, schoolId])

  // Get subjects available for the selected class (only teacher's assigned subjects)
  const availableSubjects = useMemo(() => {
    if (!selectedClassId) return []
    const subjectIds = classSubjects
      .filter(cs => cs.class_id === selectedClassId)
      .map(cs => cs.subject_id)
    return subjects.filter(s => subjectIds.includes(s.id))
  }, [classSubjects, subjects, selectedClassId])

  // Assessment types
  const assessmentTypes = useMemo(() => {
    const tier = classes.find(c => c.id === selectedClassId)?.tier || 'SSS'
    // Use settings assessment_types or defaults
    const raw = settings.assessment_types
    if (raw) {
      try {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      } catch {}
    }
    // Defaults per tier
    if (tier === 'JSS') return [{ id: 'ca', name: 'CA', max: 40 }, { id: 'exam', name: 'Exam', max: 60 }]
    if (tier === 'PRIMARY') return [{ id: 'ca1', name: 'CA1', max: 20 }, { id: 'ca2', name: 'CA2', max: 20 }, { id: 'exam', name: 'Exam', max: 60 }]
    return [{ id: 'ca1', name: 'CA1', max: 10 }, { id: 'ca2', name: 'CA2', max: 10 }, { id: 'assignment', name: 'Assignment', max: 10 }, { id: 'midterm', name: 'Mid-term', max: 20 }, { id: 'exam', name: 'Exam', max: 50 }]
  }, [settings, classes, selectedClassId])

  const totalMax = useMemo(() => assessmentTypes.reduce((sum, a) => sum + (Number(a.max) || 0), 0), [assessmentTypes])

  // Check score lock
  useEffect(() => {
    if (!selectedClassId || !sessionId || !termId) { setIsLocked(false); return }
    ;(async () => {
      try {
        const { data } = await dbProxy.from('score_locks').select('is_locked').eq('school_id', schoolId).eq('class_id', selectedClassId).eq('session_id', sessionId).eq('term_id', termId).eq('is_locked', true).maybeSingle()
        setIsLocked(!!data)
      } catch { setIsLocked(false) }
    })()
  }, [selectedClassId, sessionId, termId, schoolId])

  // Load students + existing scores
  useEffect(() => {
    if (!selectedClassId || !selectedSubjectId || !sessionId || !termId) {
      setStudents([]); setScoresJson({}); setExistingRows({})
      return
    }
    ;(async () => {
      setLoading(true)
      try {
        const { data: studs } = await dbProxy.from('students').select('id, first_name, last_name, admission_no, passport_url').eq('class_id', selectedClassId).order('first_name')
        const list: Student[] = (studs || []).map((s: any) => ({
          id: s.id, first_name: s.first_name ?? '', last_name: s.last_name ?? '',
          admission_no: s.admission_no ?? '', passport_url: s.passport_url ?? null,
        }))
        setStudents(list)

        const { data: existing } = await dbProxy.from('scores').select('id, student_id, scores_json, total, grade').eq('school_id', schoolId).eq('class_id', selectedClassId).eq('subject_id', selectedSubjectId).eq('session_id', sessionId).eq('term_id', termId)

        const map: Record<string, any> = {}
        const sj: Record<string, Record<string, number | null>> = {}
        for (const s of list) {
          const ex = (existing || []).find((r: any) => r.student_id === s.id)
          map[s.id] = ex || null
          sj[s.id] = {}
          for (const at of assessmentTypes) {
            const key = (at.id || at.name).toLowerCase()
            const v = ex?.scores_json?.[key] ?? ex?.scores_json?.[at.name]
            sj[s.id][key] = v != null ? Number(v) : null
          }
        }
        setExistingRows(map)
        setScoresJson(sj)
      } catch (e: any) {
        setError(e.message || 'Failed to load scores')
      } finally {
        setLoading(false)
      }
    })()
  }, [selectedClassId, selectedSubjectId, sessionId, termId, schoolId])

  const computed = useMemo(() => {
    const result: Record<string, { total: number; hasAny: boolean }> = {}
    for (const sid in scoresJson) {
      const sj = scoresJson[sid]
      let total = 0
      let hasAny = false
      for (const at of assessmentTypes) {
        const key = (at.id || at.name).toLowerCase()
        const v = sj[key]
        if (v !== null && v !== undefined) { total += v; hasAny = true }
      }
      result[sid] = { total: hasAny ? total : 0, hasAny }
    }
    return result
  }, [scoresJson, assessmentTypes])

  const setScore = (sid: string, at: any, value: string) => {
    const key = (at.id || at.name).toLowerCase()
    const num = value === '' ? null : Math.max(0, Math.min(at.max, Number(value)))
    setScoresJson(prev => ({ ...prev, [sid]: { ...prev[sid], [key]: num } }))
    setSuccessMsg('')
  }

  const filteredStudents = useMemo(() => {
    if (!search.trim()) return students
    const q = search.toLowerCase()
    return students.filter(s => studentName(s).toLowerCase().includes(q) || s.admission_no?.toLowerCase().includes(q))
  }, [students, search])

  const handleSave = async () => {
    if (!selectedClassId || !selectedSubjectId || !sessionId || !termId) return
    setSaving(true); setError(''); setSuccessMsg('')
    try {
      let saved = 0
      for (const s of students) {
        const sj = scoresJson[s.id] || {}
        const c = computed[s.id]
        if (!c?.hasAny) continue

        const payload = {
          school_id: schoolId, student_id: s.id, class_id: selectedClassId,
          subject_id: selectedSubjectId, session_id: sessionId, term_id: termId,
          scores_json: sj, total: c.total, recorded_by: teacherId,
        }

        const existing = existingRows[s.id]
        if (existing?.id) {
          const { error: upErr } = await dbProxy.from('scores').update(payload).eq('id', existing.id)
          if (upErr) throw upErr
        } else {
          const { error: inErr, data } = await dbProxy.from('scores').insert(payload).select('id').single()
          if (inErr) throw inErr
          if (data) existingRows[s.id] = data
        }
        saved++
      }
      setSuccessMsg(`Saved ${saved} scores.`)
    } catch (e: any) {
      setError(e.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const totalEntered = Object.values(computed).filter(c => c.hasAny).length
  const classAvg = totalEntered > 0 ? Math.round(Object.values(computed).reduce((sum, c) => sum + c.total, 0) / totalEntered) : 0

  if (loading && students.length === 0 && !selectedClassId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-slate-600">
          <div className="w-14 h-14 border-4 border-blue-500 border-t-transparent rounded-full animate-spin shadow-lg shadow-blue-500/20" />
          <span className="text-sm font-semibold text-slate-700">Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="px-3 sm:px-4 lg:px-6 py-4 sm:py-6 max-w-6xl mx-auto space-y-5 bg-gradient-to-br from-slate-50 via-white to-blue-50/30 min-h-screen">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Enter Scores</h1>
          <p className="text-sm text-slate-500 mt-1">
            {sessionId && termId ? 'Active session & term loaded.' : 'No active session/term set.'}
          </p>
        </div>
        <button onClick={handleSave} disabled={saving || totalEntered === 0 || isLocked}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving…' : `Save${totalEntered > 0 ? ` (${totalEntered})` : ''}`}
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
      {isLocked && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800">
          <Lock size={18} className="flex-shrink-0 mt-0.5" />
          <p className="text-sm flex-1">Scores are locked for this class. Contact admin to unlock.</p>
        </div>
      )}

      {/* Class + Subject selectors */}
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg shadow-slate-200/40 border border-slate-200/60 p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Class</label>
          <select value={selectedClassId} onChange={e => { setSelectedClassId(e.target.value); setSelectedSubjectId('') }}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition">
            <option value="">Select class</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name} ({c.tier || 'SSS'})</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Subject</label>
          <select value={selectedSubjectId} onChange={e => setSelectedSubjectId(e.target.value)} disabled={!selectedClassId}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition disabled:bg-slate-50 disabled:text-slate-400">
            <option value="">{selectedClassId ? 'Select subject' : 'Select class first'}</option>
            {availableSubjects.map(s => <option key={s.id} value={s.id}>{s.name}{s.code ? ` (${s.code})` : ''}</option>)}
          </select>
        </div>
      </div>

      {/* Formula info */}
      {selectedClassId && selectedSubjectId && assessmentTypes.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-800">
          <Info size={18} className="flex-shrink-0" />
          <p className="text-sm">
            <span className="font-semibold">{assessmentTypes.map(a => `${a.name}(${a.max})`).join(' + ')} = {totalMax}</span>
          </p>
        </div>
      )}

      {/* Stats */}
      {selectedClassId && selectedSubjectId && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg shadow-slate-200/40 border border-slate-200/60 p-3 sm:p-4">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-2.5" style={{ backgroundColor: '#EEF2FF', color: '#6366F1' }}>
              <Users size={16} strokeWidth={2.2} />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900">{students.length}</div>
            <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">Students</div>
          </div>
          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg shadow-slate-200/40 border border-slate-200/60 p-3 sm:p-4">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-2.5" style={{ backgroundColor: '#ECFDF5', color: '#10B981' }}>
              <CheckCircle size={16} strokeWidth={2.2} />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900">{totalEntered}/{students.length}</div>
            <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">Entered</div>
          </div>
          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg shadow-slate-200/40 border border-slate-200/60 p-3 sm:p-4">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-2.5" style={{ backgroundColor: '#FFFBEB', color: '#F59E0B' }}>
              <BookOpen size={16} strokeWidth={2.2} />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900">{classAvg}<span className="text-sm text-slate-400">/{totalMax}</span></div>
            <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">Class Avg</div>
          </div>
        </div>
      )}

      {/* Score table */}
      {selectedClassId && selectedSubjectId ? (
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg shadow-slate-200/40 border border-slate-200/60 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900">Student Scores</h2>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" strokeWidth={2.2} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
                className="pl-9 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-blue-400 focus:bg-white transition w-48 sm:w-64" />
            </div>
          </div>

          {filteredStudents.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-16 h-16 mx-auto bg-slate-100 rounded-2xl flex items-center justify-center mb-4 text-slate-400">
                <Users size={32} strokeWidth={2} />
              </div>
              <p className="text-sm text-slate-500">{students.length === 0 ? 'No students in this class.' : 'No students match your search.'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider px-3 py-3">#</th>
                    <th className="text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider px-3 py-3">Student</th>
                    {assessmentTypes.map(at => (
                      <th key={at.id} className="text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider px-3 py-2">
                        {at.name}<br /><span className="text-[10px] normal-case text-slate-400">/{at.max}</span>
                      </th>
                    ))}
                    <th className="text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider px-3 py-2">
                      Total<br /><span className="text-[10px] normal-case text-slate-400">/{totalMax}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((s, i) => {
                    const c = computed[s.id] || { total: 0, hasAny: false }
                    const sj = scoresJson[s.id] || {}
                    return (
                      <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="px-3 py-2 text-sm text-slate-400">{i + 1}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 overflow-hidden">
                              {s.passport_url ? <img src={s.passport_url} alt={studentName(s)} className="w-full h-full object-cover" /> : studentName(s).charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-800 whitespace-nowrap">{studentName(s)}</p>
                              <p className="text-xs text-slate-400">{s.admission_no || '-'}</p>
                            </div>
                          </div>
                        </td>
                        {assessmentTypes.map(at => {
                          const key = (at.id || at.name).toLowerCase()
                          return (
                            <td key={at.id} className="px-3 py-2 text-center">
                              <input type="number" value={sj[key] ?? ''} onChange={e => setScore(s.id, at, e.target.value)} disabled={isLocked}
                                className="w-14 px-1.5 py-1 text-center border border-slate-200 rounded-md text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition disabled:bg-slate-50"
                                placeholder="0" />
                            </td>
                          )
                        })}
                        <td className="px-3 py-2 text-center">
                          <span className={`text-sm font-semibold ${c.hasAny ? 'text-slate-800' : 'text-slate-300'}`}>
                            {c.hasAny ? c.total : '-'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg shadow-slate-200/40 border border-slate-200/60 py-16 text-center">
          <div className="w-16 h-16 mx-auto bg-blue-50 rounded-2xl flex items-center justify-center mb-4 text-blue-400">
            <ClipboardList size={32} strokeWidth={2} />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">Select Class & Subject</h3>
          <p className="text-sm text-slate-500">Choose a class and subject above to start entering scores.</p>
        </div>
      )}
    </div>
  )
}
