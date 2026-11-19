import { useState, useEffect, useCallback } from 'react'
import { dbProxy } from '../../lib/dbProxy'
import { useAuth } from '../../contexts/AuthContext'
import { computeIjmbSubjectPoints } from '../../utils/tertiaryGrading'
import type { ProgrammeType } from '../../utils/tertiaryGrading'
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
    programme_type: 'degree' as ProgrammeType,
    matric_number: '', faculty: '', department: '', current_level: 100,
    parent_phone: '', parent_email: '',
  })

  const load = useCallback(async () => {
    if (!schoolId) { setError('No school ID'); setLoading(false); return }
    setLoading(true); setError('')
    try {
      const [stuRes, profRes, crsRes, enrRes, resRes] = await Promise.all([
        dbProxy.from('students').select('id, school_id, first_name, last_name, middle_name, admission_no, gender, is_active, parent_phone, parent_email, programme_type').eq('school_id', schoolId).order('first_name'),
        dbProxy.from('uni_profiles').select('*').eq('school_id', schoolId),
        dbProxy.from('uni_courses').select('id, course_code, course_title, credit_units, level, programme_type').eq('school_id', schoolId).order('course_code'),
        dbProxy.from('uni_enrollments').select('id, student_id, course_id, status').eq('school_id', schoolId).eq('status', 'registered'),
        dbProxy.from('uni_results').select('student_id, course_id, total_score, grade_point, quality_points, is_published, programme_type').eq('school_id', schoolId),
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
  const studentProgrammeFor = (studentId: string): ProgrammeType => {
    const prof = profileFor(studentId)
    const stu = students.find(s => s.id === studentId)
    if (prof?.programme_type === 'ijmb' || stu?.programme_type === 'ijmb') return 'ijmb'
    return 'degree'
  }
  const enrollCountFor = (studentId: string) => enrollments.filter(e => e.student_id === studentId).length
  const resultCountFor = (studentId: string) => results.filter(r => r.student_id === studentId).length

  const cgpaFor = (studentId: string) => {
    const rs = results.filter(r => {
      if (r.student_id !== studentId || !r.is_published) return false
      const course = courses.find(c => c.id === r.course_id)
      const isIjmbRow = r.programme_type === 'ijmb' || course?.programme_type === 'ijmb'
      return !isIjmbRow
    })
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

  const ijmbPointsFor = (studentId: string) => {
    const rs = results.filter(r => {
      if (r.student_id !== studentId || !r.is_published) return false
      const course = courses.find(c => c.id === r.course_id)
      return r.programme_type === 'ijmb' || course?.programme_type === 'ijmb' || studentProgrammeFor(studentId) === 'ijmb'
    })
    if (rs.length === 0) return null
    let pts = 0
    for (const r of rs) {
      const scoreNum = r.total_score != null ? Number(r.total_score) : NaN
      if (!Number.isNaN(scoreNum)) {
        pts += computeIjmbSubjectPoints(scoreNum).points
      }
    }
    return pts
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
      programme_type: 'degree',
      matric_number: '', faculty: '', department: '', current_level: 100,
      parent_phone: '', parent_email: '',
    })
    setShowForm(true)
  }

  const openEditForm = (s: any) => {
    const prof = profileFor(s.id)
    const pType: ProgrammeType = prof?.programme_type === 'ijmb' || s.programme_type === 'ijmb' ? 'ijmb' : 'degree'
    setEditingId(s.id)
    setForm({
      first_name: s.first_name || '',
      last_name: s.last_name || '',
      middle_name: s.middle_name || '',
      admission_no: s.admission_no || '',
      gender: (s.gender || 'male').toLowerCase(),
      programme_type: pType,
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
    const firstName = form.first_name.trim()
    const lastName = form.last_name.trim()
    const admissionNo = form.admission_no.trim()
    if (!firstName || !lastName || !admissionNo) {
      setError('First name, last name, and admission number are required')
      return
    }
    const normalizedAdm = admissionNo.toLowerCase()
    const duplicateStudent = students.find(
      (st: any) =>
        st.id !== editingId &&
        String(st.admission_no || '').trim().toLowerCase() === normalizedAdm
    )
    if (duplicateStudent) {
      setError(`A student with admission number "${admissionNo}" already exists.`)
      return
    }
    const matricNo = form.matric_number.trim()
    const facultyVal = form.faculty.trim()
    const departmentVal = form.department.trim()
    if (matricNo) {
      const normalizedMatric = matricNo.toLowerCase()
      const duplicateMatric = profiles.find(
        (prof: any) =>
          prof.student_id !== editingId &&
          String(prof.matric_number || '').trim().toLowerCase() === normalizedMatric
      )
      if (duplicateMatric) {
        setError(`A student with matric number "${matricNo}" already exists.`)
        return
      }
    }
    setError(''); setSuccess('')
    const levelNum = Number(form.current_level) || 100
    const profilePayload = {
      matric_number: matricNo,
      faculty: facultyVal,
      department: departmentVal,
      current_level: levelNum,
      programme_type: form.programme_type,
    }
    try {
      if (editingId) {
        const { error: stuErr } = await dbProxy.from('students').update({
          first_name: firstName,
          last_name: lastName,
          middle_name: form.middle_name.trim(),
          admission_no: admissionNo,
          gender: form.gender,
          programme_type: form.programme_type,
          parent_phone: form.parent_phone,
          parent_email: form.parent_email,
        }).eq('id', editingId)
        if (stuErr) throw stuErr

        const existingProf = profileFor(editingId)
        if (existingProf?.id) {
          const { error: profUpdErr } = await dbProxy.from('uni_profiles')
            .update(profilePayload)
            .eq('id', existingProf.id)
          if (profUpdErr) throw profUpdErr
        } else {
          const { error: profInsErr } = await dbProxy.from('uni_profiles')
            .insert({
              school_id: schoolId,
              student_id: editingId,
              ...profilePayload,
            })
          if (profInsErr) throw profInsErr
        }
        setSuccess('Student updated')
      } else {
        const { data: newStu, error: inErr } = await dbProxy.from('students').insert({
          school_id: schoolId,
          first_name: firstName,
          last_name: lastName,
          middle_name: form.middle_name.trim(),
          admission_no: admissionNo,
          gender: form.gender,
          programme_type: form.programme_type,
          parent_phone: form.parent_phone,
          parent_email: form.parent_email,
          is_active: true,
          pin: '0000',
        })
        if (inErr) throw inErr

        let newId = Array.isArray(newStu)
          ? (newStu[0]?.id || '')
          : ((newStu as any)?.id || '')

        if (!newId) {
          const { data: fetchedStu, error: lookupErr } = await dbProxy
            .from('students')
            .select('id')
            .eq('school_id', schoolId)
            .eq('admission_no', admissionNo)
          if (lookupErr) throw lookupErr
          newId = Array.isArray(fetchedStu)
            ? (fetchedStu[0]?.id || '')
            : ((fetchedStu as any)?.id || '')
        }

        if (!newId) {
          throw new Error('Student saved, but could not retrieve new student ID to create tertiary profile')
        }

        const { error: profErr } = await dbProxy.from('uni_profiles').insert({
          school_id: schoolId,
          student_id: newId,
          ...profilePayload,
        })
        if (profErr) throw profErr
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

      {showForm && (
        <div className="bg-white/95 rounded-2xl border border-violet-200 shadow-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">{editingId ? 'Edit Student' : 'New Student'}</h3>
            <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
              <X size={16} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">First Name</label>
              <input value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Last Name</label>
              <input value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Admission No</label>
              <input value={form.admission_no} onChange={e => setForm({ ...form, admission_no: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Programme Type</label>
              <select value={form.programme_type} onChange={e => setForm({ ...form, programme_type: e.target.value as ProgrammeType })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white">
                <option value="degree">Degree</option>
                <option value="ijmb">IJMB</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Matric Number</label>
              <input value={form.matric_number} onChange={e => setForm({ ...form, matric_number: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Department</label>
              <input value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
            <button onClick={handleSave} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 text-white text-xs font-bold hover:bg-violet-700">
              <Save size={14} /> Save
            </button>
          </div>
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
            {filtered.map((s) => {
              const prof = profileFor(s.id)
              const pType = studentProgrammeFor(s.id)
              const cgpa = cgpaFor(s.id)
              const ijmbPts = ijmbPointsFor(s.id)
              const ec = enrollCountFor(s.id)
              const rc = resultCountFor(s.id)
              return (
                <div key={s.id} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50/50 transition">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-violet-100 text-violet-700 font-bold text-xs flex items-center justify-center shrink-0">
                      {(s.first_name?.[0] || '') + (s.last_name?.[0] || '')}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-slate-900 truncate">
                          {[s.first_name, s.middle_name, s.last_name].filter(Boolean).join(' ')}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          pType === 'ijmb' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {pType === 'ijmb' ? 'IJMB' : 'Degree'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 truncate">
                        {s.admission_no}{prof?.matric_number ? ` · ${prof.matric_number}` : ''}{prof?.department ? ` · ${prof.department}` : ''}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs shrink-0">
                    <span className="hidden sm:inline text-slate-500">{ec} enr · {rc} res</span>
                    {pType === 'ijmb' ? (
                      ijmbPts !== null && (
                        <span className="px-2 py-0.5 rounded-full font-bold bg-amber-50 text-amber-800">
                          {ijmbPts} IJMB Pts
                        </span>
                      )
                    ) : (
                      cgpa !== null && (
                        <span className={`px-2 py-0.5 rounded-full font-bold ${(cgpa || 0) >= 2.4 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                          CGPA {Number(cgpa).toFixed(2)}
                        </span>
                      )
                    )}
                    <button onClick={() => openEditForm(s)} className="p-1.5 rounded-lg text-slate-400 hover:text-violet-700 hover:bg-violet-50" title="Edit">
                      <Edit3 size={14} />
                    </button>
                    <button onClick={() => handleDelete(s.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50" title="Delete">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
