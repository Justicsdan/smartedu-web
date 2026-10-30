import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Download, Pencil, Search, Trash2, Users, GraduationCap, BookOpen, Loader2, AlertCircle, CheckCircle, ClipboardList } from 'lucide-react'

interface Teacher {
  id: string
  first_name: string
  last_name: string
  staff_id: string
  gender: string | null
  email: string | null
  phone: string | null
  department: string | null
  qualification: string | null
  passport_url: string | null
  is_active: boolean
}

function teacherName(t: Teacher): string {
  return `${t.first_name ?? ''} ${t.last_name ?? ''}`.trim()
}

export default function TeachersPage() {
  const { user } = useAuth()
  const schoolId = user?.id || ''

  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [classSubjects, setClassSubjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  useEffect(() => {
    if (!schoolId) return
    ;(async () => {
      setLoading(true)
      try {
        const [tRes, cRes, csRes] = await Promise.all([
          supabase.from('teachers')
            .select('id, first_name, last_name, staff_id, gender, email, phone, department, qualification, passport_url, is_active')
            .eq('school_id', schoolId)
            .order('first_name'),
          supabase.from('classes')
            .select('id, name, section, class_teacher_id')
            .eq('school_id', schoolId)
            .order('name'),
          supabase.from('class_subjects')
            .select('id, teacher_id, class_id, subject_id')
            .eq('school_id', schoolId),
        ])
        if (tRes.error) throw tRes.error
        if (cRes.error) throw cRes.error
        if (csRes.error) throw csRes.error
        setTeachers((tRes.data || []) as Teacher[])
        setClasses(cRes.data || [])
        setClassSubjects(csRes.data || [])
      } catch (e: any) {
        setError(e.message || 'Failed to load teachers')
      } finally {
        setLoading(false)
      }
    })()
  }, [schoolId])

  const teacherStats = useMemo(() => {
    const formTeacherCount = classes.filter(c => c.class_teacher_id).length
    const subjectAssignCount = classSubjects.filter(cs => cs.teacher_id).length
    return {
      total: teachers.length,
      active: teachers.filter(t => t.is_active).length,
      formTeachers: formTeacherCount,
      subjectAssigns: subjectAssignCount,
    }
  }, [teachers, classes, classSubjects])

  const formTeacherClass = (teacherId: string) => classes.find(c => c.class_teacher_id === teacherId)
  const assignmentCount = (teacherId: string) => classSubjects.filter(cs => cs.teacher_id === teacherId).length

  const filteredTeachers = useMemo(() => {
    if (!searchQuery.trim()) return teachers
    const q = searchQuery.toLowerCase()
    return teachers.filter(t => {
      const name = teacherName(t).toLowerCase()
      const email = (t.email || '').toLowerCase()
      const staff = (t.staff_id || '').toLowerCase()
      const dept = (t.department || '').toLowerCase()
      return name.includes(q) || email.includes(q) || staff.includes(q) || dept.includes(q)
    })
  }, [teachers, searchQuery])

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('teachers').delete().eq('id', id)
      if (error) throw error
      setTeachers(prev => prev.filter(t => t.id !== id))
      setDeleteConfirm(null)
      setSuccessMsg('Teacher deleted')
    } catch (e: any) {
      setError(e.message || 'Delete failed')
    }
  }

  const exportCsv = async () => {
    setIsExporting(true)
    try {
      const headers = ['Staff ID', 'First Name', 'Last Name', 'Gender', 'Email', 'Phone', 'Department', 'Qualification']
      const rows = filteredTeachers.map(t => [t.staff_id, t.first_name, t.last_name, t.gender, t.email, t.phone, t.department, t.qualification])
      const csv = [headers, ...rows].map(r => r.map(c => `"${String(c || '').replace(/"/g, '""')}"`).join(',')).join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `teachers_${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      setSuccessMsg(`Exported ${rows.length} teachers`)
    } catch (e: any) {
      setError(e.message || 'Export failed')
    } finally {
      setIsExporting(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-[#1A237E] animate-spin" /></div>
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Teachers</h1>
          <p className="text-sm text-gray-500 mt-1">{teachers.length} teachers registered</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCsv} disabled={isExporting} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 transition disabled:opacity-50">
            <Download className="w-3.5 h-3.5" /> {isExporting ? 'Exporting...' : 'Export'}
          </button>
          <button onClick={() => setShowSearch(!showSearch)} className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-medium transition ${showSearch ? 'bg-[#1A237E] text-white border-[#1A237E]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
            <Search className="w-3.5 h-3.5" /> Search
          </button>
        </div>
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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center"><Users className="w-5 h-5 text-blue-600" /></div>
          <div><p className="text-xs text-gray-500">Total</p><p className="text-lg font-bold text-gray-800">{teacherStats.total}</p></div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center"><GraduationCap className="w-5 h-5 text-green-600" /></div>
          <div><p className="text-xs text-gray-500">Active</p><p className="text-lg font-bold text-gray-800">{teacherStats.active}</p></div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center"><BookOpen className="w-5 h-5 text-orange-600" /></div>
          <div><p className="text-xs text-gray-500">Form Teachers</p><p className="text-lg font-bold text-gray-800">{teacherStats.formTeachers}</p></div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center"><ClipboardList className="w-5 h-5 text-purple-600" /></div>
          <div><p className="text-xs text-gray-500">Subject Assigns</p><p className="text-lg font-bold text-gray-800">{teacherStats.subjectAssigns}</p></div>
        </div>
      </div>

      {showSearch && (
        <div className="bg-white rounded-xl border border-gray-100 p-3">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              autoFocus
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, staff ID, or department..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30"
            />
          </div>
        </div>
      )}

      {filteredTeachers.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <div className="w-16 h-16 mx-auto bg-gray-50 rounded-full flex items-center justify-center mb-3"><GraduationCap className="w-8 h-8 text-gray-300" /></div>
          <p className="text-gray-400 text-sm">{searchQuery ? 'No teachers match your search.' : 'No teachers registered yet.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredTeachers.map(t => {
            const ftClass = formTeacherClass(t.id)
            const assigns = assignmentCount(t.id)
            return (
              <div key={t.id} className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white text-lg font-semibold flex-shrink-0 overflow-hidden">
                    {t.passport_url ? <img src={t.passport_url} alt={teacherName(t)} className="w-full h-full object-cover" /> : (t.first_name?.charAt(0) || '?')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{teacherName(t)}</p>
                    <p className="text-xs text-gray-400">{t.staff_id || '-'}</p>
                    {t.email && <p className="text-xs text-gray-500 truncate">{t.email}</p>}
                    {t.phone && <p className="text-xs text-gray-500">{t.phone}</p>}
                  </div>
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${t.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {t.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="mt-3 space-y-1">
                  {t.department && <p className="text-[11px] text-gray-600 flex items-center gap-1"><BookOpen className="w-3 h-3" /> {t.department}</p>}
                  {t.qualification && <p className="text-[11px] text-gray-500">{t.qualification}</p>}
                  {ftClass && <p className="text-[11px] text-indigo-600 flex items-center gap-1"><GraduationCap className="w-3 h-3" /> Form Teacher: {ftClass.name}</p>}
                  {assigns > 0 && <p className="text-[11px] text-purple-600 flex items-center gap-1"><ClipboardList className="w-3 h-3" /> {assigns} subject assignment{assigns > 1 ? 's' : ''}</p>}
                </div>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                  <button className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg text-xs font-medium text-indigo-700 hover:bg-indigo-100 transition">
                    <Pencil className="w-3 h-3" /> Edit
                  </button>
                  <button onClick={() => setDeleteConfirm(t.id)} className="flex items-center gap-1 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg text-xs font-medium text-red-700 hover:bg-red-100 transition ml-auto">
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0"><Trash2 className="w-5 h-5 text-red-600" /></div>
              <div>
                <h3 className="font-bold text-gray-800">Delete Teacher?</h3>
                <p className="text-sm text-gray-500 mt-1">This will permanently remove the teacher record. This cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 py-2.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
