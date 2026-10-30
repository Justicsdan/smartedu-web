import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
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
        const { data: csRows, error: csErr } = await supabase
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
        const { data: subjRows, error: sErr } = await supabase
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
        const { data } = await supabase
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
        const { data: studs } = await supabase
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

        const { data: existing } = await supabase
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
          const { error: upErr } = await supabase
            .from('scores')
            .update(payload)
            .eq('id', existing.id)
          if (upErr) throw upErr
        } else {
          const { error: inErr, data } = await supabase
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
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-[#1A237E] animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Results / Score Entry</h1>
          <p className="text-sm text-gray-500 mt-1">
            {settings.current_session && settings.current_term
              ? 'Active session & term loaded automatically.'
              : 'No active session/term set in Settings.'}
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || totalEntered === 0 || isLocked}
          className="flex items-center gap-2 px-4 py-2 bg-[#1A237E] text-white rounded-lg text-sm font-medium hover:bg-[#283593] transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : `Save${totalEntered > 0 ? ` (${totalEntered})` : ''}`}
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
      {isLocked && (
        <div className="flex items-start gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <Lock className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-orange-700">Scores are locked for this class. Unlock from the Publish page to edit.</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
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
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Subject</label>
          <select
            value={subjectId}
            onChange={e => setSubjectId(e.target.value)}
            disabled={!classId}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30 disabled:bg-gray-50 disabled:text-gray-400"
          >
            <option value="">Select subject</option>
            {subjects.map(s => (
              <option key={s.id} value={s.id}>{s.name}{s.code ? ` (${s.code})` : ''}</option>
            ))}
          </select>
        </div>
      </div>

      {classId && subjectId && assessmentTypes.length > 0 && (
        <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <p className="text-sm text-blue-700">
            <span className="font-medium">{formulaText}</span>
            <span className="text-blue-500 ml-2">- Tier: {tier} - Template: {examTemplate}</span>
          </p>
        </div>
      )}

      {classId && subjectId && (
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
              <p className="text-xs text-gray-500">Scores Entered</p>
              <p className="text-lg font-bold text-gray-800">{totalEntered}/{students.length}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center"><BookOpen className="w-5 h-5 text-orange-600" /></div>
            <div>
              <p className="text-xs text-gray-500">Class Average</p>
              <p className="text-lg font-bold text-gray-800">{classAvg}/{totalMax}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center"><Info className="w-5 h-5 text-purple-600" /></div>
            <div>
              <p className="text-xs text-gray-500">Columns</p>
              <p className="text-lg font-bold text-gray-800">{assessmentTypes.length}</p>
            </div>
          </div>
        </div>
      )}

      {classId && subjectId ? (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Student Scores</h2>
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search student..."
                className="pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30 w-64"
              />
            </div>
          </div>

          {filteredStudents.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 mx-auto bg-gray-50 rounded-full flex items-center justify-center mb-3"><Users className="w-8 h-8 text-gray-300" /></div>
              <p className="text-gray-400 text-sm">{students.length === 0 ? 'No students in this class.' : 'No students match your search.'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-3 py-3">#</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-3 py-3">Student</th>
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
                                className="w-14 px-1.5 py-1 text-center border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30 focus:border-[#1A237E] disabled:bg-gray-50"
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
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <div className="w-16 h-16 mx-auto bg-blue-50 rounded-2xl flex items-center justify-center mb-3"><BookOpen className="w-8 h-8 text-blue-400" /></div>
          <h3 className="text-gray-700 font-medium mb-1">Select Class & Subject</h3>
          <p className="text-gray-400 text-sm">Choose a class and subject above to start entering scores.</p>
        </div>
      )}
    </div>
  )
}
