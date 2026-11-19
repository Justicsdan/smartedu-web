import { useState, useEffect, useCallback } from 'react'
import { dbProxy } from '../../lib/dbProxy'
import { useAuth } from '../../contexts/AuthContext'
import { getClassOfDegree, computeIjmbSubjectPoints } from '../../utils/tertiaryGrading'
import type { ProgrammeType } from '../../utils/tertiaryGrading'
import { Award, BookOpen, TrendingUp, AlertCircle, FileText } from 'lucide-react'

export default function TertiaryStudentResultsPage() {
  const { user } = useAuth() as { user: any }
  const studentId: string = user?.id || user?.student_id || user?.studentId || ''
  const schoolId: string = user?.school_id || user?.schoolId || ''
  const displayName = [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim() || 'Student'

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [semesters, setSemesters] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [institutionType, setInstitutionType] = useState<string | null>(null)
  const [instSettings, setInstSettings] = useState<{ program_type?: string; grading_scale?: string } | null>(null)

  const load = useCallback(async () => {
    if (!studentId || !schoolId) {
      setLoading(false)
      setError('Your session is missing student or school details. Please log out and log in again.')
      return
    }
    setLoading(true); setError('')
    try {
      const responses: any[] = await Promise.all([
        dbProxy.from('uni_results').select('*').eq('student_id', studentId),
        dbProxy.from('uni_courses').select('*').eq('school_id', schoolId),
        dbProxy.from('uni_semesters').select('*').eq('school_id', schoolId),
        dbProxy.from('uni_profiles').select('*').eq('student_id', studentId),
        dbProxy.from('schools').select('school_type').eq('id', schoolId),
        dbProxy.from('higher_institution_settings').select('program_type, grading_scale').eq('school_id', schoolId),
      ])
      for (const res of responses) { if (res.error) throw res.error }
      setResults(responses[0].data || [])
      setCourses(responses[1].data || [])
      setSemesters(responses[2].data || [])
      setProfile((responses[3].data && responses[3].data[0]) || null)
      if (responses[4].data && responses[4].data[0]) {
        setInstitutionType(responses[4].data[0].school_type || 'university')
      }
      if (responses[5]?.data && responses[5].data[0]) {
        setInstSettings(responses[5].data[0])
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load results')
    } finally {
      setLoading(false)
    }
  }, [studentId, schoolId])

  useEffect(() => { load() }, [load])

  const studentDefaultProgramme: ProgrammeType =
    profile?.programme_type === 'ijmb' || user?.programme_type === 'ijmb' || institutionType === 'ijmb' || instSettings?.program_type === 'ijmb' || instSettings?.grading_scale === 'ijmb_points'
      ? 'ijmb'
      : 'degree'

  const report = (() => {
    const courseById: Record<string, any> = {}
    for (const c of courses) courseById[c.id] = c
    const semById: Record<string, any> = {}
    for (const s of semesters) semById[s.id] = s

    const groups: Record<string, any[]> = {}
    for (const r of results) {
      const key = r.semester_id || 'none'
      if (!groups[key]) groups[key] = []
      groups[key].push(r)
    }

    let totalUnits = 0
    let totalQP = 0
    let totalIjmbPoints = 0
    let passed = 0
    let failed = 0
    let missing = 0

    const blocks = Object.keys(groups).map((key) => {
      let units = 0
      let qp = 0
      let ijmbPts = 0
      let degreeRowCount = 0

      const rows = groups[key].map((r: any) => {
        const course = courseById[r.course_id]
        const rowProgramme: ProgrammeType =
          r.programme_type === 'ijmb' || course?.programme_type === 'ijmb'
            ? 'ijmb'
            : (r.programme_type === 'degree' || course?.programme_type === 'degree'
              ? 'degree'
              : studentDefaultProgramme)
        const isIjmbRow = rowProgramme === 'ijmb'

        if (!course) missing++

        const scoreNum = r.total_score != null ? Number(r.total_score) : null
        const ijmbInfo =
          isIjmbRow && scoreNum != null && !Number.isNaN(scoreNum)
            ? computeIjmbSubjectPoints(scoreNum)
            : null
        const gradeStr = r.grade || ijmbInfo?.grade || '-'
        const rowPassed = isIjmbRow ? gradeStr !== 'F' && gradeStr !== '-' : (Number(r.grade_point) || 0) > 0

        if (rowPassed) passed++
        else failed++

        const u = !isIjmbRow && course ? Number(course.credit_units) || 0 : 0
        const gp = !isIjmbRow ? Number(r.grade_point) || 0 : 0
        const q = !isIjmbRow
          ? (r.quality_points != null ? Number(r.quality_points) || 0 : gp * u)
          : 0
        const pts = isIjmbRow ? (ijmbInfo?.points ?? 0) : 0

        if (!isIjmbRow) {
          units += u
          qp += q
          degreeRowCount++
        } else {
          ijmbPts += pts
        }

        return {
          id: r.id,
          code: course?.course_code || '(removed course)',
          title: course?.course_title || '',
          isIjmb: isIjmbRow,
          units: u,
          score: r.total_score,
          grade: gradeStr,
          gp,
          qp: q,
          ijmbPoints: pts,
          remark: ijmbInfo?.remark || '',
        }
      })

      rows.sort((a, b) => String(a.code).localeCompare(String(b.code)))
      totalUnits += units
      totalQP += qp
      totalIjmbPoints += ijmbPts
      const sem = semById[key]
      const blockIsIjmb = rows.length > 0 && rows.every((row) => row.isIjmb)

      return {
        key,
        name: sem?.name || 'Semester',
        created: sem ? String(sem.created_at) : '',
        units,
        qp,
        ijmbPoints: ijmbPts,
        isIjmb: blockIsIjmb,
        gpa: degreeRowCount > 0 && units > 0 ? qp / units : null,
        rows,
      }
    })
    blocks.sort((a, b) => b.created.localeCompare(a.created))

    return {
      blocks,
      totalUnits,
      totalIjmbPoints,
      cgpa: totalUnits > 0 ? totalQP / totalUnits : 0,
      passed,
      failed,
      missing,
    }
  })()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-semibold text-slate-700">Loading your results...</span>
        </div>
      </div>
    )
  }

  const hasIjmbResults = report.blocks.some((b) => b.rows.some((r) => r.isIjmb))
  const hasDegreeResults = report.blocks.some((b) => b.rows.some((r) => !r.isIjmb))
  const isPureIjmb = hasIjmbResults && !hasDegreeResults

  const degreeClass =
    institutionType && report.totalUnits > 0
      ? getClassOfDegree(institutionType, report.cgpa, 'degree')
      : ''

  const cards = isPureIjmb
    ? [
        { label: 'IJMB Points', value: String(report.totalIjmbPoints), sub: 'Cumulative subject points', icon: Award, grad: 'from-amber-500 to-orange-600' },
        { label: 'Subjects', value: String(report.passed + report.failed), sub: 'Assessed subjects', icon: BookOpen, grad: 'from-violet-500 to-purple-600' },
        { label: 'Passed', value: String(report.passed), sub: 'Grades A–E', icon: TrendingUp, grad: 'from-emerald-500 to-green-600' },
        { label: 'Failed', value: String(report.failed), sub: 'Grade F', icon: AlertCircle, grad: 'from-rose-500 to-red-600' },
      ]
    : [
        { label: 'CGPA', value: report.cgpa.toFixed(2), sub: degreeClass || (hasIjmbResults ? 'Degree courses only' : 'No results yet'), icon: Award, grad: 'from-violet-500 to-purple-600' },
        { label: 'Credit units', value: String(report.totalUnits), sub: 'Counted in CGPA', icon: BookOpen, grad: 'from-blue-500 to-cyan-600' },
        { label: 'Passed', value: String(report.passed), sub: hasIjmbResults ? 'Courses & subjects' : 'Courses', icon: TrendingUp, grad: 'from-emerald-500 to-green-600' },
        { label: 'Failed', value: String(report.failed), sub: hasIjmbResults ? 'Courses & subjects' : 'Courses', icon: AlertCircle, grad: 'from-rose-500 to-red-600' },
      ]

  return (
    <div className="px-4 sm:px-6 py-6 max-w-5xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-700 to-purple-600 bg-clip-text text-transparent">My Results</h1>
        <p className="text-sm text-slate-500 mt-1">
          {displayName}
          {profile?.matric_number ? ' | ' + profile.matric_number : ''}
          {profile?.department ? ' | ' + profile.department : ''}
          {profile?.current_level ? ' | ' + profile.current_level + ' Level' : ''}
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-800">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">{error}</div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((c) => {
          const Icon = c.icon
          return (
            <div key={c.label} className="bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/40 p-4">
              <div className={'w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-md mb-3 ' + c.grad}>
                <Icon size={18} className="text-white" strokeWidth={2.2} />
              </div>
              <div className="text-2xl font-bold text-slate-900 tracking-tight">{c.value}</div>
              <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 mt-0.5">{c.label}</div>
              <div className="text-xs text-slate-500 mt-0.5">{c.sub}</div>
            </div>
          )
        })}
      </div>

      {report.blocks.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 py-14 text-center text-slate-400">
          <FileText size={36} className="mx-auto mb-3 text-violet-300" />
          No published results yet. They will appear here once your institution releases them.
        </div>
      ) : (
        report.blocks.map((b) => {
          const passedInBlock = b.rows.filter((row) =>
            row.isIjmb ? row.grade !== 'F' && row.grade !== '-' : row.gp > 0
          )
          return (
            <div key={b.key} className="bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/40 overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 bg-violet-50/60 border-b border-violet-100">
                <h3 className="font-bold text-slate-900">{b.name}</h3>
                {b.isIjmb ? (
                  <div className="text-sm font-semibold text-amber-800">
                    IJMB Points {b.ijmbPoints} <span className="text-slate-500 font-normal">| {b.rows.length} subject(s)</span>
                  </div>
                ) : (
                  <div className="text-sm font-semibold text-violet-700">
                    {b.gpa != null ? `GPA ${b.gpa.toFixed(2)}` : 'Mixed / No GPA'}
                    <span className="text-slate-400 font-normal"> | {b.units} units</span>
                  </div>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase tracking-wider text-slate-500 bg-slate-50">
                    <tr>
                      <th className="py-2.5 px-4">{b.isIjmb ? 'Subject' : 'Course'}</th>
                      {b.isIjmb ? (
                        <>
                          <th className="py-2.5 px-3 text-center">Score</th>
                          <th className="py-2.5 px-3 text-center">Grade</th>
                          <th className="py-2.5 px-3 text-center">IJMB Pts</th>
                          <th className="py-2.5 px-3 text-center">Remark</th>
                        </>
                      ) : (
                        <>
                          <th className="py-2.5 px-3 text-center">Units</th>
                          <th className="py-2.5 px-3 text-center">Score</th>
                          <th className="py-2.5 px-3 text-center">Grade</th>
                          <th className="py-2.5 px-3 text-center">GP</th>
                          <th className="py-2.5 px-3 text-center">QP</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {b.rows.map((r) => {
                      const rowPass = r.isIjmb ? r.grade !== 'F' && r.grade !== '-' : r.gp > 0
                      return (
                        <tr key={r.id} className="hover:bg-violet-50/30">
                          <td className="py-2.5 px-4">
                            <span className="font-mono text-xs font-bold text-violet-700">{r.code}</span>
                            <span className="ml-2 text-slate-700">{r.title}</span>
                          </td>
                          {b.isIjmb ? (
                            <>
                              <td className="py-2.5 px-3 text-center">{r.score ?? '-'}</td>
                              <td className="py-2.5 px-3 text-center">
                                <span className={'inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ' + (rowPass ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700')}>
                                  {r.grade || '-'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-center font-semibold text-slate-800">{r.ijmbPoints}</td>
                              <td className="py-2.5 px-3 text-center text-xs text-slate-600">{r.remark || '-'}</td>
                            </>
                          ) : (
                            <>
                              <td className="py-2.5 px-3 text-center">{r.isIjmb ? '—' : r.units}</td>
                              <td className="py-2.5 px-3 text-center">{r.score ?? '-'}</td>
                              <td className="py-2.5 px-3 text-center">
                                <span className={'inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ' + (rowPass ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700')}>
                                  {r.grade || '-'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-center">{r.isIjmb ? '—' : r.gp.toFixed(1)}</td>
                              <td className="py-2.5 px-3 text-center">{r.isIjmb ? `${r.ijmbPoints} pts` : r.qp.toFixed(1)}</td>
                            </>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {b.isIjmb && passedInBlock.length > 0 && (
                <div className="px-5 py-2.5 bg-slate-50/70 border-t border-slate-100 text-xs text-slate-500">
                  Total IJMB points across {b.rows.length} subject(s): <span className="font-semibold text-slate-700">{b.ijmbPoints}</span>
                </div>
              )}
            </div>
          )
        })
      )}

      {report.missing > 0 && (
        <p className="text-xs text-amber-700">
          {report.missing} result(s) refer to a course that no longer exists and are not counted in your GPA.
        </p>
      )}
      <p className="text-xs text-slate-400">Only results released by your institution are shown.</p>
    </div>
  )
}
