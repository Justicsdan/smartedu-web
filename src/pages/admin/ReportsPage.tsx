import { useState, useEffect } from 'react'
import { dbProxy } from '../../lib/dbProxy'
import {
  BarChart3, Download, Loader2, AlertCircle, FileText,
  Users, TrendingUp, Award, Calendar, CreditCard, ClipboardList,
  GraduationCap, BookOpen, Filter, Printer, CheckCircle,
} from 'lucide-react'

const REPORT_TYPES_TRADITIONAL = [
  'Class Term Summary', 'Subject Term Summary', 'Cumulative Class Summary', 'Cumulative Subject Summary',
  'Class Comparison', 'Top Students', 'Promotion Readiness', 'Student Individual Summary',
  'Attendance Summary', 'Fee Payment Status', 'Fee Collection Summary', 'Teacher Performance',
  'CBT Performance', 'Subject Trend',
]

const REPORT_TYPES_ACE = [
  'Class Term Summary', 'Cumulative Class Summary', 'Class Comparison', 'Top Students',
  'Promotion Readiness', 'Student Individual Summary', 'Attendance Summary',
  'Fee Payment Status', 'Fee Collection Summary', 'Teacher Performance',
  'Subject Trend', 'NCE Distribution', 'PACE Completion Rate',
]

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

const fmt = (val: any) => {
  if (val == null) return '--'
  const n = Number(val)
  if (isNaN(n)) return String(val)
  if (n === Math.round(n)) return String(Math.round(n))
  return n.toFixed(1)
}

const csvEscape = (v: string) => {
  if (v.includes(',') || v.includes('"') || v.includes('\n')) return '"' + v.replace(/"/g, '""') + '"'
  return v
}

const downloadCsv = (headers: string[], rows: string[][], filename: string) => {
  const lines = [headers.map(csvEscape).join(','), ...rows.map(r => r.map(csvEscape).join(','))]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function ReportsPage() {
  const user = JSON.parse(localStorage.getItem('smartedu_user') || '{}')
  const schoolId = user.id || user.school_id || ''

  const [selectedReport, setSelectedReport] = useState('Class Term Summary')
  const [selectedClassId, setSelectedClassId] = useState('')
  const [selectedTermId, setSelectedTermId] = useState('')
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [selectedSubjectId, setSelectedSubjectId] = useState('')
  const [classLevel, setClassLevel] = useState('')
  const [topN, setTopN] = useState(10)
  const [promoThreshold, setPromoThreshold] = useState(50)
  const [isCumulative, setIsCumulative] = useState(false)
  const [selectedTermIds, setSelectedTermIds] = useState<string[]>([])
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [classSummary, setClassSummary] = useState<any>(null)
  const [listData, setListData] = useState<any[]>([])

  const [classes, setClasses] = useState<any[]>([])
  const [terms, setTerms] = useState<any[]>([])
  const [subjects, setSubjects] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [sessionId, setSessionId] = useState('')
  const [settings, setSettings] = useState<any>(null)
  const [isAce, setIsAce] = useState(false)

  useEffect(() => {
    if (!schoolId) return
    loadInitialData()
  }, [schoolId])

  const loadInitialData = async () => {
    try {
      const [classesRes, sessRes, settingsRes, subjectsRes] = await Promise.all([
        dbProxy.from('classes').select('id, name, section, tier').eq('school_id', schoolId).order('name').get(),
        dbProxy.from('academic_sessions').select('id, name').eq('school_id', schoolId).eq('is_current', true).maybeSingle(),
        dbProxy.from('school_settings').select('*').eq('school_id', schoolId).maybeSingle(),
        dbProxy.from('subjects').select('id, name, code').eq('school_id', schoolId).order('name').get(),
      ])
      setClasses(classesRes.data || [])
      setSubjects(subjectsRes.data || [])
      if (sessRes.data) {
        setSessionId(sessRes.data.id)
        const termsRes = await dbProxy.from('terms').select('id, name').eq('school_id', schoolId).eq('session_id', sessRes.data.id).order('name').get()
        setTerms(termsRes.data || [])
        if (termsRes.data && termsRes.data.length > 0) setSelectedTermId(termsRes.data[0].id)
      }
      if (settingsRes.data) {
        setSettings(settingsRes.data)
        setIsAce((settingsRes.data.curriculum_mode || '').toLowerCase() === 'ace')
        const pm = settingsRes.data.pass_mark
        setPromoThreshold(pm != null ? Number(pm) : 50)
      }
      if (classesRes.data && classesRes.data.length > 0) setSelectedClassId(classesRes.data[0].id)
    } catch (e: any) {
      setError('Failed to load initial data: ' + e.message)
    }
  }

  const reportTypes = isAce ? REPORT_TYPES_ACE : REPORT_TYPES_TRADITIONAL
  const needsClass = !['Class Comparison', 'Top Students', 'Promotion Readiness', 'Fee Collection Summary', 'Teacher Performance'].includes(selectedReport)
  const needsLevel = ['Class Comparison', 'Top Students', 'Promotion Readiness'].includes(selectedReport)
  const needsStudent = selectedReport === 'Student Individual Summary'
  const needsSubject = ['Subject Term Summary', 'Cumulative Subject Summary', 'Teacher Performance', 'Subject Trend'].includes(selectedReport)
  const needsDateRange = selectedReport === 'Attendance Summary'

  const classStudents = students.filter(s => s.class_id === selectedClassId)

  useEffect(() => {
    if (selectedClassId && needsStudent) {
      dbProxy.from('students').select('id, first_name, middle_name, last_name, admission_no, class_id').eq('school_id', schoolId).eq('class_id', selectedClassId).order('first_name').get().then(r => setStudents(r.data || []))
    }
  }, [selectedClassId, needsStudent])

  const canGenerate = !!sessionId && (!!selectedTermId || (isCumulative && selectedTermIds.length > 0)) && (!needsClass || !!selectedClassId) && (!needsStudent || !!selectedStudentId) && (!needsLevel || classLevel.trim() !== '' || selectedReport !== 'Class Comparison')

  const generate = async () => {
    if (!canGenerate) return
    setLoading(true)
    setError(null)
    setClassSummary(null)
    setListData([])
    try {
      const tids = isCumulative ? selectedTermIds : [selectedTermId]
      switch (selectedReport) {
        case 'Class Term Summary': await loadClassTermSummary(); break
        case 'Subject Term Summary': await loadSubjectTermSummary(); break
        case 'Cumulative Class Summary': await loadCumulativeClassSummary(tids); break
        case 'Cumulative Subject Summary': await loadCumulativeSubjectSummary(tids); break
        case 'Class Comparison': await loadClassComparison(tids); break
        case 'Top Students': await loadTopStudents(); break
        case 'Promotion Readiness': await loadPromotionReadiness(); break
        case 'Student Individual Summary': await loadStudentIndividualSummary(tids); break
        case 'Attendance Summary': await loadAttendanceSummary(); break
        case 'Fee Payment Status': await loadFeePaymentStatus(); break
        case 'Fee Collection Summary': await loadFeeCollectionSummary(); break
        case 'Teacher Performance': await loadTeacherPerformance(tids); break
        case 'CBT Performance': await loadCbtPerformance(); break
        case 'Subject Trend': await loadSubjectTrend(tids); break
        case 'NCE Distribution': await loadNceDistribution(tids); break
        case 'PACE Completion Rate': await loadPaceCompletionRate(tids); break
      }
    } catch (e: any) {
      setError(e.message || 'Failed to generate report')
    } finally {
      setLoading(false)
    }
  }

  const getStudentName = (s: any) => [s?.first_name, s?.middle_name, s?.last_name].filter(Boolean).join(' ').trim() || 'Unknown'

  // ═══ DATA LOADERS ═══

  const loadClassTermSummary = async () => {
    const [summariesRes, studentsRes] = await Promise.all([
      dbProxy.from('student_term_summaries').select('*').eq('school_id', schoolId).eq('class_id', selectedClassId).eq('session_id', sessionId).eq('term_id', selectedTermId).order('average_score', { ascending: false }).get(),
      dbProxy.from('students').select('id, first_name, middle_name, last_name').eq('school_id', schoolId).eq('class_id', selectedClassId).get(),
    ])
    const summaries = summariesRes.data || []
    const studentMap: Record<string, any> = {}
    for (const s of studentsRes.data || []) studentMap[s.id] = s
    const passMark = Number(settings?.pass_mark) || 40
    const studentList = summaries.map((s: any, i: number) => {
      const name = getStudentName(studentMap[s.student_id]).toUpperCase()
      return { student_name: name, total_score: s.total_score || 0, average_score: s.average_score || 0, position: s.position || (i + 1) }
    })
    const total = studentList.length
    const avg = total > 0 ? studentList.reduce((a: number, s: any) => a + Number(s.average_score), 0) / total : 0
    setClassSummary({
      total_students: total, avg_score: avg.toFixed(1), highest_score: total > 0 ? Math.max(...studentList.map((s: any) => Number(s.average_score))).toFixed(1) : '0',
      lowest_score: total > 0 ? Math.min(...studentList.map((s: any) => Number(s.average_score))).toFixed(1) : '0',
      pass_rate: total > 0 ? Math.round((studentList.filter((s: any) => Number(s.average_score) >= passMark).length / total) * 100) : 0,
      distinction_count: studentList.filter((s: any) => Number(s.average_score) >= 75).length, at_risk_count: studentList.filter((s: any) => Number(s.average_score) < passMark).length,
      student_list: studentList,
    })
  }

  const loadSubjectTermSummary = async () => {
    const scoresRes = await dbProxy.from('scores').select('total, subject_id').eq('school_id', schoolId).eq('class_id', selectedClassId).eq('session_id', sessionId).eq('term_id', selectedTermId).get()
    const passMark = Number(settings?.pass_mark) || 40
    const subjectMap: Record<string, { name: string; code: string; scores: number[] }> = {}
    for (const s of scoresRes.data || []) {
      const subj = (s as any).subject; if (!subj) continue
      const total = Number((s as any).total) || 0
      if (!subjectMap[subj.id]) subjectMap[subj.id] = { name: subj.name, code: subj.code || '', scores: [] }
      subjectMap[subj.id].scores.push(total)
    }
    setListData(Object.entries(subjectMap).map(([id, info]) => {
      const avg = info.scores.reduce((a, b) => a + b, 0) / info.scores.length
      return { subject_name: info.name, subject_code: info.code, avg_score: avg.toFixed(1), pass_rate: info.scores.length > 0 ? Math.round((info.scores.filter(s => s >= passMark).length / info.scores.length) * 100) : 0, highest_avg: Math.max(...info.scores).toFixed(1), lowest_avg: Math.min(...info.scores).toFixed(1), students_count: info.scores.length }
    }).sort((a, b) => Number(b.avg_score) - Number(a.avg_score)))
  }

  const loadCumulativeClassSummary = async (tids: string[]) => {
    const summariesRes = await dbProxy.from('student_term_summaries').select('*').eq('school_id', schoolId).eq('class_id', selectedClassId).eq('session_id', sessionId).in('term_id', tids).get()
    const studentsRes = await dbProxy.from('students').select('id, first_name, middle_name, last_name').eq('school_id', schoolId).eq('class_id', selectedClassId).get()
    const studentMap: Record<string, any> = {}
    for (const s of studentsRes.data || []) studentMap[s.id] = s
    const passMark = Number(settings?.pass_mark) || 40
    const byStudent: Record<string, { total: number; count: number; terms: Set<string> }> = {}
    for (const s of summariesRes.data || []) {
      if (!byStudent[s.student_id]) byStudent[s.student_id] = { total: 0, count: 0, terms: new Set() }
      byStudent[s.student_id].total += Number(s.average_score) || 0
      byStudent[s.student_id].count += 1
      byStudent[s.student_id].terms.add(s.term_id)
    }
    const studentList = Object.entries(byStudent).map(([sid, info]) => ({ student_name: getStudentName(studentMap[sid]).toUpperCase(), total_score: info.total, average_score: info.total / info.count, position: 0, terms_count: info.terms.size })).sort((a, b) => b.average_score - a.average_score).map((s, i) => ({ ...s, position: i + 1 }))
    const total = studentList.length
    const avg = total > 0 ? studentList.reduce((a, s) => a + s.average_score, 0) / total : 0
    setClassSummary({ total_students: total, avg_score: avg.toFixed(1), highest_score: total > 0 ? Math.max(...studentList.map(s => s.average_score)).toFixed(1) : '0', lowest_score: total > 0 ? Math.min(...studentList.map(s => s.average_score)).toFixed(1) : '0', pass_rate: total > 0 ? Math.round((studentList.filter(s => s.average_score >= passMark).length / total) * 100) : 0, distinction_count: studentList.filter(s => s.average_score >= 75).length, at_risk_count: studentList.filter(s => s.average_score < passMark).length, student_list: studentList, terms_count: tids.length })
  }

  const loadCumulativeSubjectSummary = async (tids: string[]) => {
    const scoresRes = await dbProxy.from('scores').select('total, subject_id').eq('school_id', schoolId).eq('class_id', selectedClassId).eq('session_id', sessionId).in('term_id', tids).get()
    const passMark = Number(settings?.pass_mark) || 40
    const subjectMap: Record<string, { name: string; code: string; scores: number[] }> = {}
    for (const s of scoresRes.data || []) { const subj = (s as any).subject; if (!subj) continue; const total = Number((s as any).total) || 0; if (!subjectMap[subj.id]) subjectMap[subj.id] = { name: subj.name, code: subj.code || '', scores: [] }; subjectMap[subj.id].scores.push(total) }
    setListData(Object.entries(subjectMap).map(([id, info]) => { const avg = info.scores.reduce((a, b) => a + b, 0) / info.scores.length; return { subject_name: info.name, subject_code: info.code, avg_score: avg.toFixed(1), pass_rate: info.scores.length > 0 ? Math.round((info.scores.filter(s => s >= passMark).length / info.scores.length) * 100) : 0, highest_avg: Math.max(...info.scores).toFixed(1), lowest_avg: Math.min(...info.scores).toFixed(1), students_count: info.scores.length } }).sort((a, b) => Number(b.avg_score) - Number(a.avg_score)))
  }

  const loadClassComparison = async (tids: string[]) => {
    const summariesRes = await dbProxy.from('student_term_summaries').select('class_id, average_score').eq('school_id', schoolId).eq('session_id', sessionId).in('term_id', tids).get()
    const passMark = Number(settings?.pass_mark) || 40
    const classMap: Record<string, number[]> = {}
    for (const s of summariesRes.data || []) { if (!classMap[s.class_id]) classMap[s.class_id] = []; classMap[s.class_id].push(Number(s.average_score) || 0) }
    setListData(classes.map(c => { const scores = classMap[c.id] || []; const total = scores.length; const avg = total > 0 ? scores.reduce((a, b) => a + b, 0) / total : 0; return { class_name: c.name + (c.section ? ' ' + c.section : ''), total_students: total, avg_score: avg.toFixed(1), pass_rate: total > 0 ? Math.round((scores.filter(s => s >= passMark).length / total) * 100) : 0, distinction_count: scores.filter(s => s >= 75).length, at_risk_count: scores.filter(s => s < passMark).length, highest_score: total > 0 ? Math.max(...scores).toFixed(1) : '0', lowest_score: total > 0 ? Math.min(...scores).toFixed(1) : '0' } }).filter(r => r.total_students > 0))
  }

  const loadTopStudents = async () => {
    const summariesRes = await dbProxy.from('student_term_summaries').select('student_id, total_score, average_score').eq('school_id', schoolId).eq('session_id', sessionId).eq('term_id', selectedTermId).order('average_score', { ascending: false }).limit(topN).get()
    const studentIds = (summariesRes.data || []).map((s: any) => s.student_id)
    if (studentIds.length === 0) { setListData([]); return }
    const studentsRes = await dbProxy.from('students').select('id, first_name, middle_name, last_name').eq('school_id', schoolId).in('id', studentIds).get()
    const studentMap: Record<string, any> = {}; for (const s of studentsRes.data || []) studentMap[s.id] = s
    setListData((summariesRes.data || []).map((s: any, i: number) => ({ rank: i + 1, student_name: getStudentName(studentMap[s.student_id]), cumulative_score: s.total_score || 0, average_score: s.average_score || 0 })))
  }

  const loadPromotionReadiness = async () => {
    const summariesRes = await dbProxy.from('student_term_summaries').select('student_id, average_score').eq('school_id', schoolId).eq('session_id', sessionId).eq('term_id', selectedTermId).get()
    const studentIds = (summariesRes.data || []).map((s: any) => s.student_id)
    if (studentIds.length === 0) { setListData([]); return }
    const studentsRes = await dbProxy.from('students').select('id, first_name, middle_name, last_name, class_id').eq('school_id', schoolId).in('id', studentIds).get()
    const studentMap: Record<string, any> = {}; for (const s of studentsRes.data || []) studentMap[s.id] = s
    setListData((summariesRes.data || []).filter((s: any) => Number(s.average_score) < promoThreshold).map((s: any) => ({ student_name: getStudentName(studentMap[s.student_id]), cumulative_value: Number(s.average_score) || 0, gap: promoThreshold - (Number(s.average_score) || 0) })).sort((a: any, b: any) => a.cumulative_value - b.cumulative_value))
  }

  const loadStudentIndividualSummary = async (tids: string[]) => {
    const [scoresRes, summariesRes, studentRes] = await Promise.all([
      dbProxy.from('scores').select('total, term_id, subject_id').eq('school_id', schoolId).eq('student_id', selectedStudentId).eq('session_id', sessionId).in('term_id', tids).get(),
      dbProxy.from('student_term_summaries').select('*').eq('school_id', schoolId).eq('student_id', selectedStudentId).eq('session_id', sessionId).in('term_id', tids).order('term_id').get(),
      dbProxy.from('students').select('id, first_name, middle_name, last_name, admission_no').eq('id', selectedStudentId).maybeSingle(),
    ])
    const subjectMap: Record<string, { name: string; scores: number[] }> = {}
    for (const s of scoresRes.data || []) { const subj = (s as any).subject; if (!subj) continue; if (!subjectMap[subj.id]) subjectMap[subj.id] = { name: subj.name, scores: [] }; subjectMap[subj.id].scores.push(Number((s as any).total) || 0) }
    const subjects = Object.entries(subjectMap).map(([id, info]) => ({ subject_name: info.name, avg_score: (info.scores.reduce((a, b) => a + b, 0) / info.scores.length).toFixed(1), highest: Math.max(...info.scores).toFixed(1), lowest: Math.min(...info.scores).toFixed(1), terms_scored: info.scores.length }))
    const termMap: Record<string, string> = {}; for (const t of terms) termMap[t.id] = t.name
    const termData = (summariesRes.data || []).map((t: any) => ({ term_name: termMap[t.term_id] || 'Term', total_score: t.total_score || 0, average_score: t.average_score || 0, position: t.position || '-', grade: t.grade || '' }))
    setClassSummary({ student_name: getStudentName(studentRes.data), admission_no: studentRes.data?.admission_no || '', subjects, terms: termData })
  }

  const loadAttendanceSummary = async () => {
    let q = dbProxy.from('attendance').select('student_id, status, date').eq('school_id', schoolId).eq('class_id', selectedClassId).eq('session_id', sessionId).eq('term_id', selectedTermId)
    if (fromDate) q = q.gte('date', fromDate)
    if (toDate) q = q.lte('date', toDate)
    const attRes = await q.get()
    const studentsRes = await dbProxy.from('students').select('id, first_name, middle_name, last_name').eq('school_id', schoolId).eq('class_id', selectedClassId).get()
    const studentMap: Record<string, any> = {}; for (const s of studentsRes.data || []) studentMap[s.id] = s
    const byStudent: Record<string, { present: number; absent: number; total: number }> = {}
    for (const r of attRes.data || []) { if (!byStudent[r.student_id]) byStudent[r.student_id] = { present: 0, absent: 0, total: 0 }; byStudent[r.student_id].total++; if (r.status === 'present' || r.status === 'late') byStudent[r.student_id].present++; else byStudent[r.student_id].absent++ }
    const stuList = Object.entries(byStudent).map(([sid, info]) => ({ student_name: getStudentName(studentMap[sid]), days_present: info.present, days_absent: info.absent, total_days: info.total, attendance_rate: info.total > 0 ? Math.round((info.present / info.total) * 100) : 0 }))
    const total = stuList.length
    const avgRate = total > 0 ? stuList.reduce((a, s) => a + s.attendance_rate, 0) / total : 0
    setClassSummary({ total_students: total, avg_attendance_rate: avgRate.toFixed(1), most_absent_student: stuList.length > 0 ? stuList.reduce((a, b) => a.days_absent > b.days_absent ? a : b).student_name : '-', most_present_student: stuList.length > 0 ? stuList.reduce((a, b) => a.days_present > b.days_present ? a : b).student_name : '-', students: stuList })
  }

  const loadFeePaymentStatus = async () => {
    const [assignmentsRes, paymentsRes, studentsRes] = await Promise.all([
      dbProxy.from('fee_assignments').select('student_id, amount_owed, amount_paid').eq('school_id', schoolId).eq('session_id', sessionId).eq('term_id', selectedTermId).get(),
      dbProxy.from('fee_payments').select('student_id, amount_paid').eq('school_id', schoolId).eq('session_id', sessionId).eq('term_id', selectedTermId).get(),
      dbProxy.from('students').select('id, first_name, middle_name, last_name').eq('school_id', schoolId).eq('class_id', selectedClassId).get(),
    ])
    const studentMap: Record<string, any> = {}; for (const s of studentsRes.data || []) studentMap[s.id] = s
    const owedMap: Record<string, number> = {}; const paidMap: Record<string, number> = {}
    for (const a of assignmentsRes.data || []) { owedMap[a.student_id] = (owedMap[a.student_id] || 0) + (Number(a.amount_owed) || 0); paidMap[a.student_id] = (paidMap[a.student_id] || 0) + (Number(a.amount_paid) || 0) }
    for (const p of paymentsRes.data || []) { paidMap[p.student_id] = (paidMap[p.student_id] || 0) + (Number(p.amount_paid) || 0) }
    setListData(Object.keys(owedMap).map(sid => { const expected = owedMap[sid]; const paid = paidMap[sid] || 0; const balance = expected - paid; return { student_name: getStudentName(studentMap[sid]), total_expected: expected.toFixed(2), total_paid: paid.toFixed(2), balance: balance.toFixed(2), status: balance <= 0 ? 'Paid' : paid > 0 ? 'Partial' : 'Pending' } }))
  }

  const loadFeeCollectionSummary = async () => {
    const [typesRes, paymentsRes] = await Promise.all([
      dbProxy.from('fee_types').select('id, name, amount').eq('school_id', schoolId).get(),
      dbProxy.from('fee_payments').select('fee_type_id, amount_paid').eq('school_id', schoolId).eq('session_id', sessionId).eq('term_id', selectedTermId).get(),
    ])
    const typeMap: Record<string, { name: string; amount: number }> = {}; for (const t of typesRes.data || []) typeMap[t.id] = { name: t.name, amount: Number(t.amount) || 0 }
    const collectedMap: Record<string, number> = {}; for (const p of paymentsRes.data || []) { collectedMap[p.fee_type_id] = (collectedMap[p.fee_type_id] || 0) + (Number(p.amount_paid) || 0) }
    const assignmentsRes = await dbProxy.from('fee_assignments').select('fee_type_id, student_id').eq('school_id', schoolId).eq('session_id', sessionId).eq('term_id', selectedTermId).get()
    const studentCountMap: Record<string, Set<string>> = {}; for (const a of assignmentsRes.data || []) { if (!studentCountMap[a.fee_type_id]) studentCountMap[a.fee_type_id] = new Set(); studentCountMap[a.fee_type_id].add(a.student_id) }
    setListData(Object.entries(typeMap).map(([id, info]) => { const expected = info.amount * (studentCountMap[id]?.size || 0); const paid = collectedMap[id] || 0; return { fee_type_name: info.name, total_expected: expected.toFixed(2), total_paid: paid.toFixed(2), outstanding: (expected - paid).toFixed(2), collection_rate: expected > 0 ? Math.round((paid / expected) * 100) : 0, students_count: studentCountMap[id]?.size || 0 } }))
  }

  const loadTeacherPerformance = async (tids: string[]) => {
    const [csRes, teachersRes] = await Promise.all([
      dbProxy.from('class_subjects').select('teacher_id, subject_id, class_id').eq('school_id', schoolId).get(),
      dbProxy.from('teachers').select('id, first_name, last_name').eq('school_id', schoolId).get(),
    ])
    const teacherMap: Record<string, any> = {}; for (const t of teachersRes.data || []) teacherMap[t.id] = t
    const teacherSubjects: Record<string, { subjects: Set<string>; classes: Set<string>; subjectIds: string[] }> = {}
    for (const cs of csRes.data || []) { if (!cs.teacher_id) continue; if (!teacherSubjects[cs.teacher_id]) teacherSubjects[cs.teacher_id] = { subjects: new Set(), classes: new Set(), subjectIds: [] }; teacherSubjects[cs.teacher_id].subjects.add((cs as any).subject?.name || ''); teacherSubjects[cs.teacher_id].classes.add(cs.class_id); teacherSubjects[cs.teacher_id].subjectIds.push(cs.subject_id) }
    const passMark = Number(settings?.pass_mark) || 40
    const result: any[] = []
    for (const [tid, info] of Object.entries(teacherSubjects)) {
      const scoresRes = await dbProxy.from('scores').select('total').eq('school_id', schoolId).eq('session_id', sessionId).in('term_id', tids).in('subject_id', info.subjectIds).get()
      const scores = (scoresRes.data || []).map((s: any) => Number(s.total) || 0)
      result.push({ teacher_name: getStudentName(teacherMap[tid]), subjects: Array.from(info.subjects).join(', '), classes_count: info.classes.size, avg_score: scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '0', pass_rate: scores.length > 0 ? Math.round((scores.filter(s => s >= passMark).length / scores.length) * 100) : 0, students_count: scores.length })
    }
    setListData(result)
  }

  const loadCbtPerformance = async () => {
    const examsRes = await dbProxy.from('cbt_exams').select('id, title, subject_id').eq('school_id', schoolId).eq('class_id', selectedClassId).eq('is_active', true).get()
    const result: any[] = []
    for (const exam of examsRes.data || []) {
      const attemptsRes = await dbProxy.from('cbt_attempts').select('score, total_marks').eq('exam_id', exam.id).eq('is_submitted', true).get()
      const attempts = attemptsRes.data || []
      const scores = attempts.map((a: any) => Number(a.score) || 0)
      result.push({ exam_title: exam.title, subject_name: (exam as any).subject?.name || '', total_students: attempts.length, avg_score: scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '0', pass_rate: 0, highest: scores.length > 0 ? Math.max(...scores).toFixed(1) : '0', lowest: scores.length > 0 ? Math.min(...scores).toFixed(1) : '0' })
    }
    setListData(result)
  }

  const loadSubjectTrend = async (tids: string[]) => {
    const scoresRes = await dbProxy.from('scores').select('total, term_id').eq('school_id', schoolId).eq('class_id', selectedClassId).eq('session_id', sessionId).eq('subject_id', selectedSubjectId).in('term_id', tids).get()
    const passMark = Number(settings?.pass_mark) || 40
    const termMap: Record<string, string> = {}; for (const t of terms) termMap[t.id] = t.name
    const byTerm: Record<string, number[]> = {}
    for (const s of scoresRes.data || []) { if (!byTerm[s.term_id]) byTerm[s.term_id] = []; byTerm[s.term_id].push(Number(s.total) || 0) }
    const sortedTids = tids.filter(t => byTerm[t])
    const result = sortedTids.map((tid, i) => { const scores = byTerm[tid] || []; const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0; return { term_name: termMap[tid] || 'Term', avg_score: avg.toFixed(1), pass_rate: scores.length > 0 ? Math.round((scores.filter(s => s >= passMark).length / scores.length) * 100) : 0, students_count: scores.length, trend: i === 0 ? '' : (Number(avg) > Number(result[i - 1]?.avg_score || 0) ? '↑' : Number(avg) < Number(result[i - 1]?.avg_score || 0) ? '↓' : '→') } })
    setListData(result)
  }

  const loadNceDistribution = async (tids: string[]) => {
    const reportsRes = await dbProxy.from('ace_term_reports').select('student_id, nce_score').eq('school_id', schoolId).eq('class_id', selectedClassId).eq('session_id', sessionId).in('term_id', tids).get()
    const studentsRes = await dbProxy.from('students').select('id, first_name, middle_name, last_name').eq('school_id', schoolId).eq('class_id', selectedClassId).get()
    const studentMap: Record<string, any> = {}; for (const s of studentsRes.data || []) studentMap[s.id] = s
    const bands = [{ band: '1-20', min: 1, max: 20 }, { band: '21-40', min: 21, max: 40 }, { band: '41-60', min: 41, max: 60 }, { band: '61-80', min: 61, max: 80 }, { band: '81-99', min: 81, max: 99 }]
    const total = (reportsRes.data || []).length
    setListData(bands.map(b => { const students = (reportsRes.data || []).filter((r: any) => { const v = Number(r.nce_score) || 0; return v >= b.min && v <= b.max }).map((r: any) => getStudentName(studentMap[r.student_id])); const count = students.length; return { band: b.band, count, percentage: total > 0 ? Math.round((count / total) * 100) : 0, students } }))
  }

  const loadPaceCompletionRate = async (tids: string[]) => {
    const [paceRes, subjectsRes] = await Promise.all([
      dbProxy.from('ace_pace_scores').select('subject_id, student_id, pt_score').eq('school_id', schoolId).eq('session_id', sessionId).in('term_id', tids).get(),
      dbProxy.from('subjects').select('id, name, code').eq('school_id', schoolId).get(),
    ])
    const subjectMap: Record<string, any> = {}; for (const s of subjectsRes.data || []) subjectMap[s.id] = s
    const bySubject: Record<string, { paces: number; students: Set<string>; ptScores: number[] }> = {}
    for (const p of paceRes.data || []) { if (!bySubject[p.subject_id]) bySubject[p.subject_id] = { paces: 0, students: new Set(), ptScores: [] }; bySubject[p.subject_id].paces++; bySubject[p.subject_id].students.add(p.student_id); bySubject[p.subject_id].ptScores.push(Number(p.pt_score) || 0) }
    setListData(Object.entries(bySubject).map(([sid, info]) => ({ subject_name: subjectMap[sid]?.name || 'Unknown', subject_code: subjectMap[sid]?.code || '', total_paces: info.paces, unique_students: info.students.size, avg_paces_per_student: info.students.size > 0 ? (info.paces / info.students.size).toFixed(1) : '0', avg_pt: info.ptScores.length > 0 ? (info.ptScores.reduce((a, b) => a + b, 0) / info.ptScores.length).toFixed(1) : '0' })))
  }

  // ═══ CSV EXPORT ═══


  const downloadPdfReport = () => {
    const user = JSON.parse(localStorage.getItem('smartedu_user') || '{}')
    const schoolName = user.name || user.school_name || 'School'
    const schoolLogo = user.logo_url || ''
    const sessionName = user.current_session_name || ''
    const termName = terms.find(t => t.id === selectedTermId)?.name || ''
    const className = classes.find(c => c.id === selectedClassId)?.name || ''
    
    let tableHtml = ''
    let summaryHtml = ''
    
    if (classSummary) {
      if (selectedReport === 'Class Term Summary' || selectedReport === 'Cumulative Class Summary') {
        const d = classSummary
        summaryHtml = `
          <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap;">
            <div style="border:1px solid #0D9488;border-radius:6px;padding:10px;width:120px;text-align:center;"><div style="font-size:20px;font-weight:bold;color:#0D9488;">${d.total_students}</div><div style="font-size:9px;color:#666;">Total Students</div></div>
            <div style="border:1px solid #2E7D32;border-radius:6px;padding:10px;width:120px;text-align:center;"><div style="font-size:20px;font-weight:bold;color:#2E7D32;">${fmt(d.avg_score)}</div><div style="font-size:9px;color:#666;">Avg Score</div></div>
            <div style="border:1px solid #00897B;border-radius:6px;padding:10px;width:120px;text-align:center;"><div style="font-size:20px;font-weight:bold;color:#00897B;">${d.pass_rate}%</div><div style="font-size:9px;color:#666;">Pass Rate</div></div>
            <div style="border:1px solid #7B1FA2;border-radius:6px;padding:10px;width:120px;text-align:center;"><div style="font-size:20px;font-weight:bold;color:#7B1FA2;">${d.distinction_count}</div><div style="font-size:9px;color:#666;">Distinctions</div></div>
            <div style="border:1px solid #C62828;border-radius:6px;padding:10px;width:120px;text-align:center;"><div style="font-size:20px;font-weight:bold;color:#C62828;">${d.at_risk_count}</div><div style="font-size:9px;color:#666;">At Risk</div></div>
          </div>
        `
        if (d.student_list && d.student_list.length > 0) {
          tableHtml = '<table><thead><tr><th>#</th><th style="text-align:left;">Student Name</th><th>Total</th><th>Average</th><th>Position</th></tr></thead><tbody>'
          tableHtml += d.student_list.map((s, i) => `<tr><td>${i + 1}</td><td style="text-align:left;">${s.student_name}</td><td>${s.total_score}</td><td>${fmt(s.average_score)}</td><td>${ordinal(s.position)}</td></tr>`).join('')
          tableHtml += '</tbody></table>'
        }
      } else if (selectedReport === 'Attendance Summary') {
        const d = classSummary
        tableHtml = '<table><thead><tr><th style="text-align:left;">Student</th><th>Present</th><th>Absent</th><th>Total</th><th>Rate %</th></tr></thead><tbody>'
        tableHtml += (d.students || []).map(s => `<tr><td style="text-align:left;">${s.student_name}</td><td>${s.days_present}</td><td>${s.days_absent}</td><td>${s.total_days}</td><td>${s.attendance_rate}%</td></tr>`).join('')
        tableHtml += '</tbody></table>'
      } else if (selectedReport === 'Student Individual Summary') {
        const d = classSummary
        summaryHtml = `<h3>${d.student_name}</h3><p style="color:#666;font-size:10pt;">Admission No: ${d.admission_no || ''}</p>`
        if (d.subjects && d.subjects.length > 0) {
          tableHtml = '<h4>Per-Subject Performance</h4><table><thead><tr><th style="text-align:left;">Subject</th><th>Terms</th><th>Avg</th><th>High</th><th>Low</th></tr></thead><tbody>'
          tableHtml += d.subjects.map(s => `<tr><td style="text-align:left;">${s.subject_name}</td><td>${s.terms_scored}</td><td>${fmt(s.avg_score)}</td><td>${fmt(s.highest)}</td><td>${fmt(s.lowest)}</td></tr>`).join('')
          tableHtml += '</tbody></table>'
        }
        if (d.terms && d.terms.length > 0) {
          tableHtml += '<h4>Term-by-Term</h4><table><thead><tr><th style="text-align:left;">Term</th><th>Total</th><th>Average</th><th>Position</th></tr></thead><tbody>'
          tableHtml += d.terms.map(t => `<tr><td style="text-align:left;">${t.term_name}</td><td>${fmt(t.total_score)}</td><td>${fmt(t.average_score)}</td><td>${t.position}</td></tr>`).join('')
          tableHtml += '</tbody></table>'
        }
      }
    } else if (listData.length > 0) {
      const cols = {
        'Subject Term Summary': ['Subject', 'Code', 'Avg Score', 'Pass %', 'High', 'Low', 'Students'],
        'Cumulative Subject Summary': ['Subject', 'Code', 'Avg Score', 'Pass %', 'High', 'Low', 'Students'],
        'Class Comparison': ['Class', 'Students', 'Avg Score', 'Pass %', 'Dist.', 'At Risk', 'High', 'Low'],
        'Top Students': ['#', 'Student', 'Cum. Score', 'Average'],
        'Promotion Readiness': ['Student', 'Score', 'Threshold', 'Gap'],
        'Fee Payment Status': ['Student', 'Expected', 'Paid', 'Balance', 'Status'],
        'Fee Collection Summary': ['Fee Type', 'Expected', 'Paid', 'Outstanding', 'Rate %', 'Students'],
        'Teacher Performance': ['Teacher', 'Subjects', 'Classes', 'Avg Score', 'Pass %', 'Students'],
        'CBT Performance': ['Exam', 'Subject', 'Students', 'Avg Score', 'High', 'Low'],
        'Subject Trend': ['Term', 'Avg Score', 'Pass %', 'Students', 'Trend'],
        'NCE Distribution': ['Band', 'Count', 'Percentage', 'Students'],
        'PACE Completion Rate': ['Subject', 'Code', 'Total PACEs', 'Students', 'Avg/Student', 'Avg PT'],
      }[selectedReport] || []
      
      const getRow = (r, i) => {
        switch (selectedReport) {
          case 'Subject Term Summary': case 'Cumulative Subject Summary': return [r.subject_name, r.subject_code, fmt(r.avg_score), r.pass_rate + '%', fmt(r.highest_avg), fmt(r.lowest_avg), String(r.students_count)]
          case 'Class Comparison': return [r.class_name, String(r.total_students), fmt(r.avg_score), r.pass_rate + '%', String(r.distinction_count), String(r.at_risk_count), fmt(r.highest_score), fmt(r.lowest_score)]
          case 'Top Students': return [String(r.rank), r.student_name, String(r.cumulative_score), fmt(r.average_score)]
          case 'Promotion Readiness': return [r.student_name, r.cumulative_value.toFixed(1), promoThreshold.toFixed(0) + '%', r.gap.toFixed(1)]
          case 'Fee Payment Status': return [r.student_name, r.total_expected, r.total_paid, r.balance, r.status]
          case 'Fee Collection Summary': return [r.fee_type_name, r.total_expected, r.total_paid, r.outstanding, r.collection_rate + '%', String(r.students_count)]
          case 'Teacher Performance': return [r.teacher_name, r.subjects, String(r.classes_count), fmt(r.avg_score), r.pass_rate + '%', String(r.students_count)]
          case 'CBT Performance': return [r.exam_title, r.subject_name, String(r.total_students), fmt(r.avg_score), fmt(r.highest), fmt(r.lowest)]
          case 'Subject Trend': return [r.term_name, fmt(r.avg_score), r.pass_rate + '%', String(r.students_count), r.trend]
          case 'NCE Distribution': return [r.band, String(r.count), r.percentage + '%', r.students.join(', ')]
          case 'PACE Completion Rate': return [r.subject_name, r.subject_code, String(r.total_paces), String(r.unique_students), r.avg_paces_per_student, r.avg_pt]
          default: return []
        }
      }
      
      tableHtml = '<table><thead><tr>' + cols.map(c => '<th>' + c + '</th>').join('') + '</tr></thead><tbody>'
      tableHtml += listData.map((r, i) => '<tr>' + getRow(r, i).map((cell, j) => '<td' + (j === 0 || j === 1 ? ' style="text-align:left;"' : '') + '>' + cell + '</td>').join('') + '</tr>').join('')
      tableHtml += '</tbody></table>'
    }
    
    if (!tableHtml && !summaryHtml) return
    
    const filters = []
    if (sessionName) filters.push('Session: ' + sessionName)
    if (termName) filters.push('Term: ' + termName)
    if (className) filters.push('Class: ' + className)
    if (selectedReport === 'Top Students') filters.push('Top ' + topN)
    if (selectedReport === 'Promotion Readiness') filters.push('Threshold: ' + promoThreshold + '%')
    
    const html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>' + selectedReport + '</title><style>' +
      '@page { size: A4 landscape; margin: 12mm; }' +
      'body { font-family: Arial, sans-serif; font-size: 10pt; color: #1a1a1a; margin: 0; padding: 0; }' +
      '.header { display: flex; align-items: center; gap: 12px; border-bottom: 2px solid #0D9488; padding-bottom: 8px; margin-bottom: 12px; }' +
      '.header img { width: 50px; height: 50px; object-fit: contain; }' +
      '.header h1 { font-size: 16pt; margin: 0; color: #0D9488; }' +
      '.header p { font-size: 8pt; color: #666; margin: 2px 0 0 0; }' +
      '.title { background: #F0FDFA; padding: 8px 12px; border-radius: 4px; margin-bottom: 8px; }' +
      '.title h2 { font-size: 13pt; color: #0D9488; margin: 0; }' +
      '.filters { background: #f5f5f5; padding: 6px 10px; border-radius: 4px; margin-bottom: 12px; font-size: 9pt; color: #666; }' +
      'table { width: 100%; border-collapse: collapse; margin-top: 8px; }' +
      'th { background: #0D9488; color: white; padding: 8px 6px; font-size: 9pt; text-align: center; font-weight: bold; }' +
      'td { padding: 6px; border: 1px solid #ddd; font-size: 9pt; text-align: center; }' +
      'tr:nth-child(even) { background: #f9f9f9; }' +
      '.footer { margin-top: 16px; padding-top: 8px; border-top: 1px solid #ddd; font-size: 8pt; color: #999; display: flex; justify-content: space-between; }' +
      'h3 { font-size: 14pt; margin: 0 0 4px 0; } h4 { font-size: 11pt; margin: 12px 0 6px 0; color: #0D9488; }' +
      '</style></head><body>' +
      '<div class="header">' +
        (schoolLogo ? '<img src="' + schoolLogo + '" onerror="this.style.display=\'none\'">' : '') +
        '<div><h1>' + schoolName + '</h1><p>SmartEdu Report — Generated ' + new Date().toLocaleString() + '</p></div>' +
      '</div>' +
      '<div class="title"><h2>' + selectedReport.toUpperCase() + '</h2></div>' +
      (filters.length > 0 ? '<div class="filters">' + filters.join('  |  ') + '</div>' : '') +
      summaryHtml + tableHtml +
      '<div class="footer"><span>Generated: ' + new Date().toLocaleString() + '</span><span>SmartEdu Reports</span></div>' +
      '</body></html>'
    
    const printWindow = window.open('', '_blank', 'width=1000,height=800')
    if (!printWindow) { alert('Please allow pop-ups to download PDF'); return }
    printWindow.document.write(html)
    printWindow.document.close()
    setTimeout(() => { printWindow.focus(); printWindow.print() }, 500)
  }

  const downloadCsvReport = () => {
    const safeName = selectedReport.toLowerCase().replace(/ /g, '_')
    if (classSummary) {
      if (selectedReport === 'Class Term Summary' || selectedReport === 'Cumulative Class Summary') {
        downloadCsv(['#', 'STUDENT NAME', 'TOTAL', 'AVERAGE', 'POSITION'], (classSummary.student_list || []).map((s: any, i: number) => [String(i + 1), s.student_name, String(s.total_score), String(s.average_score), String(s.position)]), safeName + '.csv')
      } else if (selectedReport === 'Student Individual Summary') {
        downloadCsv(['Subject', 'Avg Score', 'Highest', 'Lowest', 'Terms'], (classSummary.subjects || []).map((s: any) => [s.subject_name, s.avg_score, s.highest, s.lowest, String(s.terms_scored)]), safeName + '.csv')
      } else if (selectedReport === 'Attendance Summary') {
        downloadCsv(['Student', 'Present', 'Absent', 'Total', 'Rate %'], (classSummary.students || []).map((s: any) => [s.student_name, String(s.days_present), String(s.days_absent), String(s.total_days), s.attendance_rate + '%']), safeName + '.csv')
      }
      return
    }
    if (listData.length > 0) {
      if (selectedReport === 'Subject Term Summary' || selectedReport === 'Cumulative Subject Summary') {
        downloadCsv(['Subject', 'Code', 'Avg Score', 'Pass %', 'Highest', 'Lowest', 'Students'], listData.map(r => [r.subject_name, r.subject_code, String(r.avg_score), r.pass_rate + '%', String(r.highest_avg), String(r.lowest_avg), String(r.students_count)]), safeName + '.csv')
      } else if (selectedReport === 'Class Comparison') {
        downloadCsv(['Class', 'Students', 'Avg Score', 'Pass %', 'Distinctions', 'At Risk', 'Highest', 'Lowest'], listData.map(r => [r.class_name, String(r.total_students), String(r.avg_score), r.pass_rate + '%', String(r.distinction_count), String(r.at_risk_count), String(r.highest_score), String(r.lowest_score)]), safeName + '.csv')
      } else if (selectedReport === 'Top Students') {
        downloadCsv(['#', 'Student', 'Cum. Score', 'Average'], listData.map(r => [String(r.rank), r.student_name, String(r.cumulative_score), String(r.average_score)]), safeName + '.csv')
      } else if (selectedReport === 'Promotion Readiness') {
        downloadCsv(['Student', 'Score', 'Threshold', 'Gap'], listData.map(r => [r.student_name, r.cumulative_value.toFixed(1), promoThreshold.toFixed(0) + '%', r.gap.toFixed(1)]), safeName + '.csv')
      } else if (selectedReport === 'Fee Payment Status') {
        downloadCsv(['Student', 'Expected', 'Paid', 'Balance', 'Status'], listData.map(r => [r.student_name, r.total_expected, r.total_paid, r.balance, r.status]), safeName + '.csv')
      } else if (selectedReport === 'Fee Collection Summary') {
        downloadCsv(['Fee Type', 'Expected', 'Paid', 'Outstanding', 'Rate %', 'Students'], listData.map(r => [r.fee_type_name, r.total_expected, r.total_paid, r.outstanding, r.collection_rate + '%', String(r.students_count)]), safeName + '.csv')
      } else if (selectedReport === 'Teacher Performance') {
        downloadCsv(['Teacher', 'Subjects', 'Classes', 'Avg Score', 'Pass %', 'Students'], listData.map(r => [r.teacher_name, r.subjects, String(r.classes_count), String(r.avg_score), r.pass_rate + '%', String(r.students_count)]), safeName + '.csv')
      } else if (selectedReport === 'CBT Performance') {
        downloadCsv(['Exam', 'Subject', 'Students', 'Avg Score', 'Highest', 'Lowest'], listData.map(r => [r.exam_title, r.subject_name, String(r.total_students), String(r.avg_score), String(r.highest), String(r.lowest)]), safeName + '.csv')
      } else if (selectedReport === 'Subject Trend') {
        downloadCsv(['Term', 'Avg Score', 'Pass %', 'Students', 'Trend'], listData.map(r => [r.term_name, String(r.avg_score), r.pass_rate + '%', String(r.students_count), r.trend]), safeName + '.csv')
      } else if (selectedReport === 'NCE Distribution') {
        downloadCsv(['Band', 'Count', 'Percentage', 'Students'], listData.map(r => [r.band, String(r.count), r.percentage + '%', r.students.join('; ')]), safeName + '.csv')
      } else if (selectedReport === 'PACE Completion Rate') {
        downloadCsv(['Subject', 'Code', 'Total PACEs', 'Students', 'Avg/Student', 'Avg PT'], listData.map(r => [r.subject_name, r.subject_code, String(r.total_paces), String(r.unique_students), r.avg_paces_per_student, r.avg_pt]), safeName + '.csv')
      }
    }
  }

  const hasResults = classSummary || listData.length > 0

  return (
    <div className="p-6 bg-gradient-to-br from-slate-50 via-white to-teal-50/30 min-h-full">
      <div className="bg-gradient-to-r from-teal-700 to-cyan-600 rounded-3xl p-6 flex items-center gap-4 mb-6 shadow-2xl shadow-teal-500/30 relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/10 rounded-full pointer-events-none"></div>
        <div className="absolute -right-4 top-8 w-24 h-24 bg-white/5 rounded-full pointer-events-none"></div>
        <div className="relative w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20"><BarChart3 size={26} className="text-white" strokeWidth={2.2} /></div>
        <div class_="relative flex-1">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/15 backdrop-blur-sm text-[10px] font-bold uppercase tracking-widest text-white mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
            Reports
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Reports</h1>
          <p className="text-[12px] text-white/70">Generate and download summary reports</p>
        </div>
        <div className="relative px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-sm border border-white/20"><span className="text-[11px] font-bold text-white">{isAce ? 'ACE Mode' : 'Traditional'}</span></div>
      </div>

      {hasResults && !loading && (
        <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-slate-200/60 shadow-md shadow-slate-200/30 p-3 mb-4 flex items-center gap-2">
          <Download size={18} className="text-teal-700" />
          <span className="text-[13px] font-semibold text-slate-700 mr-2">Download:</span>
          <button onClick={downloadPdfReport} className="px-3 py-1.5 rounded-lg bg-orange-50 border border-orange-200 text-orange-700 text-[13px] font-semibold flex items-center gap-1.5 hover:bg-orange-100"><Printer size={16} /> PDF</button>
          <button onClick={downloadCsvReport} className="px-3 py-1.5 rounded-lg bg-green-50 border border-green-200 text-[#2E7D32] text-[13px] font-semibold flex items-center gap-1.5 hover:bg-green-100"><FileText size={16} /> CSV</button>
        </div>
      )}

      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg shadow-slate-200/40 border border-slate-200/60 p-5 mb-4">
        <div className="flex items-center gap-2 mb-4"><div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-md shadow-teal-500/30"><BarChart3 size={16} className="text-white" strokeWidth={2.2} /></div><h2 className="text-[15px] font-bold text-slate-900 tracking-tight">Configure Report</h2></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-[12px] font-semibold text-slate-600 block mb-1.5">Report Type</label>
            <select value={selectedReport} onChange={e => { setSelectedReport(e.target.value); setClassSummary(null); setListData([]) }} className="w-full h-11 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 focus:border-teal-700 focus:border-2 outline-none">
              {reportTypes.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          {needsClass && <div><label className="text-[12px] font-semibold text-slate-600 block mb-1.5">Class</label><select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)} className="w-full h-11 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 focus:border-teal-700 focus:border-2 outline-none"><option value="">Select class</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}{c.section ? ' ' + c.section : ''}</option>)}</select></div>}
          {needsStudent && <div><label className="text-[12px] font-semibold text-slate-600 block mb-1.5">Student</label><select value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)} className="w-full h-11 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 focus:border-teal-700 focus:border-2 outline-none"><option value="">Select student</option>{classStudents.map(s => <option key={s.id} value={s.id}>{getStudentName(s)} ({s.admission_no})</option>)}</select></div>}
          {needsSubject && <div><label className="text-[12px] font-semibold text-slate-600 block mb-1.5">Subject</label><select value={selectedSubjectId} onChange={e => setSelectedSubjectId(e.target.value)} className="w-full h-11 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 focus:border-teal-700 focus:border-2 outline-none"><option value="">All Subjects</option>{subjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code || ''})</option>)}</select></div>}
          {needsLevel && <div><label className="text-[12px] font-semibold text-slate-600 block mb-1.5">Class Level</label><input type="text" value={classLevel} onChange={e => setClassLevel(e.target.value)} placeholder="e.g. JSS1, SSS2" className="w-full h-11 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 focus:border-teal-700 focus:border-2 outline-none" /></div>}
          {selectedReport === 'Top Students' && <div><label className="text-[12px] font-semibold text-slate-600 block mb-1.5">Top N</label><input type="number" value={topN} onChange={e => setTopN(Number(e.target.value) || 10)} className="w-full h-11 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 focus:border-teal-700 focus:border-2 outline-none" /></div>}
          {selectedReport === 'Promotion Readiness' && <div><label className="text-[12px] font-semibold text-slate-600 block mb-1.5">Threshold %</label><input type="number" value={promoThreshold} onChange={e => setPromoThreshold(Number(e.target.value) || 50)} className="w-full h-11 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 focus:border-teal-700 focus:border-2 outline-none" /></div>}
          {needsDateRange && <><div><label className="text-[12px] font-semibold text-slate-600 block mb-1.5">From Date</label><input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-full h-11 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 focus:border-teal-700 focus:border-2 outline-none" /></div><div><label className="text-[12px] font-semibold text-slate-600 block mb-1.5">To Date</label><input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="w-full h-11 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 focus:border-teal-700 focus:border-2 outline-none" /></div></>}
        </div>
        {['Cumulative Class Summary', 'Cumulative Subject Summary', 'Class Comparison', 'Top Students', 'Promotion Readiness', 'Student Individual Summary', 'Teacher Performance', 'Subject Trend', 'NCE Distribution', 'PACE Completion Rate'].includes(selectedReport) && (
          <div className="mt-4 flex gap-2">
            <button onClick={() => setIsCumulative(false)} className={'flex-1 h-10 rounded-xl text-[13px] font-bold transition-all ' + (!isCumulative ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-md shadow-teal-500/30' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50')}>Single Term</button>
            <button onClick={() => setIsCumulative(true)} className={'flex-1 h-10 rounded-xl text-[13px] font-bold transition-all ' + (isCumulative ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-md shadow-teal-500/30' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50')}>Cumulative</button>
          </div>
        )}
        {isCumulative ? (
          <div className="mt-4"><label className="text-[12px] font-semibold text-slate-600 block mb-1.5">Select Terms</label><div className="flex flex-wrap gap-2">{terms.map(t => <label key={t.id} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50"><input type="checkbox" checked={selectedTermIds.includes(t.id)} onChange={e => { if (e.target.checked) setSelectedTermIds([...selectedTermIds, t.id]); else setSelectedTermIds(selectedTermIds.filter(id => id !== t.id)) }} /> <span className="text-[13px]">{t.name}</span></label>)}</div></div>
        ) : (
          <div className="mt-4"><label className="text-[12px] font-semibold text-slate-600 block mb-1.5">Term</label><select value={selectedTermId} onChange={e => setSelectedTermId(e.target.value)} className="w-full h-11 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 focus:border-teal-700 focus:border-2 outline-none"><option value="">Select term</option>{terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
        )}
      </div>

      <button onClick={generate} disabled={!canGenerate || loading} className="w-full h-13 py-3.5 rounded-xl font-bold text-sm mb-6 transition-all flex items-center justify-center gap-2 disabled:bg-slate-200 disabled:text-slate-400 bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-lg shadow-teal-500/30 hover:from-teal-700 hover:to-cyan-700 hover:-translate-y-0.5 disabled:hover:translate-y-0">{loading ? <><Loader2 size={20} className="animate-spin" /> Generating...</> : <><TrendingUp size={20} strokeWidth={2.4} /> Generate Report</>}</button>

      {error && <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2"><AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" /><p className="text-sm text-red-700">{error}</p></div>}

      {loading ? <div className="flex items-center justify-center py-12"><div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin shadow-lg shadow-teal-500/20" /></div> : (
        classSummary ? <SummaryView reportType={selectedReport} data={classSummary} /> :
        listData.length > 0 ? <ListView reportType={selectedReport} data={listData} /> :
        !error ? <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-slate-200/60 p-12 text-center shadow-lg shadow-slate-200/40 relative overflow-hidden"><div className="absolute inset-0 bg-gradient-to-br from-teal-50/40 via-transparent to-cyan-50/40 pointer-events-none"></div><div className="relative"><div className="w-20 h-20 mx-auto bg-gradient-to-br from-teal-500 to-cyan-600 rounded-3xl flex items-center justify-center mb-4 shadow-xl shadow-teal-500/30"><BarChart3 size={36} className="text-white" strokeWidth={2} /></div><p className="text-[15px] font-bold text-slate-700 tracking-tight">No report generated yet</p><p className="text-[13px] text-slate-400 mt-1">Configure the filters above and tap Generate</p></div></div> : null
      )}
    </div>
  )
}

function SummaryView({ reportType, data }: { reportType: string; data: any }) {
  if (reportType === 'Attendance Summary') {
    return (
      <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-slate-200/60 shadow-md shadow-slate-200/30 overflow-hidden">
        <div className="p-4 flex flex-wrap gap-3 border-b border-slate-100">
          <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-teal-700 text-[12px] font-semibold">Students: {data.total_students}</span>
          <span className="px-2.5 py-1 rounded-lg bg-green-50 text-[#2E7D32] text-[12px] font-semibold">Avg Rate: {data.avg_attendance_rate}%</span>
        </div>
        <div className="bg-teal-700 text-white grid grid-cols-12 px-4 py-3 text-xs font-bold uppercase">
          <div className="col-span-5">Student</div><div className="col-span-2 text-center">Present</div><div className="col-span-2 text-center">Absent</div><div className="col-span-1 text-center">Total</div><div className="col-span-2 text-center">Rate %</div>
        </div>
        {data.students.map((s: any, i: number) => (
          <div key={i} className={'grid grid-cols-12 px-4 py-3 text-sm border-t border-slate-100 ' + (i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50')}>
            <div className="col-span-5 font-medium text-slate-900">{s.student_name}</div><div className="col-span-2 text-center text-slate-700">{s.days_present}</div><div className="col-span-2 text-center text-slate-700">{s.days_absent}</div><div className="col-span-1 text-center text-slate-700">{s.total_days}</div><div className="col-span-2 text-center font-semibold" style={{ color: s.attendance_rate >= 75 ? '#2E7D32' : '#C62828' }}>{s.attendance_rate}%</div>
          </div>
        ))}
      </div>
    )
  }
  if (reportType === 'Student Individual Summary') {
    return (
      <div className="space-y-4">
        <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-slate-200/60 shadow-md shadow-slate-200/30 p-4">
          <h3 className="text-lg font-bold text-slate-900">{data.student_name}</h3>
          {data.admission_no && <p className="text-[12px] text-slate-500">Adm: {data.admission_no}</p>}
        </div>
        {data.subjects && data.subjects.length > 0 && (
          <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-slate-200/60 shadow-md shadow-slate-200/30 overflow-hidden">
            <div className="p-4 border-b border-slate-100 font-semibold text-slate-700">Per-Subject Performance</div>
            <div className="bg-teal-700 text-white grid grid-cols-12 px-4 py-3 text-xs font-bold uppercase"><div className="col-span-5">Subject</div><div className="col-span-2 text-center">Terms</div><div className="col-span-2 text-center">Avg</div><div className="col-span-2 text-center">High</div><div className="col-span-1 text-center">Low</div></div>
            {data.subjects.map((s: any, i: number) => <div key={i} className={'grid grid-cols-12 px-4 py-3 text-sm border-t border-slate-100 ' + (i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50')}><div className="col-span-5 font-medium text-slate-900">{s.subject_name}</div><div className="col-span-2 text-center text-slate-700">{s.terms_scored}</div><div className="col-span-2 text-center font-semibold text-slate-900">{fmt(s.avg_score)}</div><div className="col-span-2 text-center text-slate-700">{fmt(s.highest)}</div><div className="col-span-1 text-center text-slate-700">{fmt(s.lowest)}</div></div>)}
          </div>
        )}
        {data.terms && data.terms.length > 0 && (
          <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-slate-200/60 shadow-md shadow-slate-200/30 overflow-hidden">
            <div className="p-4 border-b border-slate-100 font-semibold text-slate-700">Term-by-Term</div>
            <div className="bg-teal-700 text-white grid grid-cols-12 px-4 py-3 text-xs font-bold uppercase"><div className="col-span-4">Term</div><div className="col-span-3 text-center">Total</div><div className="col-span-3 text-center">Average</div><div className="col-span-2 text-center">Position</div></div>
            {data.terms.map((t: any, i: number) => <div key={i} className={'grid grid-cols-12 px-4 py-3 text-sm border-t border-slate-100 ' + (i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50')}><div className="col-span-4 font-medium text-slate-900">{t.term_name}</div><div className="col-span-3 text-center font-semibold text-slate-900">{fmt(t.total_score)}</div><div className="col-span-3 text-center text-slate-700">{fmt(t.average_score)}</div><div className="col-span-2 text-center text-teal-700 font-semibold">{t.position}</div></div>)}
          </div>
        )}
      </div>
    )
  }
  const cards = [
    { l: 'Total', v: data.total_students, c: '#0D9488' }, { l: 'Avg Score', v: fmt(data.avg_score), c: '#2E7D32' }, { l: 'Pass Rate', v: data.pass_rate + '%', c: '#00897B' },
    { l: 'Distinctions', v: data.distinction_count, c: '#7B1FA2' }, { l: 'At Risk', v: data.at_risk_count, c: '#C62828' }, { l: 'Highest', v: fmt(data.highest_score), c: '#0F766E' }, { l: 'Lowest', v: fmt(data.lowest_score), c: '#BF360C' },
  ]
  if (data.terms_count) cards.push({ l: 'Terms', v: data.terms_count, c: '#6B7280' })
  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-5">{cards.map((c, i) => <div key={i} className="bg-white/90 backdrop-blur-sm rounded-xl border border-slate-200/60 shadow-md shadow-slate-200/30 p-3 flex items-center gap-2.5" style={{ minWidth: 105 }}><div className="w-1 h-7 rounded" style={{ backgroundColor: c.c }} /><div><div className="text-[18px] font-bold" style={{ color: c.c }}>{c.v}</div><div className="text-[10px] text-slate-500">{c.l}</div></div></div>)}</div>
      {data.student_list && data.student_list.length > 0 && (
        <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-slate-200/60 shadow-md shadow-slate-200/30 overflow-hidden">
          <div className="bg-teal-700 text-white grid grid-cols-12 px-4 py-3 text-xs font-bold uppercase"><div className="col-span-1">#</div><div className="col-span-5">Student Name</div><div className="col-span-2 text-center">Total</div><div className="col-span-2 text-center">Average</div><div className="col-span-2 text-center">Position</div></div>
          {data.student_list.map((s: any, i: number) => <div key={i} className={'grid grid-cols-12 px-4 py-3 text-sm border-t border-slate-100 ' + (i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50')}><div className="col-span-1"><span className={'inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold ' + (i < 3 ? 'bg-teal-700 text-white' : 'bg-slate-200 text-slate-600')}>{i + 1}</span></div><div className="col-span-5 font-medium text-slate-900">{s.student_name}</div><div className="col-span-2 text-center font-semibold text-slate-900">{s.total_score}</div><div className="col-span-2 text-center text-slate-700">{fmt(s.average_score)}</div><div className="col-span-2 text-center font-semibold text-teal-700">{ordinal(s.position)}</div></div>)}
        </div>
      )}
    </div>
  )
}

function ListView({ reportType, data }: { reportType: string; data: any[] }) {
  const headers: Record<string, string[]> = {
    'Subject Term Summary': ['Subject', 'Code', 'Avg Score', 'Pass %', 'High', 'Low', 'Students'],
    'Cumulative Subject Summary': ['Subject', 'Code', 'Avg Score', 'Pass %', 'High', 'Low', 'Students'],
    'Class Comparison': ['Class', 'Students', 'Avg Score', 'Pass %', 'Dist.', 'At Risk', 'High', 'Low'],
    'Top Students': ['#', 'Student', 'Cum. Score', 'Average'],
    'Promotion Readiness': ['Student', 'Score', 'Threshold', 'Gap'],
    'Fee Payment Status': ['Student', 'Expected', 'Paid', 'Balance', 'Status'],
    'Fee Collection Summary': ['Fee Type', 'Expected', 'Paid', 'Outstanding', 'Rate %', 'Students'],
    'Teacher Performance': ['Teacher', 'Subjects', 'Classes', 'Avg Score', 'Pass %', 'Students'],
    'CBT Performance': ['Exam', 'Subject', 'Students', 'Avg Score', 'High', 'Low'],
    'Subject Trend': ['Term', 'Avg Score', 'Pass %', 'Students', 'Trend'],
    'NCE Distribution': ['Band', 'Count', 'Percentage', 'Students'],
    'PACE Completion Rate': ['Subject', 'Code', 'Total PACEs', 'Students', 'Avg/Student', 'Avg PT'],
  }
  const cols = headers[reportType] || []
  const getRow = (r: any, i: number): string[] => {
    switch (reportType) {
      case 'Subject Term Summary': case 'Cumulative Subject Summary': return [r.subject_name, r.subject_code, fmt(r.avg_score), r.pass_rate + '%', fmt(r.highest_avg), fmt(r.lowest_avg), String(r.students_count)]
      case 'Class Comparison': return [r.class_name, String(r.total_students), fmt(r.avg_score), r.pass_rate + '%', String(r.distinction_count), String(r.at_risk_count), fmt(r.highest_score), fmt(r.lowest_score)]
      case 'Top Students': return [String(r.rank), r.student_name, String(r.cumulative_score), fmt(r.average_score)]
      case 'Promotion Readiness': return [r.student_name, r.cumulative_value.toFixed(1), promoThreshold.toFixed(0) + '%', r.gap.toFixed(1)]
      case 'Fee Payment Status': return [r.student_name, r.total_expected, r.total_paid, r.balance, r.status]
      case 'Fee Collection Summary': return [r.fee_type_name, r.total_expected, r.total_paid, r.outstanding, r.collection_rate + '%', String(r.students_count)]
      case 'Teacher Performance': return [r.teacher_name, r.subjects, String(r.classes_count), fmt(r.avg_score), r.pass_rate + '%', String(r.students_count)]
      case 'CBT Performance': return [r.exam_title, r.subject_name, String(r.total_students), fmt(r.avg_score), fmt(r.highest), fmt(r.lowest)]
      case 'Subject Trend': return [r.term_name, fmt(r.avg_score), r.pass_rate + '%', String(r.students_count), r.trend]
      case 'NCE Distribution': return [r.band, String(r.count), r.percentage + '%', r.students.join(', ')]
      case 'PACE Completion Rate': return [r.subject_name, r.subject_code, String(r.total_paces), String(r.unique_students), r.avg_paces_per_student, r.avg_pt]
      default: return []
    }
  }
  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-slate-200/60 shadow-md shadow-slate-200/30 overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="bg-teal-700 text-white">{cols.map((c, i) => <th key={i} className="px-4 py-3 text-xs font-bold uppercase text-left whitespace-nowrap">{c}</th>)}</tr></thead>
        <tbody>{data.map((r, i) => <tr key={i} className={'border-t border-slate-100 ' + (i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50')}>{getRow(r, i).map((cell, j) => <td key={j} className="px-4 py-3 text-slate-900 whitespace-nowrap">{cell}</td>)}</tr>)}</tbody>
      </table>
    </div>
  )
}
