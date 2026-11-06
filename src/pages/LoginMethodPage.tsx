import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { School, Hash, ArrowRight, ArrowLeft, Shield, Sparkles } from 'lucide-react'

export default function LoginMethodPage() {
  const navigate = useNavigate()
  const [schoolCode, setSchoolCode] = useState('')
  const [hovered, setHovered] = useState(false)

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-6" style={{ background: 'linear-gradient(135deg, #060B1E 0%, #0B1633 33%, #0F1F4B 66%, #162560 100%)' }}>
      <div className="absolute -top-24 -right-20 w-80 h-80 rounded-full opacity-20 animate-pulse" style={{ background: 'radial-gradient(circle, #3F51B5 0%, transparent 70%)', animationDuration: '6s' }} />
      <div className="absolute -bottom-32 -left-24 w-96 h-96 rounded-full opacity-25 animate-pulse" style={{ background: 'radial-gradient(circle, #1A237E 0%, transparent 70%)', animationDuration: '8s' }} />
      <div className="absolute top-[30%] left-[60%] w-48 h-48 rounded-full opacity-10 animate-pulse" style={{ background: 'radial-gradient(circle, #7C4DFF 0%, transparent 70%)', animationDuration: '7s' }} />
      <div className="absolute top-14 left-7 w-7 h-7 border-l border-t border-white/10 rounded-tl" />
      <div className="absolute bottom-10 right-7 w-7 h-7 border-r border-b border-white/10 rounded-br" />
      <div className="w-full max-w-md relative z-10">
        <button onClick={() => navigate('/')} className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-white/40 hover:text-white/70 transition">
          <ArrowLeft size={14} strokeWidth={2.4} /> Back
        </button>
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="absolute inset-0 rounded-3xl blur-2xl opacity-60" style={{ background: 'linear-gradient(135deg, #42A5F5, #7C4DFF)' }} />
            <div className="relative w-16 h-16 rounded-2xl flex items-center justify-center shadow-2xl" style={{ background: 'linear-gradient(135deg, #42A5F5, #0D47A1)', boxShadow: '0 8px 32px rgba(66, 165, 245, 0.4)' }}>
              <School size={28} className="text-white" strokeWidth={2.2} />
            </div>
          </div>
        </div>
        <h1 className="text-3xl font-bold text-white text-center tracking-tight">Welcome Back</h1>
        <p className="mt-2 text-sm text-white/40 text-center">Choose how you'd like to sign in</p>
        <button
          onClick={() => navigate('/role-selection')}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className="group relative w-full mt-8 p-5 rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-0.5"
          style={{ background: hovered ? 'linear-gradient(135deg, #42A5F5, #0D47A1)' : 'linear-gradient(135deg, #42A5F5, #1565C0)', boxShadow: hovered ? '0 12px 32px rgba(66, 165, 245, 0.4), 0 4px 60px rgba(66, 165, 245, 0.15)' : '0 6px 16px rgba(0, 0, 0, 0.25)' }}
        >
          <div className="relative flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-white/15 backdrop-blur-sm transition-transform group-hover:scale-110">
              <School size={20} className="text-white" strokeWidth={2.2} />
            </div>
            <div className="flex-1 text-left">
              <div className="text-base font-bold text-white">Continue</div>
              <div className="text-xs text-white/70">Without school code</div>
            </div>
            <ArrowRight size={18} className="text-white/80 group-hover:translate-x-1 transition-transform" strokeWidth={2.4} />
          </div>
        </button>
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">Or</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>
        <div className="p-5 rounded-2xl border transition-all" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FFB74D, #E65100)', boxShadow: '0 4px 12px rgba(255, 183, 77, 0.3)' }}>
              <Hash size={16} className="text-white" strokeWidth={2.4} />
            </div>
            <div>
              <div className="text-sm font-bold text-white">With school code</div>
              <div className="text-[11px] text-white/40">Enter your school's unique code</div>
            </div>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={schoolCode}
              onChange={(e) => setSchoolCode(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && schoolCode.trim()) navigate('/s/' + schoolCode.trim().toLowerCase()) }}
              placeholder="e.g. graceville"
              className="flex-1 px-4 py-3 text-sm text-white placeholder-white/30 rounded-xl outline-none transition-all focus:ring-2 focus:ring-amber-400/30"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
            />
            <button
              onClick={() => schoolCode.trim() && navigate('/s/' + schoolCode.trim().toLowerCase())}
              disabled={!schoolCode.trim()}
              className="px-5 py-3 rounded-xl text-sm font-bold text-white transition-all hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              style={{ background: schoolCode.trim() ? 'linear-gradient(135deg, #FFB74D, #E65100)' : '#374151', boxShadow: schoolCode.trim() ? '0 6px 16px rgba(255, 183, 77, 0.35)' : 'none' }}
            >Go</button>
          </div>
        </div>
        <div className="mt-8 flex items-center justify-center gap-2 text-[11px] text-white/30">
          <Sparkles size={11} strokeWidth={2} />
          <span>Secured by SmartEdu • End-to-end encrypted</span>
        </div>
      </div>
      <button type="button" onClick={() => navigate('/super-admin-login')} aria-label="Super admin login" className="fixed bottom-3 right-3 z-50 p-2 text-white/12 hover:text-white/30 transition" style={{ opacity: 0.12 }}>
        <Shield size={18} />
      </button>
    </div>
  )
}
