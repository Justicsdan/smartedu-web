import { useState, useEffect, useMemo } from "react"
import { dbProxy } from '../../lib/dbProxy'
import {
  Edit, X, Camera, User, GraduationCap as ClassIcon,
  Users, Info, Loader2, Save,
} from 'lucide-react'

interface Student {
  id: string
  school_id: string
  class_id: string | null
  admission_no: string
  first_name: string
  middle_name: string | null
  last_name: string
  gender: string | null
  passport_url: string | null
  parent_name: string | null
  parent_phone: string | null
  parent_email: string | null
  parent_occupation: string | null
  home_address: string | null
  date_of_birth: string | null
  school_level: string | null
  sport_team: string | null
  club_society: string | null
}

interface SchoolClass {
  id: string
  name: string
  section: string | null
  tier: string | null
}

const SUPABASE_URL = (import.meta as any).env.VITE_SUPABASE_URL
const ANON_KEY = (import.meta as any).env.VITE_SUPABASE_ANON_KEY

export default function StudentEditModal({
  student,
  classes,
  onClose,
  onSaved,
}: {
  student: Student
  classes: SchoolClass[]
  onClose: () => void
  onSaved: () => void
}) {
  const [passportUrl, setPassportUrl] = useState<string>(student.passport_url || '')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [form, setForm] = useState({
    first_name: student.first_name || '',
    last_name: student.last_name || '',
    middle_name: student.middle_name || '',
    gender: student.gender ? student.gender.charAt(0).toUpperCase() + student.gender.slice(1).toLowerCase() : '',
    date_of_birth: student.date_of_birth ? student.date_of_birth.substring(0, 10) : '',
    class_id: student.class_id || '',
    school_level: student.school_level || 'secondary',
    parent_name: student.parent_name || '',
    parent_phone: student.parent_phone || '',
    parent_email: student.parent_email || '',
    parent_occupation: student.parent_occupation || '',
    home_address: student.home_address || '',
    sport_team: student.sport_team || '',
    club_society: student.club_society || '',
  })

  const setField = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setError(null)
  }

  const pickAndUploadPassport = async () => {
    if (uploading) return
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      setUploading(true)
      setError(null)
      try {
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
        const timestamp = Date.now()
        const storagePath = 'students/' + student.id + '/' + timestamp + '.' + ext
        const mimeMap: Record<string, string> = { jpg: 'jpeg', jpeg: 'jpeg', png: 'png', gif: 'gif', webp: 'webp' }
        const mime = mimeMap[ext] || 'jpeg'
        const uploadUrl = SUPABASE_URL + '/storage/v1/object/passports/' + storagePath
        const res = await fetch(uploadUrl, {
          method: 'POST',
          headers: { apikey: ANON_KEY, 'Content-Type': 'image/' + mime, 'x-upsert': 'true' },
          body: file,
        })
        if (!res.ok) {
          const body = await res.text()
          throw new Error('Upload failed (' + res.status + '): ' + body)
        }
        const publicUrl = SUPABASE_URL + '/storage/v1/object/public/passports/' + storagePath
        setPassportUrl(publicUrl)
      } catch (e: any) {
        setError('Upload failed: ' + e.message)
      } finally {
        setUploading(false)
      }
    }
    input.click()
  }

  const save = async () => {
    if (saving) return
    if (!form.first_name.trim()) { setError('First Name is required'); return }
    if (!form.last_name.trim()) { setError('Last Name is required'); return }
    setSaving(true)
    setError(null)
    try {
      const data: Record<string, any> = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        middle_name: form.middle_name.trim() || null,
        gender: form.gender ? form.gender.toLowerCase() : null,
        date_of_birth: form.date_of_birth || null,
        class_id: form.class_id || null,
        school_level: form.school_level || 'secondary',
        parent_name: form.parent_name.trim() || '',
        parent_phone: form.parent_phone.trim() || '',
        parent_email: form.parent_email.trim() || '',
        parent_occupation: form.parent_occupation.trim() || '',
        home_address: form.home_address.trim() || '',
        sport_team: form.sport_team.trim() || null,
        club_society: form.club_society.trim() || null,
        passport_url: passportUrl || null,
      }
      const { error: err } = await dbProxy.from('students').update(data).eq('id', student.id).select()
      if (err) throw err
      setSuccess(true)
      setTimeout(() => onSaved(), 800)
    } catch (e: any) {
      setError('Save failed: ' + e.message)
      setSaving(false)
    }
  }

  const studentName = [student.first_name, student.middle_name, student.last_name].filter(Boolean).join(' ') || 'Student'

  const Field = ({ label, value, onChange, placeholder, type = 'text', maxRows, required }: {
    label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; maxRows?: number; required?: boolean
  }) => (
    <div>
      <label className="text-[13px] text-gray-600 font-medium">{label}{required && <span className="text-red-500"> *</span>}</label>
      {maxRows ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={maxRows} placeholder={placeholder}
          className="mt-1 w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 focus:border-[#1A237E] focus:border-2 outline-none" />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          className="mt-1 w-full h-11 px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 focus:border-[#1A237E] focus:border-2 outline-none" />
      )}
    </div>
  )

  const SectionHeader = ({ title, icon: Icon, bg, color }: { title: string; icon: any; bg: string; color: string }) => (
    <div className="flex items-center gap-2.5 mb-3">
      <div className={'w-8 h-8 rounded-lg flex items-center justify-center ' + bg}>
        <Icon size={16} className={color} />
      </div>
      <h3 className="text-sm font-bold text-gray-700">{title}</h3>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-2xl max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 pb-4">
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center">
              <Edit size={22} className="text-[#1A237E]" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-gray-900 tracking-tight">Edit Student</h2>
              <p className="text-[13px] text-gray-400">{studentName}</p>
            </div>
            <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600"><X size={22} /></button>
          </div>
        </div>

        <div className="border-t border-gray-200" />

        <div className="flex-1 overflow-y-auto p-6 pt-5">
          <div className="flex flex-col items-center mb-2">
            <div className="relative">
              <div className="w-[90px] h-[90px] rounded-full border-2 border-indigo-200 bg-gray-100 overflow-hidden flex items-center justify-center">
                {passportUrl ? (
                  <img src={passportUrl + '?width=120&height=120'} alt="" className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                ) : <User size={36} className="text-gray-400" />}
              </div>
              <button onClick={pickAndUploadPassport} disabled={uploading}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#1A237E] border-2 border-white flex items-center justify-center disabled:opacity-50">
                {uploading ? <Loader2 size={14} className="text-white animate-spin" /> : <Camera size={14} className="text-white" />}
              </button>
            </div>
            <button onClick={pickAndUploadPassport} disabled={uploading}
              className="mt-1 text-[12px] font-semibold text-[#1A237E] disabled:opacity-50">
              {uploading ? 'Uploading...' : 'Change Photo'}
            </button>
          </div>

          <div className="mt-3 p-3 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Admission No</div>
              <div className="text-sm font-bold text-gray-900">{student.admission_no || 'Not set'}</div>
            </div>
            <div className="text-[10px] text-gray-400 italic">Read-only</div>
          </div>

          <div className="mt-5">
            <SectionHeader title="Personal Information" icon={User} bg="bg-blue-50" color="text-[#1A237E]" />
            <div className="grid grid-cols-2 gap-3 mb-3">
              <Field label="First Name" value={form.first_name} onChange={(v) => setField('first_name', v)} required />
              <Field label="Last Name" value={form.last_name} onChange={(v) => setField('last_name', v)} required />
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <Field label="Middle Name" value={form.middle_name} onChange={(v) => setField('middle_name', v)} />
              <div>
                <label className="text-[13px] text-gray-600 font-medium">Gender</label>
                <select value={form.gender} onChange={(e) => setField('gender', e.target.value)}
                  className="mt-1 w-full h-11 px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 focus:border-[#1A237E] focus:border-2 outline-none">
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
            </div>
            <Field label="Date of Birth" type="date" value={form.date_of_birth} onChange={(v) => setField('date_of_birth', v)} />
          </div>

          <div className="mt-5">
            <SectionHeader title="Class Assignment" icon={ClassIcon} bg="bg-purple-50" color="text-[#7B1FA2]" />
            <label className="text-[13px] text-gray-600 font-medium">Class</label>
            <select value={form.class_id} onChange={(e) => setField('class_id', e.target.value)}
              className="mt-1 w-full h-11 px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 focus:border-[#1A237E] focus:border-2 outline-none">
              <option value="">Unassigned</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}{c.section ? ' ' + c.section : ''}{c.tier ? ' [' + c.tier + ']' : ''}</option>
              ))}
            </select>
            <div className="mt-3">
              <label className="text-[13px] text-gray-600 font-medium">School Level</label>
              <select value={form.school_level} onChange={(e) => setField('school_level', e.target.value)}
                className="mt-1 w-full h-11 px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 focus:border-[#1A237E] focus:border-2 outline-none">
                <option value="secondary">Secondary</option>
                <option value="primary">Primary</option>
                <option value="nursery">Nursery</option>
              </select>
            </div>
          </div>

          <div className="mt-5">
            <SectionHeader title="Parent / Guardian" icon={Users} bg="bg-green-50" color="text-[#2E7D32]" />
            <div className="grid grid-cols-2 gap-3 mb-3">
              <Field label="Parent Name" value={form.parent_name} onChange={(v) => setField('parent_name', v)} />
              <Field label="Parent Phone" value={form.parent_phone} onChange={(v) => setField('parent_phone', v)} />
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <Field label="Parent Email" type="email" value={form.parent_email} onChange={(v) => setField('parent_email', v)} placeholder="email@example.com" />
              <Field label="Parent Occupation" value={form.parent_occupation} onChange={(v) => setField('parent_occupation', v)} />
            </div>
          </div>

          <div className="mt-5">
            <SectionHeader title="Other Details" icon={Info} bg="bg-yellow-50" color="text-yellow-800" />
            <div className="mb-3">
              <Field label="Home Address" value={form.home_address} onChange={(v) => setField('home_address', v)} maxRows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Sport Team" value={form.sport_team} onChange={(v) => setField('sport_team', v)} />
              <Field label="Club / Society" value={form.club_society} onChange={(v) => setField('club_society', v)} />
            </div>
          </div>

          {error && <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-[13px] text-red-700">{error}</div>}
          {success && (
            <div className="mt-4 p-3 rounded-lg bg-green-50 border border-green-200 text-[13px] text-green-700 flex items-center gap-2">
              <Save size={16} /> Student updated successfully!
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 p-6 pt-3 flex gap-3">
          <button onClick={onClose} disabled={saving}
            className="flex-1 h-12 rounded-lg border border-gray-300 text-gray-600 font-semibold text-sm hover:bg-gray-50 disabled:opacity-50">Cancel</button>
          <button onClick={save} disabled={saving}
            className="flex-1 h-12 rounded-lg bg-[#1A237E] text-white font-semibold text-sm hover:bg-[#283593] disabled:bg-gray-200 disabled:text-gray-400 flex items-center justify-center">
            {saving ? <Loader2 size={20} className="animate-spin" /> : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
