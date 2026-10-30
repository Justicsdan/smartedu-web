import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import {
  Plus, Save, Loader2, AlertCircle, CheckCircle, X, Wallet,
  DollarSign, TrendingUp, Users, Search, Filter, Trash2,
  CheckSquare, Square, Calendar,
} from 'lucide-react'

type Tab = 'overview' | 'record' | 'post' | 'history'

interface FeeType { id: string; name: string; amount: number; frequency: string; is_active: boolean; is_compulsory: boolean }
interface FeeAssignment { id: string; student_id: string; fee_type_id: string; session_id: string; term_id: string; amount_owed: number; amount_paid: number; status: string; due_date: string | null; assigned_at: string }
interface FeePayment { id: string; student_id: string; fee_type_id: string; amount_paid: number; payment_method: string; payment_date: string; receipt_no: string; reference_no: string | null; remark: string | null; created_at: string }
interface StudentLite { id: string; first_name: string; middle_name: string | null; last_name: string; class_id: string | null; admission_no: string }
interface ClassRow { id: string; name: string; section: string | null }

function studentName(s: StudentLite): string {
  return [s.first_name, s.middle_name, s.last_name].filter(Boolean).join(' ').trim()
}

const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'Card', 'Cheque', 'Mobile Money', 'USSD']

export default function FeesPage() {
  const { user } = useAuth()
  const schoolId = user?.id || ''

  const [tab, setTab] = useState<Tab>('overview')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const [feeTypes, setFeeTypes] = useState<FeeType[]>([])
  const [payments, setPayments] = useState<FeePayment[]>([])
  const [assignments, setAssignments] = useState<FeeAssignment[]>([])
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [students, setStudents] = useState<StudentLite[]>([])
  const [sessionId, setSessionId] = useState('')
  const [termId, setTermId] = useState('')

  // Record payment form
  const [rpClassId, setRpClassId] = useState('')
  const [rpStudentId, setRpStudentId] = useState('')
  const [rpFeeTypeId, setRpFeeTypeId] = useState('')
  const [rpAmount, setRpAmount] = useState('')
  const [rpMethod, setRpMethod] = useState('Cash')
  const [rpDate, setRpDate] = useState(new Date().toISOString().slice(0, 10))
  const [rpReceipt, setRpReceipt] = useState(`RCP-${Date.now()}`)
  const [rpRef, setRpRef] = useState('')
  const [rpRemark, setRpRemark] = useState('')
  const [rpStudentSearch, setRpStudentSearch] = useState('')

  // Post fees form
  const [postClassId, setPostClassId] = useState('')
  const [postFeeTypeId, setPostFeeTypeId] = useState('')
  const [postDueDate, setPostDueDate] = useState('')
  const [postAmount, setPostAmount] = useState('')
  const [selectedPostIds, setSelectedPostIds] = useState<Set<string>>(new Set())

  // History filters
  const [filterClassId, setFilterClassId] = useState('')
  const [filterFeeTypeId, setFilterFeeTypeId] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [histStudentSearch, setHistStudentSearch] = useState('')

  // Fee type modal
  const [showFeeTypeModal, setShowFeeTypeModal] = useState(false)
  const [feeTypeForm, setFeeTypeForm] = useState({ name: '', amount: '', frequency: 'termly', is_compulsory: false, is_active: true, description: '', currency_code: 'NGN' })

  useEffect(() => {
    if (!schoolId) return
    ;(async () => {
      setLoading(true)
      try {
        const [ftRes, pRes, aRes, cRes, sRes, ssRes, tRes] = await Promise.all([
          supabase.from('fee_types').select('*').eq('school_id', schoolId).order('name'),
          supabase.from('fee_payments').select('*').eq('school_id', schoolId).order('payment_date', { ascending: false }),
          supabase.from('fee_assignments').select('*').eq('school_id', schoolId).order('assigned_at', { ascending: false }),
          supabase.from('classes').select('id, name, section').eq('school_id', schoolId).order('name'),
          supabase.from('students').select('id, first_name, middle_name, last_name, class_id, admission_no').eq('school_id', schoolId).order('first_name'),
          supabase.from('academic_sessions').select('id').eq('school_id', schoolId).eq('is_current', true).maybeSingle(),
          supabase.from('terms').select('id').eq('school_id', schoolId).eq('is_current', true).maybeSingle(),
        ])
        if (ftRes.error) throw ftRes.error
        if (pRes.error) throw pRes.error
        if (aRes.error) throw aRes.error
        if (cRes.error) throw cRes.error
        if (sRes.error) throw sRes.error
        setFeeTypes((ftRes.data || []) as FeeType[])
        setPayments((pRes.data || []) as FeePayment[])
        setAssignments((aRes.data || []) as FeeAssignment[])
        setClasses((cRes.data || []) as ClassRow[])
        setStudents((sRes.data || []) as StudentLite[])
        setSessionId(ssRes.data?.id || '')
        setTermId(tRes.data?.id || '')
      } catch (e: any) {
        setError(e.message || 'Failed to load')
      } finally {
        setLoading(false)
      }
    })()
  }, [schoolId])

  const studentMap = useMemo(() => {
    const m: Record<string, StudentLite> = {}
    for (const s of students) m[s.id] = s
    return m
  }, [students])

  const classMap = useMemo(() => {
    const m: Record<string, ClassRow> = {}
    for (const c of classes) m[c.id] = c
    return m
  }, [classes])

  const feeTypeMap = useMemo(() => {
    const m: Record<string, FeeType> = {}
    for (const f of feeTypes) m[f.id] = f
    return m
  }, [feeTypes])

  const getOutstanding = (studentId: string | null, feeTypeId: string | null): number => {
    if (!studentId || !feeTypeId) return 0
    const a = assignments.find(x => x.student_id === studentId && x.fee_type_id === feeTypeId && x.session_id === sessionId && x.term_id === termId)
    if (!a) return 0
    const owed = Number(a.amount_owed) || 0
    const paid = Number(a.amount_paid) || 0
    return Math.max(0, owed - paid)
  }

  // Stats
  const totalCollected = payments.reduce((sum, p) => sum + (Number(p.amount_paid) || 0), 0)
  const totalOutstanding = assignments.reduce((sum, a) => {
    const owed = Number(a.amount_owed) || 0
    const paid = Number(a.amount_paid) || 0
    return sum + Math.max(0, owed - paid)
  }, 0)
  const paidCount = assignments.filter(a => a.status === 'paid').length
  const pendingCount = assignments.filter(a => a.status === 'pending' || a.status === 'partial').length

  // Record Payment: filtered students
  const rpFilteredStudents = useMemo(() => {
    let list = rpClassId ? students.filter(s => s.class_id === rpClassId) : students
    if (rpStudentSearch.trim()) {
      const q = rpStudentSearch.toLowerCase()
      list = list.filter(s => {
        const name = studentName(s).toLowerCase()
        return name.includes(q) || (s.admission_no || '').toLowerCase().includes(q)
      })
    }
    return list
  }, [students, rpClassId, rpStudentSearch])

  // Post Fees: postable students (not already assigned this fee for current session/term)
  const postableStudents = useMemo(() => {
    if (!postClassId) return []
    let list = students.filter(s => s.class_id === postClassId)
    if (postFeeTypeId) {
      const assigned = new Set(
        assignments
          .filter(a => a.fee_type_id === postFeeTypeId && a.session_id === sessionId && a.term_id === termId)
          .map(a => a.student_id)
      )
      list = list.filter(s => !assigned.has(s.id))
    }
    return list
  }, [students, postClassId, postFeeTypeId, assignments, sessionId, termId])

  // History: filtered assignments
  const filteredAssignments = useMemo(() => {
    let list = assignments
    if (filterClassId) {
      const ids = new Set(students.filter(s => s.class_id === filterClassId).map(s => s.id))
      list = list.filter(a => ids.has(a.student_id))
    }
    if (filterFeeTypeId) list = list.filter(a => a.fee_type_id === filterFeeTypeId)
    if (filterStatus) list = list.filter(a => a.status === filterStatus)
    if (histStudentSearch.trim()) {
      const q = histStudentSearch.toLowerCase()
      const matchedIds = new Set(students.filter(s => {
        const name = studentName(s).toLowerCase()
        return name.includes(q) || (s.admission_no || '').toLowerCase().includes(q)
      }).map(s => s.id))
      list = list.filter(a => matchedIds.has(a.student_id))
    }
    return list
  }, [assignments, students, filterClassId, filterFeeTypeId, filterStatus, histStudentSearch])

  // History: filtered payments
  const filteredPayments = useMemo(() => {
    let list = payments
    if (filterClassId) {
      const ids = new Set(students.filter(s => s.class_id === filterClassId).map(s => s.id))
      list = list.filter(p => ids.has(p.student_id))
    }
    if (filterFeeTypeId) list = list.filter(p => p.fee_type_id === filterFeeTypeId)
    if (histStudentSearch.trim()) {
      const q = histStudentSearch.toLowerCase()
      const matchedIds = new Set(students.filter(s => {
        const name = studentName(s).toLowerCase()
        return name.includes(q) || (s.admission_no || '').toLowerCase().includes(q)
      }).map(s => s.id))
      list = list.filter(p => matchedIds.has(p.student_id))
    }
    return list
  }, [payments, students, filterClassId, filterFeeTypeId, histStudentSearch])

  const handleRpStudentChange = (studentId: string) => {
    setRpStudentId(studentId)
    if (rpFeeTypeId) {
      const outstanding = getOutstanding(studentId, rpFeeTypeId)
      if (outstanding > 0) setRpAmount(outstanding.toFixed(0))
      else {
        const ft = feeTypes.find(f => f.id === rpFeeTypeId)
        if (ft) setRpAmount(String(ft.amount || ''))
      }
    }
  }

  const handleRpFeeTypeChange = (feeTypeId: string) => {
    setRpFeeTypeId(feeTypeId)
    if (rpStudentId) {
      const outstanding = getOutstanding(rpStudentId, feeTypeId)
      if (outstanding > 0) setRpAmount(outstanding.toFixed(0))
      else {
        const ft = feeTypes.find(f => f.id === feeTypeId)
        if (ft) setRpAmount(String(ft.amount || ''))
      }
    }
  }

  const savePayment = async () => {
    if (!rpStudentId || !rpFeeTypeId) { setError('Select student and fee type'); return }
    const amt = Number(rpAmount) || 0
    if (amt <= 0) { setError('Enter a valid amount'); return }
    setSaving(true); setError('')
    try {
      const assignment = assignments.find(a =>
        a.student_id === rpStudentId && a.fee_type_id === rpFeeTypeId &&
        a.session_id === sessionId && a.term_id === termId
      )
      const { error: pErr } = await supabase.from('fee_payments').insert({
        school_id: schoolId,
        student_id: rpStudentId,
        fee_type_id: rpFeeTypeId,
        session_id: sessionId,
        term_id: termId,
        amount_paid: amt,
        payment_method: rpMethod,
        payment_date: rpDate,
        receipt_no: rpReceipt.trim(),
        reference_no: rpRef.trim() || null,
        recorded_by: user?.id || null,
        remark: rpRemark.trim() || null,
        fee_assignment_id: assignment?.id || null,
      })
      if (pErr) throw pErr
      if (assignment) {
        const currentPaid = (Number(assignment.amount_paid) || 0) + amt
        const owed = Number(assignment.amount_owed) || 0
        const newStatus = currentPaid >= owed ? 'paid' : (currentPaid > 0 ? 'partial' : 'pending')
        const { error: aErr } = await supabase.from('fee_assignments').update({
          amount_paid: currentPaid,
          status: newStatus,
        }).eq('id', assignment.id)
        if (aErr) throw aErr
      }
      // Reload
      const [pRes, aRes] = await Promise.all([
        supabase.from('fee_payments').select('*').eq('school_id', schoolId).order('payment_date', { ascending: false }),
        supabase.from('fee_assignments').select('*').eq('school_id', schoolId).order('assigned_at', { ascending: false }),
      ])
      setPayments((pRes.data || []) as FeePayment[])
      setAssignments((aRes.data || []) as FeeAssignment[])
      setSuccessMsg('Payment recorded successfully')
      // Reset form
      setRpAmount('')
      setRpReceipt(`RCP-${Date.now()}`)
      setRpRef('')
      setRpRemark('')
    } catch (e: any) {
      setError(e.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const toggleAllPost = () => {
    if (selectedPostIds.size === postableStudents.length) {
      setSelectedPostIds(new Set())
    } else {
      setSelectedPostIds(new Set(postableStudents.map(s => s.id)))
    }
  }

  const togglePostStudent = (id: string) => {
    const next = new Set(selectedPostIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedPostIds(next)
  }

  const postFees = async () => {
    if (!postFeeTypeId || selectedPostIds.size === 0) {
      setError('Select fee type and at least one student')
      return
    }
    setSaving(true); setError('')
    try {
      const ft = feeTypes.find(f => f.id === postFeeTypeId)
      const amt = postAmount ? Number(postAmount) : (ft ? Number(ft.amount) : 0)
      const inserts = Array.from(selectedPostIds).map(studentId => ({
        school_id: schoolId,
        student_id: studentId,
        fee_type_id: postFeeTypeId,
        session_id: sessionId,
        term_id: termId,
        amount_owed: amt,
        amount_paid: 0,
        status: 'pending',
        due_date: postDueDate || null,
        assigned_by: user?.id || null,
      }))
      const { error: inErr } = await supabase.from('fee_assignments').insert(inserts)
      if (inErr) throw inErr
      const { data: aRes } = await supabase.from('fee_assignments').select('*').eq('school_id', schoolId).order('assigned_at', { ascending: false })
      setAssignments((aRes || []) as FeeAssignment[])
      setSuccessMsg(`Fees posted for ${inserts.length} student(s)`)
      setSelectedPostIds(new Set())
    } catch (e: any) {
      setError(e.message || 'Post failed')
    } finally {
      setSaving(false)
    }
  }

  const saveFeeType = async () => {
    if (!feeTypeForm.name.trim() || !feeTypeForm.amount) { setError('Name and amount required'); return }
    setSaving(true); setError('')
    try {
      const { error } = await supabase.from('fee_types').insert({
        school_id: schoolId,
        name: feeTypeForm.name.trim(),
        amount: Number(feeTypeForm.amount),
        frequency: feeTypeForm.frequency,
        is_compulsory: feeTypeForm.is_compulsory,
        is_active: feeTypeForm.is_active,
        description: feeTypeForm.description || null,
        currency_code: feeTypeForm.currency_code || 'NGN',
      })
      if (error) throw error
      const { data } = await supabase.from('fee_types').select('*').eq('school_id', schoolId).order('name')
      setFeeTypes((data || []) as FeeType[])
      setShowFeeTypeModal(false)
      setFeeTypeForm({ name: '', amount: '', frequency: 'termly', is_compulsory: false, is_active: true, description: '', currency_code: 'NGN' })
      setSuccessMsg('Fee type created')
    } catch (e: any) {
      setError(e.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-[#1A237E] animate-spin" /></div>
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Fees Management</h1>
          <p className="text-sm text-gray-500 mt-1">Record payments, post fees to classes, view history</p>
        </div>
        <button onClick={() => setShowFeeTypeModal(true)} className="flex items-center gap-2 px-4 py-2 bg-[#1A237E] text-white rounded-lg text-sm font-medium hover:bg-[#283593] transition">
          <Plus className="w-4 h-4" /> New Fee Type
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      {successMsg && (
        <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-green-700">{successMsg}</p>
        </div>
      )}

      <div className="flex gap-1 bg-white rounded-xl border border-gray-100 p-1 overflow-x-auto">
        <button onClick={() => setTab('overview')} className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${tab === 'overview' ? 'bg-[#1A237E] text-white' : 'text-gray-600 hover:bg-gray-50'}`}>Overview</button>
        <button onClick={() => setTab('record')} className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${tab === 'record' ? 'bg-[#1A237E] text-white' : 'text-gray-600 hover:bg-gray-50'}`}>Record Payment</button>
        <button onClick={() => setTab('post')} className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${tab === 'post' ? 'bg-[#1A237E] text-white' : 'text-gray-600 hover:bg-gray-50'}`}>Post Fees</button>
        <button onClick={() => setTab('history')} className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${tab === 'history' ? 'bg-[#1A237E] text-white' : 'text-gray-600 hover:bg-gray-50'}`}>History</button>
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center"><DollarSign className="w-5 h-5 text-green-600" /></div>
              <div><p className="text-xs text-gray-500">Total Collected</p><p className="text-lg font-bold text-gray-800">{totalCollected.toLocaleString()}</p></div>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center"><TrendingUp className="w-5 h-5 text-red-600" /></div>
              <div><p className="text-xs text-gray-500">Outstanding</p><p className="text-lg font-bold text-gray-800">{totalOutstanding.toLocaleString()}</p></div>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center"><CheckCircle className="w-5 h-5 text-blue-600" /></div>
              <div><p className="text-xs text-gray-500">Fully Paid</p><p className="text-lg font-bold text-gray-800">{paidCount}</p></div>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center"><Wallet className="w-5 h-5 text-orange-600" /></div>
              <div><p className="text-xs text-gray-500">Pending/Partial</p><p className="text-lg font-bold text-gray-800">{pendingCount}</p></div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Fee Types ({feeTypes.length})</h3>
            {feeTypes.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-6">No fee types created yet. Click "New Fee Type" to create one.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {feeTypes.map(ft => (
                  <div key={ft.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-gray-800">{ft.name}</p>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${ft.is_compulsory ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>
                        {ft.is_compulsory ? 'Compulsory' : 'Optional'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">{ft.currency_code} {Number(ft.amount).toLocaleString()} · {ft.frequency}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Record Payment */}
      {tab === 'record' && (
        <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4 max-w-2xl">
          <h3 className="text-sm font-semibold text-gray-700">Record New Payment</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Class</label>
              <select value={rpClassId} onChange={e => { setRpClassId(e.target.value); setRpStudentId('') }} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30">
                <option value="">All Classes</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}{c.section ? ` (${c.section})` : ''}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Student Search</label>
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input value={rpStudentSearch} onChange={e => setRpStudentSearch(e.target.value)} placeholder="Name or admission no..." className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30" />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Student *</label>
            <select value={rpStudentId} onChange={e => handleRpStudentChange(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30">
              <option value="">Select student</option>
              {rpFilteredStudents.slice(0, 100).map(s => <option key={s.id} value={s.id}>{studentName(s)} ({s.admission_no || '-'})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Fee Type *</label>
              <select value={rpFeeTypeId} onChange={e => handleRpFeeTypeChange(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30">
                <option value="">Select fee type</option>
                {feeTypes.map(ft => <option key={ft.id} value={ft.id}>{ft.name} ({ft.currency_code} {Number(ft.amount).toLocaleString()})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Amount *</label>
              <input type="number" value={rpAmount} onChange={e => setRpAmount(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30" />
            </div>
          </div>
          {rpStudentId && rpFeeTypeId && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-700">
                Outstanding: <span className="font-semibold">{getOutstanding(rpStudentId, rpFeeTypeId).toLocaleString()}</span>
              </p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Payment Method</label>
              <select value={rpMethod} onChange={e => setRpMethod(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30">
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Payment Date</label>
              <input type="date" value={rpDate} onChange={e => setRpDate(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Receipt No</label>
              <input value={rpReceipt} onChange={e => setRpReceipt(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Reference No</label>
              <input value={rpRef} onChange={e => setRpRef(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Remark</label>
            <input value={rpRemark} onChange={e => setRpRemark(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30" />
          </div>
          <div className="flex justify-end pt-2">
            <button onClick={savePayment} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-[#1A237E] text-white rounded-lg text-sm font-medium hover:bg-[#283593] transition disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving...' : 'Record Payment'}
            </button>
          </div>
        </div>
      )}

      {/* Post Fees */}
      {tab === 'post' && (
        <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">Post Fees to Class</h3>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Class *</label>
              <select value={postClassId} onChange={e => { setPostClassId(e.target.value); setSelectedPostIds(new Set()) }} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30">
                <option value="">Select class</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}{c.section ? ` (${c.section})` : ''}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Fee Type *</label>
              <select value={postFeeTypeId} onChange={e => setPostFeeTypeId(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30">
                <option value="">Select fee type</option>
                {feeTypes.map(ft => <option key={ft.id} value={ft.id}>{ft.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Amount (override)</label>
              <input type="number" value={postAmount} onChange={e => setPostAmount(e.target.value)} placeholder="Default from fee type" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Due Date</label>
            <input type="date" value={postDueDate} onChange={e => setPostDueDate(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30" />
          </div>

          {postableStudents.length > 0 && (
            <div className="border border-gray-100 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between p-3 bg-gray-50 border-b border-gray-100">
                <button onClick={toggleAllPost} className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  {selectedPostIds.size === postableStudents.length && postableStudents.length > 0
                    ? <CheckSquare className="w-4 h-4 text-[#1A237E]" />
                    : <Square className="w-4 h-4 text-gray-400" />}
                  Select All ({postableStudents.length} unassigned)
                </button>
                <span className="text-xs text-gray-500">{selectedPostIds.size} selected</span>
              </div>
              <div className="max-h-60 overflow-y-auto">
                {postableStudents.map(s => (
                  <button key={s.id} onClick={() => togglePostStudent(s.id)} className="flex items-center gap-3 w-full p-2.5 hover:bg-gray-50 border-b border-gray-50 last:border-0 text-left">
                    {selectedPostIds.has(s.id)
                      ? <CheckSquare className="w-4 h-4 text-[#1A237E] flex-shrink-0" />
                      : <Square className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{studentName(s)}</p>
                      <p className="text-xs text-gray-400">{s.admission_no || '-'}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button onClick={postFees} disabled={saving || selectedPostIds.size === 0} className="flex items-center gap-2 px-4 py-2 bg-[#1A237E] text-white rounded-lg text-sm font-medium hover:bg-[#283593] transition disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Posting...' : `Post to ${selectedPostIds.size} Student(s)`}
            </button>
          </div>
        </div>
      )}

      {/* History */}
      {tab === 'history' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 p-3 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input value={histStudentSearch} onChange={e => setHistStudentSearch(e.target.value)} placeholder="Search student..." className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30" />
            </div>
            <select value={filterClassId} onChange={e => setFilterClassId(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30">
              <option value="">All Classes</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={filterFeeTypeId} onChange={e => setFilterFeeTypeId(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30">
              <option value="">All Fee Types</option>
              {feeTypes.map(ft => <option key={ft.id} value={ft.id}>{ft.name}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30">
              <option value="">All Status</option>
              <option value="paid">Paid</option>
              <option value="partial">Partial</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="p-3 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700">Payment History ({filteredPayments.length})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-3 py-2">Date</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-3 py-2">Student</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-3 py-2">Fee Type</th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase px-3 py-2">Amount</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-3 py-2">Method</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-3 py-2">Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.length === 0 ? (
                    <tr><td colSpan={6} className="p-8 text-center text-gray-400 text-sm">No payments found.</td></tr>
                  ) : (
                    filteredPayments.slice(0, 100).map(p => {
                      const s = studentMap[p.student_id]
                      const ft = feeTypeMap[p.fee_type_id]
                      return (
                        <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                          <td className="px-3 py-2 text-xs text-gray-600">{p.payment_date ? new Date(p.payment_date).toLocaleDateString() : '-'}</td>
                          <td className="px-3 py-2 text-sm text-gray-800">{s ? studentName(s) : '-'}</td>
                          <td className="px-3 py-2 text-sm text-gray-600">{ft?.name || '-'}</td>
                          <td className="px-3 py-2 text-right text-sm font-semibold text-green-700">{Number(p.amount_paid).toLocaleString()}</td>
                          <td className="px-3 py-2 text-xs text-gray-600">{p.payment_method || '-'}</td>
                          <td className="px-3 py-2 text-xs font-mono text-gray-600">{p.receipt_no || '-'}</td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="p-3 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700">Fee Assignments ({filteredAssignments.length})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-3 py-2">Student</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-3 py-2">Fee Type</th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase px-3 py-2">Owed</th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase px-3 py-2">Paid</th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase px-3 py-2">Outstanding</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssignments.length === 0 ? (
                    <tr><td colSpan={6} className="p-8 text-center text-gray-400 text-sm">No fee assignments found.</td></tr>
                  ) : (
                    filteredAssignments.slice(0, 100).map(a => {
                      const s = studentMap[a.student_id]
                      const ft = feeTypeMap[a.fee_type_id]
                      const owed = Number(a.amount_owed) || 0
                      const paid = Number(a.amount_paid) || 0
                      const outstanding = Math.max(0, owed - paid)
                      return (
                        <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                          <td className="px-3 py-2 text-sm text-gray-800">{s ? studentName(s) : '-'}</td>
                          <td className="px-3 py-2 text-sm text-gray-600">{ft?.name || '-'}</td>
                          <td className="px-3 py-2 text-right text-sm text-gray-600">{owed.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right text-sm text-green-700">{paid.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right text-sm text-red-700">{outstanding.toLocaleString()}</td>
                          <td className="px-3 py-2">
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                              a.status === 'paid' ? 'bg-green-100 text-green-700' :
                              a.status === 'partial' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>{a.status}</span>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Fee Type Modal */}
      {showFeeTypeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowFeeTypeModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800">New Fee Type</h2>
              <button onClick={() => setShowFeeTypeModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Name *</label>
                <input value={feeTypeForm.name} onChange={e => setFeeTypeForm({ ...feeTypeForm, name: e.target.value })} placeholder="e.g., Tuition" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Amount *</label>
                  <input type="number" value={feeTypeForm.amount} onChange={e => setFeeTypeForm({ ...feeTypeForm, amount: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Currency</label>
                  <input value={feeTypeForm.currency_code} onChange={e => setFeeTypeForm({ ...feeTypeForm, currency_code: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Frequency</label>
                <select value={feeTypeForm.frequency} onChange={e => setFeeTypeForm({ ...feeTypeForm, frequency: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30">
                  <option value="termly">Termly</option>
                  <option value="monthly">Monthly</option>
                  <option value="annually">Annually</option>
                  <option value="weekly">Weekly</option>
                  <option value="daily">Daily</option>
                  <option value="one_time">One Time</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Description</label>
                <input value={feeTypeForm.description} onChange={e => setFeeTypeForm({ ...feeTypeForm, description: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30" />
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={feeTypeForm.is_compulsory} onChange={e => setFeeTypeForm({ ...feeTypeForm, is_compulsory: e.target.checked })} className="rounded" />
                  Compulsory
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={feeTypeForm.is_active} onChange={e => setFeeTypeForm({ ...feeTypeForm, is_active: e.target.checked })} className="rounded" />
                  Active
                </label>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-5 border-t border-gray-100">
              <button onClick={() => setShowFeeTypeModal(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg">Cancel</button>
              <button onClick={saveFeeType} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-[#1A237E] text-white rounded-lg text-sm font-medium hover:bg-[#283593] transition disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
