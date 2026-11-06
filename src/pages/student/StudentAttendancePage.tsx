import { useState, useEffect, useCallback, useMemo } from 'react'
import { dbProxy } from '../../lib/dbProxy'
import { useAuth } from '../../contexts/AuthContext'
import {
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  PauseCircle,
  Loader2,
  AlertCircle,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react'

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  present: { label: 'Present', color: '#10b981', bg: '#ecfdf5', icon: CheckCircle2 },
  absent: { label: 'Absent', color: '#ef4444', bg: '#fef2f2', icon: XCircle },
  late: { label: 'Late', color: '#f59e0b', bg: '#fffbeb', icon: Clock },
  excused: { label: 'Excused', color: '#3b82f6', bg: '#eff6ff', icon: PauseCircle },
}

function pickString(record: any, ...keys: string[]): string {
  for (const k of keys) {
    const v = record?.[k]
    if (v !== null && v !== undefined && String(v).trim() !== '') return String(v).trim()
  }
  return ''
}

function formatShortDate(dateVal: any): string {
  if (!dateVal) return ''
  const d = new Date(dateVal)
  if (isNaN(d.getTime())) return String(dateVal)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function getWeekday(dateVal: any): string {
  if (!dateVal) return ''
  const d = new Date(dateVal)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-GB', { weekday: 'short' })
}

function monthKey(dateVal: any): string {
  const d = new Date(dateVal)
  if (isNaN(d.getTime())) return 'unknown'
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(key: string): string {
  const [y, m] = key.split('-')
  const d = new Date(parseInt(y), parseInt(m) - 1, 1)
  return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

function CircularProgress({ percent, size = 140, stroke = 12, color = '#10b981', label, sublabel }: {
  percent: number; size?: number; stroke?: number; color?: string; label: string; sublabel?: string
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c - (Math.min(100, Math.max(0, percent)) / 100) * c
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-3xl font-bold text-slate-900">{Math.round(percent)}%</div>
        <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">{label}</div>
        {sublabel && <div className="text-[10px] text-slate-400 mt-0.5">{sublabel}</div>}
      </div>
    </div>
  )
}

export default function StudentAttendancePage() {
  const { user } = useAuth() as { user: any }
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attendance, setAttendance] = useState<any[]>([])
  const studentId = user?.id || user?.student_id || user?.studentId || ''

  const loadAttendance = useCallback(async () => {
    if (!user) return
    setLoading(true); setError('')
    try {
      const { data, error: err } = await dbProxy
        .from('attendance').select('*')
        .eq('student_id', studentId || user.id)
        .order('date', { ascending: false })
      if (err) throw err
      setAttendance(data || [])
    } catch (e: any) {
      console.error('Attendance load error:', e)
      setError(e?.message || 'Failed to load attendance')
    } finally { setLoading(false) }
  }, [user, studentId])

  useEffect(() => { loadAttendance() }, [loadAttendance])

  const stats = useMemo(() => {
    const total = attendance.length
    const present = attendance.filter((a) => (a.status || '').toLowerCase() === 'present').length
    const absent = attendance.filter((a) => (a.status || '').toLowerCase() === 'absent').length
    const late = attendance.filter((a) => (a.status || '').toLowerCase() === 'late').length
    const excused = attendance.filter((a) => (a.status || '').toLowerCase() === 'excused').length
    const pct = total ? Math.round((present / total) * 100) : 0
    return { total, present, absent, late, excused, pct }
  }, [attendance])

  const consecutiveAbsences = useMemo(() => {
    let streak = 0
    for (const a of attendance) {
      if ((a.status || '').toLowerCase() === 'absent') streak++
      else break
    }
    return streak
  }, [attendance])

  const monthly = useMemo(() => {
    const m: Record<string, { total: number; present: number; absent: number; late: number; excused: number }> = {}
    attendance.forEach((a) => {
      const k = monthKey(a.date)
      if (!m[k]) m[k] = { total: 0, present: 0, absent: 0, late: 0, excused: 0 }
      m[k].total++
      const s = (a.status || '').toLowerCase()
      if (s === 'present') m[k].present++
      else if (s === 'absent') m[k].absent++
      else if (s === 'late') m[k].late++
      else if (s === 'excused') m[k].excused++
    })
    return Object.entries(m).sort(([a], [b]) => b.localeCompare(a)).slice(0, 6)
      .map(([k, v]) => ({ key: k, ...v, pct: v.total ? Math.round((v.present / v.total) * 100) : 0 }))
  }, [attendance])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-slate-600">
          <div className="w-14 h-14 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin shadow-lg shadow-emerald-500/20" />
          <span className="text-sm font-semibold text-slate-700">Loading attendance...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="px-3 sm:px-4 lg:px-6 py-4 sm:py-6 max-w-5xl mx-auto space-y-5 bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 min-h-screen">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Attendance
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 bg-clip-text text-transparent">Attendance</h1>
        </div>
          <p className="mt-0.5 text-sm text-slate-500">{stats.total} day{stats.total !== 1 ? 's' : ''} recorded</p>
        </div>
        <button onClick={loadAttendance} disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 transition text-slate-700 font-semibold text-sm shadow-sm">
          <RefreshCw size={14} strokeWidth={2.2} className={loading ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-800">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <div className="font-semibold">Couldn't load attendance</div>
            <div className="text-red-700/90 text-xs mt-0.5">{error}</div>
          </div>
        </div>
      )}

      {consecutiveAbsences >= 3 && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900">
          <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <div className="font-semibold">Consecutive absence warning</div>
            <div className="text-amber-800/90 text-xs mt-0.5">
              You have been absent for {consecutiveAbsences} consecutive day{consecutiveAbsences !== 1 ? 's' : ''}. Please contact your form teacher.
            </div>
          </div>
        </div>
      )}

      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg shadow-slate-200/40 border border-slate-200/60 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
          <div className="flex flex-col items-center justify-center p-6 border-b lg:border-b-0 lg:border-r border-slate-100">
            <CircularProgress
              percent={stats.pct}
              color={stats.pct >= 75 ? '#10b981' : stats.pct >= 50 ? '#f59e0b' : '#ef4444'}
              label="Attendance"
              sublabel={`${stats.present} of ${stats.total} days`}
            />
            <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
              <TrendingUp size={12} strokeWidth={2.2} />
              <span>{stats.pct >= 75 ? 'Good standing' : stats.pct >= 50 ? 'Needs improvement' : 'Critical — below 50%'}</span>
            </div>
          </div>
          <div className="lg:col-span-2 p-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(['present', 'absent', 'late', 'excused'] as const).map((status) => {
              const meta = STATUS_META[status]
              const count = stats[status]
              const Icon = meta.icon
              return (
                <div key={status} className="rounded-xl p-3 border"
                  style={{ backgroundColor: meta.bg, borderColor: meta.color + '33' }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2"
                    style={{ backgroundColor: meta.color, color: '#fff' }}>
                    <Icon size={15} strokeWidth={2.4} />
                  </div>
                  <div className="text-2xl font-bold" style={{ color: meta.color }}>{count}</div>
                  <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-600">{meta.label}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {monthly.length > 0 && (
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg shadow-slate-200/40 border border-slate-200/60 overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/60">
            <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700">
              <Calendar size={18} strokeWidth={2.2} />
            </div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">Monthly Breakdown</h3>
          </div>
          <div className="px-5 py-4 space-y-3">
            {monthly.map((m) => (
              <div key={m.key} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-800">{monthLabel(m.key)}</span>
                  <span className="text-slate-500 text-xs">{m.present}/{m.total} days ({m.pct}%)</span>
                </div>
                <div className="flex h-2.5 rounded-full overflow-hidden bg-slate-100">
                  {m.present > 0 && <div className="h-full bg-emerald-500" style={{ width: `${(m.present / m.total) * 100}%` }} />}
                  {m.late > 0 && <div className="h-full bg-amber-500" style={{ width: `${(m.late / m.total) * 100}%` }} />}
                  {m.excused > 0 && <div className="h-full bg-blue-500" style={{ width: `${(m.excused / m.total) * 100}%` }} />}
                  {m.absent > 0 && <div className="h-full bg-red-500" style={{ width: `${(m.absent / m.total) * 100}%` }} />}
                </div>
              </div>
            ))}
            <div className="pt-2 mt-2 border-t border-slate-100 flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
              {(['present', 'absent', 'late', 'excused'] as const).map((s) => {
                const meta = STATUS_META[s]
                return (
                  <span key={s} className="inline-flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: meta.color }} />
                    {meta.label}
                  </span>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg shadow-slate-200/40 border border-slate-200/60 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/60">
          <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-slate-200 flex items-center justify-center text-slate-700">
            <Calendar size={18} strokeWidth={2.2} />
          </div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight">Daily Log</h3>
        </div>
        <div className="px-5 py-3">
          {attendance.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400">No attendance records yet.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {attendance.slice(0, 50).map((a, i) => {
                const status = (a.status || '').toLowerCase()
                const meta = STATUS_META[status] || STATUS_META.absent
                const Icon = meta.icon
                return (
                  <div key={i} className="flex items-center gap-3 py-3">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl flex flex-col items-center justify-center text-white"
                      style={{ backgroundColor: meta.color }}>
                      <div className="text-[10px] font-semibold uppercase">{getWeekday(a.date)}</div>
                      <div className="text-base font-bold leading-none">{a.date ? new Date(a.date).getDate() : '?'}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-900">{formatShortDate(a.date)}</div>
                      <div className="text-xs text-slate-500">{pickString(a, 'remark') || meta.label}</div>
                    </div>
                    <div className="flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold"
                      style={{ backgroundColor: meta.bg, color: meta.color }}>
                      <Icon size={12} strokeWidth={2.4} />
                      {meta.label}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
