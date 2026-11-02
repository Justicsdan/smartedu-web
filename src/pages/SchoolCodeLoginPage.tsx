import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { User, Users, Shield, ArrowLeft, ArrowRight, AlertTriangle, Loader2, School, Sparkles, CheckCircle2 } from 'lucide-react'

function parseColor(v: any, fallback: string): string {
  if (!v) return fallback
  const s = v.toString().replace('#', '')
  if (s.length === 6) return '#' + s
  return fallback
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r},${g},${b}`
}

export default function SchoolCodeLoginPage() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const [school, setSchool] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [mounted, setMounted] = useState(false)
  const [hoveredRole, setHoveredRole] = useState<string | null>(null)

  // Default to Graceville's brand colors; override from school data once loaded
  const primary = parseColor(school?.primary_color, '#0D47A1')
  const accent = parseColor(school?.accent_color, '#FF6F00')
  const primaryRgb = hexToRgb(primary)
  const accentRgb = hexToRgb(accent)

  useEffect(() => {
    if (!code) { setError('No school code provided in URL'); setLoading(false); return }
    ;(async () => {
      try {
        const { data, error } = await supabase
          .from('schools')
          .select('id, school_code, name, logo_url, motto, location, address, official_phone, whatsapp, school_type, is_active')
          .eq('school_code', code.trim().toLowerCase())
          .maybeSingle()
        if (error) throw error
        if (!data) { setError(`No school found with code "${code}".`); setLoading(false); return }
        setSchool(data)
        setLoading(false)
        setTimeout(() => setMounted(true), 100)
      } catch (e: any) {
        console.error('School lookup error:', e)
        setError(e?.message || 'Failed to load school information'); setLoading(false)
      }
    })()
  }, [code])

  const handleSelectRole = (role: string) => navigate('/login', { state: { role } })

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-3 text-white/60">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: primary }} />
          <span className="text-sm font-medium">Loading school…</span>
        </div>
      </div>
    )
  }

  if (error || !school) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
        <div className="bg-white/[0.03] backdrop-blur-sm rounded-2xl border border-white/10 p-8 max-w-md w-full text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-400/20 flex items-center justify-center text-amber-400 mx-auto mb-4">
            <AlertTriangle size={28} strokeWidth={2} />
          </div>
          <h1 className="text-xl font-bold text-white">School not found</h1>
          <p className="mt-2 text-sm text-white/50">{error}</p>
          <div className="mt-5 flex flex-col gap-2">
            <button onClick={() => navigate('/login-method')} className="w-full px-4 py-2.5 rounded-xl bg-white text-slate-900 font-semibold text-sm hover:bg-white/90 transition">Go to standard login</button>
            <button onClick={() => navigate('/')} className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/70 font-semibold text-sm hover:bg-white/10 transition">Back to home</button>
          </div>
        </div>
      </div>
    )
  }

  const logoUrl = school.logo_url || ''
  const schoolName = school.name || 'School'
  const motto = school.motto || ''

  const roles = [
    { id: 'Student', icon: User, label: 'Student', subtitle: 'Results, attendance & assignments', color: '#10b981', colorRgb: '16,185,129' },
    { id: 'Teacher', icon: Users, label: 'Teacher', subtitle: 'Classes, scores & attendance', color: '#3b82f6', colorRgb: '59,130,246' },
    { id: 'School Admin', icon: Shield, label: 'School Admin', subtitle: 'Full school management', color: '#f59e0b', colorRgb: '245,158,11' },
  ]

  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-950 flex items-center justify-center px-4 py-12">
      {/* Background glows — tinted with school's brand color */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full blur-[120px]" style={{ backgroundColor: `rgba(${primaryRgb}, 0.18)` }} />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full blur-[120px]" style={{ backgroundColor: `rgba(${accentRgb}, 0.12)` }} />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(2,6,23,0.5)_100%)]" />
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />
      </div>

      {/* Logo watermark */}
      {logoUrl && (
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.025] pointer-events-none">
          <img src={logoUrl} alt="" className="w-[500px] h-[500px] object-contain"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
        </div>
      )}

      <div className={`w-full max-w-md relative transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        {/* Back button */}
        <button
          onClick={() => navigate('/login-method')}
          className="group inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/80 transition mb-8"
        >
          <ArrowLeft size={14} strokeWidth={2.4} className="group-hover:-translate-x-0.5 transition" />
          Back
        </button>

        {/* School logo with glow */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="absolute inset-0 rounded-3xl blur-2xl opacity-60" style={{ background: `linear-gradient(135deg, ${accent}, ${primary})` }} />
            <div
              className="relative rounded-3xl overflow-hidden flex items-center justify-center bg-white/[0.08] backdrop-blur-sm"
              style={{
                border: '1.5px solid rgba(255,255,255,0.15)',
                boxShadow: `0 12px 32px rgba(${primaryRgb}, 0.25), inset 0 1px 0 rgba(255,255,255,0.15)`,
                width: '96px',
                height: '96px',
              }}
            >
              {logoUrl ? (
                <img src={logoUrl} alt={schoolName} className="w-full h-full object-cover"
                  onError={(e) => {
                    const t = e.target as HTMLImageElement
                    t.style.display = 'none'
                    const p = t.parentElement
                    if (p) p.innerHTML = '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;"><svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/></svg></div>'
                  }} />
              ) : (
                <School size={44} className="text-white" strokeWidth={2.2} />
              )}
            </div>
          </div>
        </div>

        {/* School name + motto */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm mb-4">
            <Sparkles size={12} style={{ color: accent }} strokeWidth={2.4} />
            <span className="text-xs font-medium text-white/80">School portal</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white leading-tight">
            {schoolName}
          </h1>
          {motto && (
            <p className="mt-2 text-sm text-white/50 italic">"{motto}"</p>
          )}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
          <span className="text-[11px] text-white/40 font-semibold tracking-widest uppercase">Select your role</span>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
        </div>

        {/* Role cards — premium glass with gradient hover border */}
        <div className="space-y-3">
          {roles.map((r, i) => {
            const Icon = r.icon
            const isHovered = hoveredRole === r.id
            return (
              <div
                key={r.id}
                onMouseEnter={() => setHoveredRole(r.id)}
                onMouseLeave={() => setHoveredRole(null)}
                onClick={() => handleSelectRole(r.id)}
                className={`group relative cursor-pointer rounded-2xl overflow-hidden transition-all duration-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                style={{
                  transitionDelay: `${300 + i * 100}ms`,
                  transform: isHovered ? 'translateY(-2px) scale(1.01)' : 'translateY(0) scale(1)',
                }}
              >
                {/* Gradient border layer */}
                <div
                  className="absolute inset-0 transition-opacity duration-300"
                  style={{
                    background: `linear-gradient(135deg, ${r.color}, ${primary})`,
                    opacity: isHovered ? 1 : 0,
                  }}
                />
                {/* Card body */}
                <div
                  className="relative bg-slate-950 rounded-2xl px-4 py-4 flex items-center gap-4 transition-colors"
                  style={{
                    backgroundColor: isHovered ? `rgba(${r.colorRgb}, 0.08)` : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${isHovered ? `${r.color}66` : 'rgba(255,255,255,0.1)'}`,
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  {/* Icon */}
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
                    style={{
                      background: `linear-gradient(135deg, rgba(${r.colorRgb}, 0.2), rgba(${r.colorRgb}, 0.05))`,
                      border: `1px solid rgba(${r.colorRgb}, 0.3)`,
                    }}
                  >
                    <Icon size={22} style={{ color: r.color }} strokeWidth={2.2} />
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-white">{r.label}</div>
                    <div className="text-xs text-white/50 mt-0.5">{r.subtitle}</div>
                  </div>

                  {/* Arrow */}
                  <div
                    className="p-2 rounded-lg transition-all flex-shrink-0"
                    style={{
                      backgroundColor: isHovered ? `${r.color}26` : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${isHovered ? `${r.color}59` : 'rgba(255,255,255,0.06)'}`,
                    }}
                  >
                    <ArrowRight
                      size={14}
                      strokeWidth={2.4}
                      className="transition-all"
                      style={{
                        color: isHovered ? r.color : 'rgba(255,255,255,0.3)',
                        transform: isHovered ? 'translateX(2px)' : 'translateX(0)',
                      }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer trust badges */}
        <div className={`mt-8 flex items-center justify-center gap-4 transition-opacity duration-700 ${mounted ? 'opacity-100' : 'opacity-0'}`} style={{ transitionDelay: '700ms' }}>
          {['Secure login', 'Role-based access', '24/7 available'].map((item) => (
            <div key={item} className="inline-flex items-center gap-1.5 text-[11px] text-white/30">
              <CheckCircle2 size={11} strokeWidth={2.4} style={{ color: `${accent}99` }} />
              {item}
            </div>
          ))}
        </div>

        {/* Powered by SmartEdu */}
        <div className={`mt-6 text-center transition-opacity duration-700 ${mounted ? 'opacity-100' : 'opacity-0'}`} style={{ transitionDelay: '900ms' }}>
          <p className="text-[11px] text-white/30">
            Powered by <span className="font-semibold text-white/50">SmartEdu</span>
          </p>
        </div>
      </div>
    </div>
  )
}
