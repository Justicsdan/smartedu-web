// Premium Report Card — well-organized layout inspired by Exalted High Academy sample
// Key improvements: 2-col student info grid, 3-col bottom section (Behavioral | Ratings Key | Grading), compact final remark

export interface ReportData {
  schoolName: string
  schoolMotto: string
  schoolLogo: string
  schoolAddress: string
  schoolPhone: string
  schoolEmail: string
  principalName: string
  principalSignatureUrl: string
  schoolStampUrl: string
  passportUrl: string
  reportTitle: string
  sessionName: string
  studentName: string
  admissionNo: string
  studentClass: string
  gender: string
  position: string
  positionOutOf: string | number
  totalScore: number
  averageScore: string
  grade: string
  totalSubjects: number
  passed: number
  failed: number
  daysPresent: number
  daysAbsent: number
  teacherComment: string
  principalComment: string
  assessmentHeaders: Array<{ id: string; name: string; max: number }>
  scoreRows: Array<{ subject: string; cells: (string | number)[]; total: number; grade: string; remark: string; isPass: boolean }>
  behavioralRows: Array<{ label: string; value: string; color: string }>
  gradingScale: Array<{ grade: string; range: string; remark: string }>
  primaryColor: string
}

function esc(s: any): string {
  if (s === null || s === undefined) return ''
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function gradeColor(grade: string): string {
  const g = (grade || '').toUpperCase()
  if (g.startsWith('A') || ['A1', 'A2', 'A3'].includes(g)) return '#10b981'
  if (g.startsWith('B') || ['B1', 'B2', 'B3'].includes(g)) return '#3b82f6'
  if (g.startsWith('C') || ['C4', 'C5', 'C6'].includes(g)) return '#0891b2'
  if (g.startsWith('D') || g.startsWith('E') || ['D7', 'E8'].includes(g)) return '#f59e0b'
  if (g.startsWith('F') || g === 'F9') return '#ef4444'
  return '#64748b'
}

function gradeBg(grade: string): string {
  return gradeColor(grade) + '20'
}

function isFailGrade(grade: string): boolean {
  const g = (grade || '').toUpperCase()
  return g.startsWith('F') || g === 'F9'
}

function ratingLetter(val: string): string {
  const v = (val || '').toLowerCase()
  if (v === 'excellent') return 'A'
  if (v === 'very good') return 'B'
  if (v === 'good') return 'B'
  if (v === 'fair') return 'C'
  if (v === 'poor') return 'D'
  return '—'
}

function ratingBgColor(val: string): string {
  const v = (val || '').toLowerCase()
  if (v === 'excellent') return '#10b981'
  if (v === 'very good') return '#3b82f6'
  if (v === 'good') return '#0891b2'
  if (v === 'fair') return '#f59e0b'
  if (v === 'poor') return '#ef4444'
  return '#64748b'
}

export function printReportCard(data: ReportData) {
  const D = esc
  const brand = data.primaryColor || '#1e3a8a'
  const brandDark = '#1e1b4b'
  const brandLight = '#eff6ff'
  const lightTint = '#f8fafc'
  const passColor = '#059669'
  const failColor = '#dc2626'
  const borderColor = '#e2e8f0'
  const textColorGrey = '#64748b'
  const textColorDark = '#0f172a'

  const fileName = [data.studentName, data.reportTitle || 'result'].filter(Boolean).join('_').replace(/\s+/g, '_').replace(/[^\w-]/g, '') + '.pdf'

  // ─── Score table header ───
  const assessmentTh = data.assessmentHeaders.map(h =>
    '<th><div class="assess-name">' + D(h.name) + '</div><div class="assess-max">(' + D(h.max) + ')</div></th>'
  ).join('')

  // ─── Score table rows ───
  const scoreRowsHtml = data.scoreRows.length > 0
    ? data.scoreRows.map((r, i) => {
        const cells = r.cells.map(c => '<td class="cell">' + D(c) + '</td>').join('')
        const gColor = gradeColor(r.grade)
        const totalStr = r.total === Math.round(r.total) ? String(r.total) : r.total.toFixed(1)
        return '<tr class="' + (i % 2 === 0 ? 'row-even' : 'row-odd') + '">' +
          '<td class="sn">' + (i + 1) + '</td>' +
          '<td class="subject">' + D(r.subject) + '</td>' +
          cells +
          '<td class="total ' + (r.isPass ? 'pass' : 'fail') + '">' + D(totalStr) + '</td>' +
          '<td class="grade-cell"><span class="grade-pill" style="background:' + gradeBg(r.grade) + ';color:' + gColor + ';">' + D(r.grade) + '</span></td>' +
          '<td class="remark ' + (r.isPass ? 'pass' : 'fail') + '">' + D(r.remark) + '</td>' +
          '</tr>'
      }).join('')
    : '<tr><td colspan="' + (data.assessmentHeaders.length + 5) + '" class="empty">No scores published for this term</td></tr>'

  // ─── Grading scale rows ───
  const gradingScaleHtml = data.gradingScale.length > 0
    ? data.gradingScale.map((g, i) => {
        const rowClass = i % 2 === 0 ? 'row-even' : 'row-odd'
        const fail = isFailGrade(g.grade)
        const gColor = gradeColor(g.grade)
        return '<tr class="' + rowClass + '">' +
          '<td class="gs-range">' + D(g.range) + '</td>' +
          '<td class="gs-grade"><span class="grade-pill-sm" style="background:' + gradeBg(g.grade) + ';color:' + gColor + ';">' + D(g.grade) + '</span></td>' +
          '<td class="gs-remark ' + (fail ? 'fail' : '') + '">' + D(g.remark) + '</td>' +
          '</tr>'
      }).join('')
    : '<tr><td colspan="3" class="empty">No grading scale</td></tr>'

  // ─── Behavioral rows (compact, 2-col: Trait | Letter) ───
  const behavioralRowsHtml = data.behavioralRows.length > 0
    ? data.behavioralRows.map((r, i) => {
        const hasValue = r.value && r.value !== '—' && r.value !== '-'
        const bgColor = hasValue ? ratingBgColor(r.value) : '#94a3b8'
        const letter = hasValue ? ratingLetter(r.value) : '—'
        const rowClass = i % 2 === 0 ? 'row-even' : 'row-odd'
        return '<tr class="' + rowClass + '">' +
          '<td class="behav-trait">' + D(r.label) + '</td>' +
          '<td class="behav-letter"><span class="behav-circle" style="background:' + bgColor + ';">' + D(letter) + '</span></td>' +
          '</tr>'
      }).join('')
    : '<tr><td colspan="2" class="empty">No ratings</td></tr>'

  // ─── Ratings key ───
  const ratingsKeyHtml = [
    { letter: 'A', label: 'Excellent', color: '#10b981' },
    { letter: 'B', label: 'Good', color: '#3b82f6' },
    { letter: 'C', label: 'Fair', color: '#f59e0b' },
    { letter: 'D', label: 'Poor', color: '#ef4444' },
  ].map((k, i) => {
    const rowClass = i % 2 === 0 ? 'row-even' : 'row-odd'
    return '<tr class="' + rowClass + '">' +
      '<td class="rk-letter"><span class="behav-circle" style="background:' + k.color + ';">' + k.letter + '</span></td>' +
      '<td class="rk-label">' + D(k.label) + '</td>' +
      '</tr>'
  }).join('')

  // ─── Header logo ───
  const headerLogo = data.schoolLogo
    ? '<div class="logo-wrap"><img src="' + D(data.schoolLogo) + '" class="logo" alt="" onerror="this.style.display=\'none\'"></div>'
    : '<div class="logo-wrap logo-fallback">' + D((data.schoolName || 'S').charAt(0)) + '</div>'

  // ─── Watermark ───
  const watermark = data.schoolLogo
    ? '<div class="watermark"><img src="' + D(data.schoolLogo) + '" alt=""></div>'
    : '<div class="watermark-text">' + D(data.schoolName) + '</div>'

  // ─── Passport ───
  const passportHtml = data.passportUrl
    ? '<img src="' + D(data.passportUrl) + '" class="passport" alt="" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'"><div class="passport-fallback">No Photo</div>'
    : '<div class="passport-fallback" style="display:flex;">No Photo</div>'

  // ─── Student info 2-column grid (matches Exalted sample layout) ───
  const studentInfoGrid = `
    <div class="info-grid">
      <div class="info-item"><span class="info-lbl">Student's Name</span><span class="info-val">${D(data.studentName)}</span></div>
      <div class="info-item"><span class="info-lbl">Gender</span><span class="info-val">${D(data.gender || '—')}</span></div>
      <div class="info-item"><span class="info-lbl">Admission No</span><span class="info-val">${D(data.admissionNo || '—')}</span></div>
      <div class="info-item"><span class="info-lbl">Class</span><span class="info-val">${D(data.studentClass || '—')}</span></div>
      <div class="info-item"><span class="info-lbl">Term/Session</span><span class="info-val">${D(data.reportTitle || '—')}${data.sessionName ? ' / ' + D(data.sessionName) : ''}</span></div>
      <div class="info-item"><span class="info-lbl">Position</span><span class="info-val">${D(data.position || '—')}</span></div>
      <div class="info-item"><span class="info-lbl">Total Score</span><span class="info-val">${D(data.totalScore)}</span></div>
      <div class="info-item"><span class="info-lbl">Average Score</span><span class="info-val">${D(data.averageScore)}</span></div>
      <div class="info-item"><span class="info-lbl">No in Class</span><span class="info-val">${D(data.positionOutOf || '—')}</span></div>
      <div class="info-item"><span class="info-lbl">Times Present</span><span class="info-val">${D(data.daysPresent || 0)}</span></div>
      <div class="info-item"><span class="info-lbl">Times Absent</span><span class="info-val">${D(data.daysAbsent || 0)}</span></div>
      <div class="info-item"><span class="info-lbl">No of Subjects</span><span class="info-val">${D(data.totalSubjects)}</span></div>
    </div>`

  // ─── Final remark box ───
  const finalRemark = (data.teacherComment || data.principalComment) ? `
    <div class="final-remark">
      <div class="remark-title">Final Remark</div>
      <div class="remark-content">
        ${data.teacherComment ? '<div class="remark-row"><strong>Teacher:</strong> ' + D(data.teacherComment) + '</div>' : ''}
        ${data.principalComment ? '<div class="remark-row"><strong>Principal:</strong> ' + D(data.principalComment) + '</div>' : ''}
      </div>
    </div>` : ''

  // ─── Signatures ───
  const stampHtml = data.schoolStampUrl ? '<img src="' + D(data.schoolStampUrl) + '" class="stamp" alt="" onerror="this.style.display=\'none\'">' : ''
  const sigHtml = data.principalSignatureUrl ? '<img src="' + D(data.principalSignatureUrl) + '" class="sig" alt="" onerror="this.style.display=\'none\'">' : ''

  const signaturesHtml = `
    <div class="signatures">
      <div class="sign-box">
        <div class="sign-role">Class Teacher</div>
        <div class="sign-line"></div>
        <div class="sign-name">Signature &amp; Date</div>
      </div>
      ${stampHtml ? '<div class="stamp-wrap">' + stampHtml + '</div>' : ''}
      <div class="sign-box">
        <div class="sign-role">Principal</div>
        <div class="sign-line"></div>
        ${sigHtml}
        <div class="sign-name">${D(data.principalName || 'Signature &amp; Date')}</div>
      </div>
    </div>`


  const html = [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8">',
    '<title>' + D(fileName) + '</title>',
    '<style>',
    '* { box-sizing: border-box; margin: 0; padding: 0; }',
    '@page { size: A4; margin: 8mm; }',
    'body { font-family: "Helvetica Neue", Arial, sans-serif; color: ' + textColorDark + '; background: #f1f5f9; line-height: 1.4; -webkit-print-color-adjust: exact; print-color-adjust: exact; }',
    '.page { max-width: 800px; margin: 20px auto; background: white; padding: 24px 28px; border-radius: 10px; box-shadow: 0 20px 60px rgba(15, 23, 42, 0.12); position: relative; overflow: hidden; }',
    '@media print { body { background: white; } .page { box-shadow: none; margin: 0; padding: 0; max-width: none; border-radius: 0; } .no-print { display: none !important; } }',
    '.toolbar { max-width: 800px; margin: 20px auto 0; padding: 12px 18px; background: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); display: flex; gap: 10px; align-items: center; }',
    '.toolbar button { padding: 8px 16px; border: none; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; }',
    '.btn-print { background: ' + brand + '; color: white; }',
    '.btn-back { background: #f1f5f9; color: #475569; }',
    '.toolbar .filename { margin-left: auto; font-size: 11px; color: #94a3b8; font-family: monospace; }',
    // ─── Watermark ───
    '.watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 650px; height: 650px; opacity: 0.12; pointer-events: none; z-index: 0; }',
    '.watermark img { width: 100%; height: 100%; object-fit: contain; }',
    '.watermark-text { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 130px; font-weight: 900; color: rgba(30, 58, 138, 0.12); pointer-events: none; z-index: 0; text-align: center; letter-spacing: -2px; }',
    // ─── Header ───
    '.header { display: flex; align-items: center; gap: 16px; padding-bottom: 12px; position: relative; z-index: 1; }',
    '.header-text { flex: 1; text-align: center; }',
    '.school-name { font-size: 22px; font-weight: 800; color: ' + brand + '; letter-spacing: 0.5px; text-transform: uppercase; line-height: 1.2; }',
    '.school-motto { font-size: 12px; color: ' + textColorGrey + '; font-style: italic; margin-top: 3px; }',
    '.school-address { font-size: 11px; color: #94a3b8; margin-top: 2px; }',
    '.logo-wrap { width: 70px; height: 70px; border-radius: 10px; background: white; padding: 3px; box-shadow: 0 6px 16px rgba(30, 58, 138, 0.15); display: flex; align-items: center; justify-content: center; }',
    '.logo { width: 100%; height: 100%; object-fit: contain; }',
    '.logo-fallback { background: linear-gradient(135deg, ' + brand + ', #6366f1); color: white; font-size: 28px; font-weight: 800; font-family: Georgia, serif; }',
    // ─── Accent bar ───
    '.accent-bar { height: 3px; background: linear-gradient(90deg, ' + brand + ', #6366f1, #8b5cf6); border-radius: 2px; margin-bottom: 12px; position: relative; z-index: 1; }',
    // ─── Title bar ───
    '.title-bar { text-align: center; padding: 10px 16px; background: linear-gradient(135deg, ' + brand + ', ' + brandDark + '); color: white; border-radius: 6px; font-size: 14px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 12px; position: relative; z-index: 1; box-shadow: 0 4px 10px rgba(30, 58, 138, 0.2); }',
    // ─── Student info grid (2-column, balanced) ───
    '.student-info { display: flex; gap: 14px; margin-bottom: 12px; position: relative; z-index: 1; }',
    '.passport { width: 100px; height: 120px; object-fit: cover; border-radius: 8px; border: 3px solid ' + brand + '; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }',
    '.passport-fallback { width: 100px; height: 120px; border-radius: 8px; border: 3px solid ' + brand + '; background: ' + lightTint + '; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #94a3b8; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }',
    '.info-grid { flex: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 0; border: 1px solid ' + borderColor + '; border-radius: 6px; overflow: hidden; }',
    '.info-item { display: flex; padding: 8px 12px; border-bottom: 1px solid ' + borderColor + '; border-right: 1px solid ' + borderColor + '; }',
    '.info-item:nth-child(even) { border-right: none; }',
    '.info-item:nth-last-child(-n+2) { border-bottom: none; }',
    '.info-lbl { width: 45%; font-size: 11px; font-weight: 700; color: ' + brand + '; text-transform: uppercase; letter-spacing: 0.3px; }',
    '.info-val { flex: 1; font-size: 13px; font-weight: 600; color: ' + textColorDark + '; }',
    // ─── Section headers ───
    '.section-title { background: ' + brand + '; color: white; padding: 8px 14px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; margin: 12px 0 6px; border-radius: 4px; position: relative; z-index: 1; }',
    // ─── Score table ───
    '.score-table { width: 100%; border-collapse: collapse; font-size: 12px; border: 1px solid ' + borderColor + '; border-radius: 6px; overflow: hidden; position: relative; z-index: 1; }',
    '.score-table th { background: ' + brand + '; color: white; padding: 8px 6px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px; text-align: center; }',
    '.score-table th:first-child { text-align: center; width: 24px; }',
    '.score-table th:nth-child(2) { text-align: left; }',
    '.score-table th .assess-name { font-size: 10px; }',
    '.score-table th .assess-max { font-size: 9px; opacity: 0.7; font-weight: 400; }',
    '.score-table td { padding: 8px 6px; border-bottom: 1px solid ' + borderColor + '; text-align: center; font-size: 12px; }',
    '.score-table td.subject { text-align: left; font-weight: 600; color: ' + textColorDark + '; padding-left: 8px; }',
    '.score-table td.sn { font-weight: 600; color: ' + textColorGrey + '; }',
    '.score-table td.total { font-weight: 800; font-size: 11px; }',
    '.score-table td.total.pass { color: ' + passColor + '; }',
    '.score-table td.total.fail { color: ' + failColor + '; }',
    '.score-table td.grade-cell { text-align: center; }',
    '.score-table td.remark { font-size: 11px; }',
    '.score-table td.remark.pass { color: ' + passColor + '; }',
    '.score-table td.remark.fail { color: ' + failColor + '; }',
    '.score-table tr.row-even { background: white; }',
    '.score-table tr.row-odd { background: ' + lightTint + '; }',
    '.score-table tr:last-child td { border-bottom: none; }',
    '.grade-pill { display: inline-block; padding: 3px 10px; border-radius: 10px; font-size: 11px; font-weight: 800; }',
    '.grade-pill-sm { display: inline-block; padding: 3px 8px; border-radius: 8px; font-size: 10px; font-weight: 800; }',
    '.empty { text-align: center; padding: 14px; color: #94a3b8; font-size: 11px; }',
    // ─── Three-column bottom section ───
    '.bottom-grid { display: grid; grid-template-columns: 1.2fr 0.8fr 1fr; gap: 10px; margin: 12px 0; position: relative; z-index: 1; }',
    '.bottom-card { border: 1px solid ' + borderColor + '; border-radius: 6px; overflow: hidden; }',
    '.bottom-card-title { background: ' + brand + '; color: white; padding: 6px 8px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; text-align: center; }',
    '.bottom-card table { width: 100%; border-collapse: collapse; font-size: 11px; }',
    '.bottom-card td { padding: 6px 10px; border-bottom: 1px solid ' + borderColor + '; }',
    '.bottom-card tr:last-child td { border-bottom: none; }',
    '.bottom-card tr.row-even { background: white; }',
    '.bottom-card tr.row-odd { background: ' + lightTint + '; }',
    '.behav-trait { color: ' + textColorDark + '; font-size: 11px; }',
    '.behav-letter { text-align: center; width: 30px; }',
    '.behav-circle { display: inline-block; width: 22px; height: 22px; line-height: 22px; border-radius: 50%; color: white; font-size: 11px; font-weight: 800; text-align: center; }',
    '.rk-letter { text-align: center; width: 30px; }',
    '.rk-label { color: ' + textColorDark + '; font-size: 11px; }',
    '.gs-range { text-align: center; font-weight: 600; font-size: 11px; }',
    '.gs-grade { text-align: center; }',
    '.gs-remark { color: ' + textColorGrey + '; font-style: italic; font-size: 11px; }',
    '.gs-remark.fail { color: ' + failColor + '; }',
    // ─── Final remark ───
    '.final-remark { margin-top: 12px; border: 1.5px solid ' + brand + '; border-radius: 6px; overflow: hidden; position: relative; z-index: 1; }',
    '.remark-title { background: ' + brand + '; color: white; padding: 6px 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }',
    '.remark-content { padding: 10px 14px; }',
    '.remark-row { font-size: 12px; color: ' + textColorDark + '; margin-bottom: 4px; }',
    '.remark-row strong { color: ' + brand + '; }',
    // ─── Signatures ───
    '.signatures { display: grid; grid-template-columns: 1fr auto 1fr; gap: 30px; align-items: flex-end; margin-top: 24px; padding-top: 12px; position: relative; z-index: 1; }',
    '.sign-box { text-align: center; }',
    '.sign-role { font-size: 11px; color: ' + textColorGrey + '; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 28px; }',
    '.sign-line { width: 140px; height: 1.5px; background: ' + textColorGrey + '; margin: 0 auto; }',
    '.sign-name { font-size: 11px; color: ' + textColorGrey + '; margin-top: 3px; }',
    '.stamp-wrap { display: flex; align-items: center; justify-content: center; }',
    '.stamp { width: 70px; height: 70px; object-fit: contain; opacity: 0.8; }',
    '.sig { width: 90px; height: 26px; object-fit: contain; margin-top: 2px; }',
    // ─── Footer ───
    '.footer { text-align: center; font-size: 10px; color: #94a3b8; margin-top: 16px; padding-top: 8px; border-top: 1px solid ' + borderColor + '; position: relative; z-index: 1; }',
    '</style>',
    '</head>',
    '<body>',
    '<div class="toolbar no-print">',
    '<button class="btn-back" onclick="history.back()">← Back</button>',
    '<button class="btn-print" onclick="window.print()">🖨 Print / Save as PDF</button>',
    '<span class="filename">' + D(fileName) + '</span>',
    '</div>',
    '<div class="page">',
    watermark,
    '<div style="position:relative;z-index:1;">',
    // ─── HEADER ───
    '<div class="header">',
    '<div class="header-text">',
    '<div class="school-name">' + D(data.schoolName) + '</div>',
    data.schoolMotto ? '<div class="school-motto">"' + D(data.schoolMotto) + '"</div>' : '',
    data.schoolAddress ? '<div class="school-address">' + D(data.schoolAddress) + (data.schoolPhone ? ' · Tel: ' + D(data.schoolPhone) : '') + '</div>' : '',
    '</div>',
    headerLogo,
    '</div>',
    '<div class="accent-bar"></div>',
    '<div class="title-bar">' + D(data.reportTitle) + ' Report Sheet</div>',
    // ─── STUDENT INFO ───
    '<div class="student-info">',
    passportHtml,
    studentInfoGrid,
    '</div>',
    // ─── ACADEMIC SCORES ───
    '<div class="section-title">Academic Scores</div>',
    '<table class="score-table">',
    '<thead><tr><th>#</th><th>Subject</th>' + assessmentTh + '<th>Total</th><th>Grade</th><th>Remark</th></tr></thead>',
    '<tbody>' + scoreRowsHtml + '</tbody>',
    '</table>',
    // ─── THREE-COLUMN BOTTOM: Behavioral | Ratings Key | Grading System ───
    '<div class="bottom-grid">',
    // Behavioral Ratings
    '<div class="bottom-card">',
    '<div class="bottom-card-title">Behavioral &amp; Activities Ratings</div>',
    '<table><tbody>' + behavioralRowsHtml + '</tbody></table>',
    '</div>',
    // Ratings Key
    '<div class="bottom-card">',
    '<div class="bottom-card-title">Ratings Key</div>',
    '<table><tbody>' + ratingsKeyHtml + '</tbody></table>',
    '</div>',
    // Grading System
    '<div class="bottom-card">',
    '<div class="bottom-card-title">Grading System</div>',
    '<table><thead><tr><th style="font-size:10px;padding:5px;text-align:center;">Range</th><th style="font-size:7px;padding:3px;text-align:center;">Grade</th><th style="font-size:10px;padding:5px;text-align:left;">Remark</th></tr></thead><tbody>' + gradingScaleHtml + '</tbody></table>',
    '</div>',
    '</div>',
    // ─── FINAL REMARK ───
    finalRemark,
    // ─── Signatures ───
    signaturesHtml,
    // ─── Footer ───
    '<div class="footer">' + D(data.schoolName) + ' · ' + new Date().toLocaleDateString() + ' · This report is computer-generated and valid only with school stamp.</div>',
    '</div>',
    '</div>',
    '</body>',
    '</html>'
  ].join('\n')

  const newDoc = window.document.open('text/html', '_self')
  newDoc.write(html)
  newDoc.close()
}
