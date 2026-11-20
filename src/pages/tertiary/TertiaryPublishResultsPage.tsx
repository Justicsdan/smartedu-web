import { useState, useEffect, useCallback } from 'react'
import { dbProxy } from '../../lib/dbProxy'
import { useAuth } from '../../contexts/AuthContext'
import { CheckCircle2, AlertCircle, Loader2, X, FileText } from 'lucide-react'

const inputCls = 'w-full px-3 py-2.5 rounded-xl border-2 border-slate-200 bg-white text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100'
const primaryBtn = 'inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-bold shadow-md shadow-violet-500/30 hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50'
const ghostBtn = 'inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border-2 border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-50 transition-all disabled:opacity-50'

export default function TertiaryPublishResultsPage() {
  const { user } = useAuth() as { user: any }
  const schoolId: string = user?.school_id || user?.schoolId || ''

  const [loading, setLoading] = useState(true)
  const [loadingResults, setLoadingResults] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [semesters, setSemesters] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [semesterId, setSemesterId] = useState('')
  const [results, setResults] = useState<any[]>([])

  const flash = (msg: string) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(''), 3500)
  }

  const loadBase = useCallback(async () => {
    if (!schoolId) {
      setLoading(false)
      setError('Your session has no school ID. Please log out and log in again.')
      return
    }
    setLoading(true); setError('')
    try {
      const responses: any[] = await Promise.all([
        dbProxy.from('uni_semesters').select('*').eq('school_id', schoolId).order('created_at', { ascending: false }),
        dbProxy.from('uni_courses').select('id, course_code, course_title').eq('school_id', schoolId).order('course_code'),
      ])
      for (const r of responses) { if (r.error) throw r.error }
      const sems = responses[0].data || []
      setSemesters(sems)
      setCourses(responses[1].data || [])
      const current = sems.find((s: any) => s.is_current)
      setSemesterId((prev) => prev || (current ? current.id : (sems[0] ? sems[0].id : '')))
    } catch (e: any) {
      setError(e?.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [schoolId])

  useEffect(() => { loadBase() }, [loadBase])

  const loadResults = useCallback(async () => {
    if (!schoolId || !semesterId) { setResults([]); return }
    setLoadingResults(true)
    try {
      const res: any = await dbProxy.from('uni_results')
        .select('id, course_id, grade, total_score, is_published')
        .eq('school_id', schoolId).eq('semester_id', semesterId)
      if (res.error) throw res.error
      setResults(res.data || [])
    } catch (e: any) {
      setError(e?.message || 'Failed to load results')
    } finally {
      setLoadingResults(false)
    }
  }, [schoolId, semesterId])

  useEffect(() => { loadResults() }, [loadResults])

  const courseById: Record<string, any> = {}
  for (const c of courses) courseById[c.id] = c

  const isMissing = (r: any) => !r.grade || r.total_score === null || r.total_score === undefined

  const rows = (() => {
    const map: Record<string, { course_id: string; total: number; published: number; missing: number }> = {}
    for (const r of results) {
      const key = r.course_id || 'none'
      if (!map[key]) map[key] = { course_id: key, total: 0, published: 0, missing: 0 }
      map[key].total++
      if (r.is_published) map[key].published++
      else if (isMissing(r)) map[key].missing++
    }
    return Object.values(map).sort((a, b) =>
      String(courseById[a.course_id]?.course_code || '').localeCompare(String(courseById[b.course_id]?.course_code || ''))
    )
  })()

  const totalAll = results.length
  const totalPublished = results.filter((r) => r.is_published).length

  const setPublished = async (courseId: string | null, publish: boolean, label: string) => {
    setError('')
    const targets = results.filter((r) =>
      (courseId === null || r.course_id === courseId) && !!r.is_published !== publish
    )
    if (targets.length === 0) {
      setError(publish ? 'Nothing to publish for ' + label : 'Nothing to unpublish for ' + label)
      return
    }
    if (publish) {
      const bad = targets.filter(isMissing).length
      if (bad > 0) {
        setError(bad + ' result(s) in ' + label + ' have no score or grade. Fix them in Results before publishing.')
        return
      }
    }
    const question = publish
      ? 'Publish ' + targets.length + ' result(s) for ' + label + '? Students will see them immediately.'
      : 'Unpublish ' + targets.length + ' result(s) for ' + label + '? Students will no longer see them.'
    if (!window.confirm(question)) return

    setBusy(true)
    try {
      const payload = publish
        ? { is_published: true, published_at: new Date().toISOString() }
        : { is_published: false, published_at: null }
      const base = dbProxy.from('uni_results').update(payload)
      const res: any = courseId
        ? await base.eq('semester_id', semesterId).eq('is_published', !publish).eq('course_id', courseId)
        : await base.eq('semester_id', semesterId).eq('is_published', !publish)
      if (res.error) throw res.error
      flash((publish ? 'Published ' : 'Unpublished ') + targets.length + ' result(s) for ' + label)
      await loadResults()
    } catch (e: any) {
      setError(e?.message || 'Update failed')
    } finally {
      setBusy(false)
    }
  }

  const semesterName = semesters.find((s) => s.id === semesterId)?.name || 'this semester'

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-semibold text-slate-700">Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6 py-6 max-w-5xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-700 to-purple-600 bg-clip-text text-transparent">Publish Results</h1>
        <p className="text-sm text-slate-500 mt-1">Students only see results after you publish them.</p>
      </div>

      {error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-800">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">{error}</div>
          <button onClick={() => setError('')}><X size={16} /></button>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
          <CheckCircle2 size={18} className="shrink-0" />{success}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
        <div className="flex-1 max-w-sm">
          <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Semester</label>
          <select value={semesterId} onChange={(e) => setSemesterId(e.target.value)} className={inputCls}>
            {semesters.length === 0 && <option value="">No semesters yet</option>}
            {semesters.map((s) => <option key={s.id} value={s.id}>{s.name}{s.is_current ? ' (current)' : ''}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setPublished(null, true, semesterName)} disabled={busy || loadingResults || totalAll === 0} className={primaryBtn}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : null}Publish all
          </button>
          <button onClick={() => setPublished(null, false, semesterName)} disabled={busy || loadingResults || totalPublished === 0} className={ghostBtn}>
            Unpublish all
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Results', value: totalAll },
          { label: 'Published', value: totalPublished },
          { label: 'Unpublished', value: totalAll - totalPublished },
        ].map((c) => (
          <div key={c.label} className="bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/40 p-4">
            <div className="text-2xl font-bold text-slate-900">{c.value}</div>
            <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 mt-0.5">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/40 overflow-hidden">
        {loadingResults ? (
          <div className="py-14 text-center text-slate-400"><Loader2 size={28} className="mx-auto animate-spin text-violet-400" /></div>
        ) : rows.length === 0 ? (
          <div className="py-14 text-center text-slate-400">
            <FileText size={36} className="mx-auto mb-3 text-violet-300" />
            No results entered for this semester yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-3 px-4">Course</th>
                  <th className="py-3 px-4 text-center">Results</th>
                  <th className="py-3 px-4 text-center">Published</th>
                  <th className="py-3 px-4 text-center">Incomplete</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => {
                  const c = courseById[r.course_id]
                  const label = c ? c.course_code : 'removed course'
                  return (
                    <tr key={r.course_id} className="hover:bg-violet-50/40">
                      <td className="py-3 px-4">
                        <span className="font-mono text-xs font-bold text-violet-700">{c ? c.course_code : '(removed course)'}</span>
                        <span className="ml-2 text-slate-700">{c ? c.course_title : ''}</span>
                      </td>
                      <td className="py-3 px-4 text-center">{r.total}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={'px-2 py-0.5 rounded-full text-xs font-semibold ' + (r.published === r.total ? 'bg-emerald-50 text-emerald-700' : r.published > 0 ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500')}>
                          {r.published} / {r.total}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">{r.missing > 0 ? <span className="text-red-600 font-semibold">{r.missing}</span> : '0'}</td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button onClick={() => setPublished(r.course_id === 'none' ? null : r.course_id, true, label)} disabled={busy || r.published === r.total}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-violet-700 hover:bg-violet-50 disabled:opacity-40">Publish</button>
                        <button onClick={() => setPublished(r.course_id === 'none' ? null : r.course_id, false, label)} disabled={busy || r.published === 0}
                          className="ml-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40">Unpublish</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
