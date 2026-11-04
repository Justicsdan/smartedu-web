export function esc(s: any): string {
  if (s === null || s === undefined) return ''
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function gradeColor(grade: string): string {
  const g = (grade || '').toUpperCase()
  if (g.startsWith('A') || ['A1', 'A2', 'A3'].includes(g)) return '#166534'
  if (g.startsWith('B') || ['B1', 'B2', 'B3'].includes(g)) return '#1e40af'
  if (g.startsWith('C') || ['C4', 'C5', 'C6'].includes(g)) return '#0e7490'
  if (g.startsWith('D') || g.startsWith('E') || ['D7', 'E8'].includes(g)) return '#b45309'
  if (g.startsWith('F') || g === 'F9') return '#991b1b'
  return '#374151'
}

export function ratingLetter(val: string): string {
  const v = (val || '').toLowerCase()
  if (v === 'excellent') return 'A'
  if (v === 'very good') return 'B'
  if (v === 'good') return 'B'
  if (v === 'fair') return 'C'
  if (v === 'poor') return 'D'
  return '—'
}

export function ratingColor(val: string): string {
  const v = (val || '').toLowerCase()
  if (v === 'excellent') return '#10b981'
  if (v === 'very good') return '#3b82f6'
  if (v === 'good') return '#0891b2'
  if (v === 'fair') return '#f59e0b'
  if (v === 'poor') return '#ef4444'
  return '#64748b'
}
