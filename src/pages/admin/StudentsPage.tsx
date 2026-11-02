import { useState, useEffect, useMemo } from "react"
import { dbProxy } from "../../lib/dbProxy"
import { useAuth } from "../../contexts/AuthContext"
import {
  School, Search, Download, TrendingUp, RefreshCw, UserPlus,
  Edit, Eye, Trash2, X, ChevronDown, Users, CheckCircle2,
  UserX, ArrowUp, ArrowDown, User, AlertTriangle, Loader2, AlertCircle,
} from 'lucide-react'
import StudentEditModal from '../../components/admin/StudentEditModal'
import AddStudentModal from '../../components/admin/AddStudentModal'
import StudentResultsModal from '../../components/admin/StudentResultsModal'

interface Student {
  id: string; school_id: string; class_id: string | null; admission_no: string
  first_name: string; middle_name: string | null; last_name: string
  gender: string | null; passport_url: string | null; parent_name: string | null
  parent_phone: string | null; parent_email: string | null; parent_occupation: string | null
  home_address: string | null; date_of_birth: string | null; school_level: string | null
  sport_team: string | null; club_society: string | null
  class?: { name: string; section: string | null } | null
  [key: string]: any
}

interface SchoolClass {
  id: string; name: string; section: string | null; tier: string | null
  student_count: number; next_class_id: string | null
}

const PAGE_SIZE = 50

export default function StudentsPage() {
  const { user } = useAuth()
  const schoolId = user?.id

  const [students, setStudents] = useState<Student[]>([])
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE)
  const [exporting, setExporting] = useState(false)
  const [autoPromoting, setAutoPromoting] = useState(false)
  const [editStudent, setEditStudent] = useState<Student | null>(null)
  const [showAddStudent, setShowAddStudent] = useState(false)
  const [viewResultsStudent, setViewResultsStudent] = useState<Student | null>(null)
  const [showPromote, setShowPromote] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null)

  const loadStudents = async () => {
    if (!schoolId) return
    setLoading(true); setError(null)
    try {
      // Plain select — no FK joins (class info stitched from classes array)
      const { data, error: err } = await dbProxy
        .from('students')
        .select('*')
        .eq('school_id', schoolId)
        .order('first_name', { ascending: true })
      if (err) throw err
      setStudents((data || []) as unknown as Student[])
    } catch (e: any) {
      setError(e.message || 'Failed to load students')
    } finally {
      setLoading(false)
    }
  }

  const loadClasses = async () => {
    if (!schoolId) return
    try {
      const { data, error: err } = await dbProxy
        .from('classes')
        .select('id, name, section, tier, student_count, next_class_id')
        .eq('school_id', schoolId)
        .order('name', { ascending: true })
      if (err) throw err
      setClasses((data || []) as SchoolClass[])
    } catch (e: any) {
      console.error('Failed to load classes:', e.message)
    }
  }

  useEffect(() => {
    loadStudents(); loadClasses()
  }, [schoolId])

  // Stitch class info into students
  const studentsWithClass = useMemo(() => {
    const classMap: Record<string, SchoolClass> = {}
    classes.forEach((c) => { classMap[c.id] = c })
    return students.map((s) => {
      const cls = s.class_id ? classMap[s.class_id] : null
      return {
        ...s,
        class: cls ? { name: cls.name, section: cls.section } : null,
      }
    })
  }, [students, classes])

  const getStudentName = (s: Student) => {
    const f = (s.first_name || '').trim()
    const l = (s.last_name || '').trim()
    if (f && l) return f + ' ' + l
    return f || l || ''
  }

  const getClassInfo = (s: Student) => {
    if (!s.class) return ''
    const n = s.class.name || ''
    const sec = s.class.section || ''
    if (n && sec) return n + ' - ' + sec
    return n
  }

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return studentsWithClass
    const q = searchQuery.toLowerCase()
    return studentsWithClass.filter((s) => {
      const f = (s.first_name || '').toLowerCase()
      const l = (s.last_name || '').toLowerCase()
      const a = (s.admission_no || '').toLowerCase()
      const p = (s.parent_name || '').toLowerCase()
      return (f + ' ' + l).includes(q) || f.includes(q) || l.includes(q) || a.includes(q) || p.includes(q)
    })
  }, [studentsWithClass, searchQuery])

  const displayed = filtered.slice(0, displayCount)
  const hasMore = filtered.length > displayCount
  const total = studentsWithClass.length
  const unassigned = studentsWithClass.filter((s) => !s.class_id).length
  const assigned = total - unassigned

  const csvEscape = (v: string) => {
    if (v.includes(',') || v.includes('"') || v.includes('\n')) return '"' + v.replace(/"/g, '""') + '"'
    return v
  }

  const exportCsv = async () => {
    if (filtered.length === 0) return
    setExporting(true)
    try {
      const lines = ['Admission No,Full Name,Gender,Class,Parent Name,Parent Phone']
      for (const s of filtered) {
        lines.push([
          csvEscape(s.admission_no || ''), csvEscape(getStudentName(s)),
          csvEscape(s.gender || ''), csvEscape(getClassInfo(s)),
          csvEscape(s.parent_name || ''), csvEscape(s.parent_phone || ''),
        ].join(','))
      }
      const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = 'students.csv'; a.click()
      URL.revokeObjectURL(url)
    } catch (e: any) {
      alert('Export failed: ' + e.message)
    } finally {
      setExporting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      const { error: err } = await dbProxy.from('students').delete().eq('id', deleteTarget.id)
      if (err) throw err
      setDeleteTarget(null); await loadStudents()
    } catch (e: any) {
      alert('Delete failed: ' + e.message)
    }
  }

  const handleAutoPromote = async () => {
    if (!schoolId) return
    const { data: sess } = await dbProxy.from('academic_sessions').select('id').eq('school_id', schoolId).eq('is_current', true).maybeSingle()
    if (!sess) { alert('No active session found.'); return }
    const { data: term } = await dbProxy.from('terms').select('id').eq('school_id', schoolId).eq('session_id', sess.id).eq('is_current', true).maybeSingle()
    if (!term) { alert('No active term found.'); return }
    const { data: settings } = await dbProxy.from('school_settings').select('promote_threshold').eq('school_id', schoolId).maybeSingle()
    const threshold = settings?.promote_threshold ?? 50
    const classMap = new Map(classes.map((c) => [c.id, c.next_class_id]))
    const { data: summaries, error: sumErr } = await dbProxy.from('student_term_summaries').select('student_id, average_score').eq('school_id', schoolId).eq('session_id', sess.id).eq('term_id', term.id)
    if (sumErr) throw sumErr
    const summaryMap = new Map((summaries || []).map((s: any) => [s.student_id, s.average_score]))
    const updates: { id: string; class_id?: string | null; graduation_status?: string }[] = []
    for (const student of studentsWithClass) {
      if (!student.class_id) continue
      const avg = summaryMap.get(student.id)
      if (avg === undefined || avg === null) continue
      const nextClassId = classMap.get(student.class_id)
      if (avg >= threshold) {
        if (nextClassId) updates.push({ id: student.id, class_id: nextClassId })
        else updates.push({ id: student.id, class_id: null, graduation_status: 'graduated' })
      }
    }
    if (updates.length === 0) { alert('No students are eligible for promotion.'); setAutoPromoting(false); return }
    const promoteBatch = updates.filter((u) => u.class_id)
    const graduateBatch = updates.filter((u) => u.graduation_status === 'graduated')
    for (const u of promoteBatch) { await dbProxy.from('students').update({ class_id: u.class_id }).eq('id', u.id) }
    for (const u of graduateBatch) { await dbProxy.from('students').update({ class_id: null, graduation_status: 'graduated' }).eq('id', u.id) }
    alert('Auto-promotion complete! ' + updates.length + ' students processed.')
    setAutoPromoting(false); await loadStudents()
  }

  const confirmAutoPromote = () => {
    if (!window.confirm('This will automatically promote all eligible students to their next class.\n\nFinal year students who passed will be graduated.\n\nStudents who scored below the threshold will be held back.\n\nProceed?')) return
    setAutoPromoting(true)
    handleAutoPromote().catch((e) => { alert('Auto-promotion failed: ' + e.message); setAutoPromoting(false) })
  }

  const highlightName = (text: string) => {
    if (!searchQuery.trim() || !text) return text || 'Unknown'
    const q = searchQuery.toLowerCase()
    const idx = text.toLowerCase().indexOf(q)
    if (idx === -1) return text
    return (<>{text.substring(0, idx)}<mark className="bg-indigo-100 text-indigo-900 font-bold rounded px-0.5">{text.substring(idx, idx + q.length)}</mark>{text.substring(idx + q.length)}</>)
  }

  const Avatar = ({ s }: { s: Student }) => {
    const isFemale = (s.gender || '').toLowerCase() === 'female'
    const url = (s.passport_url || '').trim()
    return (
      <div className={'flex-shrink-0 w-11 h-11 rounded-full p-0.5 ' + (isFemale ? 'bg-pink-50' : 'bg-blue-50')}>
        {url ? (
          <img src={url + '?width=80&height=80'} alt="" className="w-full h-full rounded-full object-cover bg-gray-100"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
        ) : (
          <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
            <User size={18} className={isFemale ? 'text-pink-600' : 'text-blue-700'} />
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-slate-600">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          <span className="text-sm font-medium">Loading students…</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center text-red-600 mb-4">
          <AlertTriangle size={28} strokeWidth={2} />
        </div>
        <p className="text-slate-700 font-semibold mb-2">Failed to load</p>
        <p className="text-slate-500 text-sm mb-4">{error}</p>
        <button onClick={loadStudents} className="px-4 py-2 bg-slate-900 text-white rounded-lg font-semibold text-sm">Retry</button>
      </div>
    )
  }

  return (
    <div className="px-3 sm:px-4 lg:px-6 py-4 sm:py-6 max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700">
            <School size={22} strokeWidth={2.2} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Students</h1>
            <p className="text-sm text-slate-500">{searchQuery ? filtered.length + ' of ' + total + ' found' : total + ' registered'}</p>
          </div>
        </div>
        <button onClick={() => setShowAddStudent(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold shadow-sm transition">
          <UserPlus size={14} strokeWidth={2.4} />Add New
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Users, label: 'Total', value: total, color: '#6366F1', bg: '#EEF2FF' },
          { icon: CheckCircle2, label: 'Assigned', value: assigned, color: '#10B981', bg: '#ECFDF5' },
          { icon: UserX, label: 'Unassigned', value: unassigned, color: '#F59E0B', bg: '#FFFBEB' },
        ].map((s) => {
          const Icon = s.icon
          return (
            <div key={s.label} className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 sm:p-4">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-2.5" style={{ backgroundColor: s.bg, color: s.color }}>
                <Icon size={16} strokeWidth={2.2} />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{s.value}</div>
              <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">{s.label}</div>
            </div>
          )
        })}
      </div>

      {/* Action bar + search */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 flex items-center gap-2 flex-wrap">
          <button onClick={() => setShowPromote(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-semibold transition">
            <TrendingUp size={13} strokeWidth={2.2} />Promote
          </button>
          <button onClick={confirmAutoPromote} disabled={autoPromoting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-semibold transition disabled:opacity-50">
            <RefreshCw size={13} strokeWidth={2.2} className={autoPromoting ? 'animate-spin' : ''} />{autoPromoting ? 'Promoting…' : 'Auto-Promote'}
          </button>
          <button onClick={exportCsv} disabled={exporting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-semibold transition disabled:opacity-50">
            <Download size={13} strokeWidth={2.2} />{exporting ? '…' : 'Export'}
          </button>
          <div className="flex-1" />
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" strokeWidth={2.2} />
            <input type="text" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value.trim()); setDisplayCount(PAGE_SIZE) }}
              placeholder="Search students…"
              className="pl-9 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-blue-400 focus:bg-white transition w-48 sm:w-64" />
          </div>
        </div>
      </div>

      {/* Student list */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {studentsWithClass.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
              <Users size={32} strokeWidth={2} />
            </div>
            <h3 className="text-base font-bold text-slate-900">No students yet</h3>
            <p className="mt-1 text-sm text-slate-500">Tap "Add New" to register your first student</p>
          </div>
        ) : searchQuery && filtered.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
              <Search size={32} strokeWidth={2} />
            </div>
            <h3 className="text-base font-bold text-slate-900">No match found</h3>
            <p className="mt-1 text-sm text-slate-500">Try a different search term</p>
            <button onClick={() => { setSearchQuery(''); setDisplayCount(PAGE_SIZE) }}
              className="mt-4 text-sm font-semibold text-blue-600 hover:text-blue-700">Clear search</button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {displayed.map((s) => {
              const name = getStudentName(s)
              const classInfo = getClassInfo(s)
              const admNo = s.admission_no || ''
              const parent = s.parent_name || ''
              return (
                <div key={s.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50/50 transition group">
                  <Avatar s={s} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-900 truncate">{highlightName(name)}</div>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {admNo && <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold text-blue-700 bg-blue-50 max-w-[150px] truncate">{admNo}</span>}
                      {classInfo && <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold text-violet-700 bg-violet-50 max-w-[150px] truncate">{classInfo}</span>}
                      {parent && <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold text-slate-600 bg-slate-100 max-w-[150px] truncate">{parent}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition">
                    <button onClick={() => setEditStudent(s)} className="w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center text-blue-700 transition" title="Edit">
                      <Edit size={15} strokeWidth={2.2} />
                    </button>
                    {s.class_id && (
                      <button onClick={() => setViewResultsStudent(s)} className="w-8 h-8 rounded-lg bg-emerald-50 hover:bg-emerald-100 flex items-center justify-center text-emerald-700 transition" title="View Results">
                        <Eye size={15} strokeWidth={2.2} />
                      </button>
                    )}
                    <button onClick={() => setDeleteTarget(s)} className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-600 transition" title="Delete">
                      <Trash2 size={15} strokeWidth={2.2} />
                    </button>
                  </div>
                </div>
              )
            })}
            {hasMore && (
              <div className="text-center py-4">
                <button onClick={() => setDisplayCount(displayCount + PAGE_SIZE)}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg border border-slate-300 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition">
                  <ChevronDown size={16} strokeWidth={2.2} />Show {filtered.length - displayCount} more
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {editStudent && (
        <StudentEditModal student={editStudent} classes={classes} onClose={() => setEditStudent(null)}
          onSaved={() => { setEditStudent(null); loadStudents() }} />
      )}
      {showPromote && (
        <PromoteModal classes={classes} students={studentsWithClass} schoolId={schoolId!}
          onClose={() => setShowPromote(false)} onComplete={() => { setShowPromote(false); loadStudents() }} />
      )}
      {showAddStudent && (
        <AddStudentModal classes={classes} schoolId={schoolId!} onClose={() => setShowAddStudent(false)}
          onSaved={() => { setShowAddStudent(false); loadStudents() }} />
      )}
      {viewResultsStudent && (
        <StudentResultsModal student={viewResultsStudent} schoolId={schoolId!} onClose={() => setViewResultsStudent(null)} />
      )}
      {deleteTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center text-red-600">
                <Trash2 size={24} strokeWidth={2} />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Delete student?</h3>
            </div>
            <p className="text-sm text-slate-600 mb-5">
              This will permanently delete <strong>{getStudentName(deleteTarget)}</strong> ({deleteTarget.admission_no}). This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-50">Cancel</button>
              <button onClick={handleDelete} className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 text-white font-semibold text-sm hover:bg-red-700 shadow-sm">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PromoteModal({ classes, students, onClose, onComplete }: {
  classes: SchoolClass[]; students: Student[]; schoolId: string; onClose: () => void; onComplete: () => void
}) {
  const [fromId, setFromId] = useState<string | null>(null)
  const [toId, setToId] = useState<string | null>(null)
  const [promoting, setPromoting] = useState(false)
  const fromCount = fromId ? students.filter((s) => s.class_id === fromId).length : 0
  const toOptions = classes.filter((c) => c.id !== fromId)
  const label = (c: SchoolClass) => {
    const n = c.name; const s = c.section || ''; const t = c.tier || ''; const cnt = c.student_count || 0
    let l = s ? n + ' (' + s + ')' : n
    if (t) l += ' [' + t + ']'
    return l + ' - ' + cnt + ' students'
  }
  const doPromote = async () => {
    if (!fromId || !toId || fromCount === 0) return
    setPromoting(true)
    try {
      const { error: err } = await dbProxy.from('students').update({ class_id: toId }).eq('class_id', fromId)
      if (err) throw err
      onComplete()
    } catch (e: any) {
      alert('Failed: ' + e.message)
    } finally {
      setPromoting(false)
    }
  }
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 pb-4">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
              <TrendingUp size={22} strokeWidth={2.2} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">Bulk Promote Students</h2>
              <p className="text-xs text-slate-500">Move all students from one class to another</p>
            </div>
          </div>
        </div>
        <div className="border-t border-slate-100 p-6 pt-5">
          <label className="text-[11px] font-bold text-slate-400 tracking-wider">FROM CLASS</label>
          <div className="relative mt-2">
            <ArrowUp size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600" />
            <select value={fromId || ''} onChange={(e) => { setFromId(e.target.value || null); setToId(null) }}
              className="w-full h-11 pl-10 pr-3 rounded-lg border border-slate-200 bg-white text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none">
              <option value="">Select source class</option>
              {classes.map((c) => (<option key={c.id} value={c.id}>{label(c)}</option>))}
            </select>
          </div>
          {fromId && (
            <div className="mt-2 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-sm font-semibold text-emerald-700">
              {fromCount} student{fromCount !== 1 ? 's' : ''} will be moved
            </div>
          )}
          <label className="text-[11px] font-bold text-slate-400 tracking-wider mt-4 block">TO CLASS</label>
          <div className="relative mt-2">
            <ArrowDown size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600" />
            <select value={toId || ''} disabled={!fromId} onChange={(e) => setToId(e.target.value || null)}
              className="w-full h-11 pl-10 pr-3 rounded-lg border border-slate-200 bg-white text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none disabled:bg-slate-50">
              <option value="">{fromId ? 'Select destination' : 'Select source first'}</option>
              {toOptions.map((c) => (<option key={c.id} value={c.id}>{label(c)}</option>))}
            </select>
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={onClose} className="flex-1 h-11 rounded-lg border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-50">Cancel</button>
            <button onClick={doPromote} disabled={!fromId || !toId || fromCount === 0 || promoting}
              className="flex-1 h-11 rounded-lg bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 shadow-sm flex items-center justify-center gap-2">
              {promoting ? <Loader2 size={16} className="animate-spin" /> : 'Promote' + (fromCount > 0 ? ' ' + fromCount + ' Students' : '')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
