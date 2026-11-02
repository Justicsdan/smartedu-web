import { useState, useEffect, useMemo, useCallback } from "react"
import { dbProxy } from '../../lib/dbProxy'
import { useAuth } from '../../contexts/AuthContext'
import {
  Loader2, AlertCircle, CheckCircle, Save, Users, Calendar,
  CheckCircle2, XCircle, Clock, PauseCircle, Search,
} from 'lucide-react'

interface Student {
  id: string
  first_name: string
  last_name: string
  admission_no: string
}

interface AttendanceRow {
  id?: string
  student_id: string
  status: string
  remark: string
}

function studentName(s: Student): string {
  return `${s.first_name ?? ''} ${s.last_name ?? ''}`.trim()
}

const STATUS_OPTIONS = [
  { value: 'present', label: 'Present', icon: CheckCircle2, color: '#10b981', bg: '#ECFDF5' },
  { value: 'absent', label: 'Absent', icon: XCircle, color: '#ef4444', bg: '#FEF2F2' },
  { value: 'late', label: 'Late', icon: Clock, color: '#f59e0b', bg: '#FFFBEB' },
  { value: 'excused', label: 'Excused', icon: PauseCircle, color: '#3b82f6', bg: '#EFF6FF' },
]

export default function TeacherAttendance() {
  const { user } = useAuth()
  const teacherId = user?.id || ''
  const schoolId = user?.school_id || user?.schoolId || ''

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const [formMasterClass, setFormMasterClass] = useState<any>(null)
  const [sessionId, setSessionId] = useState('')
  const [termId, setTermId] = useState('')

  const [students, setStudents] = useState<Student[]>([])
  const [attendance, setAttendance] = useState<Record<string, AttendanceRow>>({})
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10))
  const [search, setSearch] = useState('')

  // Load form master class + session/term
  useEffect(() => {
    if (!teacherId || !schoolId) return
    ;(async () => {
      try {
        const [fmRes, sessRes, termRes] = await Promise.all([
          dbProxy.from('classes').select('id, name, section, tier').eq('school_id', schoolId).eq('class_teacher_id', teacherId).maybeSingle(),
          dbProxy.from('academic_sessions').select('id').eq('school_id', schoolId).eq('is_current', true).maybeSingle(),
          dbProxy.from('terms').select('id').eq('school_id', schoolId).eq('is_current', true).maybeSingle(),
        ])
        if (fmRes.data) setFormMasterClass(fmRes.data)
        if (sessRes.data) setSessionId(sessRes.data.id)
        if (termRes.data) setTermId(termRes.data.id)
      } catch (e: any) {
        setError(e.message || 'Failed to load')
      } finally {
        setLoading(false)
      }
    })()
  }, [teacherId, schoolId])

  // Load students + attendance when class + date changes
  const loadData = useCallback(async () => {
    if (!formMasterClass?.id || !sessionId || !termId || !selectedDate) return
    setLoading(true)
    try {
      const { data: studs } = await dbProxy
        .from('students')
        .select('id, first_name, last_name, admission_no')
        .eq('class_id', formMasterClass.id)
        .eq('is_active', true)
        .order('first_name')
      const list = (studs || []) as Student[]
      setStudents(list)

      const { data: existing } = await dbProxy
        .from('attendance')
        .select('id, student_id, status, remark')
        .eq('school_id', schoolId)
        .eq('class_id', formMasterClass.id)
        .eq('session_id', sessionId)
        .eq('term_id', termId)
        .eq('date', selectedDate)

      const map: Record<string, AttendanceRow> = {}
      for (const s of list) {
        const ex = (existing || []).find((r: any) => r.student_id === s.id)
        map[s.id] = ex ? { id: ex.id, student_id: s.id, status: ex.status || 'present', remark: ex.remark || '' } : { student_id: s.id, status: 'present', remark: '' }
      }
      setAttendance(map)
    } catch (e: any) {
      setError(e.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [formMasterClass, sessionId, termId, selectedDate, schoolId])

  useEffect(() => { loadData() }, [loadData])

  const setStatus = (studentId: string, status: string) => {
    setAttendance(prev => ({ ...prev, [studentId]: { ...prev[studentId], status } }))
    setSuccessMsg('')
  }

  const setRemark = (studentId: string, remark: string) => {
    setAttendance(prev => ({ ...prev, [studentId]: { ...prev[studentId], remark } }))
  }

  const filteredStudents = useMemo(() => {
    if (!search.trim()) return students
    const q = search.toLowerCase()
    return students.filter(s => studentName(s).toLowerCase().includes(q) || s.admission_no?.toLowerCase().includes(q))
  }, [students, search])

  const stats = useMemo(() => {
    const total = students.length
    const present = students.filter(s => (attendance[s.id]?.status || 'present') === 'present').length
    const absent = students.filter(s => attendance[s.id]?.status === 'absent').length
    const late = students.filter(s => attendance[s.id]?.status === 'late').length
    const excused = students.filter(s => attendance[s.id]?.status === 'excused').length
    return { total, present, absent, late, excused }
  }, [students, attendance])

  const markAllPresent = () => {
    const next: Record<string, AttendanceRow> = {}
    for (const s of students) {
      next[s.id] = { ...attendance[s.id], status: 'present' }
    }
    setAttendance(next)
    setSuccessMsg('')
  }

  const handleSave = async () => {
    if (!formMasterClass?.id || !sessionId || !termId) return
    setSaving(true); setError(''); setSuccessMsg('')
    try {
      let saved = 0
      for (const s of students) {
        const row = attendance[s.id]
        if (!row) continue

        if (row.id) {
          const { error: upErr } = await dbProxy.from('attendance')
            .update({ status: row.status, remark: row.remark, recorded_by: teacherId })
            .eq('id', row.id)
          if (upErr) throw upErr
        } else {
          const { error: inErr, data } = await dbProxy.from('attendance')
            .insert({
              school_id: schoolId,
              student_id: s.id,
              class_id: formMasterClass.id,
              session_id: sessionId,
              term_id: termId,
              date: selectedDate,
              status: row.status,
              remark: row.remark,
              recorded_by: teacherId,
            })
            .select('id')
            .single()
          if (inErr) throw inErr
          if (data) attendance[s.id].id = data.id
        }
        saved++
      }
      setSuccessMsg(`Saved attendance for ${saved} students.`)
    } catch (e: any) {
      setError(e.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (loading && students.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-slate-600">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="text-sm font-medium">Loading…</span>
        </div>
      </div>
    )
  }

  if (!formMasterClass) {
    return (
      <div className="px-3 sm:px-4 lg:px-6 py-4 sm:py-6 max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 py-16 text-center">
          <div className="w-16 h-16 mx-auto bg-amber-50 rounded-2xl flex items-center justify-center mb-4 text-amber-400">
            <Users size={32} strokeWidth={2} />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">Not a Form Master</h3>
          <p className="text-sm text-slate-500">Only form masters can mark attendance. Contact your admin to be assigned as a form teacher.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-3 sm:px-4 lg:px-6 py-4 sm:py-6 max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Attendance</h1>
          <p className="text-sm text-slate-500 mt-1">{formMasterClass.name}{formMasterClass.section ? ` ${formMasterClass.section}` : ''} · {selectedDate}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={markAllPresent} disabled={saving}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-semibold hover:bg-emerald-100 transition disabled:opacity-50">
            <CheckCircle2 size={14} strokeWidth={2.4} /> Mark All Present
          </button>
          <button onClick={handleSave} disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50 shadow-sm">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-800">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          <p className="text-sm flex-1">{error}</p>
        </div>
      )}
      {successMsg && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800">
          <CheckCircle size={18} className="flex-shrink-0 mt-0.5" />
          <p className="text-sm flex-1">{successMsg}</p>
        </div>
      )}

      {/* Date picker */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex items-center gap-3">
        <Calendar size={18} className="text-slate-400" strokeWidth={2.2} />
        <input type="date" value={selectedDate} onChange={e => { setSelectedDate(e.target.value); setSuccessMsg('') }}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition" />
        <span className="text-xs text-slate-400 ml-auto">{stats.total} students</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {STATUS_OPTIONS.map(opt => {
          const count = stats[opt.value as keyof typeof stats] || 0
          const Icon = opt.icon
          return (
            <div key={opt.value} className="bg-white rounded-xl shadow-sm border border-slate-200 p-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2" style={{ backgroundColor: opt.bg, color: opt.color }}>
                <Icon size={14} strokeWidth={2.2} />
              </div>
              <div className="text-lg font-bold text-slate-900">{count}</div>
              <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">{opt.label}</div>
            </div>
          )
        })}
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" strokeWidth={2.2} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student…"
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-blue-400 focus:bg-white transition" />
        </div>
      </div>

      {/* Student list */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {filteredStudents.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-16 h-16 mx-auto bg-slate-100 rounded-2xl flex items-center justify-center mb-4 text-slate-400">
              <Users size={32} strokeWidth={2} />
            </div>
            <p className="text-sm text-slate-500">{students.length === 0 ? 'No students in this class.' : 'No students match your search.'}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredStudents.map((s, i) => {
              const row = attendance[s.id] || { student_id: s.id, status: 'present', remark: '' }
              const currentStatus = STATUS_OPTIONS.find(o => o.value === row.status) || STATUS_OPTIONS[0]
              return (
                <div key={s.id} className="p-4 hover:bg-slate-50/50 transition">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                        {studentName(s).charAt(0) || '?'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{studentName(s)}</p>
                        <p className="text-xs text-slate-400">{s.admission_no || '-'}</p>
                      </div>
                    </div>
                  </div>
                  {/* Status buttons */}
                  <div className="flex gap-2 mt-2">
                    {STATUS_OPTIONS.map(opt => {
                      const isActive = row.status === opt.value
                      const Icon = opt.icon
                      return (
                        <button key={opt.value} onClick={() => setStatus(s.id, opt.value)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-semibold transition"
                          style={{
                            backgroundColor: isActive ? opt.color : opt.bg,
                            color: isActive ? '#fff' : opt.color,
                            borderColor: isActive ? opt.color : 'transparent',
                          }}>
                          <Icon size={13} strokeWidth={2.4} />
                          {opt.label}
                        </button>
                      )
                    })}
                  </div>
                  {/* Remark */}
                  <input value={row.remark} onChange={e => setRemark(s.id, e.target.value)} placeholder="Remark (optional)…"
                    className="mt-2 w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700 placeholder-slate-400 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition" />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
