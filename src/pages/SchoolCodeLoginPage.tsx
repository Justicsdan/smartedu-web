import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { User, Users, Shield, ArrowLeft, AlertTriangle, Loader2, School } from 'lucide-react'

function parseColor(v: any, fallback: string): string {
  if (!v) return fallback
  const s = v.toString().replace('#', '')
  if (s.length === 6) return '#' + s
  return fallback
}

function RoleCard({ icon: Icon, title, subtitle, accent, onSelect, delay, mounted }: {
  icon: any; title: string; subtitle: string; accent: string; onSelect: () => void; delay: number; mounted: boolean
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      className={`transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={onSelect}
        className="group relative cursor-pointer rounded-2xl overflow-hidden transition-all duration-300 ease-out"
        style={{
          transform: hovered ? 'translateY(-3px) scale(1.03)' : 'translateY(0) scale(1)',
        }}
      >
        <div
          className="relative p-5"
          style={{
            backgroundColor: hovered ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.06)',
            border: `1px solid ${hovered ? accent + '66' : 'rgba(255,255,255,0.1)'}`,
            boxShadow: hovered ? `0 12px 32px ${accent}33, 0 0 0 1px ${accent}26` : '0 4px 12px rgba(0,0,0,0.15)',
          }}
        >
          {/* Top accent line */}
          <div
            className="absolute top-0 left-0 right-0 h-0.5 transition-opacity duration-300"
            style={{
              background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
              opacity: hovered ? 1 : 0,
            }}
          />

          {/* Icon */}
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 mx-auto transition-transform duration-300 group-hover:scale-110"
            style={{
              background: `linear-gradient(135deg, ${accent}, ${accent}99)`,
              boxShadow: `0 6px 16px ${accent}4D, inset 0 1px 0 rgba(255,255,255,0.2)`,
            }}
          >
            <Icon size={22} className="text-white" strokeWidth={2.2} />
          </div>

          {/* Title */}
          <h3 className="text-center text-sm font-bold text-white">{title}</h3>

          {/* Subtitle */}
          <p className="text-center text-xs text-white/50 mt-1 leading-relaxed">{subtitle}</p>

          {/* Hover arrow */}
          <div
            className="mt-3 flex justify-center transition-all duration-300"
            style={{ opacity: hovered ? 1 : 0, transform: hovered ? 'translateY(0)' : 'translateY(4px)' }}
          >
            <div
              className="px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider"
              style={{
                backgroundColor: accent + '26',
                color: accent,
              }}
            >
              Continue →
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SchoolCodeLoginPage() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const [school, setSchool] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [mounted, setMounted] = useState(false)

  const primary = parseColor(school?.primary_color, '#0D47A1')
  const secondary = parseColor(school?.secondary_color, '#1A237E')
  const accent = parseColor(school?.accent_color, '#FF6F00')

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

  const handleSelectRole = (role: string) => { navigate('/login', { state: { role } }) }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="flex flex-col items-center gap-3 text-white/60">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="text-sm font-medium">Loading school…</span>
        </div>
      </div>
    )
  }

  if (error || !school) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-md w-full text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600 mx-auto mb-4">
            <AlertTriangle size={28} strokeWidth={2} />
          </div>
          <h1 className="text-xl font-bold text-slate-900">School not found</h1>
          <p className="mt-2 text-sm text-slate-600">{error}</p>
          <div className="mt-5 flex flex-col gap-2">
            <button onClick={() => navigate('/login-method')} className="w-full px-4 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm">Go to standard login</button>
            <button onClick={() => navigate('/')} className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-semibold text-sm hover:bg-slate-50">Back to home</button>
          </div>
        </div>
      </div>
    )
  }

  const logoUrl = school.logo_url || ''
  const schoolName = school.name || 'School'
  const motto = school.motto || ''

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: `linear-gradient(180deg, ${primary}, ${secondary})` }}>
      {/* Glow orbs */}
      <div className="absolute -top-24 -right-16 rounded-full animate-pulse"
        style={{ width: 320, height: 320, background: `radial-gradient(circle, ${accent}26 0%, ${accent}0D 50%, transparent 100%)`, animationDuration: '8s' }} />
      <div className="absolute -bottom-32 -left-24 rounded-full animate-pulse"
        style={{ width: 380, height: 380, background: `radial-gradient(circle, ${secondary}1F 0%, ${secondary}0A 50%, transparent 100%)`, animationDuration: '10s', animationDelay: '1s' }} />
      <div className="absolute top-[40%] left-[15%] rounded-full animate-pulse"
        style={{ width: 200, height: 200, background: `radial-gradient(circle, ${primary}1A 0%, ${primary}0A 50%, transparent 100%)`, animationDuration: '7s', animationDelay: '2s' }} />

      {/* Logo watermark */}
      {logoUrl && (
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.04] pointer-events-none">
          <img src={logoUrl} alt="" className="w-[400px] h-[400px] object-contain"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
        </div>
      )}

      <div className="relative min-h-screen flex items-center justify-center px-6 py-10">
        <div className={`w-full max-w-md transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {/* Logo with glow */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 rounded-3xl blur-2xl opacity-60" style={{ background: `linear-gradient(135deg, ${accent}, ${primary})` }} />
              <div
                className="relative rounded-3xl overflow-hidden flex items-center justify-center"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.12)',
                  border: '1.5px solid rgba(255,255,255,0.2)',
                  boxShadow: '0 12px 32px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15)',
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

          {/* School name */}
          <h1 className="text-center text-3xl font-black text-white tracking-tight leading-tight">
            {schoolName}
          </h1>

          {/* Motto */}
          {motto && (
            <div className="mt-3 flex justify-center">
              <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs text-white/60 italic"
                style={{ backgroundColor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.08)' }}>
                "{motto}"
              </span>
            </div>
          )}

          {/* Divider */}
          <div className="mt-8 mb-6 flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)' }} />
            <span className="text-[11px] text-white/40 font-semibold tracking-widest uppercase">Select your role</span>
            <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)' }} />
          </div>

          {/* Role cards */}
          <div className="space-y-3">
            <RoleCard icon={User} title="Student" subtitle="Results, attendance & assignments" accent="#66BB6A" onSelect={() => handleSelectRole('Student')} delay={300} mounted={mounted} />
            <RoleCard icon={Users} title="Teacher" subtitle="Classes, scores & attendance" accent="#42A5F5" onSelect={() => handleSelectRole('Teacher')} delay={400} mounted={mounted} />
            <RoleCard icon={Shield} title="School Admin" subtitle="Full school management" accent="#FFA726" onSelect={() => handleSelectRole('School Admin')} delay={500} mounted={mounted} />
          </div>

          {/* Back to home */}
          <div className={`mt-10 text-center transition-opacity duration-700 delay-700 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
            <button onClick={() => navigate('/')} className="inline-flex items-center gap-1.5 text-sm text-white/30 hover:text-white/60 transition">
              <ArrowLeft size={14} strokeWidth={2.2} />Back to home
            </button>
          </div>

          {/* Secure badge */}
          <div className={`mt-6 flex justify-center transition-opacity duration-700 delay-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-semibold text-white/40"
              style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <Shield size={10} strokeWidth={2.4} />
              Secure Portal
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
