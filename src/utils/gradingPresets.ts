import type { GradingScheme, ClassificationScheme } from './gradingEngine'

// Starting templates only. An institution copies one into a programme and edits it.
// Nothing here is enforced anywhere.

export const GRADING_PRESETS: Record<string, GradingScheme> = {
  five_point: {
    name: '5-point scale (A to F)', scale_max: 5, uses_gpa: true,
    bands: [
      { grade: 'A', min_score: 70, point: 5, remark: 'Excellent', is_pass: true },
      { grade: 'B', min_score: 60, point: 4, remark: 'Very Good', is_pass: true },
      { grade: 'C', min_score: 50, point: 3, remark: 'Good', is_pass: true },
      { grade: 'D', min_score: 45, point: 2, remark: 'Pass', is_pass: true },
      { grade: 'E', min_score: 40, point: 1, remark: 'Pass', is_pass: true },
      { grade: 'F', min_score: 0, point: 0, remark: 'Fail', is_pass: false },
    ],
  },
  four_point: {
    name: '4-point scale (A to F)', scale_max: 4, uses_gpa: true,
    bands: [
      { grade: 'A', min_score: 70, point: 4, remark: 'Distinction', is_pass: true },
      { grade: 'B', min_score: 60, point: 3, remark: 'Upper Credit', is_pass: true },
      { grade: 'C', min_score: 50, point: 2, remark: 'Lower Credit', is_pass: true },
      { grade: 'D', min_score: 40, point: 1, remark: 'Pass', is_pass: true },
      { grade: 'F', min_score: 0, point: 0, remark: 'Fail', is_pass: false },
    ],
  },
  four_point_plus_minus: {
    name: '4.0 scale with plus/minus', scale_max: 4, uses_gpa: true,
    bands: [
      { grade: 'A', min_score: 93, point: 4.0, is_pass: true },
      { grade: 'A-', min_score: 90, point: 3.7, is_pass: true },
      { grade: 'B+', min_score: 87, point: 3.3, is_pass: true },
      { grade: 'B', min_score: 83, point: 3.0, is_pass: true },
      { grade: 'B-', min_score: 80, point: 2.7, is_pass: true },
      { grade: 'C+', min_score: 77, point: 2.3, is_pass: true },
      { grade: 'C', min_score: 73, point: 2.0, is_pass: true },
      { grade: 'C-', min_score: 70, point: 1.7, is_pass: true },
      { grade: 'D', min_score: 60, point: 1.0, is_pass: true },
      { grade: 'F', min_score: 0, point: 0, is_pass: false },
    ],
  },
  letter_only: {
    name: 'Letter grades, no GPA', scale_max: 0, uses_gpa: false,
    bands: [
      { grade: 'A', min_score: 70, point: 0, is_pass: true },
      { grade: 'B', min_score: 60, point: 0, is_pass: true },
      { grade: 'C', min_score: 50, point: 0, is_pass: true },
      { grade: 'D', min_score: 45, point: 0, is_pass: true },
      { grade: 'E', min_score: 40, point: 0, is_pass: true },
      { grade: 'F', min_score: 0, point: 0, is_pass: false },
    ],
  },
  pass_fail: {
    name: 'Pass or fail', scale_max: 0, uses_gpa: false,
    bands: [
      { grade: 'Pass', min_score: 50, point: 0, is_pass: true },
      { grade: 'Fail', min_score: 0, point: 0, is_pass: false },
    ],
  },
}

export const CLASSIFICATION_PRESETS: Record<string, ClassificationScheme> = {
  five_point_honours: {
    name: '5-point honours', basis: 'gpa',
    bands: [
      { label: 'First Class', min: 4.5 },
      { label: 'Second Class Upper', min: 3.5 },
      { label: 'Second Class Lower', min: 2.4 },
      { label: 'Third Class', min: 1.5 },
      { label: 'Pass', min: 1.0 },
    ],
  },
  percentage_honours: {
    name: 'Percentage honours', basis: 'percentage',
    bands: [
      { label: 'First', min: 70 },
      { label: 'Upper Second', min: 60 },
      { label: 'Lower Second', min: 50 },
      { label: 'Third', min: 40 },
    ],
  },
  four_point_distinction: {
    name: '4-point distinction bands', basis: 'gpa',
    bands: [
      { label: 'Distinction', min: 3.5 },
      { label: 'Upper Credit', min: 3.0 },
      { label: 'Lower Credit', min: 2.5 },
      { label: 'Pass', min: 1.0 },
    ],
  },
}
