import { useState, useEffect, useMemo } from "react"
import { dbProxy } from '../../lib/dbProxy'
import { useAuth } from '../../contexts/AuthContext'
import {
  Loader2, BookOpen, Users, ClipboardList,
} from 'lucide-react'

export default function TeacherClasses() {
  const { user } = useAuth() as { user: any }
  const teacherId = user?.id || ''
  const schoolId = user?.school_id || user?.schoolId || ''

  const [loading, setLoading] = useState(true)
  const [classSubjects, setClassSubjects] = useState<any[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [subjects, setSubjects] = useState<any[]>([])

  useEffect(() => {
    if (!teacherId || !schoolId) return
    ;(async () => {
      try {
        const { data: csData } = await dbProxy.from('class_subjects').select('id, class_id, subject_id').eq('school_id', schoolId).eq('teacher_id', teacherId)
        setClassSubjects(csData || [])
        const classIds = Array.from(new Set((csData || []).map((cs: any) => cs.class_id)))
        const subjectIds = Array.from(new Set((csData || []).map((cs: any) => cs.subject_id)))
        if (classIds.length > 0) {
          const { data: cData } = await dbProxy.from('classes').select('id, name, section, tier').in('id', classIds).order('name')
          setClasses(cData || [])
        }
        if (subjectIds.length > 0) {
          const { data: sData } = await dbProxy.from('subjects').select('id, name, code').in('id', subjectIds).order('name')
          setSubjects(sData || [])
        }
      } catch (e: any) { console.error(e) } finally { setLoading(false) }
    })()
  }, [teacherId, schoolId])

  const subjectMap = useMemo(() => { const m: Record<string, any> = {}; subjects.forEach(s => { m[s.id] = s }); return m }, [subjects])

  // Group by class
  const classGroups = useMemo(() => {
    const groups: Record<string, { class: any; subjects: any[] }> = {}
    for (const c of classes) {
      groups[c.id] = { class: c, subjects: [] }
    }
    for (const cs of classSubjects) {
      if (groups[cs.class_id]) {
        const subj = subjectMap[cs.subject_id]
        if (subj) groups[cs.class_id].subjects.push(subj)
      }
    }
    return Object.values(groups)
  }, [classes, classSubjects, subjectMap])

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>

  return (
    <div className="px-3 sm:px-4 lg:px-6 py-4 sm:py-6 max-w-4xl mx-auto space-y-5 bg-gradient-to-br from-slate-50 via-white to-blue-50/30 min-h-screen">
      <div>
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
              Classes
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 bg-clip-text text-transparent">My Classes</h1>
        </div>
        <p className="text-sm text-slate-500 mt-1">{classGroups.length} class{classGroups.length !== 1 ? 'es' : ''} · {subjects.length} subject{subjects.length !== 1 ? 's' : ''}</p>
      </div>

      {classGroups.length === 0 ? (
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg shadow-slate-200/40 border border-slate-200/60 py-16 text-center">
          <div className="w-16 h-16 mx-auto bg-amber-50 rounded-2xl flex items-center justify-center mb-4 text-amber-400"><BookOpen size={32} strokeWidth={2} /></div>
          <h3 className="text-base font-bold text-slate-900 mb-1">No Class Assignments</h3>
          <p className="text-sm text-slate-500">Contact your admin to be assigned as a subject teacher.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {classGroups.map(({ class: c, subjects: subs }) => (
            <div key={c.id} className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg shadow-slate-200/40 border border-slate-200/60 overflow-hidden">
              <div className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 flex-shrink-0">
                    <BookOpen size={20} strokeWidth={2.2} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-900">{c.name}{c.section ? ` ${c.section}` : ''}</h3>
                    <p className="text-xs text-slate-500">{c.tier || 'SSS'} · {subs.length} subject{subs.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {subs.map(s => (
                    <a key={s.id} href={`/dashboard/teacher/scores`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold border border-blue-200 transition">
                      <ClipboardList size={12} strokeWidth={2.2} />
                      {s.name}{s.code ? ` (${s.code})` : ''}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
