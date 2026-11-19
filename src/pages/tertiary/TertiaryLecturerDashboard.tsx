import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { dbProxy } from '../../lib/dbProxy'
import type { ProgrammeType } from '../../utils/tertiaryGrading'
import {
  BookOpen,
  FileText,
  Video,
  ClipboardList,
  ClipboardCheck,
  Users,
  RefreshCw,
  AlertCircle,
  ArrowRight,
  GraduationCap,
} from 'lucide-react'

interface CourseRow {
  id: string
  course_code?: string
  course_title?: string
  credit_units?: number
  level?: number
  programme_type?: ProgrammeType | string
  lecturer_id?: string | null
  teacher_id?: string | null
}

interface EnrollmentRow {
  id: string
  course_id: string
  student_id: string
  status?: string
}

const QUICK_ACTIONS = [
  {
    title: 'Results Entry',
    description: 'Record scores, grades, GP/QP, or IJMB subject points.',
    path: '/dashboard/tertiary/lecturer/results',
    icon: FileText,
  },
  {
    title: 'Live Lectures',
    description: 'Schedule or join live teaching sessions for your courses.',
    path: '/dashboard/tertiary/lecturer/live-lectures',
    icon: Video,
  },
  {
    title: 'Exams (CBT)',
    description: 'Create and manage computer-based tests and assessments.',
    path: '/dashboard/tertiary/lecturer/exams',
    icon: ClipboardList,
  },
  {
    title: 'Lecture Plans',
    description: 'Submit and track course lecture plans.',
    path: '/dashboard/tertiary/lecturer/lesson-plans',
    icon: ClipboardCheck,
  },
]

export default function TertiaryLecturerDashboard() {
  const { user } = useAuth() as { user: any }
  const schoolId: string = user?.school_id || user?.schoolId || ''
  const lecturerId: string = user?.id || user?.teacher_id || user?.teacherId || ''

  const [courses, setCourses] = useState<CourseRow[]>([])
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([])
  const [filteredByLecturer, setFilteredByLecturer] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadDashboard = useCallback(async () => {
    if (!schoolId) {
      setError('No institution ID found on your account.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const [coursesRes, enrollRes] = await Promise.all([
        dbProxy.from('uni_courses').select('*').eq('school_id', schoolId).order('course_code'),
        dbProxy.from('uni_enrollments').select('id, course_id, student_id, status').eq('school_id', schoolId),
      ])
      if (coursesRes?.error) throw coursesRes.error
      if (enrollRes?.error) throw enrollRes.error

      const allCourses: CourseRow[] = coursesRes?.data || []
      const activeEnrollments: EnrollmentRow[] = (enrollRes?.data || []).filter(
        (e: EnrollmentRow) => !e.status || e.status === 'registered'
      )

      const hasAssignmentField = allCourses.some(
        (c) => Boolean(c.lecturer_id) || Boolean(c.teacher_id)
      )
      const assigned =
        lecturerId && hasAssignmentField
          ? allCourses.filter(
              (c) => c.lecturer_id === lecturerId || c.teacher_id === lecturerId
            )
          : allCourses

      setCourses(assigned)
      setFilteredByLecturer(Boolean(lecturerId && hasAssignmentField))
      setEnrollments(activeEnrollments)
    } catch (err: any) {
      setError(err?.message || 'Failed to load lecturer dashboard.')
    } finally {
      setLoading(false)
    }
  }, [schoolId, lecturerId])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  const courseIds = new Set(courses.map((c) => c.id))
  const enrolledStudentIds = new Set(
    enrollments.filter((e) => courseIds.has(e.course_id)).map((e) => e.student_id)
  )
  const ijmbCount = courses.filter((c) => c.programme_type === 'ijmb').length

  const displayName =
    [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim() ||
    user?.name ||
    'Lecturer'

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-gradient-to-br from-slate-50 via-white to-violet-50/30">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-semibold text-slate-600">Loading lecturer workspace...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="px-3 sm:px-4 lg:px-6 py-4 sm:py-6 max-w-6xl mx-auto space-y-6 bg-gradient-to-br from-slate-50 via-white to-violet-50/30 min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-100 text-violet-700 mb-2">
            <GraduationCap size={14} />
            Tertiary Lecturer Workspace
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Welcome, {displayName}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {filteredByLecturer
              ? 'Showing courses assigned to your lecturer account.'
              : 'Showing institution courses available for teaching and assessment.'}
          </p>
        </div>

        <button
          onClick={loadDashboard}
          className="inline-flex items-center gap-2 self-start sm:self-auto px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2.5 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          <AlertCircle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/70 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Courses</span>
            <BookOpen size={18} className="text-violet-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900">{courses.length}</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/70 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Enrolled Students</span>
            <Users size={18} className="text-violet-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900">{enrolledStudentIds.size}</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/70 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">IJMB Courses</span>
            <ClipboardList size={18} className="text-violet-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900">{ijmbCount}</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/70 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Units</span>
            <FileText size={18} className="text-violet-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900">
            {courses.reduce(
              (sum, c) => sum + (c.programme_type === 'ijmb' ? 0 : Number(c.credit_units || 0)),
              0
            )}
          </div>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon
            return (
              <Link
                key={action.path}
                to={action.path}
                className="group bg-white rounded-2xl border border-slate-200/70 p-4 shadow-sm hover:border-violet-300 hover:shadow-md transition flex flex-col justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center group-hover:bg-violet-600 group-hover:text-white transition">
                    <Icon size={18} />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">{action.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{action.description}</p>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-violet-600 group-hover:translate-x-0.5 transition-transform">
                  Open <ArrowRight size={14} />
                </span>
              </Link>
            )
          })}
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Assigned Courses</h2>
            <p className="text-xs text-slate-500">Course roster counts from active registrations</p>
          </div>
          <Link
            to="/dashboard/tertiary/lecturer/results"
            className="text-xs font-semibold text-violet-600 hover:text-violet-700"
          >
            Enter Results →
          </Link>
        </div>

        {courses.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No courses found for this institution yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-5">Code</th>
                  <th className="py-3 px-4">Course Title</th>
                  <th className="py-3 px-4">Programme</th>
                  <th className="py-3 px-4">Level</th>
                  <th className="py-3 px-4">Units</th>
                  <th className="py-3 px-5 text-right">Students</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {courses.map((course) => {
                  const isIjmb = course.programme_type === 'ijmb'
                  const count = enrollments.filter((e) => e.course_id === course.id).length
                  return (
                    <tr key={course.id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-5 font-semibold text-slate-900">{course.course_code || '—'}</td>
                      <td className="py-3 px-4 text-slate-700">{course.course_title || 'Untitled Course'}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                            isIjmb
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-violet-100 text-violet-700'
                          }`}
                        >
                          {isIjmb ? 'IJMB' : 'Degree'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{course.level ? `${course.level}L` : '—'}</td>
                      <td className="py-3 px-4 text-slate-600">{isIjmb ? 'Points' : (course.credit_units ?? 0)}</td>
                      <td className="py-3 px-5 text-right font-semibold text-slate-800">{count}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
