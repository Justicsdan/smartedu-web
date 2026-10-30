import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import {
  Loader2, AlertCircle, CheckCircle, Plus, Trash2, X, Save,
  BookOpen, ChevronRight, Search,
} from 'lucide-react'

interface PaceScore {
  id: string
  student_id: string
  subject_id: string
  pace_no: string
  pt_score: number
}

interface StudentLite {
  id: string
  first_name: string
  middle_name: string | null
  last_name: string
  admission_no: string
}

function studentName(s: StudentLite): string {
  return [s.first_name, s.middle_name, s.last_name].filter(Boolean).join(' ').trim()
}

export default function PaceScoresPage() {
  const { user } = useAuth()
  const schoolId = user?.id || ''

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const [classes, setClasses] = useState<any[]>([])
  const [subjects, setSubjects] = useState<any[]>([])
  const [classId, setClassId] = useState('')
  const [students, setStudents] = useState<StudentLite[]>([])
  const [paceScores, setPaceScores] = useState<Record<string, PaceScore[]>>({})
  const [search, setSearch] = useState('')
  const [editingStudent, setEditingStudent] = useState<StudentLite | null>(null)

  useEffect(() => {
    if (!schoolId) return
    ;(async () => {
      setLoading(true)
      try {
        const [cRes, sRes] = await Promise.all([
          supabase.from('classes').select('id, name, section').eq('school_id', schoolId).order('name'),
          supabase.from('subjects').select('id, name, code').eq('school_id', schoolId).order('name'),
        ])
        setClasses(cRes.data || [])
        setSubjects(sRes.data || [])
      } catch (e: any) {
        setError(e.message || 'Failed to load')
      } finally {
        setLoading(false)
      }
    })()
  }, [schoolId])

  const loadStudents = async (cid: string) => {
    setLoading(true); setError('')
    try {
      const { data: curSession } = await supabase.from('academic_sessions').select('id').eq('school_id', schoolId).eq('is_current', true).maybeSingle()
      const { data: curTerm } = await supabase.from('terms').select('id').eq('school_id', schoolId).eq('is_current', true).maybeSingle()
      const sid = curSession?.id || ''
      const tid = curTerm?.id || ''

      const { data: studs, error: sErr } = await supabase
        .from('students')
        .select('id, first_name, middle_name, last_name, admission_no')
        .eq('class_id', cid)
        .eq('is_active', true)
        .order('first_name')
      if (sErr) throw sErr
      const list = (studs || []) as StudentLite[]
      setStudents(list)

      const scoreMap: Record<string, PaceScore[]> = {}
      for (const s of list) {
        const { data: scores } = await supabase
          .from('ace_pace_scores')
          .select('*')
          .eq('student_id', s.id)
          .eq('session_id', sid)
          .eq('term_id', tid)
        scoreMap[s.id] = (scores || []) as PaceScore[]
      }
      setPaceScores(scoreMap)
    } catch (e: any) {
      setError(e.message || 'Failed to load students')
    } finally {
      setLoading(false)
    }
  }

  const filteredStudents = useMemo(() => {
    if (!search.trim()) return students
    const q = search.toLowerCase()
    return students.filter(s => studentName(s).toLowerCase().includes(q) || (s.admission_no || '').toLowerCase().includes(q))
  }, [students, search])

  const paceCount = (sid: string) => paceScores[sid]?.length || 0
  const avgScore = (sid: string): number | null => {
    const scores = paceScores[sid] || []
    const valid = scores.filter(s => s.pt_score != null)
    if (valid.length === 0) return null
    return valid.reduce((sum, s) => sum + Number(s.pt_score), 0) / valid.length
  }

  if (loading && classes.length === 0) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-[#1A237E] animate-spin" /></div>
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">PACE Scores</h1>
        <p className="text-sm text-gray-500 mt-1">Enter ACE PACE test scores per student per subject</p>
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

      <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Select Class</label>
          <select value={classId} onChange={e => { setClassId(e.target.value); if (e.target.value) loadStudents(e.target.value) }} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30">
            <option value="">Select class</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}{c.section ? ` (${c.section})` : ''}</option>)}
          </select>
        </div>
        {classId && (
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student..." className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30" />
          </div>
        )}
      </div>

      {!classId ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <div className="w-16 h-16 mx-auto bg-blue-50 rounded-2xl flex items-center justify-center mb-3"><BookOpen className="w-8 h-8 text-blue-400" /></div>
          <p className="text-gray-400 text-sm">Select a class to begin</p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-[#1A237E] animate-spin" /></div>
      ) : filteredStudents.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <p className="text-gray-400 text-sm">No students in this class.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredStudents.map(s => {
            const pc = paceCount(s.id)
            const avg = avgScore(s.id)
            return (
              <div key={s.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between hover:shadow-sm transition cursor-pointer" onClick={() => setEditingStudent(s)}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                    {studentName(s).charAt(0) || '?'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{studentName(s)}</p>
                    <p className="text-xs text-gray-400">{s.admission_no || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs text-gray-500">{pc} PACE{pc !== 1 ? 's' : ''}</p>
                    {avg !== null && (
                      <p className={`text-sm font-semibold ${avg < 80 ? 'text-red-600' : 'text-green-600'}`}>Avg: {avg.toFixed(1)}</p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {editingStudent && (
        <PaceEntryModal
          student={editingStudent}
          subjects={subjects}
          existingScores={paceScores[editingStudent.id] || []}
          schoolId={schoolId}
          onClose={() => setEditingStudent(null)}
          onSaved={() => {
            setEditingStudent(null)
            if (classId) loadStudents(classId)
            setSuccessMsg('PACE scores saved')
          }}
        />
      )}
    </div>
  )
}

function PaceEntryModal({ student, subjects, existingScores, schoolId, onClose, onSaved }: {
  student: StudentLite
  subjects: any[]
  existingScores: PaceScore[]
  schoolId: string
  onClose: () => void
  onSaved: () => void
}) {
  const [scores, setScores] = useState<(PaceScore & { subject_id_input?: string; pace_no_input?: string; pt_score_input?: string; isNew?: boolean })[]>(
    existingScores.map(s => ({ ...s }))
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const addRow = () => {
    setScores(prev => [...prev, { id: '', student_id: student.id, subject_id: '', pace_no: '', pt_score: 0, isNew: true }])
  }

  const updateRow = (index: number, field: string, value: any) => {
    setScores(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  const deleteRow = (index: number) => {
    setScores(prev => prev.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    setSaving(true); setError('')
    try {
      const { data: curSession } = await supabase.from('academic_sessions').select('id').eq('school_id', schoolId).eq('is_current', true).maybeSingle()
      const { data: curTerm } = await supabase.from('terms').select('id').eq('school_id', schoolId).eq('is_current', true).maybeSingle()
      const sid = curSession?.id || ''
      const tid = curTerm?.id || ''

      // Delete existing
      const existingIds = existingScores.map(s => s.id)
      if (existingIds.length > 0) {
        await supabase.from('ace_pace_scores').delete().in('id', existingIds)
      }

      // Insert all (existing + new)
      const toInsert = scores.filter(s => s.subject_id && s.pace_no).map(s => ({
        school_id: schoolId,
        student_id: student.id,
        subject_id: s.subject_id,
        session_id: sid,
        term_id: tid,
        pace_no: s.pace_no,
        pt_score: Number(s.pt_score) || 0,
        recorded_by: null,
      }))

      if (toInsert.length > 0) {
        const { error: inErr } = await supabase.from('ace_pace_scores').insert(toInsert)
        if (inErr) throw inErr
      }

      onSaved()
    } catch (e: any) {
      setError(e.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-gray-800">PACE Scores — {studentName(student)}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-3">
          {error && <div className="p-2 bg-red-50 text-red-700 text-sm rounded">{error}</div>}

          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">{scores.length} PACE entries</p>
            <button onClick={addRow} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1A237E] text-white rounded-lg text-xs font-medium hover:bg-[#283593] transition">
              <Plus className="w-3.5 h-3.5" /> Add PACE
            </button>
          </div>

          {scores.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">No PACE scores yet. Click "Add PACE" to begin.</p>
          ) : (
            <div className="space-y-2">
              {scores.map((s, i) => (
                <div key={i} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <label className="block text-[10px] text-gray-500 mb-0.5">Subject</label>
                    <select value={s.subject_id} onChange={e => updateRow(i, 'subject_id', e.target.value)} className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#1A237E]/30">
                      <option value="">Select subject</option>
                      {subjects.map(sub => <option key={sub.id} value={sub.id}>{sub.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-0.5">PACE No</label>
                    <input value={s.pace_no} onChange={e => updateRow(i, 'pace_no', e.target.value)} placeholder="e.g., 1041" className="w-20 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#1A237E]/30" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-0.5">Score</label>
                    <input type="number" value={s.pt_score} onChange={e => updateRow(i, 'pt_score', e.target.value)} className="w-16 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#1A237E]/30" />
                  </div>
                  <button onClick={() => deleteRow(i)} className="text-red-400 hover:text-red-600 mt-4"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 p-5 border-t border-gray-100 sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-[#1A237E] text-white rounded-lg text-sm font-medium hover:bg-[#283593] transition disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
