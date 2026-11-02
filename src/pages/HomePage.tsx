import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  School, ArrowRight, BookOpen, BarChart3, Shield, Clock, ChevronDown,
  ChevronUp, MessageCircle, FileText, Calendar, Wallet, Video, Lock,
  Users, GraduationCap, Building2, Award, CheckCircle2, Sparkles,
} from 'lucide-react'

const FAQ_ITEMS = [
  { q: 'Does each school get its own branding?', a: 'Yes. Every school operates independently with their own logo, colors, motto, and sub-domain. There is zero platform branding visible to your students, teachers, or parents.' },
  { q: 'Can students access results from their phone?', a: 'Yes. The student portal is fully responsive and works on any device — phone, tablet, or desktop. Results, attendance, fees, assignments, and CBT exams are all accessible 24/7.' },
  { q: 'How secure is student data?', a: 'All data is encrypted in transit and at rest. Row-Level Security (RLS) is enabled on every table, and a role-based proxy validates every query — students can only see their own data, teachers only see their assigned classes.' },
  { q: 'Does it support CBT (Computer-Based Testing)?', a: 'Yes. Teachers can create exams with multiple-choice questions, set per-question time limits, and students take exams in a timed environment with auto-submit. Results are scored instantly with per-question review.' },
  { q: 'Can the school print official report cards?', a: 'Yes. The Results page generates print-optimized PDFs with the school logo, watermark, behavioral ratings, teacher/principal comments, and grading key — all on one page.' },
  { q: 'What grading systems are supported?', a: 'Nigerian tier-based (WAEC for SSS, BECE for JSS, 5-point for Primary) and American GPA. Each tier can have its own assessment structure and grade boundaries, configurable by the school administrator.' },
]

export default function HomePage() {
  const navigate = useNavigate()
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const toggleFaq = (i: number) => setOpenFaq(openFaq === i ? null : i)

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* ── Top nav ─────────────────────────────────────────────── */}
      <header className={`fixed top-0 inset-x-0 z-50 transition-all ${scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-200' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-emerald-400 to-blue-500 blur-md opacity-50" />
              <div className="relative w-9 h-9 rounded-xl bg-white shadow-md flex items-center justify-center ring-1 ring-slate-200 overflow-hidden">
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
            <span className="font-bold text-base tracking-tight text-slate-900">SmartEdu</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-slate-900 transition">Features</a>
            <a href="#grading" className="hover:text-slate-900 transition">Grading</a>
            <a href="#how-it-works" className="hover:text-slate-900 transition">How it works</a>
            <a href="#faq" className="hover:text-slate-900 transition">FAQ</a>
          </nav>
          <button onClick={() => navigate('/login-method')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold shadow-sm transition">
            Sign in<ArrowRight size={14} strokeWidth={2.4} />
          </button>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28 overflow-hidden">
        <div className="absolute inset-0 -z-10"
          style={{
            background: `radial-gradient(circle at 20% 30%, rgba(16, 185, 129, 0.12) 0%, transparent 50%),
              radial-gradient(circle at 80% 70%, rgba(59, 130, 246, 0.12) 0%, transparent 50%),
              linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)`,
          }}
        />

        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 relative text-center">
          {/* SmartEdu logo with glow — bobbing animation like Flutter original */}
          <div className="inline-flex items-center justify-center mb-8">
            <div className="relative animate-bounce" style={{ animationDuration: '3s', animationTimingFunction: 'ease-in-out' }}>
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-emerald-400 via-blue-500 to-violet-500 blur-2xl opacity-60" />
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-white shadow-2xl flex items-center justify-center ring-1 ring-slate-200 overflow-hidden">
                <img src="/smartedu-logo.png" alt="SmartEdu" className="w-full h-full object-contain p-1.5"
                  onError={(e) => {
                    const t = e.target as HTMLImageElement
                    t.onerror = null
                    t.src = "/favicon.png"
                    t.onerror = () => {
                      const parent = t.parentElement
                      if (parent) {
                        t.style.display = 'none'
                        parent.innerHTML = '<div class="w-full h-full bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center text-white font-bold text-5xl">S</div>'
                      }
                    }
                  }} />
              </div>
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 leading-[1.15]">
            School Management System
          </h1>

          <p className="mt-5 text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
            A secure, multi-tenant platform for students, teachers, and administrators.
            Manage results, attendance, fees, CBT exams, and live classes — all under your school's brand.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button onClick={() => navigate('/login-method')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm shadow-md transition">
              Get Started<ArrowRight size={15} strokeWidth={2.4} />
            </button>
            <a href="#features"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-semibold text-sm shadow-sm transition">
              Learn More
            </a>
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────── */}
      <section id="features" className="py-20 sm:py-28 bg-slate-50/50 border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Features</h2>
            <p className="mt-3 text-sm sm:text-base text-slate-600">Everything your school needs, in one secure platform.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: BookOpen, color: '#10b981', bg: '#ecfdf5', title: 'Results & Grading', desc: 'Custom grading systems per tier (WAEC, BECE, Primary, American GPA). Auto-compute positions, print-ready report cards.' },
              { icon: BarChart3, color: '#3b82f6', bg: '#eff6ff', title: 'Analytics', desc: 'Performance charts per subject, multi-term comparison, attendance trends — visualized in real-time.' },
              { icon: Calendar, color: '#f59e0b', bg: '#fffbeb', title: 'Attendance', desc: 'Daily attendance with 4 status types, monthly breakdowns, consecutive-absence warnings.' },
              { icon: Wallet, color: '#7c3aed', bg: '#f5f3ff', title: 'Fees', desc: 'Custom fee types (termly, sessionly, one-time). Track partial payments, generate receipts.' },
              { icon: Shield, color: '#0891b2', bg: '#ecfeff', title: 'CBT Exams', desc: 'Computer-Based Testing with timed questions, question navigator, auto-submit, instant scoring.' },
              { icon: Video, color: '#ef4444', bg: '#fef2f2', title: 'Live Classes', desc: 'Built-in video conferencing. Schedule classes, target audiences (class/students/all), one-click join.' },
              { icon: FileText, color: '#6366f1', bg: '#eef2ff', title: 'Assignments', desc: 'Teachers post assignments, students submit answers, teachers leave feedback and scores.' },
              { icon: MessageCircle, color: '#10b981', bg: '#ecfdf5', title: 'Announcements', desc: 'School-wide or class-targeted announcements with pinning, expiry, and author attribution.' },
              { icon: Lock, color: '#475569', bg: '#f1f5f9', title: 'Security', desc: 'Row-Level Security on every table. Role-based query proxy. JWT-validated access.' },
            ].map((f) => {
              const Icon = f.icon
              return (
                <div key={f.title} className="group bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-xl hover:border-slate-300 hover:-translate-y-0.5 transition-all duration-200">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                    style={{ backgroundColor: f.bg, color: f.color }}>
                    <Icon size={22} strokeWidth={2.2} />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">{f.title}</h3>
                  <p className="mt-1.5 text-sm text-slate-700 leading-relaxed">{f.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Grading Showcase ────────────────────────────────────── */}
      <section id="grading" className="py-20 sm:py-28">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Grading Systems</h2>
            <p className="mt-3 text-sm sm:text-base text-slate-600">Supports Nigerian tier-based and American GPA standards, configurable per school.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { tier: 'SSS', label: 'Senior Secondary', system: 'WAEC', grades: 'A1 — F9', color: '#10b981', bg: '#ecfdf5', structure: 'CA1 (10) + CA2 (10) + Assignment (10) + Mid-term (20) + Exam (50) = 100' },
              { tier: 'JSS', label: 'Junior Secondary', system: 'BECE', grades: 'A, B, C, P, F', color: '#3b82f6', bg: '#eff6ff', structure: 'CA (40) + Exam (60) = 100' },
              { tier: 'PRIMARY', label: 'Primary School', system: '5-Point', grades: '5, 4, 3, 2, 1', color: '#f59e0b', bg: '#fffbeb', structure: 'CA1 (20) + CA2 (20) + Exam (60) = 100' },
              { tier: 'AMERICAN', label: 'American GPA', system: 'GPA 4.0', grades: 'A through F', color: '#7c3aed', bg: '#f5f3ff', structure: 'Assignments (15) + Quizzes (15) + Mid-term (20) + Participation (10) + Final (40) = 100' },
            ].map((g) => (
              <div key={g.tier} className="group bg-white rounded-2xl border border-slate-200 p-5 flex items-start gap-4 hover:shadow-lg hover:border-slate-300 transition-all duration-200">
                <div className="flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center font-bold text-sm transition-transform group-hover:scale-110"
                  style={{ backgroundColor: g.bg, color: g.color }}>
                  {g.tier}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-slate-900">{g.label}</h3>
                    <span className="text-xs font-semibold text-slate-600">· {g.system}</span>
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-800">Grades: {g.grades}</div>
                  <div className="mt-1.5 text-xs text-slate-700 leading-relaxed">{g.structure}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Roles ───────────────────────────────────────────────── */}
      <section id="roles" className="py-20 sm:py-28 bg-slate-50/50 border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Three Portals</h2>
            <p className="mt-3 text-sm sm:text-base text-slate-600">Each role gets a tailored experience.</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {[
              { icon: GraduationCap, color: '#10b981', bg: '#ecfdf5', title: 'Student', points: ['View results & behavioral ratings','Check attendance','Pay fees, track history','Take CBT exams','Submit assignments','Join live classes'] },
              { icon: Users, color: '#3b82f6', bg: '#eff6ff', title: 'Teacher', points: ['Enter scores per subject/class','Mark attendance','Post & grade assignments','Publish results as form master','Create CBT exams','Start live classes'] },
              { icon: Building2, color: '#7c3aed', bg: '#f5f3ff', title: 'School Admin', points: ['Manage students, teachers, classes','Configure grading systems','Post announcements','Monitor live classes','Generate reports (CSV/PDF)','AI chatbot for help'] },
            ].map((r) => {
              const Icon = r.icon
              return (
                <div key={r.title} className="group bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-xl hover:border-slate-300 hover:-translate-y-0.5 transition-all duration-200">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
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
              )
            })}
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────── */}
      <section id="how-it-works" className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">How it works</h2>
            <p className="mt-3 text-sm sm:text-base text-slate-600">From setup to first report card.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { step: '01', title: 'Create your school', desc: 'Sign up with your school name, logo, and brand colors. Configure your grading system.' },
              { step: '02', title: 'Add students & teachers', desc: 'Bulk-import via CSV or add one-by-one. Students get admission numbers and PINs.' },
              { step: '03', title: 'Enter scores', desc: 'Teachers enter CA1, CA2, mid-term, exam scores. Positions and grades are auto-computed.' },
              { step: '04', title: 'Publish & share', desc: 'Hit publish — students see results immediately. Print PDF report cards for parents.' },
            ].map((s) => (
              <div key={s.step} className="relative">
                <div className="text-4xl font-bold text-slate-200">{s.step}</div>
                <h3 className="mt-2 text-sm font-bold text-slate-900">{s.title}</h3>
                <p className="mt-1 text-xs sm:text-sm text-slate-600 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust bar (badges, not numbers) ─────────────────────── */}
      <section className="border-y border-slate-100 bg-slate-50/50 py-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
            {[
              { icon: Lock, label: 'Bank-grade Security' },
              { icon: Users, label: 'Multi-tenant' },
              { icon: Clock, label: '24/7 Access' },
              { icon: Award, label: 'CBT Ready' },
              { icon: Sparkles, label: 'No Setup Fees' },
            ].map((b) => {
              const Icon = b.icon
              return (
                <div key={b.label} className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600">
                  <Icon size={14} className="text-emerald-600" strokeWidth={2.2} />
                  {b.label}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────── */}
      <section id="faq" className="py-20 sm:py-28">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-3">
            {FAQ_ITEMS.map((item, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <button onClick={() => toggleFaq(i)}
                  className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-slate-50 transition">
                  <span className="text-sm sm:text-base font-bold text-slate-900">{item.q}</span>
                  {openFaq === i ? <ChevronUp size={16} className="flex-shrink-0 text-slate-700" strokeWidth={2.4} />
                    : <ChevronDown size={16} className="flex-shrink-0 text-slate-700" strokeWidth={2.4} />}
                </button>
                {openFaq === i && (<div className="px-5 pb-4 text-sm text-slate-600 leading-relaxed">{item.a}</div>)}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────── */}
      <section className="py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-slate-900 px-6 py-10 sm:px-12 sm:py-12 text-center text-white">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Ready to modernize your school?</h2>
            <p className="mt-3 text-sm text-white/80 max-w-xl mx-auto">Sign in to access your portal, or contact us to set up your school.</p>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button onClick={() => navigate('/login-method')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white text-slate-900 font-semibold text-sm shadow-lg hover:bg-slate-100 transition">
                Sign in<ArrowRight size={15} strokeWidth={2.4} />
              </button>
              <a href="https://wa.me/2348000000000" target="_blank" rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-sm transition">
                <MessageCircle size={15} strokeWidth={2.4} />Contact us
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-emerald-400 to-blue-500 blur-md opacity-50" />
                <div className="relative w-9 h-9 rounded-xl bg-white shadow-md flex items-center justify-center ring-1 ring-slate-200 overflow-hidden">
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
              <span className="font-bold text-base">SmartEdu</span>
            </div>
            <a href="https://wa.me/2348000000000" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white transition">
              <MessageCircle size={16} strokeWidth={2.2} />
              Chat on WhatsApp
            </a>
          </div>
          <div className="mt-6 pt-6 border-t border-white/10 text-center text-xs text-white/50">
            © {new Date().getFullYear()} SmartEdu. School Management System. All rights reserved.
          </div>
        </div>
      </footer>

      {/* Super-admin access — bottom-right shield, low opacity */}
      <button
        type="button"
        onClick={() => navigate('/super-admin-login')}
        aria-label="Super admin login"
        style={{
          position: 'fixed',
          bottom: '12px',
          right: '12px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          opacity: 0.55,
          zIndex: 50,
          padding: '10px',
          color: '#0f172a',
          borderRadius: '9999px',
          background: 'rgba(255,255,255,0.7)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        }}
      >
        <Shield size={36} />
      </button>
    </div>
  )
}
