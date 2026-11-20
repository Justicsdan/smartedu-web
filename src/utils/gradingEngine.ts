// Data-driven grading engine. No institution-specific rules live here:
// every scale, pass rule and classification band comes from configuration.

export interface GradeBand {
  grade: string
  min_score: number
  point: number
  remark?: string
  is_pass?: boolean
}

export interface GradingScheme {
  name: string
  scale_max: number
  uses_gpa: boolean
  bands: GradeBand[]
}

export interface ClassBand {
  label: string
  min: number
}

export interface ClassificationScheme {
  name: string
  basis: 'gpa' | 'percentage'
  bands: ClassBand[]
}

export type RepeatPolicy = 'count_all' | 'latest_attempt' | 'best_attempt'

export interface ResultRow {
  course_id: string
  credit_units?: number | null
  point: number
  attempted_at?: string | null
}

export function gradeScore(score: number, scheme: GradingScheme) {
  const bands = [...scheme.bands].sort((a, b) => b.min_score - a.min_score)
  if (bands.length === 0) throw new Error('Grading scheme has no bands')
  const hit = bands.find((b) => score >= b.min_score) || bands[bands.length - 1]
  return {
    grade: hit.grade,
    point: hit.point,
    remark: hit.remark || '',
    isPass: hit.is_pass !== undefined ? hit.is_pass : hit.point > 0,
  }
}

export function classify(value: number, scheme: ClassificationScheme): string {
  const bands = [...scheme.bands].sort((a, b) => b.min - a.min)
  const hit = bands.find((b) => value >= b.min)
  return hit ? hit.label : ''
}

// Credit-weighted average. With weightByCredits false, every course counts equally.
export function aggregate(
  rows: ResultRow[],
  opts: { policy?: RepeatPolicy; weightByCredits?: boolean } = {}
) {
  const policy = opts.policy || 'count_all'
  const weighted = opts.weightByCredits !== false
  let used = rows
  if (policy !== 'count_all') {
    const byCourse = new Map<string, ResultRow>()
    for (const r of rows) {
      const cur = byCourse.get(r.course_id)
      if (!cur) { byCourse.set(r.course_id, r); continue }
      if (policy === 'best_attempt') {
        if (r.point > cur.point) byCourse.set(r.course_id, r)
      } else if (String(r.attempted_at || '') >= String(cur.attempted_at || '')) {
        byCourse.set(r.course_id, r)
      }
    }
    used = Array.from(byCourse.values())
  }
  let units = 0
  let qp = 0
  for (const r of used) {
    const w = weighted ? Number(r.credit_units) || 0 : 1
    const p = Number(r.point)
    if (w <= 0 || !Number.isFinite(p)) continue
    units += w
    qp += w * p
  }
  return {
    gpa: units > 0 ? Math.round((qp / units) * 100) / 100 : 0,
    units,
    qualityPoints: qp,
    rowsUsed: used.length,
  }
}
