import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import {
  Save, Loader2, AlertCircle, CheckCircle, Plus, Trash2, Copy,
  School, GraduationCap, BookOpen, FileText, Eye, RotateCcw,
} from 'lucide-react'
import {
  getDefaultGradingSystem, getDefaultAssessmentTypes,
  validateGradingSystem, validateAssessmentTypes,
  type GradeBand, type AssessmentType,
} from '../../utils/gradingUtils'

type Tab = 'profile' | 'grading' | 'assessment' | 'layout' | 'display'

const TIERS = [
  { id: 'SSS', label: 'Senior Secondary', color: '#1A237E' },
  { id: 'JSS', label: 'Junior Secondary', color: '#E65100' },
  { id: 'PRIMARY', label: 'Primary School', color: '#2E7D32' },
]

const TEMPLATES = ['WAEC', 'NECO', 'IGCSE']

function tierTemplate(tier: string, examTemplate: string): string {
  if (tier === 'JSS') return 'BECE'
  if (tier === 'PRIMARY') return 'PRIMARY'
  return examTemplate || 'WAEC'
}

function gradingKeyForTier(tier: string): string {
  if (tier === 'JSS') return 'grading_system_jss'
  if (tier === 'PRIMARY') return 'grading_system_primary'
  return 'grading_system'
}

function assessmentKeyForTier(tier: string): string {
  if (tier === 'JSS') return 'assessment_types_jss'
  if (tier === 'PRIMARY') return 'assessment_types_primary'
  return 'assessment_types'
}

export default function SettingsPage() {
  const { user } = useAuth()
  const schoolId = user?.id || ''

  const [tab, setTab] = useState<Tab>('profile')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [settings, setSettings] = useState<any>({})

  useEffect(() => {
    if (!schoolId) return
    ;(async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('school_settings')
          .select('*')
          .eq('school_id', schoolId)
          .maybeSingle()
        if (error) throw error
        setSettings(data || {})
      } catch (e: any) {
        setError(e.message || 'Failed to load settings')
      } finally {
        setLoading(false)
      }
    })()
  }, [schoolId])

  const updateField = (field: string, value: any) => {
    setSettings((prev: any) => ({ ...prev, [field]: value }))
  }

  const saveSettings = async (fields: Record<string, any>) => {
    setSaving(true); setError(''); setSuccessMsg('')
    try {
      // Filter out null values (we use null to mean "reset to default")
      const payload: Record<string, any> = { updated_at: new Date().toISOString() }
      for (const [k, v] of Object.entries(fields)) {
        payload[k] = v
      }
      const { error } = await supabase
        .from('school_settings')
        .update(payload)
        .eq('school_id', schoolId)
      if (error) throw error
      // Update local state — for null resets, remove the key so default kicks in
      setSettings((prev: any) => {
        const next = { ...prev }
        for (const [k, v] of Object.entries(fields)) {
          if (v === null) delete next[k]
          else next[k] = v
        }
        return next
      })
      setSuccessMsg('Settings saved')
    } catch (e: any) {
      setError(e.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-[#1A237E] animate-spin" /></div>
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Configure school profile, grading systems, and result layout</p>
      </div>

      {error && (
        <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      {successMsg && (
        <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-green-700">{successMsg}</p>
        </div>
      )}

      <div className="flex gap-1 bg-white rounded-xl border border-gray-100 p-1 overflow-x-auto">
        <button onClick={() => setTab('profile')} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${tab === 'profile' ? 'bg-[#1A237E] text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
          <School className="w-4 h-4" /> Profile
        </button>
        <button onClick={() => setTab('grading')} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${tab === 'grading' ? 'bg-[#1A237E] text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
          <GraduationCap className="w-4 h-4" /> Grading
        </button>
        <button onClick={() => setTab('assessment')} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${tab === 'assessment' ? 'bg-[#1A237E] text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
          <BookOpen className="w-4 h-4" /> Assessment
        </button>
        <button onClick={() => setTab('layout')} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${tab === 'layout' ? 'bg-[#1A237E] text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
          <FileText className="w-4 h-4" /> Result Layout
        </button>
        <button onClick={() => setTab('display')} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${tab === 'display' ? 'bg-[#1A237E] text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
          <Eye className="w-4 h-4" /> Display
        </button>
      </div>

      {tab === 'profile' && <ProfileTab settings={settings} updateField={updateField} onSave={saveSettings} saving={saving} />}
      {tab === 'grading' && <GradingTab settings={settings} onSave={saveSettings} saving={saving} />}
      {tab === 'assessment' && <AssessmentTab settings={settings} onSave={saveSettings} saving={saving} />}
      {tab === 'layout' && <LayoutTab settings={settings} updateField={updateField} onSave={saveSettings} saving={saving} />}
      {tab === 'display' && <DisplayTab settings={settings} updateField={updateField} onSave={saveSettings} saving={saving} />}
    </div>
  )
}

function ProfileTab({ settings, updateField, onSave, saving }: any) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4 max-w-2xl">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">School Name *</label>
        <input value={settings.name || ''} onChange={e => updateField('name', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">Motto</label>
        <input value={settings.motto || ''} onChange={e => updateField('motto', e.target.value)} placeholder="Knowledge is Power" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">Address</label>
        <textarea value={settings.address || ''} onChange={e => updateField('address', e.target.value)} rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30 resize-none" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Official Phone</label>
          <input value={settings.official_phone || ''} onChange={e => updateField('official_phone', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Official Email</label>
          <input value={settings.official_email || ''} onChange={e => updateField('official_email', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Website</label>
          <input value={settings.website || ''} onChange={e => updateField('website', e.target.value)} placeholder="https://" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Principal Name</label>
          <input value={settings.principal_name || ''} onChange={e => updateField('principal_name', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30" />
        </div>
      </div>
      <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
        <label className="block text-xs font-medium text-gray-700 mb-1.5">Curriculum Mode</label>
        <p className="text-xs text-gray-500 mb-2">Determines which scoring pages are available. ACE schools use PACE Scores + ACE Reports instead of traditional Scores + Publish + Reports.</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => updateField('curriculum_mode', 'traditional')}
            className={`p-3 rounded-lg border-2 text-left transition ${(settings.curriculum_mode || 'traditional').toLowerCase() !== 'ace' ? 'border-[#1A237E] bg-white' : 'border-gray-200 bg-white hover:border-gray-300'}`}
          >
            <div className="flex items-center gap-2 mb-1">
              <GraduationCap className="w-4 h-4 text-[#1A237E]" />
              <span className="text-sm font-medium text-gray-800">Traditional</span>
            </div>
            <p className="text-xs text-gray-500">WAEC / BECE / NECO / IGCSE</p>
            <p className="text-[10px] text-gray-400 mt-1">Scores + Publish + Reports</p>
          </button>
          <button
            onClick={() => updateField('curriculum_mode', 'ace')}
            className={`p-3 rounded-lg border-2 text-left transition ${(settings.curriculum_mode || '').toLowerCase() === 'ace' ? 'border-[#1A237E] bg-white' : 'border-gray-200 bg-white hover:border-gray-300'}`}
          >
            <div className="flex items-center gap-2 mb-1">
              <BookOpen className="w-4 h-4 text-[#1A237E]" />
              <span className="text-sm font-medium text-gray-800">ACE</span>
            </div>
            <p className="text-xs text-gray-500">Accelerated Christian Education</p>
            <p className="text-[10px] text-gray-400 mt-1">PACE Scores + ACE Reports</p>
          </button>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button onClick={() => onSave({ name: settings.name, motto: settings.motto, address: settings.address, official_phone: settings.official_phone, official_email: settings.official_email, website: settings.website, principal_name: settings.principal_name, curriculum_mode: settings.curriculum_mode || 'traditional' })} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-[#1A237E] text-white rounded-lg text-sm font-medium hover:bg-[#283593] transition disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </div>
    </div>
  )
}

function GradingTab({ settings, onSave, saving }: any) {
  const [tier, setTier] = useState('SSS')
  const isAmerican = (settings.grading_standard || '').toLowerCase() === 'american'

  const gradingKey = gradingKeyForTier(tier)
  const currentGrading: GradeBand[] = settings[gradingKey] || getDefaultGradingSystem(tierTemplate(tier, settings.exam_template))
  const hasOverride = !!settings[gradingKey]
  const errors = validateGradingSystem(currentGrading)

  const updateGrading = (index: number, field: keyof GradeBand, value: any) => {
    const updated = [...currentGrading]
    updated[index] = { ...updated[index], [field]: value }
    onSave({ [gradingKey]: updated })
  }

  const addRow = () => {
    const newRow: GradeBand = { min: 0, max: 0, grade: '', remark: '' }
    onSave({ [gradingKey]: [...currentGrading, newRow] })
  }

  const deleteRow = (index: number) => {
    const updated = currentGrading.filter((_, i) => i !== index)
    onSave({ [gradingKey]: updated })
  }

  const copyDefault = () => {
    const def = getDefaultGradingSystem(tierTemplate(tier, settings.exam_template))
    onSave({ [gradingKey]: def })
  }

  const resetToDefault = () => {
    onSave({ [gradingKey]: null })
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
        <h3 className="text-sm font-semibold text-gray-700">Grading Standard</h3>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => onSave({ grading_standard: 'Nigerian' })} className={`p-4 rounded-lg border-2 text-left transition ${!isAmerican ? 'border-[#1A237E] bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}>
            <GraduationCap className={`w-5 h-5 mb-2 ${!isAmerican ? 'text-[#1A237E]' : 'text-gray-400'}`} />
            <p className="text-sm font-medium text-gray-800">Nigerian</p>
            <p className="text-xs text-gray-500">Tier-based (WAEC/BECE/PRIMARY)</p>
          </button>
          <button onClick={() => onSave({ grading_standard: 'American' })} className={`p-4 rounded-lg border-2 text-left transition ${isAmerican ? 'border-[#1A237E] bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}>
            <GraduationCap className={`w-5 h-5 mb-2 ${isAmerican ? 'text-[#1A237E]' : 'text-gray-400'}`} />
            <p className="text-sm font-medium text-gray-800">American</p>
            <p className="text-xs text-gray-500">GPA (A-F, 4.0 scale)</p>
          </button>
        </div>
        {!isAmerican && (
          <div className="pt-2">
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Exam Template (SSS Default)</label>
            <select value={settings.exam_template || 'WAEC'} onChange={e => onSave({ exam_template: e.target.value })} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30">
              {TEMPLATES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex gap-2 mb-4">
          {TIERS.map(t => (
            <button key={t.id} onClick={() => setTier(t.id)} className="px-4 py-2 rounded-lg text-sm font-medium transition" style={tier === t.id ? { backgroundColor: t.color, color: 'white' } : { backgroundColor: '#F3F4F6', color: '#4B5563' }}>
              {t.id}
            </button>
          ))}
        </div>

        <div className={`p-3 rounded-lg border mb-4 ${hasOverride ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'}`}>
          <div className="flex items-center justify-between">
            <p className={`text-sm font-medium ${hasOverride ? 'text-blue-700' : 'text-green-700'}`}>
              {hasOverride ? `Using custom override for ${tier}` : `Using default grading for ${tier}`}
            </p>
            {hasOverride && (
              <button onClick={resetToDefault} className="flex items-center gap-1 text-xs text-red-600 font-medium hover:underline">
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <button onClick={addRow} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1A237E] text-white rounded-lg text-xs font-medium hover:bg-[#283593] transition">
            <Plus className="w-3.5 h-3.5" /> Add Grade
          </button>
          {!hasOverride && (
            <button onClick={copyDefault} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 transition">
              <Copy className="w-3.5 h-3.5" /> Copy Default as Override
            </button>
          )}
        </div>

        {errors.length > 0 && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
            <p className="text-sm font-medium text-red-700 mb-1">Issues found:</p>
            {errors.slice(0, 3).map((e, i) => <p key={i} className="text-xs text-red-600">• {e}</p>)}
          </div>
        )}

        {currentGrading.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-8">No grading system configured. Click "Add Grade" or "Copy Default".</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-3 py-2">Min</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-3 py-2">Max</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-3 py-2">Grade</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-3 py-2">Remark</th>
                  {isAmerican && <th className="text-left text-xs font-medium text-gray-500 uppercase px-3 py-2">Point</th>}
                  <th className="text-right text-xs font-medium text-gray-500 uppercase px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {currentGrading.map((g, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="px-3 py-2"><input type="number" value={g.min} onChange={e => updateGrading(i, 'min', Number(e.target.value))} className="w-16 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#1A237E]/30" /></td>
                    <td className="px-3 py-2"><input type="number" value={g.max} onChange={e => updateGrading(i, 'max', Number(e.target.value))} className="w-16 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#1A237E]/30" /></td>
                    <td className="px-3 py-2"><input value={g.grade} onChange={e => updateGrading(i, 'grade', e.target.value)} className="w-20 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#1A237E]/30" /></td>
                    <td className="px-3 py-2"><input value={g.remark} onChange={e => updateGrading(i, 'remark', e.target.value)} className="w-32 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#1A237E]/30" /></td>
                    {isAmerican && <td className="px-3 py-2"><input type="number" step="0.1" value={g.point || 0} onChange={e => updateGrading(i, 'point', Number(e.target.value))} className="w-16 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#1A237E]/30" /></td>}
                    <td className="px-3 py-2 text-right"><button onClick={() => deleteRow(i)} className="text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function AssessmentTab({ settings, onSave, saving }: any) {
  const [tier, setTier] = useState('SSS')

  const assessKey = assessmentKeyForTier(tier)
  const currentAssess: AssessmentType[] = settings[assessKey] || getDefaultAssessmentTypes(tierTemplate(tier, settings.exam_template))
  const hasOverride = !!settings[assessKey]
  const total = currentAssess.reduce((sum, a) => sum + (Number(a.max) || 0), 0)
  const validation = validateAssessmentTypes(currentAssess)

  const updateAssess = (index: number, field: keyof AssessmentType, value: any) => {
    const updated = [...currentAssess]
    updated[index] = { ...updated[index], [field]: value }
    onSave({ [assessKey]: updated })
  }

  const addRow = () => {
    const newRow: AssessmentType = { id: `col${currentAssess.length + 1}`, name: '', max: 0 }
    onSave({ [assessKey]: [...currentAssess, newRow] })
  }

  const deleteRow = (index: number) => {
    const updated = currentAssess.filter((_, i) => i !== index)
    onSave({ [assessKey]: updated })
  }

  const copyDefault = () => {
    const def = getDefaultAssessmentTypes(tierTemplate(tier, settings.exam_template))
    onSave({ [assessKey]: def })
  }

  const resetToDefault = () => {
    onSave({ [assessKey]: null })
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
      <div className="flex gap-2">
        {TIERS.map(t => (
          <button key={t.id} onClick={() => setTier(t.id)} className="px-4 py-2 rounded-lg text-sm font-medium transition" style={tier === t.id ? { backgroundColor: t.color, color: 'white' } : { backgroundColor: '#F3F4F6', color: '#4B5563' }}>
            {t.id}
          </button>
        ))}
      </div>

      <div className={`p-3 rounded-lg border ${hasOverride ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'}`}>
        <div className="flex items-center justify-between">
          <p className={`text-sm font-medium ${hasOverride ? 'text-blue-700' : 'text-green-700'}`}>
            {hasOverride ? `Using custom override for ${tier}` : `Using default assessment for ${tier}`}
          </p>
          {hasOverride && (
            <button onClick={resetToDefault} className="flex items-center gap-1 text-xs text-red-600 font-medium hover:underline">
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={addRow} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1A237E] text-white rounded-lg text-xs font-medium hover:bg-[#283593] transition">
          <Plus className="w-3.5 h-3.5" /> Add Assessment
        </button>
        {!hasOverride && (
          <button onClick={copyDefault} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 transition">
            <Copy className="w-3.5 h-3.5" /> Copy Default as Override
          </button>
        )}
      </div>

      {currentAssess.length > 0 && (
        <div className={`p-3 rounded-lg border ${validation.valid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <p className={`text-sm font-medium ${validation.valid ? 'text-green-700' : 'text-red-700'}`}>
            Total: {total}/100 — {validation.valid ? 'Valid configuration' : validation.errors[0] || 'Invalid'}
          </p>
        </div>
      )}

      {currentAssess.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-8">No assessment types configured.</p>
      ) : (
        <div className="space-y-2">
          {currentAssess.map((a, i) => (
            <div key={i} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <label className="block text-[10px] text-gray-500 mb-0.5">Name</label>
                <input value={a.name} onChange={e => updateAssess(i, 'name', e.target.value)} className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#1A237E]/30" />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 mb-0.5">ID</label>
                <input value={a.id} onChange={e => updateAssess(i, 'id', e.target.value)} className="w-24 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#1A237E]/30" />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 mb-0.5">Max</label>
                <input type="number" value={a.max} onChange={e => updateAssess(i, 'max', Number(e.target.value))} className="w-16 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#1A237E]/30" />
              </div>
              <div className="text-xs text-gray-500 w-12 text-right mt-4">{total > 0 ? `${Math.round((a.max / total) * 100)}%` : ''}</div>
              <button onClick={() => deleteRow(i)} className="text-red-400 hover:text-red-600 mt-4"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function LayoutTab({ settings, updateField, onSave, saving }: any) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4 max-w-2xl">
      <h3 className="text-sm font-semibold text-gray-700">Result Sheet Layout</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Orientation</label>
          <select value={settings.result_orientation || 'portrait'} onChange={e => updateField('result_orientation', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30">
            <option value="portrait">Portrait</option>
            <option value="landscape">Landscape</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Paper Size</label>
          <select value={settings.result_paper_size || 'a4'} onChange={e => updateField('result_paper_size', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30">
            <option value="a4">A4</option>
            <option value="a5">A5</option>
            <option value="letter">Letter</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Logo Position</label>
          <select value={settings.logo_position || 'left'} onChange={e => updateField('logo_position', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30">
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Font Family</label>
          <input value={settings.font_family || ''} onChange={e => updateField('font_family', e.target.value)} placeholder="e.g., Inter, Arial" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">Header Text</label>
        <input value={settings.result_header_text || ''} onChange={e => updateField('result_header_text', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">Footer Text</label>
        <input value={settings.result_footer_text || ''} onChange={e => updateField('result_footer_text', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">Watermark Text</label>
        <input value={settings.result_watermark_text || ''} onChange={e => updateField('result_watermark_text', e.target.value)} placeholder="e.g., CONFIDENTIAL" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A237E]/30" />
      </div>

      <div className="pt-2">
        <h4 className="text-xs font-semibold text-gray-700 mb-2">Brand Colors</h4>
        <div className="grid grid-cols-3 gap-3">
          {[
            { key: 'primary_color', label: 'Primary' },
            { key: 'secondary_color', label: 'Secondary' },
            { key: 'accent_color', label: 'Accent' },
            { key: 'header_bg_color', label: 'Header BG' },
            { key: 'header_text_color', label: 'Header Text' },
            { key: 'text_color', label: 'Body Text' },
          ].map(c => (
            <div key={c.key}>
              <label className="block text-[10px] text-gray-500 mb-1">{c.label}</label>
              <div className="flex items-center gap-2">
                <input type="color" value={settings[c.key] || '#1A237E'} onChange={e => updateField(c.key, e.target.value)} className="w-8 h-8 rounded border border-gray-200 cursor-pointer" />
                <input value={settings[c.key] || ''} onChange={e => updateField(c.key, e.target.value)} placeholder="#1A237E" className="flex-1 px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#1A237E]/30" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button onClick={() => onSave({
          result_orientation: settings.result_orientation,
          result_paper_size: settings.result_paper_size,
          logo_position: settings.logo_position,
          font_family: settings.font_family,
          result_header_text: settings.result_header_text,
          result_footer_text: settings.result_footer_text,
          result_watermark_text: settings.result_watermark_text,
          primary_color: settings.primary_color,
          secondary_color: settings.secondary_color,
          accent_color: settings.accent_color,
          header_bg_color: settings.header_bg_color,
          header_text_color: settings.header_text_color,
          text_color: settings.text_color,
        })} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-[#1A237E] text-white rounded-lg text-sm font-medium hover:bg-[#283593] transition disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : 'Save Layout'}
        </button>
      </div>
    </div>
  )
}

function DisplayTab({ settings, updateField, onSave, saving }: any) {
  const toggles = [
    { key: 'show_position', label: 'Show Position', desc: 'Display class position on result sheet' },
    { key: 'show_grade_only', label: 'Grade Only', desc: 'Show grades instead of scores' },
    { key: 'show_cumulative', label: 'Cumulative Average', desc: 'Show cumulative session average' },
    { key: 'show_student_passport_on_result', label: 'Student Passport', desc: 'Show student photo on result' },
    { key: 'show_school_stamp', label: 'School Stamp', desc: 'Show school stamp on result' },
    { key: 'show_barcode', label: 'Barcode', desc: 'Show barcode for verification' },
    { key: 'show_teacher_comment', label: 'Teacher Comment', desc: 'Show teacher comment field' },
    { key: 'show_principal_comment', label: 'Principal Comment', desc: 'Show principal comment field' },
    { key: 'show_conduct', label: 'Conduct', desc: 'Show conduct rating' },
    { key: 'show_attendance_summary', label: 'Attendance Summary', desc: 'Show days present/absent' },
    { key: 'show_grading_key', label: 'Grading Key', desc: 'Show grading key legend' },
    { key: 'auto_compute_positions', label: 'Auto Compute Positions', desc: 'Automatically calculate positions on publish' },
  ]

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-3 max-w-2xl">
      <h3 className="text-sm font-semibold text-gray-700 mb-2">Display Options</h3>
      {toggles.map(t => (
        <div key={t.key} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
          <div>
            <p className="text-sm font-medium text-gray-800">{t.label}</p>
            <p className="text-xs text-gray-500">{t.desc}</p>
          </div>
          <button
            onClick={() => updateField(t.key, !settings[t.key])}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${settings[t.key] ? 'bg-[#1A237E]' : 'bg-gray-300'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${settings[t.key] ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
      ))}
      <div className="flex justify-end pt-2">
        <button onClick={() => onSave(Object.fromEntries(toggles.map(t => [t.key, settings[t.key]])))} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-[#1A237E] text-white rounded-lg text-sm font-medium hover:bg-[#283593] transition disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : 'Save Display'}
        </button>
      </div>
    </div>
  )
}
