import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { BookOpen, Users, Pencil, Trash2, Plus, Loader2, AlertCircle, CheckCircle, X, Save, ClipboardList } from 'lucide-react'

type Tab = 'classes' | 'subjects' | 'assignments'

interface ClassRow {
  id: string
  name: string
  section: string | null
  tier: string | null
  class_level: string | null
  student_count: number
  assessment_types?: any
}

interface SubjectRow {
  id: string
  name: string
  code: string | null
  is_elective: boolean
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
  const [classSubjects, setClassSubjects] = useState<any[]>([])

  const [showClassModal, setShowClassModal] = useState(false)
  const [showSubjectModal, setShowSubjectModal] = useState(false)
  const [editingClass, setEditingClass] = useState<ClassRow | null>(null)
  const [editingSubject, setEditingSubject] = useState<SubjectRow | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: string; id: string; name: string } | null>(null)

  // Form state for class
  const [classForm, setClassForm] = useState({ name: '', section: '', tier: 'SSS', class_level: '' })
  // Form state for subject
  const [subjectForm, setSubjectForm] = useState({ name: '', code: '', is_elective: false })

  useEffect(() => {
    if (!schoolId) return
    ;(async () => {
      setLoading(true)
      try {
        const [cRes, sRes, aRes, csRes] = await Promise.all([
          supabase.from('classes').select('*').eq('school_id', schoolId).order('name'),
          supabase.from('subjects').select('*').eq('school_id', schoolId).order('name'),
          supabase.from('assignments').select('*').eq('school_id', schoolId).order('created_at', { ascending: false }),
          supabase.from('class_subjects').select('*').eq('school_id', schoolId),
        ])
        if (cRes.error) throw cRes.error
        if (sRes.error) throw sRes.error
        if (aRes.error) throw aRes.error
        if (csRes.error) throw csRes.error
        setClasses((cRes.data || []) as ClassRow[])
        setSubjects((sRes.data || []) as SubjectRow[])
        setAssignments((aRes.data || []) as AssignmentRow[])
        setClassSubjects(csRes.data || [])
      } catch (e: any) {
        setError(e.message || 'Failed to load data')
      } finally {
        setLoading(false)
      }
    })()
  }, [schoolId])

  const subjectCountForClass = (classId: string) => classSubjects.filter(cs => cs.class_id === classId).length

  const saveClass = async () => {
    if (!classForm.name.trim()) { setError('Class name is required'); return }
    setError('')
    try {
      if (editingClass) {
        const { error } = await supabase.from('classes').update({
          name: classForm.name.trim(),
          section: classForm.section || null,
          tier: classForm.tier,
          class_level: classForm.class_level || null,
        }).eq('id', editingClass.id)
        if (error) throw error
        setSuccessMsg('Class updated')
      } else {
        const { error } = await supabase.from('classes').insert({
          school_id: schoolId,
          name: classForm.name.trim(),
          section: classForm.section || null,
          tier: classForm.tier,
          class_level: classForm.class_level || null,
        })
        if (error) throw error
        setSuccessMsg('Class created')
      }
      setShowClassModal(false)
      const { data } = await supabase.from('classes').select('*').eq('school_id', schoolId).order('name')
      setClasses((data || []) as ClassRow[])
    } catch (e: any) {
      setError(e.message || 'Save failed')
    }
  }

  const saveSubject = async () => {
    if (!subjectForm.name.trim()) { setError('Subject name is required'); return }
    setError('')
    try {
      if (editingSubject) {
        const { error } = await supabase.from('subjects').update({
          name: subjectForm.name.trim(),
          code: subjectForm.code || null,
          is_elective: subjectForm.is_elective,
        }).eq('id', editingSubject.id)
        if (error) throw error
        setSuccessMsg('Subject updated')
      } else {
        const { error } = await supabase.from('subjects').insert({
          school_id: schoolId,
          name: subjectForm.name.trim(),
          code: subjectForm.code || null,
          is_elective: subjectForm.is_elective,
        })
        if (error) throw error
        setSuccessMsg('Subject created')
      }
      setShowSubjectModal(false)
      const { data } = await supabase.from('subjects').select('*').eq('school_id', schoolId).order('name')
      setSubjects((data || []) as SubjectRow[])
    } catch (e: any) {
      setError(e.message || 'Save failed')
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    const { type, id } = deleteConfirm
    const table = type === 'Class' ? 'classes' : type === 'Subject' ? 'subjects' : 'assignments'
    try {
      const { error } = await supabase.from(table).delete().eq('id', id)
      if (error) throw error
      if (type === 'Class') setClasses(prev => prev.filter(c => c.id !== id))
      if (type === 'Subject') setSubjects(prev => prev.filter(s => s.id !== id))
      if (type === 'Assignment') setAssignments(prev => prev.filter(a => a.id !== id))
      setDeleteConfirm(null)
      setSuccessMsg(`${type} deleted`)
    } catch (e: any) {
      setError(e.message || 'Delete failed')
    }
  }

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
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-[#1A237E] animate-spin" /></div>
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Classes & Subjects</h1>
          <p className="text-sm text-gray-500 mt-1">Manage classes, subjects, and assignments</p>
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

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-xl border border-gray-100 p-1">
        <button onClick={() => setTab('classes')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${tab === 'classes' ? 'bg-[#1A237E] text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
          Classes ({classes.length})
        </button>
        <button onClick={() => setTab('subjects')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${tab === 'subjects' ? 'bg-[#1A237E] text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
          Subjects ({subjects.length})
        </button>
        <button onClick={() => setTab('assignments')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${tab === 'assignments' ? 'bg-[#1A237E] text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
          Assignments ({assignments.length})
        </button>
      </div>

      {/* Classes Tab */}
      {tab === 'classes' && (
        <div>
          <div className="flex justify-end mb-3">
            <button onClick={() => { setEditingClass(null); setClassForm({ name: '', section: '', tier: 'SSS', class_level: '' }); setShowClassModal(true) }} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1A237E] text-white rounded-lg text-xs font-medium hover:bg-[#283593] transition">
              <Plus className="w-3.5 h-3.5" /> New Class
            </button>
          </div>
          {classes.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
              <div className="w-16 h-16 mx-auto bg-blue-50 rounded-2xl flex items-center justify-center mb-3"><BookOpen className="w-8 h-8 text-blue-400" /></div>
              <p className="text-gray-400 text-sm">No classes created yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {classes.map(c => (
                <div key={c.id} className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center"><BookOpen className="w-5 h-5 text-blue-600" /></div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{c.name}</p>
                        <p className="text-xs text-gray-400">{c.section || 'No section'} · {c.tier || 'SSS'}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => { setEditingClass(c); setClassForm({ name: c.name, section: c.section || '', tier: c.tier || 'SSS', class_level: c.class_level || '' }); setShowClassModal(true) }} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setDeleteConfirm({ type: 'Class', id: c.id, name: c.name })} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {c.student_count || 0} students</span>
                    <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {subjectCountForClass(c.id)} subjects</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Subjects Tab */}
      {tab === 'subjects' && (
        <div>
          <div className="flex justify-end mb-3">
            <button onClick={() => { setEditingSubject(null); setSubjectForm({ name: '', code: '', is_elective: false }); setShowSubjectModal(true) }} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1A237E] text-white rounded-lg text-xs font-medium hover:bg-[#283593] transition">
              <Plus className="w-3.5 h-3.5" /> New Subject
            </button>
          </div>
          {subjects.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
              <div className="w-16 h-16 mx-auto bg-blue-50 rounded-2xl flex items-center justify-center mb-3"><BookOpen className="w-8 h-8 text-blue-400" /></div>
              <p className="text-gray-400 text-sm">No subjects created yet.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Name</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Code</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Type</th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map(s => (
                    <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-800">{s.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{s.code || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${s.is_elective ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                          {s.is_elective ? 'Elective' : 'Compulsory'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => { setEditingSubject(s); setSubjectForm({ name: s.name, code: s.code || '', is_elective: s.is_elective }); setShowSubjectModal(true) }} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition mr-1">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setDeleteConfirm({ type: 'Subject', id: s.id, name: s.name })} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition">
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* Assignments Tab */}
      {tab === 'assignments' && (
        <div>
          {assignments.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
              <div className="w-16 h-16 mx-auto bg-blue-50 rounded-2xl flex items-center justify-center mb-3"><ClipboardList className="w-8 h-8 text-blue-400" /></div>
              <p className="text-gray-400 text-sm">No assignments created yet.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Title</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Class</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Subject</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Total Marks</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Due Date</th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map(a => (
                    <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-800">{a.title}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{a.class_id ? classMap[a.class_id]?.name || '-' : '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{a.subject_id ? subjectMap[a.subject_id]?.name || '-' : '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{a.total_marks}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{a.due_date ? new Date(a.due_date).toLocaleDateString() : '-'}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => setDeleteConfirm({ type: 'Assignment', id: a.id, name: a.title })} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition">
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* Class Modal */}
      {showClassModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowClassModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800">{editingClass ? 'Edit Class' : 'New Class'}</h2>
              <button onClick={() => setShowClassModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Name *</label>
                <input value={classForm.name} onChange={e => setClassForm({ ...classForm, name: e.target.value })} placeholder="e.g., SS1" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Section</label>
                <input value={classForm.section} onChange={e => setClassForm({ ...classForm, section: e.target.value })} placeholder="e.g., A" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Tier</label>
                <select value={classForm.tier} onChange={e => setClassForm({ ...classForm, tier: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30">
                  <option value="SSS">SSS (Senior)</option>
                  <option value="JSS">JSS (Junior)</option>
                  <option value="PRIMARY">Primary</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Class Level</label>
                <input value={classForm.class_level} onChange={e => setClassForm({ ...classForm, class_level: e.target.value })} placeholder="e.g., 100" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30" />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-5 border-t border-gray-100">
              <button onClick={() => setShowClassModal(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg">Cancel</button>
              <button onClick={saveClass} className="flex items-center gap-2 px-4 py-2 bg-[#1A237E] text-white rounded-lg text-sm font-medium hover:bg-[#283593] transition">
                <Save className="w-4 h-4" /> Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subject Modal */}
      {showSubjectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowSubjectModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800">{editingSubject ? 'Edit Subject' : 'New Subject'}</h2>
              <button onClick={() => setShowSubjectModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Name *</label>
                <input value={subjectForm.name} onChange={e => setSubjectForm({ ...subjectForm, name: e.target.value })} placeholder="e.g., Mathematics" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Code</label>
                <input value={subjectForm.code} onChange={e => setSubjectForm({ ...subjectForm, code: e.target.value })} placeholder="e.g., MTH" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30" />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={subjectForm.is_elective} onChange={e => setSubjectForm({ ...subjectForm, is_elective: e.target.checked })} className="rounded" />
                Elective (optional subject)
              </label>
            </div>
            <div className="flex items-center justify-end gap-2 p-5 border-t border-gray-100">
              <button onClick={() => setShowSubjectModal(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg">Cancel</button>
              <button onClick={saveSubject} className="flex items-center gap-2 px-4 py-2 bg-[#1A237E] text-white rounded-lg text-sm font-medium hover:bg-[#283593] transition">
                <Save className="w-4 h-4" /> Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0"><Trash2 className="w-5 h-5 text-red-600" /></div>
              <div>
                <h3 className="font-bold text-gray-800">Delete {deleteConfirm.type}?</h3>
                <p className="text-sm text-gray-500 mt-1">{deleteConfirm.name} — This cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition">Cancel</button>
              <button onClick={handleDelete} className="flex-1 py-2.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
