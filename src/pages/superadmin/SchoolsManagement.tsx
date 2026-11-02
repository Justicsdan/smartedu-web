import { useState, useEffect, useMemo } from 'react'
import { dbProxy } from '../../lib/dbProxy'
import {
  Loader2, AlertCircle, CheckCircle, X, Search, Building2, School,
  CheckCircle2, XCircle, Pencil, Plus, Save,
} from 'lucide-react'

interface School {
  id: string
  name: string
  school_code: string
  logo_url: string | null
  is_active: boolean
  subscription_plan: string
  subscription_status: string
  trial_ends_at: string | null
  subscription_expires_at: string | null
  max_students: number
  max_teachers: number
  admin_username: string
  created_at: string
}

export default function SchoolsManagement() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [schools, setSchools] = useState<School[]>([])
  const [search, setSearch] = useState('')
  const [editingSchool, setEditingSchool] = useState<School | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [addForm, setAddForm] = useState({
    name: '', school_code: '', subscription_plan: 'free',
    subscription_status: 'trialing', is_active: true,
    max_students: 200, max_teachers: 20,
  })

  useEffect(() => {
    loadSchools()
  }, [])

  const loadSchools = async () => {
    setLoading(true)
    try {
      const { data, error } = await dbProxy.from('schools').select('*').order('created_at', { ascending: false })
      if (error) throw error
      setSchools((data || []) as School[])
    } catch (e: any) {
      setError(e.message || 'Failed to load schools')
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return schools
    const q = search.toLowerCase()
    return schools.filter(s => (s.name || '').toLowerCase().includes(q) || (s.school_code || '').toLowerCase().includes(q))
  }, [schools, search])

  const toggleActive = async (school: School) => {
    try {
      const { error } = await dbProxy.from('schools').update({ is_active: !school.is_active }).eq('id', school.id)
      if (error) throw error
      setSchools(prev => prev.map(s => s.id === school.id ? { ...s, is_active: !school.is_active } : s))
      setSuccessMsg(`${school.name} ${school.is_active ? 'deactivated' : 'activated'}`)
    } catch (e: any) { setError(e.message) }
  }

  const handleSaveEdit = async () => {
    if (!editingSchool) return
    try {
      const { error } = await dbProxy.from('schools').update({
        name: editingSchool.name,
        subscription_plan: editingSchool.subscription_plan,
        subscription_status: editingSchool.subscription_status,
        max_students: editingSchool.max_students,
        max_teachers: editingSchool.max_teachers,
      }).eq('id', editingSchool.id)
      if (error) throw error
      setSchools(prev => prev.map(s => s.id === editingSchool.id ? editingSchool : s))
      setEditingSchool(null)
      setSuccessMsg('School updated')
    } catch (e: any) { setError(e.message) }
  }

  const handleAddSubmit = async () => {
    if (!addForm.name.trim() || !addForm.school_code.trim()) {
      setError('School name and code are required')
      return
    }
    setSaving(true)
    setError('')
    try {
      const code = addForm.school_code.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-')
      const { data, error } = await dbProxy.from('schools').insert({
        name: addForm.name.trim(),
        school_code: code,
        is_active: addForm.is_active,
        subscription_plan: addForm.subscription_plan,
        subscription_status: addForm.subscription_status,
        max_students: Number(addForm.max_students) || 0,
        max_teachers: Number(addForm.max_teachers) || 0,
      }).select('*')
      if (error) throw error
      if (data && data[0]) setSchools(prev => [data[0] as School, ...prev])
      setShowAddModal(false)
      setAddForm({
        name: '', school_code: '', subscription_plan: 'free',
        subscription_status: 'trialing', is_active: true,
        max_students: 200, max_teachers: 20,
      })
      setSuccessMsg(`School "${addForm.name}" created with code: ${code}`)
    } catch (e: any) {
      setError(e.message || 'Failed to create school')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-violet-600" /></div>
  }

  return (
    <div className="px-3 sm:px-4 lg:px-6 py-4 sm:py-6 max-w-6xl mx-auto space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Schools Management</h1>
          <p className="text-sm text-slate-500 mt-1">{schools.length} school{schools.length !== 1 ? 's' : ''} on the platform</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-semibold hover:bg-violet-700 transition shadow-sm">
          <Plus size={14} strokeWidth={2.4} />Add School
        </button>
      </div>

      {error && <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-800"><AlertCircle size={18} className="flex-shrink-0 mt-0.5" /><p className="text-sm flex-1">{error}</p></div>}
      {successMsg && <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800"><CheckCircle size={18} className="flex-shrink-0 mt-0.5" /><p className="text-sm flex-1">{successMsg}</p></div>}

      {/* Search */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" strokeWidth={2.2} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or code…"
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-violet-400 focus:bg-white transition" />
        </div>
      </div>

      {/* Schools table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider px-4 py-3">School</th>
                <th className="text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider px-4 py-3">Code</th>
                <th className="text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider px-4 py-3">Plan</th>
                <th className="text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider px-4 py-3">Status</th>
                <th className="text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider px-4 py-3">Limits</th>
                <th className="text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400 text-sm">No schools found.</td></tr>
              ) : (
                filtered.map(s => (
                  <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {s.logo_url ? (
                          <img src={s.logo_url} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center flex-shrink-0"><School size={14} /></div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{s.name}</p>
                          <p className="text-xs text-slate-400">{s.admin_username || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-slate-600">{s.school_code || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold capitalize bg-slate-100 text-slate-600">{s.subscription_plan || 'free'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase w-fit ${s.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {s.is_active ? <CheckCircle2 size={10} /> : <XCircle size={10} />} {s.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <span className="text-[10px] text-slate-400 capitalize">{s.subscription_status || '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      <div>{s.max_students || '∞'} students</div>
                      <div>{s.max_teachers || '∞'} teachers</div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setEditingSchool(s)} className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition"><Pencil size={14} /></button>
                        <button onClick={() => toggleActive(s)} className={`p-1.5 rounded-lg transition ${s.is_active ? 'text-red-400 hover:bg-red-50' : 'text-emerald-400 hover:bg-emerald-50'}`}>
                          {s.is_active ? <XCircle size={14} /> : <CheckCircle2 size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editingSchool && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4" onClick={() => setEditingSchool(null)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-base font-bold text-slate-900">Edit School</h3>
              <button onClick={() => setEditingSchool(null)} className="p-1.5 rounded-md text-slate-500 hover:bg-slate-200"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">School Name</label>
                <input value={editingSchool.name} onChange={e => setEditingSchool({ ...editingSchool, name: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 outline-none transition" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Plan</label>
                  <select value={editingSchool.subscription_plan || 'free'} onChange={e => setEditingSchool({ ...editingSchool, subscription_plan: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 outline-none transition">
                    <option value="free">Free</option>
                    <option value="basic">Basic</option>
                    <option value="premium">Premium</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Status</label>
                  <select value={editingSchool.subscription_status || ''} onChange={e => setEditingSchool({ ...editingSchool, subscription_status: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 outline-none transition">
                    <option value="">None</option>
                    <option value="trialing">Trial</option>
                    <option value="active">Active</option>
                    <option value="past_due">Past Due</option>
                    <option value="canceled">Canceled</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Max Students</label>
                  <input type="number" value={editingSchool.max_students || ''} onChange={e => setEditingSchool({ ...editingSchool, max_students: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 outline-none transition" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Max Teachers</label>
                  <input type="number" value={editingSchool.max_teachers || ''} onChange={e => setEditingSchool({ ...editingSchool, max_teachers: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 outline-none transition" />
                </div>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 flex gap-3">
              <button onClick={() => setEditingSchool(null)} className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-semibold text-sm hover:bg-slate-50">Cancel</button>
              <button onClick={handleSaveEdit} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm shadow-sm">
                <Save size={15} />Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add School Modal — real form */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4" onClick={() => !saving && setShowAddModal(false)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center text-violet-600"><Building2 size={20} /></div>
                <h3 className="text-base font-bold text-slate-900">Add New School</h3>
              </div>
              <button onClick={() => !saving && setShowAddModal(false)} disabled={saving} className="p-1.5 rounded-md text-slate-500 hover:bg-slate-200 disabled:opacity-40"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">School Name <span className="text-red-500">*</span></label>
                <input
                  value={addForm.name}
                  onChange={e => {
                    const name = e.target.value
                    const suggested = name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
                    setAddForm({ ...addForm, name, school_code: suggested })
                  }}
                  placeholder="e.g., Graceville Academy"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">School Code <span className="text-red-500">*</span></label>
                <input
                  value={addForm.school_code}
                  onChange={e => setAddForm({ ...addForm, school_code: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                  placeholder="e.g., graceville"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm font-mono text-slate-900 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 outline-none transition"
                />
                <p className="text-[11px] text-slate-400 mt-1">Lowercase letters, numbers, hyphens only. Used in the login URL: /s/&lt;code&gt;</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Plan</label>
                  <select
                    value={addForm.subscription_plan}
                    onChange={e => setAddForm({ ...addForm, subscription_plan: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 outline-none transition"
                  >
                    <option value="free">Free</option>
                    <option value="basic">Basic</option>
                    <option value="premium">Premium</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Status</label>
                  <select
                    value={addForm.subscription_status}
                    onChange={e => setAddForm({ ...addForm, subscription_status: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 outline-none transition"
                  >
                    <option value="trialing">Trial</option>
                    <option value="active">Active</option>
                    <option value="past_due">Past Due</option>
                    <option value="canceled">Canceled</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Max Students</label>
                  <input
                    type="number"
                    value={addForm.max_students}
                    onChange={e => setAddForm({ ...addForm, max_students: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Max Teachers</label>
                  <input
                    type="number"
                    value={addForm.max_teachers}
                    onChange={e => setAddForm({ ...addForm, max_teachers: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 outline-none transition"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={addForm.is_active}
                  onChange={e => setAddForm({ ...addForm, is_active: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                />
                <span className="text-sm text-slate-700">Activate school immediately</span>
              </label>
            </div>
            <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 flex gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                disabled={saving}
                className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-semibold text-sm hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSubmit}
                disabled={saving || !addForm.name.trim() || !addForm.school_code.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                {saving ? 'Creating…' : 'Create School'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
