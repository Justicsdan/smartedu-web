import { useState, useEffect } from 'react'
import { dbProxy } from '../../lib/dbProxy'
import {
  Loader2, AlertCircle, Building2, Users, GraduationCap, School,
  CheckCircle2, XCircle, TrendingUp, Database,
} from 'lucide-react'

export default function SuperAdminDashboard() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [stats, setStats] = useState({
    totalSchools: 0, activeSchools: 0, inactiveSchools: 0,
    totalStudents: 0, totalTeachers: 0, totalClasses: 0,
    trialSchools: 0, paidSchools: 0,
  })
  const [schools, setSchools] = useState<any[]>([])

  useEffect(() => {
    ;(async () => {
      try {
        // Super admin has access to all schools (no school_id filter)
        const [sRes, stuRes, tRes, cRes] = await Promise.all([
          dbProxy.from('schools').select('id, name, school_code, is_active, subscription_plan, subscription_status, trial_ends_at, subscription_expires_at, max_students, max_teachers, created_at'),
          dbProxy.from('students').select('id'),
          dbProxy.from('teachers').select('id'),
          dbProxy.from('classes').select('id'),
        ])

        const schoolList = sRes.data || []
        setSchools(schoolList)

        setStats({
          totalSchools: schoolList.length,
          activeSchools: schoolList.filter((s: any) => s.is_active).length,
          inactiveSchools: schoolList.filter((s: any) => !s.is_active).length,
          totalStudents: (stuRes.data || []).length,
          totalTeachers: (tRes.data || []).length,
          totalClasses: (cRes.data || []).length,
          trialSchools: schoolList.filter((s: any) => (s.subscription_status || '').toLowerCase() === 'trialing').length,
          paidSchools: schoolList.filter((s: any) => (s.subscription_status || '').toLowerCase() === 'active').length,
        })
      } catch (e: any) {
        console.error('Super admin dashboard error:', e)
        setError(e?.message || 'Failed to load platform data')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-slate-600">
          <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
          <span className="text-sm font-medium">Loading platform data…</span>
        </div>
      </div>
    )
  }

  return (
    <div className="px-3 sm:px-4 lg:px-6 py-4 sm:py-6 max-w-6xl mx-auto space-y-5 bg-gradient-to-br from-slate-50 via-white to-cyan-50/30 min-h-screen">
      {/* Welcome banner */}
      <div className="relative overflow-hidden rounded-2xl shadow-md bg-gradient-to-br from-slate-900 via-violet-900 to-indigo-900">
        <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/5 rounded-full pointer-events-none" />
        <div className="absolute -right-4 top-8 w-24 h-24 bg-white/5 rounded-full pointer-events-none" />
        <div className="relative px-4 sm:px-6 py-5">
          <div className="text-[11px] uppercase tracking-widest text-white/60 font-semibold">Platform Administration</div>
          <h1 className="mt-0.5 text-xl sm:text-2xl lg:text-3xl font-bold text-white tracking-tight">SmartEdu Platform Overview</h1>
          <p className="mt-2 text-sm text-white/60">Manage all schools, subscriptions, and platform usage</p>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          <div className="text-sm">{error}</div>
        </div>
      )}

      {/* Platform stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg shadow-slate-200/40 border border-slate-200/60 p-3 sm:p-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-2.5" style={{ backgroundColor: '#EEF2FF', color: '#6366F1' }}>
            <Building2 size={16} strokeWidth={2.2} />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{stats.totalSchools}</div>
          <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">Total Schools</div>
        </div>
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg shadow-slate-200/40 border border-slate-200/60 p-3 sm:p-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-2.5" style={{ backgroundColor: '#ECFDF5', color: '#10B981' }}>
            <Users size={16} strokeWidth={2.2} />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{stats.totalStudents}</div>
          <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">Total Students</div>
        </div>
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg shadow-slate-200/40 border border-slate-200/60 p-3 sm:p-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-2.5" style={{ backgroundColor: '#FFFBEB', color: '#F59E0B' }}>
            <GraduationCap size={16} strokeWidth={2.2} />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{stats.totalTeachers}</div>
          <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">Total Teachers</div>
        </div>
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg shadow-slate-200/40 border border-slate-200/60 p-3 sm:p-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-2.5" style={{ backgroundColor: '#F5F3FF', color: '#8B5CF6' }}>
            <School size={16} strokeWidth={2.2} />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{stats.totalClasses}</div>
          <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">Total Classes</div>
        </div>
      </div>

      {/* Subscription stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg shadow-slate-200/40 border border-slate-200/60 p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 size={16} className="text-emerald-600" strokeWidth={2.2} />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Active</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.activeSchools}</div>
          <div className="text-xs text-slate-400">Schools</div>
        </div>
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg shadow-slate-200/40 border border-slate-200/60 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} className="text-amber-600" strokeWidth={2.2} />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Trial</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.trialSchools}</div>
          <div className="text-xs text-slate-400">Schools</div>
        </div>
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg shadow-slate-200/40 border border-slate-200/60 p-4">
          <div className="flex items-center gap-2 mb-2">
            <XCircle size={16} className="text-red-600" strokeWidth={2.2} />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Inactive</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.inactiveSchools}</div>
          <div className="text-xs text-slate-400">Schools</div>
        </div>
      </div>

      {/* Schools list */}
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg shadow-slate-200/40 border border-slate-200/60 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/60">
          <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700">
            <Building2 size={18} strokeWidth={2.2} />
          </div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight">All Schools ({schools.length})</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {schools.map((s, i) => (
            <div key={s.id} className="p-4 hover:bg-slate-50/50 transition">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {s.logo_url ? (
                    <img src={s.logo_url} alt={s.name} className="w-10 h-10 rounded-lg object-cover bg-slate-100 flex-shrink-0"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center flex-shrink-0">
                      <School size={18} strokeWidth={2.2} />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{s.name}</p>
                    <p className="text-xs text-slate-500">Code: {s.school_code || '—'} · Plan: {s.subscription_plan || 'Free'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${s.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {s.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold capitalize bg-slate-100 text-slate-600">
                    {s.subscription_status || '—'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Platform info */}
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg shadow-slate-200/40 border border-slate-200/60 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Database size={16} className="text-slate-400" strokeWidth={2.2} />
          <h3 className="text-sm font-bold text-slate-900">Platform Information</h3>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-slate-500">Database</p>
            <p className="font-semibold text-slate-800">Supabase PostgreSQL</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Edge Functions</p>
            <p className="font-semibold text-slate-800">db-proxy + auth</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Frontend</p>
            <p className="font-semibold text-slate-800">React 19 + Vite + Tailwind</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Security</p>
            <p className="font-semibold text-slate-800">RLS + JWT + Role Whitelist</p>
          </div>
        </div>
      </div>
    </div>
  )
}
