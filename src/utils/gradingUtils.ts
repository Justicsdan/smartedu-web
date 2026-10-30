// GradingUtils - TypeScript port of Flutter's grading_utils.dart
// VERIFIED against Flutter source.

export interface AssessmentType {
  id: string
  name: string
  max: number
}

export interface GradeBand {
  min: number
  max: number
  grade: string
  remark: string
  point?: number
}

export interface SchoolSettings {
  grading_standard?: string
  exam_template?: string
  assessment_types?: AssessmentType[]
  assessment_types_jss?: AssessmentType[]
  assessment_types_primary?: AssessmentType[]
  grading_system?: GradeBand[]
  grading_system_jss?: GradeBand[]
  grading_system_primary?: GradeBand[]
}

export const availableTemplates: string[] = ['WAEC', 'BECE', 'NECO', 'IGCSE', 'PRIMARY', 'AMERICAN']

export function getTemplateLabel(template: string): string {
  switch (template.toUpperCase()) {
    case 'WAEC': return 'WAEC (Senior Secondary)'
    case 'BECE': return 'BECE (Junior Secondary)'
    case 'NECO': return 'NECO (Senior Secondary)'
    case 'IGCSE': return 'Cambridge IGCSE'
    case 'PRIMARY': return 'Primary School (5-Point)'
    case 'AMERICAN': return 'American GPA System'
    default: return template
  }
}

export function getDefaultAssessmentTypes(template: string): AssessmentType[] {
  switch (template.toUpperCase()) {
    case 'BECE':
      return [
        { id: 'ca', name: 'CA', max: 40 },
        { id: 'exam', name: 'Exam', max: 60 },
      ]
    case 'PRIMARY':
      return [
        { id: 'ca1', name: 'CA1', max: 20 },
        { id: 'ca2', name: 'CA2', max: 20 },
        { id: 'exam', name: 'Exam', max: 60 },
      ]
    case 'AMERICAN':
      return [
        { id: 'assignment', name: 'Assignments', max: 15 },
        { id: 'quiz', name: 'Quizzes', max: 15 },
        { id: 'midterm', name: 'Mid-term', max: 20 },
        { id: 'participation', name: 'Participation', max: 10 },
        { id: 'exam', name: 'Final Exam', max: 40 },
      ]
    case 'WAEC':
    case 'NECO':
    case 'IGCSE':
    default:
      return [
        { id: 'ca1', name: 'CA1', max: 10 },
        { id: 'ca2', name: 'CA2', max: 10 },
        { id: 'assignment', name: 'Assignment', max: 10 },
        { id: 'midterm', name: 'Mid-term', max: 20 },
        { id: 'exam', name: 'Exam', max: 50 },
      ]
  }
}

export function getDefaultGradingSystem(template: string): GradeBand[] {
  switch (template.toUpperCase()) {
    case 'WAEC':
    case 'NECO':
      return [
        { min: 75, max: 100, grade: 'A1', remark: 'Excellent' },
        { min: 70, max: 74, grade: 'B2', remark: 'Very Good' },
        { min: 65, max: 69, grade: 'B3', remark: 'Good' },
        { min: 60, max: 64, grade: 'C4', remark: 'Credit' },
        { min: 55, max: 59, grade: 'C5', remark: 'Credit' },
        { min: 50, max: 54, grade: 'C6', remark: 'Credit' },
        { min: 45, max: 49, grade: 'D7', remark: 'Pass' },
        { min: 40, max: 44, grade: 'E8', remark: 'Pass' },
        { min: 0, max: 39, grade: 'F9', remark: 'Fail' },
      ]
    case 'BECE':
      return [
        { min: 70, max: 100, grade: 'A', remark: 'Distinction' },
        { min: 60, max: 69, grade: 'B', remark: 'Upper Credit' },
        { min: 50, max: 59, grade: 'C', remark: 'Lower Credit' },
        { min: 45, max: 49, grade: 'P', remark: 'Pass' },
        { min: 0, max: 44, grade: 'F', remark: 'Fail' },
      ]
    case 'IGCSE':
      return [
        { min: 90, max: 100, grade: 'A*', remark: 'Outstanding' },
        { min: 80, max: 89, grade: 'A', remark: 'Excellent' },
        { min: 70, max: 79, grade: 'B', remark: 'Very Good' },
        { min: 60, max: 69, grade: 'C', remark: 'Good' },
        { min: 50, max: 59, grade: 'D', remark: 'Satisfactory' },
        { min: 40, max: 49, grade: 'E', remark: 'Weak' },
        { min: 30, max: 39, grade: 'F', remark: 'Poor' },
        { min: 0, max: 29, grade: 'G', remark: 'Very Poor' },
      ]
    case 'PRIMARY':
      return [
        { min: 90, max: 100, grade: '5', remark: 'Excellent' },
        { min: 80, max: 89, grade: '4', remark: 'Very Good' },
        { min: 70, max: 79, grade: '3', remark: 'Good' },
        { min: 50, max: 69, grade: '2', remark: 'Fair' },
        { min: 0, max: 49, grade: '1', remark: 'Poor' },
      ]
    case 'AMERICAN':
      return [
        { min: 93, max: 100, grade: 'A', remark: 'Excellent', point: 4.0 },
        { min: 90, max: 92, grade: 'A-', remark: 'Excellent', point: 3.7 },
        { min: 87, max: 89, grade: 'B+', remark: 'Very Good', point: 3.3 },
        { min: 83, max: 86, grade: 'B', remark: 'Very Good', point: 3.0 },
        { min: 80, max: 82, grade: 'B-', remark: 'Good', point: 2.7 },
        { min: 77, max: 79, grade: 'C+', remark: 'Good', point: 2.3 },
        { min: 73, max: 76, grade: 'C', remark: 'Satisfactory', point: 2.0 },
        { min: 70, max: 72, grade: 'C-', remark: 'Satisfactory', point: 1.7 },
        { min: 67, max: 69, grade: 'D+', remark: 'Poor', point: 1.3 },
        { min: 63, max: 66, grade: 'D', remark: 'Poor', point: 1.0 },
        { min: 60, max: 62, grade: 'D-', remark: 'Poor', point: 0.7 },
        { min: 0, max: 59, grade: 'F', remark: 'Fail', point: 0.0 },
      ]
    default:
      return getDefaultGradingSystem('WAEC')
  }
}

export function getTemplateForTier(tier: string): string {
  switch ((tier || '').toUpperCase()) {
    case 'JSS':
    case 'JUNIOR':
      return 'BECE'
    case 'SSS':
    case 'SENIOR':
      return 'WAEC'
    case 'PRIMARY':
      return 'PRIMARY'
    default:
      return 'WAEC'
  }
}

export function getGradingSystemForTier(tier: string, settings: SchoolSettings): GradeBand[] {
  const standard = (settings.grading_standard || '').toLowerCase()
  if (standard === 'american') {
    return getDefaultGradingSystem('AMERICAN')
  }
  switch ((tier || '').toUpperCase()) {
    case 'JSS':
      if (settings.grading_system_jss && settings.grading_system_jss.length > 0) return settings.grading_system_jss
      return getDefaultGradingSystem('BECE')
    case 'PRIMARY':
      if (settings.grading_system_primary && settings.grading_system_primary.length > 0) return settings.grading_system_primary
      return getDefaultGradingSystem('PRIMARY')
    case 'SSS':
    default:
      if (settings.grading_system && settings.grading_system.length > 0) return settings.grading_system
      const template = (settings.exam_template || 'WAEC').toUpperCase()
      return getDefaultGradingSystem(template)
  }
}

export function getAssessmentTypesForTier(tier: string, settings: SchoolSettings): AssessmentType[] {
  const standard = (settings.grading_standard || '').toLowerCase()
  if (standard === 'american') {
    return getDefaultAssessmentTypes('AMERICAN')
  }
  switch ((tier || '').toUpperCase()) {
    case 'JSS':
      if (settings.assessment_types_jss && settings.assessment_types_jss.length > 0) return settings.assessment_types_jss
      return getDefaultAssessmentTypes('BECE')
    case 'PRIMARY':
      if (settings.assessment_types_primary && settings.assessment_types_primary.length > 0) return settings.assessment_types_primary
      return getDefaultAssessmentTypes('PRIMARY')
    case 'SSS':
    default:
      if (settings.assessment_types && settings.assessment_types.length > 0) return settings.assessment_types
      return getDefaultAssessmentTypes('WAEC')
  }
}

export interface GradeResult {
  grade: string
  remark: string
  isCredit: boolean
  point?: number
}

export function getGradeFromSystem(score: number, gradingSystem: GradeBand[]): GradeResult {
  if (!gradingSystem || gradingSystem.length === 0) {
    return getGradeFromSystem(score, getDefaultGradingSystem('WAEC'))
  }
  for (const g of gradingSystem) {
    if (score >= g.min && score <= g.max) {
      return {
        grade: g.grade,
        remark: g.remark,
        isCredit: isCreditGrade(g.grade, gradingSystem),
        point: g.point,
      }
    }
  }
  const lowest = gradingSystem[gradingSystem.length - 1]
  return { grade: lowest.grade, remark: lowest.remark, isCredit: false, point: lowest.point }
}

export function getGrade(score: number, gradingSystem: GradeBand[]): string {
  return getGradeFromSystem(score, gradingSystem).grade
}

export function getFailGrades(gradingSystem: GradeBand[]): string[] {
  if (!gradingSystem || gradingSystem.length === 0) return ['F', 'F9', 'G', '1']
  const fails: string[] = []
  for (const g of gradingSystem) {
    const remark = (g.remark || '').toLowerCase()
    if (remark.includes('fail') || remark.includes('very poor')) {
      fails.push(g.grade)
    }
  }
  if (fails.length === 0) {
    fails.push(gradingSystem[gradingSystem.length - 1].grade)
  }
  return fails
}

export function isCreditGrade(grade: string, gradingSystem: GradeBand[]): boolean {
  if (!gradingSystem || gradingSystem.length === 0) return true
  return !getFailGrades(gradingSystem).includes(grade)
}

export function isPassingGrade(grade: string, gradingSystem: GradeBand[]): boolean {
  if (!grade) return false
  return !getFailGrades(gradingSystem).includes(grade)
}

export function getPassingThreshold(gradingSystem: GradeBand[]): number {
  if (!gradingSystem || gradingSystem.length === 0) return 50
  const failGrades = getFailGrades(gradingSystem)
  for (const g of gradingSystem) {
    if (!failGrades.includes(g.grade)) return g.min
  }
  return 50
}

export function computeStudentSummary(
  studentScores: Array<{ total: number; grade: string }>,
  gradingSystem: GradeBand[],
): { totalScore: number; subjectsTaken: number; averageScore: number; grade: string } {
  if (!studentScores || studentScores.length === 0) {
    return { totalScore: 0, subjectsTaken: 0, averageScore: 0, grade: '' }
  }
  let totalScore = 0
  for (const sc of studentScores) totalScore += Number(sc.total) || 0
  const subjectsTaken = studentScores.length
  const averageScore = subjectsTaken > 0 ? totalScore / subjectsTaken : 0
  return {
    totalScore,
    subjectsTaken,
    averageScore,
    grade: getGradeFromSystem(averageScore, gradingSystem).grade,
  }
}

export function computeClassPositions(
  studentSummaries: Array<{ student_id: string; averageScore: number }>,
): Array<{ student_id: string; averageScore: number; position: number; positionOutOf: number }> {
  if (!studentSummaries || studentSummaries.length === 0) return []
  const sorted = [...studentSummaries].sort((a, b) => (b.averageScore || 0) - (a.averageScore || 0))
  const total = sorted.length
  let pos = 0
  let prevAvg: number | null = null
  return sorted.map((s, i) => {
    const avg = s.averageScore || 0
    if (prevAvg === null || avg !== prevAvg) {
      pos = i + 1
      prevAvg = avg
    }
    return { student_id: s.student_id, averageScore: avg, position: pos, positionOutOf: total }
  })
}

export function countPassFail(
  studentScores: Array<{ grade: string }>,
  gradingSystem: GradeBand[],
): { passed: number; failed: number; total: number } {
  let passed = 0
  let failed = 0
  for (const sc of studentScores) {
    const grade = (sc.grade || '').toString()
    if (!grade) continue
    if (isPassingGrade(grade, gradingSystem)) passed++
    else failed++
  }
  return { passed, failed, total: passed + failed }
}

export const behavioralFieldKeys: string[] = [
  'punctuality',
  'relationship_with_others',
  'attendance_in_class',
  'games_sports',
  'attentiveness_in_class',
  'handling_tools_lab_workshops',
  'carrying_out_assignments',
  'participation_in_school_activities',
  'neatness',
  'honesty',
  'self_control',
]

export const behavioralFieldLabels: Record<string, string> = {
  punctuality: 'Punctuality',
  relationship_with_others: 'Relationship with Others',
  attendance_in_class: 'Attendance in Class',
  games_sports: 'Games/Sports',
  attentiveness_in_class: 'Attentiveness in Class',
  handling_tools_lab_workshops: 'Handling of Tools, Lab. & Workshops',
  carrying_out_assignments: 'Carrying out Assignments',
  participation_in_school_activities: 'Participation in School Activities',
  neatness: 'Neatness',
  honesty: 'Honesty',
  self_control: 'Self-Control',
}

export const behavioralOptions: string[] = ['Excellent', 'Very Good', 'Good', 'Fair', 'Poor']

export function calculateGpa(gradesWithPoints: Array<{ point?: number }>): number {
  if (!gradesWithPoints || gradesWithPoints.length === 0) return 0
  let total = 0
  for (const g of gradesWithPoints) total += Number(g.point) || 0
  return total / gradesWithPoints.length
}

export function calculateWeightedGpa(gradesWithPointsAndUnits: Array<{ point?: number; credit_unit?: number }>): number {
  let totalWeighted = 0
  let totalUnits = 0
  for (const g of gradesWithPointsAndUnits) {
    const point = Number(g.point) || 0
    const unit = Number(g.credit_unit) || 1
    totalWeighted += point * unit
    totalUnits += unit
  }
  return totalUnits > 0 ? totalWeighted / totalUnits : 0
}
