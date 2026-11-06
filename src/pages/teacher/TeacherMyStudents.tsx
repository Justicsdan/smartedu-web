import { useState, useEffect, useMemo } from "react"
import { dbProxy } from '../../lib/dbProxy'
import { useAuth } from '../../contexts/AuthContext'
import {
  Loader2, AlertCircle, Users, Search, X, BookOpen,
} from 'lucide-react'

interface Student {
  id: string
  first_name: string
  last_name: string
  middle_name: string | null
  admission_no: string
  gender: string | null
  parent_name: string | null
  parent_phone: string | null
  is_active: boolean
}

function studentName(s: Student): string {
  return [s.first_name, s.middle_name, s.last_name].filter(Boolean).join(' ').trim()
}

export default function TeacherMyStudents() {
  const { user } = useAuth() as { user: any }
  const teacherId = user?.id || ''
  const schoolId = user?.school_id || user?.schoolId || ''

  const [loading, setLoading] = useState(true)
  const [classInfo, setClassInfo] = useState<any>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!teacherId || !schoolId) return
    ;(async () => {
      try {
        const { data: fmClass } = await dbProxy.from('classes').select('id, name, section, tier').eq('school_id', schoolId).eq('class_teacher_id', teacherId).maybeSingle()
        if (!fmClass) { setLoading(false); return }
        setClassInfo(fmClass)
        const { data: studs } = await dbProxy.from('students').select('id, first_name, last_name, middle_name, admission_no, gender, parent_name, parent_phone, is_active').eq('class_id', fmClass.id).eq('is_active', true).order('first_name')
        setStudents((studs || []) as Student[])
      } catch (e: any) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    })()
  }, [teacherId, schoolId])

  const filtered = useMemo(() => {
    if (!search.trim()) return students
    const q = search.toLowerCase()
    return students.filter(s => studentName(s).toLowerCase().includes(q) || (s.admission_no || '').toLowerCase().includes(q))
  }, [students, search])

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>

  if (!classInfo) {
    return (
      <div className="px-3 sm:px-4 lg:px-6 py-4 sm:py-6 max-w-4xl mx-auto bg-gradient-to-br from-slate-50 via-white to-blue-50/30 min-h-screen">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg shadow-slate-200/40 border border-slate-200/60 py-16 text-center">
          <div className="w-16 h-16 mx-auto bg-amber-50 rounded-2xl flex items-center justify-center mb-4 text-amber-400"><Users size={32} strokeWidth={2} /></div>
          <h3 className="text-base font-bold text-slate-900 mb-1">Not a Form Master</h3>
          <p className="text-sm text-slate-500">Only form masters can view their class students.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-3 sm:px-4 lg:px-6 py-4 sm:py-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">My Students</h1>
          <p className="text-sm text-slate-500 mt-1">{classInfo.name}{classInfo.section ? ` ${classInfo.section}` : ''} · {students.length} students</p>
        </div>
      </div>

      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg shadow-slate-200/40 border border-slate-200/60 p-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" strokeWidth={2.2} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or admission no…"
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-blue-400 focus:bg-white transition" />
        </div>
      </div>

      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg shadow-slate-200/40 border border-slate-200/60 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-16 h-16 mx-auto bg-slate-100 rounded-2xl flex items-center justify-center mb-4 text-slate-400"><Users size={32} strokeWidth={2} /></div>
            <p className="text-sm text-slate-500">{students.length === 0 ? 'No students in this class.' : 'No students match your search.'}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((s, i) => {
              const isFemale = (s.gender || '').toLowerCase() === 'female'
              return (
                <div key={s.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50/50 transition">
                  <div className={`flex-shrink-0 w-11 h-11 rounded-full p-0.5 ${isFemale ? 'bg-pink-50' : 'bg-blue-50'}`}>
                    <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                      <span className={`text-sm font-bold ${isFemale ? 'text-pink-600' : 'text-blue-700'}`}>{studentName(s).charAt(0) || '?'}</span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-900 truncate">{studentName(s)}</div>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold text-blue-700 bg-blue-50">{s.admission_no || '-'}</span>
                      {s.parent_name && <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold text-slate-600 bg-slate-100">{s.parent_name}</span>}
                      {s.parent_phone && <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold text-slate-600 bg-slate-100">{s.parent_phone}</span>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
