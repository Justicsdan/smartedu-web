import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Download, Eye, GraduationCap, Pencil, RefreshCw, Search, Trash2, TrendingUp, Users, Loader2, AlertCircle, CheckCircle } from 'lucide-react'

interface Student {
  id: string
  first_name: string
  last_name: string
  middle_name?: string | null
  admission_no: string
  gender: string | null
  class_id: string | null
  date_of_birth: string | null
  school_level: string | null
  passport_url: string | null
  class_name?: string
  section?: string
}

const PAGE_SIZE = 50

function studentName(s: Student): string {
  return [s.first_name, s.middle_name, s.last_name].filter(Boolean).join(' ').trim()
}

export default function StudentsPage() {
  const { user } = useAuth()
  const schoolId = user?.id || ''

  const [students, setStudents] = useState<Student[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE)
  const [isExporting, setIsExporting] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  useEffect(() => {
    if (!schoolId) return
    ;(async () => {
      setLoading(true)
      try {
        const [sRes, cRes] = await Promise.all([
          supabase.from('students')
            .select('id, first_name, last_name, middle_name, admission_no, gender, class_id, date_of_birth, school_level, passport_url')
            .eq('school_id', schoolId)
            .order('first_name'),
          supabase.from('classes')
            .select('id, name, section')
            .eq('school_id', schoolId)
            .order('name'),
        ])
        if (sRes.error) throw sRes.error
        if (cRes.error) throw cRes.error
        setStudents((sRes.data || []) as Student[])
        setClasses(cRes.data || [])
      } catch (e: any) {
        setError(e.message || 'Failed to load students')
      } finally {
        setLoading(false)
      }
    })()
  }, [schoolId])

  const classMap = useMemo(() => {
    const m: Record<string, any> = {}
    for (const c of classes) m[c.id] = c
    return m
  }, [classes])

  const studentsWithClass = useMemo(() => students.map(s => ({
    ...s,
    class_name: s.class_id ? classMap[s.class_id]?.name : undefined,
    section: s.class_id ? classMap[s.class_id]?.section : undefined,
  })), [students, classMap])

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return studentsWithClass
    const q = searchQuery.toLowerCase()
    return studentsWithClass.filter(s => {
      const name = studentName(s).toLowerCase()
      const adm = (s.admission_no || '').toLowerCase()
      return name.includes(q) || adm.includes(q)
    })
  }, [studentsWithClass, searchQuery])

  const displayedStudents = useMemo(() => filteredStudents.slice(0, displayCount), [filteredStudents, displayCount])

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('students').delete().eq('id', id)
      if (error) throw error
      setStudents(prev => prev.filter(s => s.id !== id))
      setDeleteConfirm(null)
      setSuccessMsg('Student deleted')
    } catch (e: any) {
      setError(e.message || 'Delete failed')
    }
  }

  const exportCsv = async () => {
    setIsExporting(true)
    try {
      const headers = ['Admission No', 'First Name', 'Last Name', 'Gender', 'Class', 'Section']
      const rows = filteredStudents.map(s => [
        s.admission_no || '',
        s.first_name || '',
        s.last_name || '',
        s.gender || '',
        s.class_name || '',
        s.section || '',
      ])
      const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `students_${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      setSuccessMsg(`Exported ${rows.length} students`)
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
          <h1 className="text-2xl font-bold text-gray-800">Students</h1>
          <p className="text-sm text-gray-500 mt-1">{students.length} students registered</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowSearch(!showSearch)} className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-medium transition ${showSearch ? 'bg-[#1A237E] text-white border-[#1A237E]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
            <Search className="w-3.5 h-3.5" /> Search
          </button>
          <button onClick={exportCsv} disabled={isExporting} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 transition disabled:opacity-50">
            <Download className="w-3.5 h-3.5" /> {isExporting ? 'Exporting...' : 'Export'}
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

      {showSearch && (
        <div className="bg-white rounded-xl border border-gray-100 p-3">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              autoFocus
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by name or admission number..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30"
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center"><Users className="w-5 h-5 text-blue-600" /></div>
          <div>
            <p className="text-xs text-gray-500">Total Students</p>
            <p className="text-lg font-bold text-gray-800">{students.length}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center"><GraduationCap className="w-5 h-5 text-green-600" /></div>
          <div>
            <p className="text-xs text-gray-500">With Class</p>
            <p className="text-lg font-bold text-gray-800">{students.filter(s => s.class_id).length}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center"><TrendingUp className="w-5 h-5 text-orange-600" /></div>
          <div>
            <p className="text-xs text-gray-500">Filtered</p>
            <p className="text-lg font-bold text-gray-800">{filteredStudents.length}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">#</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Student</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Admission No</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Gender</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Class</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayedStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center">
                    <div className="w-16 h-16 mx-auto bg-gray-50 rounded-full flex items-center justify-center mb-3"><Users className="w-8 h-8 text-gray-300" /></div>
                    <p className="text-gray-400 text-sm">{searchQuery ? 'No students match your search.' : 'No students registered yet.'}</p>
                  </td>
                </tr>
              ) : (
                displayedStudents.map((s, i) => (
                  <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-sm text-gray-400">{i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 overflow-hidden">
                          {s.passport_url ? <img src={s.passport_url} alt={studentName(s)} className="w-full h-full object-cover" /> : (s.first_name?.charAt(0) || '?')}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800">{studentName(s)}</p>
                          <p className="text-xs text-gray-400">{s.school_level || '-'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{s.admission_no || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{s.gender || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {s.class_name ? `${s.class_name}${s.section ? ` (${s.section})` : ''}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition" title="View"><Eye className="w-3.5 h-3.5" /></button>
                        <button className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setDeleteConfirm(s.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {displayCount < filteredStudents.length && (
          <div className="p-3 border-t border-gray-100 text-center">
            <button onClick={() => setDisplayCount(c => c + PAGE_SIZE)} className="px-4 py-2 text-xs font-medium text-[#1A237E] hover:bg-indigo-50 rounded-lg transition">
              Load more ({filteredStudents.length - displayCount} remaining)
            </button>
          </div>
        )}
      </div>

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0"><Trash2 className="w-5 h-5 text-red-600" /></div>
              <div>
                <h3 className="font-bold text-gray-800">Delete Student?</h3>
                <p className="text-sm text-gray-500 mt-1">This will permanently remove the student record. This cannot be undone.</p>
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
