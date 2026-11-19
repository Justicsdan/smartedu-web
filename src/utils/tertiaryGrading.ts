export type ProgrammeType = 'degree' | 'ijmb'
export const PROGRAMME_TYPES: readonly ProgrammeType[] = ['degree', 'ijmb']
export type AssessmentSource = 'internal' | 'board'

export interface GradeScale {
  grade: string
  gp: number
  remark: string
  minScore: number
  ijmbPoints?: number
}

export interface ComputedGradeResult {
  grade: string
  gp: number
  remark: string
  programmeType: ProgrammeType
  ijmbPoints: number | null
}

export interface ComputedUnitGradeResult {
  grade: string
  gradePoint: number
  qualityPoints: number
  remark: string
  programmeType: ProgrammeType
  ijmbPoints: number | null
  usesCreditUnits: boolean
}

export function getIjmbGradeScale(customGrades?: GradeScale[]): GradeScale[] {
  if (customGrades && Array.isArray(customGrades) && customGrades.length > 0) {
    return customGrades.map((g) => ({
      ...g,
      ijmbPoints: g.ijmbPoints ?? g.gp,
    }))
  }

  return [
    { grade: 'A', gp: 5.0, ijmbPoints: 5, remark: 'Distinction', minScore: 70 },
    { grade: 'B', gp: 4.0, ijmbPoints: 4, remark: 'Very Good', minScore: 60 },
    { grade: 'C', gp: 3.0, ijmbPoints: 3, remark: 'Credit', minScore: 50 },
    { grade: 'D', gp: 2.0, ijmbPoints: 2, remark: 'Pass', minScore: 45 },
    { grade: 'E', gp: 1.0, ijmbPoints: 1, remark: 'Conditional Pass', minScore: 40 },
    { grade: 'F', gp: 0.0, ijmbPoints: 0, remark: 'Fail', minScore: 0 },
  ]
}

export function getGradeScale(
  schoolType: string,
  customGrades?: GradeScale[],
  programmeType: ProgrammeType = 'degree'
): GradeScale[] {
  if (programmeType === 'ijmb') {
    return getIjmbGradeScale(customGrades)
  }

  if (customGrades && Array.isArray(customGrades) && customGrades.length > 0) {
    return customGrades
  }

  switch (schoolType) {
    case 'university':
    case 'college_of_agriculture':
      return [
        { grade: 'A', gp: 5.0, remark: 'Excellent', minScore: 70 },
        { grade: 'B', gp: 4.0, remark: 'Very Good', minScore: 60 },
        { grade: 'C', gp: 3.0, remark: 'Good', minScore: 50 },
        { grade: 'D', gp: 2.0, remark: 'Pass', minScore: 45 },
        { grade: 'E', gp: 1.0, remark: 'Pass', minScore: 40 },
        { grade: 'F', gp: 0.0, remark: 'Fail', minScore: 0 },
      ]
    case 'polytechnic':
    case 'monotechnic':
    case 'ieic':
      return [
        { grade: 'A', gp: 4.0, remark: 'Distinction', minScore: 70 },
        { grade: 'B', gp: 3.0, remark: 'Upper Credit', minScore: 60 },
        { grade: 'C', gp: 2.0, remark: 'Lower Credit', minScore: 50 },
        { grade: 'D', gp: 1.0, remark: 'Pass', minScore: 40 },
        { grade: 'F', gp: 0.0, remark: 'Fail', minScore: 0 },
      ]
    case 'college_of_education':
      return [
        { grade: 'A', gp: 4.0, remark: 'Distinction', minScore: 70 },
        { grade: 'B', gp: 3.0, remark: 'Credit', minScore: 60 },
        { grade: 'C', gp: 2.0, remark: 'Merit', minScore: 50 },
        { grade: 'D', gp: 1.0, remark: 'Pass', minScore: 40 },
        { grade: 'F', gp: 0.0, remark: 'Fail', minScore: 0 },
      ]
    default:
      return [
        { grade: 'A', gp: 5.0, remark: 'Excellent', minScore: 70 },
        { grade: 'B', gp: 4.0, remark: 'Very Good', minScore: 60 },
        { grade: 'C', gp: 3.0, remark: 'Good', minScore: 50 },
        { grade: 'D', gp: 2.0, remark: 'Pass', minScore: 45 },
        { grade: 'E', gp: 1.0, remark: 'Pass', minScore: 40 },
        { grade: 'F', gp: 0.0, remark: 'Fail', minScore: 0 },
      ]
  }
}

export function getClassOfDegree(
  schoolType: string,
  cgpa: number,
  programmeType: ProgrammeType = 'degree'
): string {
  if (programmeType === 'ijmb') {
    return 'IJMB Programme'
  }

  switch (schoolType) {
    case 'university':
    case 'college_of_agriculture':
      if (cgpa >= 4.5) return 'First Class'
      if (cgpa >= 3.5) return 'Second Class Upper'
      if (cgpa >= 2.4) return 'Second Class Lower'
      if (cgpa >= 1.0) return 'Third Class'
      if (cgpa >= 0.5) return 'Pass'
      return 'Probation'
    case 'polytechnic':
    case 'monotechnic':
    case 'ieic':
      if (cgpa >= 3.5) return 'Distinction'
      if (cgpa >= 3.0) return 'Upper Credit'
      if (cgpa >= 2.5) return 'Lower Credit'
      if (cgpa >= 1.0) return 'Pass'
      return 'Probation'
    case 'college_of_education':
      if (cgpa >= 3.5) return 'Distinction'
      if (cgpa >= 3.0) return 'Credit'
      if (cgpa >= 2.0) return 'Merit'
      if (cgpa >= 1.0) return 'Pass'
      return 'Probation'
    default:
      if (cgpa >= 4.5) return 'First Class'
      if (cgpa >= 3.5) return 'Second Class Upper'
      if (cgpa >= 2.4) return 'Second Class Lower'
      if (cgpa >= 1.0) return 'Third Class'
      return 'Pass'
  }
}

export function computeGrade(
  score: number,
  schoolType: string,
  customGrades?: GradeScale[],
  programmeType: ProgrammeType = 'degree'
): { grade: string; gp: number; remark: string } {
  const scale = [...getGradeScale(schoolType, customGrades, programmeType)].sort(
    (a, b) => b.minScore - a.minScore
  )

  let matched = scale[scale.length - 1] || { grade: 'F', gp: 0.0, remark: 'Fail', minScore: 0 }
  for (const s of scale) {
    if (score >= s.minScore) {
      matched = s
      break
    }
  }

  if (programmeType === 'ijmb') {
    return {
      grade: matched.grade,
      gp: 0.0,
      remark: matched.remark,
    }
  }

  return {
    grade: matched.grade,
    gp: matched.gp,
    remark: matched.remark,
  }
}

export function computeIjmbSubjectPoints(
  score: number,
  customGrades?: GradeScale[]
): { grade: string; points: number; remark: string } {
  const scale = [...getIjmbGradeScale(customGrades)].sort((a, b) => b.minScore - a.minScore)
  for (const s of scale) {
    if (score >= s.minScore) {
      return {
        grade: s.grade,
        points: s.ijmbPoints ?? Math.round(s.gp),
        remark: s.remark,
      }
    }
  }
  const lowest = scale[scale.length - 1] || { grade: 'F', ijmbPoints: 0, gp: 0, remark: 'Fail' }
  return {
    grade: lowest.grade,
    points: lowest.ijmbPoints ?? 0,
    remark: lowest.remark,
  }
}

export function calculateIjmbTotalPoints(subjectScores: number[], customGrades?: GradeScale[]): number {
  return subjectScores.reduce((sum, score) => {
    return sum + computeIjmbSubjectPoints(score, customGrades).points
  }, 0)
}

export function computeGradeWithUnits(
  score: number,
  creditUnits: number,
  schoolType: string,
  customGrades?: GradeScale[],
  programmeType: ProgrammeType = 'degree'
): { grade: string; gradePoint: number; qualityPoints: number; remark: string } {
  if (programmeType === 'ijmb') {
    const ijmb = computeIjmbSubjectPoints(score, customGrades)
    return {
      grade: ijmb.grade,
      gradePoint: 0,
      qualityPoints: 0,
      remark: ijmb.remark,
    }
  }

  const { grade, gp, remark } = computeGrade(score, schoolType, customGrades, 'degree')
  const units = Number(creditUnits) || 0
  return {
    grade,
    gradePoint: gp,
    qualityPoints: Math.round(gp * units * 100) / 100,
    remark,
  }
}

export function computeProgrammeResult(params: {
  score: number
  creditUnits?: number
  schoolType: string
  customGrades?: GradeScale[]
  programmeType?: ProgrammeType
  assessmentSource?: AssessmentSource
}) {
  const programmeType: ProgrammeType = params.programmeType ?? 'degree'
  const assessmentSource: AssessmentSource = params.assessmentSource ?? 'internal'
  const usesCreditUnits = programmeType === 'degree'
  const base = computeGradeWithUnits(
    params.score,
    params.creditUnits ?? 0,
    params.schoolType,
    params.customGrades,
    programmeType
  )
  const ijmbPoints =
    programmeType === 'ijmb' ? computeIjmbSubjectPoints(params.score, params.customGrades).points : null

  return {
    ...base,
    programmeType,
    ijmbPoints,
    usesCreditUnits,
    assessmentSource,
  }
}
