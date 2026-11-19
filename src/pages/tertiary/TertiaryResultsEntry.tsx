import { useState, useEffect, useCallback } from 'react'
import { dbProxy } from '../../lib/dbProxy'
import { useAuth } from '../../contexts/AuthContext'
import { computeProgrammeResult } from '../../utils/tertiaryGrading'
import type { ProgrammeType } from '../../utils/tertiaryGrading'
import {
  FileText, AlertCircle, Award, Loader2,
  Save, ClipboardList, BookOpen,
} from 'lucide-react'

export default function UniResultsEntry() {
  const { user } = useAuth() as { user: any }
  const schoolId = user?.school_id || user?.schoolId || (user?.role === 'school_admin' ? user?.id : '') || ''
  const lecturerId = user?.id || user?.teacher_id || user?.teacherId || ''

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [schoolType, setSchoolType] = useState<string>('university')

  const [semesters, setSemesters] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [enrollments, setEnrollments] = useState<any[]>([])
  const [existingResults, setExistingResults] = useState<any[]>([])

  const [selectedSemester, setSelectedSemester] = useState('')
  const [selectedCourse, setSelectedCourse] = useState('')
  const [scoreDraft, setScoreDraft] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const loadInitial = useCallback(async () => {
    if (!schoolId) return
    setLoading(true); setError('')
    try {
      const [semRes, courseRes, schoolRes] = await Promise.all([
        dbProxy.from('uni_semesters').select('*').eq('school_id', schoolId).order('is_current', { ascending: false }),
        dbProxy.from('uni_courses').select('*').eq('school_id', schoolId).order('course_code'),
        dbProxy.from('schools').select('school_type').eq('id', schoolId),
      ])
      setSemesters(semRes.data || [])
      const rawCourses = courseRes.data || []
      const hasAssignment = rawCourses.some((c: any) => Boolean(c.lecturer_id) || Boolean(c.teacher_id))
      const scopedCourses =
        user?.role === 'teacher' && lecturerId && hasAssignment
          ? rawCourses.filter((c: any) => c.lecturer_id === lecturerId || c.teacher_id === lecturerId)
          : rawCourses
      setCourses(scopedCourses)
      if (schoolRes.data && schoolRes.data[0]) setSchoolType(schoolRes.data[0].school_type || 'university')
      // Auto-select current semester if exists
      const current = (semRes.data || []).find((s: any) => s.is_current)
      if (current && !selectedSemester) setSelectedSemester(current.id)
    } catch (e: any) {
      setError(e?.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [schoolId])

  useEffect(() => { loadInitial() }, [loadInitial])

  // When semester + course selected, fetch enrollments + existing results
  const loadEnrollmentsAndResults = useCallback(async () => {
    if (!selectedSemester || !selectedCourse) {
      setEnrollments([])
      setExistingResults([])
      setScoreDraft({})
      return
    }
    try {
      const [enrRes, resRes] = await Promise.all([
        dbProxy.from('uni_enrollments').select('*').eq('course_id', selectedCourse).eq('semester_id', selectedSemester).eq('status', 'registered'),
        dbProxy.from('uni_results').select('*').eq('course_id', selectedCourse).eq('semester_id', selectedSemester),
      ])
      setEnrollments(enrRes.data || [])
      setExistingResults(resRes.data || [])
      // Pre-fill draft from existing results
      const draft: Record<string, string> = {}
      for (const r of (resRes.data || [])) {
        if (r.student_id && r.total_score !== null && r.total_score !== undefined) {
          draft[r.student_id] = String(r.total_score)
        }
      }
      setScoreDraft(draft)
    } catch (e: any) {
      setError(e?.message || 'Failed to load enrollments')
    }
  }, [selectedSemester, selectedCourse])

  useEffect(() => { loadEnrollmentsAndResults() }, [loadEnrollmentsAndResults])

  // Fetch the students table for the school
  const [studentsMap, setStudentsMap] = useState<Record<string, any>>({})
  useEffect(() => {
    if (!schoolId) return
    dbProxy.from('students').select('id, first_name, last_name, admission_no').eq('school_id', schoolId)
      .then(({ data }: any) => {
        const map: Record<string, any> = {}
        for (const s of (data || [])) map[s.id] = s
        setStudentsMap(map)
      })
      .catch(() => {})
  }, [schoolId])

  const course = courses.find(c => c.id === selectedCourse)
  const programmeType: ProgrammeType =
    course?.programme_type === 'ijmb' || schoolType === 'ijmb' ? 'ijmb' : 'degree'
  const isIjmb = programmeType === 'ijmb'
  const creditUnits = isIjmb ? 0 : (course?.credit_units || 0)

  const handleSaveAll = async () => {
    if (!selectedSemester || !selectedCourse) return
    setSaving(true); setError(''); setSuccess('')
    try {
      const toUpsert: any[] = []
      for (const enr of enrollments) {
        const raw = scoreDraft[enr.student_id]
        if (raw === undefined || raw === '') continue
        const score = Number(raw)
        if (isNaN(score) || score < 0 || score > 100) {
          setError(`Invalid score for student ${studentsMap[enr.student_id]?.admission_no || enr.student_id}`)
          setSaving(false)
          return
        }
        const { grade, gradePoint, qualityPoints } = computeProgrammeResult({
          score,
          creditUnits,
          schoolType,
          programmeType,
        })
        toUpsert.push({
          school_id: schoolId,
          student_id: enr.student_id,
          course_id: selectedCourse,
          semester_id: selectedSemester,
          programme_type: programmeType,
          total_score: score,
          grade,
          grade_point: isIjmb ? 0 : gradePoint,
          quality_points: isIjmb ? 0 : qualityPoints,
          recorded_by: user?.id,
          is_published: false,
        })
      }
      if (toUpsert.length === 0) {
        setError('No scores to save')
        setSaving(false)
        return
      }
      // Upsert each row — dbProxy may not support upsert with onConflict, so do delete+insert
      for (const row of toUpsert) {
        await dbProxy.from('uni_results').delete()
          .eq('student_id', row.student_id)
          .eq('course_id', row.course_id)
          .eq('semester_id', row.semester_id)
        await dbProxy.from('uni_results').insert(row)
      }
      setSuccess(`${toUpsert.length} result(s) saved`)
      loadEnrollmentsAndResults()
    } catch (e: any) {
      setError(e?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handlePublishAll = async () => {
    if (!confirm('Publish all results for this course/semester? Students will see them on their dashboard.')) return
    setSaving(true); setError('')
    try {
      await dbProxy.from('uni_results').update({ is_published: true, published_at: new Date().toISOString() })
        .eq('course_id', selectedCourse).eq('semester_id', selectedSemester)
      setSuccess('Results published')
      loadEnrollmentsAndResults()
    } catch (e: any) {
      setError(e?.message || 'Publish failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-gradient-to-br from-slate-50 via-white to-violet-50/30">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 border-4 border-violet-500 border-t-transparent rounded-full animate-spin shadow-lg shadow-violet-500/20" />
          <span className="text-sm font-semibold text-slate-700">Loading results entry...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="px-3 sm:px-4 lg:px-6 py-4 sm:py-6 max-w-6xl mx-auto space-y-5 bg-gradient-to-br from-slate-50 via-white to-violet-50/30 min-h-screen">
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-[10px] font-bold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse"></span>
            Results Entry
          </span>
          {isIjmb && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold uppercase tracking-wider">
              IJMB Mode (No GPA/Units)
            </span>
          )}
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 bg-clip-text text-transparent">
          {isIjmb ? 'IJMB Subject Results' : 'Course Results'}
        </h1>
        <p className="text-sm text-slate-500 mt-1.5">
          {isIjmb
            ? 'Enter scores for enrolled IJMB candidates. Letter grades and IJMB subject points (0–5) auto-compute without GPA or credit units.'
            : `Enter scores for enrolled students. Grade, GP and quality points auto-compute from your institution type (${schoolType}).`}
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-800">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          <p className="text-sm flex-1">{error}</p>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800">
          <Award size={18} className="flex-shrink-0 mt-0.5" />
          <p className="text-sm flex-1">{success}</p>
        </div>
      )}

      {/* Selectors */}
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg shadow-slate-200/40 border border-slate-200/60 p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Semester</label>
            <select value={selectedSemester} onChange={e => setSelectedSemester(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 outline-none transition">
              <option value="">— Select Semester —</option>
              {semesters.map(s => (
                <option key={s.id} value={s.id}>{s.name}{s.is_current ? ' (Current)' : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
              {isIjmb ? 'Subject / Course' : 'Course'}
            </label>
            <select value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 outline-none transition">
              <option value="">— Select Course —</option>
              {courses.map(c => {
                const courseIsIjmb = c.programme_type === 'ijmb' || schoolType === 'ijmb'
                return (
                  <option key={c.id} value={c.id}>
                    {c.course_code} — {c.course_title} {courseIsIjmb ? '[IJMB]' : `(${c.credit_units} cr)`}
                  </option>
                )
              })}
            </select>
          </div>
        </div>
        {course && (
          <div className="flex flex-wrap items-center gap-3 pt-2 px-1 text-xs text-slate-500">
            {isIjmb ? (
              <span className="inline-flex items-center gap-1.5 font-medium text-amber-700">
                <BookOpen size={12} /> IJMB Programme (Letter Grade &amp; Points)
              </span>
            ) : (
              <>
                <span className="inline-flex items-center gap-1.5"><BookOpen size={12} /> {creditUnits} credit units</span>
                <span className="text-slate-300">·</span>
                <span>Level {course.level}</span>
                <span className="text-slate-300">·</span>
                <span>{course.semester_type === 'first' ? 'First Semester' : 'Second Semester'}</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Score entry table */}
      {selectedSemester && selectedCourse ? (
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg shadow-slate-200/40 border border-slate-200/60 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-violet-50/50 to-transparent">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-violet-500/30">
                <ClipboardList size={18} strokeWidth={2.2} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  {isIjmb ? 'Enrolled Candidates' : 'Enrolled Students'}
                </h3>
                <p className="text-[10px] text-slate-500">{enrollments.length} registered · scores auto-grade on save</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleSaveAll} disabled={saving || enrollments.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white text-sm font-bold shadow-lg shadow-violet-500/30 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 transition-all">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} strokeWidth={2.4} />}
                Save All
              </button>
              <button onClick={handlePublishAll} disabled={saving || existingResults.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-lg shadow-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 transition-all">
                Publish
              </button>
            </div>
          </div>

          {enrollments.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-violet-500 to-purple-600 rounded-3xl flex items-center justify-center mb-5 shadow-xl shadow-violet-500/30">
                <ClipboardList size={36} className="text-white" strokeWidth={2} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">No students enrolled</h3>
              <p className="mt-2 text-sm text-slate-500 max-w-xs mx-auto">Add enrollments for this course/semester first.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600 text-[10px] uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="px-5 py-3 text-left">Student</th>
                    <th className="px-3 py-3 text-left">Adm No</th>
                    <th className="px-3 py-3 text-center w-32">Score (0–100)</th>
                    <th className="px-3 py-3 text-center w-16">Grade</th>
                    {isIjmb ? (
                      <>
                        <th className="px-3 py-3 text-center w-24">IJMB Pts</th>
                        <th className="px-3 py-3 text-center w-32">Remark</th>
                      </>
                    ) : (
                      <>
                        <th className="px-3 py-3 text-center w-20">GP</th>
                        <th className="px-3 py-3 text-center w-24">QP</th>
                      </>
                    )}
                    <th className="px-3 py-3 text-center w-20">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {enrollments.map((enr, i) => {
                    const student = studentsMap[enr.student_id]
                    const name = student ? `${student.first_name} ${student.last_name}` : '—'
                    const admNo = student?.admission_no || '—'
                    const raw = scoreDraft[enr.student_id] ?? ''
                    const score = Number(raw)
                    const validScore = raw !== '' && !isNaN(score) && score >= 0 && score <= 100
                    const computed = validScore
                      ? computeProgrammeResult({ score, creditUnits, schoolType, programmeType })
                      : null
                    const existing = existingResults.find(r => r.student_id === enr.student_id)
                    const existingComputed =
                      !computed && existing?.total_score !== null && existing?.total_score !== undefined
                        ? computeProgrammeResult({
                            score: Number(existing.total_score),
                            creditUnits,
                            schoolType,
                            programmeType,
                          })
                        : null
                    const activeGrade = computed?.grade || existing?.grade
                    const isPassing = activeGrade ? activeGrade !== 'F' : false

                    return (
                      <tr key={enr.id || i} className="hover:bg-slate-50/50 transition">
                        <td className="px-5 py-3 font-semibold text-slate-900">{name}</td>
                        <td className="px-3 py-3 text-slate-600">{admNo}</td>
                        <td className="px-3 py-3">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            step={0.5}
                            value={raw}
                            onChange={e => setScoreDraft(prev => ({ ...prev, [enr.student_id]: e.target.value }))}
                            placeholder="—"
                            className="w-full px-2 py-1.5 border border-slate-200 rounded-md text-sm text-center text-slate-900 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 outline-none transition"
                          />
                        </td>
                        <td className="px-3 py-3 text-center">
                          {activeGrade ? (
                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${
                              computed
                                ? (isPassing ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700')
                                : (isPassing ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600')
                            }`}>{activeGrade}</span>
                          ) : <span className="text-slate-300">—</span>}
                        </td>
                        {isIjmb ? (
                          <>
                            <td className="px-3 py-3 text-center font-semibold text-slate-700">
                              {computed?.ijmbPoints !== null && computed?.ijmbPoints !== undefined
                                ? `${computed.ijmbPoints} / 5`
                                : existingComputed?.ijmbPoints !== null && existingComputed?.ijmbPoints !== undefined
                                  ? `${existingComputed.ijmbPoints} / 5`
                                  : '—'}
                            </td>
                            <td className="px-3 py-3 text-center text-xs font-medium text-slate-600">
                              {computed?.remark || existingComputed?.remark || '—'}
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-3 py-3 text-center font-semibold text-slate-700">
                              {computed ? computed.gradePoint.toFixed(1) : (existing?.grade_point ? Number(existing.grade_point).toFixed(1) : '—')}
                            </td>
                            <td className="px-3 py-3 text-center font-semibold text-slate-700">
                              {computed ? computed.qualityPoints.toFixed(1) : (existing?.quality_points ? Number(existing.quality_points).toFixed(1) : '—')}
                            </td>
                          </>
                        )}
                        <td className="px-3 py-3 text-center">
                          {existing?.is_published ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">Published</span>
                          ) : existing ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold uppercase tracking-wider">Draft</span>
                          ) : <span className="text-slate-300 text-[10px]">New</span>}
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
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-violet-500 to-purple-600 rounded-3xl flex items-center justify-center mb-5 shadow-xl shadow-violet-500/30">
            <FileText size={36} className="text-white" strokeWidth={2} />
          </div>
          <h3 className="text-lg font-bold text-slate-900 tracking-tight">Select a semester and course</h3>
          <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto">Pick a semester and a course above to load the enrolled students and enter their scores.</p>
        </div>
      )}
    </div>
  )
}
