import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { School, Hash, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react'

export default function LoginMethodPage() {
  const navigate = useNavigate()
  const [schoolCode, setSchoolCode] = useState('')
  const [focused, setFocused] = useState(false)

  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-950 flex items-center justify-center px-4 py-12">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-blue-500/20 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-violet-500/20 blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(2,6,23,0.5)_100%)]" />
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />
      </div>

      <div className="w-full max-w-md relative">
        <button
          onClick={() => navigate('/')}
          className="group inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/80 transition mb-8"
        >
          <ArrowLeft size={14} strokeWidth={2.4} className="group-hover:-translate-x-0.5 transition" />
          Back to home
        </button>

        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm mb-5">
            <Sparkles size={12} className="text-emerald-400" strokeWidth={2.4} />
            <span className="text-xs font-medium text-white/80">Sign in to your portal</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white leading-tight">
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-white/50">
            Choose how you'd like to sign in to SmartEdu
          </p>
        </div>

        <button
          onClick={() => navigate('/role-selection')}
          className="group w-full relative overflow-hidden rounded-2xl p-[1px] mb-4 transition-all hover:scale-[1.01]"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 via-blue-500 to-violet-500 opacity-90 group-hover:opacity-100 transition" />
          <div className="relative bg-slate-950 rounded-2xl px-5 py-5 text-left flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center flex-shrink-0">
              <School size={22} className="text-emerald-300" strokeWidth={2.2} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-white">Continue without school code</div>
              <div className="text-xs text-white/50 mt-0.5">Select your role and enter credentials</div>
            </div>
            <ArrowRight size={16} strokeWidth={2.4} className="text-white/40 group-hover:text-white group-hover:translate-x-0.5 transition flex-shrink-0" />
          </div>
        </button>

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-xs font-semibold text-white/30 uppercase tracking-wider">or</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        <div className="bg-white/[0.03] backdrop-blur-sm rounded-2xl border border-white/10 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-400/20 flex items-center justify-center flex-shrink-0">
              <Hash size={18} className="text-amber-300" strokeWidth={2.2} />
            </div>
            <div>
              <div className="text-sm font-bold text-white">With school code</div>
              <div className="text-xs text-white/50">Enter your school's unique code</div>
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={schoolCode}
              onChange={(e) => setSchoolCode(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && schoolCode.trim()) {
                  navigate('/s/' + schoolCode.trim().toLowerCase())
                }
              }}
              placeholder="e.g., graceville"
              className={`flex-1 px-4 py-2.5 text-sm font-mono text-white bg-white/5 border rounded-xl outline-none transition ${
                focused
                  ? 'border-violet-400/50 ring-2 ring-violet-500/20 bg-white/10'
                  : 'border-white/10'
              } placeholder-white/30`}
            />
            <button
              onClick={() => schoolCode.trim() && navigate('/s/' + schoolCode.trim().toLowerCase())}
              disabled={!schoolCode.trim()}
              className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center gap-1.5 flex-shrink-0 ${
                schoolCode.trim()
                  ? 'bg-white text-slate-900 hover:bg-white/90 hover:scale-[1.02] shadow-md'
                  : 'bg-white/5 text-white/30 cursor-not-allowed'
              }`}
            >
              Go
              <ArrowRight size={13} strokeWidth={2.6} />
            </button>
          </div>

          <p className="mt-3 text-[11px] text-white/40">
            Don't know your school code? Ask your school administrator, or continue without one above.
          </p>
        </div>

        <div className="mt-8 pt-6 border-t border-white/5 text-center">
          <p className="text-xs text-white/40">
            Secured with bank-grade encryption · Row-Level Security
          </p>
        </div>
      </div>
    </div>
  )
}
