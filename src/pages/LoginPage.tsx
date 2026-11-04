import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  School, User, Shield, Lock, ArrowLeft, Hash, IdCard, Eye, EyeOff, Loader2, AlertCircle, Sparkles,
} from 'lucide-react'

const AUTH_URL = 'https://tcjsmkhmfjigutfhjtem.supabase.co/functions/v1/auth'
const ANON_KEY = 'sb_publishable_zWDvjhEldcV8eutnlRypGA_LGpOUhkg'

function getRoleConfig(role: string) {
  switch (role) {
    case 'Student': return { color: '#10b981', colorRgb: '16,185,129', icon: School, fieldOneLabel: 'Admission Number', fieldTwoLabel: 'PIN', fieldOneIcon: IdCard, isFieldTwoPassword: false, dashboard: '/dashboard/student' }
    case 'School Admin': return { color: '#3b82f6', colorRgb: '59,130,246', icon: Shield, fieldOneLabel: 'Username', fieldTwoLabel: 'Password', fieldOneIcon: User, isFieldTwoPassword: true, dashboard: '/dashboard/schooladmin' }
    case 'Teacher': return { color: '#f59e0b', colorRgb: '245,158,11', icon: User, fieldOneLabel: 'Username', fieldTwoLabel: 'Password', fieldOneIcon: User, isFieldTwoPassword: true, dashboard: '/dashboard/teacher' }
    case 'Super Admin': return { color: '#8b5cf6', colorRgb: '139,92,246', icon: Shield, fieldOneLabel: 'Username', fieldTwoLabel: 'Password', fieldOneIcon: User, isFieldTwoPassword: true, dashboard: '/dashboard/superadmin' }
    default: return { color: '#3b82f6', colorRgb: '59,130,246', icon: Lock, fieldOneLabel: 'Username', fieldTwoLabel: 'Password', fieldOneIcon: User, isFieldTwoPassword: true, dashboard: '/dashboard/student' }
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
  const [focusedField, setFocusedField] = useState<string | null>(null)

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
    <div className="min-h-screen relative overflow-hidden bg-slate-950 flex items-center justify-center px-4 py-12">
      {/* Background glows — tinted with role color */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full blur-[120px]" style={{ backgroundColor: `rgba(${config.colorRgb}, 0.15)` }} />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full blur-[120px]" style={{ backgroundColor: `rgba(${config.colorRgb}, 0.1)` }} />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(2,6,23,0.5)_100%)]" />
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />
      </div>

      <div className="w-full max-w-md relative">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="group inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/80 transition mb-8"
        >
          <ArrowLeft size={14} strokeWidth={2.4} className="group-hover:-translate-x-0.5 transition" />
          Back
        </button>

        {/* Role icon + heading */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm mb-5">
            <Sparkles size={12} style={{ color: config.color }} strokeWidth={2.4} />
            <span className="text-xs font-medium text-white/80">{role} portal</span>
          </div>

          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform hover:scale-105"
              style={{
                background: `linear-gradient(135deg, rgba(${config.colorRgb}, 0.2), rgba(${config.colorRgb}, 0.05))`,
                border: `1px solid rgba(${config.colorRgb}, 0.3)`,
                boxShadow: `0 8px 24px rgba(${config.colorRgb}, 0.15)`,
              }}
            >
              <RoleIcon size={26} style={{ color: config.color }} strokeWidth={2.2} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white leading-tight">Sign in</h1>
              <p className="text-sm text-white/50 mt-0.5">Enter your credentials to continue</p>
            </div>
          </div>
        </div>

        {/* Form card — glass morphism */}
        <form onSubmit={handleLogin} className="bg-white/[0.03] backdrop-blur-sm rounded-2xl border border-white/10 p-6 space-y-4">
          {/* Field one */}
          <div>
            <label className="block text-xs font-semibold text-white/60 mb-1.5">{config.fieldOneLabel}</label>
            <div className="relative">
              <FieldOneIcon
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 transition"
                style={{ color: focusedField === 'one' ? config.color : 'rgba(255,255,255,0.3)' }}
                strokeWidth={2.2}
              />
              <input
                type="text"
                value={fieldOne}
                onChange={(e) => setFieldOne(e.target.value)}
                disabled={isLoading}
                placeholder={config.fieldOneLabel}
                onFocus={() => setFocusedField('one')}
                onBlur={() => setFocusedField(null)}
                className={`w-full pl-11 pr-4 py-3 rounded-xl text-sm text-white bg-white/5 border outline-none transition ${
                  focusedField === 'one'
                    ? 'bg-white/10'
                    : 'border-white/10'
                } placeholder-white/30`}
                style={focusedField === 'one' ? { borderColor: config.color, boxShadow: `0 0 0 3px rgba(${config.colorRgb}, 0.15)` } : {}}
              />
            </div>
          </div>

          {/* Field two */}
          <div>
            <label className="block text-xs font-semibold text-white/60 mb-1.5">{config.fieldTwoLabel}</label>
            <div className="relative">
              <Lock
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 transition"
                style={{ color: focusedField === 'two' ? config.color : 'rgba(255,255,255,0.3)' }}
                strokeWidth={2.2}
              />
              <input
                type={config.isFieldTwoPassword && obscureTwo ? 'password' : 'text'}
                value={fieldTwo}
                onChange={(e) => setFieldTwo(e.target.value)}
                disabled={isLoading}
                placeholder={config.fieldTwoLabel}
                onFocus={() => setFocusedField('two')}
                onBlur={() => setFocusedField(null)}
                className={`w-full pl-11 pr-12 py-3 rounded-xl text-sm text-white bg-white/5 border outline-none transition ${
                  focusedField === 'two'
                    ? 'bg-white/10'
                    : 'border-white/10'
                } placeholder-white/30`}
                style={focusedField === 'two' ? { borderColor: config.color, boxShadow: `0 0 0 3px rgba(${config.colorRgb}, 0.15)` } : {}}
              />
              {config.isFieldTwoPassword && (
                <button
                  type="button"
                  onClick={() => setObscureTwo(!obscureTwo)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-white/30 hover:text-white/70 transition"
                  tabIndex={-1}
                >
                  {obscureTwo ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              )}
            </div>
          </div>

          {/* Error */}
          {errorMessage && (
            <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
              <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-300 leading-relaxed">{errorMessage}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="group w-full relative overflow-hidden rounded-xl p-[1px] transition-all hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 via-blue-500 to-violet-500 opacity-90 group-hover:opacity-100 transition" />
            <div className="relative bg-slate-950 rounded-xl px-4 py-3 flex items-center justify-center gap-2 text-sm font-semibold text-white">
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : null}
              {isLoading ? 'Signing in…' : 'Sign In'}
            </div>
          </button>
        </form>

        {/* Footer */}
        <div className="mt-6 pt-6 border-t border-white/5 text-center">
          <p className="text-xs text-white/40">
            Secured with bank-grade encryption · Row-Level Security
          </p>
        </div>
      </div>
    </div>
  )
}
