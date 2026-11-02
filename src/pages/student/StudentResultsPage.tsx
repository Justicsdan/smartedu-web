import { useState, useEffect, useCallback, useMemo } from 'react'
import { dbProxy } from '../../lib/dbProxy'
import { useAuth } from '../../contexts/AuthContext'
import {
  Award, BookOpen, TrendingUp, Target, Loader2, AlertCircle, RefreshCw,
  Printer, Calendar, GraduationCap, ClipboardList, MessageSquare, Star,
} from 'lucide-react'

function pickString(record: any, ...keys: string[]): string {
  for (const k of keys) {
    const v = record?.[k]
    if (v !== null && v !== undefined && String(v).trim() !== '') return String(v).trim()
  }
  return ''
}

function pickNumber(record: any, ...keys: string[]): number {
  for (const k of keys) {
    const v = record?.[k]
    if (v !== null && v !== undefined && !isNaN(Number(v))) return Number(v)
  }
  return 0
}

function parseScoresJson(raw: any): Record<string, number> {
  if (!raw) return {}
  if (typeof raw === 'object') return raw as Record<string, number>
  try { return JSON.parse(String(raw)) } catch { return {} }
}

function getGradeColor(grade: string): string {
  const g = (grade || '').toUpperCase()
  if (g.startsWith('A') || ['A1', 'A2', 'A3', 'B1', 'B2', 'B3'].includes(g)) return '#10b981'
  if (g.startsWith('B') || g.startsWith('C') || ['C4', 'C5', 'C6'].includes(g)) return '#3b82f6'
  if (g.startsWith('D') || ['D7', 'E8'].includes(g)) return '#f59e0b'
  if (g.startsWith('F') || g === 'F9' || g === 'F') return '#ef4444'
  return '#64748b'
}

function StatCard({ icon: Icon, label, value, sub, accent }: {
  icon: any; label: string; value: string; sub?: string; accent: string
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 sm:p-4">
      <div className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-white mb-2.5"
        style={{ backgroundColor: accent }}>
        <Icon size={16} strokeWidth={2.2} />
      </div>
      <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{value}</div>
      <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">{label}</div>
      {sub && <div className="text-[11px] text-slate-400 mt-0.5">{sub}</div>}
    </div>
  )
}

export default function StudentResultsPage() {
  const { user } = useAuth() as { user: any }
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [scores, setScores] = useState<any[]>([])
  const [subjects, setSubjects] = useState<any[]>([])
  const [summaries, setSummaries] = useState<any[]>([])
  const [comments, setComments] = useState<any[]>([])
  const [ratings, setRatings] = useState<any[]>([])
  const [terms, setTerms] = useState<any[]>([])
  const [settings, setSettings] = useState<any>(null)
  const [classInfo, setClassInfo] = useState<any>(null)
  const [student, setStudent] = useState<any>(null)
  const [selectedTermId, setSelectedTermId] = useState<string>('')
  const studentId = user?.id || user?.student_id || user?.studentId || ''
  const schoolId = user?.school_id || user?.schoolId || ''

  const loadAll = useCallback(async () => {
    if (!user) return
    setLoading(true); setError('')
    try {
      // Use user object directly — student role can't SELECT from students table (RLS)
      // The auth Edge Function already returns all needed student fields in the JWT payload
      let stu: any = user
      setStudent(stu)
      const tasks: Promise<any>[] = []
      const keys: string[] = []
      tasks.push(dbProxy.from('scores').select('*').eq('student_id', studentId || stu.id).order('created_at', { ascending: false }))
      keys.push('scores')
      tasks.push(dbProxy.from('subjects').select('*').eq('school_id', schoolId || stu.school_id).order('name'))
      keys.push('subjects')
      tasks.push(dbProxy.from('student_term_summaries').select('*').eq('student_id', studentId || stu.id).order('created_at', { ascending: false }))
      keys.push('summaries')
      tasks.push(dbProxy.from('term_comments').select('*').eq('student_id', studentId || stu.id).order('created_at', { ascending: false }))
      keys.push('comments')
      tasks.push(dbProxy.from('student_behavioural_ratings').select('*').eq('student_id', studentId || stu.id).order('created_at', { ascending: false }))
      keys.push('ratings')
      tasks.push(dbProxy.from('terms').select('*').eq('school_id', schoolId || stu.school_id).order('name'))
      keys.push('terms')
      tasks.push(dbProxy.from('school_settings').select('*').eq('school_id', schoolId || stu.school_id).maybeSingle())
      keys.push('settings')
      if (stu.class_id) {
        tasks.push(dbProxy.from('classes').select('*').eq('id', stu.class_id).maybeSingle())
        keys.push('class')
      }
      const results = await Promise.all(tasks)
      let termsData: any[] = []
      results.forEach((res: any, i: number) => {
        const key = keys[i]
        if (res.error) { console.warn(`load: ${key} error:`, res.error); return }
        const data = res.data
        if (key === 'scores') setScores(data || [])
        else if (key === 'subjects') setSubjects(data || [])
        else if (key === 'summaries') setSummaries(data || [])
        else if (key === 'comments') setComments(data || [])
        else if (key === 'ratings') setRatings(data || [])
        else if (key === 'terms') { setTerms(data || []); termsData = data || [] }
        else if (key === 'settings') setSettings(data)
        else if (key === 'class') setClassInfo(data)
      })
      const currentTerm = termsData.find((t: any) => t.is_current)
      setSelectedTermId(currentTerm?.id || '')
    } catch (e: any) {
      console.error('Results load error:', e)
      setError(e?.message || 'Failed to load results')
    } finally { setLoading(false) }
  }, [user, studentId, schoolId])

  useEffect(() => { loadAll() }, [loadAll])

  const subjectMap = useMemo(() => {
    const m: Record<string, any> = {}
    subjects.forEach((s) => { m[s.id] = s })
    return m
  }, [subjects])

  const termScores = useMemo(() => {
    if (!selectedTermId) return scores
    return scores.filter((s) => s.term_id === selectedTermId)
  }, [scores, selectedTermId])

  const publishedSummaries = useMemo(() => summaries.filter((s) => s.is_published), [summaries])
  const currentSummary = useMemo(() => {
    if (!selectedTermId) return publishedSummaries[0] || null
    return publishedSummaries.find((s) => s.term_id === selectedTermId) || null
  }, [publishedSummaries, selectedTermId])

  const currentComments = useMemo(() => {
    if (!selectedTermId) return comments[0] || null
    return comments.find((c) => c.term_id === selectedTermId) || null
  }, [comments, selectedTermId])

  const currentRatings = useMemo(() => {
    if (!selectedTermId) return ratings[0] || null
    return ratings.find((r) => r.term_id === selectedTermId) || null
  }, [ratings, selectedTermId])

  const publishedTermIds = useMemo(() => {
    return new Set(publishedSummaries.map((s) => s.term_id).filter(Boolean))
  }, [publishedSummaries])

  const visibleScores = useMemo(() => {
    return termScores.filter((s) => !s.term_id || publishedTermIds.has(s.term_id))
  }, [termScores, publishedTermIds])

  const assessmentTypes = useMemo(() => {
    const raw = settings?.assessment_types
    if (!raw) return ['CA1', 'CA2', 'Assignment', 'Mid-term', 'Exam']
    if (Array.isArray(raw)) return raw
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw)
        return Array.isArray(parsed) ? parsed : [raw]
      } catch {
        return raw.split(/[,;]/).map((s: string) => s.trim()).filter(Boolean)
      }
    }
    return ['CA1', 'CA2', 'Assignment', 'Mid-term', 'Exam']
  }, [settings])

  const gradingSystem = useMemo(() => {
    const raw = settings?.grading_system
    if (!raw) return []
    if (Array.isArray(raw)) return raw
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw)
        return Array.isArray(parsed) ? parsed : []
      } catch { return [] }
    }
    return []
  }, [settings])

  const behavioralFields = useMemo(() => {
    const parseLabels = (raw: any): Record<string, string> => {
      if (!raw) return {}
      if (typeof raw === 'object') return raw
      try { return JSON.parse(String(raw)) } catch { return {} }
    }
    const labels = parseLabels(settings?.behavioral_labels)
    return [
      { key: 'punctuality', label: labels.punctuality || 'Punctuality' },
      { key: 'relationship_with_others', label: labels.relationship_with_others || 'Relationship with Others' },
      { key: 'attendance_in_class', label: labels.attendance_in_class || 'Attendance in Class' },
      { key: 'games_sports', label: labels.games_sports || 'Games/Sports' },
      { key: 'attentiveness_in_class', label: labels.attentiveness_in_class || 'Attentiveness in Class' },
      { key: 'handling_tools_lab_workshops', label: labels.handling_tools_lab_workshops || 'Handling Tools, Lab. & Workshops' },
      { key: 'carrying_out_assignments', label: labels.carrying_out_assignments || 'Carrying out Assignments' },
      { key: 'participation_in_school_activities', label: labels.participation_in_school_activities || 'Participation in School Activities' },
      { key: 'neatness', label: labels.neatness || 'Neatness' },
      { key: 'honesty', label: labels.honesty || 'Honesty' },
      { key: 'self_control', label: labels.self_control || 'Self-Control' },
    ]
  }, [settings])

  const ratingColor = (val: string): string => {
    const v = (val || '').toLowerCase()
    if (v === 'excellent') return '#10b981'
    if (v === 'very good') return '#3b82f6'
    if (v === 'good') return '#0891b2'
    if (v === 'fair') return '#f59e0b'
    if (v === 'poor') return '#ef4444'
    return '#64748b'
  }

  const handlePrint = () => { window.print() }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-slate-600">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          <span className="text-sm font-medium">Loading results…</span>
        </div>
      </div>
    )
  }

  const subjectMax = settings?.subject_max_score || 100
  const passMark = settings?.pass_mark || 40
  const currentTermName = terms.find((t) => t.id === selectedTermId)?.name || 'Current Term'
  const displayName = [student?.first_name, student?.middle_name, student?.last_name].filter(Boolean).join(' ').trim() || 'Student'
  const admissionNo = pickString(student, 'admission_no')

  return (
    <div className="px-3 sm:px-4 lg:px-6 py-4 sm:py-6 max-w-6xl mx-auto space-y-5">
      <div className="flex items-start justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Results</h1>
          <p className="mt-0.5 text-sm text-slate-500">{publishedSummaries.length} published term{publishedSummaries.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadAll} disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 transition text-slate-700 font-semibold text-sm shadow-sm">
            <RefreshCw size={14} strokeWidth={2.2} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button onClick={handlePrint} disabled={!currentSummary}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 transition text-white font-semibold text-sm shadow-sm disabled:opacity-50">
            <Printer size={14} strokeWidth={2.4} /><span>Print</span>
          </button>
        </div>
      </div>

      {publishedSummaries.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap print:hidden">
          {publishedSummaries.map((s) => {
            const term = terms.find((t) => t.id === s.term_id)
            const isActive = selectedTermId === s.term_id
            return (
              <button key={s.id} onClick={() => setSelectedTermId(s.term_id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  isActive ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-700 hover:border-emerald-400'
                }`}>
                {term?.name || 'Term'}
              </button>
            )
          })}
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-800 print:hidden">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <div className="font-semibold">Couldn't load results</div>
            <div className="text-red-700/90 text-xs mt-0.5">{error}</div>
          </div>
        </div>
      )}

      {publishedSummaries.length === 0 && !error && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 flex flex-col items-center justify-center text-center print:hidden">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 mb-4">
            <Award size={32} strokeWidth={2} />
          </div>
          <h3 className="text-base font-bold text-slate-900">No published results yet</h3>
          <p className="mt-1 text-sm text-slate-500 max-w-xs">Your school administrator will publish results once they're finalized for this term.</p>
        </div>
      )}

      {publishedSummaries.length > 0 && currentSummary && (
        <>
          <div className="hidden print:block">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold">{settings?.result_header_text || 'Result Sheet'}</h1>
              <p className="mt-1">{currentTermName}</p>
            </div>
            <div className="mb-4">
              <p><strong>Name:</strong> {displayName}</p>
              <p><strong>Admission No:</strong> {admissionNo}</p>
              <p><strong>Class:</strong> {classInfo?.name} {classInfo?.section}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 print:hidden">
            <StatCard icon={TrendingUp} label="Total Score" value={String(currentSummary.total_score || 0)} sub={`out of ${visibleScores.length * subjectMax}`} accent="#2563eb" />
            <StatCard icon={Target} label="Average" value={`${currentSummary.average_score || 0}`} sub={`Pass: ${passMark}`} accent="#0891b2" />
            <StatCard icon={Award} label="Grade" value={currentSummary.grade || '—'} sub={`Position ${currentSummary.position || '—'}${currentSummary.position_out_of ? `/${currentSummary.position_out_of}` : ''}`} accent="#7c3aed" />
            <StatCard icon={BookOpen} label="Subjects" value={String(currentSummary.subjects_taken || visibleScores.length)} sub="taken this term" accent="#10b981" />
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/60">
              <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700">
                <ClipboardList size={18} strokeWidth={2.2} />
              </div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">Subject Scores</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 font-bold text-slate-700 uppercase text-[11px] tracking-wider">Subject</th>
                    {assessmentTypes.map((a: any, i: number) => {
                      const aStr = typeof a === 'string' ? a : (a?.name || a?.id || a?.key || `col-${i}`)
                      return <th key={aStr} className="text-center px-3 py-3 font-bold text-slate-700 uppercase text-[11px] tracking-wider">{aStr}</th>
                    })}
                    <th className="text-center px-3 py-3 font-bold text-slate-700 uppercase text-[11px] tracking-wider">Total</th>
                    <th className="text-center px-3 py-3 font-bold text-slate-700 uppercase text-[11px] tracking-wider">Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleScores.length === 0 ? (
                    <tr>
                      <td colSpan={assessmentTypes.length + 3} className="px-4 py-8 text-center text-slate-400">
                        No scores published for this term.
                      </td>
                    </tr>
                  ) : (
                    visibleScores.map((sc, i) => {
                      const subj = subjectMap[sc.subject_id]
                      const name = subj?.name || subj?.code || `Subject`
                      const scoresJson = parseScoresJson(sc.scores_json)
                      const total = pickNumber(sc, 'total')
                      const grade = pickString(sc, 'grade')
                      const isPass = total >= passMark
                      return (
                        <tr key={i} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-semibold text-slate-900">{name}</td>
                          {assessmentTypes.map((a: string) => {
                            const aStr = typeof a === 'string' ? a : (a?.id || a?.name || a?.key || String(a || ''))
                            const colKey = aStr.toLowerCase().replace(/[\s-]/g, '_')
                            const val = scoresJson[colKey] ?? scoresJson[aStr] ?? '—'
                            return (<td key={aStr} className="text-center px-3 py-3 text-slate-700">{val}</td>)
                          })}
                          <td className="text-center px-3 py-3">
                            <span className={`font-bold ${isPass ? 'text-emerald-700' : 'text-red-700'}`}>{total}</span>
                            <span className="text-slate-400 text-xs">/{subjectMax}</span>
                          </td>
                          <td className="text-center px-3 py-3">
                            <span className="inline-flex items-center justify-center px-2 py-1 rounded-md text-xs font-bold text-white"
                              style={{ backgroundColor: getGradeColor(grade) }}>
                              {grade || (isPass ? 'P' : 'F')}
                            </span>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {currentRatings && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/60">
                <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center text-violet-700">
                  <Star size={18} strokeWidth={2.2} />
                </div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">Behavioral Ratings</h3>
              </div>
              <div className="px-5 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {behavioralFields.map((f) => {
                    const val = pickString(currentRatings, f.key)
                    const color = val ? ratingColor(val) : '#cbd5e1'
                    return (
                      <div key={f.key}
                        className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg bg-slate-50 border-l-4"
                        style={{ borderLeftColor: color }}>
                        <span className="text-xs sm:text-sm font-medium text-slate-700 leading-tight">{f.label}</span>
                        {val ? (
                          <span className="flex-shrink-0 inline-flex items-center justify-center px-2.5 py-1 rounded-md text-[10px] font-bold text-white uppercase tracking-wide min-w-[78px] text-center"
                            style={{ backgroundColor: color }}>{val}</span>
                        ) : (
                          <span className="flex-shrink-0 inline-flex items-center justify-center px-2.5 py-1 rounded-md text-[10px] font-semibold text-slate-400 bg-slate-200 min-w-[78px] text-center">N/A</span>
                        )}
                      </div>
                    )
                  })}
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] text-slate-600">
                  <span className="font-semibold uppercase tracking-wider text-slate-500">Legend:</span>
                  {['Excellent', 'Very Good', 'Good', 'Fair', 'Poor'].map((label) => (
                    <span key={label} className="inline-flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: ratingColor(label) }} />
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {currentComments && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/60">
                <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
                  <MessageSquare size={18} strokeWidth={2.2} />
                </div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">Teacher & Principal Comments</h3>
              </div>
              <div className="px-5 py-4 space-y-4">
                {currentComments.teacher_comment && (
                  <div>
                    <div className="text-[11px] uppercase tracking-wider font-bold text-slate-500 mb-1">Teacher's Comment</div>
                    <p className="text-sm text-slate-800 leading-relaxed italic">"{currentComments.teacher_comment}"</p>
                  </div>
                )}
                {currentComments.principal_comment && (
                  <div className="pt-3 border-t border-slate-100">
                    <div className="text-[11px] uppercase tracking-wider font-bold text-slate-500 mb-1">Principal's Comment</div>
                    <p className="text-sm text-slate-800 leading-relaxed italic">"{currentComments.principal_comment}"</p>
                  </div>
                )}
                {!currentComments.teacher_comment && !currentComments.principal_comment && (
                  <p className="text-sm text-slate-400 italic">No comments recorded for this term.</p>
                )}
              </div>
            </div>
          )}

          {gradingSystem.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/60">
                <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700">
                  <GraduationCap size={18} strokeWidth={2.2} />
                </div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">Grading Key</h3>
              </div>
              <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
                {gradingSystem.map((g: any, i: number) => {
                  const grade = typeof g === 'object' ? (g.grade || g.label || '') : String(g)
                  const range = typeof g === 'object' ? (g.range || g.min || '') : ''
                  const color = getGradeColor(grade)
                  return (
                    <div key={i} className="flex items-center gap-2 p-2 rounded-lg border border-slate-200">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-md text-xs font-bold text-white"
                        style={{ backgroundColor: color }}>{grade}</span>
                      <div className="min-w-0">
                        <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">Grade</div>
                        <div className="text-xs font-semibold text-slate-800">{range || grade}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
