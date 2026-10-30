import { BookOpen, ClipboardList, Pencil, Trash2, Users } from 'lucide-react';

import { useState, useEffect, useMemo } from 'react'

const SUPABASE_URL = 'https://tcjsmkhmfjigutfhjtem.supabase.co'
const ANON_KEY = 'sb_publishable_zWDvjhEldcV8eutnlRypGA_LGpOUhkg'

interface SchoolClass {
  id: string
  name: string
  section: string
  tier: string
  class_level: string
  student_count?: number
}

interface Subject {
  id: string
  name: string
  code: string
  linked_count?: number
}

interface Assignment {
  id: string
  title: string
  class_id: string
  subject_id: string
  total_marks: number
  due_date: string
  is_published: boolean
}

export default function ClassesPage() {
  const [activeTab, setActiveTab] = useState<'classes' | 'subjects' | 'assignments'>('classes')
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: string; id: string; name: string } | null>(null)

  useEffect(() => {
    fetchAll()
  }, [])

  const fetchAll = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('smartedu_user') || '{}')
      const schoolId = user.id || user.school_id
      if (!schoolId) { setLoading(false); return }

      const headers = { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` }
      const [clsRes, subRes, assRes] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/classes?school_id=eq.${schoolId}&select=id,name,section,tier,class_level&order=name.asc`, { headers }),
        fetch(`${SUPABASE_URL}/rest/v1/subjects?school_id=eq.${schoolId}&select=id,name,code&order=name.asc`, { headers }),
        fetch(`${SUPABASE_URL}/rest/v1/assignments?school_id=eq.${schoolId}&select=id,title,class_id,subject_id,total_marks,due_date,is_published&order=created_at.desc`, { headers }),
      ])

      setClasses(await clsRes.json() || [])
      setSubjects(await subRes.json() || [])
      setAssignments(await assRes.json() || [])
    } catch (err) {
      console.error('Error fetching data:', err)
    } finally {
      setLoading(false)
    }
  }

  const deleteItem = async (type: string, id: string) => {
    try {
      const table = type === 'Class' ? 'classes' : type === 'Subject' ? 'subjects' : 'assignments'
      await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
        method: 'DELETE',
        headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
      })
      if (type === 'Class') setClasses(classes.filter(c => c.id !== id))
      else if (type === 'Subject') setSubjects(subjects.filter(s => s.id !== id))
      else setAssignments(assignments.filter(a => a.id !== id))
      setDeleteConfirm(null)
    } catch (err) {
      console.error('Delete error:', err)
    }
  }

  const tierColor = (tier: string) => {
    switch (tier) {
      case 'JSS': return { bg: '#FFF3E0', text: '#E65100' }
      case 'PRIMARY': return { bg: '#F3E5F5', text: '#7B1FA2' }
      default: return { bg: '#E3F2FD', text: '#1565C0' }
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="w-8 h-8 border-3 border-[#1A237E] border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <div className="p-6 bg-[#F7F8FA] min-h-full">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 bg-[#F0F4FF] rounded-xl flex items-center justify-center"><BookOpen className="text-xl w-4 h-4" /></div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-800">Classes & Subjects</h1>
            <p className="text-xs text-gray-400 mt-0.5">{classes.length} classes · {subjects.length} subjects · {assignments.length} assignments</p>
          </div>
        </div>

        {/* Tabs (translated from Flutter TabController) */}
        <div className="flex gap-1 bg-white rounded-xl p-1 border border-gray-200">
          {[
            { key: 'classes', label: 'Classes', count: classes.length },
            { key: 'subjects', label: 'Subjects', count: subjects.length },
            { key: 'assignments', label: 'Assignments', count: assignments.length },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition ${
                activeTab === tab.key
                  ? 'bg-[#1A237E] text-white'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              {tab.label}
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${activeTab === tab.key ? 'bg-white/20' : 'bg-gray-100'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Classes Tab */}
      {activeTab === 'classes' && (
        <div className="space-y-3">
          {classes.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center border border-gray-100">
              <BookOpen className="text-4xl mb-3 w-6 h-6" />
              <p className="text-gray-400 text-sm">No classes yet. Tap "Add New" to create your first class.</p>
            </div>
          ) : (
            classes.map((c, idx) => {
              const tc = tierColor(c.tier || '')
              return (
                <div key={c.id} className={`p-4 rounded-xl border border-gray-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-[#FAFBFC]'}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-11 h-11 bg-[#F0F4FF] rounded-xl flex items-center justify-center shrink-0">
                      <BookOpen className="text-lg w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {idx + 1}. {c.name} - {c.section || 'A'}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {c.tier && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ backgroundColor: tc.bg, color: tc.text }}>
                            {c.tier}
                          </span>
                        )}
                        <span className="text-xs text-gray-400">{c.student_count || 0} students</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button className="flex items-center gap-1 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg text-xs font-medium text-green-700 hover:bg-green-100 transition">
                      <BookOpen className="w-4 h-4 inline-block" /> Subjects
                    </button>
                    <button className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-xs font-medium text-blue-700 hover:bg-blue-100 transition">
                      <Users className="w-4 h-4 inline-block" /> Students
                    </button>
                    <button className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg text-xs font-medium text-indigo-700 hover:bg-indigo-100 transition">
                      <Pencil className="w-4 h-4 inline-block" /> Edit
                    </button>
                    <button
                      onClick={() => setDeleteConfirm({ type: 'Class', id: c.id, name: `${c.name} - ${c.section}` })}
                      className="flex items-center gap-1 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg text-xs font-medium text-red-700 hover:bg-red-100 transition"
                    >
                      <Trash2 className="w-4 h-4 inline-block" /> Delete
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Subjects Tab */}
      {activeTab === 'subjects' && (
        <div className="space-y-2">
          {subjects.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center border border-gray-100">
              <BookOpen className="text-4xl mb-3 w-6 h-6" />
              <p className="text-gray-400 text-sm">No subjects yet. Tap "Add New" to create your first subject.</p>
            </div>
          ) : (
            subjects.map((s, idx) => (
              <div key={s.id} className={`flex items-center gap-3 p-4 rounded-xl border border-gray-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-[#FAFBFC]'}`}>
                <span className="text-xs font-bold text-gray-400 w-6 text-center shrink-0">{idx + 1}</span>
                <div className="w-1 h-11 bg-green-600 rounded shrink-0" />
                <div className="w-11 h-11 bg-green-50 rounded-xl flex items-center justify-center shrink-0">
                  <BookOpen className="text-lg w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{s.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {s.code && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-500">{s.code}</span>}
                    <span className="px-2 py-0.5 rounded text-[10px] bg-gray-100 text-gray-500">{s.linked_count || 0} classes</span>
                  </div>
                </div>
                <button
                  onClick={() => setDeleteConfirm({ type: 'Subject', id: s.id, name: s.name })}
                  className="w-8 h-8 rounded-lg border border-red-300 bg-red-50 flex items-center justify-center hover:bg-red-100 transition shrink-0"
                  title="Delete"
                >
                  <Trash2 className="text-xs w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Assignments Tab */}
      {activeTab === 'assignments' && (
        <div className="space-y-2">
          {assignments.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center border border-gray-100">
              <ClipboardList className="text-4xl mb-3 w-6 h-6" />
              <p className="text-gray-400 text-sm">No assignments yet. Tap "Add New" to create your first assignment.</p>
            </div>
          ) : (
            assignments.map((a, idx) => (
              <div key={a.id} className={`flex items-center gap-3 p-4 rounded-xl border border-gray-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-[#FAFBFC]'}`}>
                <span className="text-xs font-bold text-gray-400 w-6 text-center shrink-0">{idx + 1}</span>
                <div className="w-1 h-11 bg-orange-500 rounded shrink-0" />
                <div className="w-11 h-11 bg-orange-50 rounded-xl flex items-center justify-center shrink-0">
                  <ClipboardList className="text-lg w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{a.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-400">Marks: {a.total_marks || 100}</span>
                    {a.due_date && <span className="text-xs text-gray-400">· Due: {new Date(a.due_date).toLocaleDateString()}</span>}
                    {a.is_published ? <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700">Published</span> : <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-500">Draft</span>}
                  </div>
                </div>
                <button
                  onClick={() => setDeleteConfirm({ type: 'Assignment', id: a.id, name: a.title })}
                  className="w-8 h-8 rounded-lg border border-red-300 bg-red-50 flex items-center justify-center hover:bg-red-100 transition shrink-0"
                  title="Delete"
                >
                  <Trash2 className="text-xs w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={() => setDeleteConfirm(null)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative bg-white rounded-2xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center"><Trash2 className="text-xl w-4 h-4" /></div>
              <div>
                <h3 className="font-bold text-gray-800">Delete {deleteConfirm.type}?</h3>
                <p className="text-sm text-gray-500">{deleteConfirm.name} — This cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition">Cancel</button>
              <button onClick={() => deleteItem(deleteConfirm.type, deleteConfirm.id)} className="flex-1 py-2.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Add FAB */}
      <button className="fixed bottom-6 right-6 w-14 h-14 bg-[#1A237E] text-white rounded-2xl shadow-lg flex items-center justify-center hover:bg-[#283593] hover:scale-105 transition z-40">
        <span className="text-2xl">+</span>
      </button>
    </div>
  )
}
