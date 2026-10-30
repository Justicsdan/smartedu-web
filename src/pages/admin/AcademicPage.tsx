import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Calendar, CalendarDays, Plus, CheckCircle, Loader2, AlertCircle, X, Save } from 'lucide-react'

type Tab = 'sessions' | 'terms'

interface Session {
  id: string
  name: string
  is_current: boolean
  created_at: string
}

interface Term {
  id: string
  name: string
  session_id: string
  is_current: boolean
  term_start_date: string | null
  term_end_date: string | null
  created_at: string
}

export default function AcademicPage() {
  const { user } = useAuth()
  const schoolId = user?.id || ''

  const [tab, setTab] = useState<Tab>('sessions')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const [sessions, setSessions] = useState<Session[]>([])
  const [terms, setTerms] = useState<Term[]>([])

  const [showSessionModal, setShowSessionModal] = useState(false)
  const [showTermModal, setShowTermModal] = useState(false)
  const [sessionForm, setSessionForm] = useState({ name: '' })
  const [termForm, setTermForm] = useState({ name: '', session_id: '', term_start_date: '', term_end_date: '' })

  useEffect(() => {
    if (!schoolId) return
    ;(async () => {
      setLoading(true)
      try {
        const [sRes, tRes] = await Promise.all([
          supabase.from('academic_sessions').select('*').eq('school_id', schoolId).order('created_at', { ascending: false }),
          supabase.from('terms').select('*').eq('school_id', schoolId).order('created_at', { ascending: false }),
        ])
        if (sRes.error) throw sRes.error
        if (tRes.error) throw tRes.error
        setSessions((sRes.data || []) as Session[])
        setTerms((tRes.data || []) as Term[])
      } catch (e: any) {
        setError(e.message || 'Failed to load')
      } finally {
        setLoading(false)
      }
    })()
  }, [schoolId])

  const saveSession = async () => {
    if (!sessionForm.name.trim()) { setError('Session name is required'); return }
    setError('')
    try {
      const { error } = await supabase.from('academic_sessions').insert({
        school_id: schoolId,
        name: sessionForm.name.trim(),
        is_current: false,
      })
      if (error) throw error
      setShowSessionModal(false)
      setSessionForm({ name: '' })
      const { data } = await supabase.from('academic_sessions').select('*').eq('school_id', schoolId).order('created_at', { ascending: false })
      setSessions((data || []) as Session[])
      setSuccessMsg('Session created')
    } catch (e: any) {
      setError(e.message || 'Save failed')
    }
  }

  const saveTerm = async () => {
    if (!termForm.name.trim() || !termForm.session_id) { setError('Term name and session are required'); return }
    setError('')
    try {
      const { error } = await supabase.from('terms').insert({
        school_id: schoolId,
        name: termForm.name.trim(),
        session_id: termForm.session_id,
        is_current: false,
        term_start_date: termForm.term_start_date || null,
        term_end_date: termForm.term_end_date || null,
      })
      if (error) throw error
      setShowTermModal(false)
      setTermForm({ name: '', session_id: '', term_start_date: '', term_end_date: '' })
      const { data } = await supabase.from('terms').select('*').eq('school_id', schoolId).order('created_at', { ascending: false })
      setTerms((data || []) as Term[])
      setSuccessMsg('Term created')
    } catch (e: any) {
      setError(e.message || 'Save failed')
    }
  }

  const setActiveSession = async (sessionId: string) => {
    try {
      // First, set all sessions is_current=false
      await supabase.from('academic_sessions').update({ is_current: false }).eq('school_id', schoolId).neq('id', sessionId)
      // Then set the selected one is_current=true
      const { error } = await supabase.from('academic_sessions').update({ is_current: true }).eq('id', sessionId)
      if (error) throw error
      const { data } = await supabase.from('academic_sessions').select('*').eq('school_id', schoolId).order('created_at', { ascending: false })
      setSessions((data || []) as Session[])
      setSuccessMsg('Session set as active')
    } catch (e: any) {
      setError(e.message || 'Failed to set active session')
    }
  }

  const setActiveTerm = async (termId: string) => {
    try {
      const term = terms.find(t => t.id === termId)
      if (!term) return
      // Set all terms in the same session is_current=false
      await supabase.from('terms').update({ is_current: false }).eq('school_id', schoolId).eq('session_id', term.session_id).neq('id', termId)
      // Set the selected term is_current=true
      const { error } = await supabase.from('terms').update({ is_current: true }).eq('id', termId)
      if (error) throw error
      const { data } = await supabase.from('terms').select('*').eq('school_id', schoolId).order('created_at', { ascending: false })
      setTerms((data || []) as Term[])
      setSuccessMsg('Term set as active')
    } catch (e: any) {
      setError(e.message || 'Failed to set active term')
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-[#1A237E] animate-spin" /></div>
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Academic Sessions & Terms</h1>
        <p className="text-sm text-gray-500 mt-1">Manage academic years and terms. Set the active session/term used by scores, publish, and other pages.</p>
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

      <div className="flex gap-1 bg-white rounded-xl border border-gray-100 p-1">
        <button onClick={() => setTab('sessions')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${tab === 'sessions' ? 'bg-[#1A237E] text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
          Sessions ({sessions.length})
        </button>
        <button onClick={() => setTab('terms')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${tab === 'terms' ? 'bg-[#1A237E] text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
          Terms ({terms.length})
        </button>
      </div>

      {tab === 'sessions' && (
        <div>
          <div className="flex justify-end mb-3">
            <button onClick={() => { setSessionForm({ name: '' }); setShowSessionModal(true) }} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1A237E] text-white rounded-lg text-xs font-medium hover:bg-[#283593] transition">
              <Plus className="w-3.5 h-3.5" /> New Session
            </button>
          </div>
          {sessions.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
              <div className="w-16 h-16 mx-auto bg-blue-50 rounded-2xl flex items-center justify-center mb-3"><Calendar className="w-8 h-8 text-blue-400" /></div>
              <p className="text-gray-400 text-sm">No sessions created yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sessions.map(s => (
                <div key={s.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between hover:shadow-sm transition">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${s.is_current ? 'bg-green-50' : 'bg-gray-100'}`}>
                      <Calendar className={`w-5 h-5 ${s.is_current ? 'text-green-600' : 'text-gray-400'}`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{s.name}</p>
                      <p className="text-xs text-gray-400">Created {new Date(s.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.is_current && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                        <CheckCircle className="w-3 h-3" /> Active
                      </span>
                    )}
                    {!s.is_current && (
                      <button onClick={() => setActiveSession(s.id)} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-medium hover:bg-indigo-100 transition">
                        Set Active
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'terms' && (
        <div>
          <div className="flex justify-end mb-3">
            <button onClick={() => { setTermForm({ name: '', session_id: '', term_start_date: '', term_end_date: '' }); setShowTermModal(true) }} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1A237E] text-white rounded-lg text-xs font-medium hover:bg-[#283593] transition">
              <Plus className="w-3.5 h-3.5" /> New Term
            </button>
          </div>
          {terms.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
              <div className="w-16 h-16 mx-auto bg-blue-50 rounded-2xl flex items-center justify-center mb-3"><CalendarDays className="w-8 h-8 text-blue-400" /></div>
              <p className="text-gray-400 text-sm">No terms created yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {terms.map(t => {
                const session = sessions.find(s => s.id === t.session_id)
                return (
                  <div key={t.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between hover:shadow-sm transition">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${t.is_current ? 'bg-green-50' : 'bg-gray-100'}`}>
                        <CalendarDays className={`w-5 h-5 ${t.is_current ? 'text-green-600' : 'text-gray-400'}`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{t.name}</p>
                        <p className="text-xs text-gray-400">
                          {session?.name || '-'}
                          {t.term_start_date && ` · ${new Date(t.term_start_date).toLocaleDateString()}`}
                          {t.term_end_date && ` → ${new Date(t.term_end_date).toLocaleDateString()}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {t.is_current && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                          <CheckCircle className="w-3 h-3" /> Active
                        </span>
                      )}
                      {!t.is_current && (
                        <button onClick={() => setActiveTerm(t.id)} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-medium hover:bg-indigo-100 transition">
                          Set Active
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Session Modal */}
      {showSessionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowSessionModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800">New Session</h2>
              <button onClick={() => setShowSessionModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Session Name *</label>
                <input value={sessionForm.name} onChange={e => setSessionForm({ name: e.target.value })} placeholder="e.g., 2025/2026" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30" />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-5 border-t border-gray-100">
              <button onClick={() => setShowSessionModal(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg">Cancel</button>
              <button onClick={saveSession} className="flex items-center gap-2 px-4 py-2 bg-[#1A237E] text-white rounded-lg text-sm font-medium hover:bg-[#283593] transition">
                <Save className="w-4 h-4" /> Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Term Modal */}
      {showTermModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowTermModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800">New Term</h2>
              <button onClick={() => setShowTermModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Term Name *</label>
                <input value={termForm.name} onChange={e => setTermForm({ ...termForm, name: e.target.value })} placeholder="e.g., First Term" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Session *</label>
                <select value={termForm.session_id} onChange={e => setTermForm({ ...termForm, session_id: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30">
                  <option value="">Select session</option>
                  {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Start Date</label>
                  <input type="date" value={termForm.term_start_date} onChange={e => setTermForm({ ...termForm, term_start_date: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">End Date</label>
                  <input type="date" value={termForm.term_end_date} onChange={e => setTermForm({ ...termForm, term_end_date: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30" />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-5 border-t border-gray-100">
              <button onClick={() => setShowTermModal(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg">Cancel</button>
              <button onClick={saveTerm} className="flex items-center gap-2 px-4 py-2 bg-[#1A237E] text-white rounded-lg text-sm font-medium hover:bg-[#283593] transition">
                <Save className="w-4 h-4" /> Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
