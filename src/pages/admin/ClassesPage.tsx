import { useState, useEffect, useMemo } from "react"
import { dbProxy } from '../../lib/dbProxy'
import { useAuth } from '../../contexts/AuthContext'
import {
  BookOpen, Users, Pencil, Trash2, Plus, Loader2, AlertCircle,
  CheckCircle, X, Save, ClipboardList, School, GraduationCap,
  Filter, User, Layers, BookMarked, UserCheck,
} from 'lucide-react'

type Tab = 'classes' | 'subjects' | 'assignments'

interface ClassRow {
  id: string
  name: string
  section: string | null
  tier: string | null
  class_level: string | null
  student_count: number
  class_teacher_id: string | null
  next_class_id: string | null
  assessment_types?: any
}

interface SubjectRow {
  id: string
  name: string
  code: string | null
  is_elective: boolean
  description: string | null
}

interface Teacher {
  id: string
  first_name: string
  last_name: string
  staff_id: string | null
}

interface ClassSubject {
  id: string
  class_id: string
  subject_id: string
  teacher_id: string | null
  is_compulsory: boolean
}

interface AssignmentRow {
  id: string
  title: string
  class_id: string | null
  subject_id: string | null
  total_marks: number
  due_date: string | null
  is_published: boolean
}

const tierColor = (tier: string | null) => {
  switch (tier) {
    case 'SSS': return '#1565C0'
    case 'JSS': return '#2E7D32'
    case 'PRIMARY': return '#E65100'
    default: return '#6B7280'
  }
}

const tierBg = (tier: string | null) => {
  switch (tier) {
    case 'SSS': return 'bg-blue-50'
    case 'JSS': return 'bg-green-50'
    case 'PRIMARY': return 'bg-orange-50'
    default: return 'bg-gray-100'
  }
}

const teacherDisplayName = (t: Teacher | undefined) => {
  if (!t) return ''
  return [t.first_name, t.last_name].filter(Boolean).join(' ').trim()
}

export default function ClassesPage() {
  const { user } = useAuth()
  const schoolId = user?.id || ''

  const [tab, setTab] = useState<Tab>('classes')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const [classes, setClasses] = useState<ClassRow[]>([])
  const [subjects, setSubjects] = useState<SubjectRow[]>([])
  const [assignments, setAssignments] = useState<AssignmentRow[]>([])
  const [classSubjects, setClassSubjects] = useState<ClassSubject[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [students, setStudents] = useState<any[]>([])

  const [showClassModal, setShowClassModal] = useState(false)
  const [showSubjectModal, setShowSubjectModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [membersClass, setMembersClass] = useState<ClassRow | null>(null)
  const [classMembers, setClassMembers] = useState<any[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [assignClass, setAssignClass] = useState<ClassRow | null>(null)
  const [editingClass, setEditingClass] = useState<ClassRow | null>(null)
  const [editingSubject, setEditingSubject] = useState<SubjectRow | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: string; id: string; name: string } | null>(null)

  const [classForm, setClassForm] = useState({ name: '', section: '', tier: 'SSS', class_level: '', next_class_id: '' })
  const [subjectForm, setSubjectForm] = useState({ name: '', code: '', is_elective: false, description: '' })
  const [subjectFilterClassId, setSubjectFilterClassId] = useState<string | null>(null)

  const loadData = async () => {
    if (!schoolId) return
    setLoading(true)
    try {
      const [cRes, sRes, aRes, csRes, tRes, studentsRes] = await Promise.all([
        dbProxy.from('classes').select('*').eq('school_id', schoolId).order('name'),
        dbProxy.from('subjects').select('*').eq('school_id', schoolId).order('name'),
        dbProxy.from('assignments').select('*').eq('school_id', schoolId).order('created_at', { ascending: false }),
        dbProxy.from('class_subjects').select('*').eq('school_id', schoolId),
        dbProxy.from('teachers').select('id, first_name, last_name, staff_id').eq('school_id', schoolId).order('first_name'),
        dbProxy.from('students').select('id, class_id').eq('school_id', schoolId),
      ])
      if (cRes.error) throw cRes.error
      if (sRes.error) throw sRes.error
      if (aRes.error) throw aRes.error
      if (csRes.error) throw csRes.error
      if (tRes.error) throw tRes.error
      if (studentsRes.error) throw studentsRes.error
      setClasses((cRes.data || []) as ClassRow[])
      setSubjects((sRes.data || []) as SubjectRow[])
      setAssignments((aRes.data || []) as AssignmentRow[])
      setClassSubjects((csRes.data || []) as unknown as ClassSubject[])
      setTeachers((tRes.data || []) as Teacher[])
      setStudents((studentsRes.data || []) as any[])
    } catch (e: any) {
      setError(e.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [schoolId])

  const subjectCountForClass = (classId: string) => classSubjects.filter(cs => cs.class_id === classId).length
  const liveStudentCount = (classId: string) => students.filter(s => s.class_id === classId).length
  const teacherById = (id: string | null) => teachers.find(t => t.id === id)
  const classById = (id: string | null) => classes.find(c => c.id === id)

  const saveClass = async () => {
    if (!classForm.name.trim()) { setError('Class name is required'); return }
    setError('')
    try {
      const payload = {
        school_id: schoolId,
        name: classForm.name.trim(),
        section: classForm.section || null,
        tier: classForm.tier,
        class_level: classForm.class_level || null,
        next_class_id: classForm.next_class_id || null,
      }
      if (editingClass) {
        const { error } = await dbProxy.from('classes').update({
          name: payload.name,
          section: payload.section,
          tier: payload.tier,
          class_level: payload.class_level,
          next_class_id: payload.next_class_id,
        }).eq('id', editingClass.id)
        if (error) throw error
        setSuccessMsg('Class updated')
      } else {
        const { error } = await dbProxy.from('classes').insert(payload)
        if (error) throw error
        setSuccessMsg('Class created')
      }
      setShowClassModal(false)
      await loadData()
    } catch (e: any) {
      setError(e.message || 'Save failed')
    }
  }

  const saveSubject = async () => {
    if (!subjectForm.name.trim()) { setError('Subject name is required'); return }
    setError('')
    try {
      // Check duplicate
      const { data: existing } = await dbProxy
        .from('subjects')
        .select('id')
        .eq('school_id', schoolId)
        .eq('name', subjectForm.name.trim())
        .maybeSingle()
      if (existing && (!editingSubject || existing.id !== editingSubject.id)) {
        setError('Subject with this name already exists')
        return
      }

      if (editingSubject) {
        const { error } = await dbProxy.from('subjects').update({
          name: subjectForm.name.trim(),
          code: subjectForm.code || null,
          is_elective: subjectForm.is_elective,
          description: subjectForm.description || null,
        }).eq('id', editingSubject.id)
        if (error) throw error
        setSuccessMsg('Subject updated')
      } else {
        const { error } = await dbProxy.from('subjects').insert({
          school_id: schoolId,
          name: subjectForm.name.trim(),
          code: subjectForm.code || null,
          is_elective: subjectForm.is_elective,
          description: subjectForm.description || null,
        })
        if (error) throw error
        setSuccessMsg('Subject created')
      }
      setShowSubjectModal(false)
      await loadData()
    } catch (e: any) {
      setError(e.message || 'Save failed')
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    const { type, id } = deleteConfirm
    try {
      if (type === 'Class') {
        // Clear class_subjects references first
        await dbProxy.from('class_subjects').delete().eq('class_id', id)
        // Clear class_teacher_id on this class (already deleted, but clear references from other tables)
        await dbProxy.from('classes').update({ class_teacher_id: null }).eq('class_teacher_id', id)
        const { error } = await dbProxy.from('classes').delete().eq('id', id)
        if (error) throw error
      } else if (type === 'Subject') {
        // Clear class_subjects references first
        await dbProxy.from('class_subjects').delete().eq('subject_id', id)
        const { error } = await dbProxy.from('subjects').delete().eq('id', id)
        if (error) throw error
      } else {
        const { error } = await dbProxy.from('assignments').delete().eq('id', id)
        if (error) throw error
      }
      setDeleteConfirm(null)
      setSuccessMsg(`${type} deleted`)
      await loadData()
    } catch (e: any) {
      setError(e.message || 'Delete failed')
    }
  }

  const assignFormTeacher = async (classId: string, teacherId: string | null) => {
    try {
      const { error } = await dbProxy
        .from('classes')
        .update({ class_teacher_id: teacherId || null })
        .eq('id', classId)
      if (error) throw error
      await loadData()
      setSuccessMsg(teacherId ? 'Form teacher assigned' : 'Form teacher removed')
    } catch (e: any) {
      setError(e.message)
    }
  }

  const loadClassMembers = async (classId: string) => {
    setLoadingMembers(true)
    try {
      const { data, error } = await dbProxy
        .from('students')
        .select('id, admission_no, first_name, middle_name, last_name, gender, passport_url, parent_name, parent_phone')
        .eq('school_id', schoolId)
        .eq('class_id', classId)
        .order('first_name')
      if (error) throw error
      setClassMembers((data || []) as any[])
    } catch (e: any) {
      setError('Failed to load members: ' + e.message)
      setClassMembers([])
    } finally {
      setLoadingMembers(false)
    }
  }

  const openMembersModal = (cls: ClassRow) => {
    setMembersClass(cls)
    setClassMembers([])
    loadClassMembers(cls.id)
  }

  const moveStudentToClass = async (studentId: string, newClassId: string) => {
    try {
      const { error } = await dbProxy
        .from('students')
        .update({ class_id: newClassId })
        .eq('id', studentId)
      if (error) throw error
      setSuccessMsg('Student moved')
      if (membersClass) loadClassMembers(membersClass.id)
      await loadData()
    } catch (e: any) {
      setError('Move failed: ' + e.message)
    }
  }

  const filteredSubjects = useMemo(() => {
    if (!subjectFilterClassId) return subjects
    const linkedIds = new Set(
      classSubjects
        .filter(cs => cs.class_id === subjectFilterClassId)
        .map(cs => cs.subject_id)
    )
    return subjects.filter(s => linkedIds.has(s.id))
  }, [subjects, classSubjects, subjectFilterClassId])

  const classMap = useMemo(() => {
    const m: Record<string, ClassRow> = {}
    for (const c of classes) m[c.id] = c
    return m
  }, [classes])

  const subjectMap = useMemo(() => {
    const m: Record<string, SubjectRow> = {}
    for (const s of subjects) m[s.id] = s
    return m
  }, [subjects])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-slate-600">
          <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
          <span className="text-sm font-medium">Loading classes…</span>
        </div>
      </div>
    )
  }

  return (
    <div className="px-3 sm:px-4 lg:px-6 py-4 sm:py-6 max-w-6xl mx-auto space-y-5">
      <div>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
            <School size={22} strokeWidth={2.2} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Classes & Subjects</h1>
            <p className="text-sm text-slate-500">Manage classes, subjects, and assignments</p>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-800">
            <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
            <p className="text-sm flex-1">{error}</p>
            <button onClick={() => setError('')} className="text-red-400 hover:text-red-600"><X size={14} /></button>
          </div>
        )}
        {successMsg && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800">
            <CheckCircle size={18} className="flex-shrink-0 mt-0.5" />
            <p className="text-sm flex-1">{successMsg}</p>
            <button onClick={() => setSuccessMsg('')} className="text-emerald-400 hover:text-emerald-600"><X size={14} /></button>
          </div>
        )}

        <div className="flex gap-1 bg-white rounded-xl border border-slate-200 p-1">
          <button onClick={() => setTab('classes')} className={'flex-1 py-2.5 rounded-lg text-sm font-medium transition ' + (tab === 'classes' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50')}>
            Classes ({classes.length})
          </button>
          <button onClick={() => setTab('subjects')} className={'flex-1 py-2.5 rounded-lg text-sm font-medium transition ' + (tab === 'subjects' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50')}>
            Subjects ({subjects.length})
          </button>
          <button onClick={() => setTab('assignments')} className={'flex-1 py-2.5 rounded-lg text-sm font-medium transition ' + (tab === 'assignments' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50')}>
            Assignments ({assignments.length})
          </button>
        </div>
      </div>

      <div>
        {/* CLASSES TAB */}
        {tab === 'classes' && (
          <div>
            <div className="flex justify-end mb-3">
              <button
                onClick={() => {
                  setEditingClass(null)
                  setClassForm({ name: '', section: '', tier: 'SSS', class_level: '', next_class_id: '' })
                  setShowClassModal(true)
                }}
                className="h-9 px-4 rounded-lg bg-[#1A237E] text-white border border-[#1A237E] flex items-center gap-1.5 text-xs font-semibold hover:bg-[#283593] transition"
              >
                <Plus size={16} /> New Class
              </button>
            </div>

            {classes.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <div className="w-16 h-16 mx-auto bg-blue-50 rounded-2xl flex items-center justify-center mb-3">
                  <BookOpen size={32} className="text-blue-400" />
                </div>
                <p className="text-gray-500 text-sm">No classes created yet</p>
                <p className="text-gray-400 text-xs mt-1">Tap "New Class" to create your first one</p>
              </div>
            ) : (
              <div className="space-y-2">
                {classes.map((c, i) => {
                  const tierClr = tierColor(c.tier)
                  const teacher = teacherById(c.class_teacher_id)
                  const teacherName = teacherDisplayName(teacher)
                  const subjCount = subjectCountForClass(c.id)
                  const nextClass = classById(c.next_class_id)
                  return (
                    <div key={c.id} className="rounded-xl border border-slate-200 px-4 py-3.5 bg-white hover:shadow-md transition">
                      <div className="flex items-center gap-3.5">
                        {/* Tier-colored avatar */}
                        <div
                          className="w-11 h-11 rounded-[10px] flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: tierClr + '1a' }}
                        >
                          <span className="text-[15px] font-bold" style={{ color: tierClr }}>
                            {c.name ? c.name[0].toUpperCase() : '?'}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-gray-900">
                            {c.name}{c.section ? ' — ' + c.section : ''}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span
                              className="px-2 py-0.5 rounded text-[10px] font-bold"
                              style={{ backgroundColor: tierClr + '1a', color: tierClr }}
                            >
                              {c.tier || 'SSS'}
                            </span>
                            <span className="text-[11px] text-gray-500 flex items-center gap-1">
                              <Users size={11} /> {liveStudentCount(c.id)} students
                            </span>
                            <span className="text-[11px] text-gray-500 flex items-center gap-1">
                              <BookOpen size={11} /> {subjCount} subjects
                            </span>
                            {teacherName && (
                              <span className="text-[11px] text-gray-500 flex items-center gap-1">
                                <User size={11} /> {teacherName}
                              </span>
                            )}
                            {nextClass && (
                              <span className="text-[11px] text-green-600 flex items-center gap-1">
                                <GraduationCap size={11} /> Promotes to: {nextClass.name}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => openMembersModal(c)}
                            className="px-2.5 py-1.5 rounded-lg border border-green-200 bg-green-50 text-[#2E7D32] text-xs font-semibold flex items-center gap-1 hover:bg-green-100"
                            title="View Members"
                          >
                            <UserCheck size={13} /> Members ({liveStudentCount(c.id)})
                          </button>
                          <button
                            onClick={() => {
                              setAssignClass(c)
                              setShowAssignModal(true)
                            }}
                            className="px-2.5 py-1.5 rounded-lg border border-indigo-200 bg-blue-50 text-[#1A237E] text-xs font-semibold flex items-center gap-1 hover:bg-blue-100"
                            title="Manage Subjects"
                          >
                            <Layers size={13} /> Subjects
                          </button>
                          <button
                            onClick={() => {
                              setEditingClass(c)
                              setClassForm({
                                name: c.name,
                                section: c.section || '',
                                tier: c.tier || 'SSS',
                                class_level: c.class_level || '',
                                next_class_id: c.next_class_id || '',
                              })
                              setShowClassModal(true)
                            }}
                            className="w-8 h-8 rounded-lg border border-indigo-200 bg-blue-50 flex items-center justify-center hover:bg-blue-100"
                            title="Edit"
                          >
                            <Pencil size={14} className="text-[#1A237E]" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm({ type: 'Class', id: c.id, name: c.name + (c.section ? ' - ' + c.section : '') })}
                            className="w-8 h-8 rounded-lg border border-red-200 bg-red-50 flex items-center justify-center hover:bg-red-100"
                            title="Delete"
                          >
                            <Trash2 size={14} className="text-red-500" />
                          </button>
                        </div>
                      </div>

                      {/* Form teacher assignment row */}
                      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
                        <span className="text-[11px] text-gray-500 font-medium">Form Teacher:</span>
                        <select
                          value={c.class_teacher_id || ''}
                          onChange={(e) => assignFormTeacher(c.id, e.target.value || null)}
                          className="flex-1 h-8 px-2 rounded-lg border border-gray-200 bg-white text-xs text-gray-900 focus:border-[#1A237E] focus:border-2 outline-none"
                        >
                          <option value="">— None —</option>
                          {teachers.map(t => (
                            <option key={t.id} value={t.id}>
                              {teacherDisplayName(t)}{t.staff_id ? ' (' + t.staff_id + ')' : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* SUBJECTS TAB */}
        {tab === 'subjects' && (
          <div>
            <div className="flex items-center justify-between mb-3 gap-3">
              <div className="flex-1 max-w-xs">
                  <div className="relative">
                    <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <select
                      value={subjectFilterClassId || ''}
                      onChange={(e) => setSubjectFilterClassId(e.target.value || null)}
                      className="w-full h-9 pl-8 pr-3 rounded-lg border border-gray-200 bg-white text-xs text-gray-900 focus:border-[#1A237E] focus:border-2 outline-none"
                    >
                      <option value="">All Subjects</option>
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name}{c.section ? ' - ' + c.section : ''}
                        </option>
                      ))}
                    </select>
                  </div>
              </div>
              <button
                onClick={() => {
                  setEditingSubject(null)
                  setSubjectForm({ name: '', code: '', is_elective: false, description: '' })
                  setShowSubjectModal(true)
                }}
                className="h-9 px-4 rounded-lg bg-[#1A237E] text-white border border-[#1A237E] flex items-center gap-1.5 text-xs font-semibold hover:bg-[#283593] transition"
              >
                <Plus size={16} /> New Subject
              </button>
            </div>

            {subjectFilterClassId && (
              <div className="mb-3 p-2.5 rounded-lg bg-blue-50 border border-blue-200 flex items-center gap-2">
                <Layers size={14} className="text-[#1A237E]" />
                <span className="text-[12px] font-semibold text-[#1A237E]">
                  Showing {filteredSubjects.length} of {subjects.length} subjects assigned to {classById(subjectFilterClassId)?.name}
                </span>
                <button
                  onClick={() => setSubjectFilterClassId(null)}
                  className="ml-auto px-2 py-0.5 rounded bg-[#1A237E]/10 text-[#1A237E] text-[11px] font-semibold hover:bg-[#1A237E]/20"
                >
                  Clear
                </button>
              </div>
            )}

            {filteredSubjects.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <div className="w-16 h-16 mx-auto bg-blue-50 rounded-2xl flex items-center justify-center mb-3">
                  <BookOpen size={32} className="text-blue-400" />
                </div>
                <p className="text-gray-500 text-sm">
                  {subjectFilterClassId ? 'No subjects assigned to this class' : 'No subjects created yet'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredSubjects.map((s, i) => {
                  const csRow = subjectFilterClassId
                    ? classSubjects.find(cs => cs.subject_id === s.id && cs.class_id === subjectFilterClassId)
                    : null
                  const isCompulsory = csRow ? csRow.is_compulsory : !s.is_elective
                  const assignedTeacher = csRow?.teacher_id ? teacherById(csRow.teacher_id) : null

                  return (
                    <div key={s.id} className="rounded-xl border border-slate-200 px-4 py-3 flex items-center gap-3.5 bg-white hover:shadow-md transition">
                      {/* Avatar */}
                      <div
                        className={'w-11 h-11 rounded-[10px] flex items-center justify-center flex-shrink-0 ' + (isCompulsory ? 'bg-[#1A237E]' : 'bg-orange-100')}
                      >
                        <span className={'text-[16px] font-bold ' + (isCompulsory ? 'text-white' : 'text-orange-700')}>
                          {s.name ? s.name[0].toUpperCase() : '?'}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate">{s.name}</div>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          {s.code && <span className="text-[11px] text-gray-400">{s.code}</span>}
                          {subjectFilterClassId && (
                            <span className={'px-2 py-0.5 rounded text-[10px] font-semibold ' + (isCompulsory ? 'bg-blue-50 text-[#1A237E]' : 'bg-orange-50 text-orange-700')}>
                              {isCompulsory ? 'Core' : 'Elective'}
                            </span>
                          )}
                          {assignedTeacher && (
                            <span className="text-[11px] text-gray-500 flex items-center gap-1">
                              <User size={11} /> {teacherDisplayName(assignedTeacher)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => {
                            setEditingSubject(s)
                            setSubjectForm({ name: s.name, code: s.code || '', is_elective: s.is_elective, description: s.description || '' })
                            setShowSubjectModal(true)
                          }}
                          className="w-8 h-8 rounded-lg border border-indigo-200 bg-blue-50 flex items-center justify-center hover:bg-blue-100"
                          title="Edit"
                        >
                          <Pencil size={14} className="text-[#1A237E]" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm({ type: 'Subject', id: s.id, name: s.name })}
                          className="w-8 h-8 rounded-lg border border-red-200 bg-red-50 flex items-center justify-center hover:bg-red-100"
                          title="Delete"
                        >
                          <Trash2 size={14} className="text-red-500" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ASSIGNMENTS TAB */}
        {tab === 'assignments' && (
          <div>
            {assignments.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <div className="w-16 h-16 mx-auto bg-blue-50 rounded-2xl flex items-center justify-center mb-3">
                  <ClipboardList size={32} className="text-blue-400" />
                </div>
                <p className="text-gray-500 text-sm">No assignments created yet</p>
                <p className="text-gray-400 text-xs mt-1">Assignments are created by teachers from their portal</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left text-xs font-bold text-gray-500 uppercase px-4 py-3">Title</th>
                      <th className="text-left text-xs font-bold text-gray-500 uppercase px-4 py-3">Class</th>
                      <th className="text-left text-xs font-bold text-gray-500 uppercase px-4 py-3">Subject</th>
                      <th className="text-left text-xs font-bold text-gray-500 uppercase px-4 py-3">Marks</th>
                      <th className="text-left text-xs font-bold text-gray-500 uppercase px-4 py-3">Due</th>
                      <th className="text-left text-xs font-bold text-gray-500 uppercase px-4 py-3">Status</th>
                      <th className="text-right text-xs font-bold text-gray-500 uppercase px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.map(a => (
                      <tr key={a.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{a.title}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{a.class_id ? classMap[a.class_id]?.name || '-' : '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{a.subject_id ? subjectMap[a.subject_id]?.name || '-' : '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{a.total_marks}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{a.due_date ? new Date(a.due_date).toLocaleDateString() : '-'}</td>
                        <td className="px-4 py-3">
                          <span className={'px-2 py-0.5 rounded text-[10px] font-semibold ' + (a.is_published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                            {a.is_published ? 'Published' : 'Draft'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => setDeleteConfirm({ type: 'Assignment', id: a.id, name: a.title })}
                            className="w-8 h-8 rounded-lg border border-red-200 bg-red-50 flex items-center justify-center hover:bg-red-100 ml-auto"
                          >
                            <Trash2 size={14} className="text-red-500" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Class Modal */}
      {showClassModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4" onClick={() => setShowClassModal(false)}>
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-6 pb-4">
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center">
                  <School size={22} className="text-[#1A237E]" />
                </div>
                <h2 className="text-lg font-bold text-gray-900 tracking-tight">{editingClass ? 'Edit Class' : 'New Class'}</h2>
                <button onClick={() => setShowClassModal(false)} className="ml-auto p-1 text-gray-400 hover:text-gray-600"><X size={22} /></button>
              </div>
            </div>
            <div className="border-t border-gray-200" />
            <div className="flex-1 overflow-y-auto p-6 pt-5 space-y-3">
              <div>
                <label className="text-[13px] text-gray-600 font-medium">Name *</label>
                <input value={classForm.name} onChange={e => setClassForm({ ...classForm, name: e.target.value })} placeholder="e.g. Grade 1, JSS 1" className="mt-1 w-full h-11 px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 focus:border-[#1A237E] focus:border-2 outline-none" />
              </div>
              <div>
                <label className="text-[13px] text-gray-600 font-medium">Section (optional)</label>
                <input value={classForm.section} onChange={e => setClassForm({ ...classForm, section: e.target.value })} placeholder="e.g. A, B, Science" className="mt-1 w-full h-11 px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 focus:border-[#1A237E] focus:border-2 outline-none" />
              </div>
              <div>
                <label className="text-[13px] text-gray-600 font-medium">Tier</label>
                <select value={classForm.tier} onChange={e => setClassForm({ ...classForm, tier: e.target.value })} className="mt-1 w-full h-11 px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 focus:border-[#1A237E] focus:border-2 outline-none">
                  <option value="SSS">SSS (Senior Secondary)</option>
                  <option value="JSS">JSS (Junior Secondary)</option>
                  <option value="PRIMARY">Primary</option>
                </select>
              </div>
              <div>
                <label className="text-[13px] text-gray-600 font-medium">Class Level (optional)</label>
                <input value={classForm.class_level} onChange={e => setClassForm({ ...classForm, class_level: e.target.value })} placeholder="e.g. 100" className="mt-1 w-full h-11 px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 focus:border-[#1A237E] focus:border-2 outline-none" />
              </div>
              <div>
                <label className="text-[13px] text-gray-600 font-medium">Promotes To (optional)</label>
                <select value={classForm.next_class_id} onChange={e => setClassForm({ ...classForm, next_class_id: e.target.value })} className="mt-1 w-full h-11 px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 focus:border-[#1A237E] focus:border-2 outline-none">
                  <option value="">— Graduate / Final Year —</option>
                  {classes.filter(c => c.id !== editingClass?.id).map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}{c.section ? ' - ' + c.section : ''}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-gray-400">Used by Auto-Promote on Students page</p>
              </div>
            </div>
            <div className="border-t border-gray-200 p-6 pt-3 flex gap-3">
              <button onClick={() => setShowClassModal(false)} className="flex-1 h-12 rounded-lg border border-gray-300 text-gray-600 font-semibold text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={saveClass} className="flex-1 h-12 rounded-lg bg-[#1A237E] text-white font-semibold text-sm hover:bg-[#283593] flex items-center justify-center gap-2">
                <Save size={16} /> Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subject Modal */}
      {showSubjectModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4" onClick={() => setShowSubjectModal(false)}>
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-6 pb-4">
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center">
                  <BookMarked size={22} className="text-[#2E7D32]" />
                </div>
                <h2 className="text-lg font-bold text-gray-900 tracking-tight">{editingSubject ? 'Edit Subject' : 'New Subject'}</h2>
                <button onClick={() => setShowSubjectModal(false)} className="ml-auto p-1 text-gray-400 hover:text-gray-600"><X size={22} /></button>
              </div>
            </div>
            <div className="border-t border-gray-200" />
            <div className="flex-1 overflow-y-auto p-6 pt-5 space-y-3">
              <div>
                <label className="text-[13px] text-gray-600 font-medium">Name *</label>
                <input value={subjectForm.name} onChange={e => setSubjectForm({ ...subjectForm, name: e.target.value })} placeholder="e.g. Mathematics" className="mt-1 w-full h-11 px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 focus:border-[#1A237E] focus:border-2 outline-none" />
              </div>
              <div>
                <label className="text-[13px] text-gray-600 font-medium">Code (optional)</label>
                <input value={subjectForm.code} onChange={e => setSubjectForm({ ...subjectForm, code: e.target.value })} placeholder="e.g. MTH" className="mt-1 w-full h-11 px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 focus:border-[#1A237E] focus:border-2 outline-none" />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={subjectForm.is_elective} onChange={e => setSubjectForm({ ...subjectForm, is_elective: e.target.checked })} className="w-4 h-4 rounded" />
                Elective (optional subject)
              </label>
              <div>
                <label className="text-[13px] text-gray-600 font-medium">Description (optional)</label>
                <textarea value={subjectForm.description} onChange={e => setSubjectForm({ ...subjectForm, description: e.target.value })} rows={2} placeholder="Brief description" className="mt-1 w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 focus:border-[#1A237E] focus:border-2 outline-none" />
              </div>
            </div>
            <div className="border-t border-gray-200 p-6 pt-3 flex gap-3">
              <button onClick={() => setShowSubjectModal(false)} className="flex-1 h-12 rounded-lg border border-gray-300 text-gray-600 font-semibold text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={saveSubject} className="flex-1 h-12 rounded-lg bg-[#1A237E] text-white font-semibold text-sm hover:bg-[#283593] flex items-center justify-center gap-2">
                <Save size={16} /> Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subject Assignment Modal */}
      {showAssignModal && assignClass && (
        <ClassSubjectsManager
          classRow={assignClass}
          subjects={subjects}
          classSubjects={classSubjects}
          teachers={teachers}
          schoolId={schoolId}
          onClose={() => {
            setShowAssignModal(false)
            setAssignClass(null)
          }}
          onChanged={loadData}
        />
      )}

      {/* Members Modal */}
      {membersClass && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4"
          onClick={() => { setMembersClass(null); setClassMembers([]) }}
        >
          <div
            className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-2xl max-h-[92vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 pb-4">
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center">
                  <UserCheck size={22} className="text-[#2E7D32]" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-gray-900 tracking-tight">Class Members</h2>
                  <p className="text-[13px] text-gray-400">
                    {membersClass.name}{membersClass.section ? ' - ' + membersClass.section : ''} • {classMembers.length} student{classMembers.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <button onClick={() => { setMembersClass(null); setClassMembers([]) }} className="p-1 text-gray-400 hover:text-gray-600">
                  <X size={22} />
                </button>
              </div>
            </div>

            <div className="border-t border-gray-200" />

            <div className="flex-1 overflow-y-auto p-6 pt-5">
              {loadingMembers ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-10 h-10 border-4 border-[#1A237E] border-t-transparent rounded-full animate-spin" />
                  <p className="mt-3 text-sm text-gray-500">Loading members...</p>
                </div>
              ) : classMembers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <UserCheck size={48} className="text-gray-300 mb-3" />
                  <p className="text-sm font-semibold text-gray-700">No students in this class</p>
                  <p className="text-[13px] text-gray-500 mt-1">Assign students from the Students page</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {classMembers.map((s, i) => {
                    const name = [s.first_name, s.middle_name, s.last_name].filter(Boolean).join(' ') || 'Unknown'
                    const isFemale = (s.gender || '').toLowerCase() === 'female'
                    const photo = (s.passport_url || '').trim()
                    return (
                      <div key={s.id} className={'p-3 rounded-lg border border-gray-200 flex items-center gap-3 ' + (i % 2 === 0 ? 'bg-white' : 'bg-[#FAFBFC]')}>
                        <div className={'w-10 h-10 rounded-full p-0.5 flex-shrink-0 ' + (isFemale ? 'bg-pink-50' : 'bg-blue-50')}>
                          {photo ? (
                            <img src={photo + '?width=80&height=80'} alt="" className="w-full h-full rounded-full object-cover bg-gray-100"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                          ) : (
                            <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                              <User size={16} className={isFemale ? 'text-pink-600' : 'text-blue-700'} />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-gray-900 truncate">{name}</div>
                          <div className="flex flex-wrap items-center gap-2 mt-0.5">
                            {s.admission_no && <span className="text-[11px] text-[#1A237E] bg-blue-50 px-1.5 py-0.5 rounded">{s.admission_no}</span>}
                            {s.parent_name && <span className="text-[11px] text-gray-500 truncate">{s.parent_name}</span>}
                            {s.parent_phone && <span className="text-[11px] text-gray-500 truncate">{s.parent_phone}</span>}
                          </div>
                        </div>
                        <select
                          value={membersClass.id}
                          onChange={(e) => {
                            if (e.target.value && e.target.value !== membersClass.id) {
                              if (window.confirm('Move ' + name + ' to ' + (classes.find(c => c.id === e.target.value)?.name || 'new class') + '?')) {
                                moveStudentToClass(s.id, e.target.value)
                              }
                            }
                          }}
                          className="h-8 px-2 rounded-lg border border-gray-200 bg-white text-[11px] text-gray-700 focus:border-[#1A237E] focus:border-2 outline-none max-w-[140px]"
                          title="Move to different class"
                        >
                          <option value={membersClass.id}>— Move to... —</option>
                          {classes.filter(c => c.id !== membersClass.id).map(c => (
                            <option key={c.id} value={c.id}>{c.name}{c.section ? ' - ' + c.section : ''}</option>
                          ))}
                        </select>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 p-6 pt-3">
              <button onClick={() => { setMembersClass(null); setClassMembers([]) }}
                className="w-full h-12 rounded-lg bg-[#1A237E] text-white font-semibold text-sm hover:bg-[#283593]">
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 size={20} className="text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Delete {deleteConfirm.type}?</h3>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              Delete <strong>{deleteConfirm.name}</strong>? This cannot be undone.
              {deleteConfirm.type === 'Subject' && ' This will also remove the subject from all classes.'}
              {deleteConfirm.type === 'Class' && ' This will also clear all subject assignments for this class.'}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 h-12 rounded-lg border border-gray-300 text-gray-600 font-semibold text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={handleDelete} className="flex-1 h-12 rounded-lg bg-red-600 text-white font-semibold text-sm hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ClassSubjectsManager({
  classRow, subjects, classSubjects, teachers, schoolId, onClose, onChanged,
}: {
  classRow: ClassRow
  subjects: SubjectRow[]
  classSubjects: ClassSubject[]
  teachers: Teacher[]
  schoolId: string
  onClose: () => void
  onChanged: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const linkedCS = classSubjects.filter(cs => cs.class_id === classRow.id)
  const linkedSubjectIds = new Set(linkedCS.map(cs => cs.subject_id))
  const unlinkedSubjects = subjects.filter(s => !linkedSubjectIds.has(s.id))

  const toggleSubject = async (subjectId: string, link: boolean) => {
    setLoading(true)
    setError(null)
    try {
      if (link) {
        const { error } = await dbProxy.from('class_subjects').insert({
          school_id: schoolId,
          class_id: classRow.id,
          subject_id: subjectId,
          is_compulsory: true,
        })
        if (error) throw error
      } else {
        const { error } = await dbProxy
          .from('class_subjects')
          .delete()
          .eq('class_id', classRow.id)
          .eq('subject_id', subjectId)
        if (error) throw error
      }
      await onChanged()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const toggleCompulsory = async (subjectId: string, currentValue: boolean) => {
    setLoading(true)
    setError(null)
    try {
      const { error } = await dbProxy
        .from('class_subjects')
        .update({ is_compulsory: !currentValue })
        .eq('class_id', classRow.id)
        .eq('subject_id', subjectId)
      if (error) throw error
      await onChanged()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const assignTeacher = async (subjectId: string, teacherId: string | null) => {
    setLoading(true)
    setError(null)
    try {
      const { error } = await dbProxy
        .from('class_subjects')
        .update({ teacher_id: teacherId || null })
        .eq('class_id', classRow.id)
        .eq('subject_id', subjectId)
      if (error) throw error
      await onChanged()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-2xl max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-6 pb-4">
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center">
              <Layers size={22} className="text-[#1A237E]" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-gray-900 tracking-tight">Manage Subjects</h2>
              <p className="text-[13px] text-gray-400">
                {classRow.name}{classRow.section ? ' - ' + classRow.section : ''} • {linkedCS.length} subject{linkedCS.length !== 1 ? 's' : ''} linked
              </p>
            </div>
            <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600"><X size={22} /></button>
          </div>
        </div>

        <div className="border-t border-gray-200" />

        <div className="flex-1 overflow-y-auto p-6 pt-5">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-[13px] text-red-700">{error}</div>
          )}

          {/* Linked subjects */}
          <div className="text-[11px] font-bold text-gray-400 tracking-wider uppercase mb-3">
            Linked Subjects ({linkedCS.length})
          </div>
          {linkedCS.length === 0 ? (
            <div className="p-4 rounded-lg bg-gray-50 border border-gray-200 text-center text-[13px] text-gray-500 mb-5">
              No subjects linked yet. Add from the list below.
            </div>
          ) : (
            <div className="space-y-2 mb-5">
              {linkedCS.map(cs => {
                const subject = subjects.find(s => s.id === cs.subject_id)
                if (!subject) return null
                return (
                  <div key={cs.id} className="p-3 rounded-lg border border-gray-200 bg-white">
                    <div className="flex items-center gap-3">
                      <div className={'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ' + (cs.is_compulsory ? 'bg-[#1A237E]' : 'bg-orange-100')}>
                        <span className={'text-[14px] font-bold ' + (cs.is_compulsory ? 'text-white' : 'text-orange-700')}>
                          {subject.name ? subject.name[0].toUpperCase() : '?'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-900">{subject.name}</div>
                        {subject.code && <div className="text-[11px] text-gray-400">{subject.code}</div>}
                      </div>
                      <button
                        onClick={() => toggleCompulsory(cs.subject_id, cs.is_compulsory)}
                        disabled={loading}
                        className={'px-2.5 py-1 rounded-md text-[11px] font-semibold border ' + (cs.is_compulsory ? 'bg-blue-50 text-[#1A237E] border-blue-200' : 'bg-orange-50 text-orange-700 border-orange-200')}
                      >
                        {cs.is_compulsory ? 'Core' : 'Elective'}
                      </button>
                      <button
                        onClick={() => toggleSubject(cs.subject_id, false)}
                        disabled={loading}
                        className="w-8 h-8 rounded-lg border border-red-200 bg-red-50 flex items-center justify-center hover:bg-red-100"
                        title="Unlink"
                      >
                        <Trash2 size={13} className="text-red-500" />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[11px] text-gray-500">Teacher:</span>
                      <select
                        value={cs.teacher_id || ''}
                        onChange={(e) => assignTeacher(cs.subject_id, e.target.value || null)}
                        disabled={loading}
                        className="flex-1 h-8 px-2 rounded-lg border border-gray-200 bg-white text-xs text-gray-900 focus:border-[#1A237E] focus:border-2 outline-none"
                      >
                        <option value="">— None —</option>
                        {teachers.map(t => (
                          <option key={t.id} value={t.id}>
                            {teacherDisplayName(t)}{t.staff_id ? ' (' + t.staff_id + ')' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Available subjects */}
          <div className="text-[11px] font-bold text-gray-400 tracking-wider uppercase mb-3">
            Available Subjects ({unlinkedSubjects.length})
          </div>
          {unlinkedSubjects.length === 0 ? (
            <div className="p-4 rounded-lg bg-gray-50 border border-gray-200 text-center text-[13px] text-gray-500">
              All subjects are linked to this class.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {unlinkedSubjects.map(s => (
                <button
                  key={s.id}
                  onClick={() => toggleSubject(s.id, true)}
                  disabled={loading}
                  className="px-3 py-2 rounded-full border border-gray-300 bg-white text-[13px] font-semibold text-gray-900 hover:border-[#1A237E] hover:bg-blue-50 flex items-center gap-1.5"
                >
                  <Plus size={14} />
                  {s.name}{s.code ? ' (' + s.code + ')' : ''}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 p-6 pt-3">
          <button onClick={onClose} className="w-full h-12 rounded-lg bg-[#1A237E] text-white font-semibold text-sm hover:bg-[#283593]">
            DONE
          </button>
        </div>
      </div>
    </div>
  )
}
