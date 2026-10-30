import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import {
  KeyRound, RefreshCw, Copy, Eye, Printer, Loader2, AlertCircle,
  CheckCircle, Users, GraduationCap, Search, X, ClipboardCheck,
} from 'lucide-react'

interface Teacher {
  id: string
  first_name: string
  last_name: string
  staff_id: string
  username: string | null
  password: string | null
  email: string | null
  is_active: boolean
  last_login: string | null
}

interface Student {
  id: string
  first_name: string
  last_name: string
  middle_name: string | null
  admission_no: string
  username: string | null
  pin: string | null
  class_id: string | null
  is_active: boolean
  last_login: string | null
}

type Tab = 'teachers' | 'students'

function teacherName(t: Teacher): string {
  return `${t.first_name ?? ''} ${t.last_name ?? ''}`.trim()
}

function studentName(s: Student): string {
  return [s.first_name, s.middle_name, s.last_name].filter(Boolean).join(' ').trim()
}

// Mirrors Flutter _generateStrongPassword: Tchr@<6 digits>!
function generateStrongPassword(): string {
  let digits = ''
  for (let i = 0; i < 6; i++) digits += Math.floor(Math.random() * 10)
  return `Tchr@${digits}!`
}

// Mirrors Flutter _generatePin: 4-digit random
function generatePin(): string {
  return String(Math.floor(Math.random() * 9000) + 1000)
}

// Mirrors Flutter _needsRegen: bcrypt hash OR teacher password matching ^\d{4}$
function needsRegen(secret: string, isTeacher: boolean): boolean {
  if (!secret) return true
  if (secret.startsWith('$2')) return true
  if (isTeacher && /^\d{4}$/.test(secret)) return true
  return false
}

// Mirrors Flutter username generator
function makeUsername(item: any, isTeacher: boolean): string {
  const fn = (item.first_name || '').toString().toLowerCase().replace(/[^a-z]/g, '')
  const ln = (item.last_name || '').toString().toLowerCase().replace(/[^a-z]/g, '')
  const adm = (item.admission_no || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '')
  if (isTeacher) {
    return `${fn}${ln ? `_${ln}` : ''}`
  }
  return (item.admission_no || '').toString()
}

function copyToClipboard(text: string, label: string, onDone: (msg: string) => void) {
  navigator.clipboard.writeText(text).then(() => {
    onDone(`${label} copied to clipboard`)
  }).catch(() => {
    onDone(`Failed to copy ${label}`)
  })
}

export default function CredentialsPage() {
  const { user } = useAuth()
  const schoolId = user?.id || ''

  const [tab, setTab] = useState<Tab>('teachers')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [classes, setClasses] = useState<any[]>([])

  const [search, setSearch] = useState('')
  const [classFilter, setClassFilter] = useState('')
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set())
  const [bulkGenerating, setBulkGenerating] = useState(false)
  const [viewing, setViewing] = useState<{ item: any; isTeacher: boolean } | null>(null)

  useEffect(() => {
    if (!schoolId) return
    ;(async () => {
      setLoading(true)
      try {
        const [tRes, sRes, cRes] = await Promise.all([
          supabase.from('teachers').select('*').eq('school_id', schoolId).order('first_name'),
          supabase.from('students').select('*').eq('school_id', schoolId).order('first_name'),
          supabase.from('classes').select('id, name, section').eq('school_id', schoolId).order('name'),
        ])
        if (tRes.error) throw tRes.error
        if (sRes.error) throw sRes.error
        if (cRes.error) throw cRes.error
        setTeachers((tRes.data || []) as Teacher[])
        setStudents((sRes.data || []) as Student[])
        setClasses(cRes.data || [])
      } catch (e: any) {
        setError(e.message || 'Failed to load')
      } finally {
        setLoading(false)
      }
    })()
  }, [schoolId])

  const classMap = useMemo(() => {
    const m: Record<string, any> = {}
    for (const c of classes) m[c.id] = c
    return m
  }, [classes])

  const filteredTeachers = useMemo(() => {
    if (!search.trim()) return teachers
    const q = search.toLowerCase()
    return teachers.filter(t => {
      const name = teacherName(t).toLowerCase()
      const uname = (t.username || '').toLowerCase()
      const staff = (t.staff_id || '').toLowerCase()
      return name.includes(q) || uname.includes(q) || staff.includes(q)
    })
  }, [teachers, search])

  const filteredStudents = useMemo(() => {
    let list = students
    if (classFilter) list = list.filter(s => s.class_id === classFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(s => {
        const name = studentName(s).toLowerCase()
        const adm = (s.admission_no || '').toLowerCase()
        const uname = (s.username || '').toLowerCase()
        return name.includes(q) || adm.includes(q) || uname.includes(q)
      })
    }
    return list
  }, [students, search, classFilter])

  const teachersMissing = teachers.filter(t => !t.username || !t.password).length
  const studentsMissing = students.filter(s => !s.username || !s.pin).length

  const regenerateOne = async (item: any, isTeacher: boolean) => {
    setLoadingIds(prev => new Set(prev).add(item.id))
    setError('')
    try {
      const secret = isTeacher ? generateStrongPassword() : generatePin()
      const updates: Record<string, string> = {}
      if (isTeacher) {
        updates.password = secret
      } else {
        updates.pin = secret
      }
      if (!item.username) {
        updates.username = makeUsername(item, isTeacher)
      }
      const { error } = await supabase
        .from(isTeacher ? 'teachers' : 'students')
        .update(updates)
        .eq('id', item.id)
      if (error) throw error

      if (isTeacher) {
        const { data } = await supabase.from('teachers').select('*').eq('id', item.id).maybeSingle()
        if (data) setTeachers(prev => prev.map(t => t.id === item.id ? data as Teacher : t))
      } else {
        const { data } = await supabase.from('students').select('*').eq('id', item.id).maybeSingle()
        if (data) setStudents(prev => prev.map(s => s.id === item.id ? data as Student : s))
      }
      setSuccessMsg(`New ${isTeacher ? 'password' : 'PIN'} generated`)
      setViewing(null)
    } catch (e: any) {
      setError(e.message || 'Regenerate failed')
    } finally {
      setLoadingIds(prev => {
        const next = new Set(prev)
        next.delete(item.id)
        return next
      })
    }
  }

  const generateMissing = async (isTeacher: boolean) => {
    const items = isTeacher ? teachers : students
    const missing = items.filter((it: any) => !it.username || (isTeacher ? !it.password : !it.pin))
    if (missing.length === 0) {
      setSuccessMsg('All already have credentials')
      return
    }
    setBulkGenerating(true); setError('')
    try {
      for (const it of missing) {
        const updates: Record<string, string> = {
          username: makeUsername(it, isTeacher),
        }
        if (isTeacher) {
          updates.password = generateStrongPassword()
        } else {
          updates.pin = generatePin()
        }
        await supabase
          .from(isTeacher ? 'teachers' : 'students')
          .update(updates)
          .eq('id', it.id)
      }
      // Reload
      const { data: fresh } = await supabase
        .from(isTeacher ? 'teachers' : 'students')
        .select('*')
        .eq('school_id', schoolId)
        .order('first_name')
      if (isTeacher) setTeachers((fresh || []) as Teacher[])
      else setStudents((fresh || []) as Student[])
      setSuccessMsg(`Generated credentials for ${missing.length} ${isTeacher ? 'teacher(s)' : 'student(s)'}`)
    } catch (e: any) {
      setError(e.message || 'Bulk generate failed')
    } finally {
      setBulkGenerating(false)
    }
  }

  const printSlips = (isTeacher: boolean) => {
    const items = isTeacher ? filteredTeachers : filteredStudents
    if (items.length === 0) return
    const win = window.open('', '_blank', 'width=800,height=900')
    if (!win) return
    const secretLabel = isTeacher ? 'Password' : 'PIN'
    const slips = items.map((it: any, i: number) => {
      const name = isTeacher ? teacherName(it as Teacher) : studentName(it as Student)
      const username = it.username || '(not set)'
      const secret = isTeacher ? (it.password || '(not set)') : (it.pin || '(not set)')
      const cls = !isTeacher && it.class_id ? classMap[it.class_id]?.name || '' : ''
      return `
        <div style="page-break-after: always; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 16px; font-family: Arial, sans-serif;">
          <div style="text-align: center; border-bottom: 2px solid #1A237E; padding-bottom: 12px; margin-bottom: 16px;">
            <h2 style="color: #1A237E; margin: 0;">SmartEdu Credentials</h2>
            <p style="color: #6b7280; margin: 4px 0 0; font-size: 12px;">Keep this safe — do not share</p>
          </div>
          <table style="width: 100%; font-size: 14px;">
            <tr><td style="padding: 6px 0; color: #6b7280; width: 120px;">Name:</td><td style="font-weight: 600;">${name}</td></tr>
            ${cls ? `<tr><td style="padding: 6px 0; color: #6b7280;">Class:</td><td>${cls}</td></tr>` : ''}
            ${!isTeacher && it.admission_no ? `<tr><td style="padding: 6px 0; color: #6b7280;">Admission No:</td><td>${it.admission_no}</td></tr>` : ''}
            ${isTeacher && it.staff_id ? `<tr><td style="padding: 6px 0; color: #6b7280;">Staff ID:</td><td>${it.staff_id}</td></tr>` : ''}
            <tr><td style="padding: 6px 0; color: #6b7280;">Username:</td><td style="font-family: monospace; font-weight: 600; color: #1A237E;">${username}</td></tr>
            <tr><td style="padding: 6px 0; color: #6b7280;">${secretLabel}:</td><td style="font-family: monospace; font-weight: 700; color: #dc2626; font-size: 16px;">${secret}</td></tr>
          </table>
          <p style="margin-top: 16px; font-size: 11px; color: #9ca3af; text-align: center;">Slip ${i + 1} of ${items.length}</p>
        </div>
      `
    }).join('')
    win.document.write(`
      <html>
        <head>
          <title>${isTeacher ? 'Teacher' : 'Student'} Credentials</title>
          <style>@media print { body { margin: 0; } }</style>
        </head>
        <body>${slips}</body>
      </html>
    `)
    win.document.close()
    setTimeout(() => win.print(), 500)
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-[#1A237E] animate-spin" /></div>
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Credentials</h1>
        <p className="text-sm text-gray-500 mt-1">Generate and manage login credentials for teachers and students</p>
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

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-xl border border-gray-100 p-1">
        <button onClick={() => setTab('teachers')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${tab === 'teachers' ? 'bg-[#1A237E] text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
          Teachers ({teachers.length})
        </button>
        <button onClick={() => setTab('students')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${tab === 'students' ? 'bg-[#1A237E] text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
          Students ({students.length})
        </button>
      </div>

      {/* Stats + actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
            {tab === 'teachers' ? <GraduationCap className="w-5 h-5 text-blue-600" /> : <Users className="w-5 h-5 text-blue-600" />}
          </div>
          <div>
            <p className="text-xs text-gray-500">Total {tab === 'teachers' ? 'Teachers' : 'Students'}</p>
            <p className="text-lg font-bold text-gray-800">{tab === 'teachers' ? teachers.length : students.length}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center"><KeyRound className="w-5 h-5 text-orange-600" /></div>
          <div>
            <p className="text-xs text-gray-500">Missing Credentials</p>
            <p className="text-lg font-bold text-gray-800">{tab === 'teachers' ? teachersMissing : studentsMissing}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center"><ClipboardCheck className="w-5 h-5 text-green-600" /></div>
          <div>
            <p className="text-xs text-gray-500">Have Credentials</p>
            <p className="text-lg font-bold text-gray-800">{(tab === 'teachers' ? teachers.length : students.length) - (tab === 'teachers' ? teachersMissing : studentsMissing)}</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-xl border border-gray-100 p-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={`Search ${tab === 'teachers' ? 'teachers' : 'students'}...`}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30"
          />
        </div>
        {tab === 'students' && (
          <select value={classFilter} onChange={e => setClassFilter(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30">
            <option value="">All Classes</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}{c.section ? ` (${c.section})` : ''}</option>)}
          </select>
        )}
        <button
          onClick={() => generateMissing(tab === 'teachers')}
          disabled={bulkGenerating || (tab === 'teachers' ? teachersMissing : studentsMissing) === 0}
          className="flex items-center gap-1.5 px-3 py-2 bg-[#1A237E] text-white rounded-lg text-sm font-medium hover:bg-[#283593] transition disabled:opacity-50"
        >
          {bulkGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {bulkGenerating ? 'Generating...' : `Generate Missing (${tab === 'teachers' ? teachersMissing : studentsMissing})`}
        </button>
        <button
          onClick={() => printSlips(tab === 'teachers')}
          className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
        >
          <Printer className="w-4 h-4" /> Print Slips
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">#</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Name</th>
                {tab === 'teachers' ? (
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Staff ID</th>
                ) : (
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Admission No</th>
                )}
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Username</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">{tab === 'teachers' ? 'Password' : 'PIN'}</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Status</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(tab === 'teachers' ? filteredTeachers : filteredStudents).length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center">
                    <div className="w-16 h-16 mx-auto bg-gray-50 rounded-full flex items-center justify-center mb-3">
                      {tab === 'teachers' ? <GraduationCap className="w-8 h-8 text-gray-300" /> : <Users className="w-8 h-8 text-gray-300" />}
                    </div>
                    <p className="text-gray-400 text-sm">{search ? 'No matches found.' : `No ${tab === 'teachers' ? 'teachers' : 'students'} registered.`}</p>
                  </td>
                </tr>
              ) : (
                (tab === 'teachers' ? filteredTeachers : filteredStudents).map((item: any, i: number) => {
                  const isTeacher = tab === 'teachers'
                  const name = isTeacher ? teacherName(item as Teacher) : studentName(item as Student)
                  const username = item.username || ''
                  const secret = isTeacher ? (item.password || '') : (item.pin || '')
                  const needsRegenFlag = needsRegen(secret, isTeacher)
                  const isLoading = loadingIds.has(item.id)
                  return (
                    <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-sm text-gray-400">{i + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                            {name.charAt(0) || '?'}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-800">{name}</p>
                            {!isTeacher && item.class_id && (
                              <p className="text-xs text-gray-400">{classMap[item.class_id]?.name || '-'}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {isTeacher ? (item.staff_id || '-') : (item.admission_no || '-')}
                      </td>
                      <td className="px-4 py-3">
                        {username ? (
                          <span className="text-sm font-mono text-gray-800">{username}</span>
                        ) : (
                          <span className="text-xs text-orange-600 italic">not set</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {secret ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span className="text-sm font-mono text-gray-700">{'•'.repeat(secret.length > 8 ? 8 : secret.length)}</span>
                            {needsRegenFlag && (
                              <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded text-[10px] font-medium">Needs Regen</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-xs text-orange-600 italic">not set</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${item.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {item.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setViewing({ item, isTeacher })}
                            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition"
                            title="View"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => copyToClipboard(`Username: ${username}\n${isTeacher ? 'Password' : 'PIN'}: ${secret}`, 'Credentials', setSuccessMsg)}
                            disabled={!secret}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition disabled:opacity-30"
                            title="Copy"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => regenerateOne(item, isTeacher)}
                            disabled={isLoading}
                            className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded transition disabled:opacity-50"
                            title="Regenerate"
                          >
                            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Modal */}
      {viewing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setViewing(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800">Credentials</h2>
              <button onClick={() => setViewing(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="text-center py-2">
                <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white text-2xl font-semibold mb-3">
                  {(viewing.isTeacher ? teacherName(viewing.item as Teacher) : studentName(viewing.item as Student)).charAt(0) || '?'}
                </div>
                <p className="text-base font-semibold text-gray-800">
                  {viewing.isTeacher ? teacherName(viewing.item as Teacher) : studentName(viewing.item as Student)}
                </p>
                <p className="text-xs text-gray-400">
                  {viewing.isTeacher ? (viewing.item.staff_id || '-') : (viewing.item.admission_no || '-')}
                </p>
              </div>

              <div className="space-y-2">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Username</p>
                  <p className="text-sm font-mono text-gray-800">{viewing.item.username || '(not set)'}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">{viewing.isTeacher ? 'Password' : 'PIN'}</p>
                  <p className="text-sm font-mono text-gray-800">
                    {viewing.isTeacher ? (viewing.item.password || '(not set)') : (viewing.item.pin || '(not set)')}
                  </p>
                </div>
                {needsRegen(viewing.isTeacher ? (viewing.item.password || '') : (viewing.item.pin || ''), viewing.isTeacher) && (
                  <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="text-xs text-orange-700">
                      This {viewing.isTeacher ? 'password' : 'PIN'} is hashed or weak. Click "Regenerate" to create a new plain-text one.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => copyToClipboard(`Username: ${viewing.item.username}\n${viewing.isTeacher ? 'Password' : 'PIN'}: ${viewing.isTeacher ? viewing.item.password : viewing.item.pin}`, 'Credentials', setSuccessMsg)}
                  disabled={!viewing.item.username || (viewing.isTeacher ? !viewing.item.password : !viewing.item.pin)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-sm font-medium hover:bg-blue-100 transition disabled:opacity-50"
                >
                  <Copy className="w-4 h-4" /> Copy
                </button>
                <button
                  onClick={() => regenerateOne(viewing.item, viewing.isTeacher)}
                  disabled={loadingIds.has(viewing.item.id)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#1A237E] text-white rounded-lg text-sm font-medium hover:bg-[#283593] transition disabled:opacity-50"
                >
                  {loadingIds.has(viewing.item.id) ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  Regenerate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
