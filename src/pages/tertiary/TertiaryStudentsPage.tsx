import { useState, useEffect, useCallback } from 'react'
import { dbProxy } from '../../lib/dbProxy'
import { useAuth } from '../../contexts/AuthContext'
import {
  Users, Plus, AlertCircle, Award, Loader2, Search,
  Trash2, Edit3, X, Save, BookOpen, IdCard, GraduationCap,
} from 'lucide-react'

const HEMAN_SCHOOL_ID = 'b84cbf0e-0c0e-4f69-8081-22ad511f6152'

export default function TertiaryStudentsPage() {
  const { user } = useAuth() as { user: any }
  const schoolId = user?.school_id || user?.schoolId || user?.id || ''
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [students, setStudents] = useState<any[]>([])
  const [profiles, setProfiles] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [enrollments, setEnrollments] = useState<any[]>([])
  const [results, setResults] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    first_name: '', last_name: '', middle_name: '',
    admission_no: '', gender: 'male',
    matric_number: '', faculty: '', department: '', current_level: 100,
    parent_phone: '', parent_email: '',
  })

  const load = useCallback(async () => {
    if (!schoolId) { setError('No school ID'); setLoading(false); return }
    setLoading(true); setError('')
    try {
      const [stuRes, profRes, crsRes, enrRes, resRes] = await Promise.all([
        dbProxy.from('students').select('id, school_id, first_name, last_name, middle_name, admission_no, gender, is_active, parent_phone, parent_email').eq('school_id', schoolId).order('first_name'),
        dbProxy.from('uni_profiles').select('*').eq('school_id', schoolId),
        dbProxy.from('uni_courses').select('id, course_code, course_title, credit_units, level').eq('school_id', schoolId).order('course_code'),
        dbProxy.from('uni_enrollments').select('id, student_id, course_id, status').eq('school_id', schoolId).eq('status', 'registered'),
        dbProxy.from('uni_results').select('student_id, course_id, total_score, grade_point, quality_points, is_published').eq('school_id', schoolId),
      ])
      setStudents(stuRes.data || [])
      setProfiles(profRes.data || [])
      setCourses(crsRes.data || [])
      setEnrollments(enrRes.data || [])
      setResults(resRes.data || [])
    } catch (e: any) {
      setError(e?.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [schoolId])

  useEffect(() => { load() }, [load])

  const profileFor = (studentId: string) => profiles.find(p => p.student_id === studentId)
  const enrollCountFor = (studentId: string) => enrollments.filter(e => e.student_id === studentId).length
  const resultCountFor = (studentId: string) => results.filter(r => r.student_id === studentId).length
  const cgpaFor = (studentId: string) => {
    const rs = results.filter(r => r.student_id === studentId && r.is_published)
    if (rs.length === 0) return null
    let qp = 0, cu = 0
    for (const r of rs) {
      const course = courses.find(c => c.id === r.course_id)
      const credits = course?.credit_units || 0
      qp += Number(r.quality_points || 0)
      cu += credits
    }
    return cu > 0 ? (qp / cu) : null
  }

  const filtered = students.filter(s => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    const fullName = `${s.first_name} ${s.last_name} ${s.middle_name || ''}`.toLowerCase()
    const prof = profileFor(s.id)
    return fullName.includes(q) || (s.admission_no || '').toLowerCase().includes(q) ||
      (prof?.matric_number || '').toLowerCase().includes(q) ||
      (prof?.department || '').toLowerCase().includes(q)
  })

  const openAddForm = () => {
    setEditingId(null)
    setForm({
      first_name: '', last_name: '', middle_name: '',
      admission_no: '', gender: 'male',
      matric_number: '', faculty: '', department: '', current_level: 100,
      parent_phone: '', parent_email: '',
    })
    setShowForm(true)
  }

  const openEditForm = (s: any) => {
    const prof = profileFor(s.id)
    setEditingId(s.id)
    setForm({
      first_name: s.first_name || '',
      last_name: s.last_name || '',
      middle_name: s.middle_name || '',
      admission_no: s.admission_no || '',
      gender: (s.gender || 'male').toLowerCase(),
      matric_number: prof?.matric_number || '',
      faculty: prof?.faculty || '',
      department: prof?.department || '',
      current_level: prof?.current_level || 100,
      parent_phone: s.parent_phone || '',
      parent_email: s.parent_email || '',
    })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.first_name.trim() || !form.last_name.trim() || !form.admission_no.trim()) {
      setError('First name, last name, and admission number are required')
      return
    }
    setError(''); setSuccess('')
    try {
      if (editingId) {
        // Update student
        await dbProxy.from('students').update({
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          middle_name: form.middle_name.trim(),
          admission_no: form.admission_no.trim(),
          gender: form.gender,
          parent_phone: form.parent_phone,
          parent_email: form.parent_email,
        }).eq('id', editingId)
        // Update profile (upsert)
        const existingProf = profileFor(editingId)
        if (existingProf?.id) {
          await dbProxy.from('uni_profiles').update({
            matric_number: form.matric_number.trim(),
            faculty: form.faculty.trim(),
            department: form.department.trim(),
            current_level: Number(form.current_level) || 100,
          }).eq('id', existingProf.id)
        } else {
          await dbProxy.from('uni_profiles').insert({
            school_id: schoolId, student_id: editingId,
            matric_number: form.matric_number.trim(),
            faculty: form.faculty.trim(),
            department: form.department.trim(),
            current_level: Number(form.current_level) || 100,
          })
        }
        setSuccess('Student updated')
      } else {
        // Insert student
        const { data: newStu, error: inErr } = await dbProxy.from('students').insert({
          school_id: schoolId,
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          middle_name: form.middle_name.trim(),
          admission_no: form.admission_no.trim(),
          gender: form.gender,
          parent_phone: form.parent_phone,
          parent_email: form.parent_email,
          is_active: true,
          pin: '0000', // default PIN
        })
        if (inErr) throw inErr
        const newId = (newStu && newStu[0]) ? newStu[0].id : ''
        if (newId) {
          await dbProxy.from('uni_profiles').insert({
            school_id: schoolId, student_id: newId,
            matric_number: form.matric_number.trim(),
            faculty: form.faculty.trim(),
            department: form.department.trim(),
            current_level: Number(form.current_level) || 100,
          })
        }
        setSuccess('Student added')
      }
      setShowForm(false)
      load()
    } catch (e: any) {
      setError(e?.message || 'Save failed')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this student? All their enrollments and results will be lost.')) return
    try {
      await dbProxy.from('uni_results').delete().eq('student_id', id)
      await dbProxy.from('uni_enrollments').delete().eq('student_id', id)
      await dbProxy.from('uni_profiles').delete().eq('student_id', id)
      await dbProxy.from('students').delete().eq('id', id)
      setSuccess('Student deleted')
      load()
    } catch (e: any) {
      setError(e?.message || 'Delete failed')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-gradient-to-br from-slate-50 via-white to-violet-50/30">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 border-4 border-violet-500 border-t-transparent rounded-full animate-spin shadow-lg shadow-violet-500/20" />
          <span className="text-sm font-semibold text-slate-700">Loading students...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="px-3 sm:px-4 lg:px-6 py-4 sm:py-6 max-w-6xl mx-auto space-y-5 bg-gradient-to-br from-slate-50 via-white to-violet-50/30 min-h-screen">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-[10px] font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse"></span>
              University
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 bg-clip-text text-transparent">Students</h1>
          <p className="text-sm text-slate-500 mt-1.5">Manage student records, matric numbers, and academic profiles</p>
        </div>
        <button onClick={openAddForm}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white text-sm font-bold shadow-lg shadow-violet-500/30 hover:-translate-y-0.5 transition-all">
          <Plus size={14} strokeWidth={2.4} /> Add Student
        </button>
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-4 shadow-lg shadow-slate-200/40">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 shadow-md" style={{ background: 'linear-gradient(135deg, #8B5CF6, #7c3aed)', boxShadow: '0 4px 12px rgba(139, 92, 246, 0.4)' }}>
            <Users size={18} strokeWidth={2.2} className="text-white" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{students.length}</div>
          <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 mt-0.5">Total Students</div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-4 shadow-lg shadow-slate-200/40">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 shadow-md" style={{ background: 'linear-gradient(135deg, #10B981, #059669)', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)' }}>
            <BookOpen size={18} strokeWidth={2.2} className="text-white" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{enrollments.length}</div>
          <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 mt-0.5">Active Enrollments</div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-4 shadow-lg shadow-slate-200/40">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 shadow-md" style={{ background: 'linear-gradient(135deg, #F59E0B, #d97706)', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.4)' }}>
            <GraduationCap size={18} strokeWidth={2.2} className="text-white" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{results.filter(r => r.is_published).length}</div>
          <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 mt-0.5">Published Results</div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-4 shadow-lg shadow-slate-200/40">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 shadow-md" style={{ background: 'linear-gradient(135deg, #3B82F6, #2563eb)', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)' }}>
            <Award size={18} strokeWidth={2.2} className="text-white" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{new Set(profiles.map(p => p.department).filter(Boolean)).size}</div>
          <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 mt-0.5">Departments</div>
        </div>
      </div>

      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg shadow-slate-200/40 border border-slate-200/60 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-violet-50/50 to-transparent">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-violet-500/30">
              <Users size={18} strokeWidth={2.2} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">Students</h3>
              <p className="text-[10px] text-slate-500">{filtered.length} of {students.length} shown</p>
            </div>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" strokeWidth={2.2} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, matric, dept..."
              className="pl-9 pr-3 py-2 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition w-48 sm:w-64" />
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-violet-500 to-purple-600 rounded-3xl flex items-center justify-center mb-5 shadow-xl shadow-violet-500/30">
              <Users size={36} className="text-white" strokeWidth={2} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">No students yet</h3>
            <p className="mt-2 text-sm text-slate-500 max-w-xs mx-auto">Click "Add Student" to register your first student.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((s, i) => {
              const prof = profileFor(s.id)
              const cgpa = cgpaFor(s.id)
              const ec = enrollCountFor(s.id)
              const rc = resultCountFor(s.id)
              return (
                <div key={s.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/50 transition">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-violet-500/30">
                    {s.first_name?.charAt(0) || '?'}{s.last_name?.charAt(0) || ''}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{s.first_name} {s.middle_name ? s.middle_name + ' ' : ''}{s.last_name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Adm: {s.admission_no || '—'} · Matric: {prof?.matric_number || '—'} · L{prof?.current_level || 100}
                      {prof?.department ? ` · ${prof.department}` : ''}
                    </p>
                  </div>
                  <div className="hidden sm:flex items-center gap-3 text-xs">
                    <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold">{ec} courses</span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-semibold">{rc} results</span>
                    {cgpa !== null && (
                      <span className={`px-2 py-0.5 rounded-full font-bold ${(cgpa || 0) >= 2.4 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                        CGPA {Number(cgpa).toFixed(2)}
                      </span>
                    )}
                  </div>
                  <button onClick={() => openEditForm(s)} className="w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center text-blue-600 transition" title="Edit">
                    <Edit3 size={15} strokeWidth={2.2} />
                  </button>
                  <button onClick={() => handleDelete(s.id)} className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-600 transition" title="Delete">
                    <Trash2 size={15} strokeWidth={2.2} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h2 className="text-lg font-bold text-gray-800">{editingId ? 'Edit Student' : 'Add Student'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">First Name *</label>
                  <input value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 outline-none transition" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Last Name *</label>
                  <input value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 outline-none transition" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Middle Name</label>
                  <input value={form.middle_name} onChange={e => setForm({ ...form, middle_name: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 outline-none transition" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Gender</label>
                  <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 outline-none transition">
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Admission Number *</label>
                <input value={form.admission_no} onChange={e => setForm({ ...form, admission_no: e.target.value })} placeholder="e.g. HEM/2024/001" className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 outline-none transition" />
              </div>
              <div className="pt-3 mt-3 border-t border-slate-100">
                <p className="text-xs font-bold text-violet-700 uppercase tracking-wider mb-3">Academic Profile</p>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Matric Number</label>
                  <input value={form.matric_number} onChange={e => setForm({ ...form, matric_number: e.target.value })} placeholder="e.g. HEM/CS/22/001" className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 outline-none transition" />
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Faculty</label>
                    <input value={form.faculty} onChange={e => setForm({ ...form, faculty: e.target.value })} placeholder="e.g. Science & Technology" className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 outline-none transition" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Department</label>
                    <input value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} placeholder="e.g. Computer Science" className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 outline-none transition" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Current Level</label>
                    <select value={form.current_level} onChange={e => setForm({ ...form, current_level: Number(e.target.value) })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 outline-none transition">
                      <option value={100}>100 Level</option>
                      <option value={200}>200 Level</option>
                      <option value={300}>300 Level</option>
                      <option value={400}>400 Level</option>
                      <option value={500}>500 Level</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="pt-3 mt-3 border-t border-slate-100">
                <p className="text-xs font-bold text-violet-700 uppercase tracking-wider mb-3">Parent / Guardian</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Parent Phone</label>
                    <input value={form.parent_phone} onChange={e => setForm({ ...form, parent_phone: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 outline-none transition" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Parent Email</label>
                    <input value={form.parent_email} onChange={e => setForm({ ...form, parent_email: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 outline-none transition" />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-5 border-t border-gray-100 sticky bottom-0 bg-white">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg">Cancel</button>
              <button onClick={handleSave} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white text-sm font-bold shadow-lg shadow-violet-500/30 hover:-translate-y-0.5 transition-all">
                <Save size={16} strokeWidth={2.4} /> {editingId ? 'Save Changes' : 'Add Student'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
