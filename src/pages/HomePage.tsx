import { useState, useEffect, useRef, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight, BookOpen, BarChart3, Shield, ChevronDown,
  ChevronUp, MessageCircle, Calendar, Wallet, Video, Lock,
  Users, GraduationCap, Building2, Award, CheckCircle2,
  Quote, Menu, X, LayoutDashboard,
} from 'lucide-react'

const FAQ_ITEMS = [
  { q: 'Does each school get its own branding?', a: 'Yes. Every school operates independently with their own logo, colors, motto, and sub-domain. There is zero platform branding visible to your students, teachers, or parents.' },
  { q: 'Can students access results from their phone?', a: 'Yes. The student portal is fully responsive and works on any device — phone, tablet, or desktop. Results, attendance, fees, assignments, and CBT exams are all accessible 24/7.' },
  { q: 'How secure is student data?', a: 'All data is encrypted in transit and at rest. Row-Level Security (RLS) is enabled on every table, and a role-based proxy validates every query — students can only see their own data, teachers only see their assigned classes.' },
  { q: 'Does it support CBT (Computer-Based Testing)?', a: 'Yes. Teachers can create exams with multiple-choice questions, set per-question time limits, and students take exams in a timed environment with auto-submit. Results are scored instantly with per-question review.' },
  { q: 'Can the school print official report cards?', a: 'Yes. The Results page generates print-optimized PDFs with the school logo, watermark, behavioral ratings, teacher/principal comments, and grading key — all on one page.' },
  { q: 'What grading systems are supported?', a: 'Nigerian tier-based (WAEC for SSS, BECE for JSS, 5-point for Primary) and American GPA. Each tier can have its own assessment structure and grade boundaries, configurable by the school administrator.' },
]

function Reveal({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.unobserve(entry.target)
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return (
    <div
      ref={ref}
      className={`${className} transition-all duration-700 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

export default function HomePage() {
  const navigate = useNavigate()
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  const [scrolled, setScrolled] = useState(false)
  const [activeSection, setActiveSection] = useState('home')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const copyrightClickRef = useRef({ count: 0, timer: null as ReturnType<typeof setTimeout> | null })

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const sections = ['home', 'features', 'grading', 'roles', 'how-it-works', 'faq']
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) setActiveSection(e.target.id)
        })
      },
      { rootMargin: '-40% 0px -55% 0px' }
    )
    sections.forEach(id => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [])

  const handleCopyrightClick = () => {
    const ref = copyrightClickRef.current
    ref.count += 1
    if (ref.timer) clearTimeout(ref.timer)
    if (ref.count >= 3) {
      ref.count = 0
      navigate('/super-admin-login')
      return
    }
    ref.timer = setTimeout(() => { ref.count = 0 }, 600)
  }

  const toggleFaq = (i: number) => setOpenFaq(openFaq === i ? null : i)

  const navItems = [
    { id: 'features', label: 'Features' },
    { id: 'grading', label: 'Grading' },
    { id: 'roles', label: 'Portals' },
    { id: 'how-it-works', label: 'How it works' },
    { id: 'faq', label: 'FAQ' },
  ]

  return (
    <div className="min-h-screen bg-white text-slate-900 antialiased">
      {/* ── Nav ── */}
      <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/80 backdrop-blur-xl shadow-sm border-b border-slate-200/60' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <a href="#home" className="flex items-center gap-2 group">
            <div className="relative">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-emerald-400 to-blue-500 blur-md opacity-50 group-hover:opacity-75 transition" />
              <div className="relative h-12 px-2 rounded-xl bg-white shadow-md flex items-center justify-center ring-1 ring-slate-200 overflow-hidden">
                <img src="/smartedu-logo.png" alt="SmartEdu" className="h-full w-auto object-contain"
                  onError={(e) => {
                    const t = e.target as HTMLImageElement
                    t.onerror = null
                    t.src = "/favicon.png"
                    t.onerror = () => {
                      const parent = t.parentElement
                      if (parent) {
                        t.style.display = 'none'
                        parent.innerHTML = '<div class="h-full px-3 bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg">SmartEdu</div>'
                      }
                    }
                  }} />
              </div>
            </div>
          </a>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(item => (
              <a key={item.id} href={`#${item.id}`}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition ${activeSection === item.id ? 'text-slate-900 bg-slate-100/80' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'}`}>
                {item.label}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <button onClick={() => navigate('/login-method')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold shadow-sm hover:shadow-md transition-all">
              Sign in<ArrowRight size={14} strokeWidth={2.4} />
            </button>
          </div>

          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-md text-slate-700 hover:bg-slate-100">
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-slate-100 px-4 py-3 space-y-1">
            {navItems.map(item => (
              <a key={item.id} href={`#${item.id}`} onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100">
                {item.label}
              </a>
            ))}
            <button onClick={() => { setMobileMenuOpen(false); navigate('/login-method') }}
              className="w-full mt-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold">
              Sign in
            </button>
          </div>
        )}
      </header>

      {/* ── Hero ── */}
      <section id="home" className="relative pt-32 pb-24 sm:pt-40 sm:pb-32 overflow-hidden bg-slate-950">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-emerald-500/20 blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full bg-blue-500/20 blur-[120px]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(2,6,23,0.5)_100%)]" />
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }} />
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-3xl mx-auto">

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.1]">
              Run your school on a platform
              <br />
              <span className="bg-gradient-to-r from-emerald-400 via-blue-400 to-violet-400 bg-clip-text text-transparent">
                that scales with you
              </span>
            </h1>

            <p className="mt-6 text-base sm:text-lg text-white/60 leading-relaxed max-w-2xl mx-auto">
              A secure, multi-tenant platform for students, teachers, and administrators.
              Manage results, attendance, fees, CBT exams, and live classes — all under your school's brand.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button onClick={() => navigate('/login-method')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white text-slate-900 font-semibold text-sm shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all">
                Get Started<ArrowRight size={15} strokeWidth={2.4} />
              </button>
              <a href="#features"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold text-sm backdrop-blur-sm transition">
                Explore features
              </a>
            </div>
          </div>

          <Reveal delay={200} className="mt-16 sm:mt-20">
            <DashboardMockup />
          </Reveal>
        </div>
      </section>

      {/* ── Trust badges ── */}
      <section className="border-y border-slate-100 bg-white py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            {[
              { icon: Lock, label: 'Bank-grade Security' },
              { icon: Users, label: 'Multi-tenant' },
              { icon: Calendar, label: '24/7 Access' },
              { icon: Award, label: 'CBT Ready' },
              { icon: Award, label: 'No Setup Fees' },
            ].map((b) => {
              const Icon = b.icon
              return (
                <div key={b.label} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600">
                  <Icon size={14} className="text-emerald-600" strokeWidth={2.2} />
                  {b.label}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Features (bento grid) ── */}
      <section id="features" className="py-24 sm:py-32 bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">Everything your school needs</h2>
            <p className="mt-3 text-base text-slate-600">One platform. Nine core modules. Zero setup fees.</p>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5">
            <Reveal className="md:col-span-2 md:row-span-2">
              <div className="group h-full bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-8 text-white relative overflow-hidden hover:shadow-2xl transition-all duration-300">
                <div className="absolute -right-8 -top-8 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition" />
                <div className="relative">
                  <div className="w-14 h-14 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-5">
                    <Shield size={26} className="text-emerald-400" strokeWidth={2.2} />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">CBT Exams, built in</h3>
                  <p className="text-white/60 text-sm leading-relaxed mb-6 max-w-md">
                    Computer-Based Testing with timed questions, question navigator, auto-submit, and instant scoring. No third-party tools, no extra subscriptions.
                  </p>
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7', 'Q8', 'Q9', 'Q10'].map((q, i) => (
                      <span key={q} className={`px-2 py-1 rounded text-[10px] font-bold ${i < 5 ? 'bg-emerald-500/20 text-emerald-300' : i < 8 ? 'bg-amber-500/20 text-amber-300' : 'bg-white/5 text-white/40'}`}>
                        {q}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-white/40">Time remaining</span>
                    <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full w-2/3 bg-gradient-to-r from-emerald-400 to-blue-400 rounded-full" />
                    </div>
                    <span className="font-mono text-emerald-300">12:34</span>
                  </div>
                </div>
              </div>
            </Reveal>

            {[
              { icon: BookOpen, color: '#10b981', bg: '#ecfdf5', title: 'Results & Grading', desc: 'WAEC, BECE, Primary, American GPA. Auto-compute positions, print-ready report cards.' },
              { icon: BarChart3, color: '#3b82f6', bg: '#eff6ff', title: 'Analytics', desc: 'Performance charts per subject, multi-term comparison, attendance trends.' },
              { icon: Calendar, color: '#f59e0b', bg: '#fffbeb', title: 'Attendance', desc: '4 status types, monthly breakdowns, consecutive-absence warnings.' },
              { icon: Wallet, color: '#7c3aed', bg: '#f5f3ff', title: 'Fees', desc: 'Custom fee types. Track partial payments, generate receipts.' },
              { icon: Video, color: '#ef4444', bg: '#fef2f2', title: 'Live Classes', desc: 'Built-in video conferencing. Schedule, target audiences, one-click join.' },
              { icon: MessageCircle, color: '#10b981', bg: '#ecfdf5', title: 'Announcements', desc: 'School-wide or class-targeted. Pinning, expiry, author attribution.' },
            ].map((f, i) => {
              const Icon = f.icon
              return (
                <Reveal key={f.title} delay={i * 50}>
                  <div className="group h-full bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-xl hover:border-slate-300 hover:-translate-y-1 transition-all duration-300">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                      style={{ backgroundColor: f.bg, color: f.color }}>
                      <Icon size={20} strokeWidth={2.2} />
                    </div>
                    <h3 className="text-base font-bold text-slate-900">{f.title}</h3>
                    <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">{f.desc}</p>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Grading Showcase ── */}
      <section id="grading" className="py-24 sm:py-32">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">Grading that fits your system</h2>
            <p className="mt-3 text-base text-slate-600">Nigerian tier-based and American GPA standards, configurable per school.</p>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { tier: 'SSS', label: 'Senior Secondary', system: 'WAEC', grades: 'A1 — F9', color: '#10b981', bg: '#ecfdf5', distribution: [{ grade: 'A1', pct: 75 }, { grade: 'B2', pct: 65 }, { grade: 'C4', pct: 50 }, { grade: 'F9', pct: 5 }] },
              { tier: 'JSS', label: 'Junior Secondary', system: 'BECE', grades: 'A · B · C · P · F', color: '#3b82f6', bg: '#eff6ff', distribution: [{ grade: 'A', pct: 80 }, { grade: 'B', pct: 60 }, { grade: 'C', pct: 45 }, { grade: 'F', pct: 10 }] },
              { tier: 'PRI', label: 'Primary School', system: '5-Point', grades: '5 · 4 · 3 · 2 · 1', color: '#f59e0b', bg: '#fffbeb', distribution: [{ grade: '5', pct: 90 }, { grade: '4', pct: 70 }, { grade: '3', pct: 50 }, { grade: '1', pct: 15 }] },
              { tier: 'US', label: 'American GPA', system: 'GPA 4.0', grades: 'A through F', color: '#7c3aed', bg: '#f5f3ff', distribution: [{ grade: 'A', pct: 90 }, { grade: 'B', pct: 80 }, { grade: 'C', pct: 70 }, { grade: 'F', pct: 60 }] },
            ].map((g, i) => (
              <Reveal key={g.tier} delay={i * 80}>
                <div className="group bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg hover:border-slate-300 transition-all">
                  <div className="flex items-start gap-4 mb-5">
                    <div className="flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center font-bold text-sm transition-transform group-hover:scale-110"
                      style={{ backgroundColor: g.bg, color: g.color }}>
                      {g.tier}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <h3 className="text-lg font-bold text-slate-900">{g.label}</h3>
                        <span className="text-xs font-semibold text-slate-500">· {g.system}</span>
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500">Grades: {g.grades}</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {g.distribution.map(d => (
                      <div key={d.grade} className="flex items-center gap-3">
                        <span className="text-xs font-mono text-slate-600 w-6">{d.grade}</span>
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700 group-hover:opacity-80"
                            style={{ width: `${d.pct}%`, backgroundColor: g.color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Roles ── */}
      <section id="roles" className="py-24 sm:py-32 bg-slate-50/50 border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">Three portals, one platform</h2>
            <p className="mt-3 text-base text-slate-600">Each role gets a tailored experience.</p>
          </Reveal>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {[
              { icon: GraduationCap, color: '#10b981', bg: '#ecfdf5', title: 'Student', points: ['View results & behavioral ratings','Check attendance','Pay fees, track history','Take CBT exams','Submit assignments','Join live classes'] },
              { icon: Users, color: '#3b82f6', bg: '#eff6ff', title: 'Teacher', points: ['Enter scores per subject/class','Mark attendance','Post & grade assignments','Publish results as form master','Create CBT exams','Start live classes'] },
              { icon: Building2, color: '#7c3aed', bg: '#f5f3ff', title: 'School Admin', points: ['Manage students, teachers, classes','Configure grading systems','Post announcements','Monitor live classes','Generate reports (CSV/PDF)','AI chatbot for help'] },
            ].map((r, i) => {
              const Icon = r.icon
              return (
                <Reveal key={r.title} delay={i * 100}>
                  <div className="group h-full bg-white rounded-2xl border border-slate-200 p-7 hover:shadow-2xl hover:border-slate-300 hover:-translate-y-1 transition-all duration-300">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 transition-transform group-hover:scale-110"
                      style={{ backgroundColor: r.bg, color: r.color }}>
                      <Icon size={24} strokeWidth={2.2} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">{r.title}</h3>
                    <ul className="mt-4 space-y-2.5">
                      {r.points.map((p) => (
                        <li key={p} className="flex items-start gap-2 text-sm text-slate-700">
                          <CheckCircle2 size={15} className="flex-shrink-0 mt-0.5" strokeWidth={2.4} style={{ color: r.color }} />
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="py-24 sm:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">From setup to first report card</h2>
            <p className="mt-3 text-base text-slate-600">Four steps. Most schools are live in a day.</p>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
            <div className="hidden md:block absolute top-12 left-[12%] right-[12%] h-px bg-gradient-to-r from-emerald-200 via-blue-200 to-violet-200" />

            {[
              { step: '01', title: 'Create your school', desc: 'Sign up with your school name, logo, and brand colors. Configure your grading system.', icon: Building2, color: '#10b981' },
              { step: '02', title: 'Add students & teachers', desc: 'Bulk-import via CSV or add one-by-one. Students get admission numbers and PINs.', icon: Users, color: '#3b82f6' },
              { step: '03', title: 'Enter scores', desc: 'Teachers enter CA1, CA2, mid-term, exam scores. Positions and grades are auto-computed.', icon: BookOpen, color: '#f59e0b' },
              { step: '04', title: 'Publish & share', desc: 'Hit publish — students see results immediately. Print PDF report cards for parents.', icon: Award, color: '#7c3aed' },
            ].map((s, i) => {
              const Icon = s.icon
              return (
                <Reveal key={s.step} delay={i * 100} className="relative">
                  <div className="relative bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg hover:border-slate-300 transition-all">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${s.color}15`, color: s.color }}>
                        <Icon size={18} strokeWidth={2.2} />
                      </div>
                      <span className="text-2xl font-bold text-slate-200">{s.step}</span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 mb-1.5">{s.title}</h3>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{s.desc}</p>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>
      {/* ── FAQ ── */}
      <section id="faq" className="py-24 sm:py-32">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">Frequently asked questions</h2>
          </Reveal>
          <div className="space-y-3">
            {FAQ_ITEMS.map((item, i) => (
              <Reveal key={i} delay={i * 40}>
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-slate-300 transition">
                  <button onClick={() => toggleFaq(i)}
                    className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-slate-50/50 transition">
                    <span className="text-sm sm:text-base font-bold text-slate-900">{item.q}</span>
                    {openFaq === i ? <ChevronUp size={16} className="flex-shrink-0 text-slate-700" strokeWidth={2.4} />
                      : <ChevronDown size={16} className="flex-shrink-0 text-slate-700" strokeWidth={2.4} />}
                  </button>
                  {openFaq === i && (
                    <div className="px-5 pb-4 text-sm text-slate-600 leading-relaxed">{item.a}</div>
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 sm:py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-violet-900 to-slate-900 px-6 py-12 sm:px-12 sm:py-16 text-center text-white">
              <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-96 h-96 bg-violet-500/30 rounded-full blur-3xl" />
              <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl" />

              <div className="relative">
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Ready to modernize your school?</h2>
                <p className="mt-3 text-sm sm:text-base text-white/70 max-w-xl mx-auto">
                  Sign in to access your portal, or contact us to set up your school.
                </p>
                <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button onClick={() => navigate('/login-method')}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white text-slate-900 font-semibold text-sm shadow-lg hover:bg-slate-100 hover:scale-[1.02] transition-all">
                    Sign in<ArrowRight size={15} strokeWidth={2.4} />
                  </button>
                  <a href="https://wa.me/2347080304822" target="_blank" rel="noopener noreferrer"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-sm backdrop-blur-sm transition">
                    <MessageCircle size={15} strokeWidth={2.4} />Talk to us
                  </a>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-slate-950 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
            <div className="col-span-2 md:col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="relative">
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-emerald-400 to-blue-500 blur-md opacity-50" />
                  <div className="relative w-11 h-11 rounded-xl bg-white shadow-md flex items-center justify-center ring-1 ring-slate-200 overflow-hidden">
                    <img src="/smartedu-logo.png" alt="SmartEdu" className="w-full h-full object-contain p-0.5"
                      onError={(e) => {
                        const t = e.target as HTMLImageElement
                        t.onerror = null
                        t.src = "/favicon.png"
                        t.onerror = () => {
                          const parent = t.parentElement
                          if (parent) {
                            t.style.display = 'none'
                            parent.innerHTML = '<div class="w-full h-full bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg">S</div>'
                          }
                        }
                      }} />
                  </div>
                </div>
                <span className="font-bold text-xl">SmartEdu</span>
              </div>
              <p className="text-sm text-white/50 leading-relaxed max-w-xs">
                A secure, multi-tenant school management platform built for Nigerian and international schools.
              </p>
              <div className="mt-5 flex items-center gap-3">
                <a href="https://wa.me/2347080304822" target="_blank" rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-[#25D366] to-[#128C7E] flex items-center justify-center text-white shadow-lg shadow-emerald-500/30 hover:scale-110 transition-transform">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.149-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                </a>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-4">Product</h4>
              <ul className="space-y-2.5">
                <li><a href="#features" className="text-sm text-white/70 hover:text-white transition">Features</a></li>
                <li><a href="#grading" className="text-sm text-white/70 hover:text-white transition">Grading</a></li>
                <li><a href="#roles" className="text-sm text-white/70 hover:text-white transition">Portals</a></li>
                <li><a href="#how-it-works" className="text-sm text-white/70 hover:text-white transition">How it works</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-4">Company</h4>
              <ul className="space-y-2.5">
                <li><a href="#" className="text-sm text-white/70 hover:text-white transition">About</a></li>
                <li><a href="#" className="text-sm text-white/70 hover:text-white transition">Contact</a></li>
                <li><a href="#" className="text-sm text-white/70 hover:text-white transition">Blog</a></li>
                <li><a href="#" className="text-sm text-white/70 hover:text-white transition">Careers</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-4">Legal</h4>
              <ul className="space-y-2.5">
                <li><a href="#" className="text-sm text-white/70 hover:text-white transition">Privacy</a></li>
                <li><a href="#" className="text-sm text-white/70 hover:text-white transition">Terms</a></li>
                <li><a href="#" className="text-sm text-white/70 hover:text-white transition">Security</a></li>
                <li><a href="#" className="text-sm text-white/70 hover:text-white transition">GDPR</a></li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div
              onClick={handleCopyrightClick}
              className="text-xs text-white/40 select-none cursor-default"
              style={{ userSelect: 'none' }}
            >
              © {new Date().getFullYear()} SmartEdu. School Management System. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

function DashboardMockup() {
  return (
    <div className="relative max-w-5xl mx-auto">
      <div className="absolute -inset-x-8 -inset-y-4 bg-gradient-to-r from-emerald-500/20 via-blue-500/20 to-violet-500/20 blur-3xl rounded-3xl" />

      <div className="relative bg-slate-900 rounded-2xl shadow-2xl ring-1 ring-white/10 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 bg-slate-800/80 border-b border-white/5">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
          </div>
          <div className="flex-1 mx-3">
            <div className="bg-slate-900/60 rounded-md px-3 py-1 text-[10px] text-white/40 font-mono text-center">
              app.smartedu.ng/dashboard/schooladmin
            </div>
          </div>
        </div>

        <div className="flex min-h-[360px]">
          <div className="w-14 sm:w-48 bg-slate-950/80 border-r border-white/5 p-3 flex flex-col gap-1">
            <div className="hidden sm:flex items-center gap-2 px-2 py-2 mb-3">
              <div className="w-7 h-7 rounded-md bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white font-bold text-xs">S</div>
              <span className="text-xs font-bold text-white truncate">SmartEdu</span>
            </div>
            {[
              { icon: LayoutDashboard, label: 'Dashboard', active: true },
              { icon: Users, label: 'Students', active: false },
              { icon: GraduationCap, label: 'Teachers', active: false },
              { icon: BookOpen, label: 'Classes', active: false },
              { icon: BarChart3, label: 'Scores', active: false },
              { icon: Shield, label: 'CBT', active: false },
            ].map((item, i) => {
              const Icon = item.icon
              return (
                <div key={i} className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-xs ${item.active ? 'bg-white/10 text-white' : 'text-white/40'}`}>
                  <Icon size={14} strokeWidth={2.2} />
                  <span className="hidden sm:block truncate">{item.label}</span>
                </div>
              )
            })}
          </div>

          <div className="flex-1 p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">School Admin</div>
                <div className="text-sm font-bold text-white">Dashboard</div>
              </div>
              <div className="w-7 h-7 rounded-full bg-violet-500/20 border border-violet-400/30" />
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
              {[
                { label: 'Students', value: '847', icon: Users, color: '#10b981' },
                { label: 'Teachers', value: '42', icon: GraduationCap, color: '#3b82f6' },
                { label: 'Classes', value: '24', icon: BookOpen, color: '#f59e0b' },
              ].map((s, i) => {
                const Icon = s.icon
                return (
                  <div key={i} className="bg-slate-800/50 rounded-lg p-2.5 sm:p-3 border border-white/5">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Icon size={10} strokeWidth={2.2} style={{ color: s.color }} />
                      <span className="text-[9px] text-white/50 uppercase tracking-wider font-semibold hidden sm:inline">{s.label}</span>
                    </div>
                    <div className="text-base sm:text-lg font-bold text-white">{s.value}</div>
                    <div className="text-[9px] text-white/40 sm:hidden">{s.label}</div>
                  </div>
                )
              })}
            </div>

            <div className="bg-slate-800/50 rounded-lg p-3 sm:p-4 border border-white/5 mb-3">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-semibold text-white">Performance Trend</div>
                <div className="text-[10px] text-white/40">Last 6 terms</div>
              </div>
              <div className="flex items-end justify-between gap-1.5 h-20">
                {[60, 75, 65, 82, 78, 88].map((h, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full rounded-t bg-gradient-to-t from-emerald-500/40 to-emerald-400 transition-all hover:from-emerald-500/60 hover:to-emerald-300"
                      style={{ height: `${h}%` }} />
                    <div className="text-[8px] text-white/30 font-mono">T{i + 1}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-3 border border-white/5">
              <div className="text-xs font-semibold text-white mb-2">Recent Students</div>
              <div className="space-y-1.5">
                {[
                  { name: 'Adeleke Mary', cls: 'JSS 2A', avg: 'A' },
                  { name: 'Emeka Joseph', cls: 'SSS 3B', avg: 'B2' },
                  { name: 'Fatima Ibrahim', cls: 'PRI 5', avg: 'A' },
                ].map((r, i) => (
                  <div key={i} className="flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-white/60 text-[8px] font-bold">
                        {r.name.charAt(0)}
                      </div>
                      <span className="text-white/70">{r.name}</span>
                      <span className="text-white/30 hidden sm:inline">· {r.cls}</span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-bold">{r.avg}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
