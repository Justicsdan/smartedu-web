// ACE Progress Report Card — matches Flutter app layout exactly
// Layout: header → student info → PACE table → reading progress card → footer scores card

export interface AceReportData {
  schoolName: string
  schoolMotto: string
  schoolLogo: string
  schoolAddress: string
  studentName: string
  admissionNo: string
  sessionName: string
  termName: string
  termEndDate: string
  nextTermBegins: string
  passportUrl: string
  paceScores: Array<{ subject_id: string; pace_no: string; pt_score: number | null }>
  subjects: Array<{ id: string; name: string }>
  report: {
    reading_wpm?: number | string
    reading_comprehension?: number | string
    reading_composite?: number | string
    paces_completed?: number | string
    paces_avg?: number | string
    paces_total?: number | string
    day_in_term?: number | string
    days_absent?: number | string
    supervisor_comment?: string
    principal_comment?: string
    hacs_score?: number | string
    nce_score?: number | string
    total_score?: number | string
  } | null
}

function esc(s: any): string {
  if (s === null || s === undefined) return ''
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function fmtNum(val: any): string {
  if (val === null || val === undefined || val === '') return ''
  const n = Number(val)
  if (isNaN(n)) return String(val)
  return n === Math.round(n) ? String(Math.round(n)) : n.toFixed(1)
}

function fmtInt(val: any): number {
  if (val === null || val === undefined) return 0
  const n = Number(val)
  return isNaN(n) ? 0 : Math.round(n)
}

export function printAceReportCard(data: AceReportData) {
  const D = esc
  const brand = '#1e3a8a'           // blue800
  const lightTint = '#edf2ff'        // rgb(0.93, 0.96, 1.0)
  const passColor = '#166534'        // green800
  const failColor = '#991b1b'        // red800
  const failColorLight = '#b91c1c'   // red700
  const orangeColor = '#9a3412'      // orange800
  const borderColor = '#6b7280'      // grey500
  const borderColorLight = '#9ca3af' // grey400
  const borderColorLighter = '#d1d5db' // grey300
  const textColorGrey = '#4b5563'    // grey600

  const r = data.report || {}
  const fileName = [
    data.studentName,
    data.termName || 'term',
    'ACE_Report'
  ].filter(Boolean).join('_').replace(/\s+/g, '_').replace(/[^\w-]/g, '') + '.pdf'

  // ─── Group PACE scores by subject ───
  const bySubject: Record<string, any[]> = {}
  for (const s of data.paceScores) {
    const sid = s.subject_id || ''
    if (!bySubject[sid]) bySubject[sid] = []
    bySubject[sid].push(s)
  }
  let maxP = 0
  for (const sid in bySubject) {
    if (bySubject[sid].length > maxP) maxP = bySubject[sid].length
  }

  // ─── Sort subjects: Math first, English second, then alphabetical ───
  const sortedSubjects = [...data.subjects].sort((a, b) => {
    const an = (a.name || '').toLowerCase()
    const bn = (b.name || '').toLowerCase()
    if (an.includes('math')) return -1
    if (bn.includes('math')) return 1
    if (an.includes('english')) return -1
    if (bn.includes('english')) return 1
    return an.localeCompare(bn)
  })

  // ─── Build PACE table header ───
  const paceHeaderCells = ['<th style="padding:4px 2px;">Subject</th>']
  for (let i = 0; i < maxP; i++) {
    paceHeaderCells.push('<th style="padding:4px 2px;">P' + (i + 1) + ' No.</th>')
    paceHeaderCells.push('<th style="padding:4px 2px;">PT</th>')
  }
  paceHeaderCells.push('<th style="padding:4px 2px;">Total</th>')

  // ─── Build PACE table rows ───
  let paceRowsHtml = ''
  if (maxP === 0) {
    paceRowsHtml = '<tr><td colspan="3" style="text-align:center;padding:14px;color:' + textColorGrey + ';font-size:9px;">No PACE scores recorded.</td></tr>'
  } else {
    const rows: string[] = []
    sortedSubjects.forEach((subj, idx) => {
      const sid = subj.id || ''
      const scores = bySubject[sid] || []
      if (scores.length === 0) return
      const validPts = scores.filter(s => s.pt_score !== null && s.pt_score !== undefined).map(s => Number(s.pt_score))
      const total = validPts.length > 0 ? validPts.reduce((a, b) => a + b, 0) : 0
      const totalColor = total < 80 ? failColor : passColor
      const rowBg = idx % 2 === 0 ? '#ffffff' : lightTint

      const sorted = [...scores].sort((a, b) => String(a.pace_no || '').localeCompare(String(b.pace_no || '')))
      const cells = ['<td style="padding:5px 6px;font-weight:700;font-size:10px;">' + D(subj.name) + '</td>']
      for (let i = 0; i < maxP; i++) {
        if (i < sorted.length) {
          const pt = sorted[i].pt_score
          const pv = pt !== null && pt !== undefined ? Number(pt) : null
          const ptColor = pv !== null && pv < 80 ? failColorLight : '#000000'
          const ptWeight = pv !== null ? '700' : '400'
          cells.push('<td style="padding:5px 4px;text-align:center;font-size:10px;">' + D(sorted[i].pace_no || '') + '</td>')
          cells.push('<td style="padding:3px 2px;text-align:center;font-size:7px;color:' + ptColor + ';font-weight:' + ptWeight + ';">' + (pv !== null ? Math.round(pv) : '--') + '</td>')
        } else {
          cells.push('<td style="padding:3px 2px;text-align:center;font-size:7px;"></td>')
          cells.push('<td style="padding:3px 2px;text-align:center;font-size:7px;color:' + borderColorLighter + ';">--</td>')
        }
      }
      cells.push('<td style="padding:3px 2px;text-align:center;font-size:7px;font-weight:700;color:' + totalColor + ';">' + Math.round(total) + '</td>')
      rows.push('<tr style="background:' + rowBg + ';">' + cells.join('') + '</tr>')
    })
    paceRowsHtml = rows.join('') || '<tr><td colspan="3" style="text-align:center;padding:14px;color:' + textColorGrey + ';font-size:9px;">No PACE scores recorded.</td></tr>'
  }

  // ─── Passport photo ───
  const passportHtml = data.passportUrl
    ? '<img src="' + D(data.passportUrl) + '" style="width:95px;height:115px;object-fit:cover;border-radius:8px;border:3px solid #1e3a8a;box-shadow:0 4px 12px rgba(0,0,0,0.15);" alt="" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'"><div style="width:95px;height:115px;border:3px solid #1e3a8a;border-radius:8px;display:none;align-items:center;justify-content:center;font-size:10px;color:#94a3b8;background:#f8fafc;box-shadow:0 4px 12px rgba(0,0,0,0.1);">Photo</div>'
    : '<div style="width:95px;height:115px;border:3px solid #1e3a8a;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:10px;color:#94a3b8;background:#f8fafc;box-shadow:0 4px 12px rgba(0,0,0,0.1);">Photo</div>'

  // ─── Watermark (faded logo in clipped oval) ───
  const watermark = data.schoolLogo
    ? '<div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:500px;height:500px;opacity:0.12;pointer-events:none;z-index:0;clip-path:ellipse(50% 50% at 50% 50%);"><img src="' + D(data.schoolLogo) + '" style="width:100%;height:100%;object-fit:cover;" alt=""/></div>'
    : '<div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);font-size:90px;font-weight:900;color:rgba(30,58,138,0.04);pointer-events:none;z-index:0;text-align:center;">' + D(data.schoolName) + '</div>'

  // ─── Header logo ───
  const headerLogo = data.schoolLogo
    ? '<img src="' + D(data.schoolLogo) + '" style="width:85px;height:85px;object-fit:contain;" alt="" onerror="this.style.display=\'none\'">'
    : '<div style="width:85px;height:85px;"></div>'

  // ─── Reading progress table rows ───
  const today = new Date().toISOString().split('T')[0]
  const readingRows = [
    ['Words per minute (W.P.W)', fmtNum(r.reading_wpm), 'W.P.W Comprehension', fmtNum(r.reading_comprehension), 'Composite', fmtNum(r.reading_composite)],
    ['NO. of PACEs completed', fmtNum(r.paces_completed), 'PACE score AVG', fmtNum(r.paces_avg), 'Total (PACES Cass)', fmtNum(r.paces_total)],
    ['Date', today, 'Days in Term', String(fmtInt(r.day_in_term)), 'Days Absent', String(fmtInt(r.days_absent))],
  ].map(row => {
    const cells = []
    for (let i = 0; i < 6; i += 2) {
      cells.push('<td style="padding:5px 6px;font-size:10px;font-weight:700;background:#f8fafc;border:0.5px solid ' + borderColorLight + ';border-right:none;">' + D(row[i]) + '</td>')
      cells.push('<td style="padding:5px 6px;font-size:10px;border:0.5px solid ' + borderColorLight + ';border-right:none;">' + D(row[i + 1]) + '</td>')
    }
    return '<tr>' + cells.join('') + '</tr>'
  }).join('')

  // ─── Comments blocks ───
  const supervisorCommentHtml = `
    <div style="margin-top:6px;">
      <div style="font-size:8px;font-weight:700;color:${brand};">Supervisor's Comment:</div>
      <div style="margin-top:2px;padding:4px;border:1px solid ${borderColorLighter};border-radius:2px;font-size:8px;font-style:italic;min-height:16px;">${D(r.supervisor_comment || '')}</div>
      <div style="margin-top:4px;font-size:7px;color:${textColorGrey};">Signature: ___________________</div>
    </div>`
  const principalCommentHtml = `
    <div style="margin-top:8px;">
      <div style="font-size:8px;font-weight:700;color:${brand};">Principal's Comment:</div>
      <div style="margin-top:2px;padding:4px;border:1px solid ${borderColorLighter};border-radius:2px;font-size:8px;font-style:italic;min-height:16px;">${D(r.principal_comment || '')}</div>
      <div style="margin-top:4px;font-size:7px;color:${textColorGrey};">Signature: ___________________</div>
    </div>`

  // ─── Footer scores card (HACS, NCE, Total) ───
  const footerCardHtml = r ? `
    <div style="margin-top:12px;padding:10px;border:1.5px solid ${brand};border-radius:4px;display:flex;justify-content:space-around;align-items:center;">
      <div style="text-align:center;">
        <div style="font-size:8px;color:${textColorGrey};">HACS Score</div>
        <div style="font-size:18px;font-weight:700;color:${brand};margin-top:2px;">${D(fmtNum(r.hacs_score))}</div>
      </div>
      <div style="text-align:center;">
        <div style="font-size:8px;color:${textColorGrey};">NCE Score</div>
        <div style="font-size:18px;font-weight:700;color:${orangeColor};margin-top:2px;">${D(fmtNum(r.nce_score))}</div>
      </div>
      <div style="text-align:center;">
        <div style="font-size:8px;color:${textColorGrey};">Total</div>
        <div style="font-size:18px;font-weight:700;color:${passColor};margin-top:2px;">${D(fmtNum(r.total_score))}</div>
      </div>
    </div>` : ''

  const html = [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8">',
    '<title>' + D(fileName) + '</title>',
    '<style>',
    '* { box-sizing: border-box; }',
    '@page { size: A4; margin: 10mm; }',
    'body { font-family: "Helvetica Neue", Arial, sans-serif; color: #111827; margin: 0; padding: 0; background: #e5e7eb; }',
    '.page { max-width: 800px; margin: 20px auto; background: white; padding: 24px 28px; box-shadow: 0 10px 40px rgba(0,0,0,0.1); position: relative; overflow: hidden; }',
    '@media print { body { background: white; } .page { box-shadow: none; margin: 0; padding: 0; max-width: none; } .no-print { display: none !important; } }',
    '.toolbar { max-width: 800px; margin: 20px auto 0; padding: 12px 16px; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); display: flex; gap: 10px; align-items: center; }',
    '.toolbar button { padding: 8px 16px; border: none; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; }',
    '.btn-print { background: ' + brand + '; color: white; }',
    '.btn-back { background: #f1f5f9; color: #475569; }',
    'table.pace-table { border-collapse: collapse; width: 100%; }',
    'table.pace-table th { background: ' + brand + '; color: white; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px; border: 0.5px solid ' + brand + '; }',
    '</style>',
    '</head>',
    '<body>',
    '<div class="toolbar no-print">',
    '<button class="btn-back" onclick="parent.closePrintFrame()">← Back</button>',
    '<button class="btn-print" onclick="window.print()">🖨️ Print / Save as PDF</button>',
    '<span style="margin-left:auto;font-size:11px;color:#94a3b8;">' + D(fileName) + '</span>',
    '</div>',
    '<div class="page">',
    watermark,
    '<div style="position:relative;z-index:1;">',
    // ─── 1. SCHOOL HEADER ───
    '<div style="display:flex;align-items:center;gap:14px;padding-bottom:6px;border-bottom:2px solid ' + brand + ';">',
    '<div style="flex:1;text-align:center;">',
    '<div style="font-size:18px;font-weight:700;color:#111827;">' + D(data.schoolName) + '</div>',
    data.schoolMotto ? '<div style="font-size:11px;color:' + textColorGrey + ';margin-top:2px;">' + D(data.schoolMotto) + '</div>' : '',
    data.schoolAddress ? '<div style="font-size:10px;color:' + textColorGrey + ';margin-top:2px;">' + D(data.schoolAddress) + '</div>' : '',
    '</div>',
    headerLogo,
    '</div>',
    '<div style="height:8px;"></div>',
    // ─── 2. STUDENT INFO (passport + centered info) ───
    '<div style="display:flex;align-items:flex-start;gap:14px;padding:6px 0;">',
    passportHtml,
    '<div style="flex:1;text-align:center;display:flex;flex-direction:column;justify-content:center;height:104px;">',
    '<div style="font-size:15px;font-weight:700;color:' + brand + ';letter-spacing:1.5px;">ACE PROGRESS REPORT</div>',
    '<div style="height:4px;"></div>',
    '<div style="font-size:9px;"><span style="font-weight:700;">Name:</span> ' + D(data.studentName) + ' &nbsp;&nbsp; <span style="font-weight:700;">Adm No:</span> ' + D(data.admissionNo || '-') + '</div>',
    '<div style="height:2px;"></div>',
    '<div style="font-size:9px;"><span style="font-weight:700;">Session:</span> ' + D(data.sessionName || '-') + ' &nbsp;&nbsp; <span style="font-weight:700;">Term:</span> ' + D(data.termName || '-') + '</div>',
    '<div style="font-size:9px;"><span style="font-weight:700;">Term Ends:</span> ' + D(data.termEndDate || '—') + ' &nbsp;&nbsp; <span style="font-weight:700;">Next Term:</span> ' + D(data.nextTermBegins || '—') + '</div>',
    '</div>',
    '</div>',
    '<div style="height:10px;"></div>',
    // ─── 3. PACE TABLE ───
    '<table class="pace-table">',
    '<thead><tr>' + paceHeaderCells.join('') + '</tr></thead>',
    '<tbody>' + paceRowsHtml + '</tbody>',
    '</table>',
    '<div style="height:12px;"></div>',
    // ─── 4. READING PROGRESS CARD ───
    '<div style="border:0.5px solid ' + borderColor + ';border-radius:4px;overflow:hidden;">',
    '<div style="background:' + brand + ';color:white;padding:6px;text-align:center;font-size:11px;font-weight:700;letter-spacing:1.5px;">READING PROGRESS</div>',
    '<table style="width:100%;border-collapse:collapse;">',
    readingRows,
    '</table>',
    '<div style="padding:6px 8px 8px;">',
    supervisorCommentHtml,
    principalCommentHtml,
    '</div>',
    '</div>',
    // ─── 5. FOOTER SCORES CARD ───
    footerCardHtml,
    '<div style="text-align:center;font-size:7px;color:' + textColorGrey + ';margin-top:14px;position:relative;z-index:1;">Generated on ' + new Date().toLocaleString() + '</div>',
    '</div>',
    '</div>',
    '</body>',
    '</html>'
  ].join('\n')

  // Open in same tab
  // Use iframe overlay to avoid breaking app navigation
  const existingFrame = document.getElementById('print-overlay-frame')
  if (existingFrame) existingFrame.remove()

  const frame = document.createElement('iframe')
  frame.id = 'print-overlay-frame'
  frame.style.position = 'fixed'
  frame.style.top = '0'
  frame.style.left = '0'
  frame.style.width = '100%'
  frame.style.height = '100%'
  frame.style.border = 'none'
  frame.style.zIndex = '9999'
  frame.style.backgroundColor = '#e5e7eb'

  document.body.appendChild(frame)

  const frameDoc = frame.contentWindow.document
  frameDoc.open()
  frameDoc.write(html)
  frameDoc.close()

  // Expose a global function to close the frame
  (window as any).closePrintFrame = () => {
    frame.remove()
  }
}
