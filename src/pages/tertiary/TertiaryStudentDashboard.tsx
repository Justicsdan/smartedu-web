import { useState, useEffect, useCallback } from 'react'
import { dbProxy } from '../../lib/dbProxy'
import { useAuth } from '../../contexts/AuthContext'
import {
  BookOpen, Award, TrendingUp, AlertCircle,
  RefreshCw, FileText, ClipboardList,
} from 'lucide-react'
import { getClassOfDegree } from '../../utils/tertiaryGrading'

function pickString(record: any, ...keys: string[]): string {
  for (const k of keys) {
    const v = record?.[k]
    if (v !== null && v !== undefined && String(v).trim() !== '') return String(v).trim()
  }
  return ''
}

function getGradePoint(score: number): { grade: string; gp: number; remark: string } {
  if (score >= 70) return { grade: 'A', gp: 5.0, remark: 'Excellent' }
  if (score >= 60) return { grade: 'B', gp: 4.0, remark: 'Very Good' }
  if (score >= 50) return { grade: 'C', gp: 3.0, remark: 'Good' }
  if (score >= 45) return { grade: 'D', gp: 2.0, remark: 'Pass' }
  if (score >= 40) return { grade: 'E', gp: 1.0, remark: 'Pass' }
  return { grade: 'F', gp: 0.0, remark: 'Fail' }
}

export default function UniStudentDashboard() {
  const { user } = useAuth() as { user: any }
  const studentId = user?.id || user?.student_id || user?.studentId || ''
  const schoolId = user?.school_id || user?.schoolId || ''
  const displayName = [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim() || 'Student'

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [enrollments, setEnrollments] = useState<any[]>([])

  const loadData = useCallback(async () => {
    if (!studentId) return
    setLoading(true); setError('')
    try {
      const [resultsRes, coursesRes, profileRes, enrollRes] = await Promise.all([
        dbProxy.from('uni_results').select('*').eq('student_id', studentId).order('created_at', { ascending: false }),
        dbProxy.from('uni_courses').select('*').eq('school_id', schoolId).order('course_code'),
        dbProxy.from('uni_profiles').select('*').eq('student_id', studentId),
        dbProxy.from('uni_enrollments').select('*').eq('student_id', studentId).eq('status', 'registered'),
      ])

      setResults(resultsRes.data || [])
      setCourses(coursesRes.data || [])
      setProfile((profileRes.data && profileRes.data[0]) || null)
      setEnrollments(enrollRes.data || [])
    } catch (e: any) {
      setError(e?.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [studentId, schoolId])

  useEffect(() => { loadData() }, [loadData])

  const { currentGPA, cgpa, totalCredits, totalQualityPoints, passedCourses, failedCourses } = (() => {
    let tCredits = 0
    let tQP = 0
    let passed = 0
    let failed = 0
    const semesterMap: Record<string, { credits: number; qp: number }> = {}

    for (const r of results) {
      const course = courses.find(c => c.id === r.course_id)
      const credits = course?.credit_units || 0
      const gp = r.grade_point || 0
      const qp = r.quality_points || (gp * credits)
      tCredits += credits
      tQP += qp
      if (gp > 0) passed++; else failed++

      const semKey = r.semester_id || 'current'
      if (!semesterMap[semKey]) semesterMap[semKey] = { credits: 0, qp: 0 }
      semesterMap[semKey].credits += credits
      semesterMap[semKey].qp += qp
    }

    const semKeys = Object.keys(semesterMap)
    const lastSem = semKeys[semKeys.length - 1]
    const lastSemData = semesterMap[lastSem] || { credits: 0, qp: 0 }
    const gpa = lastSemData.credits > 0 ? lastSemData.qp / lastSemData.credits : 0

    return {
      currentGPA: gpa,
      cgpa: tCredits > 0 ? tQP / tCredits : 0,
      totalCredits: tCredits,
      totalQualityPoints: tQP,
      passedCourses: passed,
      failedCourses: failed,
    }
  })()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-gradient-to-br from-slate-50 via-white to-violet-50/30">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 border-4 border-violet-500 border-t-transparent rounded-full animate-spin shadow-lg shadow-violet-500/20" />
          <span className="text-sm font-semibold text-slate-700">Loading university dashboard...</span>
        </div>
      </div>
    )
  }

  const matricNo = pickString(profile, 'matric_number') || user?.admission_no || '—'
  const faculty = pickString(profile, 'faculty') || '—'
  const department = pickString(profile, 'department') || '—'
  const level = profile?.current_level || user?.class_level || 100

  return (
    <div className="px-3 sm:px-4 lg:px-6 py-4 sm:py-6 max-w-6xl mx-auto space-y-5 bg-gradient-to-br from-slate-50 via-white to-violet-50/30 min-h-screen">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-[10px] font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse"></span>
              University
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 bg-clip-text text-transparent">Welcome, {displayName}</h1>
          <p className="text-sm text-slate-500 mt-1.5">{matricNo} · {department} · {level} Level</p>
        </div>
        <button onClick={loadData} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/80 backdrop-blur-sm border border-slate-200 hover:border-violet-400 hover:bg-violet-50 transition-all text-slate-700 font-semibold text-sm shadow-md hover:shadow-lg hover:-translate-y-0.5">
          <RefreshCw size={14} strokeWidth={2.2} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-800">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          <p className="text-sm flex-1">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="group bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-4 shadow-lg shadow-slate-200/40 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 shadow-md" style={{ background: 'linear-gradient(135deg, #8B5CF6, #7c3aed)', boxShadow: '0 4px 12px rgba(139, 92, 246, 0.4)' }}>
            <TrendingUp size={18} strokeWidth={2.2} className="text-white" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{currentGPA.toFixed(2)}</div>
          <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 mt-0.5">Current GPA</div>
        </div>
        <div className="group bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-4 shadow-lg shadow-slate-200/40 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 shadow-md" style={{ background: 'linear-gradient(135deg, #10B981, #059669)', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)' }}>
            <Award size={18} strokeWidth={2.2} className="text-white" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{cgpa.toFixed(2)}</div>
          <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 mt-0.5">CGPA · {getClassOfDegree(cgpa)}</div>
        </div>
        <div className="group bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-4 shadow-lg shadow-slate-200/40 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 shadow-md" style={{ background: 'linear-gradient(135deg, #3B82F6, #2563eb)', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)' }}>
            <BookOpen size={18} strokeWidth={2.2} className="text-white" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{totalCredits}</div>
          <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 mt-0.5">Credits Earned</div>
        </div>
        <div className="group bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-4 shadow-lg shadow-slate-200/40 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 shadow-md" style={{ background: 'linear-gradient(135deg, #F59E0B, #d97706)', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.4)' }}>
            <ClipboardList size={18} strokeWidth={2.2} className="text-white" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{enrollments.length}</div>
          <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 mt-0.5">Registered Courses</div>
        </div>
      </div>

      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg shadow-slate-200/40 border border-slate-200/60 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-violet-50/50 to-transparent">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-violet-500/30">
              <FileText size={18} strokeWidth={2.2} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">Recent Results</h3>
              <p className="text-[10px] text-slate-500">Your latest course scores</p>
            </div>
          </div>
        </div>
        <div className="px-5 py-3">
          {results.length === 0 ? (
            <div className="py-8 text-center">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                <FileText size={20} className="text-slate-400" />
              </div>
              <p className="text-sm text-slate-400">No results published yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {results.slice(0, 8).map((r, i) => {
                const course = courses.find(c => c.id === r.course_id)
                const name = course ? `${course.course_code} — ${course.course_title}` : 'Unknown Course'
                const credits = course?.credit_units || 0
                const gp = r.grade_point || 0
                const isPass = gp > 0
                return (
                  <div key={i} className="flex items-center justify-between py-3 gap-3 hover:bg-slate-50/50 -mx-2 px-2 rounded transition">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold shadow-md ${isPass ? 'bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-emerald-500/30' : 'bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-red-500/30'}`}>
                        {r.grade || (isPass ? 'P' : 'F')}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900 truncate">{name}</div>
                        <div className="text-[11px] text-slate-500">{credits} credit unit{credits !== 1 ? 's' : ''} · GP: {gp.toFixed(1)}</div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-slate-900">{r.total_score || 0}</p>
                      <p className="text-[10px] text-slate-500">/ 100</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
