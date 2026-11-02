import { useState, useEffect, useCallback, useMemo } from 'react'
import { dbProxy } from '../../lib/dbProxy'
import { useAuth } from '../../contexts/AuthContext'
import {
  BookOpen,
  Calendar,
  TrendingUp,
  Award,
  Loader2,
  AlertCircle,
  RefreshCw,
  BarChart3,
  PieChart as PieIcon,
  Target,
  Clock,
  CheckCircle2,
} from 'lucide-react'

// ───────────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────────

function pickString(record: any, ...keys: string[]): string {
  for (const k of keys) {
    const v = record?.[k]
    if (v !== null && v !== undefined && String(v).trim() !== '') {
      return String(v).trim()
    }
  }
  return ''
}

function fullName(s: any): string {
  const first = pickString(s, 'first_name', 'firstName', 'name')
  const last = pickString(s, 'last_name', 'lastName')
  const middle = pickString(s, 'middle_name', 'middleName')
  return [first, middle, last].filter(Boolean).join(' ').trim()
}

// ───────────────────────────────────────────────────────────────────
// SVG horizontal bar chart (subject performance)
// ───────────────────────────────────────────────────────────────────

function SubjectBarChart({
  data,
  maxScore,
  passMark,
}: {
  data: { subject: string; score: number }[]
  maxScore: number
  passMark: number
}) {
  const sorted = [...data].sort((a, b) => b.score - a.score).slice(0, 12)
  if (!sorted.length) {
    return (
      <div className="py-10 text-center text-sm text-slate-400">
        No scores recorded yet for this term.
      </div>
    )
  }
  const safeMax = Math.max(maxScore || 100, ...sorted.map((d) => d.score), passMark || 40)
  return (
    <div className="space-y-2.5">
      {sorted.map((d, i) => {
        const pct = Math.min(100, (d.score / safeMax) * 100)
        const passPct = Math.min(100, ((passMark || 40) / safeMax) * 100)
        const isPass = d.score >= (passMark || 40)
        const color = isPass ? '#10b981' : '#ef4444'
        return (
          <div key={i} className="flex items-center gap-3">
            <div className="flex-shrink-0 w-28 sm:w-36 text-xs sm:text-sm font-medium text-slate-700 truncate text-right">
              {d.subject}
            </div>
            <div className="flex-1 relative h-7 bg-slate-100 rounded-md overflow-hidden">
              <div
                className="absolute top-0 bottom-0 border-l-2 border-dashed border-slate-400 z-10"
                style={{ left: `${passPct}%` }}
                title={`Pass mark: ${passMark}`}
              />
              <div
                className="h-full rounded-md transition-all"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
              <div className="absolute inset-0 flex items-center justify-end pr-2 text-xs font-bold text-white drop-shadow">
                {d.score}
              </div>
            </div>
          </div>
        )
      })}
      <div className="pt-2 mt-2 border-t border-slate-100 flex items-center gap-4 text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-emerald-500" />
          Pass ({passMark}+)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-red-500" />
          Below pass
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-0 border-t-2 border-dashed border-slate-400" />
          Pass mark
        </span>
      </div>
    </div>
  )
}

// ───────────────────────────────────────────────────────────────────
// SVG grouped horizontal bar chart (multi-term comparison)
// ───────────────────────────────────────────────────────────────────

function SessionComparisonChart({
  data,
  terms,
}: {
  data: { subject: string; values: number[] }[]
  terms: string[]
}) {
  if (!data.length || !terms.length) {
    return (
      <div className="py-10 text-center text-sm text-slate-400">
        No multi-term data available yet.
      </div>
    )
  }
  const sorted = [...data].sort((a, b) => a.subject.localeCompare(b.subject)).slice(0, 10)
  const colors = ['#1e7a3c', '#0891b2', '#7c3aed', '#ea580c', '#be185d']
  return (
    <div className="space-y-3">
      {sorted.map((row, i) => (
        <div key={i} className="space-y-1">
          <div className="text-xs sm:text-sm font-semibold text-slate-700">{row.subject}</div>
          <div className="space-y-1">
            {row.values.map((v, ti) => {
              const color = colors[ti % colors.length]
              return (
                <div key={ti} className="flex items-center gap-2">
                  <div className="flex-shrink-0 w-20 text-[10px] text-slate-500 truncate">
                    {terms[ti] || `T${ti + 1}`}
                  </div>
                  <div className="flex-1 relative h-5 bg-slate-100 rounded overflow-hidden">
                    <div
                      className="h-full rounded transition-all"
                      style={{ width: `${Math.min(100, v)}%`, backgroundColor: color }}
                    />
                    <div className="absolute inset-0 flex items-center justify-end pr-1.5 text-[10px] font-bold text-white">
                      {v}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
      <div className="pt-2 mt-2 border-t border-slate-100 flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
        {terms.map((t, i) => (
          <span key={i} className="inline-flex items-center gap-1.5">
            <span
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: colors[i % colors.length] }}
            />
            {t}
          </span>
        ))}
      </div>
    </div>
  )
}

// ───────────────────────────────────────────────────────────────────
// SVG pie chart (term score proportion)
// ───────────────────────────────────────────────────────────────────

function TermPieChart({
  data,
}: {
  data: { label: string; value: number }[]
}) {
  const filtered = data.filter((d) => d.value > 0)
  const total = filtered.reduce((s, d) => s + d.value, 0)
  const colors = ['#1e7a3c', '#0891b2', '#7c3aed', '#ea580c', '#be185d']

  if (!total) {
    return (
      <div className="py-10 text-center text-sm text-slate-400">
        No term scores to chart yet.
      </div>
    )
  }

  let cumAngle = -90
  const slices = filtered.map((d, i) => {
    const angle = (d.value / total) * 360
    const start = cumAngle
    const end = cumAngle + angle
    cumAngle = end
    const startRad = (start * Math.PI) / 180
    const endRad = (end * Math.PI) / 180
    const r = 70
    const cx = 80
    const cy = 80
    const x1 = cx + r * Math.cos(startRad)
    const y1 = cy + r * Math.sin(startRad)
    const x2 = cx + r * Math.cos(endRad)
    const y2 = cy + r * Math.sin(endRad)
    const largeArc = angle > 180 ? 1 : 0
    const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`
    const midAngle = (start + end) / 2
    const midRad = (midAngle * Math.PI) / 180
    const labelX = cx + (r * 0.6) * Math.cos(midRad)
    const labelY = cy + (r * 0.6) * Math.sin(midRad)
    const pct = Math.round((d.value / total) * 100)
    return { path, color: colors[i % colors.length], label: d.label, value: d.value, pct, labelX, labelY }
  })

  return (
    <div className="flex flex-col sm:flex-row items-center gap-5">
      <svg viewBox="0 0 160 160" className="w-40 h-40 flex-shrink-0">
        {slices.map((s, i) => (
          <g key={i}>
            <path d={s.path} fill={s.color} stroke="#fff" strokeWidth="2" />
            {s.pct >= 8 && (
              <text
                x={s.labelX}
                y={s.labelY}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="11"
                fontWeight="700"
                fill="#fff"
              >
                {s.pct}%
              </text>
            )}
          </g>
        ))}
      </svg>
      <div className="flex-1 space-y-2 w-full">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center justify-between gap-2 text-sm">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="flex-shrink-0 w-3.5 h-3.5 rounded-sm"
                style={{ backgroundColor: s.color }}
              />
              <span className="text-slate-700 font-medium truncate">{s.label}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500">{s.value}</span>
              <span className="font-semibold text-slate-900">{s.pct}%</span>
            </div>
          </div>
        ))}
        <div className="pt-2 mt-1 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Total</span>
          <span className="font-semibold text-slate-900">{total}</span>
        </div>
      </div>
    </div>
  )
}

// ───────────────────────────────────────────────────────────────────
// Stat card
// ───────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: any
  label: string
  value: string
  sub?: string
  accent: string
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 sm:p-4">
      <div className="flex items-center justify-between">
        <div
          className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-white"
          style={{ backgroundColor: accent }}
        >
          <Icon size={16} strokeWidth={2.2} />
        </div>
      </div>
      <div className="mt-2.5 text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
        {value}
      </div>
      <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
        {label}
      </div>
      {sub && <div className="text-[11px] text-slate-400 mt-0.5">{sub}</div>}
    </div>
  )
}

// ───────────────────────────────────────────────────────────────────
// Main page
// ───────────────────────────────────────────────────────────────────

export default function StudentDashboard() {
  const { user } = useAuth() as { user: any }

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [student, setStudent] = useState<any>(null)
  const [classInfo, setClassInfo] = useState<any>(null)
  const [settings, setSettings] = useState<any>(null)
  const [scores, setScores] = useState<any[]>([])
  const [subjects, setSubjects] = useState<any[]>([])
  const [attendance, setAttendance] = useState<any[]>([])
  const [summaries, setSummaries] = useState<any[]>([])
  const [sessionTerms, setSessionTerms] = useState<any[]>([])

  const studentId = user?.id || user?.student_id || user?.studentId || ''
  const schoolId = user?.school_id || user?.schoolId || ''
  const classId = user?.class_id || user?.classId || ''

  const loadAll = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError('')
    try {
      let stu: any = user
      if (studentId) {
        const { data: sData, error: sErr } = await dbProxy
          .from('students')
          .select('*')
          .eq('id', studentId)
          .maybeSingle()
        if (!sErr && sData) stu = sData
      }
      setStudent(stu)

      const tasks: Promise<any>[] = []
      const keys: string[] = []

      if (stu.class_id || classId) {
        const cid = stu.class_id || classId
        tasks.push(dbProxy.from('classes').select('*').eq('id', cid).maybeSingle())
        keys.push('class')
      }
      if (stu.school_id || schoolId) {
        const sid = stu.school_id || schoolId
        tasks.push(dbProxy.from('school_settings').select('*').eq('school_id', sid).maybeSingle())
        keys.push('settings')
      }
      tasks.push(
        dbProxy.from('scores').select('*').eq('student_id', studentId || stu.id).order('created_at', { ascending: false })
      )
      keys.push('scores')
      tasks.push(
        dbProxy.from('attendance').select('*').eq('student_id', studentId || stu.id).order('date', { ascending: false }).limit(500)
      )
      keys.push('attendance')
      tasks.push(
        dbProxy.from('summaries').select('*').eq('student_id', studentId || stu.id).order('created_at', { ascending: false })
      )
      keys.push('summaries')
      if (stu.school_id || schoolId) {
        const sid = stu.school_id || schoolId
        tasks.push(dbProxy.from('subjects').select('*').eq('school_id', sid).order('name'))
        keys.push('subjects')
      }

      const results = await Promise.all(tasks)
      results.forEach((res: any, i: number) => {
        const key = keys[i]
        if (res.error) { console.warn(`loadAll: ${key} error:`, res.error); return }
        const data = res.data
        if (key === 'class') setClassInfo(data || null)
        else if (key === 'settings') setSettings(data || null)
        else if (key === 'scores') setScores(data || [])
        else if (key === 'attendance') setAttendance(data || [])
        else if (key === 'summaries') setSummaries(data || [])
        else if (key === 'subjects') setSubjects(data || [])
      })

      const sid = stu.school_id || schoolId
      if (sid) {
        const { data: terms } = await dbProxy
          .from('terms')
          .select('id, name, session_id, is_current, term_start_date, term_end_date')
          .eq('school_id', sid)
          .order('name')
        setSessionTerms(terms || [])
      }
    } catch (e: any) {
      console.error('Dashboard load error:', e)
      setError(e?.message || 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }, [user, studentId, schoolId, classId])

  useEffect(() => { loadAll() }, [loadAll])

  const subjectMap = useMemo(() => {
    const m: Record<string, any> = {}
    subjects.forEach((s) => { m[s.id] = s })
    return m
  }, [subjects])

  const scoresByTerm = useMemo(() => {
    const m: Record<string, any[]> = {}
    scores.forEach((sc) => {
      const tid = sc.term_id || 'current'
      if (!m[tid]) m[tid] = []
      m[tid].push(sc)
    })
    return m
  }, [scores])

  const currentTermId = useMemo(() => {
    return sessionTerms.find((t) => t.is_current)?.id || Object.keys(scoresByTerm)[0] || ''
  }, [sessionTerms, scoresByTerm])

  const currentTermScores = useMemo(() => scoresByTerm[currentTermId] || [], [scoresByTerm, currentTermId])

  const subjectChartData = useMemo(() => {
    return currentTermScores.map((sc) => {
      const subj = subjectMap[sc.subject_id]
      const name = subj?.name || subj?.code || `Subject ${sc.subject_id?.slice(0, 4) || ''}`
      const total = typeof sc.total === 'number' ? sc.total : 0
      return { subject: name, score: total }
    }).filter((d) => d.score > 0)
  }, [currentTermScores, subjectMap])

  const sessionChartData = useMemo(() => {
    const termIds = Object.keys(scoresByTerm)
    const termNames = termIds.map((tid) => {
      const t = sessionTerms.find((tt) => tt.id === tid)
      return t?.name || 'Term'
    })
    const subjectAgg: Record<string, number[]> = {}
    termIds.forEach((tid) => {
      ;(scoresByTerm[tid] || []).forEach((sc) => {
        const subj = subjectMap[sc.subject_id]
        const name = subj?.name || `Subject ${sc.subject_id?.slice(0, 4) || ''}`
        if (!subjectAgg[name]) subjectAgg[name] = termIds.map(() => 0)
        const idx = termIds.indexOf(tid)
        if (idx >= 0) subjectAgg[name][idx] = typeof sc.total === 'number' ? sc.total : 0
      })
    })
    const data = Object.entries(subjectAgg).map(([subject, values]) => ({ subject, values }))
    return { data, terms: termNames }
  }, [scoresByTerm, sessionTerms, subjectMap])

  const pieChartData = useMemo(() => {
    return Object.entries(scoresByTerm).map(([tid, list]) => {
      const t = sessionTerms.find((tt) => tt.id === tid)
      const sum = list.reduce((s, sc) => s + (typeof sc.total === 'number' ? sc.total : 0), 0)
      return { label: t?.name || 'Term', value: sum }
    })
  }, [scoresByTerm, sessionTerms])

  const attendanceStats = useMemo(() => {
    const total = attendance.length
    const present = attendance.filter((a) => a.status === 'present').length
    const absent = attendance.filter((a) => a.status === 'absent').length
    const late = attendance.filter((a) => a.status === 'late').length
    const excused = attendance.filter((a) => a.status === 'excused').length
    return { total, present, absent, late, excused }
  }, [attendance])

  const latestSummary = useMemo(() => summaries.length ? summaries[0] : null, [summaries])
  const recentResults = useMemo(() => currentTermScores.slice(0, 5), [currentTermScores])

  const displayName = fullName(student) || fullName(user) || 'Student'
  const subjectMax = settings?.subject_max_score || 100
  const passMark = settings?.pass_mark || 40
  const schoolPrimary = settings?.primary_color || user?.primary_color || '#1e7a3c'

  const avgScore = useMemo(() => {
    if (!currentTermScores.length) return 0
    const sum = currentTermScores.reduce((s, sc) => s + (typeof sc.total === 'number' ? sc.total : 0), 0)
    return Math.round(sum / currentTermScores.length)
  }, [currentTermScores])

  const attendancePct = useMemo(() => {
    if (!attendance.length) return 0
    return Math.round((attendanceStats.present / attendance.length) * 100)
  }, [attendance, attendanceStats])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-slate-600">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          <span className="text-sm font-medium">Loading your dashboard…</span>
        </div>
      </div>
    )
  }

  const currentTermName = sessionTerms.find((t) => t.id === currentTermId)?.name || 'Current Term'

  return (
    <div className="px-3 sm:px-4 lg:px-6 py-4 sm:py-6 max-w-6xl mx-auto space-y-5">
      <div
        className="relative overflow-hidden rounded-2xl shadow-md"
        style={{ background: `linear-gradient(135deg, ${schoolPrimary} 0%, ${schoolPrimary}dd 60%, ${schoolPrimary}aa 100%)` }}
      >
        <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/10 rounded-full pointer-events-none" />
        <div className="absolute -right-4 top-8 w-24 h-24 bg-white/5 rounded-full pointer-events-none" />
        <div className="relative px-4 sm:px-6 py-5 sm:py-6">
          <div className="text-[11px] uppercase tracking-widest text-white/80 font-semibold">Welcome back</div>
          <h1 className="mt-0.5 text-xl sm:text-2xl lg:text-3xl font-bold text-white tracking-tight break-words">{displayName}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-white/90 text-sm">
            {classInfo && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/15 backdrop-blur-sm font-medium">
                <BookOpen size={13} strokeWidth={2.4} />
                {classInfo.name}{classInfo.section ? ` ${classInfo.section}` : ''}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/15 backdrop-blur-sm font-medium">
              <Calendar size={13} strokeWidth={2.4} />
              {currentTermName}
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <div className="font-semibold">Couldn't load full dashboard</div>
            <div className="text-amber-800/90 text-xs mt-0.5">{error}</div>
          </div>
          <button onClick={loadAll} className="text-xs font-semibold px-2.5 py-1 rounded-md bg-amber-100 hover:bg-amber-200 text-amber-900">Retry</button>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={BookOpen} label="Subjects" value={String(currentTermScores.length)} sub={`${subjects.length} total in class`} accent="#2563eb" />
        <StatCard icon={TrendingUp} label="Average" value={String(avgScore)} sub={`out of ${subjectMax}`} accent="#0891b2" />
        <StatCard icon={Target} label="Attendance" value={`${attendancePct}%`} sub={`${attendanceStats.present}/${attendanceStats.total} days`} accent="#10b981" />
        <StatCard icon={Award} label="Position" value={latestSummary?.position ? `${latestSummary.position}${latestSummary.position_out_of ? `/${latestSummary.position_out_of}` : ''}` : '—'} sub={latestSummary?.grade ? `Grade ${latestSummary.grade}` : 'Not ranked'} accent="#7c3aed" />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700">
              <Award size={18} strokeWidth={2.2} />
            </div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">Recent Results</h3>
          </div>
          <span className="text-xs text-slate-500">{currentTermName}</span>
        </div>
        <div className="px-5 py-3">
          {recentResults.length === 0 ? (
            <div className="py-6 text-center text-sm text-slate-400">No results published yet for this term.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentResults.map((sc, i) => {
                const subj = subjectMap[sc.subject_id]
                const name = subj?.name || subj?.code || `Subject ${sc.subject_id?.slice(0, 4) || ''}`
                const total = typeof sc.total === 'number' ? sc.total : 0
                const isPass = total >= passMark
                return (
                  <div key={i} className="flex items-center justify-between py-3 gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold ${isPass ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {sc.grade || (isPass ? 'P' : 'F')}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900 truncate">{name}</div>
                        <div className="text-[11px] text-slate-500">{sc.total} / {subjectMax}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${Math.min(100, (total / subjectMax) * 100)}%`, backgroundColor: isPass ? '#10b981' : '#ef4444' }} />
                      </div>
                      <span className="text-sm font-bold text-slate-900 w-8 text-right">{total}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <BarChart3 size={18} className="text-slate-700" strokeWidth={2.2} />
        <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">Performance Charts</h2>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
              <BarChart3 size={18} strokeWidth={2.2} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">Students Performance Chart</h3>
              <p className="text-[11px] text-slate-500">{currentTermName}</p>
            </div>
          </div>
        </div>
        <div className="px-5 py-4">
          <SubjectBarChart data={subjectChartData} maxScore={subjectMax} passMark={passMark} />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-cyan-100 flex items-center justify-center text-cyan-700">
              <TrendingUp size={18} strokeWidth={2.2} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight uppercase">Report Chart For {sessionChartData.terms.join(' / ') || 'Terms'}</h3>
              <p className="text-[11px] text-slate-500">End of session chart</p>
            </div>
          </div>
        </div>
        <div className="px-5 py-4">
          <SessionComparisonChart data={sessionChartData.data} terms={sessionChartData.terms} />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center text-violet-700">
              <PieIcon size={18} strokeWidth={2.2} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight uppercase">Pie Chart For {sessionChartData.terms.join(' / ') || 'Terms'}</h3>
              <p className="text-[11px] text-slate-500">Term score proportion</p>
            </div>
          </div>
        </div>
        <div className="px-5 py-4">
          <TermPieChart data={pieChartData} />
        </div>
      </div>

      <div className="pt-2 pb-4 flex items-center justify-center gap-2 text-[11px] text-slate-400">
        <Clock size={11} strokeWidth={2} />
        <span>Last updated {new Date().toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}</span>
        <span>•</span>
        <button onClick={loadAll} className="inline-flex items-center gap-1 hover:text-slate-600">
          <RefreshCw size={11} strokeWidth={2} />
          Refresh
        </button>
      </div>
    </div>
  )
}
