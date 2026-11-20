import { useState, useEffect, useCallback } from 'react'
import { dbProxy } from '../../lib/dbProxy'
import { useAuth } from '../../contexts/AuthContext'
import { GRADING_PRESETS, CLASSIFICATION_PRESETS } from '../../utils/gradingPresets'
import type { GradeBand } from '../../utils/gradingEngine'
import { GraduationCap, Plus, Trash2, AlertCircle, CheckCircle2, X, Loader2 } from 'lucide-react'

type BandRow = { grade: string; min_score: string; point: string; remark: string; is_pass: boolean }
type ClassRow = { label: string; min: string }

const AWARD_SUGGESTIONS = [
  'Certificate', 'Diploma', "Bachelor's degree", 'Postgraduate diploma',
  "Master's degree", 'Doctorate', 'Pre-degree / foundation', 'Short course',
]
const CALENDARS = [
  { v: 'semester', l: 'Semesters' }, { v: 'trimester', l: 'Trimesters' },
  { v: 'term', l: 'Terms' }, { v: 'quarter', l: 'Quarters' }, { v: 'year', l: 'Full year' },
]
const CREDIT_SYSTEMS = [
  { v: 'credit_units', l: 'Credit units (weighted)' },
  { v: 'equal_weight', l: 'No credits (every course counts equally)' },
]
const REPEAT_POLICIES = [
  { v: 'count_all', l: 'Count every attempt' },
  { v: 'latest_attempt', l: 'Latest attempt replaces earlier ones' },
  { v: 'best_attempt', l: 'Best attempt replaces earlier ones' },
]

const EMPTY_FORM = {
  name: '', code: '', award_type: '', duration_years: '', max_level: '',
  calendar_type: 'semester', credit_system: 'credit_units', repeat_policy: 'count_all',
  uses_gpa: true, scale_max: '5', class_basis: 'gpa', is_active: true,
}
const BLANK_BAND: BandRow = { grade: '', min_score: '0', point: '0', remark: '', is_pass: false }

const inputCls = 'w-full px-3 py-2.5 rounded-xl border-2 border-slate-200 bg-white text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100'
const labelCls = 'block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider'
const primaryBtn = 'inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-bold shadow-md shadow-violet-500/30 hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50'

function toBandRow(b: GradeBand): BandRow {
  return {
    grade: b.grade,
    min_score: String(b.min_score),
    point: String(b.point),
    remark: b.remark || '',
    is_pass: b.is_pass !== undefined ? b.is_pass : b.point > 0,
  }
}

export default function TertiaryProgrammesPage() {
  const { user } = useAuth() as { user: any }
  const schoolId: string = user?.school_id || user?.schoolId || ''

  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [programmes, setProgrammes] = useState<any[]>([])
  const [studentCounts, setStudentCounts] = useState<Record<string, number>>({})
  const [courseCounts, setCourseCounts] = useState<Record<string, number>>({})

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [bands, setBands] = useState<BandRow[]>([{ ...BLANK_BAND }])
  const [classBands, setClassBands] = useState<ClassRow[]>([])

  const flash = (msg: string) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(''), 3000)
  }

  const load = useCallback(async () => {
    if (!schoolId) {
      setLoading(false)
      setError('Your session has no school ID. Please log out and log in again.')
      return
    }
    setLoading(true); setError('')
    try {
      const responses: any[] = await Promise.all([
        dbProxy.from('uni_programmes').select('*').eq('school_id', schoolId).order('name'),
        dbProxy.from('uni_profiles').select('id, programme_id').eq('school_id', schoolId),
        dbProxy.from('uni_courses').select('id, programme_id').eq('school_id', schoolId),
      ])
      for (const r of responses) { if (r.error) throw r.error }
      setProgrammes(responses[0].data || [])
      const sc: Record<string, number> = {}
      for (const r of responses[1].data || []) { if (r.programme_id) sc[r.programme_id] = (sc[r.programme_id] || 0) + 1 }
      const cc: Record<string, number> = {}
      for (const r of responses[2].data || []) { if (r.programme_id) cc[r.programme_id] = (cc[r.programme_id] || 0) + 1 }
      setStudentCounts(sc)
      setCourseCounts(cc)
    } catch (e: any) {
      setError(e?.message || 'Failed to load programmes')
    } finally {
      setLoading(false)
    }
  }, [schoolId])

  useEffect(() => { load() }, [load])

  const openNew = () => {
    setEditingId(null)
    setForm({ ...EMPTY_FORM })
    setBands([{ ...BLANK_BAND }])
    setClassBands([])
    setShowForm(true); setError('')
  }

  const openEdit = (p: any) => {
    setEditingId(p.id)
    const g = p.grading || null
    setForm({
      name: p.name || '', code: p.code || '', award_type: p.award_type || '',
      duration_years: p.duration_years != null ? String(p.duration_years) : '',
      max_level: p.max_level != null ? String(p.max_level) : '',
      calendar_type: p.calendar_type || 'semester',
      credit_system: p.credit_system || 'credit_units',
      repeat_policy: p.repeat_policy || 'count_all',
      uses_gpa: g ? !!g.uses_gpa : true,
      scale_max: g ? String(g.scale_max ?? 0) : '5',
      class_basis: p.classification?.basis || 'gpa',
      is_active: p.is_active !== false,
    })
    setBands(g && Array.isArray(g.bands) && g.bands.length > 0 ? g.bands.map(toBandRow) : [{ ...BLANK_BAND }])
    setClassBands(
      p.classification && Array.isArray(p.classification.bands)
        ? p.classification.bands.map((c: any) => ({ label: String(c.label), min: String(c.min) }))
        : []
    )
    setShowForm(true); setError('')
  }

  const applyGradingPreset = (key: string) => {
    const p = GRADING_PRESETS[key]
    if (!p) return
    setForm((f) => ({ ...f, uses_gpa: p.uses_gpa, scale_max: String(p.scale_max) }))
    setBands(p.bands.map(toBandRow))
  }

  const applyClassPreset = (key: string) => {
    const p = CLASSIFICATION_PRESETS[key]
    if (!p) return
    setForm((f) => ({ ...f, class_basis: p.basis }))
    setClassBands(p.bands.map((c) => ({ label: c.label, min: String(c.min) })))
  }

  const updBand = (i: number, patch: Partial<BandRow>) =>
    setBands(bands.map((b, j) => (j === i ? { ...b, ...patch } : b)))
  const updClass = (i: number, patch: Partial<ClassRow>) =>
    setClassBands(classBands.map((c, j) => (j === i ? { ...c, ...patch } : c)))

  const validate = (): string => {
    const name = form.name.trim()
    if (!name) return 'Programme name is required'
    if (!form.award_type.trim()) return 'Award type is required (type anything, e.g. Diploma)'
    if (programmes.some((p) => p.id !== editingId && String(p.name || '').trim().toLowerCase() === name.toLowerCase())) {
      return 'A programme named ' + name + ' already exists'
    }
    if (bands.length === 0) return 'Add at least one grade band'
    const seen = new Set<number>()
    let hasZero = false
    const scaleMax = Number(form.scale_max)
    for (const b of bands) {
      if (!b.grade.trim()) return 'Every grade band needs a grade label'
      const m = Number(b.min_score)
      if (b.min_score.trim() === '' || !Number.isFinite(m) || m < 0 || m > 100) return 'Minimum scores must be between 0 and 100'
      if (seen.has(m)) return 'Two grade bands share the minimum score ' + m
      seen.add(m)
      if (m === 0) hasZero = true
      const pt = Number(b.point)
      if (b.point.trim() === '' || !Number.isFinite(pt) || pt < 0) return 'Grade points must be zero or more'
      if (form.uses_gpa && scaleMax > 0 && pt > scaleMax) return 'A grade point is above the scale maximum of ' + scaleMax
    }
    if (!hasZero) return 'One band must start at 0 so every score receives a grade'
    const seenClass = new Set<number>()
    for (const c of classBands) {
      if (!c.label.trim()) return 'Every classification band needs a label'
      const m = Number(c.min)
      if (c.min.trim() === '' || !Number.isFinite(m) || m < 0) return 'Classification minimums must be numbers of zero or more'
      if (seenClass.has(m)) return 'Two classification bands share the minimum ' + m
      seenClass.add(m)
    }
    const dur = form.duration_years.trim()
    if (dur !== '' && (!Number.isFinite(Number(dur)) || Number(dur) <= 0)) return 'Duration must be a positive number'
    const ml = form.max_level.trim()
    if (ml !== '' && (!Number.isFinite(Number(ml)) || Number(ml) <= 0)) return 'Maximum level must be a positive number'
    return ''
  }

  const save = async () => {
    const problem = validate()
    if (problem) { setError(problem); return }
    setBusy(true); setError('')
    try {
      const name = form.name.trim()
      const gradingBands = bands
        .map((b) => {
          const row: any = {
            grade: b.grade.trim(),
            min_score: Number(b.min_score),
            point: Number(b.point),
            is_pass: b.is_pass,
          }
          if (b.remark.trim()) row.remark = b.remark.trim()
          return row
        })
        .sort((a, b) => b.min_score - a.min_score)
      const grading = {
        name: name + ' grading',
        scale_max: form.uses_gpa ? Number(form.scale_max) || 0 : 0,
        uses_gpa: form.uses_gpa,
        bands: gradingBands,
      }
      const classification = classBands.length > 0
        ? {
            name: name + ' classification',
            basis: form.class_basis,
            bands: classBands.map((c) => ({ label: c.label.trim(), min: Number(c.min) })).sort((a, b) => b.min - a.min),
          }
        : null
      const payload: any = {
        name,
        code: form.code.trim() || null,
        award_type: form.award_type.trim(),
        duration_years: form.duration_years.trim() === '' ? null : Number(form.duration_years),
        max_level: form.max_level.trim() === '' ? null : Number(form.max_level),
        calendar_type: form.calendar_type,
        credit_system: form.credit_system,
        repeat_policy: form.repeat_policy,
        grading,
        classification,
        is_active: form.is_active,
        updated_at: new Date().toISOString(),
      }
      const res = editingId
        ? await dbProxy.from('uni_programmes').update(payload).eq('id', editingId)
        : await dbProxy.from('uni_programmes').insert({ ...payload, school_id: schoolId })
      if (res.error) throw res.error
      flash(editingId ? 'Programme updated' : 'Programme created')
      setShowForm(false); setEditingId(null)
      await load()
    } catch (e: any) {
      setError(e?.message || 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  const toggleActive = async (p: any) => {
    setBusy(true); setError('')
    try {
      const res = await dbProxy.from('uni_programmes').update({ is_active: p.is_active === false }).eq('id', p.id)
      if (res.error) throw res.error
      await load()
    } catch (e: any) {
      setError(e?.message || 'Update failed')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (p: any) => {
    setBusy(true); setError('')
    try {
      const [pr, co] = await Promise.all([
        dbProxy.from('uni_profiles').select('id').eq('programme_id', p.id),
        dbProxy.from('uni_courses').select('id').eq('programme_id', p.id),
      ])
      if (pr.error) throw pr.error
      if (co.error) throw co.error
      const nS = (pr.data || []).length
      const nC = (co.data || []).length
      if (nS > 0 || nC > 0) {
        setError(p.name + ' has ' + nS + ' student(s) and ' + nC + ' course(s) linked, so it cannot be deleted. Deactivate it instead.')
        return
      }
      if (!window.confirm('Delete ' + p.name + '?')) return
      const del = await dbProxy.from('uni_programmes').delete().eq('id', p.id)
      if (del.error) throw del.error
      flash('Programme deleted')
      await load()
    } catch (e: any) {
      setError(e?.message || 'Delete failed')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-semibold text-slate-700">Loading programmes...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6 py-6 max-w-6xl mx-auto space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-700 to-purple-600 bg-clip-text text-transparent">Programmes</h1>
          <p className="text-sm text-slate-500 mt-1">Each programme has its own grading scale, classification and rules.</p>
        </div>
        <button onClick={openNew} className={primaryBtn}><Plus size={16} /> New Programme</button>
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

      {showForm && (
        <div className="bg-white rounded-2xl border border-violet-100 shadow-lg shadow-violet-100/50 p-5 space-y-6">
          <h3 className="font-bold text-slate-900">{editingId ? 'Edit programme' : 'New programme'}</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Programme name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. BSc Computer Science" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Code (optional)</label>
              <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Award type</label>
              <input list="award-types" value={form.award_type} onChange={(e) => setForm({ ...form, award_type: e.target.value })} placeholder="Pick a suggestion or type your own" className={inputCls} />
              <datalist id="award-types">
                {AWARD_SUGGESTIONS.map((a) => <option key={a} value={a} />)}
              </datalist>
            </div>
            <div>
              <label className={labelCls}>Calendar</label>
              <select value={form.calendar_type} onChange={(e) => setForm({ ...form, calendar_type: e.target.value })} className={inputCls}>
                {CALENDARS.map((c) => <option key={c.v} value={c.v}>{c.l}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Duration (years, optional)</label>
              <input type="number" min={0} step="0.5" value={form.duration_years} onChange={(e) => setForm({ ...form, duration_years: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Highest level or year (optional)</label>
              <input type="number" min={0} value={form.max_level} onChange={(e) => setForm({ ...form, max_level: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Credit system</label>
              <select value={form.credit_system} onChange={(e) => setForm({ ...form, credit_system: e.target.value })} className={inputCls}>
                {CREDIT_SYSTEMS.map((c) => <option key={c.v} value={c.v}>{c.l}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Repeated courses</label>
              <select value={form.repeat_policy} onChange={(e) => setForm({ ...form, repeat_policy: e.target.value })} className={inputCls}>
                {REPEAT_POLICIES.map((c) => <option key={c.v} value={c.v}>{c.l}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="font-bold text-slate-900 text-sm">Grading scale</h4>
              <select value="" onChange={(e) => applyGradingPreset(e.target.value)} className={inputCls + ' w-auto'}>
                <option value="">Start from a template...</option>
                {Object.keys(GRADING_PRESETS).map((k) => <option key={k} value={k}>{GRADING_PRESETS[k].name}</option>)}
              </select>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={form.uses_gpa} onChange={(e) => setForm({ ...form, uses_gpa: e.target.checked })} />
                This programme uses a GPA
              </label>
              {form.uses_gpa && (
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  Scale maximum
                  <input type="number" min={0} step="0.1" value={form.scale_max} onChange={(e) => setForm({ ...form, scale_max: e.target.value })} className={inputCls + ' w-24'} />
                </label>
              )}
            </div>
            <div className="overflow-x-auto">
              <div className="min-w-[560px] space-y-2">
                <div className="grid grid-cols-12 gap-2 text-[10px] uppercase tracking-wider font-semibold text-slate-500">
                  <div className="col-span-2">Grade</div>
                  <div className="col-span-2">Min score</div>
                  <div className="col-span-2">Points</div>
                  <div className="col-span-3">Remark</div>
                  <div className="col-span-2">Pass</div>
                  <div className="col-span-1" />
                </div>
                {bands.map((b, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center">
                    <input value={b.grade} onChange={(e) => updBand(i, { grade: e.target.value })} className={inputCls + ' col-span-2'} />
                    <input type="number" min={0} max={100} value={b.min_score} onChange={(e) => updBand(i, { min_score: e.target.value })} className={inputCls + ' col-span-2'} />
                    <input type="number" min={0} step="0.1" value={b.point} onChange={(e) => updBand(i, { point: e.target.value })} className={inputCls + ' col-span-2'} />
                    <input value={b.remark} onChange={(e) => updBand(i, { remark: e.target.value })} className={inputCls + ' col-span-3'} />
                    <label className="col-span-2 inline-flex items-center gap-2 text-sm text-slate-700">
                      <input type="checkbox" checked={b.is_pass} onChange={(e) => updBand(i, { is_pass: e.target.checked })} /> Pass
                    </label>
                    <button type="button" onClick={() => setBands(bands.filter((_, j) => j !== i))} className="col-span-1 p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={15} /></button>
                  </div>
                ))}
              </div>
            </div>
            <button type="button" onClick={() => setBands([...bands, { ...BLANK_BAND, min_score: '' }])} className="text-sm font-semibold text-violet-700 hover:underline">+ Add grade band</button>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="font-bold text-slate-900 text-sm">Final classification (optional)</h4>
              <select value="" onChange={(e) => applyClassPreset(e.target.value)} className={inputCls + ' w-auto'}>
                <option value="">Start from a template...</option>
                {Object.keys(CLASSIFICATION_PRESETS).map((k) => <option key={k} value={k}>{CLASSIFICATION_PRESETS[k].name}</option>)}
              </select>
            </div>
            {classBands.length > 0 && (
              <div className="space-y-2">
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  Based on
                  <select value={form.class_basis} onChange={(e) => setForm({ ...form, class_basis: e.target.value })} className={inputCls + ' w-auto'}>
                    <option value="gpa">GPA / CGPA</option>
                    <option value="percentage">Average percentage</option>
                  </select>
                </label>
                {classBands.map((c, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center">
                    <input value={c.label} onChange={(e) => updClass(i, { label: e.target.value })} placeholder="Label" className={inputCls + ' col-span-7'} />
                    <input type="number" min={0} step="0.01" value={c.min} onChange={(e) => updClass(i, { min: e.target.value })} placeholder="Minimum" className={inputCls + ' col-span-4'} />
                    <button type="button" onClick={() => setClassBands(classBands.filter((_, j) => j !== i))} className="col-span-1 p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={15} /></button>
                  </div>
                ))}
              </div>
            )}
            <button type="button" onClick={() => setClassBands([...classBands, { label: '', min: '' }])} className="text-sm font-semibold text-violet-700 hover:underline">+ Add classification band</button>
            {classBands.length === 0 && <p className="text-xs text-slate-500">No classification means the award is not classified, for example a certificate.</p>}
          </div>

          <div className="flex gap-2 justify-end">
            <button onClick={() => { setShowForm(false); setEditingId(null) }} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
            <button onClick={save} disabled={busy} className={primaryBtn}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : null}{editingId ? 'Save changes' : 'Create programme'}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/40 overflow-hidden">
        {programmes.length === 0 ? (
          <div className="py-14 text-center text-slate-400">
            <GraduationCap size={36} className="mx-auto mb-3 text-violet-300" />
            No programmes yet. Create your first one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-3 px-4">Programme</th>
                  <th className="py-3 px-4">Award</th>
                  <th className="py-3 px-4">Grading</th>
                  <th className="py-3 px-4 text-center">Students</th>
                  <th className="py-3 px-4 text-center">Courses</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {programmes.map((p) => (
                  <tr key={p.id} className="hover:bg-violet-50/40">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{p.name}</div>
                      {p.code && <div className="text-xs text-slate-500 font-mono">{p.code}</div>}
                    </td>
                    <td className="py-3 px-4">{p.award_type}</td>
                    <td className="py-3 px-4 text-slate-600">
                      {p.grading ? (p.grading.uses_gpa ? 'GPA out of ' + p.grading.scale_max : 'Grades only') : 'Not set'}
                      {p.classification ? ' | classified' : ''}
                    </td>
                    <td className="py-3 px-4 text-center">{studentCounts[p.id] || 0}</td>
                    <td className="py-3 px-4 text-center">{courseCounts[p.id] || 0}</td>
                    <td className="py-3 px-4">
                      <button onClick={() => toggleActive(p)} disabled={busy}
                        className={'px-2.5 py-1 rounded-full text-xs font-semibold ' + (p.is_active === false ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-700')}>
                        {p.is_active === false ? 'Inactive' : 'Active'}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button onClick={() => openEdit(p)} className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-violet-700 hover:bg-violet-50">Edit</button>
                      <button onClick={() => remove(p)} disabled={busy} className="ml-1 p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={15} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
