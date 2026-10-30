import { ArrowLeft } from 'lucide-react';

import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const initialRole = (location.state as any)?.role || 'Student'
  
  const [role, setRole] = useState(initialRole)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const response = await fetch(
        'https://tcjsmkhmfjigutfhjtem.supabase.co/functions/v1/auth',
        {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'apikey': 'sb_publishable_zWDvjhEldcV8eutnlRypGA_LGpOUhkg',
            'Authorization': 'Bearer sb_publishable_zWDvjhEldcV8eutnlRypGA_LGpOUhkg',
          },
          body: JSON.stringify({ username, password, role: role.toLowerCase().replace(' ', '_') }),
        }
      )
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Login failed')
      localStorage.setItem('smartedu_token', data.token)
      localStorage.setItem('smartedu_user', JSON.stringify(data.user))
      const dashMap: Record<string, string> = {
        school_admin: '/dashboard/schooladmin',
        teacher: '/dashboard/teacher',
        student: '/dashboard/student',
      }
      window.location.href = dashMap[role.toLowerCase().replace(' ', '_')] || '/dashboard'
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const roleColors: Record<string, string> = {
    Student: '#2E7D32',
    Teacher: '#0D47A1',
    'School Admin': '#1A237E',
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#0F172A] via-[#1A237E] to-[#162560] px-4">
      <button onClick={() => navigate('/role-selection')} className="absolute top-6 left-6 flex items-center gap-2 text-white/60 hover:text-white transition">
        <ArrowLeft className="w-4 h-4 inline-block" /> <span className="text-sm">Back</span>
      </button>

      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-white rounded-2xl shadow-lg p-1.5 flex items-center justify-center border border-gray-200">
            <img src="/smartedu_logo.webp" alt="SmartEdu" className="w-full h-full object-contain" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-center mb-2" style={{ color: roleColors[role] }}>SmartEdu</h1>
        <p className="text-center text-gray-500 mb-6 text-sm">{role} Portal</p>

        {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select value={role} onChange={e => setRole(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A237E] focus:border-transparent outline-none transition">
              <option>School Admin</option>
              <option>Teacher</option>
              <option>Student</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A237E] focus:border-transparent outline-none transition" placeholder="Enter your username" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A237E] focus:border-transparent outline-none transition" placeholder="Enter your password" required />
          </div>
          <button type="submit" disabled={loading} className="w-full text-white font-semibold py-3 rounded-lg transition disabled:opacity-50" style={{ backgroundColor: roleColors[role] }}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
