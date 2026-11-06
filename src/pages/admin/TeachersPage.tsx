import { useState, useEffect, useMemo } from "react"
import { dbProxy } from '../../lib/dbProxy'
import { useAuth } from '../../contexts/AuthContext'
import {
  Download, Search, Trash2, Users, GraduationCap, BookOpen, Loader2,
  AlertCircle, CheckCircle2, ClipboardList, UserPlus, X, ChevronDown,
  Edit, Mail, Phone, Briefcase, Award, MapPin, User, AlertTriangle, Camera, Eye,
} from 'lucide-react'
import TeacherEditModal from '../../components/admin/TeacherEditModal'
import TeacherAssignModal from '../../components/admin/TeacherAssignModal'

interface Teacher {
  id: string; first_name: string; last_name: string; staff_id: string
  gender: string | null; email: string | null; phone: string | null
  department: string | null; qualification: string | null; home_address: string | null
  passport_url: string | null; is_active: boolean; [key: string]: any
}
interface SchoolClass {
  id: string; name: string; section: string | null; tier: string | null
  student_count: number; class_teacher_id: string | null
}
interface ClassSubject {
  id: string; teacher_id: string | null; class_id: string; subject_id: string
  subject?: { name: string; code: string } | null
}
interface Subject { id: string; name: string; code: string }

const PAGE_SIZE = 50
function teacherName(t: Teacher): string {
  return [t.first_name, t.last_name].filter(Boolean).join(' ').trim()
}

export default function TeachersPage() {
  const { user } = useAuth()
  const schoolId = user?.id || ''
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [classSubjects, setClassSubjects] = useState<ClassSubject[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE)
  const [isExporting, setIsExporting] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<Teacher | null>(null)
  const [editTeacher, setEditTeacher] = useState<Teacher | null>(null)
  const [assignTeacher, setAssignTeacher] = useState<Teacher | null>(null)
  const [detailTeacher, setDetailTeacher] = useState<Teacher | null>(null)
  const [showAddTeacher, setShowAddTeacher] = useState(false)

  const loadData = async () => {
    if (!schoolId) return
    setLoading(true)
    try {
      // Plain selects — no FK joins
      const [tRes, cRes, csRes, subRes] = await Promise.all([
        dbProxy.from('teachers').select('*').eq('school_id', schoolId).order('first_name'),
        dbProxy.from('classes').select('id, name, section, tier, student_count, class_teacher_id').eq('school_id', schoolId).order('name'),
        dbProxy.from('class_subjects').select('id, teacher_id, class_id, subject_id').eq('school_id', schoolId),
        dbProxy.from('subjects').select('id, name, code').eq('school_id', schoolId),
      ])
      if (tRes.error) throw tRes.error
      if (cRes.error) throw cRes.error
      if (csRes.error) throw csRes.error
      setTeachers((tRes.data || []) as Teacher[])
      setClasses((cRes.data || []) as SchoolClass[])
      setSubjects((subRes.data || []) as Subject[])
      // Stitch subject info into class_subjects
      const subMap: Record<string, Subject> = {}
      ;(subRes.data || []).forEach((s: any) => { subMap[s.id] = s })
      const stitchedCS = (csRes.data || []).map((cs: any) => ({
        ...cs,
        subject: cs.subject_id ? subMap[cs.subject_id] : null,
      }))
      setClassSubjects(stitchedCS as unknown as ClassSubject[])
    } catch (e: any) {
      setError(e.message || 'Failed to load teachers')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [schoolId])

  const formTeacherClass = (teacherId: string) => classes.find(c => c.class_teacher_id === teacherId)
  const assignmentCount = (teacherId: string) => classSubjects.filter(cs => cs.teacher_id === teacherId).length
  const assignedSubjectsFor = (teacherId: string) => classSubjects
    .filter(cs => cs.teacher_id === teacherId)
    .map(cs => ({
      subjectName: cs.subject?.name || 'Unknown',
      subjectCode: cs.subject?.code || '',
      className: classes.find(c => c.id === cs.class_id)?.name || '',
      classId: cs.class_id, subjectId: cs.subject_id,
    }))

  const teacherStats = useMemo(() => {
    const formTeacherCount = classes.filter(c => c.class_teacher_id).length
    const subjectTeacherCount = teachers.filter(t => classSubjects.some(cs => cs.teacher_id === t.id)).length
    return { total: teachers.length, active: teachers.filter(t => t.is_active).length, formTeachers: formTeacherCount, subjectTeachers: subjectTeacherCount }
  }, [teachers, classes, classSubjects])

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

  const displayed = filteredTeachers.slice(0, displayCount)
  const hasMore = filteredTeachers.length > displayCount

  const highlightName = (text: string) => {
    if (!searchQuery.trim() || !text) return text || 'Unknown'
    const q = searchQuery.toLowerCase()
    const idx = text.toLowerCase().indexOf(q)
    if (idx === -1) return text
    return (<>{text.substring(0, idx)}<mark className="bg-indigo-100 text-indigo-900 font-bold rounded px-0.5">{text.substring(idx, idx + q.length)}</mark>{text.substring(idx + q.length)}</>)
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    try {
      await dbProxy.from('class_subjects').update({ teacher_id: null }).eq('teacher_id', deleteConfirm.id)
      await dbProxy.from('classes').update({ class_teacher_id: null }).eq('class_teacher_id', deleteConfirm.id)
      const { error } = await dbProxy.from('teachers').delete().eq('id', deleteConfirm.id)
      if (error) throw error
      setSuccessMsg('Teacher deleted'); setDeleteConfirm(null); await loadData()
    } catch (e: any) { setError(e.message || 'Delete failed') }
  }

  const exportCsv = async () => {
    if (filteredTeachers.length === 0) return
    setIsExporting(true)
    try {
      const headers = ['Staff ID', 'Full Name', 'Gender', 'Email', 'Phone', 'Department', 'Qualification', 'Role(s)']
      const rows = filteredTeachers.map(t => {
        const isFormTeacher = !!formTeacherClass(t.id)
        const assigned = assignmentCount(t.id)
        const roles: string[] = []
        if (isFormTeacher) roles.push('Form Teacher')
        if (assigned > 0) roles.push(assigned + ' Subject Teacher' + (assigned !== 1 ? 's' : ''))
        return [t.staff_id || '', teacherName(t), (t.gender || '').trim(), (t.email || '').trim(), (t.phone || '').trim(), (t.department || '').trim(), (t.qualification || '').trim(), roles.length === 0 ? 'None' : roles.join(' / ')]
      })
      const csv = [headers, ...rows].map(r => r.map(c => '"' + String(c || '').replace(/"/g, '""') + '"').join(',')).join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = 'teachers' + (searchQuery ? '_filtered' : '') + '.csv'; a.click()
      URL.revokeObjectURL(url); setSuccessMsg('Export successful')
    } catch (e: any) { setError(e.message || 'Export failed') } finally { setIsExporting(false) }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin shadow-lg shadow-emerald-500/20" />
          <span className="text-sm font-semibold text-slate-700">Loading teachers...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="px-3 sm:px-4 lg:px-6 py-4 sm:py-6 max-w-6xl mx-auto space-y-5 bg-gradient-to-br from-slate-50 via-white to-amber-50/30 min-h-screen">
      {/* Header - premium */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
            <GraduationCap size={22} strokeWidth={2.2} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Teachers
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 bg-clip-text text-transparent">Teachers</h1>
            <p className="text-sm text-slate-500">{searchQuery ? filteredTeachers.length + ' of ' + teachers.length + ' found' : teachers.length + ' registered'}</p>
          </div>
        </div>
        <button onClick={() => setShowAddTeacher(true)}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white text-sm font-bold shadow-lg shadow-emerald-500/30 hover:-translate-y-0.5 transition-all">
          <UserPlus size={14} strokeWidth={2.4} />Add New
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Users, label: 'Total', value: teacherStats.total, color: '#6366F1', bg: '#EEF2FF' },
          { icon: GraduationCap, label: 'Form Masters', value: teacherStats.formTeachers, color: '#10B981', bg: '#ECFDF5' },
          { icon: BookOpen, label: 'Subject Teachers', value: teacherStats.subjectTeachers, color: '#F59E0B', bg: '#FFFBEB' },
        ].map((s) => {
          const Icon = s.icon
          return (
            <div key={s.label} className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg shadow-slate-200/40 border border-slate-200/60 p-3 sm:p-4">
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
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg shadow-slate-200/40 border border-slate-200/60 overflow-hidden">
        <div className="px-4 py-3 flex items-center gap-2 flex-wrap">
          <button onClick={exportCsv} disabled={isExporting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white text-xs font-semibold shadow-md shadow-blue-500/30 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:translate-y-0">
            <Download size={13} strokeWidth={2.2} />{isExporting ? '...' : 'Export'}
          </button>
          <div className="flex-1" />
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" strokeWidth={2.2} />
            <input type="text" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value.trim()); setDisplayCount(PAGE_SIZE) }}
              placeholder="Search teachers…"
              className="pl-9 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-blue-400 focus:bg-white transition w-48 sm:w-64" />
          </div>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-800">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          <p className="text-sm flex-1">{error}</p>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600"><X size={14} /></button>
        </div>
      )}
      {successMsg && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800">
          <CheckCircle2 size={18} className="flex-shrink-0 mt-0.5" />
          <p className="text-sm flex-1">{successMsg}</p>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-400 hover:text-emerald-600"><X size={14} /></button>
        </div>
      )}

      {/* Teacher list */}
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg shadow-slate-200/40 border border-slate-200/60 overflow-hidden">
        {teachers.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white mb-4 shadow-xl shadow-emerald-500/30">
              <Users size={36} strokeWidth={2} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">No teachers registered</h3>
            <p className="mt-2 text-sm text-slate-500 max-w-xs">Tap "Add New" to register a teacher</p>
          </div>
        ) : searchQuery && filteredTeachers.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center text-white mb-4 shadow-xl shadow-slate-400/30">
              <Search size={36} strokeWidth={2} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">No match found</h3>
            <p className="mt-2 text-sm text-slate-500">Try a different search term</p>
            <button onClick={() => { setSearchQuery(''); setDisplayCount(PAGE_SIZE) }}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white text-sm font-semibold shadow-md shadow-blue-500/30 hover:-translate-y-0.5 transition-all">Clear search</button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {displayed.map((t) => {
              const name = teacherName(t)
              const ftClass = formTeacherClass(t.id)
              const assigns = assignmentCount(t.id)
              const isFormTeacher = !!ftClass
              const initials = (t.first_name?.[0] || '') + (t.last_name?.[0] || '')
              return (
                <div key={t.id} className="px-4 py-3 hover:bg-slate-50/50 transition group cursor-pointer" onClick={() => setDetailTeacher(t)}>
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className={'flex-shrink-0 w-11 h-11 rounded-full p-0.5 ' + (isFormTeacher ? 'bg-gradient-to-br from-emerald-400 to-green-500' : 'bg-gradient-to-br from-blue-400 to-cyan-500')}>
                      {t.passport_url ? (
                        <img src={t.passport_url + '?width=80&height=80'} alt="" className="w-full h-full rounded-full object-cover bg-gray-100"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                      ) : (
                        <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                          <span className={'text-sm font-bold ' + (isFormTeacher ? 'text-emerald-700' : 'text-blue-700')}>{initials.toUpperCase()}</span>
                        </div>
                      )}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-900 truncate">{highlightName(name)}</div>
                      <div className="text-xs text-slate-500 mt-0.5">Staff ID: {t.staff_id || '-'}</div>
                      {(t.email || t.phone) && (
                        <div className="flex flex-wrap items-center gap-3 mt-1">
                          {t.email && (<div className="flex items-center gap-1 min-w-0"><Mail size={11} className="text-slate-400 flex-shrink-0" /><span className="text-[11px] text-slate-500 truncate">{t.email}</span></div>)}
                          {t.phone && (<div className="flex items-center gap-1 min-w-0"><Phone size={11} className="text-slate-400 flex-shrink-0" /><span className="text-[11px] text-slate-500 truncate">{t.phone}</span></div>)}
                        </div>
                      )}
                    </div>
                    {/* Badges */}
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      {isFormTeacher && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-[10px] font-semibold text-emerald-700 flex items-center gap-1">
                          <ClipboardList size={11} /> Form Teacher
                        </span>
                      )}
                      {assigns > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-[10px] font-semibold text-blue-700">
                          {assigns} Subject{assigns !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Department row */}
                  {(t.department || t.qualification) && (
                    <div className="mt-2 flex items-center gap-2 text-[11px]">
                      {t.department && (<div className="flex items-center gap-1 min-w-0"><Briefcase size={11} className="text-slate-400 flex-shrink-0" /><span className="text-slate-600 truncate">{t.department}</span></div>)}
                      {t.department && t.qualification && <span className="w-1 h-1 rounded-full bg-slate-400 flex-shrink-0" />}
                      {t.qualification && <span className="text-slate-500 italic truncate">{t.qualification}</span>}
                    </div>
                  )}

                  {/* Action buttons — always visible */}
                  <div className="mt-3 flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => setDetailTeacher(t)} className="px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-semibold flex items-center gap-1 transition border border-slate-200">
                      <Eye size={13} strokeWidth={2.2} /> View
                    </button>
                    <button onClick={() => setEditTeacher(t)} className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold flex items-center gap-1 transition border border-blue-200">
                      <Edit size={13} strokeWidth={2.2} /> Edit
                    </button>
                    <button onClick={() => setAssignTeacher(t)} className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold flex items-center gap-1 transition border border-indigo-200">
                      <ClipboardList size={13} strokeWidth={2.2} /> Assign
                    </button>
                    <button onClick={() => setDeleteConfirm(t)} className="px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold flex items-center gap-1 transition border border-red-200">
                      <Trash2 size={13} strokeWidth={2.2} /> Delete
                    </button>
                  </div>
                </div>
              )
            })}
            {hasMore && (
              <div className="text-center py-4">
                <button onClick={() => setDisplayCount(displayCount + PAGE_SIZE)}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg border border-slate-300 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition">
                  <ChevronDown size={16} strokeWidth={2.2} />Show {filteredTeachers.length - displayCount} more
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {editTeacher && <TeacherEditModal teacher={editTeacher} onClose={() => setEditTeacher(null)} onSaved={() => { setEditTeacher(null); loadData() }} />}
      {assignTeacher && <TeacherAssignModal teacher={assignTeacher} classes={classes} schoolId={schoolId} onClose={() => setAssignTeacher(null)} onChanged={loadData} />}
      {detailTeacher && (
        <TeacherDetailModal teacher={detailTeacher} classes={classes} classSubjects={classSubjects}
          onClose={() => setDetailTeacher(null)}
          onEdit={() => { setEditTeacher(detailTeacher); setDetailTeacher(null) }}
          onAssign={() => { setAssignTeacher(detailTeacher); setDetailTeacher(null) }}
          onDelete={() => { setDeleteConfirm(detailTeacher); setDetailTeacher(null) }} />
      )}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center text-red-600">
                <Trash2 size={24} strokeWidth={2} />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Delete teacher?</h3>
            </div>
            <p className="text-sm text-slate-600 mb-5">
              This will permanently delete <strong>{teacherName(deleteConfirm)}</strong> ({deleteConfirm.staff_id}). Their class and subject assignments will be cleared. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-50">Cancel</button>
              <button onClick={handleDelete} className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 text-white font-semibold text-sm hover:bg-red-700 shadow-sm">Delete</button>
            </div>
          </div>
        </div>
      )}
      {showAddTeacher && <AddTeacherModal classes={classes} schoolId={schoolId} onClose={() => setShowAddTeacher(false)} onSaved={() => { setShowAddTeacher(false); loadData() }} />}
    </div>
  )
}

function TeacherDetailModal({ teacher, classes, classSubjects, onClose, onEdit, onAssign, onDelete }: {
  teacher: Teacher; classes: SchoolClass[]; classSubjects: ClassSubject[]
  onClose: () => void; onEdit: () => void; onAssign: () => void; onDelete: () => void
}) {
  const name = teacherName(teacher)
  const ftClass = classes.find(c => c.class_teacher_id === teacher.id)
  const assigned = classSubjects.filter(cs => cs.teacher_id === teacher.id).map(cs => ({
    subjectName: cs.subject?.name || 'Unknown', className: classes.find(c => c.id === cs.class_id)?.name || ''
  }))
  const initials = (teacher.first_name?.[0] || '') + (teacher.last_name?.[0] || '')
  const Row = ({ Icon, iconBg, iconColor, label, value }: any) => (
    <div className="flex items-center gap-3.5 py-2.5">
      <div className={'w-9 h-9 rounded-lg flex items-center justify-center ' + iconBg}><Icon size={18} className={iconColor} /></div>
      <div className="flex-1"><div className="text-[11px] text-slate-500 font-medium">{label}</div><div className="text-sm font-semibold text-slate-900">{value}</div></div>
    </div>
  )
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 pb-4">
          <div className="flex items-center gap-3.5">
            <div className="w-16 h-16 rounded-full bg-blue-50 p-1 flex-shrink-0">
              {teacher.passport_url ? (
                <img src={teacher.passport_url + '?width=100&height=100'} alt="" className="w-full h-full rounded-full object-cover bg-gray-200"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
              ) : (<div className="w-full h-full rounded-full bg-white flex items-center justify-center"><span className="text-xl font-bold text-blue-700">{initials.toUpperCase()}</span></div>)}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-slate-900 tracking-tight truncate">{name || 'Unknown'}</h2>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {teacher.staff_id && <span className="px-2 py-0.5 rounded bg-blue-50 text-[11px] font-semibold text-blue-700">{teacher.staff_id}</span>}
                {ftClass && <span className="px-2 py-0.5 rounded bg-emerald-50 text-[11px] font-semibold text-emerald-700">Form Teacher</span>}
                {assigned.length > 0 && <span className="px-2 py-0.5 rounded bg-amber-50 text-[11px] font-semibold text-amber-700">{assigned.length} Subject{assigned.length !== 1 ? 's' : ''}</span>}
              </div>
            </div>
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600"><X size={22} /></button>
          </div>
        </div>
        <div className="border-t border-slate-100" />
        <div className="flex-1 overflow-y-auto px-6 py-2">
          {teacher.gender && <Row Icon={User} iconBg="bg-violet-50" iconColor="text-violet-700" label="Gender" value={teacher.gender.charAt(0).toUpperCase() + teacher.gender.slice(1)} />}
          {teacher.email && <Row Icon={Mail} iconBg="bg-blue-50" iconColor="text-blue-700" label="Email" value={teacher.email} />}
          {teacher.phone && <Row Icon={Phone} iconBg="bg-emerald-50" iconColor="text-emerald-700" label="Phone" value={teacher.phone} />}
          {teacher.department && <Row Icon={Briefcase} iconBg="bg-amber-50" iconColor="text-amber-700" label="Department" value={teacher.department} />}
          {teacher.qualification && <Row Icon={Award} iconBg="bg-yellow-50" iconColor="text-yellow-800" label="Qualification" value={teacher.qualification} />}
          {teacher.home_address && <Row Icon={MapPin} iconBg="bg-red-50" iconColor="text-red-700" label="Home Address" value={teacher.home_address} />}
          {assigned.length > 0 && (
            <>
              <div className="mt-4 mb-2 text-[11px] font-bold text-slate-400 tracking-wider">SUBJECT ASSIGNMENTS</div>
              <div className="flex flex-wrap gap-2">
                {assigned.map((a, i) => (
                  <span key={i} className="px-2.5 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-700">
                    {a.className ? a.subjectName + ' (' + a.className + ')' : a.subjectName}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="border-t border-slate-100 p-6 pt-3 flex gap-3">
          <button onClick={onDelete} className="flex-1 h-11 rounded-lg border border-red-300 text-red-600 font-semibold text-sm hover:bg-red-50 flex items-center justify-center gap-1.5"><Trash2 size={16} /> Delete</button>
          <button onClick={onAssign} className="flex-1 h-11 rounded-lg bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800">Manage Roles</button>
        </div>
      </div>
    </div>
  )
}

function AddTeacherModal({ classes, schoolId, onClose, onSaved }: { classes: SchoolClass[]; schoolId: string; onClose: () => void; onSaved: () => void }) {
  const [passportUrl, setPassportUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ first_name: '', last_name: '', gender: '', staff_id: '', email: '', phone: '', department: '', qualification: '', home_address: '' })
  const setField = (key: string, value: string) => { setForm((prev) => ({ ...prev, [key]: value })); setError(null) }

  const pickAndUploadPassport = async () => {
    if (uploading) return
    const input = document.createElement('input')
    input.type = 'file'; input.accept = 'image/*'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      setUploading(true); setError(null)
      try {
        const tempId = 'temp-' + Date.now()
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
        const timestamp = Date.now()
        const storagePath = 'teachers/' + tempId + '/' + timestamp + '.' + ext
        const mimeMap: Record<string, string> = { jpg: 'jpeg', jpeg: 'jpeg', png: 'png', gif: 'gif', webp: 'webp' }
        const mime = mimeMap[ext] || 'jpeg'
        const SUPABASE_URL = (import.meta as any).env.VITE_SUPABASE_URL
        const ANON_KEY = (import.meta as any).env.VITE_SUPABASE_ANON_KEY
        const uploadUrl = SUPABASE_URL + '/storage/v1/object/passports/' + storagePath
        const res = await fetch(uploadUrl, { method: 'POST', headers: { apikey: ANON_KEY, 'Content-Type': 'image/' + mime, 'x-upsert': 'true' }, body: file })
        if (!res.ok) throw new Error('Upload failed (' + res.status + ')')
        setPassportUrl(SUPABASE_URL + '/storage/v1/object/public/passports/' + storagePath)
      } catch (e: any) { setError('Upload failed: ' + e.message) } finally { setUploading(false) }
    }
    input.click()
  }

  const save = async () => {
    if (saving) return
    if (!form.first_name.trim()) { setError('First Name is required'); return }
    if (!form.last_name.trim()) { setError('Last Name is required'); return }
    if (!form.staff_id.trim()) { setError('Staff ID is required'); return }
    setSaving(true); setError(null)
    try {
      const username = (form.first_name.toLowerCase() + '_' + form.last_name.toLowerCase()).replace(/\s+/g, '_')
      const password = 'Tchr@' + Math.floor(100000 + Math.random() * 900000) + '!'
      const data: Record<string, any> = {
        school_id: schoolId, staff_id: form.staff_id.trim(), first_name: form.first_name.trim(), last_name: form.last_name.trim(),
        gender: form.gender ? form.gender.toLowerCase() : null, email: form.email.trim() || '', phone: form.phone.trim() || '',
        department: form.department.trim() || '', qualification: form.qualification.trim() || '', home_address: form.home_address.trim() || '',
        passport_url: passportUrl || null, username, password, is_active: true,
      }
      const { error: err } = await dbProxy.from('teachers').insert(data).select()
      if (err) throw err
      onSaved()
    } catch (e: any) { setError('Save failed: ' + e.message); setSaving(false) }
  }

  const Field = ({ label, value, onChange, placeholder, type = 'text', required, maxRows }: any) => (
    <div>
      <label className="text-xs text-slate-600 font-medium">{label}{required && <span className="text-red-500"> *</span>}</label>
      {maxRows ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={maxRows} placeholder={placeholder}
          className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition" />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          className="mt-1 w-full h-11 px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition" />
      )}
    </div>
  )

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700"><UserPlus size={22} strokeWidth={2.2} /></div>
            <div className="flex-1"><h2 className="text-lg font-bold text-slate-900 tracking-tight">Add New Teacher</h2><p className="text-xs text-slate-500">Username + password auto-generated</p></div>
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600"><X size={22} /></button>
          </div>
        </div>
        <div className="border-t border-slate-100" />
        <div className="flex-1 overflow-y-auto p-6 pt-5">
          <div className="flex flex-col items-center mb-4">
            <button onClick={pickAndUploadPassport} disabled={uploading} className="relative">
              <div className="w-20 h-20 rounded-full border-2 border-emerald-200 bg-emerald-50 overflow-hidden flex items-center justify-center">
                {passportUrl ? (<img src={passportUrl + '?width=120&height=120'} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />) : (<User size={32} className="text-slate-400" />)}
              </div>
              {uploading && (<div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center"><Loader2 size={20} className="text-white animate-spin" /></div>)}
              {!uploading && (<div className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-emerald-600 border-2 border-white flex items-center justify-center"><Camera size={13} className="text-white" /></div>)}
            </button>
            <p className="mt-1 text-[11px] text-slate-400">Upload photo (optional)</p>
          </div>
          <div className="text-[11px] font-bold text-slate-400 tracking-wider uppercase mb-3">Personal Information</div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <Field label="First Name" value={form.first_name} onChange={(v: string) => setField('first_name', v)} required />
            <Field label="Last Name" value={form.last_name} onChange={(v: string) => setField('last_name', v)} required />
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <Field label="Staff ID" value={form.staff_id} onChange={(v: string) => setField('staff_id', v)} required placeholder="e.g. STF001" />
            <div>
              <label className="text-xs text-slate-600 font-medium">Gender</label>
              <select value={form.gender} onChange={(e) => setField('gender', e.target.value)} className="mt-1 w-full h-11 px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition">
                <option value="">Select gender</option><option value="Male">Male</option><option value="Female">Female</option>
              </select>
            </div>
          </div>
          <div className="text-[11px] font-bold text-slate-400 tracking-wider uppercase mb-3 mt-5">Contact</div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <Field label="Email" type="email" value={form.email} onChange={(v: string) => setField('email', v)} placeholder="email@example.com" />
            <Field label="Phone" value={form.phone} onChange={(v: string) => setField('phone', v)} placeholder="Phone number" />
          </div>
          <div className="text-[11px] font-bold text-slate-400 tracking-wider uppercase mb-3 mt-5">Work Information</div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <Field label="Department" value={form.department} onChange={(v: string) => setField('department', v)} />
            <Field label="Qualification" value={form.qualification} onChange={(v: string) => setField('qualification', v)} />
          </div>
          <Field label="Home Address" value={form.home_address} onChange={(v: string) => setField('home_address', v)} maxRows={2} />
          {error && (<div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>)}
        </div>
        <div className="border-t border-slate-100 p-6 pt-3 flex gap-3">
          <button onClick={onClose} disabled={saving} className="flex-1 h-11 rounded-lg border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-50 disabled:opacity-50">Cancel</button>
          <button onClick={save} disabled={saving} className="flex-1 h-11 rounded-lg bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 flex items-center justify-center gap-2">
            {saving ? <Loader2 size={18} className="animate-spin" /> : 'Save Teacher'}
          </button>
        </div>
      </div>
    </div>
  )
}
