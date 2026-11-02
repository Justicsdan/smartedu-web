import { useState, useEffect, useMemo } from "react"
import { dbProxy } from '../../lib/dbProxy'
import {
  Edit, X, Camera, User, Mail, Phone, Briefcase, Award,
  MapPin, Loader2, Save,
} from 'lucide-react'

interface Teacher {
  id: string
  first_name: string
  last_name: string
  staff_id: string
  gender: string | null
  email: string | null
  phone: string | null
  department: string | null
  qualification: string | null
  home_address: string | null
  passport_url: string | null
}

const SUPABASE_URL = (import.meta as any).env.VITE_SUPABASE_URL
const ANON_KEY = (import.meta as any).env.VITE_SUPABASE_ANON_KEY

export default function TeacherEditModal({
  teacher,
  onClose,
  onSaved,
}: {
  teacher: Teacher
  onClose: () => void
  onSaved: () => void
}) {
  const [passportUrl, setPassportUrl] = useState<string>(teacher.passport_url || '')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [form, setForm] = useState({
    first_name: teacher.first_name || '',
    last_name: teacher.last_name || '',
    gender: teacher.gender ? teacher.gender.charAt(0).toUpperCase() + teacher.gender.slice(1).toLowerCase() : '',
    email: teacher.email || '',
    phone: teacher.phone || '',
    department: teacher.department || '',
    qualification: teacher.qualification || '',
    home_address: teacher.home_address || '',
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
        const storagePath = 'teachers/' + teacher.id + '/' + timestamp + '.' + ext
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
        // Update teacher passport_url immediately (matches Flutter pattern)
        const { error: updErr } = await dbProxy
          .from('teachers')
          .update({ passport_url: publicUrl })
          .eq('id', teacher.id)
        if (updErr) console.error('Failed to persist passport URL:', updErr.message)
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
        gender: form.gender ? form.gender.toLowerCase() : null,
        email: form.email.trim() || '',
        phone: form.phone.trim() || '',
        department: form.department.trim() || '',
        qualification: form.qualification.trim() || '',
        home_address: form.home_address.trim() || '',
      }
      const { error: err } = await dbProxy.from('teachers').update(data).eq('id', teacher.id).select()
      if (err) throw err
      setSuccess(true)
      setTimeout(() => onSaved(), 800)
    } catch (e: any) {
      setError('Save failed: ' + e.message)
      setSaving(false)
    }
  }

  const teacherName = [teacher.first_name, teacher.last_name].filter(Boolean).join(' ') || 'Teacher'
  const initials = (teacher.first_name?.[0] || '') + (teacher.last_name?.[0] || '')

  const Field = ({ label, icon: Icon, value, onChange, placeholder, type = 'text', maxRows }: {
    label: string; icon: any; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; maxRows?: number
  }) => (
    <div>
      <label className="text-[13px] text-gray-600 font-medium">{label}</label>
      {maxRows ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={maxRows} placeholder={placeholder}
          className="mt-1 w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 focus:border-[#1A237E] focus:border-2 outline-none" />
      ) : (
        <div className="relative mt-1">
          {Icon && <Icon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />}
          <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
            className={'w-full h-11 py-2.5 pr-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 focus:border-[#1A237E] focus:border-2 outline-none ' + (Icon ? 'pl-9' : 'pl-3')} />
        </div>
      )}
    </div>
  )

  const SectionHeader = ({ title }: { title: string }) => (
    <div className="text-[11px] font-bold text-gray-400 tracking-wider uppercase mt-5 mb-3">{title}</div>
  )

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 pb-4">
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center">
              <Edit size={22} className="text-[#1A237E]" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-gray-900 tracking-tight">Edit Teacher</h2>
              <p className="text-[13px] text-gray-400">{teacherName} • {teacher.staff_id}</p>
            </div>
            <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600"><X size={22} /></button>
          </div>
        </div>

        <div className="border-t border-gray-200" />

        <div className="flex-1 overflow-y-auto p-6 pt-5">
          {/* Photo */}
          <div className="flex flex-col items-center mb-2">
            <button onClick={pickAndUploadPassport} disabled={uploading} className="relative">
              <div className="w-[88px] h-[88px] rounded-full border-2 border-indigo-200 bg-blue-50 overflow-hidden flex items-center justify-center">
                {passportUrl ? (
                  <img src={passportUrl + '?width=120&height=120'} alt="" className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                ) : (
                  <span className="text-[28px] font-bold text-[#1A237E]">{initials.toUpperCase()}</span>
                )}
              </div>
              {uploading && (
                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                  <Loader2 size={20} className="text-white animate-spin" />
                </div>
              )}
              {!uploading && (
                <div className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-[#1A237E] border-2 border-white flex items-center justify-center">
                  <Camera size={13} className="text-white" />
                </div>
              )}
            </button>
            <p className="mt-1 text-[11px] text-gray-400">Tap to change photo</p>
          </div>

          {/* Read-only Staff ID */}
          <div className="mt-3 p-3 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Staff ID</div>
              <div className="text-sm font-bold text-gray-900">{teacher.staff_id || 'Not set'}</div>
            </div>
            <div className="text-[10px] text-gray-400 italic">Read-only</div>
          </div>

          <SectionHeader title="Personal Information" />
          <div className="grid grid-cols-2 gap-3 mb-3">
            <Field label="First Name *" icon={User} value={form.first_name} onChange={(v) => setField('first_name', v)} />
            <Field label="Last Name *" icon={User} value={form.last_name} onChange={(v) => setField('last_name', v)} />
          </div>
          <div className="mb-3">
            <label className="text-[13px] text-gray-600 font-medium">Gender</label>
            <select value={form.gender} onChange={(e) => setField('gender', e.target.value)}
              className="mt-1 w-full h-11 px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 focus:border-[#1A237E] focus:border-2 outline-none">
              <option value="">Select gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>
          <div className="mb-3"><Field label="Email" icon={Mail} type="email" value={form.email} onChange={(v) => setField('email', v)} placeholder="Email address" /></div>
          <div className="mb-3"><Field label="Phone" icon={Phone} value={form.phone} onChange={(v) => setField('phone', v)} placeholder="Phone number" /></div>

          <SectionHeader title="Work Information" />
          <div className="mb-3"><Field label="Department" icon={Briefcase} value={form.department} onChange={(v) => setField('department', v)} placeholder="Department" /></div>
          <div className="mb-3"><Field label="Qualification" icon={Award} value={form.qualification} onChange={(v) => setField('qualification', v)} placeholder="Qualification" /></div>
          <div className="mb-3"><Field label="Home Address" icon={MapPin} value={form.home_address} onChange={(v) => setField('home_address', v)} placeholder="Residential address" maxRows={2} /></div>

          {error && <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-[13px] text-red-700">{error}</div>}
          {success && (
            <div className="mt-4 p-3 rounded-lg bg-green-50 border border-green-200 text-[13px] text-green-700 flex items-center gap-2">
              <Save size={16} /> Teacher updated successfully!
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
