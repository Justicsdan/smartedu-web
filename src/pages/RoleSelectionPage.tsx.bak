import { ArrowLeft, ArrowRight, GraduationCap, Settings } from 'lucide-react';

import { useNavigate } from 'react-router-dom'

export default function RoleSelectionPage() {
  const navigate = useNavigate()

  const roles = [
    { icon: <GraduationCap className="w-6 h-6" />, title: 'Student', subtitle: 'View results & attendance', gradient: 'from-blue-500 to-blue-900', glow: '#42A5F5', route: 'Student' },
    { icon: <GraduationCap className="w-6 h-6" />, title: 'Teacher', subtitle: 'Scores, attendance & more', gradient: 'from-green-500 to-green-900', glow: '#66BB6A', route: 'Teacher' },
    { icon: <Settings className="w-6 h-6" />, title: 'School Admin', subtitle: 'Full school management', gradient: 'from-orange-500 to-orange-900', glow: '#FFB74D', route: 'School Admin' },
  ]

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-gradient-to-br from-[#060B1E] via-[#0B1633] to-[#162560] px-4">
      <div className="fixed top-[-100px] right-[-80px] w-[300px] h-[300px] rounded-full bg-blue-600/20 blur-3xl" />
      <div className="fixed bottom-[-120px] left-[-100px] w-[350px] h-[350px] rounded-full bg-[#1A237E]/25 blur-3xl" />

      <div className="relative max-w-lg w-full">
        {/* Back button */}
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-white/60 mb-8 hover:text-white transition">
          <ArrowLeft className="w-4 h-4 inline-block" /> <span className="text-sm">Back</span>
        </button>

        <h1 className="text-3xl font-black text-center text-white mb-2">Sign In As</h1>
        <p className="text-center text-white/40 text-sm mb-12">Choose your role to get started</p>

        <div className="space-y-3.5">
          {roles.map((r, i) => (
            <button
              key={i}
              onClick={() => navigate('/login', { state: { role: r.route } })}
              className="w-full flex items-center gap-4 p-5 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-white/20 transition group"
            >
              <div className={`w-14 h-14 bg-gradient-to-br ${r.gradient} rounded-2xl flex items-center justify-center text-2xl shadow-lg`}>
                {r.icon}
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-bold text-lg text-white">{r.title}</h3>
                <p className="text-xs text-white/40 mt-1">{r.subtitle}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold" style={{ color: r.glow }}>Get Started</span>
                <ArrowRight className="text-white/30 group-hover:text-white/60 transition w-4 h-4" />
              </div>
            </button>
          ))}
        </div>

        <p className="text-center text-white/20 text-xs mt-12">© 2026 SmartEdu. All rights reserved.</p>
      </div>
    </div>
  )
}
