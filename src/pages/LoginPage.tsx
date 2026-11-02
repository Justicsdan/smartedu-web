import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  School, User, Shield, Lock, ArrowLeft, Hash, Eye, EyeOff, Loader2, AlertCircle,
} from 'lucide-react'

const AUTH_URL = 'https://tcjsmkhmfjigutfhjtem.supabase.co/functions/v1/auth'
const ANON_KEY = 'sb_publishable_zWDvjhEldcV8eutnlRypGA_LGpOUhkg'

function getRoleConfig(role: string) {
  switch (role) {
    case 'Student': return { color: '#2E7D32', icon: School, fieldOneLabel: 'Admission Number', fieldTwoLabel: 'PIN', fieldOneIcon: Hash, isFieldTwoPassword: false, dashboard: '/dashboard/student' }
    case 'School Admin': return { color: '#1565C0', icon: Shield, fieldOneLabel: 'Username', fieldTwoLabel: 'Password', fieldOneIcon: User, isFieldTwoPassword: true, dashboard: '/dashboard/schooladmin' }
    case 'Teacher': return { color: '#EF6C00', icon: User, fieldOneLabel: 'Username', fieldTwoLabel: 'Password', fieldOneIcon: User, isFieldTwoPassword: true, dashboard: '/dashboard/teacher' }
    case 'Super Admin': return { color: '#6A1B9A', icon: Shield, fieldOneLabel: 'Username', fieldTwoLabel: 'Password', fieldOneIcon: User, isFieldTwoPassword: true, dashboard: '/dashboard/superadmin' }
    default: return { color: '#1E3C72', icon: Lock, fieldOneLabel: 'Username', fieldTwoLabel: 'Password', fieldOneIcon: User, isFieldTwoPassword: true, dashboard: '/dashboard/student' }
  }
}

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth() as { login: (token: string, user: any) => void | Promise<void> }

  const role = (location.state as any)?.role || 'Student'
  const config = getRoleConfig(role)

  const [fieldOne, setFieldOne] = useState('')
  const [fieldTwo, setFieldTwo] = useState('')
  const [obscureTwo, setObscureTwo] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const callAuth = async (authRole: string, username: string, password: string): Promise<any> => {
    const response = await fetch(AUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ANON_KEY}` },
      body: JSON.stringify({ role: authRole, username, password }),
    })
    const body = await response.json()
    if (response.status === 429) throw new Error(body.error || 'Account temporarily locked. Try again later.')
    if (response.status !== 200) throw new Error(body.error || 'Login failed')
    return body
  }

  const friendlyError = (raw: string): string => {
    if (raw.includes('temporarily locked')) return raw
    if (raw.includes('Invalid') || raw.includes('not found') || raw.includes('No rows') || raw.includes('empty')) return 'Invalid credentials. Please check and try again.'
    if (raw.includes('deactivated') || raw.includes('not active')) return 'This account has been deactivated. Contact support.'
    if (raw.includes('network') || raw.includes('socket') || raw.includes('Failed to fetch')) return 'Network error. Check your internet connection.'
    return 'Login failed. Please try again.'
  }

  const getAuthRole = (): string => {
    switch (role) {
      case 'Student': return 'student'
      case 'School Admin': return 'school_admin'
      case 'Teacher': return 'teacher'
      case 'Super Admin': return 'super_admin'
      default: return 'student'
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fieldOne.trim() || !fieldTwo.trim()) {
      setErrorMessage(`${!fieldOne.trim() ? config.fieldOneLabel : config.fieldTwoLabel} is required`)
      return
    }
    setIsLoading(true); setErrorMessage(null)
    try {
      const data = await callAuth(getAuthRole(), fieldOne.trim(), fieldTwo.trim())
      await login(data.token, { ...data.user, role: getAuthRole() })
      navigate(config.dashboard)
    } catch (err: any) {
      console.error('LOGIN ERROR:', err)
      setErrorMessage(friendlyError(err?.message || String(err)))
    } finally { setIsLoading(false) }
  }

  const RoleIcon = config.icon
  const FieldOneIcon = config.fieldOneIcon

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'linear-gradient(135deg, #0F172A, #1E40AF)' }}>
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <button onClick={() => navigate(-1)}
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-[#F5F6FA] text-[#64748B] hover:bg-slate-200 transition mb-6">
            <ArrowLeft size={16} />
          </button>

          <div className="flex justify-center mb-5">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${config.color}1A` }}>
              <RoleIcon size={32} style={{ color: config.color }} strokeWidth={2.2} />
            </div>
          </div>

          <h1 className="text-center text-2xl font-bold text-[#111827] tracking-tight">{role}</h1>
          <p className="text-center text-sm text-[#9CA3AF] mt-1 mb-8">Enter your credentials to continue</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#9CA3AF] mb-1.5">{config.fieldOneLabel}</label>
              <div className="relative">
                <FieldOneIcon size={20} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" strokeWidth={2.2} />
                <input type="text" value={fieldOne} onChange={(e) => setFieldOne(e.target.value)} disabled={isLoading} placeholder={config.fieldOneLabel}
                  className="w-full pl-11 pr-4 py-4 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] text-sm text-[#111827] outline-none transition"
                  onFocus={(e) => { e.target.style.borderColor = config.color; e.target.style.borderWidth = '2px' }}
                  onBlur={(e) => { e.target.style.borderColor = '#E5E7EB'; e.target.style.borderWidth = '1px' }} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#9CA3AF] mb-1.5">{config.fieldTwoLabel}</label>
              <div className="relative">
                <Lock size={20} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" strokeWidth={2.2} />
                <input type={config.isFieldTwoPassword && obscureTwo ? 'password' : 'text'} value={fieldTwo} onChange={(e) => setFieldTwo(e.target.value)} disabled={isLoading} placeholder={config.fieldTwoLabel}
                  className="w-full pl-11 pr-12 py-4 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] text-sm text-[#111827] outline-none transition"
                  onFocus={(e) => { e.target.style.borderColor = config.color; e.target.style.borderWidth = '2px' }}
                  onBlur={(e) => { e.target.style.borderColor = '#E5E7EB'; e.target.style.borderWidth = '1px' }} />
                {config.isFieldTwoPassword && (
                  <button type="button" onClick={() => setObscureTwo(!obscureTwo)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#9CA3AF] hover:text-slate-700" tabIndex={-1}>
                    {obscureTwo ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                )}
              </div>
            </div>

            {errorMessage && (
              <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg border" style={{ backgroundColor: '#FEF2F2', borderColor: '#FECACA' }}>
                <AlertCircle size={18} className="text-[#DC2626] flex-shrink-0 mt-0.5" />
                <p className="text-sm text-[#DC2626] leading-relaxed">{errorMessage}</p>
              </div>
            )}

            <button type="submit" disabled={isLoading}
              className="w-full h-12 rounded-xl font-semibold text-white text-sm transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ backgroundColor: config.color }}>
              {isLoading ? <Loader2 size={20} className="animate-spin" /> : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
