import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  School, User, Shield, ArrowRight, ArrowUpRight, LockOpen, ArrowLeft, CheckCircle2,
} from 'lucide-react'

interface RoleData {
  icon: any; gradient: [string, string]; glowColor: string; title: string; subtitle: string; route: string; features: string[]
}

const ROLES: RoleData[] = [
  { icon: School, gradient: ['#42A5F5', '#0D47A1'], glowColor: '#42A5F5', title: 'Student', subtitle: 'View results & attendance', route: 'Student', features: ['Check results', 'Track attendance', 'Pay fees', 'Take CBT exams'] },
  { icon: User, gradient: ['#66BB6A', '#1B5E20'], glowColor: '#66BB6A', title: 'Teacher', subtitle: 'Scores, attendance & more', route: 'Teacher', features: ['Enter scores', 'Mark attendance', 'Post assignments', 'Publish results'] },
  { icon: Shield, gradient: ['#FFB74D', '#E65100'], glowColor: '#FFB74D', title: 'School Admin', subtitle: 'Full school management', route: 'School Admin', features: ['Manage school', 'Configure grading', 'Post announcements', 'Generate reports'] },
]

function Particle({ index }: { index: number }) {
  const rng = (() => {
    const seed = index * 7 + 3
    const rand = (n: number) => { const x = Math.sin(seed + n) * 10000; return x - Math.floor(x) }
    return { top: rand(1) * 100, left: rand(2) * 100, size: rand(3) * 2.5 + 0.8, opacity: rand(4) * 0.25 + 0.05, duration: rand(5) * 4000 + 3000, driftX: (rand(6) - 0.5) * 30, driftY: (rand(7) - 0.5) * 30 }
  })()
  return (
    <div className="absolute rounded-full" style={{ top: `${rng.top}%`, left: `${rng.left}%`, width: `${rng.size}px`, height: `${rng.size}px`, backgroundColor: `rgba(92, 107, 192, ${rng.opacity})`, animation: `particle-drift-${index} ${rng.duration}ms ease-in-out infinite alternate` }}>
      <style>{`@keyframes particle-drift-${index} { 0% { transform: translate(0, 0); } 50% { transform: translate(${rng.driftX}px, ${rng.driftY}px); } 100% { transform: translate(${rng.driftX * 0.5}px, ${rng.driftY * 0.5}px); } }`}</style>
    </div>
  )
}

function GlowOrb({ size, color, opacity }: { size: number; color: string; opacity: number }) {
  return (
    <div className="absolute rounded-full animate-pulse" style={{ width: size, height: size, background: `radial-gradient(circle, ${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')} 0%, ${color}${Math.round(opacity * 0.3 * 255).toString(16).padStart(2, '0')} 50%, transparent 100%)`, animationDuration: '6s' }} />
  )
}

function RoleCard({ role, index, onSelect, mounted }: { role: RoleData; index: number; onSelect: () => void; mounted: boolean }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div className={`transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`} style={{ transitionDelay: `${300 + index * 150}ms` }}>
      <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onClick={onSelect}
        className="group relative cursor-pointer rounded-2xl overflow-hidden transition-all duration-300 ease-out"
        style={{ transform: hovered ? 'translateY(-4px) scale(1.02)' : 'translateY(0) scale(1)' }}>
        <div className="relative p-6"
          style={{ backgroundColor: hovered ? `${role.glowColor}0F` : 'rgba(255,255,255,0.03)', border: `1px solid ${hovered ? `${role.glowColor}73` : 'rgba(255,255,255,0.07)'}`, boxShadow: hovered ? `0 12px 32px ${role.glowColor}40, 0 4px 60px ${role.glowColor}1A` : '0 6px 16px rgba(0,0,0,0.25)' }}>
          <div className="absolute top-0 left-0 right-0 h-0.5 transition-all duration-300" style={{ background: `linear-gradient(90deg, ${role.gradient[0]}, ${role.gradient[1]})`, opacity: hovered ? 1 : 0 }} />
          <div className="flex items-start justify-between mb-5">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
              style={{ background: `linear-gradient(135deg, ${role.gradient[0]}, ${role.gradient[1]})`, boxShadow: `0 6px ${hovered ? 20 : 10}px ${role.glowColor}${hovered ? '80' : '40'}` }}>
              <role.icon size={26} className="text-white" strokeWidth={2.2} />
            </div>
            <span className="text-xs font-bold text-white/15 tracking-widest">0{index + 1}</span>
          </div>
          <h3 className="text-lg font-bold text-white tracking-tight">{role.title}</h3>
          <p className="mt-1 text-sm text-white/40 leading-relaxed">{role.subtitle}</p>
          <div className="mt-4 space-y-1.5 transition-all duration-300 overflow-hidden" style={{ maxHeight: hovered ? '200px' : '0', opacity: hovered ? 1 : 0 }}>
            {role.features.map((feature) => (
              <div key={feature} className="flex items-center gap-2 text-xs text-white/60">
                <CheckCircle2 size={12} style={{ color: role.glowColor }} strokeWidth={2.4} />{feature}
              </div>
            ))}
          </div>
          <div className="mt-5 flex items-center justify-between">
            <span className="text-sm font-semibold text-white/60 group-hover:text-white transition">Select</span>
            <div className="p-2 rounded-xl transition-all duration-300 group-hover:translate-x-1"
              style={{ backgroundColor: hovered ? `${role.glowColor}26` : 'rgba(255,255,255,0.05)', border: `1px solid ${hovered ? `${role.glowColor}59` : 'rgba(255,255,255,0.06)'}` }}>
              {hovered ? <ArrowRight size={16} style={{ color: role.glowColor }} strokeWidth={2.4} /> : <ArrowUpRight size={16} className="text-white/25" strokeWidth={2.2} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function RoleSelectionPage() {
  const navigate = useNavigate()
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  const handleSelectRole = (route: string) => { navigate('/login', { state: { role: route } }) }

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#060B1E]">
      <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #060B1E 0%, #0B1633 33%, #0F1F4B 66%, #162560 100%)' }} />
      {Array.from({ length: 18 }).map((_, i) => (<Particle key={i} index={i} />))}
      <div className="absolute -top-24 -right-20"><GlowOrb size={300} color="#3F51B5" opacity={0.2} /></div>
      <div className="absolute -bottom-32 -left-24"><GlowOrb size={350} color="#1A237E" opacity={0.25} /></div>
      <div className="absolute top-[30%] left-[60%]"><GlowOrb size={180} color="#7C4DFF" opacity={0.08} /></div>
      <div className="absolute top-14 left-7 w-7 h-7 border-l border-t border-white/10 rounded-tl" />
      <div className="absolute bottom-10 right-7 w-7 h-7 border-r border-b border-white/10 rounded-br" />

      <div className="relative min-h-screen flex items-center justify-center px-7 py-12">
        <div className="w-full max-w-5xl">
          <div className={`transition-opacity duration-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
            <button onClick={() => navigate('/login-method')}
              className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition">
              <ArrowLeft size={14} strokeWidth={2.2} />Back
            </button>
          </div>

          <div className={`text-center mt-6 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
            <div className="inline-flex items-center justify-center mb-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center animate-pulse"
                style={{ background: 'linear-gradient(135deg, rgba(26,35,126,0.3), rgba(63,81,181,0.25))', boxShadow: '0 0 30px rgba(92,107,192,0.3)', animationDuration: '2.5s' }}>
                <LockOpen size={24} className="text-white" strokeWidth={2.2} />
              </div>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight"
              style={{ backgroundImage: 'linear-gradient(135deg, #FFFFFF, #B3C6FF, #82B1FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Sign In As
            </h1>
            <p className="mt-2 text-sm text-white/40 tracking-wide">Choose your role to get started</p>
          </div>

          <div className="mt-10 sm:mt-12">
            <div className="hidden md:grid grid-cols-3 gap-5">
              {ROLES.map((role, i) => (<RoleCard key={role.title} role={role} index={i} onSelect={() => handleSelectRole(role.route)} mounted={mounted} />))}
            </div>
            <div className="md:hidden space-y-4">
              {ROLES.map((role, i) => (<RoleCard key={role.title} role={role} index={i} onSelect={() => handleSelectRole(role.route)} mounted={mounted} />))}
            </div>
          </div>

          <div className={`mt-10 flex items-center justify-center gap-6 transition-opacity duration-700 delay-700 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
            {['Secure login', 'Role-based access', '24/7 available'].map((item) => (
              <div key={item} className="inline-flex items-center gap-1.5 text-[11px] text-white/25">
                <CheckCircle2 size={11} strokeWidth={2.4} className="text-emerald-500/60" />{item}
              </div>
            ))}
          </div>

          <p className={`mt-8 text-center text-xs text-white/20 tracking-wide transition-opacity duration-700 delay-700 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
            © 2025 SmartEdu. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}
