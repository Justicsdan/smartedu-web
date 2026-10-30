import { Calendar, CalendarDays } from 'lucide-react';

import { useState, useEffect } from 'react'

const SUPABASE_URL = 'https://tcjsmkhmfjigutfhjtem.supabase.co'
const ANON_KEY = 'sb_publishable_zWDvjhEldcV8eutnlRypGA_LGpOUhkg'

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
  created_at: string
}

export default function AcademicPage() {
  const [activeTab, setActiveTab] = useState<'sessions' | 'terms'>('sessions')
  const [sessions, setSessions] = useState<Session[]>([])
  const [terms, setTerms] = useState<Term[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [addType, setAddType] = useState<'Session' | 'Term'>('Session')
  const [newName, setNewName] = useState('')
  const [selectedSessionId, setSelectedSessionId] = useState('')
  const [dialogError, setDialogError] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    fetchAll()
  }, [])

  const headers = { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json' }

  const fetchAll = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('smartedu_user') || '{}')
      const schoolId = user.id || user.school_id
      if (!schoolId) { setLoading(false); return }

      const [sessRes, termRes] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/academic_sessions?school_id=eq.${schoolId}&select=id,name,is_current,created_at&order=created_at.desc`, { headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` } }),
        fetch(`${SUPABASE_URL}/rest/v1/terms?school_id=eq.${schoolId}&select=id,name,session_id,is_current,created_at&order=created_at.desc`, { headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` } }),
      ])

      setSessions(await sessRes.json() || [])
      setTerms(await termRes.json() || [])
    } catch (err) {
      console.error('Error fetching academic data:', err)
    } finally {
      setLoading(false)
    }
  }

  const setActiveSession = async (sessionId: string) => {
    try {
      const user = JSON.parse(localStorage.getItem('smartedu_user') || '{}')
      const schoolId = user.id || user.school_id

      // Unset all other sessions
      await fetch(`${SUPABASE_URL}/rest/v1/academic_sessions?school_id=eq.${schoolId}&id=neq.${sessionId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ is_current: false }),
      })

      // Set the selected session
      await fetch(`${SUPABASE_URL}/rest/v1/academic_sessions?id=eq.${sessionId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ is_current: true }),
      })

      await fetchAll()
    } catch (err) {
      console.error('Error setting active session:', err)
    }
  }

  const setActiveTerm = async (termId: string) => {
    try {
      const user = JSON.parse(localStorage.getItem('smartedu_user') || '{}')
      const schoolId = user.id || user.school_id

      // Find the term to get its session_id
      const term = terms.find(t => t.id === termId)
      if (!term) return

      // Unset all other terms in the same session
      await fetch(`${SUPABASE_URL}/rest/v1/terms?school_id=eq.${schoolId}&session_id=eq.${term.session_id}&id=neq.${termId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ is_current: false }),
      })

      // Set the selected term
      await fetch(`${SUPABASE_URL}/rest/v1/terms?id=eq.${termId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ is_current: true }),
      })

      await fetchAll()
    } catch (err) {
      console.error('Error setting active term:', err)
    }
  }

  const handleAdd = async () => {
    if (!newName.trim()) {
      setDialogError('Please enter a name')
      return
    }
    if (addType === 'Term' && !selectedSessionId) {
      setDialogError('Please select a session')
      return
    }

    setAdding(true)
    setDialogError('')

    try {
      const user = JSON.parse(localStorage.getItem('smartedu_user') || '{}')
      const schoolId = user.id || user.school_id

      if (addType === 'Session') {
        await fetch(`${SUPABASE_URL}/rest/v1/academic_sessions`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            school_id: schoolId,
            name: newName.trim(),
            is_current: sessions.length === 0,
          }),
        })
      } else {
        await fetch(`${SUPABASE_URL}/rest/v1/terms`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            school_id: schoolId,
            session_id: selectedSessionId,
            name: newName.trim(),
            is_current: false,
          }),
        })
      }

      await fetchAll()
      setShowAddDialog(false)
      setNewName('')
      setSelectedSessionId('')
    } catch (err: any) {
      setDialogError(err.message || 'Failed to add')
    } finally {
      setAdding(false)
    }
  }

  const getSessionName = (sessionId: string) => {
    const s = sessions.find(s => s.id === sessionId)
    return s ? s.name : '-'
  }

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="w-8 h-8 border-3 border-[#1A237E] border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <div className="p-6 bg-[#F7F8FA] min-h-full">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 bg-[#F0F4FF] rounded-xl flex items-center justify-center"><Calendar className="text-xl w-4 h-4" /></div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-800">Academic Sessions & Terms</h1>
            <p className="text-xs text-gray-400 mt-0.5">{sessions.length} sessions · {terms.length} terms</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl p-1 border border-gray-200">
          <button onClick={() => setActiveTab('sessions')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition ${activeTab === 'sessions' ? 'bg-[#1A237E] text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
            <Calendar className="w-4 h-4 inline-block" /> Sessions <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${activeTab === 'sessions' ? 'bg-white/20' : 'bg-gray-100'}`}>{sessions.length}</span>
          </button>
          <button onClick={() => setActiveTab('terms')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition ${activeTab === 'terms' ? 'bg-[#1A237E] text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
            <CalendarDays className="w-4 h-4 inline-block" /> Terms <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${activeTab === 'terms' ? 'bg-white/20' : 'bg-gray-100'}`}>{terms.length}</span>
          </button>
        </div>
      </div>

      {/* Sessions Tab */}
      {activeTab === 'sessions' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-500">{sessions.length} session{sessions.length !== 1 ? 's' : ''}</p>
            <button onClick={() => { setAddType('Session'); setShowAddDialog(true); setNewName(''); setDialogError('') }} className="flex items-center gap-1.5 px-4 py-2 bg-[#1A237E] text-white rounded-lg text-sm font-medium hover:bg-[#283593] transition">
              <span>+</span> Add Session
            </button>
          </div>

          {sessions.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center border border-gray-100">
              <Calendar className="text-4xl mb-3 w-6 h-6" />
              <p className="text-gray-400 text-sm">No sessions yet. Tap "Add Session" to create your first academic session.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sessions.map((s, idx) => (
                <div key={s.id} className={`flex items-center gap-3 p-4 rounded-xl border border-gray-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-[#FAFBFC]'}`}>
                  <span className="text-xs font-bold text-gray-400 w-6 text-center shrink-0">{idx + 1}</span>
                  <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                    <Calendar className="text-lg w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">{s.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{new Date(s.created_at).toLocaleDateString()}</p>
                  </div>
                  {s.is_current ? (
                    <span className="px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg text-xs font-semibold text-green-700 flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-500 rounded-full" /> Active
                    </span>
                  ) : (
                    <button onClick={() => setActiveSession(s.id)} className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 transition">
                      Set Active
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Terms Tab */}
      {activeTab === 'terms' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-500">{terms.length} term{terms.length !== 1 ? 's' : ''}</p>
            <button onClick={() => { setAddType('Term'); setShowAddDialog(true); setNewName(''); setSelectedSessionId(''); setDialogError('') }} className="flex items-center gap-1.5 px-4 py-2 bg-[#1A237E] text-white rounded-lg text-sm font-medium hover:bg-[#283593] transition">
              <span>+</span> Add Term
            </button>
          </div>

          {terms.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center border border-gray-100">
              <CalendarDays className="text-4xl mb-3 w-6 h-6" />
              <p className="text-gray-400 text-sm">No terms yet. Tap "Add Term" to create your first term.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {terms.map((t, idx) => (
                <div key={t.id} className={`flex items-center gap-3 p-4 rounded-xl border border-gray-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-[#FAFBFC]'}`}>
                  <span className="text-xs font-bold text-gray-400 w-6 text-center shrink-0">{idx + 1}</span>
                  <div className="w-11 h-11 bg-orange-50 rounded-xl flex items-center justify-center shrink-0">
                    <CalendarDays className="text-lg w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">{t.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700">{getSessionName(t.session_id)}</span>
                    </div>
                  </div>
                  {t.is_current ? (
                    <span className="px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg text-xs font-semibold text-green-700 flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-500 rounded-full" /> Active
                    </span>
                  ) : (
                    <button onClick={() => setActiveTerm(t.id)} className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 transition">
                      Set Active
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={() => setShowAddDialog(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative bg-white rounded-2xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-800 mb-4">Add {addType}</h3>

            {addType === 'Term' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Session</label>
                <select value={selectedSessionId} onChange={e => setSelectedSessionId(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1A237E] focus:border-transparent outline-none">
                  <option value="">Select Session</option>
                  {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">{addType} Name</label>
              <input type="text" value={newName} onChange={e => setNewName(e.target.value)} autoFocus placeholder={addType === 'Session' ? 'e.g. 2024/2025' : 'e.g. First Term'} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1A237E] focus:border-transparent outline-none" />
            </div>

            {dialogError && <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">{dialogError}</div>}

            <div className="flex gap-3">
              <button onClick={() => setShowAddDialog(false)} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition">Cancel</button>
              <button onClick={handleAdd} disabled={adding} className="flex-1 py-2.5 bg-[#1A237E] text-white rounded-lg text-sm font-medium hover:bg-[#283593] transition disabled:opacity-50">{adding ? 'Adding...' : 'Add'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
