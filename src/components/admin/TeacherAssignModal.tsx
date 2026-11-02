import { useState, useEffect } from "react"
import { dbProxy } from '../../lib/dbProxy'
import {
  X, ClipboardList, BookOpen, Check, Circle, Loader2, AlertTriangle,
  ChevronRight, ArrowRight,
} from 'lucide-react'

interface SchoolClass { id: string; name: string; section: string | null; student_count: number; class_teacher_id?: string | null }

interface ClassSubjectRow {
  id: string
  subject_id: string
  teacher_id: string | null
  class_id: string
  subject: { name: string; code: string } | null
}

export default function TeacherAssignModal({
  teacher,
  classes,
  schoolId,
  onClose,
  onChanged,
}: {
  teacher: { id: string; first_name: string; last_name: string; staff_id: string }
  classes: SchoolClass[]
  schoolId: string
  onClose: () => void
  onChanged: () => void
}) {
  const [formTeacherClassId, setFormTeacherClassId] = useState<string | null>(null)
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null)
  const [classSubjects, setClassSubjects] = useState<ClassSubjectRow[] | null>(null)
  const [assignedSubjectIds, setAssignedSubjectIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      // Find which class this teacher is form teacher of
      const ftClass = classes.find((c) => c.class_teacher_id === teacher.id)
      setFormTeacherClassId(ftClass?.id || null)

      // Find all class_subjects rows where this teacher is assigned
      const { data: assigned, error: aErr } = await dbProxy
        .from('class_subjects')
        .select('id, class_id, subject_id')
        .eq('school_id', schoolId)
        .eq('teacher_id', teacher.id)
      if (aErr) throw aErr
      const assignedMap = new Set<string>()
      for (const a of assigned || []) {
        assignedMap.add(a.class_id + '|' + a.subject_id)
      }
      setAssignedSubjectIds(assignedMap)
      setLoading(false)
    } catch (e: any) {
      setError(e.message)
      setLoading(false)
    }
  }

  const loadClassSubjects = async (classId: string) => {
    setClassSubjects(null)
    try {
      const { data: csRows, error: err } = await dbProxy
        .from('class_subjects')
        .select('id, subject_id, teacher_id, class_id')
        .eq('school_id', schoolId)
        .eq('class_id', classId)
      if (err) throw err

      const subjectIds = (csRows || []).map((r: any) => r.subject_id).filter(Boolean)
      let subjectMap: Record<string, { name: string; code: string }> = {}
      if (subjectIds.length > 0) {
        const { data: subRows } = await dbProxy
          .from('subjects')
          .select('id, name, code')
          .in('id', subjectIds)
        ;(subRows || []).forEach((s: any) => {
          subjectMap[s.id] = { name: s.name, code: s.code || '' }
        })
      }

      const stitched = (csRows || []).map((cs: any) => ({
        ...cs,
        subject: cs.subject_id ? subjectMap[cs.subject_id] || null : null,
      }))
      setClassSubjects(stitched as unknown as ClassSubjectRow[])
    } catch (e: any) {
      setError('Failed to load: ' + e.message)
      setClassSubjects([])
    }
  }

  const assignFormTeacher = async (classId: string | null) => {
    setSaving(true)
    setError(null)
    try {
      if (formTeacherClassId) {
        await dbProxy.from('classes').update({ class_teacher_id: null }).eq('id', formTeacherClassId)
      }
      if (classId) {
        await dbProxy.from('classes').update({ class_teacher_id: teacher.id }).eq('id', classId)
      }
      setFormTeacherClassId(classId)
      // DON'T call onChanged() here — it causes parent reload which resets the modal
    } catch (e: any) {
      setError('Failed: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const toggleSubject = async (classId: string, subjectId: string) => {
    setSaving(true)
    setError(null)
    try {
      const key = classId + '|' + subjectId
      const isAssigned = assignedSubjectIds.has(key)
      if (isAssigned) {
        await dbProxy.from('class_subjects')
          .update({ teacher_id: null })
          .eq('class_id', classId)
          .eq('subject_id', subjectId)
          .eq('teacher_id', teacher.id)
        const next = new Set(assignedSubjectIds)
        next.delete(key)
        setAssignedSubjectIds(next)
        // Update local classSubjects state too
        if (classSubjects) {
          setClassSubjects(classSubjects.map(cs => 
            cs.class_id === classId && cs.subject_id === subjectId 
              ? { ...cs, teacher_id: null } 
              : cs
          ))
        }
      } else {
        await dbProxy.from('class_subjects')
          .update({ teacher_id: teacher.id })
          .eq('class_id', classId)
          .eq('subject_id', subjectId)
        const next = new Set(assignedSubjectIds)
        next.add(key)
        setAssignedSubjectIds(next)
        // Update local classSubjects state too
        if (classSubjects) {
          setClassSubjects(classSubjects.map(cs => 
            cs.class_id === classId && cs.subject_id === subjectId 
              ? { ...cs, teacher_id: teacher.id } 
              : cs
          ))
        }
      }
      // DON'T call onChanged() here — it causes parent reload which resets the modal
      // Parent will reload when modal closes (via onClose handler)
    } catch (e: any) {
      setError('Failed: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const teacherName = [teacher.first_name, teacher.last_name].filter(Boolean).join(' ') || 'Teacher'

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-5 sm:p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700">
              <ClipboardList size={22} strokeWidth={2.2} />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">Manage Assignments</h2>
              <p className="text-xs text-slate-500">{teacherName} • {teacher.staff_id}</p>
            </div>
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600"><X size={22} /></button>
          </div>
        </div>

        <div className="border-t border-slate-100" />

        <div className="flex-1 overflow-y-auto p-5 sm:p-6 pt-5 space-y-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 size={24} className="text-indigo-600 animate-spin" />
              <p className="mt-3 text-sm text-slate-500">Loading assignments…</p>
            </div>
          ) : error ? (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
          ) : (
            <>
              {/* FORM TEACHER SECTION */}
              <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50 border border-emerald-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center">
                    <ClipboardList size={18} className="text-white" strokeWidth={2.2} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-emerald-800">Form Teacher</div>
                    <div className="text-xs text-emerald-700">Assign this teacher as form master of a class</div>
                  </div>
                </div>
                <select
                  value={formTeacherClassId || ''}
                  onChange={(e) => assignFormTeacher(e.target.value || null)}
                  disabled={saving}
                  className="w-full h-11 px-3 py-2.5 rounded-lg border border-emerald-200 bg-white text-sm text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition disabled:opacity-50"
                >
                  <option value="">Not a Form Teacher</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}{c.section ? ' - ' + c.section : ''} ({c.student_count || 0} students)
                    </option>
                  ))}
                </select>
                {formTeacherClassId && (
                  <div className="mt-2.5 px-3 py-2 rounded-lg bg-emerald-100 border border-emerald-300 flex items-center gap-2">
                    <Check size={15} className="text-emerald-700" strokeWidth={2.4} />
                    <span className="text-xs font-semibold text-emerald-800">Currently assigned as Form Teacher</span>
                  </div>
                )}
              </div>

              {/* SUBJECT TEACHER SECTION */}
              <div className="p-4 sm:p-5 rounded-2xl bg-indigo-50 border border-indigo-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center">
                    <BookOpen size={18} className="text-white" strokeWidth={2.2} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-indigo-800">Subject Teacher</div>
                    <div className="text-xs text-indigo-700">Assign subjects this teacher teaches</div>
                  </div>
                </div>

                {/* Step 1: Pick class */}
                <div className="mb-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">1</span>
                    <span className="text-xs font-semibold text-slate-700">Select a class</span>
                  </div>
                  <select
                    value={selectedClassId || ''}
                    onChange={(e) => {
                      const v = e.target.value || null
                      setSelectedClassId(v)
                      if (v) loadClassSubjects(v)
                      else setClassSubjects(null)
                    }}
                    className="w-full h-11 px-3 py-2.5 rounded-lg border border-indigo-200 bg-white text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition"
                  >
                    <option value="">— Choose a class —</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}{c.section ? ' - ' + c.section : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Step 2: Pick subjects */}
                {selectedClassId && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">2</span>
                      <span className="text-xs font-semibold text-slate-700">
                        Tap subjects to assign/unassign
                        {classSubjects && classSubjects.length > 0 && (
                          <span className="ml-1 text-slate-400">({classSubjects.filter(cs => assignedSubjectIds.has(cs.class_id + '|' + cs.subject_id)).length} assigned)</span>
                        )}
                      </span>
                    </div>

                    {classSubjects === null ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 size={20} className="text-indigo-600 animate-spin" />
                      </div>
                    ) : classSubjects.length === 0 ? (
                      <div className="px-3 py-3 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-2">
                        <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-800">
                          No subjects linked to this class yet. Go to <strong>Classes</strong> → click <strong>Subjects</strong> on the class card to add subjects first.
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {classSubjects.map((cs) => {
                          const subj = cs.subject
                          const subjName = subj?.name || 'Unknown'
                          const subjCode = subj?.code || ''
                          const isAssigned = assignedSubjectIds.has(cs.class_id + '|' + cs.subject_id)
                          return (
                            <button
                              key={cs.id}
                              onClick={() => toggleSubject(cs.class_id, cs.subject_id)}
                              disabled={saving}
                              className={'px-3 py-2 rounded-lg border flex items-center gap-1.5 text-xs font-semibold transition disabled:opacity-50 ' +
                                (isAssigned
                                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                  : 'bg-white text-slate-700 border-slate-300 hover:border-indigo-400 hover:bg-indigo-50')
                              }
                            >
                              {isAssigned
                                ? <Check size={14} strokeWidth={2.4} />
                                : <Circle size={14} className="text-slate-300" strokeWidth={2} />
                              }
                              {subjCode ? subjName + ' (' + subjCode + ')' : subjName}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                {!selectedClassId && (
                  <div className="px-3 py-3 rounded-lg bg-slate-50 border border-slate-200 text-center">
                    <p className="text-xs text-slate-400">
                      <ArrowRight size={12} className="inline mr-1" />
                      Pick a class above to see available subjects
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="border-t border-slate-100 p-5 sm:p-6 pt-3">
          <button onClick={() => { onChanged(); onClose() }} className="w-full h-11 rounded-lg bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 transition">
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
