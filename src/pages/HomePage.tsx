import { ArrowRight, ArrowUp, Baby, BarChart3, BookOpen, Calculator, CheckCircle, ClipboardList, Cloud, GraduationCap, Laptop, Lock, MessageSquare, Printer, School, Smartphone, Star, Trophy, Upload, Users, Zap } from 'lucide-react';

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

export default function HomePage() {
  const navigate = useNavigate()
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [showEntryDialog, setShowEntryDialog] = useState(false)
  const [showCodeDialog, setShowCodeDialog] = useState(false)
  const [schoolCode, setSchoolCode] = useState('')
  const [codeError, setCodeError] = useState('')
  const [codeLoading, setCodeLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const savedCode = localStorage.getItem('last_school_code')
    if (savedCode) setSchoolCode(savedCode)
  }, [])

  const handleScroll = () => {
    if (scrollRef.current) {
      setShowScrollTop(scrollRef.current.scrollTop > 400)
    }
  }

  const scrollToTop = () => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const openWhatsApp = () => {
    window.open('https://wa.me/2347080304822', '_blank')
  }

  const lookupSchoolCode = async () => {
    const code = schoolCode.trim()
    if (!code) return
    setCodeLoading(true)
    setCodeError('')
    try {
      const res = await fetch(
        `https://tcjsmkhmfjigutfhjtem.supabase.co/rest/v1/schools?school_code=eq.${code}&select=*`,
        { headers: { apikey: 'sb_publishable_zWDvjhEldcV8eutnlRypGA_LGpOUhkg' } }
      )
      const data = await res.json()
      if (!data || data.length === 0) {
        setCodeError('School code not found')
      } else {
        localStorage.setItem('last_school_code', code)
        navigate(`/s/${code}`, { state: data[0] })
      }
    } catch {
      setCodeError('Error looking up code')
    } finally {
      setCodeLoading(false)
    }
  }

  const features = [
    { icon: <Calculator className="w-6 h-6" />, title: 'Smart Grading', desc: 'WAEC, BECE, 5-point & American GPA with auto positions.', color: '#6366F1' },
    { icon: <BookOpen className="w-6 h-6" />, title: 'ACE Curriculum', desc: 'Full support for PACEs, HACS/NCE scoring & specialized reports.', color: '#0EA5E9' },
    { icon: <BarChart3 className="w-6 h-6" />, title: 'Result Publishing', desc: 'One-click publish with behavioral ratings & comments.', color: '#10B981' },
    { icon: <Users className="w-6 h-6" />, title: 'Role-Based Access', desc: 'Separate dashboards for Admin, Teacher & Student.', color: '#F59E0B' },
    { icon: <ClipboardList className="w-6 h-6" />, title: 'CBT Exams', desc: 'Computer-based tests with auto grading & score sync.', color: '#EC4899' },
    { icon: <Lock className="w-6 h-6" />, title: 'Secure Login', desc: 'PIN for students, bcrypt passwords for staff.', color: '#06B6D4' },
    { icon: <Printer className="w-6 h-6" />, title: 'PDF Reports', desc: 'Professional results with photos, stamps & signatures.', color: '#8B5CF6' },
  ]

  const gradingSystems = [
    { title: 'SSS', subtitle: 'WAEC · NECO · IGCSE', icon: <GraduationCap className="w-6 h-6" />, color: '#6366F1', grades: ['A1','B2','B3','C4','C5','C6','D7','E8','F9'], desc: 'Five assessment columns with auto position computation' },
    { title: 'JSS', subtitle: 'BECE Standard', icon: <BookOpen className="w-6 h-6" />, color: '#10B981', grades: ['A','B','C','P','F'], desc: 'Continuous Assessment and Exam — two columns' },
    { title: 'Primary', subtitle: '5-Point Scale', icon: <Baby className="w-6 h-6" />, color: '#F59E0B', grades: ['5','4','3','2','1'], desc: 'Three assessment columns with simple grading' },
    { title: 'American', subtitle: 'US GPA System', icon: <Star className="w-6 h-6" />, color: '#EC4899', grades: ['A','A-','B+','B','B-','C+','C','C-','D+','D','D-','F'], desc: 'Five assessment columns with 4.0 GPA points' },
  ]

  const steps = [
    { title: 'Set Up School', desc: 'Configure your profile, grading system, and classes.', icon: <School className="w-6 h-6" />, color: '#6366F1' },
    { title: 'Register People', desc: 'Add students and teachers with photos and details.', icon: <Users className="w-6 h-6" />, color: '#10B981' },
    { title: 'Enter & Publish', desc: 'Record scores, compute positions, publish results.', icon: <Upload className="w-6 h-6" />, color: '#F59E0B' },
  ]

  const trustBadges = [
    { icon: <Lock className="w-6 h-6" />, text: 'Secure' },
    { icon: <Cloud className="w-6 h-6" />, text: 'Cloud Hosted' },
    { icon: <Zap className="w-6 h-6" />, text: 'Fast' },
    { icon: <Smartphone className="w-6 h-6" />, text: 'Any Device' },
    { icon: <Trophy className="w-6 h-6" />, text: "Int'l Standards" },
  ]

  const faqs = [
    { q: 'How do I get started?', a: 'Sign up, set up your school profile, add classes, register students and teachers. You can publish your first results in under an hour.' },
    { q: 'Which grading systems are supported?', a: 'WAEC, NECO, IGCSE for secondary school, BECE for junior school, 5-point scale for primary — plus a full American GPA system. Each tier supports custom overrides.' },
    { q: 'Can I switch between Nigerian and American standards?', a: 'Yes. Toggle between standards in Settings and all tiers instantly adapt — grading scales, assessment columns, and grade computations update automatically.' },
    { q: 'Does it work on mobile?', a: 'Fully responsive web application. Works seamlessly on phones, tablets, and desktops through any modern browser.' },
  ]

  return (
    <div className="min-h-screen bg-[#080C22] text-white overflow-x-hidden">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#080C22] via-[#0E1630] to-[#0B1025]" />
      
      {/* Floating orbs */}
      <div className="fixed top-[-120px] right-[-80px] w-[320px] h-[320px] rounded-full bg-indigo-600/10 blur-3xl" />
      <div className="fixed bottom-[-140px] left-[-100px] w-[380px] h-[380px] rounded-full bg-purple-600/10 blur-3xl" />

      {/* Scrollable content */}
      <div ref={scrollRef} onScroll={handleScroll} className="relative h-screen overflow-y-auto scroll-smooth">
        <div className="max-w-2xl mx-auto px-4 py-16">
          
          {/* Hero Section */}
          <div className="text-center mb-16">
            <div className="inline-block mb-7">
              <div className="w-[150px] h-[150px] bg-white rounded-3xl shadow-2xl p-2.5 flex items-center justify-center" style={{ boxShadow: '0 14px 50px rgba(59,130,246,0.5), 0 0 40px rgba(99,102,241,0.3)' }}>
                <img src="/smartedu_logo.webp" alt="SmartEdu" className="w-full h-full object-contain" />
              </div>
            </div>
            <h1 className="text-4xl font-black mb-4 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              School<br />Management System
            </h1>
            <p className="text-white/60 text-sm mb-8 px-4">
              Streamline admissions, scores, and results — supporting Traditional, American GPA, and ACE curriculums.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/role-selection')}
                className="px-12 py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold rounded-xl shadow-lg shadow-orange-500/40 hover:scale-105 transition"
              >
                Get Started
              </button>
              <div>
                <button
                  onClick={() => scrollRef.current?.scrollTo({ top: 500, behavior: 'smooth' })}
                  className="px-8 py-2.5 border border-white/10 rounded-xl text-white/60 text-sm hover:bg-white/5 transition"
                >
                  Learn More
                </button>
              </div>
            </div>
            {/* Pills */}
            <div className="flex flex-wrap justify-center gap-2 mt-7">
              {[
                { key: 'fast', icon: <Zap className="w-3.5 h-3.5" />, label: 'Fast' },
                { key: 'secure', icon: <Lock className="w-3.5 h-3.5" />, label: 'Secure' },
                { key: 'reliable', icon: <CheckCircle className="w-3.5 h-3.5" />, label: 'Reliable' },
                { key: 'cross', icon: <Laptop className="w-3.5 h-3.5" />, label: 'Cross-Platform' },
              ].map(p => (
                <span key={p.key} className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs text-white/50 inline-flex items-center gap-1.5">
                  {p.icon}{p.label}
                </span>
              ))}
            </div>
          </div>

          {/* Features */}
          <div className="mb-16">
            <h2 className="text-2xl font-bold text-center mb-2">Powerful Features</h2>
            <p className="text-center text-white/40 text-sm mb-6">Everything your school needs</p>
            <div className="grid gap-3">
              {features.map((f, i) => (
                <div key={i} className="flex items-start gap-3 p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-white/20 transition cursor-default">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ background: `${f.color}30` }}>
                    {f.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">{f.title}</h3>
                    <p className="text-xs text-white/50 mt-1">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Grading Standards */}
          <div className="mb-16">
            <h2 className="text-2xl font-bold text-center mb-2">Grading Standards</h2>
            <p className="text-center text-white/40 text-sm mb-6">Nigerian, American GPA, and ACE systems supported</p>
            <div className="grid gap-3">
              {gradingSystems.map((g, i) => (
                <div key={i} className="p-5 bg-white/5 border border-white/10 rounded-2xl">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg" style={{ background: `${g.color}30` }}>{g.icon}</div>
                    <div>
                      <h3 className="font-bold text-sm">{g.title}</h3>
                      <p className="text-xs text-white/40">{g.subtitle}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {g.grades.map(gr => (
                      <span key={gr} className="px-2 py-0.5 text-xs font-bold rounded" style={{ background: `${g.color}20`, color: g.color }}>{gr}</span>
                    ))}
                  </div>
                  <p className="text-xs text-white/30">{g.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* How It Works */}
          <div className="mb-16">
            <h2 className="text-2xl font-bold text-center mb-2">How It Works</h2>
            <p className="text-center text-white/40 text-sm mb-6">Three steps to go live</p>
            <div className="space-y-3">
              {steps.map((s, i) => (
                <div key={i} className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ background: `${s.color}30` }}>{s.icon}</div>
                  <div className="flex-1">
                    <h3 className="font-bold text-sm">{s.title}</h3>
                    <p className="text-xs text-white/40 mt-1">{s.desc}</p>
                  </div>
                  <ArrowRight className="text-white/20 w-4 h-4" />
                </div>
              ))}
            </div>
          </div>

          {/* Trust Bar */}
          <div className="mb-16 p-6 bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-2xl text-center">
            <h2 className="text-xl font-bold mb-1">Built for Real Schools</h2>
            <p className="text-white/35 text-sm mb-5">Designed for Nigerian schools, ready for the world</p>
            <div className="flex flex-wrap justify-center gap-2.5">
              {trustBadges.map(b => (
                <span key={b.text} className="px-3.5 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white/70 flex items-center gap-2">
                  <span>{b.icon}</span> {b.text}
                </span>
              ))}
            </div>
          </div>

          {/* FAQ */}
          <div className="mb-16">
            <h2 className="text-2xl font-bold text-center mb-2">Common Questions</h2>
            <p className="text-center text-white/40 text-sm mb-6">Quick answers</p>
            <div className="space-y-2">
              {faqs.map((f, i) => <FAQItem key={i} q={f.q} a={f.a} />)}
            </div>
          </div>

          {/* Footer */}
          <div className="text-center">
            <div className="h-px bg-white/5 mb-6" />
            <button onClick={openWhatsApp} className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-500/10 border border-green-500/20 rounded-full hover:bg-green-500/20 transition mb-4">
              <MessageSquare className="w-4 h-4 inline-block" />
              <span className="text-sm text-white">WhatsApp: 07080304822</span>
            </button>
            <div className="flex justify-center gap-3 text-xs text-white/25 mb-3">
              <button className="hover:text-white/50">Privacy</button>
              <span>·</span>
              <button className="hover:text-white/50">Terms</button>
              <span>·</span>
              <button onClick={openWhatsApp} className="hover:text-white/50">Support</button>
            </div>
            <div className="flex items-center justify-center gap-1.5">
              <span className="text-white/12 text-[11px]">© 2025. All rights reserved.</span>
              <button onClick={() => navigate('/super-admin-login')} className="text-white/10 hover:text-white/20 transition">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating WhatsApp button */}
      <button onClick={openWhatsApp} className="fixed bottom-7 left-7 w-13 h-13 bg-green-500 rounded-2xl shadow-lg flex items-center justify-center hover:scale-110 transition z-50" style={{ width: 52, height: 52 }}>
        <MessageSquare className="text-xl w-4 h-4" />
      </button>

      {/* Scroll to top button */}
      {showScrollTop && (
        <button onClick={scrollToTop} className="fixed bottom-7 right-7 bg-[#1A237E] rounded-2xl shadow-lg flex items-center justify-center hover:scale-110 transition z-50" style={{ width: 52, height: 52 }}>
          <ArrowUp className="text-white text-xl w-4 h-4" />
        </button>
      )}

      {/* Entry Options Dialog */}
      {showEntryDialog && (
        <div className="fixed inset-0 flex items-end justify-center z-50" onClick={() => setShowEntryDialog(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative bg-[#0E0E2A] rounded-2xl p-5 mb-8 w-[340px] max-w-full" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-white mb-1">Sign In</h3>
            <p className="text-xs text-white/50 mb-3">Choose your preferred method</p>
            <button onClick={() => { setShowEntryDialog(false); setShowCodeDialog(true) }} className="w-full flex items-center gap-3 p-2 bg-white/5 border border-indigo-500/20 rounded-2xl hover:bg-white/10 transition mb-2">
              <Smartphone className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-400/60 rounded-2xl flex items-center justify-center text-2xl" />
              <div className="flex-1 text-left">
                <h4 className="font-bold text-sm text-white">Enter with School Code</h4>
                <p className="text-xs text-white/40 mt-1">Use your school code for a branded experience</p>
              </div>
              <ArrowRight className="text-indigo-400/70 w-4 h-4" />
            </button>
            <button onClick={() => { setShowEntryDialog(false); navigate('/role-selection') }} className="w-full flex items-center gap-3 p-2 bg-white/5 border border-green-500/20 rounded-2xl hover:bg-white/10 transition">
              <KeyRound className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-400/60 rounded-2xl flex items-center justify-center text-2xl" />
              <div className="flex-1 text-left">
                <h4 className="font-bold text-sm text-white">Continue without code</h4>
                <p className="text-xs text-white/40 mt-1">Go directly to role selection</p>
              </div>
              <ArrowRight className="text-green-400/70 w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* School Code Dialog */}
      {showCodeDialog && (
        <div className="fixed inset-0 flex items-end justify-center z-50" onClick={() => setShowCodeDialog(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative bg-[#0E0E2A] rounded-2xl p-5 mb-8 w-[340px] max-w-full" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-white mb-1">Enter School Code</h3>
            <p className="text-xs text-white/50 mb-3 text-center">Type the 4-digit code provided by your school</p>
            <div className="flex items-center bg-[#16163A] rounded-xl border border-white/10 overflow-hidden">
              <input
                type="text"
                value={schoolCode}
                onChange={e => setSchoolCode(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && lookupSchoolCode()}
                maxLength={4}
                placeholder="e.g. 4821"
                className="flex-1 bg-transparent text-white text-center text-lg font-bold tracking-widest px-4 py-3.5 outline-none placeholder:text-white/20 placeholder:tracking-normal"
              />
              <button
                onClick={lookupSchoolCode}
                disabled={codeLoading}
                className="w-12 h-12 bg-indigo-500 flex items-center justify-center disabled:bg-white/10"
              >
                {codeLoading ? <span className="text-white/70 text-sm">...</span> : <ArrowRight className="text-white w-4 h-4" />}
              </button>
            </div>
            {codeError && <p className="text-red-400 text-xs mt-2">{codeError}</p>}
          </div>
        </div>
      )}
    </div>
  )
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-white/10 rounded-2xl overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition">
        <span className="font-semibold text-sm text-white/90">{q}</span>
        <span className="text-white/40">{open ? '−' : '+'}</span>
      </button>
      {open && <div className="px-4 pb-4 text-sm text-white/50">{a}</div>}
    </div>
  )
}
