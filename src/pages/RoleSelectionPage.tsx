import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  School, User, Shield, ArrowRight, ArrowLeft, CheckCircle2,
} from 'lucide-react'

interface RoleData {
  icon: any
  color: string
  colorRgb: string
  title: string
  subtitle: string
  route: string
  features: string[]
}

const ROLES: RoleData[] = [
  {
    icon: School,
    color: '#10b981',
    colorRgb: '16,185,129',
    title: 'Student',
    subtitle: 'View results & attendance',
    route: 'Student',
    features: ['Check results', 'Track attendance', 'Pay fees', 'Take CBT exams'],
  },
  {
    icon: User,
    color: '#3b82f6',
    colorRgb: '59,130,246',
    title: 'Teacher',
    subtitle: 'Scores, attendance & more',
    route: 'Teacher',
    features: ['Enter scores', 'Mark attendance', 'Post assignments', 'Publish results'],
  },
  {
    icon: Shield,
    color: '#f59e0b',
    colorRgb: '245,158,11',
    title: 'School Admin',
    subtitle: 'Full school management',
    route: 'School Admin',
    features: ['Manage school', 'Configure grading', 'Post announcements', 'Generate reports'],
  },
]

export default function RoleSelectionPage() {
  const navigate = useNavigate()
  const [mounted, setMounted] = useState(false)
  const [hoveredRole, setHoveredRole] = useState<string | null>(null)

  useEffect(() => { setMounted(true) }, [])

  const handleSelectRole = (route: string) => navigate('/login', { state: { role: route } })

  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-950 flex items-center justify-center px-4 py-12">
      {/* Background — matches HomePage/LoginMethodPage */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-emerald-500/15 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-blue-500/15 blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(2,6,23,0.5)_100%)]" />
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />
      </div>

      <div className={`w-full max-w-5xl relative transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        {/* Back button */}
        <button
          onClick={() => navigate('/login-method')}
          className="group inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/80 transition mb-8"
        >
          <ArrowLeft size={14} strokeWidth={2.4} className="group-hover:-translate-x-0.5 transition" />
          Back
        </button>

        {/* Heading */}
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-[1.15]">
            Sign in as
          </h1>
          <p className="mt-3 text-sm sm:text-base text-white/50">
            Choose your role to get started
          </p>
        </div>

        {/* Role cards — glass with gradient hover border, matches SchoolCodeLoginPage pattern */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {ROLES.map((role, i) => {
            const Icon = role.icon
            const isHovered = hoveredRole === role.title
            return (
              <div
                key={role.title}
                onMouseEnter={() => setHoveredRole(role.title)}
                onMouseLeave={() => setHoveredRole(null)}
                onClick={() => handleSelectRole(role.route)}
                className={`group relative cursor-pointer rounded-2xl overflow-hidden transition-all duration-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
                style={{
                  transitionDelay: `${200 + i * 100}ms`,
                  transform: isHovered ? 'translateY(-4px) scale(1.02)' : 'translateY(0) scale(1)',
                }}
              >
                {/* Gradient border layer */}
                <div
                  className="absolute inset-0 transition-opacity duration-300"
                  style={{
                    background: `linear-gradient(135deg, ${role.color}, #6366f1)`,
                    opacity: isHovered ? 1 : 0,
                  }}
                />
                {/* Card body */}
                <div
                  className="relative bg-slate-950 rounded-2xl p-6 h-full flex flex-col"
                  style={{
                    backgroundColor: isHovered ? `rgba(${role.colorRgb}, 0.06)` : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${isHovered ? `${role.color}66` : 'rgba(255,255,255,0.1)'}`,
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  {/* Icon + number */}
                  <div className="flex items-start justify-between mb-5">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110"
                      style={{
                        background: `linear-gradient(135deg, rgba(${role.colorRgb}, 0.2), rgba(${role.colorRgb}, 0.05))`,
                        border: `1px solid rgba(${role.colorRgb}, 0.3)`,
                      }}
                    >
                      <Icon size={24} style={{ color: role.color }} strokeWidth={2.2} />
                    </div>
                    <span className="text-2xl font-bold text-white/10 tracking-tight">0{i + 1}</span>
                  </div>

                  {/* Title + subtitle */}
                  <h3 className="text-lg font-bold text-white tracking-tight">{role.title}</h3>
                  <p className="mt-1 text-sm text-white/50 leading-relaxed">{role.subtitle}</p>

                  {/* Features list — reveals on hover */}
                  <div
                    className="mt-4 space-y-1.5 transition-all duration-300 overflow-hidden flex-1"
                    style={{
                      maxHeight: isHovered ? '200px' : '0',
                      opacity: isHovered ? 1 : 0,
                    }}
                  >
                    {role.features.map((feature) => (
                      <div key={feature} className="flex items-center gap-2 text-xs text-white/60">
                        <CheckCircle2 size={12} style={{ color: role.color }} strokeWidth={2.4} />
                        {feature}
                      </div>
                    ))}
                  </div>

                  {/* Select row */}
                  <div className="mt-5 pt-5 border-t border-white/5 flex items-center justify-between">
                    <span className="text-sm font-semibold text-white/60 group-hover:text-white transition">
                      Select
                    </span>
                    <div
                      className="p-2 rounded-lg transition-all"
                      style={{
                        backgroundColor: isHovered ? `${role.color}26` : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${isHovered ? `${role.color}59` : 'rgba(255,255,255,0.06)'}`,
                      }}
                    >
                      <ArrowRight
                        size={14}
                        strokeWidth={2.4}
                        className="transition-all"
                        style={{
                          color: isHovered ? role.color : 'rgba(255,255,255,0.3)',
                          transform: isHovered ? 'translateX(2px)' : 'translateX(0)',
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Trust badges */}
        <div className={`mt-10 flex items-center justify-center gap-6 transition-opacity duration-700 ${mounted ? 'opacity-100' : 'opacity-0'}`} style={{ transitionDelay: '600ms' }}>
          {['Secure login', 'Role-based access', '24/7 available'].map((item) => (
            <div key={item} className="inline-flex items-center gap-1.5 text-[11px] text-white/30">
              <CheckCircle2 size={11} strokeWidth={2.4} className="text-emerald-500/60" />
              {item}
            </div>
          ))}
        </div>

        {/* Copyright */}
        <p className={`mt-8 text-center text-xs text-white/20 transition-opacity duration-700 ${mounted ? 'opacity-100' : 'opacity-0'}`} style={{ transitionDelay: '800ms' }}>
          © {new Date().getFullYear()} SmartEdu. All rights reserved.
        </p>
      </div>
    </div>
  )
}
