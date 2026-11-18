import { useState, useEffect, useCallback } from 'react'
import { dbProxy } from '../../lib/dbProxy'
import { useAuth } from '../../contexts/AuthContext'
import {
  BookOpen, GraduationCap, Plus, Trash2, Search,
  AlertCircle, CheckCircle2, X, Loader2,
} from 'lucide-react'

type Tab = 'courses' | 'semesters'

const LEVELS = [100, 200, 300, 400, 500, 600]
const EMPTY_COURSE = { course_code: '', course_title: '', credit_units: 2, level: 100, semester_type: 'first' }
const EMPTY_SEM = { name: '', session_name: '', semester_type: 'first', start_date: '', end_date: '' }

const inputCls = 'w-full px-3 py-2.5 rounded-xl border-2 border-slate-200 bg-white text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100'
const labelCls = 'block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider'
const primaryBtn = 'inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-bold shadow-md shadow-violet-500/30 hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50'

export default function TertiaryCoursesPage() {
  const { user } = useAuth() as { user: any }
  const schoolId: string = user?.school_id || user?.schoolId || user?.id || ''

  const [tab, setTab] = useState<Tab>('courses')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [courses, setCourses] = useState<any[]>([])
  const [semesters, setSemesters] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [levelFilter, setLevelFilter] = useState('all')

  const [showCourseForm, setShowCourseForm] = useState(false)
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null)
  const [courseForm, setCourseForm] = useState({ ...EMPTY_COURSE })

  const [showSemForm, setShowSemForm] = useState(false)
  const [semForm, setSemForm] = useState({ ...EMPTY_SEM })

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
      const [cRes, sRes] = await Promise.all([
        dbProxy.from('uni_courses').select('*').eq('school_id', schoolId).order('course_code'),
        dbProxy.from('uni_semesters').select('*').eq('school_id', schoolId).order('created_at', { ascending: false }),
      ])
      if (cRes.error) throw cRes.error
      if (sRes.error) throw sRes.error
      setCourses(cRes.data || [])
      setSemesters(sRes.data || [])
    } catch (e: any) {
      setError(e?.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [schoolId])

  useEffect(() => { load() }, [load])

  // ── Courses ──
  const openNewCourse = () => {
    setEditingCourseId(null); setCourseForm({ ...EMPTY_COURSE }); setShowCourseForm(true); setError('')
  }

  const openEditCourse = (c: any) => {
    setEditingCourseId(c.id)
    setCourseForm({
      course_code: c.course_code || '',
      course_title: c.course_title || '',
      credit_units: c.credit_units ?? 2,
      level: c.level ?? 100,
      semester_type: c.semester_type || 'first',
    })
    setShowCourseForm(true); setError('')
  }

  const saveCourse = async () => {
    const code = courseForm.course_code.trim().toUpperCase()
    const title = courseForm.course_title.trim()
    const units = Number(courseForm.credit_units)
    if (!code || !title) { setError('Course code and title are required'); return }
    if (!Number.isInteger(units) || units < 1 || units > 10) { setError('Credit units must be a whole number from 1 to 10'); return }
    if (courses.some(c => c.id !== editingCourseId && (c.course_code || '').toUpperCase() === code)) {
      setError('A course with code ' + code + ' already exists'); return
    }
    setBusy(true); setError('')
    try {
      const payload = {
        course_code: code, course_title: title, credit_units: units,
        level: Number(courseForm.level), semester_type: courseForm.semester_type,
      }
      const res = editingCourseId
        ? await dbProxy.from('uni_courses').update(payload).eq('id', editingCourseId)
        : await dbProxy.from('uni_courses').insert({ ...payload, school_id: schoolId })
      if (res.error) throw res.error
      flash(editingCourseId ? 'Course updated' : 'Course added')
      setShowCourseForm(false); setEditingCourseId(null)
      await load()
    } catch (e: any) {
      setError(e?.message || 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  const deleteCourse = async (c: any) => {
    setBusy(true); setError('')
    try {
      const [en, re] = await Promise.all([
        dbProxy.from('uni_enrollments').select('id').eq('course_id', c.id),
        dbProxy.from('uni_results').select('id').eq('course_id', c.id),
      ])
      if (en.error) throw en.error
      if (re.error) throw re.error
      const nEn = (en.data || []).length
      const nRe = (re.data || []).length
      if (nEn > 0 || nRe > 0) {
        setError(c.course_code + ' has ' + nEn + ' enrollment(s) and ' + nRe + ' result(s), so it cannot be deleted.')
        return
      }
      if (!window.confirm('Delete ' + c.course_code + ' - ' + c.course_title + '?')) return
      const del = await dbProxy.from('uni_courses').delete().eq('id', c.id)
      if (del.error) throw del.error
      flash('Course deleted')
      await load()
    } catch (e: any) {
      setError(e?.message || 'Delete failed')
    } finally {
      setBusy(false)
    }
  }

  // ── Semesters ──
  const saveSemester = async () => {
    const session = semForm.session_name.trim()
    const m = /^(\d{4})\/(\d{4})$/.exec(session)
    if (!m || Number(m[2]) !== Number(m[1]) + 1) { setError('Session must look like 2025/2026'); return }
    if (semForm.start_date && semForm.end_date && semForm.end_date < semForm.start_date) {
      setError('End date cannot be before start date'); return
    }
    const label = semForm.semester_type === 'second' ? 'Second Semester' : 'First Semester'
    const name = semForm.name.trim() || (label + ' ' + session)
    if (semesters.some(s => s.session_name === session && s.semester_type === semForm.semester_type)) {
      setError(label + ' ' + session + ' already exists'); return
    }
    setBusy(true); setError('')
    try {
      const res = await dbProxy.from('uni_semesters').insert({
        school_id: schoolId, name, session_name: session, semester_type: semForm.semester_type,
        is_current: false, start_date: semForm.start_date || null, end_date: semForm.end_date || null,
      })
      if (res.error) throw res.error
      flash('Semester added')
      setShowSemForm(false); setSemForm({ ...EMPTY_SEM })
      await load()
    } catch (e: any) {
      setError(e?.message || 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  const setCurrent = async (id: string) => {
    setBusy(true); setError('')
    try {
      const off = await dbProxy.from('uni_semesters').update({ is_current: false }).eq('school_id', schoolId)
      if (off.error) throw off.error
      const on = await dbProxy.from('uni_semesters').update({ is_current: true }).eq('id', id)
      if (on.error) throw on.error
      flash('Current semester updated')
      await load()
    } catch (e: any) {
      const msg = e?.message || 'Update failed'
      await load()
      setError(msg)
    } finally {
      setBusy(false)
    }
  }

  const deleteSemester = async (s: any) => {
    setBusy(true); setError('')
    try {
      const [en, re] = await Promise.all([
        dbProxy.from('uni_enrollments').select('id').eq('semester_id', s.id),
        dbProxy.from('uni_results').select('id').eq('semester_id', s.id),
      ])
      if (en.error) throw en.error
      if (re.error) throw re.error
      const nEn = (en.data || []).length
      const nRe = (re.data || []).length
      if (nEn > 0 || nRe > 0) {
        setError(s.name + ' has ' + nEn + ' enrollment(s) and ' + nRe + ' result(s), so it cannot be deleted.')
        return
      }
      if (!window.confirm('Delete ' + s.name + '?')) return
      const del = await dbProxy.from('uni_semesters').delete().eq('id', s.id)
      if (del.error) throw del.error
      flash('Semester deleted')
      await load()
    } catch (e: any) {
      setError(e?.message || 'Delete failed')
    } finally {
      setBusy(false)
    }
  }

  const q = search.trim().toLowerCase()
  const filtered = courses.filter(c => {
    const hit = !q || (c.course_code || '').toLowerCase().includes(q) || (c.course_title || '').toLowerCase().includes(q)
    return hit && (levelFilter === 'all' || String(c.level) === levelFilter)
  })
  const totalUnits = filtered.reduce((sum, c) => sum + (Number(c.credit_units) || 0), 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-semibold text-slate-700">Loading courses...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6 py-6 max-w-6xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-700 to-purple-600 bg-clip-text text-transparent">Courses and Semesters</h1>
        <p className="text-sm text-slate-500 mt-1">Manage the course catalogue and academic semesters.</p>
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

      <div className="inline-flex p-1 rounded-xl bg-slate-100">
        {(['courses', 'semesters'] as Tab[]).map(t => (
          <button key={t} onClick={() => { setTab(t); setError('') }}
            className={'px-4 py-2 rounded-lg text-sm font-semibold transition-all ' + (tab === t ? 'bg-white text-violet-700 shadow' : 'text-slate-500 hover:text-slate-700')}>
            {t === 'courses' ? 'Courses (' + courses.length + ')' : 'Semesters (' + semesters.length + ')'}
          </button>
        ))}
      </div>

      {tab === 'courses' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div className="flex gap-2 flex-1 max-w-xl">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search code or title..." className={inputCls + ' pl-9'} />
              </div>
              <select value={levelFilter} onChange={e => setLevelFilter(e.target.value)} className={inputCls + ' w-auto'}>
                <option value="all">All levels</option>
                {LEVELS.map(l => <option key={l} value={String(l)}>{l} Level</option>)}
              </select>
            </div>
            <button onClick={openNewCourse} className={primaryBtn}><Plus size={16} /> Add Course</button>
          </div>

          {showCourseForm && (
            <div className="bg-white rounded-2xl border border-violet-100 shadow-lg shadow-violet-100/50 p-5 space-y-4">
              <h3 className="font-bold text-slate-900">{editingCourseId ? 'Edit Course' : 'New Course'}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Course code</label>
                  <input value={courseForm.course_code} onChange={e => setCourseForm({ ...courseForm, course_code: e.target.value })} placeholder="e.g. CSC101" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Course title</label>
                  <input value={courseForm.course_title} onChange={e => setCourseForm({ ...courseForm, course_title: e.target.value })} placeholder="Introduction to Computer Science" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Credit units</label>
                  <input type="number" min={1} max={10} value={courseForm.credit_units} onChange={e => setCourseForm({ ...courseForm, credit_units: Number(e.target.value) })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Level</label>
                  <select value={courseForm.level} onChange={e => setCourseForm({ ...courseForm, level: Number(e.target.value) })} className={inputCls}>
                    {LEVELS.map(l => <option key={l} value={l}>{l} Level</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Semester</label>
                  <select value={courseForm.semester_type} onChange={e => setCourseForm({ ...courseForm, semester_type: e.target.value })} className={inputCls}>
                    <option value="first">First semester</option>
                    <option value="second">Second semester</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => { setShowCourseForm(false); setEditingCourseId(null) }} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
                <button onClick={saveCourse} disabled={busy} className={primaryBtn}>
                  {busy ? <Loader2 size={16} className="animate-spin" /> : null}{editingCourseId ? 'Save changes' : 'Add course'}
                </button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/40 overflow-hidden">
            {filtered.length === 0 ? (
              <div className="py-14 text-center text-slate-400">
                <BookOpen size={36} className="mx-auto mb-3 text-violet-300" />
                {courses.length === 0 ? 'No courses yet. Add your first course.' : 'No courses match your filters.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="py-3 px-4">Code</th><th className="py-3 px-4">Title</th>
                      <th className="py-3 px-4">Units</th><th className="py-3 px-4">Level</th>
                      <th className="py-3 px-4">Semester</th><th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map(c => (
                      <tr key={c.id} className="hover:bg-violet-50/40">
                        <td className="py-3 px-4"><span className="px-2 py-1 rounded-md bg-violet-50 text-violet-700 font-mono text-xs font-bold">{c.course_code}</span></td>
                        <td className="py-3 px-4 font-semibold text-slate-900">{c.course_title}</td>
                        <td className="py-3 px-4">{c.credit_units}</td>
                        <td className="py-3 px-4">{c.level}</td>
                        <td className="py-3 px-4 capitalize">{c.semester_type}</td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <button onClick={() => openEditCourse(c)} className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-violet-700 hover:bg-violet-50">Edit</button>
                          <button onClick={() => deleteCourse(c)} disabled={busy} className="ml-1 p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={15} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          {filtered.length > 0 && (
            <p className="text-xs text-slate-500">{filtered.length} course(s), {totalUnits} total credit units</p>
          )}
        </div>
      )}

      {tab === 'semesters' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => { setShowSemForm(true); setError('') }} className={primaryBtn}><Plus size={16} /> Add Semester</button>
          </div>

          {showSemForm && (
            <div className="bg-white rounded-2xl border border-violet-100 shadow-lg shadow-violet-100/50 p-5 space-y-4">
              <h3 className="font-bold text-slate-900">New Semester</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Session</label>
                  <input value={semForm.session_name} onChange={e => setSemForm({ ...semForm, session_name: e.target.value })} placeholder="2025/2026" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Semester</label>
                  <select value={semForm.semester_type} onChange={e => setSemForm({ ...semForm, semester_type: e.target.value })} className={inputCls}>
                    <option value="first">First semester</option>
                    <option value="second">Second semester</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Name (optional)</label>
                  <input value={semForm.name} onChange={e => setSemForm({ ...semForm, name: e.target.value })} placeholder="Leave blank to use e.g. First Semester 2025/2026" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Start date</label>
                  <input type="date" value={semForm.start_date} onChange={e => setSemForm({ ...semForm, start_date: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>End date</label>
                  <input type="date" value={semForm.end_date} onChange={e => setSemForm({ ...semForm, end_date: e.target.value })} className={inputCls} />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowSemForm(false)} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
                <button onClick={saveSemester} disabled={busy} className={primaryBtn}>
                  {busy ? <Loader2 size={16} className="animate-spin" /> : null}Add semester
                </button>
              </div>
            </div>
          )}

          {semesters.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 py-14 text-center text-slate-400">
              <GraduationCap size={36} className="mx-auto mb-3 text-violet-300" />
              No semesters yet. Add one, then set it as current.
            </div>
          ) : (
            <div className="grid gap-3">
              {semesters.map(s => (
                <div key={s.id} className={'bg-white rounded-2xl border-2 p-4 flex flex-wrap items-center gap-3 justify-between ' + (s.is_current ? 'border-violet-400 shadow-md shadow-violet-200/50' : 'border-slate-200')}>
                  <div>
                    <p className="font-bold text-slate-900">{s.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {s.session_name}{s.start_date ? ' | ' + s.start_date : ''}{s.end_date ? ' to ' + s.end_date : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.is_current ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-violet-100 text-violet-700">Current</span>
                    ) : (
                      <button onClick={() => setCurrent(s.id)} disabled={busy} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-violet-700 border border-violet-200 hover:bg-violet-50">Set as current</button>
                    )}
                    <button onClick={() => deleteSemester(s)} disabled={busy} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={15} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
