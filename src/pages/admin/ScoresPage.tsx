import { useState, useEffect, useMemo } from "react"
import { dbProxy } from "../../lib/dbProxy"
import { useAuth } from '../../contexts/AuthContext'
import {
  Save, Search, AlertCircle, CheckCircle, Loader2, Users, BookOpen,
  Info, Lock,
} from 'lucide-react'
import {
  getAssessmentTypesForTier, getGradingSystemForTier, getGradeFromSystem,
  type AssessmentType, type GradeBand, type SchoolSettings,
} from '../../utils/gradingUtils'

interface Student {
  id: string
  first_name: string
  last_name: string
  admission_no: string
  passport_url?: string | null
}

interface LocalSettings extends SchoolSettings {
  current_session?: string
  current_term?: string
}

function studentName(s: Student): string {
  return `${s.first_name ?? ''} ${s.last_name ?? ''}`.trim()
}

export default function ScoresPage() {
  const { user } = useAuth()
  const schoolId = user?.id || ''

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const [settings, setSettings] = useState<LocalSettings>({})
  const [classes, setClasses] = useState<any[]>([])
  const [subjects, setSubjects] = useState<any[]>([])
  const [classId, setClassId] = useState('')
  const [subjectId, setSubjectId] = useState('')

  const [students, setStudents] = useState<Student[]>([])
  const [scoresJson, setScoresJson] = useState<Record<string, Record<string, number | null>>>({})
  const [existingRows, setExistingRows] = useState<Record<string, any>>({})
  const [search, setSearch] = useState('')
  const [isLocked, setIsLocked] = useState(false)

  // LOAD: school settings + classes (active session/term)
  useEffect(() => {
    if (!schoolId) return
    ;(async () => {
      setLoading(true)
      try {
        const { data: sData } = await dbProxy
          .from('school_settings')
          .select('*')
          .eq('school_id', schoolId)
          .maybeSingle()
        const s: LocalSettings = (sData as any) || {}

        const { data: curSession } = await dbProxy
          .from('academic_sessions')
          .select('id, name')
          .eq('school_id', schoolId)
          .eq('is_current', true)
          .maybeSingle()
        if (curSession) s.current_session = curSession.id
        const { data: curTerm } = await dbProxy
          .from('terms')
          .select('id, name')
          .eq('school_id', schoolId)
          .eq('is_current', true)
          .maybeSingle()
        if (curTerm) s.current_term = curTerm.id
        setSettings(s)

        const { data: cData } = await dbProxy
          .from('classes')
          .select('id, name, tier, assessment_types')
          .eq('school_id', schoolId)
          .order('name')
        setClasses(cData || [])
      } catch (e: any) {
        setError(e.message || 'Failed to load data')
      } finally {
        setLoading(false)
      }
    })()
  }, [schoolId])

  // DERIVE: tier + columns + grading for selected class
  const selectedClass = useMemo(
    () => classes.find(c => c.id === classId),
    [classes, classId]
  )
  const tier = (selectedClass?.tier as string) || 'SSS'
  const examTemplate = (settings.exam_template || 'WAEC').toUpperCase()

  const assessmentTypes: AssessmentType[] = useMemo(() => {
    if (selectedClass?.assessment_types) {
      try {
        const at = selectedClass.assessment_types
        if (Array.isArray(at) && at.length > 0) return at
      } catch (_) {}
    }
    return getAssessmentTypesForTier(tier, settings)
  }, [selectedClass, tier, settings])

  const gradingSystem: GradeBand[] = useMemo(() => {
    return getGradingSystemForTier(tier, settings)
  }, [tier, settings])

  const totalMax = useMemo(
    () => assessmentTypes.reduce((sum, a) => sum + (Number(a.max) || 0), 0),
    [assessmentTypes]
  )

  const formulaText = useMemo(
    () => `Assessment: ${assessmentTypes.map(a => `${a.name}(${a.max})`).join(' + ')} = ${totalMax}`,
    [assessmentTypes, totalMax]
  )

  // LOAD subjects when class changes (2-step: class_subjects -> subjects)
  useEffect(() => {
    if (!classId) { setSubjects([]); setSubjectId(''); return }
    ;(async () => {
      try {
        const { data: csRows, error: csErr } = await dbProxy
          .from('class_subjects')
          .select('subject_id')
          .eq('class_id', classId)
        if (csErr) {
          console.error('class_subjects error:', csErr)
          setSubjects([])
          return
        }
        const subjectIds = (csRows || []).map(r => r.subject_id).filter(Boolean)
        if (subjectIds.length === 0) {
          setSubjects([])
          return
        }
        const { data: subjRows, error: sErr } = await dbProxy
          .from('subjects')
          .select('id, name, code')
          .in('id', subjectIds)
          .order('name')
        if (sErr) {
          console.error('subjects error:', sErr)
          setSubjects([])
          return
        }
        setSubjects(subjRows || [])
      } catch (e) {
        console.error('subjects load error:', e)
        setSubjects([])
      }
    })()
  }, [classId])

  // CHECK score_locks
  useEffect(() => {
    if (!classId || !settings.current_session || !settings.current_term) {
      setIsLocked(false)
      return
    }
    ;(async () => {
      try {
        const { data } = await dbProxy
          .from('score_locks')
          .select('is_locked')
          .eq('school_id', schoolId)
          .eq('class_id', classId)
          .eq('session_id', settings.current_session!)
          .eq('term_id', settings.current_term!)
          .eq('is_locked', true)
          .maybeSingle()
        setIsLocked(!!data)
      } catch (_) {
        setIsLocked(false)
      }
    })()
  }, [classId, settings.current_session, settings.current_term, schoolId])

  // LOAD students + existing scores
  useEffect(() => {
    if (!classId || !subjectId || !settings.current_session || !settings.current_term) {
      setStudents([])
      setScoresJson({})
      setExistingRows({})
      return
    }
    ;(async () => {
      setLoading(true)
      try {
        const { data: studs } = await dbProxy
          .from('students')
          .select('id, first_name, last_name, admission_no, passport_url')
          .eq('class_id', classId)
          .order('first_name')
        const list: Student[] = (studs || []).map((s: any) => ({
          id: s.id,
          first_name: s.first_name ?? '',
          last_name: s.last_name ?? '',
          admission_no: s.admission_no ?? '',
          passport_url: s.passport_url ?? null,
        }))
        setStudents(list)

        const { data: existing } = await dbProxy
          .from('scores')
          .select('id, student_id, scores_json, total, grade')
          .eq('school_id', schoolId)
          .eq('class_id', classId)
          .eq('subject_id', subjectId)
          .eq('session_id', settings.current_session!)
          .eq('term_id', settings.current_term!)

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
  }, [classId, subjectId, settings.current_session, settings.current_term, schoolId, assessmentTypes.length])

  // DERIVED: per-student total + grade
  const computed = useMemo(() => {
    const result: Record<string, { total: number; grade: string; hasAny: boolean }> = {}
    for (const sid in scoresJson) {
      const sj = scoresJson[sid]
      let total = 0
      let hasAny = false
      for (const at of assessmentTypes) {
        const key = (at.id || at.name).toLowerCase()
        const v = sj[key]
        if (v !== null && v !== undefined) { total += v; hasAny = true }
      }
      result[sid] = {
        total: hasAny ? total : 0,
        grade: hasAny ? getGradeFromSystem(total, gradingSystem).grade : '-',
        hasAny,
      }
    }
    return result
  }, [scoresJson, assessmentTypes, gradingSystem])

  const setScore = (sid: string, at: AssessmentType, value: string) => {
    const key = (at.id || at.name).toLowerCase()
    const num = value === '' ? null : Math.max(0, Math.min(at.max, Number(value)))
    setScoresJson(prev => ({
      ...prev,
      [sid]: { ...prev[sid], [key]: num },
    }))
    setSuccessMsg('')
  }

  const filteredStudents = useMemo(() => {
    if (!search.trim()) return students
    const q = search.toLowerCase()
    return students.filter(s =>
      studentName(s).toLowerCase().includes(q) ||
      s.admission_no?.toLowerCase().includes(q)
    )
  }, [students, search])

  // SAVE (per-student upsert)
  const handleSave = async () => {
    if (!classId || !subjectId || !settings.current_session || !settings.current_term) return
    setSaving(true); setError(''); setSuccessMsg('')
    try {
      let saved = 0
      for (const s of students) {
        const sj = scoresJson[s.id] || {}
        const c = computed[s.id]
        if (!c?.hasAny) continue

        const payload = {
          school_id: schoolId,
          student_id: s.id,
          class_id: classId,
          subject_id: subjectId,
          session_id: settings.current_session,
          term_id: settings.current_term,
          scores_json: sj,
          total: c.total,
          grade: c.grade,
          recorded_by: user?.email || null,
        }

        const existing = existingRows[s.id]
        if (existing?.id) {
          const { error: upErr } = await dbProxy
            .from('scores')
            .update(payload)
            .eq('id', existing.id)
          if (upErr) throw upErr
        } else {
          const { error: inErr, data } = await dbProxy
            .from('scores')
            .insert(payload)
            .select('id')
            .single()
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
  const classAvg = totalEntered > 0
    ? Math.round(Object.values(computed).reduce((sum, c) => sum + c.total, 0) / totalEntered)
    : 0

  if (loading && students.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-slate-600">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="text-sm font-medium">Loading scores…</span>
        </div>
      </div>
    )
  }

  return (
    <div className="px-3 sm:px-4 lg:px-6 py-4 sm:py-6 max-w-6xl mx-auto space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Score Entry</h1>
          <p className="text-sm text-slate-500 mt-1">
            {settings.current_session && settings.current_term
              ? 'Active session & term loaded automatically.'
              : 'No active session/term set in Settings.'}
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || totalEntered === 0 || isLocked}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
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
          <p className="text-sm flex-1">Scores are locked for this class. Unlock from the Publish page to edit.</p>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Class</label>
          <select
            value={classId}
            onChange={e => setClassId(e.target.value)}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
          >
            <option value="">Select class</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name} ({c.tier || 'SSS'})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Subject</label>
          <select
            value={subjectId}
            onChange={e => setSubjectId(e.target.value)}
            disabled={!classId}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition disabled:bg-slate-50 disabled:text-slate-400"
          >
            <option value="">Select subject</option>
            {subjects.map(s => (
              <option key={s.id} value={s.id}>{s.name}{s.code ? ` (${s.code})` : ''}</option>
            ))}
          </select>
        </div>
      </div>

      {classId && subjectId && assessmentTypes.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-800">
          <Info size={18} className="flex-shrink-0" />
          <p className="text-sm">
            <span className="font-semibold">{formulaText}</span>
            <span className="text-blue-600 ml-2">• Tier: {tier} • Template: {examTemplate}</span>
          </p>
        </div>
      )}

      {classId && subjectId && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 sm:p-4">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-2.5" style={{ backgroundColor: '#EEF2FF', color: '#6366F1' }}><Users size={16} strokeWidth={2.2} /></div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{students.length}</div>
            <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">Students</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 sm:p-4">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-2.5" style={{ backgroundColor: '#ECFDF5', color: '#10B981' }}><CheckCircle size={16} strokeWidth={2.2} /></div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{totalEntered}/{students.length}</div>
            <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">Entered</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 sm:p-4">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-2.5" style={{ backgroundColor: '#FFFBEB', color: '#F59E0B' }}><BookOpen size={16} strokeWidth={2.2} /></div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{classAvg}<span className="text-sm text-slate-400">/{totalMax}</span></div>
            <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">Class Avg</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 sm:p-4">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-2.5" style={{ backgroundColor: '#F5F3FF', color: '#8B5CF6' }}><Info size={16} strokeWidth={2.2} /></div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{assessmentTypes.length}</div>
            <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">Columns</div>
          </div>
        </div>
      )}

      {classId && subjectId ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900">Student Scores</h2>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" strokeWidth={2.2} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search student…"
                className="pl-9 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-blue-400 focus:bg-white transition w-48 sm:w-64"
              />
            </div>
          </div>

          {filteredStudents.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-16 h-16 mx-auto bg-slate-100 rounded-2xl flex items-center justify-center mb-4 text-slate-400"><Users size={32} strokeWidth={2} /></div>
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
                      <th key={at.id} className="text-center text-xs font-medium text-gray-500 uppercase px-3 py-2">
                        {at.name}<br/><span className="text-[10px] normal-case text-gray-400">/{at.max}</span>
                      </th>
                    ))}
                    <th className="text-center text-xs font-medium text-gray-500 uppercase px-3 py-2">
                      Total<br/><span className="text-[10px] normal-case text-gray-400">/{totalMax}</span>
                    </th>
                    <th className="text-center text-xs font-medium text-gray-500 uppercase px-3 py-2">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((s, i) => {
                    const c = computed[s.id] || { total: 0, grade: '-', hasAny: false }
                    const sj = scoresJson[s.id] || {}
                    return (
                      <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="px-3 py-2 text-sm text-gray-400">{i + 1}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 overflow-hidden">
                              {s.passport_url
                                ? <img src={s.passport_url} alt={studentName(s)} className="w-full h-full object-cover" />
                                : studentName(s).charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-800 whitespace-nowrap">{studentName(s)}</p>
                              <p className="text-xs text-gray-400">{s.admission_no || '-'}</p>
                            </div>
                          </div>
                        </td>
                        {assessmentTypes.map(at => {
                          const key = (at.id || at.name).toLowerCase()
                          return (
                            <td key={at.id} className="px-3 py-2 text-center">
                              <input
                                type="number"
                                value={sj[key] ?? ''}
                                onChange={e => setScore(s.id, at, e.target.value)}
                                disabled={isLocked}
                                className="w-14 px-1.5 py-1 text-center border border-slate-200 rounded-md text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition disabled:bg-slate-50"
                                placeholder="0"
                              />
                            </td>
                          )
                        })}
                        <td className="px-3 py-2 text-center">
                          <span className={`text-sm font-semibold ${c.hasAny ? 'text-gray-800' : 'text-gray-300'}`}>
                            {c.hasAny ? c.total : '-'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                            c.grade === '-' ? 'bg-gray-100 text-gray-400' :
                            c.grade.startsWith('A') || c.grade.startsWith('B') ? 'bg-green-100 text-green-700' :
                            c.grade.startsWith('C') ? 'bg-yellow-100 text-yellow-700' :
                            c.grade.startsWith('D') || c.grade.startsWith('E') ? 'bg-orange-100 text-orange-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {c.grade}
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
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 py-16 text-center">
          <div className="w-16 h-16 mx-auto bg-blue-50 rounded-2xl flex items-center justify-center mb-4 text-blue-400"><BookOpen size={32} strokeWidth={2} /></div>
          <h3 className="text-base font-bold text-slate-900 mb-1">Select Class & Subject</h3>
          <p className="text-sm text-slate-500">Choose a class and subject above to start entering scores.</p>
        </div>
      )}
    </div>
  )
}
