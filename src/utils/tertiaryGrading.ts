export interface GradeScale {
  grade: string
  gp: number
  remark: string
  minScore: number
}

export function getGradeScale(schoolType: string, customGrades?: GradeScale[]): GradeScale[] {
  // If the admin has set custom grades in the database, use them!
  if (customGrades && Array.isArray(customGrades) && customGrades.length > 0) {
    return customGrades
  }

  // Otherwise, fallback to sensible defaults based on school_type
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

export function getClassOfDegree(schoolType: string, cgpa: number): string {
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

export function computeGrade(score: number, schoolType: string, customGrades?: GradeScale[]): { grade: string; gp: number; remark: string } {
  const scale = getGradeScale(schoolType, customGrades)
  for (const s of scale) {
    if (score >= s.minScore) {
      return { grade: s.grade, gp: s.gp, remark: s.remark }
    }
  }
  const lowest = scale[scale.length - 1] || { grade: 'F', gp: 0.0, remark: 'Fail' }
  return { grade: lowest.grade, gp: lowest.gp, remark: lowest.remark }
}
