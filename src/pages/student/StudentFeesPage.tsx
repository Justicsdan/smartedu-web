import { useState, useEffect, useCallback, useMemo } from 'react'
import { dbProxy } from '../../lib/dbProxy'
import { useAuth } from '../../contexts/AuthContext'
import {
  Wallet, CreditCard, Receipt, CheckCircle2, Clock, AlertCircle, Loader2,
  RefreshCw, TrendingUp, Calendar, Banknote, Smartphone,
} from 'lucide-react'

function pickString(record: any, ...keys: string[]): string {
  for (const k of keys) {
    const v = record?.[k]
    if (v !== null && v !== undefined && String(v).trim() !== '') return String(v).trim()
  }
  return ''
}

function pickNumber(record: any, ...keys: string[]): number {
  for (const k of keys) {
    const v = record?.[k]
    if (v !== null && v !== undefined && !isNaN(Number(v))) return Number(v)
  }
  return 0
}

function formatMoney(amount: number, currencySymbol: string = '₦'): string {
  if (!amount) return `${currencySymbol}0`
  return `${currencySymbol || '₦'}${amount.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
}

function formatDate(dateVal: any): string {
  if (!dateVal) return ''
  const d = new Date(dateVal)
  if (isNaN(d.getTime())) return String(dateVal)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function paymentMethodLabel(method: string): { label: string; icon: any; color: string } {
  const m = (method || '').toLowerCase()
  if (m.includes('cash')) return { label: 'Cash', icon: Banknote, color: '#10b981' }
  if (m.includes('transfer') || m.includes('bank')) return { label: 'Bank Transfer', icon: CreditCard, color: '#3b82f6' }
  if (m.includes('card')) return { label: 'Card', icon: CreditCard, color: '#7c3aed' }
  if (m.includes('mobile') || m.includes('ussd') || m.includes('pos')) return { label: 'Mobile/POS', icon: Smartphone, color: '#ea580c' }
  return { label: method ? method.charAt(0).toUpperCase() + method.slice(1) : 'Other', icon: Receipt, color: '#64748b' }
}

function StatCard({ icon: Icon, label, value, sub, accent }: {
  icon: any; label: string; value: string; sub?: string; accent: string
}) {
  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg shadow-slate-200/40 border border-slate-200/60 p-3 sm:p-4">
      <div className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-white mb-2.5"
        style={{ backgroundColor: accent }}>
        <Icon size={16} strokeWidth={2.2} />
      </div>
      <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{value}</div>
      <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">{label}</div>
      {sub && <div className="text-[11px] text-slate-400 mt-0.5">{sub}</div>}
    </div>
  )
}

export default function StudentFeesPage() {
  const { user } = useAuth() as { user: any }
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [assignments, setAssignments] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [feeTypes, setFeeTypes] = useState<any[]>([])
  const [settings, setSettings] = useState<any>(null)
  const studentId = user?.id || user?.student_id || user?.studentId || ''
  const schoolId = user?.school_id || user?.schoolId || ''

  const loadFees = useCallback(async () => {
    if (!user) return
    setLoading(true); setError('')
    try {
      const [aRes, pRes, fRes, sRes] = await Promise.all([
        dbProxy.from('fee_assignments').select('*').eq('student_id', studentId || user.id).order('assigned_at', { ascending: false }),
        dbProxy.from('fee_payments').select('*').eq('student_id', studentId || user.id).order('payment_date', { ascending: false }),
        dbProxy.from('fee_types').select('*').eq('school_id', schoolId).order('name'),
        dbProxy.from('school_settings').select('*').eq('school_id', schoolId).maybeSingle(),
      ])
      if (aRes.error) throw aRes.error
      if (pRes.error) throw pRes.error
      if (fRes.error) throw fRes.error
      setAssignments(aRes.data || [])
      setPayments(pRes.data || [])
      setFeeTypes(fRes.data || [])
      if (!sRes.error) setSettings(sRes.data)
    } catch (e: any) {
      console.error('Fees load error:', e)
      setError(e?.message || 'Failed to load fees')
    } finally { setLoading(false) }
  }, [user, studentId, schoolId])

  useEffect(() => { loadFees() }, [loadFees])

  const currencySymbol = settings?.currency_symbol || '₦'

  const feeTypeMap = useMemo(() => {
    const m: Record<string, any> = {}
    feeTypes.forEach((f) => { m[f.id] = f })
    return m
  }, [feeTypes])

  const enrichedAssignments = useMemo(() => {
    return assignments.map((a) => {
      const ft = feeTypeMap[a.fee_type_id]
      const owed = pickNumber(a, 'amount_owed')
      const paid = pickNumber(a, 'amount_paid')
      const balance = owed - paid
      const pct = owed > 0 ? Math.min(100, Math.round((paid / owed) * 100)) : 0
      return {
        ...a,
        feeTypeName: ft?.name || 'Unknown Fee',
        feeTypeFrequency: ft?.frequency || '',
        feeTypeDescription: ft?.description || '',
        isCompulsory: ft?.is_compulsory,
        owed, paid, balance, pct,
        status: balance <= 0 ? 'paid' : paid > 0 ? 'partial' : 'unpaid',
      }
    })
  }, [assignments, feeTypeMap])

  const totals = useMemo(() => {
    const totalOwed = enrichedAssignments.reduce((s, a) => s + a.owed, 0)
    const totalPaid = enrichedAssignments.reduce((s, a) => s + a.paid, 0)
    return { totalOwed, totalPaid, totalBalance: totalOwed - totalPaid }
  }, [enrichedAssignments])

  const recentPayments = useMemo(() => payments.slice(0, 10), [payments])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin shadow-lg shadow-emerald-500/20" />
          <span className="text-sm font-semibold text-slate-700">Loading fees...</span>
        </div>
      </div>
    )
  }

  const overallPct = totals.totalOwed > 0 ? Math.round((totals.totalPaid / totals.totalOwed) * 100) : 0

  return (
    <div className="px-3 sm:px-4 lg:px-6 py-4 sm:py-6 max-w-5xl mx-auto space-y-5 bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 min-h-screen">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Fees
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 bg-clip-text text-transparent">Fees</h1>
        </div>
          <p className="mt-0.5 text-sm text-slate-500">
            {enrichedAssignments.length} fee assignment{enrichedAssignments.length !== 1 ? 's' : ''} • {payments.length} payment{payments.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={loadFees} disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 transition text-slate-700 font-semibold text-sm shadow-sm">
          <RefreshCw size={14} strokeWidth={2.2} className={loading ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-800">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <div className="font-semibold">Couldn't load fees</div>
            <div className="text-red-700/90 text-xs mt-0.5">{error}</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard icon={Wallet} label="Total Billed" value={formatMoney(totals.totalOwed, currencySymbol)} sub={`${enrichedAssignments.length} assignments`} accent="#2563eb" />
        <StatCard icon={CheckCircle2} label="Total Paid" value={formatMoney(totals.totalPaid, currencySymbol)} sub={`${overallPct}% complete`} accent="#10b981" />
        <StatCard icon={AlertCircle} label="Outstanding" value={formatMoney(totals.totalBalance, currencySymbol)} sub={totals.totalBalance > 0 ? 'Balance due' : 'All settled'} accent={totals.totalBalance > 0 ? '#ef4444' : '#10b981'} />
      </div>

      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg shadow-slate-200/40 border border-slate-200/60 p-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-emerald-600" strokeWidth={2.2} />
            <h3 className="text-sm font-bold text-slate-900">Overall Payment Progress</h3>
          </div>
          <span className="text-sm font-bold text-slate-900">{overallPct}%</span>
        </div>
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all"
            style={{ width: `${overallPct}%`, background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)' }} />
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
          <span>{formatMoney(totals.totalPaid, currencySymbol)} paid</span>
          <span>{formatMoney(totals.totalOwed, currencySymbol)} billed</span>
        </div>
      </div>

      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg shadow-slate-200/40 border border-slate-200/60 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/60">
          <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700">
            <Receipt size={18} strokeWidth={2.2} />
          </div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight">Fee Breakdown</h3>
        </div>
        <div className="px-5 py-3">
          {enrichedAssignments.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400">No fee assignments yet.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {enrichedAssignments.map((a, i) => {
                const statusMeta = a.status === 'paid' ? { label: 'Paid', color: '#10b981', bg: '#ecfdf5' }
                  : a.status === 'partial' ? { label: 'Partial', color: '#f59e0b', bg: '#fffbeb' }
                  : { label: 'Unpaid', color: '#ef4444', bg: '#fef2f2' }
                return (
                  <div key={i} className="py-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-slate-900">{a.feeTypeName}</h4>
                          {a.isCompulsory && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-red-100 text-red-700">Compulsory</span>
                          )}
                          {a.feeTypeFrequency && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase bg-slate-100 text-slate-600">{a.feeTypeFrequency}</span>
                          )}
                        </div>
                        {a.feeTypeDescription && <p className="text-xs text-slate-500 mt-0.5">{a.feeTypeDescription}</p>}
                        {a.due_date && (
                          <p className="text-[11px] text-slate-400 mt-1 inline-flex items-center gap-1">
                            <Calendar size={10} strokeWidth={2.2} /> Due {formatDate(a.due_date)}
                          </p>
                        )}
                      </div>
                      <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase"
                        style={{ backgroundColor: statusMeta.bg, color: statusMeta.color }}>
                        {statusMeta.label}
                      </span>
                    </div>
                    <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${a.pct}%`, backgroundColor: statusMeta.color }} />
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-xs">
                      <span className="text-slate-500">Paid <span className="font-semibold text-emerald-700">{formatMoney(a.paid, currencySymbol)}</span></span>
                      <span className="text-slate-500">of <span className="font-semibold text-slate-800">{formatMoney(a.owed, currencySymbol)}</span></span>
                      {a.balance > 0 && <span className="text-red-600 font-semibold">Bal: {formatMoney(a.balance, currencySymbol)}</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg shadow-slate-200/40 border border-slate-200/60 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/60">
          <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
            <CreditCard size={18} strokeWidth={2.2} />
          </div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight">Payment History</h3>
        </div>
        <div className="px-5 py-3">
          {recentPayments.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400">No payments recorded yet.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentPayments.map((p, i) => {
                const amount = pickNumber(p, 'amount_paid')
                const method = pickString(p, 'payment_method')
                const meta = paymentMethodLabel(method)
                const Icon = meta.icon
                const ft = feeTypeMap[p.fee_type_id]
                return (
                  <div key={i} className="flex items-center gap-3 py-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: meta.color }}>
                      <Icon size={16} strokeWidth={2.2} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-900 truncate">{ft?.name || 'Fee Payment'}</div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                        <span>{meta.label}</span><span>•</span>
                        <span>{formatDate(p.payment_date || p.created_at)}</span>
                        {p.receipt_no && (<><span>•</span><span className="font-mono">{p.receipt_no}</span></>)}
                      </div>
                      {p.remark && <div className="text-[11px] text-slate-400 mt-0.5 italic">{p.remark}</div>}
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <div className="text-sm font-bold text-emerald-700">+{formatMoney(amount, currencySymbol)}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
