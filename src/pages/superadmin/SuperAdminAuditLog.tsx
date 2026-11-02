import { useState, useEffect, useMemo } from 'react'
import { dbProxy } from '../../lib/dbProxy'
import {
  Loader2, AlertCircle, ScrollText, Search, Filter, X,
  ShieldCheck, ShieldX, LogIn, LogOut, Database, Activity,
} from 'lucide-react'

type EventType = 'login_success' | 'login_failure' | 'logout' | 'admin_action' | 'all'

interface AuditEntry {
  id: string
  timestamp: string
  event_type: string
  role: string
  username: string
  school_id: string | null
  school_name: string
  ip_address: string | null
  user_agent: string | null
  details: string | null
}

const EVENT_META: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  login_success: { label: 'Login Success', color: '#10B981', bg: '#ECFDF5', icon: LogIn },
  login_failure: { label: 'Login Failed', color: '#EF4444', bg: '#FEF2F2', icon: ShieldX },
  logout: { label: 'Logout', color: '#6B7280', bg: '#F3F4F6', icon: LogOut },
  admin_action: { label: 'Admin Action', color: '#8B5CF6', bg: '#F5F3FF', icon: ShieldCheck },
}

export default function SuperAdminAuditLog() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [tableMissing, setTableMissing] = useState(false)

  const [search, setSearch] = useState('')
  const [eventFilter, setEventFilter] = useState<EventType>('all')

  useEffect(() => {
    ;(async () => {
      try {
        const [logRes, sRes] = await Promise.all([
          dbProxy.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(500),
          dbProxy.from('schools').select('id, name'),
        ])

        const sMap: Record<string, string> = {}
        for (const s of (sRes.data || [])) sMap[s.id] = s.name

        const unified: AuditEntry[] = (logRes.data || []).map((e: any) => ({
          id: e.id,
          timestamp: e.created_at || e.timestamp || '',
          event_type: e.event_type || 'admin_action',
          role: e.role || 'unknown',
          username: e.username || '—',
          school_id: e.school_id || null,
          school_name: e.school_id ? (sMap[e.school_id] || 'Unknown') : 'Platform',
          ip_address: e.ip_address || null,
          user_agent: e.user_agent || null,
          details: e.details || e.metadata || null,
        }))
        setEntries(unified)
      } catch (e: any) {
        console.error('Audit log error:', e)
        const msg = (e?.message || '').toLowerCase()
        if (msg.includes('does not exist') || msg.includes('relation') || msg.includes('404')) {
          setTableMissing(true)
        } else {
          setError(e?.message || 'Failed to load audit log')
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return entries.filter(e => {
      if (eventFilter !== 'all' && e.event_type !== eventFilter) return false
      if (q) {
        const blob = `${e.username} ${e.role} ${e.school_name} ${e.details || ''} ${e.ip_address || ''}`.toLowerCase()
        if (!blob.includes(q)) return false
      }
      return true
    })
  }, [entries, search, eventFilter])

  const counts = useMemo(() => ({
    total: entries.length,
    login_success: entries.filter(e => e.event_type === 'login_success').length,
    login_failure: entries.filter(e => e.event_type === 'login_failure').length,
    admin_action: entries.filter(e => e.event_type === 'admin_action').length,
  }), [entries])

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
      <div className="relative overflow-hidden rounded-2xl shadow-md bg-gradient-to-br from-slate-900 via-violet-900 to-indigo-900">
        <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/5 rounded-full pointer-events-none" />
        <div className="relative px-4 sm:px-6 py-5">
          <div className="text-[11px] uppercase tracking-widest text-white/60 font-semibold">Platform Administration</div>
          <h1 className="mt-0.5 text-xl sm:text-2xl lg:text-3xl font-bold text-white tracking-tight">Audit Log</h1>
          <p className="mt-2 text-sm text-white/60">Login attempts, admin actions, and security events</p>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          <div className="text-sm">{error}</div>
        </div>
      )}

      {tableMissing && (
        <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-4">
          <div className="flex items-start gap-3">
            <Database size={18} className="flex-shrink-0 mt-0.5 text-blue-600" />
            <div className="text-sm text-blue-900 space-y-2">
              <p className="font-semibold">The <code className="px-1 py-0.5 bg-blue-100 rounded">audit_logs</code> table doesn't exist yet.</p>
              <p className="text-blue-700">To enable audit logging, run this SQL in your Supabase SQL editor:</p>
              <pre className="bg-blue-950 text-blue-100 text-xs rounded-lg p-3 overflow-x-auto">{`create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  event_type text not null,
  role text,
  username text,
  school_id uuid,
  ip_address text,
  user_agent text,
  details jsonb
);
alter table audit_logs enable row level security;
create policy "superadmin read all audit logs"
  on audit_logs for select
  using (auth.jwt() ->> 'role' = 'superadmin');`}</pre>
              <p className="text-blue-700 text-xs">Then update your <code className="px-1 py-0.5 bg-blue-100 rounded">auth</code> Edge Function to insert into <code className="px-1 py-0.5 bg-blue-100 rounded">audit_logs</code> on every login attempt.</p>
            </div>
          </div>
        </div>
      )}

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
            <LogIn size={16} strokeWidth={2.2} />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{counts.login_success}</div>
          <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">Logins</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 sm:p-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-2.5" style={{ backgroundColor: '#FEF2F2', color: '#EF4444' }}>
            <ShieldX size={16} strokeWidth={2.2} />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{counts.login_failure}</div>
          <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">Failed Logins</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 sm:p-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-2.5" style={{ backgroundColor: '#F5F3FF', color: '#8B5CF6' }}>
            <ShieldCheck size={16} strokeWidth={2.2} />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{counts.admin_action}</div>
          <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">Admin Actions</div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Filter size={14} className="text-slate-400" strokeWidth={2.2} />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Filters</span>
          {(search || eventFilter !== 'all') && (
            <button
              onClick={() => { setSearch(''); setEventFilter('all') }}
              className="ml-auto inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900"
            >
              <X size={12} /> Clear
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search user, IP, details…"
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 outline-none"
            />
          </div>
          <select
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value as EventType)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 outline-none bg-white"
          >
            <option value="all">All Events</option>
            <option value="login_success">Login Success</option>
            <option value="login_failure">Login Failed</option>
            <option value="logout">Logout</option>
            <option value="admin_action">Admin Action</option>
          </select>
        </div>
      </div>

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
            {tableMissing ? 'Audit logging not yet enabled' : 'No events match your filters'}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.slice(0, 200).map((e) => {
              const meta = EVENT_META[e.event_type] || EVENT_META.admin_action
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
                        <span className="text-sm font-semibold text-slate-900">{e.username}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase"
                          style={{ backgroundColor: meta.bg, color: meta.color }}>
                          {meta.label}
                        </span>
                        <span className="text-[11px] text-slate-400">·</span>
                        <span className="text-[11px] text-slate-500 capitalize">{e.role}</span>
                        <span className="text-[11px] text-slate-400">·</span>
                        <span className="text-[11px] text-slate-500">{e.school_name}</span>
                      </div>
                      {e.details && (
                        <p className="mt-0.5 text-xs text-slate-600 truncate">{e.details}</p>
                      )}
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
