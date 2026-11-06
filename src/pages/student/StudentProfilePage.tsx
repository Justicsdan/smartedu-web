import { useState, useEffect, useCallback } from 'react'
import { dbProxy } from '../../lib/dbProxy'
import { useAuth } from '../../contexts/AuthContext'
import {
  User as UserIcon,
  Mail,
  Phone,
  Calendar,
  GraduationCap,
  Briefcase,
  Lock,
  LogOut,
  School,
  Users,
  MapPin,
  Trophy,
  Activity,
  Clock,
  CheckCircle2,
  XCircle,
  Shield,
  Loader2,
  Camera,
  X,
  AlertCircle,
} from 'lucide-react'

// ───────────────────────────────────────────────────────────────────
// Helpers — robust field extraction with fallbacks
// ───────────────────────────────────────────────────────────────────

function pickString(record: any, ...keys: string[]): string {
  for (const k of keys) {
    const v = record?.[k]
    if (v !== null && v !== undefined && String(v).trim() !== '') {
      return String(v).trim()
    }
  }
  return ''
}

function fullName(s: any): string {
  const first = pickString(s, 'first_name', 'firstName', 'name')
  const last = pickString(s, 'last_name', 'lastName')
  const middle = pickString(s, 'middle_name', 'middleName')
  const parts = [first, middle, last].filter(Boolean)
  if (parts.length) return parts.join(' ')
  return ''
}

function admissionNo(s: any): string {
  return pickString(s, 'admission_no', 'admissionNo', 'adm_no', 'admin_no', 'admission_number')
}

function formatDate(value: any): string {
  if (!value) return ''
  const d = new Date(value)
  if (isNaN(d.getTime())) return String(value)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatDateTime(value: any): string {
  if (!value) return ''
  const d = new Date(value)
  if (isNaN(d.getTime())) return String(value)
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// ───────────────────────────────────────────────────────────────────
// UI primitives
// ───────────────────────────────────────────────────────────────────

function InfoRow({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: any
  label: string
  value: string
  hint?: string
}) {
  const hasValue = value && value.trim() !== ''
  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
      <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
        <Icon size={16} strokeWidth={2.2} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </div>
        <div
          className={`mt-0.5 text-sm break-words ${
            hasValue ? 'text-slate-900 font-medium' : 'text-slate-400 italic font-normal'
          }`}
        >
          {hasValue ? value : hint || 'Not provided'}
        </div>
      </div>
    </div>
  )
}

function SectionCard({
  title,
  icon: Icon,
  accent,
  children,
}: {
  title: string
  icon: any
  accent: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg shadow-slate-200/40 border border-slate-200/60 overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/60">
        <div
          className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-white shadow-sm"
          style={{ backgroundColor: accent }}
        >
          <Icon size={18} strokeWidth={2.2} />
        </div>
        <h3 className="text-base font-bold text-slate-900 tracking-tight">{title}</h3>
      </div>
      <div className="px-5 py-2">{children}</div>
    </div>
  )
}

// ───────────────────────────────────────────────────────────────────
// Main page
// ───────────────────────────────────────────────────────────────────

export default function StudentProfilePage() {
  const { user, logout } = useAuth() as {
    user: any
    logout: () => void | Promise<void>
  }

  const [student, setStudent] = useState<any>(null)
  const [classInfo, setClassInfo] = useState<any>(null)
  const [schoolInfo, setSchoolInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // PIN modal state
  const [showPinModal, setShowPinModal] = useState(false)
  const [oldPin, setOldPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [pinSuccess, setPinSuccess] = useState('')
  const [changingPin, setChangingPin] = useState(false)

  const loadProfile = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError('')
    try {
      // Primary: load full student record by id
      const studentId = user.id || user.student_id || user.studentId
      let studentData: any = null
      if (studentId) {
        const { data, error: err } = await dbProxy
          .from('students')
          .select('*')
          .eq('id', studentId)
          .maybeSingle()
        if (err) throw err
        studentData = data
      }

      // Fallback: if no record by id, try admission_no from auth context
      if (!studentData && (user.admission_no || user.adm_no)) {
        const admNo = user.admission_no || user.adm_no
        const { data, error: err } = await dbProxy
          .from('students')
          .select('*')
          .eq('admission_no', admNo)
          .maybeSingle()
        if (err) throw err
        studentData = data
      }

      // If still nothing, fall back to the user object from auth
      const record = studentData || user
      setStudent(record)

      // Fetch class info if class_id present
      if (record?.class_id) {
        const { data: cData, error: cErr } = await dbProxy
          .from('classes')
          .select('id, name, section, class_level, tier')
          .eq('id', record.class_id)
          .maybeSingle()
        if (!cErr) setClassInfo(cData)
      }

      // Fetch school info (logo, name, colors)
      if (record?.school_id) {
        const { data: sData, error: sErr } = await dbProxy
          .from('schools')
          .select('id, name, logo_url, primary_color')
          .eq('id', record.school_id)
          .maybeSingle()
        if (!sErr) setSchoolInfo(sData)
      }
    } catch (e: any) {
      console.error('Profile load error:', e)
      setError(e?.message || 'Failed to load profile')
      // Fall back to auth user so we can still render something
      setStudent(user)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  // ─── Derived display values ────────────────────────────────────
  const displayName = fullName(student) || fullName(user) || 'Student'
  const displayAdmNo = admissionNo(student) || admissionNo(user)
  const passportUrl = student?.passport_url || user?.passport_url || ''

  const schoolPrimary =
    schoolInfo?.primary_color || user?.primary_color || '#1e7a3c'

  // ─── PIN change ────────────────────────────────────────────────
  const handleChangePin = async () => {
    setPinError('')
    setPinSuccess('')

    if (!oldPin || !newPin || !confirmPin) {
      setPinError('Please fill in all PIN fields')
      return
    }
    if (newPin.length < 4) {
      setPinError('New PIN must be at least 4 digits')
      return
    }
    if (newPin !== confirmPin) {
      setPinError('New PIN and confirmation do not match')
      return
    }
    if (newPin === oldPin) {
      setPinError('New PIN must be different from the current PIN')
      return
    }

    setChangingPin(true)
    try {
      const studentId = student?.id || user?.id
      const { data, error: rpcErr } = await dbProxy.rpc('change_student_pin', {
        p_student_id: studentId,
        p_old_pin: oldPin,
        p_new_pin: newPin,
      })

      if (rpcErr) throw rpcErr
      if (data && data.success === false) {
        throw new Error(data.message || 'PIN change failed')
      }

      setPinSuccess('PIN changed successfully')
      setOldPin('')
      setNewPin('')
      setConfirmPin('')
      setTimeout(() => {
        setShowPinModal(false)
        setPinSuccess('')
      }, 1500)
    } catch (e: any) {
      console.error('PIN change error:', e)
      setPinError(e?.message || 'Failed to change PIN. Please verify your current PIN.')
    } finally {
      setChangingPin(false)
    }
  }

  const closePinModal = () => {
    if (changingPin) return
    setShowPinModal(false)
    setOldPin('')
    setNewPin('')
    setConfirmPin('')
    setPinError('')
    setPinSuccess('')
  }

  // ─── Render ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-slate-600">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          <span className="text-sm font-medium">Loading your profile…</span>
        </div>
      </div>
    )
  }

  return (
    <div className="px-3 sm:px-4 lg:px-6 py-4 sm:py-6 max-w-5xl mx-auto bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 min-h-screen">
      {/* ── Header card ─────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden rounded-2xl shadow-md mb-5"
        style={{
          background: `linear-gradient(135deg, ${schoolPrimary} 0%, ${schoolPrimary}dd 60%, ${schoolPrimary}aa 100%)`,
        }}
      >
        {/* Decorative circle */}
        <div className="absolute -right-16 -top-16 w-56 h-56 bg-white/10 rounded-full pointer-events-none" />
        <div className="absolute -right-8 top-8 w-32 h-32 bg-white/5 rounded-full pointer-events-none" />

        <div className="relative px-4 sm:px-6 py-5 sm:py-6 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
          {/* School logo (top-left, small) */}
          {schoolInfo?.logo_url && (
            <div className="absolute top-3 right-3 hidden sm:block">
              <img
                src={schoolInfo.logo_url}
                alt="School logo"
                className="w-10 h-10 rounded-full object-cover bg-white/90 ring-2 ring-white/60"
                onError={(e) => {
                  ;(e.target as HTMLImageElement).style.display = 'none'
                }}
              />
            </div>
          )}

          {/* Avatar */}
          <div className="flex-shrink-0 mx-auto sm:mx-0">
            {passportUrl ? (
              <img
                src={passportUrl}
                alt={displayName}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover ring-4 ring-white/70 shadow-lg bg-white"
                onError={(e) => {
                  const t = e.target as HTMLImageElement
                  t.style.display = 'none'
                  const fallback = t.nextElementSibling as HTMLElement | null
                  if (fallback) fallback.style.display = 'flex'
                }}
              />
            ) : (
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white/95 text-slate-700 ring-4 ring-white/70 shadow-lg flex items-center justify-center font-bold text-2xl sm:text-3xl">
                {initials(displayName)}
              </div>
            )}
            {/* Hidden fallback that shows if image errors */}
            {!passportUrl === false && (
              <div
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white/95 text-slate-700 ring-4 ring-white/70 shadow-lg hidden items-center justify-center font-bold text-2xl sm:text-3xl"
                style={{ display: 'none' }}
              >
                {initials(displayName)}
              </div>
            )}
          </div>

          {/* Name + Adm No */}
          <div className="flex-1 text-center sm:text-left min-w-0">
            <div className="text-[11px] uppercase tracking-widest text-white/80 font-semibold">
              Student Profile
            </div>
            <h1 className="mt-0.5 text-xl sm:text-2xl lg:text-3xl font-bold text-white tracking-tight break-words">
              {displayName}
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center justify-center sm:justify-start gap-2 text-white/90 text-sm">
              {displayAdmNo && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/15 backdrop-blur-sm font-medium">
                  <Shield size={13} strokeWidth={2.4} />
                  {displayAdmNo}
                </span>
              )}
              {classInfo && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/15 backdrop-blur-sm font-medium">
                  <GraduationCap size={13} strokeWidth={2.4} />
                  {classInfo.name}
                  {classInfo.section ? ` ${classInfo.section}` : ''}
                </span>
              )}
              {student?.is_active === false && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-500/30 backdrop-blur-sm font-medium">
                  <XCircle size={13} strokeWidth={2.4} />
                  Inactive
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Error banner ────────────────────────────────────────── */}
      {error && (
        <div className="mb-4 flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <div className="font-semibold">Couldn't load full profile</div>
            <div className="text-amber-800/90 text-xs mt-0.5">{error}</div>
          </div>
        </div>
      )}

      {/* ── Action buttons ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <button
          onClick={() => setShowPinModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 transition text-slate-800 font-semibold text-sm shadow-sm"
        >
          <Lock size={16} strokeWidth={2.2} />
          Change PIN
        </button>
        <button
          onClick={() => logout()}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 hover:bg-red-100 transition text-red-700 font-semibold text-sm shadow-sm"
        >
          <LogOut size={16} strokeWidth={2.2} />
          Logout
        </button>
      </div>

      {/* ── Info cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        {/* Personal Information */}
        <SectionCard title="Personal Information" icon={UserIcon} accent="#2563eb">
          <InfoRow icon={UserIcon} label="Gender" value={pickString(student, 'gender')} />
          <InfoRow
            icon={Calendar}
            label="Date of Birth"
            value={formatDate(student?.date_of_birth)}
          />
          <InfoRow
            icon={School}
            label="School Level"
            value={pickString(student, 'school_level')}
          />
          <InfoRow
            icon={Trophy}
            label="Sport Team"
            value={pickString(student, 'sport_team')}
          />
          <InfoRow
            icon={Users}
            label="Club / Society"
            value={pickString(student, 'club_society')}
          />
          <InfoRow
            icon={MapPin}
            label="Home Address"
            value={pickString(student, 'home_address')}
          />
        </SectionCard>

        {/* Parent / Guardian */}
        <SectionCard title="Parent / Guardian" icon={Users} accent="#7c3aed">
          <InfoRow
            icon={UserIcon}
            label="Parent Name"
            value={pickString(student, 'parent_name')}
          />
          <InfoRow
            icon={Phone}
            label="Phone"
            value={pickString(student, 'parent_phone')}
          />
          <InfoRow
            icon={Mail}
            label="Email"
            value={pickString(student, 'parent_email')}
          />
          <InfoRow
            icon={Briefcase}
            label="Occupation"
            value={pickString(student, 'parent_occupation')}
          />
        </SectionCard>

        {/* Academic Information */}
        <SectionCard title="Academic Information" icon={GraduationCap} accent="#0891b2">
          <InfoRow
            icon={School}
            label="Class"
            value={
              classInfo
                ? `${classInfo.name}${classInfo.section ? ` ${classInfo.section}` : ''}`
                : ''
            }
          />
          <InfoRow
            icon={GraduationCap}
            label="Class Level"
            value={pickString(classInfo, 'class_level', 'tier') || pickString(student, 'school_level')}
          />
          <InfoRow
            icon={Calendar}
            label="Admission Session"
            value={pickString(student, 'admission_session')}
          />
          <InfoRow
            icon={Activity}
            label="Admission Mode"
            value={pickString(student, 'admission_mode')}
          />
          <InfoRow
            icon={Calendar}
            label="Class Admission Year"
            value={pickString(student, 'class_admission_year')}
          />
          <InfoRow
            icon={CheckCircle2}
            label="Graduation Status"
            value={pickString(student, 'graduation_status')}
          />
        </SectionCard>

        {/* Account Information */}
        <SectionCard title="Account Information" icon={Shield} accent="#475569">
          <InfoRow icon={Shield} label="Admission No." value={displayAdmNo} />
          <InfoRow
            icon={CheckCircle2}
            label="Account Status"
            value={student?.is_active === false ? 'Inactive' : 'Active'}
          />
          <InfoRow
            icon={Clock}
            label="Last Login"
            value={formatDateTime(student?.last_login || user?.last_login)}
          />
          <InfoRow
            icon={Calendar}
            label="Profile Created"
            value={formatDate(student?.created_at)}
          />
          <InfoRow
            icon={Calendar}
            label="Last Updated"
            value={formatDate(student?.updated_at)}
          />
        </SectionCard>
      </div>

      {/* ── PIN modal ───────────────────────────────────────────── */}
      {showPinModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4"
          onClick={closePinModal}
        >
          <div
            className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden animate-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
                  <Lock size={18} strokeWidth={2.2} />
                </div>
                <h3 className="text-base font-bold text-slate-900">Change PIN</h3>
              </div>
              <button
                onClick={closePinModal}
                disabled={changingPin}
                className="p-1.5 rounded-md text-slate-500 hover:bg-slate-200 disabled:opacity-50"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              {pinError && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                  <span>{pinError}</span>
                </div>
              )}
              {pinSuccess && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
                  <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5" />
                  <span>{pinSuccess}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Current PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  value={oldPin}
                  onChange={(e) =>
                    setOldPin(e.target.value.replace(/\D/g, '').slice(0, 6))
                  }
                  disabled={changingPin}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none text-slate-900 font-medium tracking-widest disabled:bg-slate-50"
                  placeholder="••••"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  New PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  value={newPin}
                  onChange={(e) =>
                    setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))
                  }
                  disabled={changingPin}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none text-slate-900 font-medium tracking-widest disabled:bg-slate-50"
                  placeholder="4-6 digits"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Confirm New PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  value={confirmPin}
                  onChange={(e) =>
                    setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))
                  }
                  disabled={changingPin}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none text-slate-900 font-medium tracking-widest disabled:bg-slate-50"
                  placeholder="••••"
                />
              </div>
            </div>

            <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 flex gap-3">
              <button
                onClick={closePinModal}
                disabled={changingPin}
                className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-semibold text-sm hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleChangePin}
                disabled={changingPin || !oldPin || !newPin || !confirmPin}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {changingPin ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={15} />
                    Update PIN
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
