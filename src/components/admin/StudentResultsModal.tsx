import { useState, useEffect, useMemo } from "react"
import { dbProxy } from '../../lib/dbProxy'
import {
  getDefaultGradingSystem, getDefaultAssessmentTypes, getGradeFromSystem,
  getGradingSystemForTier, getAssessmentTypesForTier, isPassingGrade,
  behavioralFieldKeys, behavioralFieldLabels,
  type GradeBand, type AssessmentType,
} from '../../utils/gradingUtils'
import {
  X, Eye, AlertTriangle, Award, TrendingUp, FileText, Printer,
} from 'lucide-react'

interface Student {
  id: string
  admission_no: string
  first_name: string
  middle_name: string | null
  last_name: string
  class_id: string | null
  passport_url: string | null
  gender: string | null
}

interface ScoreRow {
  id: string
  total: number | null
  grade: string | null
  scores_json: Record<string, any> | null
  subject: { name: string; code: string } | null
}

interface Behavioral {
  punctuality: string | null
  relationship_with_others: string | null
  attendance_in_class: string | null
  games_sports: string | null
  attentiveness_in_class: string | null
  handling_tools_lab_workshops: string | null
  carrying_out_assignments: string | null
  participation_in_school_activities: string | null
  neatness: string | null
  honesty: string | null
  self_control: string | null
}

interface TermComments {
  teacher_comment: string | null
  principal_comment: string | null
}

interface Summary {
  total_score: number | null
  average_score: number | null
  grade: string | null
  position: number | null
  position_out_of: number | null
  days_present: number | null
  days_absent: number | null
  is_published: boolean | null
}

interface SchoolInfo {
  name: string
  logo_url: string | null
  motto: string | null
  address: string | null
  official_phone: string | null
  official_email: string | null
  principal_signature_url: string | null
  school_stamp_url: string | null
}

const BEHAVIORAL_FIELDS = behavioralFieldKeys.map(k => ({ key: k as keyof Behavioral, label: behavioralFieldLabels[k] }))

const ordinal = (n: number) => {
  if (n <= 0) return ''
  const r = n % 100
  if (r >= 11 && r <= 13) return n + 'th'
  switch (n % 10) {
    case 1: return n + 'st'
    case 2: return n + 'nd'
    case 3: return n + 'rd'
    default: return n + 'th'
  }
}

// Resolve assessment type IDs to scores_json keys (matches Flutter _resolveKeys)
const resolveKeys = (assessments: AssessmentType[], sj: Record<string, any>): string[] => {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
  const dataKeys = Object.keys(sj)
  const result: string[] = []
  for (const at of assessments) {
    const aid = norm(at.id)
    let matched = ''
    if (sj[aid] !== undefined) {
      matched = aid
    } else {
      for (const k of dataKeys) {
        const nk = norm(k)
        if (nk.length >= 3 && aid.length >= 3 && (nk.startsWith(aid) || aid.startsWith(nk))) {
          matched = k
          break
        }
      }
    }
    result.push(matched)
  }
  const matchedCount = result.filter(k => k).length
  const usedKeys = new Set(result.filter(k => k))
  const unusedKeys = dataKeys.filter(k => !usedKeys.has(k))
  const unmatchedIdx: number[] = []
  for (let i = 0; i < result.length; i++) if (!result[i]) unmatchedIdx.push(i)
  if (matchedCount < result.length && unusedKeys.length === unmatchedIdx.length) {
    for (let i = 0; i < unmatchedIdx.length; i++) result[unmatchedIdx[i]] = unusedKeys[i]
  }
  return result
}

export default function StudentResultsModal({
  student,
  schoolId,
  onClose,
}: {
  student: Student
  schoolId: string
  onClose: () => void
}) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [scores, setScores] = useState<ScoreRow[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [behavioral, setBehavioral] = useState<Behavioral | null>(null)
  const [comments, setComments] = useState<TermComments | null>(null)
  const [sessionInfo, setSessionInfo] = useState<{ sessionId: string; sessionName: string; termId: string; termName: string } | null>(null)
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo | null>(null)
  const [classInfo, setClassInfo] = useState<{ name: string; section: string | null; tier: string | null } | null>(null)
  const [settings, setSettings] = useState<any>(null)
  const [behavioralLabels, setBehavioralLabels] = useState<Record<string, string>>({})
  const [printing, setPrinting] = useState(false)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: school } = await dbProxy
        .from('schools')
        .select('name, logo_url, motto, address, official_phone, official_email, principal_signature_url, school_stamp_url')
        .eq('id', schoolId)
        .maybeSingle()
      if (school) setSchoolInfo(school as any)

      if (student.class_id) {
        const { data: cls } = await dbProxy
          .from('classes')
          .select('name, section, tier')
          .eq('id', student.class_id)
          .maybeSingle()
        if (cls) setClassInfo(cls as any)
      }

      const { data: sess } = await dbProxy
        .from('academic_sessions')
        .select('id, name')
        .eq('school_id', schoolId)
        .eq('is_current', true)
        .maybeSingle()
      if (!sess) { setError('No active session found'); setLoading(false); return }

      const { data: term } = await dbProxy
        .from('terms')
        .select('id, name')
        .eq('school_id', schoolId)
        .eq('session_id', sess.id)
        .eq('is_current', true)
        .maybeSingle()
      if (!term) { setError('No active term found'); setLoading(false); return }

      setSessionInfo({ sessionId: sess.id, sessionName: sess.name, termId: term.id, termName: term.name })

      const { data: sData } = await dbProxy
        .from('school_settings')
        .select('*')
        .eq('school_id', schoolId)
        .maybeSingle()
      if (sData) {
        setSettings(sData)
        if (sData.behavioral_labels) {
          setBehavioralLabels(sData.behavioral_labels)
        }
      }

      const { data: scoreData, error: scoreErr } = await dbProxy
        .from('scores')
        .select('id, total, grade, scores_json, subject:subject_id ( name, code )')
        .eq('school_id', schoolId)
        .eq('student_id', student.id)
        .eq('session_id', sess.id)
        .eq('term_id', term.id)
      if (scoreErr) throw scoreErr
      setScores((scoreData || []) as unknown as ScoreRow[])

      const { data: sum } = await dbProxy
        .from('student_term_summaries')
        .select('total_score, average_score, grade, position, position_out_of, days_present, days_absent, is_published')
        .eq('school_id', schoolId)
        .eq('student_id', student.id)
        .eq('session_id', sess.id)
        .eq('term_id', term.id)
        .maybeSingle()
      if (sum) setSummary(sum as any)

      const { data: beh } = await dbProxy
        .from('student_behavioural_ratings')
        .select('punctuality, relationship_with_others, attendance_in_class, games_sports, attentiveness_in_class, handling_tools_lab_workshops, carrying_out_assignments, participation_in_school_activities, neatness, honesty, self_control')
        .eq('school_id', schoolId)
        .eq('student_id', student.id)
        .eq('session_id', sess.id)
        .eq('term_id', term.id)
        .maybeSingle()
      if (beh) setBehavioral(beh as any)

      const { data: com } = await dbProxy
        .from('term_comments')
        .select('teacher_comment, principal_comment')
        .eq('school_id', schoolId)
        .eq('student_id', student.id)
        .eq('session_id', sess.id)
        .eq('term_id', term.id)
        .maybeSingle()
      if (com) setComments(com as any)

      setLoading(false)
    } catch (e: any) {
      setError(e.message || 'Failed to load results')
      setLoading(false)
    }
  }

  const studentName = [student.first_name, student.middle_name, student.last_name].filter(Boolean).join(' ') || 'Student'
  const className = classInfo ? (classInfo.name + (classInfo.section ? ' ' + classInfo.section : '')) : '-'
  const tier = classInfo?.tier || 'SSS'
  const passMark = settings?.pass_mark ?? 40

  const gradingSystem: GradeBand[] = settings ? getGradingSystemForTier(tier, settings) : getDefaultGradingSystem('WAEC')
  const assessmentTypes: AssessmentType[] = settings ? getAssessmentTypesForTier(tier, settings) : getDefaultAssessmentTypes('WAEC')

  const validScores = scores.filter(s => s.total !== null && s.total !== undefined)
  const totalSum = validScores.reduce((sum, s) => sum + Number(s.total), 0)
  const avg = validScores.length > 0 ? totalSum / validScores.length : 0
  const overallGradeInfo = getGradeFromSystem(avg, gradingSystem)
  const passed = validScores.filter(s => Number(s.total) >= passMark).length
  const failed = validScores.length - passed

  const printResult = () => {
    setPrinting(true)
    try {
      const html = buildPrintHtml()
      const printWindow = window.open('', '_blank', 'width=900,height=1000')
      if (!printWindow) { alert('Please allow pop-ups to print the result'); setPrinting(false); return }
      printWindow.document.write(html)
      printWindow.document.close()
      const imgs = printWindow.document.images
      let loaded = 0
      const totalImgs = imgs.length
      const tryPrint = () => {
        try { printWindow.focus(); printWindow.print() } catch (e) { console.error('Print failed:', e) }
        setPrinting(false)
      }
      if (totalImgs === 0) { setTimeout(tryPrint, 300) }
      else {
        const checkDone = () => { loaded++; if (loaded >= totalImgs) setTimeout(tryPrint, 300) }
        for (let i = 0; i < imgs.length; i++) {
          if (imgs[i].complete) checkDone()
          else { imgs[i].onload = checkDone; imgs[i].onerror = checkDone }
        }
        setTimeout(() => { if (loaded < totalImgs) tryPrint() }, 5000)
      }
    } catch (e: any) { alert('Print failed: ' + e.message); setPrinting(false) }
  }

  const buildPrintHtml = () => {
    const schoolName = schoolInfo?.name || 'School'
    const schoolMotto = schoolInfo?.motto || ''
    const schoolAddress = schoolInfo?.address || ''
    const schoolPhone = schoolInfo?.official_phone || ''
    const schoolEmail = schoolInfo?.official_email || ''
    const schoolLogo = schoolInfo?.logo_url || ''
    const sigUrl = schoolInfo?.principal_signature_url || ''
    const stampUrl = schoolInfo?.school_stamp_url || ''
    const studentPassport = student.passport_url || ''

    const sessionName = sessionInfo?.sessionName || ''
    const termName = sessionInfo?.termName || ''

    const position = summary?.position ? ordinal(summary.position) + ' of ' + (summary.position_out_of || '?') : ''
    const daysPresent = summary?.days_present ?? ''
    const daysAbsent = summary?.days_absent ?? ''
    const totalScore = summary?.total_score ?? totalSum
    const averageScore = (summary?.average_score ?? avg).toFixed(1)
    const overallGrade = summary?.grade || overallGradeInfo.grade || ''

    const totalStr = totalScore === Math.round(totalScore) ? String(Math.round(totalScore)) : totalScore.toFixed(1)

    // Scores table rows
    const scoreRows = scores.map((s, i) => {
      const idx = i + 1
      const total = s.total !== null ? Number(s.total) : 0
      const isPass = total >= passMark
      const gradeInfo = getGradeFromSystem(total, gradingSystem)
      const sj = s.scores_json || {}
      const resolved = resolveKeys(assessmentTypes, sj)
      const txtColor = isPass ? '#1b5e20' : '#b71c1c'
      const rowColor = idx % 2 === 0 ? '#fff' : '#f2f5fc'
      const totalStr = total === Math.round(total) ? String(Math.round(total)) : total.toFixed(1)

      const cells = assessmentTypes.map((at, j) => {
        const val = sj[resolved[j]] ?? 0
        return '<td class="center">' + val + '</td>'
      }).join('')

      return `<tr style="background:${rowColor}">
        <td class="center">${idx}</td>
        <td class="subj">${(s.subject?.name || '').replace(/</g, '&lt;')}</td>
        ${cells}
        <td class="center bold" style="color:${txtColor}">${totalStr}</td>
        <td class="center bold" style="color:${txtColor}">${gradeInfo.grade}</td>
        <td class="center">${gradeInfo.remark}</td>
      </tr>`
    }).join('')

    // Grading key rows
    const gkRows = gradingSystem.map((g, i) => {
      const isFail = !isPassingGrade(g.grade, gradingSystem)
      const rowColor = i % 2 === 0 ? '#fff' : '#f2f5fc'
      const textColor = isFail ? '#b71c1c' : '#000'
      return `<tr style="background:${rowColor}">
        <td class="center bold" style="color:${textColor}">${g.grade}</td>
        <td class="center">${g.min} - ${g.max}</td>
        <td style="color:${textColor}">${g.remark}</td>
      </tr>`
    }).join('')

    // Behavioral ratings rows
    const behRows = behavioral ? BEHAVIORAL_FIELDS.map((f, i) => {
      const val = (behavioral as any)[f.key] || ''
      const label = behavioralLabels[f.key] || f.label
      const rowColor = i % 2 === 0 ? '#fff' : '#f2f5fc'
      return `<tr style="background:${rowColor}">
        <td>${label}</td>
        <td class="center bold" style="color:${val ? '#1a237e' : '#999'}">${val || '-'}</td>
      </tr>`
    }).join('') : ''

    // Comments
    const tc = comments?.teacher_comment || ''
    const pc = comments?.principal_comment || ''
    const commentSection = (tc || pc) ? `
      <table class="section-table">
        <tr class="hdr-row"><td colspan="6">COMMENTS</td></tr>
        ${tc ? `<tr><td style="padding:8px;">
          <div class="cmt-label">Class Teacher's Comment:</div>
          <div class="cmt-text">${tc.replace(/</g, '&lt;')}</div>
        </td></tr>` : ''}
        ${pc ? `<tr><td style="padding:8px;">
          <div class="cmt-label">Principal's Comment:</div>
          <div class="cmt-text">${pc.replace(/</g, '&lt;')}</div>
        </td></tr>` : ''}
      </table>
      <div style="height:10px;"></div>` : ''

    // Assessment column headers
    const assessmentHeaders = assessmentTypes.map(at => `<th>${at.name} (${at.max})</th>`).join('')
    const assessmentColWidths = assessmentTypes.map(() => '<col style="width: 8%;">').join('')

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${studentName} - Result Sheet</title>
<style>
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; margin: 0; padding: 0; font-size: 10pt; line-height: 1.4; position: relative; }
  .watermark { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 0; pointer-events: none; display: flex; align-items: center; justify-content: center; }
  .watermark img { width: 600px; height: 600px; border-radius: 50%; opacity: 0.08; object-fit: cover; }
  .content { position: relative; z-index: 1; }
  .school-header { display: flex; align-items: center; justify-content: space-between; }
  .school-info { flex: 1; text-align: center; }
  .school-name { font-size: 20pt; font-weight: bold; color: #0d47a1; letter-spacing: 1px; }
  .school-addr { font-size: 9pt; color: #555; margin-top: 2px; }
  .school-motto { font-size: 8pt; color: #777; font-style: italic; margin-top: 2px; }
  .school-contact { font-size: 8pt; color: #777; margin-top: 2px; }
  .school-logo { width: 85px; height: 85px; object-fit: contain; }
  .divider { height: 2px; background: #1a237e; margin: 8px 0; }
  .divider-thin { height: 1px; background: #ccc; margin: 4px 0; }
  .title { text-align: center; font-size: 14pt; font-weight: bold; letter-spacing: 3px; color: #1a237e; margin: 6px 0; }
  .student-row { display: flex; gap: 12px; margin: 12px 0; }
  .passport { width: 82px; height: 104px; border: 1px solid #666; object-fit: cover; }
  .passport-empty { width: 82px; height: 104px; border: 1px solid #666; display: flex; align-items: center; justify-content: center; font-size: 7pt; color: #999; }
  .info-table { flex: 1; border-collapse: collapse; }
  .info-table td { border: 0.8px solid #888; padding: 5px 8px; font-size: 9pt; }
  .info-label { background: #e8eaf6; font-weight: bold; color: #0d47a1; width: 30%; }
  table.section-table { width: 100%; border-collapse: collapse; margin-top: 8px; border: 0.8px solid #888; }
  table.section-table th, table.section-table td { border: 0.8px solid #888; padding: 4px 6px; font-size: 8pt; }
  .hdr-row { background: #1a237e; }
  .hdr-row td { color: white; font-weight: bold; text-align: center; padding: 5px; font-size: 8pt; letter-spacing: 1px; }
  .quad-table { width: 100%; border-collapse: collapse; margin-top: 8px; border: 0.8px solid #888; }
  .quad-table td { border: 0.8px solid #888; padding: 4px 6px; font-size: 8pt; }
  .quad-label { background: #e8eaf6; font-weight: bold; color: #444; width: 25%; font-size: 7.5pt; }
  .quad-val { text-align: center; font-weight: bold; font-size: 9pt; width: 25%; }
  .quad-hdr { background: #1a237e; color: white; font-weight: bold; text-align: center; padding: 4px; font-size: 8pt; letter-spacing: 1px; }
  .scores-table { width: 100%; border-collapse: collapse; margin-top: 8px; border: 0.8px solid #888; }
  .scores-table th, .scores-table td { border: 0.8px solid #888; padding: 4px 4px; font-size: 8pt; }
  .scores-table th { background: #1a237e; color: white; font-weight: bold; text-align: center; padding: 5px 4px; }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .subj { font-weight: bold; }
  .cmt-label { font-size: 8pt; font-weight: bold; color: #1a237e; }
  .cmt-text { font-size: 8pt; margin-top: 2px; }
  .signatures { display: flex; justify-content: space-between; margin-top: 32px; align-items: flex-end; }
  .sig-col { text-align: center; }
  .sig-label { font-size: 9pt; margin-bottom: 28px; }
  .sig-line { width: 130px; height: 1px; background: #666; margin: 0 auto; }
  .stamp { width: 80px; height: 80px; object-fit: contain; }
  .sig-img { width: 80px; height: 30px; object-fit: contain; margin-top: 2px; }
  .gen-date { text-align: center; font-size: 7pt; color: #999; margin-top: 12px; }
  @media print { .watermark { position: fixed; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
  ${schoolLogo ? `<div class="watermark"><img src="${schoolLogo}" onerror="this.style.display='none'"></div>` : ''}
  <div class="content">
    <div class="school-header">
      <div style="width:85px;"></div>
      <div class="school-info">
        <div class="school-name">${schoolName.toUpperCase()}</div>
        ${schoolAddress ? `<div class="school-addr">${schoolAddress}</div>` : ''}
        ${schoolMotto ? `<div class="school-motto">"${schoolMotto}"</div>` : ''}
        ${(schoolPhone || schoolEmail) ? `<div class="school-contact">${[schoolPhone ? 'Tel: ' + schoolPhone : '', schoolEmail ? 'Email: ' + schoolEmail : ''].filter(Boolean).join('  |  ')}</div>` : ''}
      </div>
      ${schoolLogo ? `<img src="${schoolLogo}" class="school-logo" onerror="this.style.display='none'">` : '<div style="width:85px;"></div>'}
    </div>
    <div class="divider"></div>
    <div class="title">STUDENT RESULT SHEET</div>
    <div class="divider-thin"></div>

    <div class="student-row">
      ${studentPassport ? `<img src="${studentPassport}" class="passport" onerror="this.outerHTML='<div class=\\'passport-empty\\'>No Photo</div>'">` : '<div class="passport-empty">No Photo</div>'}
      <table class="info-table">
        <tr><td class="info-label">Name</td><td>${studentName}</td></tr>
        <tr><td class="info-label">Admission No</td><td>${student.admission_no || ''}</td></tr>
        <tr><td class="info-label">Class</td><td>${className}</td></tr>
        <tr><td class="info-label">Session</td><td>${sessionName}</td></tr>
        <tr><td class="info-label">Term</td><td>${termName}</td></tr>
        ${position ? `<tr><td class="info-label">Position</td><td>${position}</td></tr>` : ''}
      </table>
    </div>

    <table class="quad-table">
      <tr>
        <td class="quad-hdr" colspan="2">ACADEMIC SUMMARY</td>
        <td class="quad-hdr" colspan="2">ATTENDANCE</td>
      </tr>
      <tr>
        <td class="quad-label">Subjects Taken</td>
        <td class="quad-val">${scores.length}</td>
        <td class="quad-label">Days Present</td>
        <td class="quad-val" style="color:#1a237e">${daysPresent}</td>
      </tr>
      <tr>
        <td class="quad-label">Total Score</td>
        <td class="quad-val">${totalStr}</td>
        <td class="quad-label">Days Absent</td>
        <td class="quad-val" style="color:${Number(daysAbsent) > 0 ? '#b71c1c' : '#1b5e20'}">${daysAbsent}</td>
      </tr>
      <tr>
        <td class="quad-label">Average</td>
        <td class="quad-val">${averageScore}</td>
        <td class="quad-label"></td>
        <td class="quad-val"></td>
      </tr>
      <tr>
        <td class="quad-label">Grade</td>
        <td class="quad-val">${overallGrade}</td>
        <td class="quad-label"></td>
        <td class="quad-val"></td>
      </tr>
      <tr>
        <td class="quad-label">Passed</td>
        <td class="quad-val" style="color:#1b5e20">${passed}</td>
        <td class="quad-label"></td>
        <td class="quad-val"></td>
      </tr>
      <tr>
        <td class="quad-label">Failed</td>
        <td class="quad-val" style="color:${failed > 0 ? '#b71c1c' : '#1b5e20'}">${failed}</td>
        <td class="quad-label"></td>
        <td class="quad-val"></td>
      </tr>
    </table>

    <table class="scores-table">
      <thead>
        <tr>
          <th style="width:5%;">S/N</th>
          <th style="width:22%;">Subject</th>
          ${assessmentHeaders}
          <th style="width:8%;">Total</th>
          <th style="width:7%;">Grade</th>
          <th style="width:14%;">Remark</th>
        </tr>
      </thead>
      <tbody>
        ${scoreRows || '<tr><td colspan="' + (5 + assessmentTypes.length) + '" class="center">No scores recorded</td></tr>'}
      </tbody>
    </table>

    <table class="section-table">
      <tr class="hdr-row"><td>Grade</td><td>Score Range</td><td>Remark</td></tr>
      ${gkRows}
    </table>

    ${behavioral ? `
    <table class="section-table">
      <tr class="hdr-row"><td>BEHAVIORAL TRAIT</td><td>RATING</td></tr>
      ${behRows}
    </table>` : ''}

    ${commentSection}

    <div class="signatures">
      <div class="sig-col">
        <div class="sig-label">Class Teacher</div>
        <div class="sig-line"></div>
      </div>
      ${stampUrl ? `<img src="${stampUrl}" class="stamp" onerror="this.style.display='none'">` : '<div style="width:80px;"></div>'}
      <div class="sig-col">
        <div class="sig-label">Principal</div>
        <div class="sig-line"></div>
        ${sigUrl ? `<img src="${sigUrl}" class="sig-img" onerror="this.style.display='none'">` : ''}
      </div>
    </div>

    <div class="gen-date">Generated on ${new Date().toISOString().split('.')[0].replace('T', ' ')}</div>
  </div>
</body>
</html>`
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-2xl max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 pb-4">
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center"><Eye size={22} className="text-[#2E7D32]" /></div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-gray-900 tracking-tight">Student Results</h2>
              <p className="text-[13px] text-gray-400">{studentName} • {student.admission_no}</p>
            </div>
            <button onClick={printResult} disabled={loading || printing} className="h-10 px-4 rounded-lg bg-orange-600 text-white font-semibold text-sm flex items-center gap-1.5 hover:bg-orange-700 disabled:bg-gray-200 disabled:text-gray-400" title="Print or Save as PDF">
              {printing ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Printer size={16} />}
              Print
            </button>
            <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600"><X size={22} /></button>
          </div>
        </div>

        <div className="border-t border-gray-200" />

        <div className="flex-1 overflow-y-auto p-6 pt-5">
          {sessionInfo && (
            <div className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200">
              <FileText size={14} className="text-[#1A237E]" />
              <span className="text-[13px] font-semibold text-[#1A237E]">{sessionInfo.sessionName} • {sessionInfo.termName}</span>
              {summary?.is_published ? <span className="ml-2 px-2 py-0.5 rounded bg-green-100 text-green-700 text-[10px] font-bold">PUBLISHED</span> : <span className="ml-2 px-2 py-0.5 rounded bg-orange-100 text-orange-700 text-[10px] font-bold">DRAFT</span>}
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-10 h-10 border-4 border-[#1A237E] border-t-transparent rounded-full animate-spin" />
              <p className="mt-3 text-sm text-gray-500">Loading results...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12">
              <AlertTriangle size={48} className="text-red-500 mb-3" />
              <p className="text-sm text-gray-700 font-semibold mb-1">Failed to load</p>
              <p className="text-[13px] text-gray-500">{error}</p>
            </div>
          ) : scores.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FileText size={48} className="text-gray-300 mb-3" />
              <p className="text-sm text-gray-700 font-semibold mb-1">No scores found</p>
              <p className="text-[13px] text-gray-500">No results have been entered for this student in the active term.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-4 gap-2 mb-5">
                <div className="bg-blue-50 rounded-xl border border-blue-200 p-3">
                  <div className="flex items-center gap-1.5 mb-1"><TrendingUp size={14} className="text-[#1A237E]" /><span className="text-[10px] text-gray-500 font-medium uppercase">Total</span></div>
                  <div className="text-lg font-bold text-[#1A237E]">{summary?.total_score ?? totalSum}</div>
                </div>
                <div className="bg-green-50 rounded-xl border border-green-200 p-3">
                  <div className="flex items-center gap-1.5 mb-1"><Award size={14} className="text-[#2E7D32]" /><span className="text-[10px] text-gray-500 font-medium uppercase">Average</span></div>
                  <div className="text-lg font-bold text-[#2E7D32]">{(summary?.average_score ?? avg).toFixed(1)}%</div>
                </div>
                <div className="bg-orange-50 rounded-xl border border-orange-200 p-3">
                  <div className="flex items-center gap-1.5 mb-1"><FileText size={14} className="text-orange-700" /><span className="text-[10px] text-gray-500 font-medium uppercase">Position</span></div>
                  <div className="text-lg font-bold text-orange-700">{summary?.position ? ordinal(summary.position) : '-'}</div>
                </div>
                <div className="bg-purple-50 rounded-xl border border-purple-200 p-3">
                  <div className="flex items-center gap-1.5 mb-1"><FileText size={14} className="text-[#7B1FA2]" /><span className="text-[10px] text-gray-500 font-medium uppercase">Subjects</span></div>
                  <div className="text-lg font-bold text-[#7B1FA2]">{validScores.length}</div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 overflow-hidden mb-5">
                <div className="bg-[#1A237E] text-white grid px-4 py-3 text-xs font-bold uppercase">
                  <div className="col-span-6">Subject</div>
                  <div className="col-span-2 text-center">Total</div>
                  <div className="col-span-2 text-center">Grade</div>
                  <div className="col-span-2 text-center">Remark</div>
                </div>
                {scores.map((s, i) => {
                  const subjName = s.subject?.name || 'Unknown'
                  const total = s.total !== null ? Number(s.total) : null
                  const gradeInfo = total !== null ? getGradeFromSystem(total, gradingSystem) : null
                  const isPass = total !== null && total >= passMark
                  return (
                    <div key={s.id} className={'grid grid-cols-12 px-4 py-3 text-sm border-t border-gray-100 ' + (i % 2 === 0 ? 'bg-white' : 'bg-[#FAFBFC]')}>
                      <div className="col-span-6 font-semibold text-gray-900">{subjName}</div>
                      <div className="col-span-2 text-center text-gray-900">{total !== null ? total : '-'}</div>
                      <div className="col-span-2 text-center font-semibold text-gray-700">{gradeInfo?.grade || '-'}</div>
                      <div className={'col-span-2 text-center font-semibold ' + (total === null ? 'text-gray-400' : isPass ? 'text-green-600' : 'text-red-600')}>{gradeInfo?.remark || '-'}</div>
                    </div>
                  )
                })}
              </div>

              {behavioral && (
                <>
                  <div className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2"><div className="w-1 h-4 bg-[#1A237E] rounded" />Behavioral Ratings</div>
                  <div className="rounded-xl border border-gray-200 overflow-hidden mb-5 grid grid-cols-2">
                    {BEHAVIORAL_FIELDS.map((f, i) => {
                      const val = (behavioral as any)[f.key] || '-'
                      const label = behavioralLabels[f.key] || f.label
                      return (
                        <div key={f.key} className={'px-3 py-2 text-xs border-b border-r border-gray-100 flex justify-between ' + (i % 2 === 0 ? 'bg-white' : 'bg-[#FAFBFC]')}>
                          <span className="text-gray-600">{label}</span>
                          <span className="font-semibold text-gray-900">{val}</span>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}

              {(comments?.teacher_comment || comments?.principal_comment) && (
                <>
                  <div className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2"><div className="w-1 h-4 bg-[#1A237E] rounded" />Comments</div>
                  <div className="space-y-3 mb-3">
                    {comments?.teacher_comment && (
                      <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Class Teacher's Comment</div>
                        <p className="text-sm italic text-gray-700">{comments.teacher_comment}</p>
                      </div>
                    )}
                    {comments?.principal_comment && (
                      <div className="p-3 rounded-lg bg-purple-50 border border-purple-200">
                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Principal's Comment</div>
                        <p className="text-sm italic text-gray-700">{comments.principal_comment}</p>
                      </div>
                    )}
                  </div>
                </>
              )}

              <p className="mt-3 text-[11px] text-gray-400 text-center">Pass mark: {passMark}% • Use Print button to save as PDF</p>
            </>
          )}
        </div>

        <div className="border-t border-gray-200 p-6 pt-3 flex gap-3">
          <button onClick={onClose} className="flex-1 h-12 rounded-lg border border-gray-300 text-gray-600 font-semibold text-sm hover:bg-gray-50">Close</button>
        </div>
      </div>
    </div>
  )
}
