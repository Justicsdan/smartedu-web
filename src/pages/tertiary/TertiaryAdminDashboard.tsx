import { useState, useEffect } from 'react'
import { dbProxy } from '../../lib/dbProxy'
import { useAuth } from '../../contexts/AuthContext'
import {
  BookOpen, Users, GraduationCap, Plus, AlertCircle,
  Trash2, Award, TrendingUp, Search,
} from 'lucide-react'

export default function UniAdminDashboard() {
  const { user } = useAuth() as { user: any }
  const schoolId = user?.school_id || user?.schoolId || user?.id || ''
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [courses, setCourses] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [showAddCourse, setShowAddCourse] = useState(false)
  const [search, setSearch] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [courseForm, setCourseForm] = useState({
    course_code: '', course_title: '', credit_units: 2, level: 100, semester_type: 'first'
  })

  const loadData = async () => {
    setLoading(true); setError('')
    try {
      const [coursesRes, studentsRes] = await Promise.all([
        dbProxy.from('uni_courses').select('*').eq('school_id', schoolId).order('course_code'),
        dbProxy.from('students').select('id, first_name, last_name, admission_no').eq('school_id', schoolId).order('first_name'),
      ])
      if (coursesRes.error) throw coursesRes.error
      setCourses(coursesRes.data || [])
      setStudents(studentsRes.data || [])
    } catch (e: any) {
      setError(e.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [schoolId])

  const handleAddCourse = async () => {
    if (!courseForm.course_code.trim() || !courseForm.course_title.trim()) {
      setError('Course code and title are required')
      return
    }
    try {
      const { error } = await dbProxy.from('uni_courses').insert({
        school_id: schoolId,
        course_code: courseForm.course_code.trim().toUpperCase(),
        course_title: courseForm.course_title.trim(),
        credit_units: Number(courseForm.credit_units) || 2,
        level: Number(courseForm.level) || 100,
        semester_type: courseForm.semester_type,
      })
      if (error) throw error
      setSuccessMsg('Course added')
      setCourseForm({ course_code: '', course_title: '', credit_units: 2, level: 100, semester_type: 'first' })
      setShowAddCourse(false)
      loadData()
    } catch (e: any) {
      setError(e.message || 'Failed to add course')
    }
  }

  const handleDeleteCourse = async (id: string) => {
    if (!confirm('Delete this course? This will also delete all enrollments and results for it.')) return
    try {
      await dbProxy.from('uni_results').delete().eq('course_id', id)
      await dbProxy.from('uni_enrollments').delete().eq('course_id', id)
      await dbProxy.from('uni_courses').delete().eq('id', id)
      loadData()
      setSuccessMsg('Course deleted')
    } catch (e: any) {
      setError(e.message || 'Delete failed')
    }
  }

  const filteredCourses = courses.filter(c =>
    c.course_code?.toLowerCase().includes(search.toLowerCase()) ||
    c.course_title?.toLowerCase().includes(search.toLowerCase())
  )

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
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 bg-clip-text text-transparent">University Admin</h1>
          <p className="text-sm text-slate-500 mt-1.5">Manage courses, credits, and academic records</p>
        </div>
        <button onClick={() => setShowAddCourse(true)}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white text-sm font-bold shadow-lg shadow-violet-500/30 hover:-translate-y-0.5 transition-all">
          <Plus size={14} strokeWidth={2.4} /> Add Course
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
          <Award size={18} className="flex-shrink-0 mt-0.5" />
          <p className="text-sm flex-1">{successMsg}</p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="group bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-4 shadow-lg shadow-slate-200/40 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 shadow-md" style={{ background: 'linear-gradient(135deg, #8B5CF6, #7c3aed)', boxShadow: '0 4px 12px rgba(139, 92, 246, 0.4)' }}>
            <BookOpen size={18} strokeWidth={2.2} className="text-white" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{courses.length}</div>
          <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 mt-0.5">Courses</div>
        </div>
        <div className="group bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-4 shadow-lg shadow-slate-200/40 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 shadow-md" style={{ background: 'linear-gradient(135deg, #10B981, #059669)', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)' }}>
            <Users size={18} strokeWidth={2.2} className="text-white" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{students.length}</div>
          <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 mt-0.5">Students</div>
        </div>
        <div className="group bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-4 shadow-lg shadow-slate-200/40 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 shadow-md" style={{ background: 'linear-gradient(135deg, #F59E0B, #d97706)', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.4)' }}>
            <TrendingUp size={18} strokeWidth={2.2} className="text-white" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{courses.filter(c => c.programme_type !== 'ijmb').reduce((sum, c) => sum + (c.credit_units || 0), 0)}</div>
          <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 mt-0.5">Total Credits</div>
        </div>
        <div className="group bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-4 shadow-lg shadow-slate-200/40 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 shadow-md" style={{ background: 'linear-gradient(135deg, #3B82F6, #2563eb)', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)' }}>
            <GraduationCap size={18} strokeWidth={2.2} className="text-white" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{new Set(courses.map(c => c.level)).size}</div>
          <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 mt-0.5">Levels</div>
        </div>
      </div>

      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg shadow-slate-200/40 border border-slate-200/60 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-violet-50/50 to-transparent">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-violet-500/30">
              <BookOpen size={18} strokeWidth={2.2} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">Courses</h3>
              <p className="text-[10px] text-slate-500">Manage university courses and credit units</p>
            </div>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" strokeWidth={2.2} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search courses..."
              className="pl-9 pr-3 py-2 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition w-48 sm:w-64" />
          </div>
        </div>
        {filteredCourses.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-violet-500 to-purple-600 rounded-3xl flex items-center justify-center mb-5 shadow-xl shadow-violet-500/30">
              <BookOpen size={36} className="text-white" strokeWidth={2} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">No courses yet</h3>
            <p className="mt-2 text-sm text-slate-500 max-w-xs mx-auto">Click "Add Course" to create your first university course.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredCourses.map((c, i) => (
              <div key={c.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/50 transition">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-violet-500/30">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{c.course_code} — {c.course_title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Level {c.level} · {c.semester_type === 'first' ? 'First Semester' : 'Second Semester'} · {c.programme_type === 'ijmb' ? 'IJMB Subject' : `${c.credit_units} credit unit${c.credit_units !== 1 ? 's' : ''}`}</p>
                </div>
                <button onClick={() => handleDeleteCourse(c.id)} className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-600 transition" title="Delete">
                  <Trash2 size={15} strokeWidth={2.2} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAddCourse && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowAddCourse(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h2 className="text-lg font-bold text-gray-800">Add University Course</h2>
              <button onClick={() => setShowAddCourse(false)} className="text-gray-400 hover:text-gray-600"><Plus size={20} className="rotate-45" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Course Code *</label>
                  <input value={courseForm.course_code} onChange={e => setCourseForm({ ...courseForm, course_code: e.target.value })} placeholder="e.g. CSC101" className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 outline-none transition uppercase" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Credit Units</label>
                  <input type="number" value={courseForm.credit_units} onChange={e => setCourseForm({ ...courseForm, credit_units: Number(e.target.value) })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 outline-none transition" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Course Title *</label>
                <input value={courseForm.course_title} onChange={e => setCourseForm({ ...courseForm, course_title: e.target.value })} placeholder="e.g. Introduction to Programming" className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 outline-none transition" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Level (100-500)</label>
                  <select value={courseForm.level} onChange={e => setCourseForm({ ...courseForm, level: Number(e.target.value) })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 outline-none transition">
                    <option value={100}>100 Level</option>
                    <option value={200}>200 Level</option>
                    <option value={300}>300 Level</option>
                    <option value={400}>400 Level</option>
                    <option value={500}>500 Level</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Semester</label>
                  <select value={courseForm.semester_type} onChange={e => setCourseForm({ ...courseForm, semester_type: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 outline-none transition">
                    <option value="first">First Semester</option>
                    <option value="second">Second Semester</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-5 border-t border-gray-100 sticky bottom-0 bg-white">
              <button onClick={() => setShowAddCourse(false)} className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg">Cancel</button>
              <button onClick={handleAddCourse} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white text-sm font-bold shadow-lg shadow-violet-500/30 hover:-translate-y-0.5 transition-all">
                <Plus size={16} strokeWidth={2.4} /> Add Course
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
