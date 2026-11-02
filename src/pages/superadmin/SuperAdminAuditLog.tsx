import { useState, useEffect, useMemo } from 'react'
import { dbProxy } from '../../lib/dbProxy'
import {
  Loader2, AlertCircle, ScrollText, Search, Filter, X,
  Database, Activity, Edit, Trash2, Plus, Eye,
} from 'lucide-react'

interface AuditEntry {
  id: string
  timestamp: string
  action: string
  user_id: string | null
  user_type: string | null
  user_display: string
  school_id: string | null
  school_name: string
  table_name: string | null
  record_id: string | null
  ip_address: string | null
  old_data: any
  new_data: any
}

const ACTION_META: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  insert: { label: 'Create', color: '#10B981', bg: '#ECFDF5', icon: Plus },
  update: { label: 'Update', color: '#3B82F6', bg: '#EFF6FF', icon: Edit },
  delete: { label: 'Delete', color: '#EF4444', bg: '#FEF2F2', icon: Trash2 },
  ADMIN_ACTION: { label: 'Admin Action', color: '#8B5CF6', bg: '#F5F3FF', icon: Database },
  login: { label: 'Login', color: '#10B981', bg: '#ECFDF5', icon: Eye },
  logout: { label: 'Logout', color: '#6B7280', bg: '#F3F4F6', icon: Eye },
}

function getMeta(action: string) {
  if (!action) return ACTION_META.ADMIN_ACTION
  const a = action.toLowerCase()
  if (ACTION_META[action]) return ACTION_META[action]
  if (a.includes('insert') || a.includes('create')) return ACTION_META.insert
  if (a.includes('update') || a.includes('edit')) return ACTION_META.update
  if (a.includes('delete') || a.includes('remove')) return ACTION_META.delete
  if (a.includes('login')) return ACTION_META.login
  if (a.includes('logout')) return ACTION_META.logout
  return { label: action, color: '#6B7280', bg: '#F3F4F6', icon: Database }
}

export default function SuperAdminAuditLog() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [entries, setEntries] = useState<AuditEntry[]>([])

  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [tableFilter, setTableFilter] = useState<string>('all')

  useEffect(() => {
    ;(async () => {
      try {
        const [logRes, sRes, stuRes, tRes, aRes] = await Promise.all([
          dbProxy.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(500),
          dbProxy.from('schools').select('id, name'),
          dbProxy.from('students').select('id, name, admission_number'),
          dbProxy.from('teachers').select('id, name, username'),
          dbProxy.from('admins').select('id, name, username'),
        ])

        const sMap: Record<string, string> = {}
        for (const s of (sRes.data || [])) sMap[s.id] = s.name

        // Build a unified user lookup: id → display name
        const userMap: Record<string, string> = {}
        for (const s of (stuRes.data || [])) userMap[s.id] = `${s.name || '—'} (student, ${s.admission_number || '—'})`
        for (const t of (tRes.data || [])) userMap[t.id] = `${t.name || '—'} (teacher, ${t.username || '—'})`
        for (const a of (aRes.data || [])) userMap[a.id] = `${a.name || '—'} (admin, ${a.username || '—'})`

        const unified: AuditEntry[] = (logRes.data || []).map((e: any) => ({
          id: e.id,
          timestamp: e.created_at || '',
          action: e.action || '—',
          user_id: e.user_id || null,
          user_type: e.user_type || null,
          user_display: e.user_id ? (userMap[e.user_id] || `${e.user_type || 'user'} ${e.user_id.slice(0, 8)}…`) : 'System',
          school_id: e.school_id || null,
          school_name: e.school_id ? (sMap[e.school_id] || 'Unknown') : 'Platform',
          table_name: e.table_name || null,
          record_id: e.record_id || null,
          ip_address: e.ip_address || null,
          old_data: e.old_data,
          new_data: e.new_data,
        }))
        setEntries(unified)
      } catch (e: any) {
        console.error('Audit log error:', e)
        setError(e?.message || 'Failed to load audit log')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return entries.filter(e => {
      if (actionFilter !== 'all' && e.action !== actionFilter) return false
      if (tableFilter !== 'all' && e.table_name !== tableFilter) return false
      if (q) {
        const blob = `${e.action} ${e.user_display} ${e.school_name} ${e.table_name || ''} ${e.ip_address || ''}`.toLowerCase()
        if (!blob.includes(q)) return false
      }
      return true
    })
  }, [entries, search, actionFilter, tableFilter])

  const counts = useMemo(() => ({
    total: entries.length,
    insert: entries.filter(e => (e.action || '').toLowerCase().includes('insert') || (e.action || '').toLowerCase().includes('create')).length,
    update: entries.filter(e => (e.action || '').toLowerCase().includes('update') || (e.action || '').toLowerCase().includes('edit')).length,
    delete: entries.filter(e => (e.action || '').toLowerCase().includes('delete') || (e.action || '').toLowerCase().includes('remove')).length,
  }), [entries])

  const uniqueTables = useMemo(() => {
    const s = new Set<string>()
    entries.forEach(e => { if (e.table_name) s.add(e.table_name) })
    return Array.from(s).sort()
  }, [entries])

  const uniqueActions = useMemo(() => {
    const s = new Set<string>()
    entries.forEach(e => { if (e.action) s.add(e.action) })
    return Array.from(s).sort()
  }, [entries])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-slate-600">
          <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
          <span className="text-sm font-medium">Loading audit log…</span>
        </div>
      </div>
    )
  }

  return (
    <div className="px-3 sm:px-4 lg:px-6 py-4 sm:py-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl shadow-md bg-gradient-to-br from-slate-900 via-violet-900 to-indigo-900">
        <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/5 rounded-full pointer-events-none" />
        <div className="relative px-4 sm:px-6 py-5">
          <div className="text-[11px] uppercase tracking-widest text-white/60 font-semibold">Platform Administration</div>
          <h1 className="mt-0.5 text-xl sm:text-2xl lg:text-3xl font-bold text-white tracking-tight">Audit Log</h1>
          <p className="mt-2 text-sm text-white/60">Every create, update, and delete across the platform</p>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          <div className="text-sm">{error}</div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 sm:p-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-2.5" style={{ backgroundColor: '#EEF2FF', color: '#6366F1' }}>
            <Activity size={16} strokeWidth={2.2} />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{counts.total}</div>
          <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">Total Events</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 sm:p-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-2.5" style={{ backgroundColor: '#ECFDF5', color: '#10B981' }}>
            <Plus size={16} strokeWidth={2.2} />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{counts.insert}</div>
          <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">Creates</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 sm:p-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-2.5" style={{ backgroundColor: '#EFF6FF', color: '#3B82F6' }}>
            <Edit size={16} strokeWidth={2.2} />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{counts.update}</div>
          <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">Updates</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 sm:p-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-2.5" style={{ backgroundColor: '#FEF2F2', color: '#EF4444' }}>
            <Trash2 size={16} strokeWidth={2.2} />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{counts.delete}</div>
          <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">Deletes</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Filter size={14} className="text-slate-400" strokeWidth={2.2} />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Filters</span>
          {(search || actionFilter !== 'all' || tableFilter !== 'all') && (
            <button
              onClick={() => { setSearch(''); setActionFilter('all'); setTableFilter('all') }}
              className="ml-auto inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900"
            >
              <X size={12} /> Clear
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search user, IP, table…"
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 outline-none"
            />
          </div>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 outline-none bg-white"
          >
            <option value="all">All Actions</option>
            {uniqueActions.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select
            value={tableFilter}
            onChange={(e) => setTableFilter(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 outline-none bg-white"
          >
            <option value="all">All Tables</option>
            {uniqueTables.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {/* Log entries */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/60">
          <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center text-violet-700">
            <ScrollText size={18} strokeWidth={2.2} />
          </div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight">
            Events <span className="text-slate-400 font-normal">({filtered.length})</span>
          </h3>
        </div>

        {filtered.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-slate-500">
            No events match your filters
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.slice(0, 200).map((e) => {
              const meta = getMeta(e.action)
              const Icon = meta.icon
              return (
                <div key={e.id} className="px-4 sm:px-5 py-3 hover:bg-slate-50/50 transition">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: meta.bg, color: meta.color }}>
                      <Icon size={14} strokeWidth={2.2} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="text-sm font-semibold text-slate-900">{meta.label}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase"
                          style={{ backgroundColor: meta.bg, color: meta.color }}>
                          {e.action}
                        </span>
                        {e.table_name && (
                          <>
                            <span className="text-[11px] text-slate-400">·</span>
                            <span className="text-[11px] text-slate-500">table: <code className="px-1 py-0.5 bg-slate-100 rounded text-slate-700">{e.table_name}</code></span>
                          </>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-600 truncate">
                        by <span className="font-semibold text-slate-800">{e.user_display}</span>
                        {' · '}
                        <span>{e.school_name}</span>
                        {e.record_id && <span className="text-slate-400"> · record: {e.record_id.slice(0, 8)}…</span>}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-400">
                        <span>{e.timestamp ? new Date(e.timestamp).toLocaleString() : '—'}</span>
                        {e.ip_address && <span>IP: {e.ip_address}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        {filtered.length > 200 && (
          <div className="px-5 py-3 text-center text-xs text-slate-400 bg-slate-50/50 border-t border-slate-100">
            Showing first 200 of {filtered.length} events — refine filters to narrow further
          </div>
        )}
      </div>
    </div>
  )
}
