import { useState, useEffect } from 'react'
import { dbProxy } from '../../lib/dbProxy'
import { Building2, Users, ShieldCheck, Loader2 } from 'lucide-react'

export default function SuperAdminDashboard() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ schools: 0, users: 0, admins: 0 })
  const [schools, setSchools] = useState<any[]>([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [schoolsRes, usersRes] = await Promise.all([
        dbProxy.from('schools').select('*').order('created_at', { ascending: false }),
        dbProxy.from('users').select('id, role')
      ])

      const schoolList = schoolsRes.data || []
      const userList = usersRes.data || []

      setSchools(schoolList)
      setStats({
        schools: schoolList.length,
        users: userList.length,
        admins: userList.filter(u => u.role === 'school_admin' || u.role === 'super_admin').length
      })
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="py-24 flex justify-center items-center">
        <Loader2 size={36} className="animate-spin text-violet-600" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Super Admin Dashboard</h1>
        <p className="text-sm text-slate-500">Platform-wide overview and institutional monitoring.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Schools</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{stats.schools}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold">
            <Building2 size={24} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Users</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{stats.users}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Users size={24} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Administrators</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{stats.admins}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <ShieldCheck size={24} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900">All Schools ({schools.length})</h3>
        </div>
        {schools.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">No schools registered yet.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {schools.map(s => (
              <div key={s.id} className="p-4 flex items-center justify-between hover:bg-slate-50/60 transition">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center font-bold text-sm">
                    {s.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 text-sm">{s.name}</h4>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">Code: {s.school_code} &bull; Plan: {s.subscription_plan}</p>
                  </div>
                </div>
                <div>
                  {s.is_active ? (
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                      Active
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700">
                      Inactive
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
