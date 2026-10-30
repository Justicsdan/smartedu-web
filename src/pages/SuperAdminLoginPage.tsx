import { ArrowLeft, Eye, EyeOff } from 'lucide-react';

import { useState } from 'react'

export default function SuperAdminLoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

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
          body: JSON.stringify({
            username,
            password,
            role: 'super_admin',
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Login failed')
      }

      localStorage.setItem('smartedu_token', data.token)
      localStorage.setItem('smartedu_user', JSON.stringify(data.user))

      window.location.href = '/dashboard/superadmin'
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-white rounded-2xl shadow-lg p-1.5 flex items-center justify-center border border-gray-200">
            <img src="/smartedu_logo.webp" alt="SmartEdu" className="w-full h-full object-contain" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-center text-[#1A237E] mb-2">Super Admin</h1>
        <p className="text-center text-gray-500 mb-6">Platform Owner Access</p>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A237E] focus:border-transparent outline-none transition"
              placeholder="Enter admin username"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A237E] focus:border-transparent outline-none transition"
                placeholder="Enter password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <Eye className="w-4 h-4 inline-block" /> : <EyeOff className="w-4 h-4 inline-block" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1A237E] text-white font-semibold py-3 rounded-lg hover:bg-[#283593] transition disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <a href="/" className="text-sm text-gray-500 hover:text-[#1A237E] transition">
            <ArrowLeft className="w-4 h-4 inline-block" /> Back to SmartEdu
          </a>
        </div>
      </div>
    </div>
  )
}
