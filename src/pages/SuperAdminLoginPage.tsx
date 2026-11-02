import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Eye, EyeOff, Shield, Lock, Loader2, AlertCircle, Sparkles } from 'lucide-react'

export default function SuperAdminLoginPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch(
        'https://tcjsmkhmfjigutfhjtem.supabase.co/functions/v1/auth',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': 'sb_publishable_zWDvjhEldcV8eutnlRypGA_LGpOUhkg',
            'Authorization': 'Bearer sb_publishable_zWDvjhEldcV8eutnlRypGA_LGpOUhkg',
          },
          body: JSON.stringify({
            username,
            password,
            role: 'super_admin',
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Login failed')
      }

      localStorage.setItem('smartedu_token', data.token)
      localStorage.setItem('smartedu_user', JSON.stringify(data.user))

      window.location.href = '/dashboard/superadmin'
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-950 flex items-center justify-center px-4 py-12">
      {/* Background glows — violet for super admin */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-violet-500/20 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-indigo-500/20 blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(2,6,23,0.5)_100%)]" />
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />
      </div>

      <div className="w-full max-w-md relative">
        {/* Back button */}
        <button
          onClick={() => navigate('/')}
          className="group inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/80 transition mb-8"
        >
          <ArrowLeft size={14} strokeWidth={2.4} className="group-hover:-translate-x-0.5 transition" />
          Back to home
        </button>

        {/* Shield icon + heading */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm mb-5">
            <Sparkles size={12} className="text-violet-400" strokeWidth={2.4} />
            <span className="text-xs font-medium text-white/80">Platform administration</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(139,92,246,0.05))',
                border: '1px solid rgba(139,92,246,0.3)',
                boxShadow: '0 8px 24px rgba(139,92,246,0.15)',
              }}>
              <Shield size={26} className="text-violet-400" strokeWidth={2.2} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white leading-tight">Super Admin</h1>
              <p className="text-sm text-white/50 mt-0.5">Platform Owner Access</p>
            </div>
          </div>
        </div>

        {/* Form card — glass morphism */}
        <form onSubmit={handleLogin} className="bg-white/[0.03] backdrop-blur-sm rounded-2xl border border-white/10 p-6 space-y-4">
          {/* Username */}
          <div>
            <label className="block text-xs font-semibold text-white/60 mb-1.5">Username</label>
            <div className="relative">
              <Shield
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 transition"
                style={{ color: focusedField === 'username' ? '#8b5cf6' : 'rgba(255,255,255,0.3)' }}
                strokeWidth={2.2}
              />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter admin username"
                onFocus={() => setFocusedField('username')}
                onBlur={() => setFocusedField(null)}
                className={`w-full pl-11 pr-4 py-3 rounded-xl text-sm text-white bg-white/5 border outline-none transition ${
                  focusedField === 'username' ? 'bg-white/10' : 'border-white/10'
                } placeholder-white/30`}
                style={focusedField === 'username' ? { borderColor: '#8b5cf6', boxShadow: '0 0 0 3px rgba(139,92,246,0.15)' } : {}}
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-white/60 mb-1.5">Password</label>
            <div className="relative">
              <Lock
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 transition"
                style={{ color: focusedField === 'password' ? '#8b5cf6' : 'rgba(255,255,255,0.3)' }}
                strokeWidth={2.2}
              />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                className={`w-full pl-11 pr-12 py-3 rounded-xl text-sm text-white bg-white/5 border outline-none transition ${
                  focusedField === 'password' ? 'bg-white/10' : 'border-white/10'
                } placeholder-white/30`}
                style={focusedField === 'password' ? { borderColor: '#8b5cf6', boxShadow: '0 0 0 3px rgba(139,92,246,0.15)' } : {}}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-white/30 hover:text-white/70 transition"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
              <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-300 leading-relaxed">{error}</p>
            </div>
          )}

          {/* Submit — violet gradient border */}
          <button
            type="submit"
            disabled={loading}
            className="group w-full relative overflow-hidden rounded-xl p-[1px] transition-all hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-violet-500 via-indigo-500 to-violet-500 opacity-90 group-hover:opacity-100 transition" />
            <div className="relative bg-slate-950 rounded-xl px-4 py-3 flex items-center justify-center gap-2 text-sm font-semibold text-white">
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              {loading ? 'Signing in…' : 'Sign In'}
            </div>
          </button>
        </form>

        {/* Footer */}
        <div className="mt-6 pt-6 border-t border-white/5 text-center">
          <p className="text-xs text-white/40">
            Authorized personnel only · All actions are logged
          </p>
        </div>
      </div>
    </div>
  )
}
