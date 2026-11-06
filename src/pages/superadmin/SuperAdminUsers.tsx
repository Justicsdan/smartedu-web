import { useState, useEffect, useMemo } from 'react'
import { dbProxy } from '../../lib/dbProxy'
import {
  Loader2, AlertCircle, Search, Users, GraduationCap, UserCog,
  Shield, Filter, X, CheckCircle2, Ban,
} from 'lucide-react'

type Role = 'student' | 'teacher' | 'admin' | 'all'

interface UnifiedUser {
  id: string
  name: string
  username: string
  role: Role
  school_id: string
  school_name: string
  school_code: string
  is_active: boolean
  created_at: string
}

export default function SuperAdminUsers() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [users, setUsers] = useState<UnifiedUser[]>([])
  const [schoolsMap, setSchoolsMap] = useState<Record<string, any>>({})

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<Role>('all')
  const [schoolFilter, setSchoolFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

  useEffect(() => {
    ;(async () => {
      try {
        const [sRes, stuRes, tRes, aRes] = await Promise.all([
          dbProxy.from('schools').select('id, name, school_code'),
          dbProxy.from('students').select('id, name, admission_number, school_id, is_active, created_at'),
          dbProxy.from('teachers').select('id, name, username, school_id, is_active, created_at'),
          dbProxy.from('admins').select('id, name, username, school_id, is_active, created_at'),
        ])

        const sMap: Record<string, any> = {}
        for (const s of (sRes.data || [])) sMap[s.id] = s
        setSchoolsMap(sMap)

        const unified: UnifiedUser[] = [
          ...(stuRes.data || []).map((s: any) => ({
            id: s.id, name: s.name || '—', username: s.admission_number || '',
            role: 'student' as Role, school_id: s.school_id,
            school_name: sMap[s.school_id]?.name || 'Unknown',
            school_code: sMap[s.school_id]?.school_code || '',
            is_active: s.is_active !== false, created_at: s.created_at || '',
          })),
          ...(tRes.data || []).map((t: any) => ({
            id: t.id, name: t.name || '—', username: t.username || '',
            role: 'teacher' as Role, school_id: t.school_id,
            school_name: sMap[t.school_id]?.name || 'Unknown',
            school_code: sMap[t.school_id]?.school_code || '',
            is_active: t.is_active !== false, created_at: t.created_at || '',
          })),
          ...(aRes.data || []).map((a: any) => ({
            id: a.id, name: a.name || '—', username: a.username || '',
            role: 'admin' as Role, school_id: a.school_id,
            school_name: sMap[a.school_id]?.name || 'Platform',
            school_code: sMap[a.school_id]?.school_code || '',
            is_active: a.is_active !== false, created_at: a.created_at || '',
          })),
        ]
        setUsers(unified)
      } catch (e: any) {
        console.error('Super admin users error:', e)
        setError(e?.message || 'Failed to load users')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return users.filter(u => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false
      if (schoolFilter !== 'all' && u.school_id !== schoolFilter) return false
      if (statusFilter === 'active' && !u.is_active) return false
      if (statusFilter === 'inactive' && u.is_active) return false
      if (q) {
        const blob = `${u.name} ${u.username} ${u.school_name}`.toLowerCase()
        if (!blob.includes(q)) return false
      }
      return true
    })
  }, [users, search, roleFilter, schoolFilter, statusFilter])

  const counts = useMemo(() => ({
    total: users.length,
    students: users.filter(u => u.role === 'student').length,
    teachers: users.filter(u => u.role === 'teacher').length,
    admins: users.filter(u => u.role === 'admin').length,
  }), [users])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-slate-600">
          <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
          <span className="text-sm font-medium">Loading platform users…</span>
        </div>
      </div>
    )
  }

  return (
    <div className="px-3 sm:px-4 lg:px-6 py-4 sm:py-6 max-w-7xl mx-auto space-y-5 bg-gradient-to-br from-slate-50 via-white to-cyan-50/30 min-h-screen">
      <div className="relative overflow-hidden rounded-2xl shadow-md bg-gradient-to-br from-slate-900 via-violet-900 to-indigo-900">
        <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/5 rounded-full pointer-events-none" />
        <div className="relative px-4 sm:px-6 py-5">
          <div className="text-[11px] uppercase tracking-widest text-white/60 font-semibold">Platform Administration</div>
          <h1 className="mt-0.5 text-xl sm:text-2xl lg:text-3xl font-bold text-white tracking-tight">All Platform Users</h1>
          <p className="mt-2 text-sm text-white/60">Search, filter, and manage users across all schools</p>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          <div className="text-sm">{error}</div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg shadow-slate-200/40 border border-slate-200/60 p-3 sm:p-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-2.5" style={{ backgroundColor: '#EEF2FF', color: '#6366F1' }}>
            <Users size={16} strokeWidth={2.2} />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{counts.total}</div>
          <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">Total Users</div>
        </div>
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg shadow-slate-200/40 border border-slate-200/60 p-3 sm:p-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-2.5" style={{ backgroundColor: '#ECFDF5', color: '#10B981' }}>
            <GraduationCap size={16} strokeWidth={2.2} />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{counts.students}</div>
          <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">Students</div>
        </div>
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg shadow-slate-200/40 border border-slate-200/60 p-3 sm:p-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-2.5" style={{ backgroundColor: '#FFFBEB', color: '#F59E0B' }}>
            <UserCog size={16} strokeWidth={2.2} />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{counts.teachers}</div>
          <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">Teachers</div>
        </div>
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg shadow-slate-200/40 border border-slate-200/60 p-3 sm:p-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-2.5" style={{ backgroundColor: '#F5F3FF', color: '#8B5CF6' }}>
            <Shield size={16} strokeWidth={2.2} />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{counts.admins}</div>
          <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">School Admins</div>
        </div>
      </div>

      <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg shadow-slate-200/40 border border-slate-200/60 p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Filter size={14} className="text-slate-400" strokeWidth={2.2} />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Filters</span>
          {(search || roleFilter !== 'all' || schoolFilter !== 'all' || statusFilter !== 'all') && (
            <button
              onClick={() => { setSearch(''); setRoleFilter('all'); setSchoolFilter('all'); setStatusFilter('all') }}
              className="ml-auto inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900"
            >
              <X size={12} /> Clear
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, ID, school…"
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 outline-none"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as Role)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 outline-none bg-white"
          >
            <option value="all">All Roles</option>
            <option value="student">Students</option>
            <option value="teacher">Teachers</option>
            <option value="admin">School Admins</option>
          </select>

          <select
            value={schoolFilter}
            onChange={(e) => setSchoolFilter(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 outline-none bg-white"
          >
            <option value="all">All Schools</option>
            {Object.values(schoolsMap).map((s: any) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 outline-none bg-white"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg shadow-slate-200/40 border border-slate-200/60 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/60">
          <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center text-violet-700">
            <Users size={18} strokeWidth={2.2} />
          </div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight">
            Users <span className="text-slate-400 font-normal">({filtered.length})</span>
          </h3>
        </div>

        {filtered.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-slate-500">
            No users match your filters
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50/80 border-b border-slate-200">
                <tr className="text-left text-[11px] uppercase tracking-wider font-bold text-slate-500">
                  <th className="px-5 py-3">User</th>
                  <th className="px-3 py-3 hidden md:table-cell">Role</th>
                  <th className="px-3 py-3 hidden lg:table-cell">School</th>
                  <th className="px-3 py-3 hidden sm:table-cell">Status</th>
                  <th className="px-5 py-3 hidden lg:table-cell text-right">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.slice(0, 200).map((u) => {
                  const roleStyle = {
                    student: { bg: '#ECFDF5', color: '#10B981', icon: GraduationCap },
                    teacher: { bg: '#FFFBEB', color: '#F59E0B', icon: UserCog },
                    admin: { bg: '#F5F3FF', color: '#8B5CF6', icon: Shield },
                  }[u.role]
                  const RoleIcon = roleStyle.icon
                  return (
                    <tr key={`${u.role}-${u.id}`} className="hover:bg-slate-50/50 transition">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: roleStyle.bg, color: roleStyle.color }}>
                            <RoleIcon size={14} strokeWidth={2.2} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">{u.name}</p>
                            <p className="text-xs text-slate-500 truncate">{u.username || '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 hidden md:table-cell">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                          style={{ backgroundColor: roleStyle.bg, color: roleStyle.color }}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-3 py-3 hidden lg:table-cell">
                        <p className="text-sm text-slate-700 truncate">{u.school_name}</p>
                        <p className="text-xs text-slate-400">{u.school_code || '—'}</p>
                      </td>
                      <td className="px-3 py-3 hidden sm:table-cell">
                        {u.is_active ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                            <CheckCircle2 size={12} /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700">
                            <Ban size={12} /> Suspended
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 hidden lg:table-cell text-right text-xs text-slate-500">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {filtered.length > 200 && (
              <div className="px-5 py-3 text-center text-xs text-slate-400 bg-slate-50/50 border-t border-slate-100">
                Showing first 200 of {filtered.length} results — refine filters to narrow further
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
