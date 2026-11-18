import { useState, useEffect, useCallback } from 'react'
import { dbProxy } from '../../lib/dbProxy'
import { useAuth } from '../../contexts/AuthContext'
import {
  ClipboardList, Plus, AlertCircle, Award, Loader2,
  Trash2, X, Save, UserPlus, UserMinus, BookOpen, Calendar,
} from 'lucide-react'

export default function TertiaryEnrollmentsPage() {
  const { user } = useAuth() as { user: any }
  const schoolId = user?.school_id || user?.schoolId || user?.id || ''
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [semesters, setSemesters] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [enrollments, setEnrollments] = useState<any[]>([])
  const [selectedSemester, setSelectedSemester] = useState('')
  const [selectedCourse, setSelectedCourse] = useState('')
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    if (!schoolId) { setError('No school ID'); setLoading(false); return }
    setLoading(true); setError('')
    try {
      const [semRes, crsRes, stuRes] = await Promise.all([
        dbProxy.from('uni_semesters').select('*').eq('school_id', schoolId).order('is_current', { ascending: false }),
        dbProxy.from('uni_courses').select('*').eq('school_id', schoolId).order('course_code'),
        dbProxy.from('students').select('id, first_name, last_name, middle_name, admission_no').eq('school_id', schoolId).order('first_name'),
      ])
      setSemesters(semRes.data || [])
      setCourses(crsRes.data || [])
      setStudents(stuRes.data || [])
      const cur = (semRes.data || []).find((s: any) => s.is_current)
      if (cur && !selectedSemester) setSelectedSemester(cur.id)
    } catch (e: any) {
      setError(e?.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [schoolId, selectedSemester])

  const loadEnrollments = useCallback(async () => {
    if (!selectedCourse || !selectedSemester) {
      setEnrollments([])
      return
    }
    try {
      const { data } = await dbProxy.from('uni_enrollments')
        .select('*')
        .eq('course_id', selectedCourse)
        .eq('semester_id', selectedSemester)
        .eq('status', 'registered')
      setEnrollments(data || [])
    } catch {
      setEnrollments([])
    }
  }, [selectedCourse, selectedSemester])

  useEffect(() => { load() }, [load])
  useEffect(() => { loadEnrollments() }, [loadEnrollments])

  const enrolledStudentIds = new Set(enrollments.map(e => e.student_id))
  const filteredStudents = students.filter(s => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    const fullName = `${s.first_name} ${s.last_name} ${s.middle_name || ''}`.toLowerCase()
    return fullName.includes(q) || (s.admission_no || '').toLowerCase().includes(q)
  })

  const enrollStudent = async (studentId: string) => {
    if (!selectedCourse || !selectedSemester) return
    try {
      const { error } = await dbProxy.from('uni_enrollments').insert({
        school_id: schoolId,
        student_id: studentId,
        course_id: selectedCourse,
        semester_id: selectedSemester,
        status: 'registered',
      })
      if (error) throw error
      setSuccess('Student enrolled')
      loadEnrollments()
    } catch (e: any) {
      setError(e?.message || 'Enroll failed')
    }
  }

  const dropStudent = async (enrollmentId: string) => {
    if (!confirm('Drop this student from the course?')) return
    try {
      const { error } = await dbProxy.from('uni_enrollments').delete().eq('id', enrollmentId)
      if (error) throw error
      setSuccess('Student dropped')
      loadEnrollments()
    } catch (e: any) {
      setError(e?.message || 'Drop failed')
    }
  }

  const enrollAll = async () => {
    if (!selectedCourse || !selectedSemester) return
    if (!confirm(`Enroll all ${students.length} students in this course?`)) return
    try {
      const toEnroll = students
        .filter(s => !enrolledStudentIds.has(s.id))
        .map(s => ({
          school_id: schoolId,
          student_id: s.id,
          course_id: selectedCourse,
          semester_id: selectedSemester,
          status: 'registered',
        }))
      if (toEnroll.length === 0) {
        setSuccess('All students already enrolled')
        return
      }
      const { error } = await dbProxy.from('uni_enrollments').insert(toEnroll)
      if (error) throw error
      setSuccess(`Enrolled ${toEnroll.length} students`)
      loadEnrollments()
    } catch (e: any) {
      setError(e?.message || 'Bulk enroll failed')
    }
  }

  const course = courses.find(c => c.id === selectedCourse)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-gradient-to-br from-slate-50 via-white to-violet-50/30">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 border-4 border-violet-500 border-t-transparent rounded-full animate-spin shadow-lg shadow-violet-500/20" />
          <span className="text-sm font-semibold text-slate-700">Loading enrollments...</span>
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
            University
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 bg-clip-text text-transparent">Enrollments</h1>
        <p className="text-sm text-slate-500 mt-1.5">Register students into courses per semester</p>
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

      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg shadow-slate-200/40 border border-slate-200/60 p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider"><Calendar size={11} className="inline mr-1" /> Semester</label>
            <select value={selectedSemester} onChange={e => setSelectedSemester(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 outline-none transition">
              <option value="">— Select Semester —</option>
              {semesters.map(s => (
                <option key={s.id} value={s.id}>{s.name}{s.is_current ? ' (Current)' : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider"><BookOpen size={11} className="inline mr-1" /> Course</label>
            <select value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 outline-none transition">
              <option value="">— Select Course —</option>
              {courses.map(c => (
                <option key={c.id} value={c.id}>{c.course_code} — {c.course_title} ({c.credit_units} cr)</option>
              ))}
            </select>
          </div>
        </div>
        {course && (
          <div className="flex items-center gap-3 pt-2 px-1 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5"><BookOpen size={12} /> {course.credit_units} credit units</span>
            <span className="text-slate-300">·</span>
            <span>Level {course.level}</span>
            <span className="text-slate-300">·</span>
            <span>{course.semester_type === 'first' ? 'First Semester' : 'Second Semester'}</span>
            <span className="ml-auto inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">
              <ClipboardList size={11} /> {enrollments.length} enrolled
            </span>
          </div>
        )}
        {selectedCourse && selectedSemester && students.length > 0 && (
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button onClick={enrollAll} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white text-xs font-bold shadow-lg shadow-emerald-500/30 hover:-translate-y-0.5 transition-all">
              <UserPlus size={14} strokeWidth={2.4} /> Enroll All
            </button>
          </div>
        )}
      </div>

      {selectedSemester && selectedCourse ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Not enrolled */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg shadow-slate-200/40 border border-slate-200/60 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-transparent">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center text-slate-600">
                  <UserPlus size={15} strokeWidth={2.2} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Not Enrolled</p>
                  <p className="text-[10px] text-slate-500">{filteredStudents.filter(s => !enrolledStudentIds.has(s.id)).length} students</p>
                </div>
              </div>
              <div className="relative">
                <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
                  className="pl-3 pr-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition w-32" />
              </div>
            </div>
            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {filteredStudents.filter(s => !enrolledStudentIds.has(s.id)).length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">All students enrolled</p>
              ) : filteredStudents.filter(s => !enrolledStudentIds.has(s.id)).map(s => (
                <div key={s.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50/50 transition">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-900 truncate">{s.first_name} {s.middle_name ? s.middle_name + ' ' : ''}{s.last_name}</p>
                    <p className="text-[10px] text-slate-500">{s.admission_no || '—'}</p>
                  </div>
                  <button onClick={() => enrollStudent(s.id)} className="w-7 h-7 rounded-lg bg-emerald-50 hover:bg-emerald-100 flex items-center justify-center text-emerald-600 transition" title="Enroll">
                    <Plus size={14} strokeWidth={2.4} />
                  </button>
                </div>
              ))}
            </div>
          </div>
          {/* Enrolled */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg shadow-emerald-100/40 border border-emerald-100 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-emerald-100 bg-gradient-to-r from-emerald-50/50 to-transparent">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <Award size={15} strokeWidth={2.2} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Enrolled</p>
                  <p className="text-[10px] text-slate-500">{enrollments.length} students</p>
                </div>
              </div>
            </div>
            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {enrollments.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">No one enrolled yet</p>
              ) : enrollments.map(e => {
                const s = students.find(st => st.id === e.student_id)
                if (!s) return null
                return (
                  <div key={e.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-red-50/30 transition">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-900 truncate">{s.first_name} {s.middle_name ? s.middle_name + ' ' : ''}{s.last_name}</p>
                      <p className="text-[10px] text-slate-500">{s.admission_no || '—'}</p>
                    </div>
                    <button onClick={() => dropStudent(e.id)} className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-600 transition" title="Drop">
                      <UserMinus size={14} strokeWidth={2.4} />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg shadow-slate-200/40 border border-slate-200/60 py-16 text-center">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-violet-500 to-purple-600 rounded-3xl flex items-center justify-center mb-5 shadow-xl shadow-violet-500/30">
            <ClipboardList size={36} className="text-white" strokeWidth={2} />
          </div>
          <h3 className="text-lg font-bold text-slate-900 tracking-tight">Select a semester and course</h3>
          <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto">Pick a semester and a course above to manage student enrollments.</p>
        </div>
      )}
    </div>
  )
}
