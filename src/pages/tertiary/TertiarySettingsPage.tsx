import { useState, useEffect, useCallback } from 'react'
import { dbProxy } from '../../lib/dbProxy'
import { useAuth } from '../../contexts/AuthContext'
import {
  Settings, AlertCircle, Award, Loader2, Save, School,
} from 'lucide-react'

const DEFAULTS: Record<string, { grading_scale: string; program_type: string; certification_name: string; max_level: number }> = {
  university: { grading_scale: 'university_5.0', program_type: 'bachelors', certification_name: 'B.Sc', max_level: 500 },
  polytechnic: { grading_scale: 'polytechnic_4.0', program_type: 'nd_hnd', certification_name: 'ND', max_level: 200 },
  college_of_education: { grading_scale: 'nce_4.0', program_type: 'nce', certification_name: 'NCE', max_level: 300 },
  monotechnic: { grading_scale: 'polytechnic_4.0', program_type: 'diploma', certification_name: 'Diploma', max_level: 200 },
  nursing_school: { grading_scale: 'nce_4.0', program_type: 'certificate', certification_name: 'RN', max_level: 200 },
  ieic: { grading_scale: 'polytechnic_4.0', program_type: 'certificate', certification_name: 'NVQ', max_level: 400 },
  ijmb: { grading_scale: 'ijmb_points', program_type: 'ijmb', certification_name: 'IJMB', max_level: 100 },
}

export default function TertiarySettingsPage() {
  const { user } = useAuth() as { user: any }
  const schoolId = user?.school_id || user?.schoolId || user?.id || ''
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [schoolType, setSchoolType] = useState('')
  const [schoolName, setSchoolName] = useState('')
  const [settings, setSettings] = useState<any>(null)
  const [form, setForm] = useState({
    grading_scale: 'university_5.0',
    program_type: 'bachelors',
    certification_name: 'B.Sc',
    max_level: 500,
  })

  const load = useCallback(async () => {
    if (!schoolId) { setError('No school ID'); setLoading(false); return }
    setLoading(true); setError('')
    try {
      const [schoolRes, setRes] = await Promise.all([
        dbProxy.from('schools').select('name, school_type').eq('id', schoolId),
        dbProxy.from('higher_institution_settings').select('*').eq('school_id', schoolId),
      ])
      const s = (schoolRes.data || [])[0]
      setSchoolName(s?.name || '—')
      setSchoolType(s?.school_type || 'university')
      const existing = (setRes.data || [])[0]
      setSettings(existing)
      if (existing) {
        setForm({
          grading_scale: existing.grading_scale || 'university_5.0',
          program_type: existing.program_type || 'bachelors',
          certification_name: existing.certification_name || 'B.Sc',
          max_level: existing.max_level || 500,
        })
      } else if (s?.school_type && DEFAULTS[s.school_type]) {
        const d = DEFAULTS[s.school_type]
        setForm({ grading_scale: d.grading_scale, program_type: d.program_type, certification_name: d.certification_name, max_level: d.max_level })
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [schoolId])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    setSaving(true); setError(''); setSuccess('')
    try {
      if (settings?.id) {
        const { error } = await dbProxy.from('higher_institution_settings').update({
          grading_scale: form.grading_scale,
          program_type: form.program_type,
          certification_name: form.certification_name,
          max_level: Number(form.max_level),
        }).eq('id', settings.id)
        if (error) throw error
      } else {
        const { error } = await dbProxy.from('higher_institution_settings').insert({
          school_id: schoolId,
          grading_scale: form.grading_scale,
          program_type: form.program_type,
          certification_name: form.certification_name,
          max_level: Number(form.max_level),
        })
        if (error) throw error
      }
      setSuccess('Settings saved')
      load()
    } catch (e: any) {
      setError(e?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const applyDefaults = () => {
    if (schoolType && DEFAULTS[schoolType]) {
      const d = DEFAULTS[schoolType]
      setForm({ grading_scale: d.grading_scale, program_type: d.program_type, certification_name: d.certification_name, max_level: d.max_level })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-gradient-to-br from-slate-50 via-white to-violet-50/30">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 border-4 border-violet-500 border-t-transparent rounded-full animate-spin shadow-lg shadow-violet-500/20" />
          <span className="text-sm font-semibold text-slate-700">Loading settings...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="px-3 sm:px-4 lg:px-6 py-4 sm:py-6 max-w-4xl mx-auto space-y-5 bg-gradient-to-br from-slate-50 via-white to-violet-50/30 min-h-screen">
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-[10px] font-bold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse"></span>
            University
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 bg-clip-text text-transparent">Institution Settings</h1>
        <p className="text-sm text-slate-500 mt-1.5">Configure grading scale, certification, and academic levels for {schoolName}</p>
      </div>

      {error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-800">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          <p className="text-sm flex-1">{error}</p>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800">
          <Award size={18} className="flex-shrink-0 mt-0.5" />
          <p className="text-sm flex-1">{success}</p>
        </div>
      )}

      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg shadow-slate-200/40 border border-slate-200/60 p-5 space-y-5">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-violet-500/30">
            <School size={18} strokeWidth={2.2} />
          </div>
          <div>
            <p className="text-base font-bold text-slate-900 tracking-tight">Institution Type</p>
            <p className="text-[11px] text-slate-500 capitalize">{(schoolType || '—').replace(/_/g, ' ')} · {schoolName}</p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Grading Scale</label>
          <select value={form.grading_scale} onChange={e => setForm({ ...form, grading_scale: e.target.value })}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 outline-none transition">
            <option value="university_5.0">University (5.0 GPA — A=5, B=4, C=3, D=2, E=1, F=0)</option>
            <option value="polytechnic_4.0">Polytechnic (4.0 GPA — A=4, B=3, C=2, D=1, F=0)</option>
            <option value="nce_4.0">NCE (4.0 GPA — A=4, B=3, C=2, D=1, F=0)</option>
            <option value="ijmb_points">IJMB (Subject Points — A=5, B=4, C=3, D=2, E=1, F=0)</option>
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Program Type</label>
            <select value={form.program_type} onChange={e => setForm({ ...form, program_type: e.target.value })}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 outline-none transition">
              <option value="bachelors">Bachelors Degree</option>
              <option value="nd_hnd">ND / HND (Polytechnic)</option>
              <option value="nce">NCE (College of Education)</option>
              <option value="diploma">Diploma</option>
              <option value="certificate">Certificate</option>
              <option value="ijmb">IJMB (Interim Joint Matriculations Board)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Certification Name</label>
            <input value={form.certification_name} onChange={e => setForm({ ...form, certification_name: e.target.value })} placeholder="e.g. B.Sc, ND, HND, NCE, Diploma"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 outline-none transition" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Maximum Level</label>
          <select value={form.max_level} onChange={e => setForm({ ...form, max_level: Number(e.target.value) })}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 outline-none transition">
            <option value={100}>100 (1-year program)</option>
            <option value={200}>200 (2-year program — ND, HND, Diploma)</option>
            <option value={300}>300 (3-year program — NCE)</option>
            <option value={400}>400 (4-year program)</option>
            <option value={500}>500 (5-year program — Medicine, Engineering)</option>
          </select>
        </div>

        <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
          <button onClick={applyDefaults} className="text-xs text-violet-600 hover:text-violet-700 font-semibold">
            Reset to {schoolType ? (schoolType.charAt(0).toUpperCase() + schoolType.slice(1).replace(/_/g, ' ')) : 'Institution'} defaults
          </button>
          <button onClick={handleSave} disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white text-sm font-bold shadow-lg shadow-violet-500/30 hover:-translate-y-0.5 transition-all disabled:opacity-50">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} strokeWidth={2.4} />}
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  )
}
