// CBT Question Type Detection + Fill-in-the-Blank Answer Matching

export type QuestionType = 'multiple_choice' | 'fill_blank'

// Patterns that mark a question as fill-in-the-blank
// Matches: ___ (3+ underscores), [blank], (blank), ???
const BLANK_PATTERNS = /_{3,}|\[blank\]|\(blank\)|\?{3,}/i

// Detect question type from text + options
// If question text contains a blank marker AND no MC options provided, treat as fill_blank
export function detectQuestionType(
  questionText: string,
  options?: { a?: string; b?: string; c?: string; d?: string }
): QuestionType {
  if (!questionText) return 'multiple_choice'
  const hasBlank = BLANK_PATTERNS.test(questionText)
  const hasOptions = options && [options.a, options.b, options.c, options.d]
    .filter(o => o && o.trim().length > 0).length >= 2
  // If user provided MC options, that wins (the ___ is decorative)
  if (hasOptions) return 'multiple_choice'
  if (hasBlank) return 'fill_blank'
  return 'multiple_choice'
}

// Normalize answer for comparison: lowercase, trim, collapse internal whitespace
export function normalizeAnswer(s: string, caseSensitive = false): string {
  let v = (s || '').trim()
  // collapse all internal whitespace (spaces, tabs, newlines) to single space
  v = v.replace(/\s+/g, ' ')
  if (!caseSensitive) v = v.toLowerCase()
  return v
}

// Check if student's typed answer matches the fill_blank correct answer
// Tries correct_answer first, then any accepted_answers (case-insensitive by default)
export function isFillBlankCorrect(
  studentAnswer: string,
  question: { correct_answer?: string | null; accepted_answers?: string[] | null; case_sensitive?: boolean }
): boolean {
  if (!studentAnswer || !studentAnswer.trim()) return false
  const cs = question.case_sensitive || false
  const normalized = normalizeAnswer(studentAnswer, cs)
  if (!normalized) return false

  const candidates: string[] = []
  if (question.correct_answer && question.correct_answer.trim()) {
    candidates.push(question.correct_answer)
  }
  if (Array.isArray(question.accepted_answers)) {
    for (const a of question.accepted_answers) {
      if (a && a.trim()) candidates.push(a)
    }
  }
  if (candidates.length === 0) return false

  for (const c of candidates) {
    if (normalizeAnswer(c, cs) === normalized) return true
  }
  return false
}

// Parse multi-line textarea of accepted variants into a clean array
export function parseAcceptedVariants(text: string): string[] {
  if (!text) return []
  return text.split(/[\n,;]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0)
}

// A question is fill-in-the-blank if explicitly typed, or if it has fewer than 2 options
export function isBlankQuestion(q: {
  question_type?: string | null
  option_a?: string | null
  option_b?: string | null
  option_c?: string | null
  option_d?: string | null
}): boolean {
  if (q.question_type === 'fill_blank') return true
  const opts = [q.option_a, q.option_b, q.option_c, q.option_d]
    .filter(o => o && String(o).trim().length > 0).length
  return opts < 2
}
