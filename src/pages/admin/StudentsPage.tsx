import { Download, Eye, GraduationCap, Pencil, RefreshCw, Search, Trash2, TrendingUp, Users } from 'lucide-react';

import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

const SUPABASE_URL = 'https://tcjsmkhmfjigutfhjtem.supabase.co'
const ANON_KEY = 'sb_publishable_zWDvjhEldcV8eutnlRypGA_LGpOUhkg'

interface Student {
  id: string
  first_name: string
  last_name: string
  admission_no: string
  gender: string
  class_id: string | null
  class_name?: string
  section?: string
  parent_name: string
  parent_phone: string
  passport_url: string
}

const PAGE_SIZE = 50

export default function StudentsPage() {
  const navigate = useNavigate()
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE)
  const [isExporting, setIsExporting] = useState(false)

  // Fetch students from Supabase
  useEffect(() => {
    fetchStudents()
  }, [])

  const fetchStudents = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('smartedu_user') || '{}')
      const schoolId = user.id || user.school_id || user.schoolId
      if (!schoolId) {
        setLoading(false)
        return
      }

      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/students?school_id=eq.${schoolId}&select=id,first_name,last_name,admission_no,gender,class_id,parent_name,parent_phone,passport_url&order=first_name.asc`,
        {
          headers: {
            apikey: ANON_KEY,
            Authorization: `Bearer ${ANON_KEY}`,
          },
        }
      )
      const data = await res.json()
      setStudents(data || [])
    } catch (err) {
      console.error('Error fetching students:', err)
    } finally {
      setLoading(false)
    }
  }

  // Filtered students (translated from Flutter _filteredStudents)
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students
    const q = searchQuery.toLowerCase()
    return students.filter(s => {
      const first = (s.first_name || '').trim().toLowerCase()
      const last = (s.last_name || '').trim().toLowerCase()
      const admNo = (s.admission_no || '').trim().toLowerCase()
      const parent = (s.parent_name || '').trim().toLowerCase()
      return `${first} ${last}`.includes(q) || first.includes(q) || last.includes(q) || admNo.includes(q) || parent.includes(q)
    })
  }, [students, searchQuery])

  // Displayed students (pagination - translated from Flutter _displayedStudents)
  const displayedStudents = useMemo(() => {
    if (filteredStudents.length <= displayCount) return filteredStudents
    return filteredStudents.slice(0, displayCount)
  }, [filteredStudents, displayCount])

  const hasMore = filteredStudents.length > displayCount
  const total = students.length
  const assigned = students.filter(s => s.class_id).length
  const unassigned = total - assigned

  // Helper functions (translated from Flutter)
  const getName = (s: Student) => {
    const first = (s.first_name || '').trim()
    const last = (s.last_name || '').trim()
    if (first && last) return `${first} ${last}`
    if (first) return first
    if (last) return last
    return ''
  }

  const getStudentId = (s: Student) => {
    return (s.admission_no || s.id || '').toString()
  }

  // CSV export (translated from Flutter _exportCsv)
  const exportCsv = async () => {
    if (filteredStudents.length === 0) return
    setIsExporting(true)
    try {
      const headers = ['S/N', 'Admission No', 'Full Name', 'Gender', 'Class', 'Parent Name', 'Parent Phone']
      const rows = filteredStudents.map((s, idx) => [
        (idx + 1).toString(),
        getStudentId(s),
        getName(s),
        s.gender || '',
        s.class_name || '',
        s.parent_name || '',
        s.parent_phone || '',
      ])
      
      const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => {
          const val = String(cell)
          if (val.includes(',') || val.includes('"') || val.includes('\n')) {
            return `"${val.replace(/"/g, '""')}"`
          }
          return val
        }).join(','))
      ].join('\n')

      // Download CSV
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'students.csv'
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export error:', err)
    } finally {
      setIsExporting(false)
    }
  }

  // Delete student (translated from Flutter onDelete)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  
  const deleteStudent = async (id: string) => {
    try {
      await fetch(
        `${SUPABASE_URL}/rest/v1/students?id=eq.${id}`,
        {
          method: 'DELETE',
          headers: {
            apikey: ANON_KEY,
            Authorization: `Bearer ${ANON_KEY}`,
          },
        }
      )
      setStudents(students.filter(s => s.id !== id))
      setDeleteConfirm(null)
    } catch (err) {
      console.error('Delete error:', err)
    }
  }

  // Avatar builder (translated from Flutter _buildStudentAvatar)
  const renderAvatar = (s: Student) => {
    const name = getName(s)
    const isFemale = (s.gender || '').toLowerCase() === 'female'
    const photo = (s.passport_url || '').trim()
    
    if (photo) {
      return (
        <img
          src={`${photo}?width=80&height=80`}
          alt={name}
          className="w-11 h-11 rounded-xl object-cover"
        />
      )
    }
    
    const initials = name.split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase()
    return (
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-white text-sm font-bold ${isFemale ? 'bg-pink-400' : 'bg-blue-400'}`}>
        {initials || '?'}
      </div>
    )
  }

  // Badge (translated from Flutter _badge)
  const Badge = ({ text, color, bg }: { text: string; color: string; bg: string }) => (
    <span
      className="px-2 py-0.5 rounded text-[11px] font-medium"
      style={{ color, backgroundColor: bg }}
    >
      {text}
    </span>
  )

  // Highlight search text (translated from Flutter _buildHighlightedName)
  const renderHighlightedName = (name: string) => {
    if (!searchQuery || !name) return <span className="text-sm font-semibold text-gray-800">{name}</span>
    const idx = name.toLowerCase().indexOf(searchQuery.toLowerCase())
    if (idx === -1) return <span className="text-sm font-semibold text-gray-800">{name}</span>
    return (
      <span className="text-sm font-semibold text-gray-800">
        {name.substring(0, idx)}
        <mark className="bg-[#E8EAF6] text-[#1A237E] font-bold rounded px-0.5">
          {name.substring(idx, idx + searchQuery.length)}
        </mark>
        {name.substring(idx + searchQuery.length)}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-3 border-[#1A237E] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 bg-[#F7F8FA] min-h-full">
      {/* Header (translated from Flutter _buildHeader) */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-11 h-11 bg-[#F0F4FF] rounded-xl flex items-center justify-center">
            <GraduationCap className="text-xl w-4 h-4" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-800">Students</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {searchQuery ? `${filteredStudents.length} of ${total} found` : `${total} registered`}
            </p>
          </div>
        </div>

        {/* Action chips (translated from Flutter _actionChip) */}
        <div className="flex flex-wrap gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 transition">
            <TrendingUp className="w-4 h-4 inline-block" /> Promote
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 transition">
            <RefreshCw className="w-4 h-4 inline-block" /> Auto-Promote
          </button>
          <button
            onClick={exportCsv}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"
          >
            <Download className="w-4 h-4 inline-block" /> {isExporting ? '...' : 'Export'}
          </button>
          <button
            onClick={() => setShowSearch(!showSearch)}
            className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-medium transition ${
              showSearch
                ? 'bg-[#1A237E] text-white border-[#1A237E]'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            <Search className="w-4 h-4 inline-block" /> Search
          </button>
        </div>

        {/* Search input (translated from Flutter search bar) */}
        {showSearch && (
          <div className="mt-3">
            <input
              type="text"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setDisplayCount(PAGE_SIZE) }}
              autoFocus
              placeholder="Search by name, admission no, or parent name..."
              className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1A237E] focus:border-transparent outline-none transition"
            />
          </div>
        )}
      </div>

      {/* Stat cards (translated from Flutter stat cards) */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-2xl font-bold text-gray-800">{total}</p>
          <p className="text-xs text-gray-500 mt-1">Total</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-2xl font-bold text-green-600">{assigned}</p>
          <p className="text-xs text-gray-500 mt-1">Assigned</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-2xl font-bold text-orange-500">{unassigned}</p>
          <p className="text-xs text-gray-500 mt-1">Unassigned</p>
        </div>
      </div>

      {/* Student list (translated from Flutter _studentCard) */}
      {displayedStudents.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-gray-100">
          <Users className="text-4xl mb-3 w-6 h-6" />
          <p className="text-gray-400 text-sm">
            {searchQuery ? 'No students found matching your search.' : 'No students registered yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayedStudents.map((s, idx) => {
            const name = getName(s)
            const admNo = getStudentId(s)
            const parent = (s.parent_name || '').trim()
            const isFemale = (s.gender || '').toLowerCase() === 'female'

            return (
              <div
                key={s.id || idx}
                className={`flex items-center gap-3 p-3.5 rounded-xl border transition cursor-pointer hover:shadow-sm ${
                  idx % 2 === 0 ? 'bg-white' : 'bg-[#FAFBFC]'
                } border-gray-200`}
              >
                {/* Serial Number */}
                <span className="text-xs font-bold text-gray-400 w-6 text-center shrink-0">
                  {idx + 1}
                </span>
                {/* Avatar */}
                {renderAvatar(s)}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  {renderHighlightedName(name)}
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {admNo && (
                      <Badge text={admNo} color="#1A237E" bg="#F0F4FF" />
                    )}
                    {parent && (
                      <Badge text={parent} color="#6B7280" bg="#F5F5F5" />
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <button
                  className="w-8 h-8 rounded-lg border border-[#C5CAE9] bg-[#F0F4FF] flex items-center justify-center hover:bg-[#E8EAF6] transition"
                  title="Edit"
                >
                  <Pencil className="text-xs w-4 h-4" />
                </button>
                {s.class_id && (
                  <button
                    className="w-8 h-8 rounded-lg border border-green-300 bg-green-50 flex items-center justify-center hover:bg-green-100 transition"
                    title="View Results"
                  >
                    <Eye className="text-xs w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setDeleteConfirm(s.id)}
                  className="w-8 h-8 rounded-lg border border-red-300 bg-red-50 flex items-center justify-center hover:bg-red-100 transition"
                  title="Delete"
                >
                  <Trash2 className="text-xs w-4 h-4" />
                </button>
              </div>
            )
          })}

          {/* Load more button (translated from Flutter "Load More") */}
          {hasMore && (
            <div className="text-center py-4">
              <button
                onClick={() => setDisplayCount(displayCount + PAGE_SIZE)}
                className="px-6 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition"
              >
                Load More ({filteredStudents.length - displayCount} remaining)
              </button>
            </div>
          )}
        </div>
      )}

      {/* Delete confirmation dialog (translated from Flutter) */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={() => setDeleteConfirm(null)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative bg-white rounded-2xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="text-xl w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-gray-800">Delete Student?</h3>
                <p className="text-sm text-gray-500">This action cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteStudent(deleteConfirm)}
                className="flex-1 py-2.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add student FAB (translated from Flutter FloatingActionButton) */}
      <button
        onClick={() => navigate('/dashboard/schooladmin/students/add')}
        className="fixed bottom-6 right-6 w-14 h-14 bg-[#1A237E] text-white rounded-2xl shadow-lg flex items-center justify-center hover:bg-[#283593] hover:scale-105 transition z-40"
      >
        <span className="text-2xl">+</span>
      </button>
    </div>
  )
}
