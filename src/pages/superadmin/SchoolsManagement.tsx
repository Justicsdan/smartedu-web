import { useState, useEffect, useMemo } from 'react'
import { dbProxy } from '../../lib/dbProxy'
import {
  Loader2, AlertCircle, CheckCircle, X, Search, Building2,
  CheckCircle2, XCircle, Pencil, Plus, User, Copy, Check, Key, Trash2,
} from 'lucide-react'

interface School {
  id: string
  name: string
  school_code: string
  school_type?: string
  logo_url: string | null
  is_active: boolean
  subscription_plan: string
  subscription_status: string
  max_students: number
  max_teachers: number
  created_at: string
  admin_username?: string
  admin_password?: string
}

const SCHOOL_TYPES = [
  { value: 'primary_secondary', label: 'Primary / Secondary School (K-12)' },
  { value: 'university', label: 'University' },
  { value: 'polytechnic', label: 'Polytechnic' },
  { value: 'college_of_education', label: 'College of Education' },
  { value: 'monotechnic', label: 'Monotechnic' },
  { value: 'nursing_school', label: 'College of Nursing & Health' },
  { value: 'college_of_agriculture', label: 'College of Agriculture' },
  { value: 'ieic', label: 'Innovation Enterprise Inst. (IEI)' },
]

const generateUniquePassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  let pass = 'Smart#'
  for (let i = 0; i < 7; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return pass + '!'
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
  const [copiedId, setCopiedId] = useState<string | null>(null)
  
  const [addForm, setAddForm] = useState({
    name: '', school_code: '', school_type: 'university',
    subscription_plan: 'standard', subscription_status: 'active',
    is_active: true, max_students: 2000, max_teachers: 100,
    admin_username: '', admin_password: generateUniquePassword(),
  })

  useEffect(() => {
    loadSchools()
  }, [])

  const [freshCreds, setFreshCreds] = useState<Record<string, string>>({})

  const loadSchools = async () => {
    setLoading(true)
    try {
      const [schoolsRes, adminsRes] = await Promise.all([
        dbProxy.from('schools').select('*').order('created_at', { ascending: false }),
        dbProxy.from('school_admins').select('*')
      ])

      if (schoolsRes.error) throw schoolsRes.error

      const adminMap = new Map<string, string[]>()
            if (adminsRes.data) {
        adminsRes.data.forEach((a: any) => {
          if (a.school_id) {
            adminMap.set(a.school_id, [...(adminMap.get(a.school_id) || []), a.username])
            
          }
        })
      }

      const merged = (schoolsRes.data || []).map((s: any) => ({
        ...s,
        admin_username: (adminMap.get(s.id) || []).join(', ') || '—',
        admin_password: '',
      }))

      setSchools(merged)
    } catch (e: any) {
      setError(e.message || 'Failed to load schools')
    } finally {
      setLoading(false)
    }
  }

  const copyLoginDetails = (s: School) => {
    const text = `School Code: ${s.school_code}\nUsername: ${s.admin_username}\nPassword: ${freshCreds[s.id] || '(hidden, not recoverable)'}`
    navigator.clipboard.writeText(text)
    setCopiedId(s.id)
    setTimeout(() => setCopiedId(null), 2500)
  }

  const handleDeleteSchool = async (schoolId: string, schoolName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${schoolName}"? This will also remove its admin user account and data.`)) {
      return
    }
    setError('')
    try {
      await dbProxy.from('school_admins').delete().eq('school_id', schoolId)
      const { error: delErr } = await dbProxy.from('schools').delete().eq('id', schoolId)
      if (delErr) throw delErr
      setSuccessMsg(`School "${schoolName}" deleted successfully.`)
      loadSchools()
    } catch (e: any) {
      setError(e.message || 'Failed to delete school')
    }
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return schools
    const q = search.toLowerCase()
    return schools.filter(s => 
      (s.name || '').toLowerCase().includes(q) || 
      (s.school_code || '').toLowerCase().includes(q) ||
      (s.admin_username || '').toLowerCase().includes(q)
    )
  }, [schools, search])

  const handleAddSchool = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const code = addForm.school_code.toUpperCase()
      const { data: schoolData, error: insertErr } = await dbProxy.from('schools').insert([{
        name: addForm.name,
        school_code: code,
        school_type: addForm.school_type,
        subscription_plan: addForm.subscription_plan,
        subscription_status: addForm.subscription_status,
        is_active: addForm.is_active,
        max_students: Number(addForm.max_students),
        max_teachers: Number(addForm.max_teachers),
      }]).select()

      if (insertErr) throw insertErr

      const newSchoolId = schoolData && schoolData[0] ? schoolData[0].id : null

      if (newSchoolId) {
        const adminUsername = addForm.admin_username.trim() || `admin_${code.toLowerCase()}`
        await dbProxy.from('school_admins').insert([{
          username: adminUsername,
          password: addForm.admin_password,
          school_id: newSchoolId,
          full_name: addForm.name + ' Admin',
          is_active: true,
        }])
      }

      if (newSchoolId) setFreshCreds(prev => ({ ...prev, [newSchoolId]: addForm.admin_password }))
      setSuccessMsg(`School "${addForm.name}" registered successfully with admin credentials!`)
      setShowAddModal(false)
      setAddForm({
        name: '', school_code: '', school_type: 'university',
        subscription_plan: 'standard', subscription_status: 'active',
        is_active: true, max_students: 2000, max_teachers: 100,
        admin_username: '', admin_password: generateUniquePassword(),
      })
      loadSchools()
    } catch (e: any) {
      setError(e.message || 'Failed to create school and admin account')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateSchool = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingSchool) return
    setSaving(true)
    setError('')
    try {
      const { error: updateErr } = await dbProxy.from('schools').update({
        name: editingSchool.name,
        school_code: editingSchool.school_code,
        school_type: editingSchool.school_type,
        is_active: editingSchool.is_active,
        subscription_plan: editingSchool.subscription_plan,
        subscription_status: editingSchool.subscription_status,
        max_students: Number(editingSchool.max_students),
        max_teachers: Number(editingSchool.max_teachers),
      }).eq('id', editingSchool.id)
      if (updateErr) throw updateErr
      setSuccessMsg('School updated successfully!')
      setEditingSchool(null)
      loadSchools()
    } catch (e: any) {
      setError(e.message || 'Failed to update school')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Schools & Institutions Management</h1>
          <p className="text-sm text-slate-500">Manage institutions, copy secure credentials, edit, or remove entries.</p>
        </div>
        <button
          onClick={() => {
            setAddForm(prev => ({ ...prev, admin_password: generateUniquePassword() }))
            setShowAddModal(true)
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 text-white font-semibold text-sm hover:bg-violet-700 shadow-lg shadow-violet-500/25 transition"
        >
          <Plus size={18} /> Register New School
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
          <AlertCircle size={18} className="shrink-0" /> {error}
        </div>
      )}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-center gap-2">
          <CheckCircle size={18} className="shrink-0" /> {successMsg}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center gap-3">
          <Search size={18} className="text-slate-400" />
          <input
            type="text"
            placeholder="Search by school name, code, or username..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full text-sm outline-none placeholder:text-slate-400 text-slate-800"
          />
        </div>

        {loading ? (
          <div className="py-20 flex justify-center items-center">
            <Loader2 size={32} className="animate-spin text-violet-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-sm">No schools found matching your search.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase tracking-wider">
                  <th className="py-3.5 px-4 font-semibold">Institution Name</th>
                  <th className="py-3.5 px-4 font-semibold">School Code</th>
                  <th className="py-3.5 px-4 font-semibold">Username</th>
                  <th className="py-3.5 px-4 font-semibold">Password</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(s => {
                  const isCopied = copiedId === s.id
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4 font-semibold text-slate-900 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {s.name.charAt(0)}
                        </div>
                        {s.name}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 font-mono text-xs font-bold border border-slate-200">
                          {s.school_code}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-mono text-xs font-semibold border border-indigo-100">
                          <User size={12} /> {s.admin_username}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-mono text-xs font-semibold border border-slate-200">
                          <Key size={12} /> {freshCreds[s.id] || 'Hidden (stored securely)'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {s.is_active ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                            <CheckCircle2 size={12} /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700">
                            <XCircle size={12} /> Inactive
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1.5">
                        <button
                          onClick={() => copyLoginDetails(s)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition ${
                            isCopied ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'border-violet-200 text-violet-700 hover:bg-violet-50'
                          }`}
                          title="Copy Logins"
                        >
                          {isCopied ? <Check size={13} /> : <Copy size={13} />}
                          {isCopied ? 'Copied' : 'Copy'}
                        </button>
                        <button
                          onClick={() => setEditingSchool(s)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition"
                          title="Edit School"
                        >
                          <Pencil size={13} /> Edit
                        </button>
                        <button
                          onClick={() => handleDeleteSchool(s.id, s.name)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold transition"
                          title="Delete School"
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add School Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Building2 size={18} className="text-violet-600" /> Register Institution & Admin Account
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddSchool} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Institution Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lagos State University"
                  value={addForm.name}
                  onChange={e => setAddForm({ ...addForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-100 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">School Code (Unique)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. LASU"
                    value={addForm.school_code}
                    onChange={e => setAddForm({ ...addForm, school_code: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm uppercase font-mono focus:border-violet-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Institution Type</label>
                  <select
                    value={addForm.school_type}
                    onChange={e => setAddForm({ ...addForm, school_type: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:border-violet-500 outline-none"
                  >
                    {SCHOOL_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-violet-50/60 border border-violet-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-violet-900 font-semibold text-xs uppercase tracking-wider">
                    Admin Credentials
                  </span>
                  <button
                    type="button"
                    onClick={() => setAddForm(prev => ({ ...prev, admin_password: generateUniquePassword() }))}
                    className="text-xs text-violet-700 hover:underline font-semibold"
                  >
                    Generate New Password
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Username</label>
                    <input
                      type="text"
                      placeholder="e.g. admin_lasu"
                      value={addForm.admin_username}
                      onChange={e => setAddForm({ ...addForm, admin_username: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:border-violet-500 outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Password</label>
                    <input
                      type="text"
                      value={addForm.admin_password}
                      onChange={e => setAddForm({ ...addForm, admin_password: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:border-violet-500 outline-none font-mono text-violet-800 font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Subscription Plan</label>
                  <select
                    value={addForm.subscription_plan}
                    onChange={e => setAddForm({ ...addForm, subscription_plan: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:border-violet-500 outline-none"
                  >
                    <option value="free">Free</option>
                    <option value="standard">Standard</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={addForm.subscription_status}
                    onChange={e => setAddForm({ ...addForm, subscription_status: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:border-violet-500 outline-none"
                  >
                    <option value="active">Active</option>
                    <option value="trialing">Trialing</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 text-white font-semibold text-sm hover:bg-violet-700 shadow-lg shadow-violet-500/25 transition disabled:opacity-50"
                >
                  {saving && <Loader2 size={16} className="animate-spin" />} Save & Create Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit School Modal */}
      {editingSchool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900">Edit Institution</h3>
              <button onClick={() => setEditingSchool(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleUpdateSchool} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Institution Name</label>
                <input
                  type="text"
                  required
                  value={editingSchool.name}
                  onChange={e => setEditingSchool({ ...editingSchool, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-violet-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">School Code</label>
                <input
                  type="text"
                  required
                  value={editingSchool.school_code}
                  onChange={e => setEditingSchool({ ...editingSchool, school_code: e.target.value.toUpperCase() })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm uppercase font-mono focus:border-violet-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Institution / School Type</label>
                <select
                  value={editingSchool.school_type || 'university'}
                  onChange={e => setEditingSchool({ ...editingSchool, school_type: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:border-violet-500 outline-none"
                >
                  {SCHOOL_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Subscription Plan</label>
                  <select
                    value={editingSchool.subscription_plan}
                    onChange={e => setEditingSchool({ ...editingSchool, subscription_plan: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-white outline-none"
                  >
                    <option value="free">Free</option>
                    <option value="standard">Standard</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Active Status</label>
                  <select
                    value={editingSchool.is_active ? 'true' : 'false'}
                    onChange={e => setEditingSchool({ ...editingSchool, is_active: e.target.value === 'true' })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-white outline-none"
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingSchool(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 text-white font-semibold text-sm hover:bg-violet-700 shadow-lg shadow-violet-500/25 transition disabled:opacity-50"
                >
                  {saving && <Loader2 size={16} className="animate-spin" />} Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
