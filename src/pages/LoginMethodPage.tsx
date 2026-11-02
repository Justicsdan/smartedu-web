import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { School, Hash, ArrowRight, ArrowLeft, Shield } from 'lucide-react'

export default function LoginMethodPage() {
  const navigate = useNavigate()
  const [schoolCode, setSchoolCode] = useState('')

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #060B1E, #0F1F4B)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '13px', cursor: 'pointer', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ArrowLeft size={14} /> Back
        </button>

        <h1 style={{ color: 'white', fontSize: '28px', fontWeight: 'bold', textAlign: 'center', marginBottom: '8px' }}>Welcome Back</h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', textAlign: 'center', marginBottom: '32px' }}>Choose how you'd like to sign in</p>

        <button
          onClick={() => navigate('/role-selection')}
          style={{
            width: '100%', padding: '16px', marginBottom: '12px',
            background: 'linear-gradient(135deg, #42A5F5, #0D47A1)', color: 'white',
            border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '600',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px',
          }}
        >
          <School size={20} /> Continue without school code
        </button>

        <div style={{ marginTop: '20px', padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Hash size={18} style={{ color: '#FFB74D' }} />
            <span style={{ color: 'white', fontSize: '14px', fontWeight: '600' }}>With school code</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={schoolCode}
              onChange={(e) => setSchoolCode(e.target.value)}
              placeholder="Enter school code"
              style={{
                flex: 1, padding: '10px 14px', fontSize: '14px', color: 'white',
                background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '8px', outline: 'none',
              }}
            />
            <button
              onClick={() => schoolCode.trim() && navigate('/s/' + schoolCode.trim().toLowerCase())}
              disabled={!schoolCode.trim()}
              style={{
                padding: '10px 18px', background: schoolCode.trim() ? 'linear-gradient(135deg, #FFB74D, #E65100)' : '#555',
                color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px',
                fontWeight: '600', cursor: schoolCode.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              Go
            </button>
          </div>
        </div>
      </div>

      {/* Super-admin access — bottom-right shield */}
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
          color: 'white',
          borderRadius: '9999px',
          background: 'rgba(255,255,255,0.08)',
          backdropFilter: 'blur(4px)',
        }}
      >
        <Shield size={36} />
      </button>
    </div>
  )
}
