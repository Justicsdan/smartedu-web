import { useState, useEffect, useCallback, useMemo, Fragment } from 'react'
import { dbProxy } from '../../lib/dbProxy'
import { useAuth } from '../../contexts/AuthContext'
import { printReportCard } from '../../lib/printReportCard'
import { printAceReportCard } from '../../lib/printAceReportCard'
import {
  Award, BookOpen, TrendingUp, Target, Loader2, AlertCircle, RefreshCw,
  Printer, Calendar, GraduationCap, ClipboardList, MessageSquare, Star,
} from 'lucide-react'

function pickString(record: any, ...keys: string[]): string {
  for (const k of keys) {
    const v = record?.[k]
    if (v !== null && v !== undefined && String(v).trim() !== '') return String(v).trim()
  }
  return ''
}

function pickNumber(record: any, ...keys: string[]): number {
  for (const k of keys) {
    const v = record?.[k]
    if (v !== null && v !== undefined && !isNaN(Number(v))) return Number(v)
  }
  return 0
}

function parseScoresJson(raw: any): Record<string, number> {
  if (!raw) return {}
  if (typeof raw === 'object') return raw as Record<string, number>
  try { return JSON.parse(String(raw)) } catch { return {} }
}

function getGradeColor(grade: string): string {
  const g = (grade || '').toUpperCase()
  if (g.startsWith('A') || ['A1', 'A2', 'A3', 'B1', 'B2', 'B3'].includes(g)) return '#10b981'
  if (g.startsWith('B') || g.startsWith('C') || ['C4', 'C5', 'C6'].includes(g)) return '#3b82f6'
  if (g.startsWith('D') || ['D7', 'E8'].includes(g)) return '#f59e0b'
  if (g.startsWith('F') || g === 'F9' || g === 'F') return '#ef4444'
  return '#64748b'
}

function ratingColor(val: string): string {
  const v = (val || '').toLowerCase()
  if (v === 'excellent') return '#10b981'
  if (v === 'very good') return '#3b82f6'
  if (v === 'good') return '#0891b2'
  if (v === 'fair') return '#f59e0b'
  if (v === 'poor') return '#ef4444'
  return '#64748b'
}

function StatCard({ icon: Icon, label, value, sub, accent }: {
  icon: any; label: string; value: string; sub?: string; accent: string
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 sm:p-4">
      <div className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-white mb-2.5"
        style={{ backgroundColor: accent }}>
        <Icon size={16} strokeWidth={2.2} />
      </div>
      <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{value}</div>
      <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">{label}</div>
      {sub && <div className="text-[11px] text-slate-400 mt-0.5">{sub}</div>}
    </div>
  )
}

export default function StudentResultsPage() {
  const { user } = useAuth() as { user: any }
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [scores, setScores] = useState<any[]>([])
  const [subjects, setSubjects] = useState<any[]>([])
  const [summaries, setSummaries] = useState<any[]>([])
  const [comments, setComments] = useState<any[]>([])
  const [ratings, setRatings] = useState<any[]>([])
  const [terms, setTerms] = useState<any[]>([])
  const [settings, setSettings] = useState<any>(null)
  const [classInfo, setClassInfo] = useState<any>(null)
  const [student, setStudent] = useState<any>(null)
  const [schoolInfo, setSchoolInfo] = useState<any>(null)
  const [selectedTermId, setSelectedTermId] = useState<string>('')
  const [curriculumMode, setCurriculumMode] = useState<string>('traditional')
  const [acePaceScores, setAcePaceScores] = useState<any[]>([])
  const [aceTermReport, setAceTermReport] = useState<any>(null)
  const studentId = user?.id || user?.student_id || user?.studentId || ''
  const schoolId = user?.school_id || user?.schoolId || ''

  const loadAll = useCallback(async () => {
    if (!user) return
    setLoading(true); setError('')
    try {
      let stu: any = user
      setStudent(stu)

      // Batched fetches (3 at a time) — much faster than sequential, avoids 429
      const allTasks: Array<{key: string, promise: Promise<any>}> = [
        { key: 'scores', promise: dbProxy.from('scores').select('*').eq('student_id', studentId || stu.id).order('created_at', { ascending: false }) },
        { key: 'subjects', promise: dbProxy.from('subjects').select('*').eq('school_id', schoolId || stu.school_id).order('name') },
        { key: 'summaries', promise: dbProxy.from('student_term_summaries').select('*').eq('student_id', studentId || stu.id).order('created_at', { ascending: false }) },
        { key: 'comments', promise: dbProxy.from('term_comments').select('*').eq('student_id', studentId || stu.id).order('created_at', { ascending: false }) },
        { key: 'ratings', promise: dbProxy.from('student_behavioural_ratings').select('*').eq('student_id', studentId || stu.id).order('created_at', { ascending: false }) },
        { key: 'paceScores', promise: dbProxy.from('ace_pace_scores').select('*').eq('student_id', studentId || stu.id).order('created_at', { ascending: false }) },
        { key: 'aceReports', promise: dbProxy.from('ace_term_reports').select('*').eq('student_id', studentId || stu.id).order('created_at', { ascending: false }) },
        { key: 'terms', promise: dbProxy.from('terms').select('*').eq('school_id', schoolId || stu.school_id).order('name') },
        { key: 'school', promise: dbProxy.from('schools').select('id, name, logo_url, motto, address, official_phone, official_email').eq('id', schoolId || stu.school_id).maybeSingle() },
        { key: 'settings', promise: dbProxy.from('school_settings').select('*').eq('school_id', schoolId || stu.school_id).maybeSingle() },
      ]
      if (stu.class_id) {
        allTasks.push({ key: 'class', promise: dbProxy.from('classes').select('*').eq('id', stu.class_id).maybeSingle() })
      }
      const seqResults: any[] = []
      for (let i = 0; i < allTasks.length; i += 3) {
        const batch = allTasks.slice(i, i + 3)
        const batchResults = await Promise.all(
          batch.map(async (t: any) => {
            try { const res = await t.promise; return { key: t.key, res } }
            catch (e) { console.warn(`load: ${t.key} error:`, e); return { key: t.key, res: { error: e } } }
          })
        )
        seqResults.push(...batchResults)
      }
      let termsData: any[] = []
      let aceReportsData: any[] = []
      seqResults.forEach((item: any) => {
        const key = item.key
        const res = item.res
        if (res.error) { console.warn(`load: ${key} error:`, res.error); return }
        const data = res.data
        if (key === 'scores') setScores(data || [])
        else if (key === 'subjects') setSubjects(data || [])
        else if (key === 'summaries') setSummaries(data || [])
        else if (key === 'comments') setComments(data || [])
        else if (key === 'ratings') setRatings(data || [])
        else if (key === 'paceScores') setAcePaceScores(data || [])
        else if (key === 'aceReports') { aceReportsData = data || []; setAceTermReport(aceReportsData[0] || null) }
        else if (key === 'terms') { setTerms(data || []); termsData = data || [] }
        else if (key === 'school') setSchoolInfo(data)
        else if (key === 'settings') { setSettings(data); if (data?.curriculum_mode) setCurriculumMode(data.curriculum_mode) }
        else if (key === 'class') setClassInfo(data)
      })
      const currentTerm = termsData.find((t: any) => t.is_current)
      setSelectedTermId(currentTerm?.id || '')
    } catch (e: any) {
      console.error('Results load error:', e)
      setError(e?.message || 'Failed to load results')
    } finally { setLoading(false) }
  }, [user, studentId, schoolId])

  useEffect(() => { loadAll() }, [loadAll])

  const subjectMap = useMemo(() => {
    const m: Record<string, any> = {}
    subjects.forEach((s) => { m[s.id] = s })
    return m
  }, [subjects])

  const publishedSummaries = useMemo(() => summaries.filter((s) => s.is_published), [summaries])
  const publishedTermIds = useMemo(() => new Set(publishedSummaries.map((s) => s.term_id).filter(Boolean)), [publishedSummaries])
  const termScores = useMemo(() => {
    if (!selectedTermId) return scores
    return scores.filter((s) => s.term_id === selectedTermId)
  }, [scores, selectedTermId])

  // ACE: filter PACE scores + term report by selected term
  const visiblePaceScores = useMemo(() => {
    if (!selectedTermId) return acePaceScores
    return acePaceScores.filter((p: any) => p.term_id === selectedTermId)
  }, [acePaceScores, selectedTermId])

  const currentAceReport = useMemo(() => {
    if (!aceTermReport) return null
    if (!selectedTermId) return aceTermReport
    return aceTermReport.term_id === selectedTermId ? aceTermReport : null
  }, [aceTermReport, selectedTermId])
  const visibleScores = useMemo(() => termScores.filter((s) => !s.term_id || publishedTermIds.has(s.term_id)), [termScores, publishedTermIds])
  const currentSummary = useMemo(() => {
    if (!selectedTermId) return publishedSummaries[0] || null
    return publishedSummaries.find((s) => s.term_id === selectedTermId) || null
  }, [publishedSummaries, selectedTermId])
  const currentComment = useMemo(() => {
    if (!selectedTermId) return comments[0] || null
    return comments.find((c) => c.term_id === selectedTermId) || null
  }, [comments, selectedTermId])
  const currentRatings = useMemo(() => {
    if (!selectedTermId) return ratings[0] || null
    return ratings.find((r) => r.term_id === selectedTermId) || null
  }, [ratings, selectedTermId])

  const assessmentTypes = useMemo(() => {
    const raw = settings?.assessment_types
    if (!raw) return ['CA1', 'CA2', 'Assignment', 'Mid-term', 'Exam']
    if (Array.isArray(raw)) return raw
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw)
        return Array.isArray(parsed) ? parsed : [raw]
      } catch {
        return raw.split(/[,;]/).map((s: string) => s.trim()).filter(Boolean)
      }
    }
    return ['CA1', 'CA2', 'Assignment', 'Mid-term', 'Exam']
  }, [settings])

  const gradingSystem = useMemo(() => {
    const raw = settings?.grading_system
    if (!raw) return []
    if (Array.isArray(raw)) return raw
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw)
        return Array.isArray(parsed) ? parsed : []
      } catch { return [] }
    }
    return []
  }, [settings])

  const behavioralFields = useMemo(() => {
    const parseLabels = (raw: any): Record<string, string> => {
      if (!raw) return {}
      if (typeof raw === 'object') return raw
      try { return JSON.parse(String(raw)) } catch { return {} }
    }
    const labels = parseLabels(settings?.behavioral_labels)
    return [
      { key: 'punctuality', label: labels.punctuality || 'Punctuality' },
      { key: 'relationship_with_others', label: labels.relationship_with_others || 'Relationship with Others' },
      { key: 'attendance_in_class', label: labels.attendance_in_class || 'Attendance in Class' },
      { key: 'games_sports', label: labels.games_sports || 'Games/Sports' },
      { key: 'attentiveness_in_class', label: labels.attentiveness_in_class || 'Attentiveness in Class' },
      { key: 'handling_tools_lab_workshops', label: labels.handling_tools_lab_workshops || 'Handling Tools, Lab. & Workshops' },
      { key: 'carrying_out_assignments', label: labels.carrying_out_assignments || 'Carrying out Assignments' },
      { key: 'participation_in_school_activities', label: labels.participation_in_school_activities || 'Participation in School Activities' },
      { key: 'neatness', label: labels.neatness || 'Neatness' },
      { key: 'honesty', label: labels.honesty || 'Honesty' },
      { key: 'self_control', label: labels.self_control || 'Self-Control' },
    ]
  }, [settings])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-slate-600">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          <span className="text-sm font-medium">Loading results…</span>
        </div>
      </div>
    )
  }

  const subjectMax = settings?.subject_max_score || 100
  const passMark = settings?.pass_mark || 40
  const currentTermName = terms.find((t) => t.id === selectedTermId)?.name || 'Current Term'
  const displayName = [student?.first_name, student?.middle_name, student?.last_name].filter(Boolean).join(' ').trim() || 'Student'
  const admissionNo = pickString(student, 'admission_no')
  const studentClass = classInfo ? (classInfo.name + (classInfo.section ? ' ' + classInfo.section : '')) : (student?.class_name || '')

  const handleAcePrint = () => {
    printAceReportCard({
      schoolName: schoolInfo?.name || student?.school_name || 'SmartEdu School',
      schoolMotto: schoolInfo?.motto || '',
      schoolLogo: schoolInfo?.logo_url || '',
      schoolAddress: schoolInfo?.address || '',
      studentName: displayName,
      admissionNo,
      sessionName: '',
      termName: currentTermName,
      passportUrl: student?.passport_url || '',
      paceScores: visiblePaceScores.map((p: any) => ({
        subject_id: p.subject_id,
        pace_no: p.pace_no,
        pt_score: p.pt_score !== null && p.pt_score !== undefined ? Number(p.pt_score) : null,
      })),
      subjects: subjects.map((s: any) => ({ id: s.id, name: s.name })),
      report: currentAceReport ? {
        reading_wpm: currentAceReport.reading_wpm,
        reading_comprehension: currentAceReport.reading_comprehension,
        reading_composite: currentAceReport.reading_composite,
        paces_completed: currentAceReport.paces_completed,
        paces_avg: currentAceReport.paces_avg,
        paces_total: currentAceReport.paces_total,
        day_in_term: currentAceReport.day_in_term,
        days_absent: currentAceReport.days_absent,
        supervisor_comment: currentAceReport.supervisor_comment,
        principal_comment: currentAceReport.principal_comment,
        hacs_score: currentAceReport.hacs_score,
        nce_score: currentAceReport.nce_score,
        total_score: currentAceReport.total_score,
      } : null,
    })
  }

  const handlePrint = () => {
    if (curriculumMode === 'ace') {
      handleAcePrint()
      return
    }
    const totalSubjects = visibleScores.length
    const totalScore = visibleScores.reduce((sum, sc) => sum + pickNumber(sc, 'total'), 0)
    const averageScore = totalSubjects > 0 ? (totalScore / totalSubjects).toFixed(2) : '0'
    const passed = visibleScores.filter((sc) => pickNumber(sc, 'total') >= passMark).length
    const failed = totalSubjects - passed

    printReportCard({
      schoolName: schoolInfo?.name || student?.school_name || 'SmartEdu School',
      schoolMotto: schoolInfo?.motto || '',
      schoolLogo: schoolInfo?.logo_url || '',
      schoolAddress: schoolInfo?.address || '',
      schoolPhone: schoolInfo?.official_phone || '',
      schoolEmail: schoolInfo?.official_email || '',
      principalName: settings?.principal_name || '',
      principalSignatureUrl: '',
      schoolStampUrl: '',
      passportUrl: student?.passport_url || '',
      reportTitle: currentTermName,
      sessionName: '',
      studentName: displayName,
      admissionNo,
      studentClass,
      gender: student?.gender || '',
      position: currentSummary?.position ? (currentSummary.position + ' of ' + (currentSummary.position_out_of || totalSubjects)) : '—',
      positionOutOf: currentSummary?.position_out_of || totalSubjects || '—',
      totalScore,
      averageScore,
      grade: currentSummary?.grade || '',
      totalSubjects,
      passed,
      failed,
      daysPresent: currentSummary?.days_present ?? 0,
      daysAbsent: currentSummary?.days_absent ?? 0,
      teacherComment: currentComment?.teacher_comment || '',
      principalComment: currentComment?.principal_comment || '',
      assessmentHeaders: assessmentTypes.map((a: any, i: number) => {
        const aStr = typeof a === 'string' ? a : (a?.name || a?.id || `col${i}`)
        const max = typeof a === 'object' ? (a?.max || 0) : 0
        return { id: aStr.toLowerCase().replace(/[\s-]/g, '_'), name: aStr, max }
      }),
      scoreRows: visibleScores.map((sc) => {
        const subj = subjectMap[sc.subject_id]
        const scoresJson = parseScoresJson(sc.scores_json)
        const total = pickNumber(sc, 'total')
        const grade = pickString(sc, 'grade')
        const isPass = total >= passMark
        const gradeEntry = gradingSystem.find((g: any) => (g.grade || g.name) === grade)
        const remark = gradeEntry?.remark || (isPass ? 'Pass' : 'Fail')
        return {
          subject: subj?.name || subj?.code || 'Subject',
          cells: assessmentTypes.map((a: any) => {
            const aStr = typeof a === 'string' ? a : (a?.id || a?.name || '')
            const colKey = aStr.toLowerCase().replace(/[\s-]/g, '_')
            return scoresJson[colKey] ?? scoresJson[aStr] ?? '—'
          }),
          total,
          grade,
          remark,
          isPass,
        }
      }),
      behavioralRows: behavioralFields.map((f) => ({
        label: f.label,
        value: currentRatings?.[f.key] || '—',
        color: ratingColor(currentRatings?.[f.key] || ''),
      })),
      gradingScale: gradingSystem.map((g: any) => ({
        grade: g.grade || g.name || '',
        range: (g.min || g.lower_bound || 0) + ' – ' + (g.max || g.upper_bound || 100),
        remark: g.remark || '',
      })),
      primaryColor: settings?.primary_color || '#0d47a1',
    })
  }

  return (
    <div className="px-3 sm:px-4 lg:px-6 py-4 sm:py-6 max-w-5xl mx-auto space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">My Results</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">{currentTermName} {curriculumMode === 'ace' && <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-violet-100 text-violet-700">ACE Mode</span>}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadAll}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-slate-200 hover:border-slate-300 transition text-sm font-semibold text-slate-700">
            <RefreshCw size={14} strokeWidth={2.2} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button onClick={handlePrint} disabled={!currentSummary && curriculumMode !== 'ace'}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 transition text-white font-semibold text-sm shadow-sm disabled:opacity-50">
            <Printer size={14} strokeWidth={2.4} /><span>Print Report</span>
          </button>
        </div>
      </div>

      {(() => {
        // Build list of terms that have data (published summaries for Traditional, PACE scores or ACE reports for ACE)
        const termsWithData = new Set<string>()
        if (curriculumMode === 'ace') {
          acePaceScores.forEach((p: any) => { if (p.term_id) termsWithData.add(p.term_id) })
          // Also include terms from ace_term_reports (use the loaded aceReports data)
          // aceTermReport is already filtered, but we need all reports — let's use the raw data
          // Actually we set aceTermReport to only the first one. Let's check acePaceScores for all term_ids
        } else {
          publishedSummaries.forEach((s: any) => { if (s.term_id) termsWithData.add(s.term_id) })
        }
        if (termsWithData.size === 0) return null
        // Sort terms by session then name
        const sortedTerms = terms
          .filter((t: any) => termsWithData.has(t.id))
          .slice()
          .sort((a: any, b: any) => {
            // Sort by session_id first, then by name
            if (a.session_id !== b.session_id) return String(a.session_id || '').localeCompare(String(b.session_id || ''))
            return String(a.name || '').localeCompare(String(b.name || ''))
          })
        return (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-500 mr-1">View results for:</span>
            {sortedTerms.map((term: any) => {
              const isActive = selectedTermId === term.id
              return (
                <button key={term.id} onClick={() => setSelectedTermId(term.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    isActive ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-white border border-slate-200 text-slate-700 hover:border-emerald-400'
                  }`}>
                  {term?.name || 'Term'}
                </button>
              )
            })}
          </div>
        )
      })()}

      {error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-800">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <div className="font-semibold">Couldn't load results</div>
            <div className="text-red-700/90 text-xs mt-0.5">{error}</div>
          </div>
        </div>
      )}

      {currentSummary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={TrendingUp} label="Average" value={String(currentSummary.average_score ?? '—')} accent="#10b981" />
          <StatCard icon={Award} label="Position" value={currentSummary.position ? `${currentSummary.position}/${currentSummary.position_out_of}` : '—'} accent="#3b82f6" />
          <StatCard icon={BookOpen} label="Subjects" value={String(currentSummary.subjects_taken ?? visibleScores.length)} accent="#f59e0b" />
          <StatCard icon={Target} label="Grade" value={currentSummary.grade || '—'} accent="#8b5cf6" />
        </div>
      )}

      {curriculumMode === 'ace' ? (
        <>
          {/* ACE PACE Scores Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center gap-3">
              <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center text-violet-700">
                <BookOpen size={18} strokeWidth={2.2} />
              </div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">PACE Scores</h3>
              <span className="ml-auto text-xs text-slate-500">{acePaceScores.length} PACEs completed</span>
            </div>
            {visiblePaceScores.length === 0 ? (
              <div className="p-8 text-center">
                <ClipboardList size={32} className="text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No PACE scores recorded for this term.</p>
              </div>
            ) : (() => {
              // Group PACE scores by subject (like the PDF does)
              const bySubject: Record<string, any[]> = {}
              visiblePaceScores.forEach((sc: any) => {
                const sid = sc.subject_id || ''
                if (!bySubject[sid]) bySubject[sid] = []
                bySubject[sid].push(sc)
              })
              // Sort subjects: Math first, English second, then alphabetical
              const sortedSubjects = Object.keys(bySubject).sort((a, b) => {
                const an = (subjectMap[a]?.name || '').toLowerCase()
                const bn = (subjectMap[b]?.name || '').toLowerCase()
                if (an.includes('math')) return -1
                if (bn.includes('math')) return 1
                if (an.includes('english')) return -1
                if (bn.includes('english')) return 1
                return an.localeCompare(bn)
              })
              const maxP = Math.max(...sortedSubjects.map(sid => bySubject[sid].length))
              return (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left px-4 py-3 font-bold text-slate-700 uppercase text-[11px] tracking-wider">Subject</th>
                        {Array.from({ length: maxP }).map((_, i) => (
                          <Fragment key={i}>
                            <th className="text-center px-2 py-3 font-bold text-slate-700 uppercase text-[10px] tracking-wider">P{i + 1} No.</th>
                            <th className="text-center px-2 py-3 font-bold text-slate-700 uppercase text-[10px] tracking-wider">PT</th>
                          </Fragment>
                        ))}
                        <th className="text-center px-3 py-3 font-bold text-slate-700 uppercase text-[11px] tracking-wider">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sortedSubjects.map((sid, idx) => {
                        const subj = subjectMap[sid]
                        const name = subj?.name || subj?.code || 'Subject'
                        const scores = bySubject[sid].slice().sort((a: any, b: any) => String(a.pace_no || '').localeCompare(String(b.pace_no || '')))
                        const validPts = scores.filter((s: any) => s.pt_score !== null && s.pt_score !== undefined).map((s: any) => Number(s.pt_score))
                        const total = validPts.length > 0 ? validPts.reduce((a: number, b: number) => a + b, 0) : 0
                        const totalColor = total < 80 ? 'text-red-700' : 'text-emerald-700'
                        return (
                          <tr key={sid} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}>
                            <td className="px-4 py-3 font-semibold text-slate-900">{name}</td>
                            {Array.from({ length: maxP }).map((_, i) => {
                              const sc = scores[i]
                              if (!sc) {
                                return (
                                  <Fragment key={i}>
                                    <td className="text-center px-2 py-3 text-slate-300">—</td>
                                    <td className="text-center px-2 py-3 text-slate-300">—</td>
                                  </Fragment>
                                )
                              }
                              const pt = sc.pt_score !== null && sc.pt_score !== undefined ? Number(sc.pt_score) : null
                              const isPass = pt !== null && pt >= 80
                              return (
                                <Fragment key={i}>
                                  <td className="text-center px-2 py-3 text-slate-600 font-mono text-xs">{sc.pace_no || '—'}</td>
                                  <td className={`text-center px-2 py-3 font-bold ${pt !== null ? (isPass ? 'text-slate-900' : 'text-red-700') : 'text-slate-300'}`}>{pt !== null ? pt : '—'}</td>
                                </Fragment>
                              )
                            })}
                            <td className={`text-center px-3 py-3 font-bold ${totalColor}`}>{total}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )
            })()}
          </div>

          {/* ACE Term Report Summary */}
          {currentAceReport && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center gap-3">
                <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700">
                  <Award size={18} strokeWidth={2.2} />
                </div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">Term Report Summary</h3>
                <span className={`ml-auto text-xs font-bold px-2 py-1 rounded ${currentAceReport.is_published ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {currentAceReport.is_published ? 'PUBLISHED' : 'DRAFT'}
                </span>
              </div>

              {/* Scores Section */}
              <div className="p-5">
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Scores</div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-center">
                    <div className="text-[10px] uppercase tracking-wider font-bold text-blue-600">HACS Score</div>
                    <div className="text-2xl font-bold text-blue-700 mt-1">{currentAceReport.hacs_score ?? '—'}</div>
                  </div>
                  <div className="bg-orange-50 border border-orange-100 rounded-lg p-3 text-center">
                    <div className="text-[10px] uppercase tracking-wider font-bold text-orange-600">NCE Score</div>
                    <div className="text-2xl font-bold text-orange-600 mt-1">{currentAceReport.nce_score ?? '—'}</div>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 text-center">
                    <div className="text-[10px] uppercase tracking-wider font-bold text-emerald-600">Total Score</div>
                    <div className="text-2xl font-bold text-emerald-600 mt-1">{currentAceReport.total_score ?? '—'}</div>
                  </div>
                  <div className="bg-violet-50 border border-violet-100 rounded-lg p-3 text-center">
                    <div className="text-[10px] uppercase tracking-wider font-bold text-violet-600">PACEs Avg</div>
                    <div className="text-2xl font-bold text-violet-600 mt-1">{currentAceReport.paces_avg ?? '—'}</div>
                  </div>
                </div>
              </div>

              {/* Attendance Section — only show if data exists */}
              {(currentAceReport.day_in_term != null || currentAceReport.days_absent != null) && (
                <div className="px-5 pb-4">
                  <div className="border-t border-slate-100 pt-3">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Attendance</div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 flex items-center justify-between">
                        <span className="text-xs text-slate-600 font-medium">Days in Term</span>
                        <span className="text-sm font-bold text-slate-900">{currentAceReport.day_in_term ?? '—'}</span>
                      </div>
                      <div className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 flex items-center justify-between">
                        <span className="text-xs text-slate-600 font-medium">Days Absent</span>
                        <span className="text-sm font-bold text-slate-900">{currentAceReport.days_absent ?? '—'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Reading Progress Section — only show if any reading metric has a value > 0 */}
              {((currentAceReport.reading_wpm && Number(currentAceReport.reading_wpm) > 0) ||
                (currentAceReport.reading_comprehension && Number(currentAceReport.reading_comprehension) > 0) ||
                (currentAceReport.reading_composite && Number(currentAceReport.reading_composite) > 0)) && (
                <div className="px-5 pb-4">
                  <div className="border-t border-slate-100 pt-3">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Reading Progress</div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 flex items-center justify-between">
                        <span className="text-xs text-slate-600 font-medium">WPM</span>
                        <span className="text-sm font-bold text-slate-900">{currentAceReport.reading_wpm ?? '—'}</span>
                      </div>
                      <div className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 flex items-center justify-between">
                        <span className="text-xs text-slate-600 font-medium">Comprehension</span>
                        <span className="text-sm font-bold text-slate-900">{currentAceReport.reading_comprehension ?? '—'}</span>
                      </div>
                      <div className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 flex items-center justify-between">
                        <span className="text-xs text-slate-600 font-medium">Composite</span>
                        <span className="text-sm font-bold text-slate-900">{currentAceReport.reading_composite ?? '—'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ACE Comments */}
          {currentAceReport && (currentAceReport.supervisor_comment || currentAceReport.principal_comment) && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700">
                  <MessageSquare size={18} strokeWidth={2.2} />
                </div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">Comments</h3>
              </div>
              {currentAceReport.supervisor_comment && (
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Supervisor's Comment</div>
                  <p className="text-sm text-slate-700 italic">"{currentAceReport.supervisor_comment}"</p>
                </div>
              )}
              {currentAceReport.principal_comment && (
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Principal's Comment</div>
                  <p className="text-sm text-slate-700 italic">"{currentAceReport.principal_comment}"</p>
                </div>
              )}
            </div>
          )}
        </>
      ) : visibleScores.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <ClipboardList size={32} className="text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No scores published for this term.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center gap-3">
            <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
              <BookOpen size={18} strokeWidth={2.2} />
            </div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">Subject Scores</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-bold text-slate-700 uppercase text-[11px] tracking-wider">Subject</th>
                  {assessmentTypes.map((a: any, i: number) => {
                    const aStr = typeof a === 'string' ? a : (a?.name || a?.id || `col${i}`)
                    return (
                      <th key={i} className="text-center px-3 py-3 font-bold text-slate-700 uppercase text-[11px] tracking-wider">{aStr}</th>
                    )
                  })}
                  <th className="text-center px-3 py-3 font-bold text-slate-700 uppercase text-[11px] tracking-wider">Total</th>
                  <th className="text-center px-3 py-3 font-bold text-slate-700 uppercase text-[11px] tracking-wider">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleScores.map((sc, i) => {
                  const subj = subjectMap[sc.subject_id]
                  const name = subj?.name || subj?.code || 'Subject'
                  const scoresJson = parseScoresJson(sc.scores_json)
                  const total = pickNumber(sc, 'total')
                  const grade = pickString(sc, 'grade')
                  const isPass = total >= passMark
                  return (
                    <tr key={i} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-semibold text-slate-900">{name}</td>
                      {assessmentTypes.map((a: any, j: number) => {
                        const aStr = typeof a === 'string' ? a : (a?.id || a?.name || '')
                        const colKey = aStr.toLowerCase().replace(/[\s-]/g, '_')
                        const val = scoresJson[colKey] ?? scoresJson[aStr] ?? '—'
                        return <td key={j} className="text-center px-3 py-3 text-slate-700">{val}</td>
                      })}
                      <td className="text-center px-3 py-3">
                        <span className={`font-bold ${isPass ? 'text-emerald-700' : 'text-red-700'}`}>{total}</span>
                        <span className="text-slate-400 text-xs">/{subjectMax}</span>
                      </td>
                      <td className="text-center px-3 py-3">
                        <span className="inline-flex items-center justify-center px-2 py-1 rounded-md text-xs font-bold text-white"
                          style={{ backgroundColor: getGradeColor(grade) }}>
                          {grade || (isPass ? 'P' : 'F')}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {currentRatings && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center gap-3">
            <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center text-violet-700">
              <Star size={18} strokeWidth={2.2} />
            </div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">Behavioral Ratings</h3>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {behavioralFields.map((f) => {
              const val = currentRatings?.[f.key] || '—'
              return (
                <div key={f.key} className="flex items-center justify-between p-3 rounded-lg bg-slate-50/60 border border-slate-100">
                  <span className="text-sm text-slate-700">{f.label}</span>
                  <span className="text-xs font-bold px-2 py-1 rounded text-white"
                    style={{ backgroundColor: ratingColor(val) }}>{val}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {currentComment && (currentComment.teacher_comment || currentComment.principal_comment) && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700">
              <MessageSquare size={18} strokeWidth={2.2} />
            </div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">Comments</h3>
          </div>
          {currentComment.teacher_comment && (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Teacher's Comment</div>
              <p className="text-sm text-slate-700 italic">"{currentComment.teacher_comment}"</p>
            </div>
          )}
          {currentComment.principal_comment && (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Principal's Comment</div>
              <p className="text-sm text-slate-700 italic">"{currentComment.principal_comment}"</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
