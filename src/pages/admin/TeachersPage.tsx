import { BookOpen, Building2, ClipboardList, Download, GraduationCap, Mail, Pencil, Phone, Search, Trash2, Users } from 'lucide-react';

import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

const SUPABASE_URL = 'https://tcjsmkhmfjigutfhjtem.supabase.co'
const ANON_KEY = 'sb_publishable_zWDvjhEldcV8eutnlRypGA_LGpOUhkg'

interface Teacher {
  id: string
  first_name: string
  last_name: string
  staff_id: string
  gender: string
  email: string
  phone: string
  department: string
  qualification: string
  passport_url: string
  is_active: boolean
}

const PAGE_SIZE = 50

export default function TeachersPage() {
  const navigate = useNavigate()
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [classTeachers, setClassTeachers] = useState<Record<string, string>>({}) // class_teacher_id -> class name
  const [subjectAssignments, setSubjectAssignments] = useState<Record<string, number>>({}) // teacher_id -> count
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE)
  const [isExporting, setIsExporting] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  useEffect(() => {
    fetchTeachers()
  }, [])

  const fetchTeachers = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('smartedu_user') || '{}')
      const schoolId = user.id || user.school_id
      if (!schoolId) { setLoading(false); return }

      const headers = { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` }

      // Fetch teachers, classes, and class_subjects in parallel
      const [tchRes, clsRes, csRes] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/teachers?school_id=eq.${schoolId}&select=id,first_name,last_name,staff_id,gender,email,phone,department,qualification,passport_url,is_active&order=first_name.asc`, { headers }),
        fetch(`${SUPABASE_URL}/rest/v1/classes?school_id=eq.${schoolId}&select=id,name,section,class_teacher_id`, { headers }),
        fetch(`${SUPABASE_URL}/rest/v1/class_subjects?school_id=eq.${schoolId}&select=id,teacher_id`, { headers }),
      ])

      const tchData = await tchRes.json() || []
      const clsData = await clsRes.json() || []
      const csData = await csRes.json() || []

      // Build form teacher map (class_teacher_id -> class name)
      const formMap: Record<string, string> = {}
      clsData.forEach((c: any) => {
        if (c.class_teacher_id) {
          formMap[c.class_teacher_id] = `${c.name} - ${c.section || 'A'}`
        }
      })

      // Build subject assignment count (teacher_id -> count)
      const subMap: Record<string, number> = {}
      csData.forEach((cs: any) => {
        if (cs.teacher_id) {
          subMap[cs.teacher_id] = (subMap[cs.teacher_id] || 0) + 1
        }
      })

      setTeachers(tchData)
      setClassTeachers(formMap)
      setSubjectAssignments(subMap)
    } catch (err) {
      console.error('Error fetching teachers:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredTeachers = useMemo(() => {
    if (!searchQuery.trim()) return teachers
    const q = searchQuery.toLowerCase()
    return teachers.filter(t => {
      const first = (t.first_name || '').toLowerCase()
      const last = (t.last_name || '').toLowerCase()
      const staffId = (t.staff_id || '').toLowerCase()
      const email = (t.email || '').toLowerCase()
      const dept = (t.department || '').toLowerCase()
      return `${first} ${last}`.includes(q) || first.includes(q) || last.includes(q) || staffId.includes(q) || email.includes(q) || dept.includes(q)
    })
  }, [teachers, searchQuery])

  const displayedTeachers = useMemo(() => {
    if (filteredTeachers.length <= displayCount) return filteredTeachers
    return filteredTeachers.slice(0, displayCount)
  }, [filteredTeachers, displayCount])

  const hasMore = filteredTeachers.length > displayCount
  const total = teachers.length
  const formMasterCount = teachers.filter(t => classTeachers[t.id]).length
  const subjectTeacherCount = teachers.filter(t => (subjectAssignments[t.id] || 0) > 0).length

  const getName = (t: Teacher) => {
    const first = (t.first_name || '').trim()
    const last = (t.last_name || '').trim()
    if (first && last) return `${first} ${last}`
    return first || last || ''
  }

  const getStaffId = (t: Teacher) => (t.staff_id || t.id || '').toString()

  const exportCsv = async () => {
    if (filteredTeachers.length === 0) return
    setIsExporting(true)
    try {
      const headers = ['S/N', 'Staff ID', 'Full Name', 'Gender', 'Email', 'Phone', 'Department', 'Qualification', 'Role(s)']
      const rows = filteredTeachers.map((t, idx) => {
        const roles: string[] = []
        if (classTeachers[t.id]) roles.push('Form Teacher')
        const subCount = subjectAssignments[t.id] || 0
        if (subCount > 0) roles.push(`${subCount} Subject Teacher${subCount !== 1 ? 's' : ''}`)
        return [
          (idx + 1).toString(),
          getStaffId(t),
          getName(t),
          t.gender || '',
          t.email || '',
          t.phone || '',
          t.department || '',
          t.qualification || '',
          roles.length === 0 ? 'None' : roles.join(' / '),
        ]
      })
      const csv = [headers.join(','), ...rows.map(row => row.map(cell => {
        const val = String(cell)
        if (val.includes(',') || val.includes('"') || val.includes('\n')) return `"${val.replace(/"/g, '""')}"`
        return val
      }).join(','))].join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'teachers.csv'
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) { console.error('Export error:', err) } finally { setIsExporting(false) }
  }

  const deleteTeacher = async (id: string) => {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/teachers?id=eq.${id}`, { method: 'DELETE', headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` } })
      setTeachers(teachers.filter(t => t.id !== id))
      setDeleteConfirm(null)
    } catch (err) { console.error('Delete error:', err) }
  }

  const renderAvatar = (t: Teacher) => {
    const name = getName(t)
    const isFemale = (t.gender || '').toLowerCase() === 'female'
    const photo = (t.passport_url || '').trim()
    if (photo) return <img src={`${photo}?width=80&height=80`} alt={name} className="w-11 h-11 rounded-xl object-cover" />
    const initials = name.split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase()
    return <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-white text-sm font-bold ${isFemale ? 'bg-pink-400' : 'bg-blue-400'}`}>{initials || '?'}</div>
  }

  const Badge = ({ text, color, bg }: { text: string; color: string; bg: string }) => (
    <span className="px-2 py-0.5 rounded text-[11px] font-medium" style={{ color, backgroundColor: bg }}>{text}</span>
  )

  if (loading) return <div className="flex items-center justify-center h-full"><div className="w-8 h-8 border-3 border-[#1A237E] border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="p-6 bg-[#F7F8FA] min-h-full">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-11 h-11 bg-[#F0F4FF] rounded-xl flex items-center justify-center"><GraduationCap className="text-xl w-4 h-4" /></div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-800">Teachers</h1>
            <p className="text-xs text-gray-400 mt-0.5">{searchQuery ? `${filteredTeachers.length} of ${total} found` : `${total} registered`}</p>
          </div>
        </div>

        {/* Action chips */}
        <div className="flex flex-wrap gap-2">
          <button onClick={exportCsv} disabled={isExporting} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"><Download className="w-4 h-4 inline-block" /> {isExporting ? '...' : 'Export'}</button>
          <button onClick={() => setShowSearch(!showSearch)} className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-medium transition ${showSearch ? 'bg-[#1A237E] text-white border-[#1A237E]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}><Search className="w-4 h-4 inline-block" /> Search</button>
        </div>

        {showSearch && <div className="mt-3"><input type="text" value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setDisplayCount(PAGE_SIZE) }} autoFocus placeholder="Search by name, staff ID, email, or department..." className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1A237E] focus:border-transparent outline-none transition" /></div>}
      </div>

      {/* Stat cards (translated from Flutter: Total, Form Masters, Subject Teachers) */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center mb-2"><Users className="text-sm w-4 h-4" /></div>
          <p className="text-2xl font-bold text-gray-800">{total}</p>
          <p className="text-xs text-gray-500 mt-0.5">Total</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center mb-2"><GraduationCap className="text-sm w-4 h-4" /></div>
          <p className="text-2xl font-bold text-green-600">{formMasterCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">Form Masters</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="w-9 h-9 bg-orange-50 rounded-lg flex items-center justify-center mb-2"><BookOpen className="text-sm w-4 h-4" /></div>
          <p className="text-2xl font-bold text-orange-600">{subjectTeacherCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">Subject Teachers</p>
        </div>
      </div>

      {/* Teacher list */}
      {displayedTeachers.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-gray-100"><GraduationCap className="text-4xl mb-3 w-6 h-6" /><p className="text-gray-400 text-sm">{searchQuery ? 'No teachers found matching your search.' : 'No teachers registered yet.'}</p></div>
      ) : (
        <div className="space-y-2">
          {displayedTeachers.map((t, idx) => {
            const name = getName(t)
            const staffId = getStaffId(t)
            const email = (t.email || '').trim()
            const phone = (t.phone || '').trim()
            const dept = (t.department || '').trim()
            const qual = (t.qualification || '').trim()
            const isFormTeacher = !!classTeachers[t.id]
            const assignedCount = subjectAssignments[t.id] || 0

            return (
              <div key={t.id || idx} className={`p-4 rounded-xl border transition ${idx % 2 === 0 ? 'bg-white' : 'bg-[#FAFBFC]'} border-gray-200`}>
                {/* Top row: avatar + info + badges */}
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-400 w-6 text-center shrink-0">{idx + 1}</span>
                  {renderAvatar(t)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{name}</p>
                    <div className="flex flex-wrap gap-1.5 mt-1 items-center">
                      {staffId && <Badge text={`Staff ID: ${staffId}`} color="#1A237E" bg="#F0F4FF" />}
                      {email && <Badge text={`<Mail className="w-4 h-4 inline-block" /> ${email}`} color="#6B7280" bg="#F5F5F5" />}
                      {phone && <Badge text={`<Phone className="w-4 h-4 inline-block" /> ${phone}`} color="#6B7280" bg="#F5F5F5" />}
                    </div>
                  </div>
                  {/* Right side badges (Form Teacher + Subject count) */}
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {isFormTeacher && (
                      <span className="px-2 py-1 rounded-md bg-green-50 border border-green-200 text-[10px] font-semibold text-green-700 flex items-center gap-1">
                        <GraduationCap className="w-4 h-4 inline-block" /> Form Teacher
                      </span>
                    )}
                    {assignedCount > 0 && (
                      <span className="px-2 py-1 rounded-md bg-blue-50 border border-blue-200 text-[10px] font-semibold text-blue-700">
                        {assignedCount} Subject{assignedCount !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>

                {/* Department + Qualification (translated from Flutter) */}
                {(dept || qual) && (
                  <div className="flex items-center gap-2 mt-2 pl-[60px]">
                    {dept && <span className="text-[11px] text-gray-600 flex items-center gap-1"><Building2 className="w-4 h-4 inline-block" /> {dept}</span>}
                    {dept && qual && <span className="w-1 h-1 bg-gray-400 rounded-full" />}
                    {qual && <span className="text-[11px] text-gray-400 italic">{qual}</span>}
                  </div>
                )}

                {/* Action buttons (translated from Flutter _smallButton) */}
                <div className="flex justify-end gap-2 mt-3">
                  <button className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg text-xs font-medium text-indigo-700 hover:bg-indigo-100 transition"><Pencil className="w-4 h-4 inline-block" /> Edit</button>
                  <button onClick={() => setDeleteConfirm(t.id)} className="flex items-center gap-1 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg text-xs font-medium text-red-700 hover:bg-red-100 transition"><Trash2 className="w-4 h-4 inline-block" /> Delete</button>
                  <button className="flex items-center gap-1 px-3 py-1.5 bg-[#1A237E] border border-[#1A237E] rounded-lg text-xs font-medium text-white hover:bg-[#283593] transition"><ClipboardList className="w-4 h-4 inline-block" /> Assign</button>
                </div>
              </div>
            )
          })}
          {hasMore && <div className="text-center py-4"><button onClick={() => setDisplayCount(displayCount + PAGE_SIZE)} className="px-6 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition">Load More ({filteredTeachers.length - displayCount} remaining)</button></div>}
        </div>
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={() => setDeleteConfirm(null)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative bg-white rounded-2xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4"><div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center"><Trash2 className="text-xl w-4 h-4" /></div><div><h3 className="font-bold text-gray-800">Delete Teacher?</h3><p className="text-sm text-gray-500">This action cannot be undone.</p></div></div>
            <div className="flex gap-3"><button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition">Cancel</button><button onClick={() => deleteTeacher(deleteConfirm)} className="flex-1 py-2.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition">Delete</button></div>
          </div>
        </div>
      )}

      {/* Add teacher FAB */}
      <button onClick={() => navigate('/dashboard/schooladmin/teachers/add')} className="fixed bottom-6 right-6 w-14 h-14 bg-[#1A237E] text-white rounded-2xl shadow-lg flex items-center justify-center hover:bg-[#283593] hover:scale-105 transition z-40"><span className="text-2xl">+</span></button>
    </div>
  )
}
