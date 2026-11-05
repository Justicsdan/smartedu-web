import { esc, gradeColor, ratingLetter, ratingColor } from './reportHelpers'

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
  termEndDate: string
  nextTermBegins: string
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

export function printReportCard(data: ReportData) {
  const D = esc
  const brand = data.primaryColor || '#1e3a8a'
  const lightTint = '#f8fafc'
  const passColor = '#166534'
  const failColor = '#991b1b'
  const border = '#cbd5e1'
  const grey = '#64748b'
  const dark = '#0f172a'

  const fileName = [data.studentName, data.reportTitle || 'result'].filter(Boolean).join('_').replace(/\s+/g, '_').replace(/[^\w-]/g, '') + '.pdf'

  // ─── Score table ───
  const assessmentTh = data.assessmentHeaders.map(h => '<th style="padding:6px 4px;">' + D(h.name) + '<br><span style="font-weight:400;font-size:8px;">(' + D(h.max) + ')</span></th>').join('')
  const scoreRowsHtml = data.scoreRows.length > 0 ? data.scoreRows.map((r, i) => {
    const cells = r.cells.map(c => '<td style="text-align:center;padding:6px 4px;">' + D(c) + '</td>').join('')
    const tc = r.isPass ? passColor : failColor
    const bg = i % 2 === 0 ? '#fff' : lightTint
    return '<tr style="background:' + bg + ';"><td style="text-align:center;font-weight:600;padding:6px 4px;">' + (i+1) + '</td><td style="text-align:left;font-weight:600;color:' + dark + ';padding:6px 8px;">' + D(r.subject) + '</td>' + cells + '<td style="text-align:center;font-weight:700;color:' + tc + ';padding:6px 4px;">' + D(r.total) + '</td><td style="text-align:center;font-weight:700;color:' + gradeColor(r.grade) + ';padding:6px 4px;">' + D(r.grade) + '</td><td style="text-align:center;color:' + tc + ';padding:6px 8px;white-space:nowrap;">' + D(r.remark) + '</td></tr>'
  }).join('') : '<tr><td colspan="' + (data.assessmentHeaders.length + 5) + '" style="text-align:center;padding:16px;color:' + grey + ';">No scores published</td></tr>'

  // ─── Grading scale ───
  const gsHtml = data.gradingScale.length > 0 ? data.gradingScale.map((g, i) => {
    const bg = i % 2 === 0 ? '#fff' : lightTint
    return '<tr style="background:' + bg + ';"><td style="text-align:center;font-weight:700;color:' + gradeColor(g.grade) + ';padding:5px 8px;">' + D(g.grade) + '</td><td style="text-align:center;padding:5px 8px;">' + D(g.range) + '</td><td style="font-style:italic;color:' + grey + ';padding:5px 8px;">' + D(g.remark) + '</td></tr>'
  }).join('') : '<tr><td colspan="3" style="text-align:center;padding:10px;color:' + grey + ';">No grading scale</td></tr>'

  // ─── Behavioral ratings (clean table, no-wrap badges) ───
  const behavHtml = data.behavioralRows.length > 0 ? data.behavioralRows.map((r, i) => {
    const hv = r.value && r.value !== '—' && r.value !== '-'
    const bg = hv ? ratingColor(r.value) : '#94a3b8'
    const rowBg = i % 2 === 0 ? '#fff' : lightTint
    return '<tr style="background:' + rowBg + ';"><td style="color:' + dark + ';padding:6px 10px;font-size:11px;">' + D(r.label) + '</td><td style="text-align:right;padding:6px 10px;"><span style="background:' + bg + ';color:white;font-size:9px;font-weight:700;padding:3px 10px;border-radius:10px;text-transform:uppercase;white-space:nowrap;">' + D(hv ? r.value : '—') + '</span></td></tr>'
  }).join('') : '<tr><td colspan="2" style="text-align:center;padding:10px;color:' + grey + ';">No ratings</td></tr>'

  // ─── Ratings key ───
  const rkHtml = [{letter:'A',label:'Excellent',color:'#10b981'},{letter:'B',label:'Good',color:'#3b82f6'},{letter:'C',label:'Fair',color:'#f59e0b'},{letter:'D',label:'Poor',color:'#ef4444'}].map((k,i) => {
    const bg = i % 2 === 0 ? '#fff' : lightTint
    return '<tr style="background:' + bg + ';"><td style="text-align:center;padding:5px 8px;"><span style="background:' + k.color + ';color:white;font-size:9px;font-weight:700;padding:2px 8px;border-radius:10px;">' + k.letter + '</span></td><td style="color:' + dark + ';padding:5px 8px;font-size:11px;">' + D(k.label) + '</td></tr>'
  }).join('')

  // ─── Passport ───
  const passport = data.passportUrl ? '<img src="' + D(data.passportUrl) + '" style="width:80px;height:100px;object-fit:cover;border-radius:4px;border:2px solid ' + border + ';" alt="" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'"><div style="width:80px;height:100px;border-radius:4px;border:2px solid ' + border + ';background:' + lightTint + ';display:none;align-items:center;justify-content:center;font-size:8px;color:#94a3b8;">No Photo</div>' : '<div style="width:80px;height:100px;border-radius:4px;border:2px solid ' + border + ';background:' + lightTint + ';display:flex;align-items:center;justify-content:center;font-size:8px;color:#94a3b8;">No Photo</div>'

  // ─── Watermark (reduced opacity to 0.08) ───
  const wm = data.schoolLogo ? '<div style="position:absolute;top:0;left:0;width:100%;height:100%;opacity:0.08;pointer-events:none;z-index:0;overflow:hidden;"><img src="' + D(data.schoolLogo) + '" style="width:100%;height:100%;object-fit:cover;object-position:center;" alt=""></div>' : '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:100px;font-weight:900;color:rgba(30,58,138,0.05);pointer-events:none;z-index:0;text-align:center;">' + D(data.schoolName) + '</div>'

  // ─── Header logo ───
  const hl = data.schoolLogo ? '<img src="' + D(data.schoolLogo) + '" style="width:70px;height:70px;object-fit:contain;" alt="" onerror="this.style.display=\'none\'">' : '<div style="width:70px;height:70px;border-radius:8px;background:' + brand + ';display:flex;align-items:center;justify-content:center;color:white;font-size:28px;font-weight:800;font-family:Georgia,serif;">' + D((data.schoolName||'S').charAt(0)) + '</div>'

  // ─── Student info rows ───
  const ir = [['Student\'s Name',data.studentName,'Term Ends',data.termEndDate||'—'],['Gender',data.gender||'—','Next Term Begins',data.nextTermBegins||'—'],['Admission No',data.admissionNo||'—','Total Score',String(data.totalScore)],['Class',data.studentClass||'—','Average Score',data.averageScore],['Term/Session',(data.reportTitle||'—')+(data.sessionName?' / '+D(data.sessionName):''),'Position',data.position||'—'],['No of Subjects',String(data.totalSubjects),'No in Class',String(data.positionOutOf||'—')],['Times Present',String(data.daysPresent||0),'Times Absent',String(data.daysAbsent||0)]].map(r => '<tr><td style="background:' + lightTint + ';font-weight:700;font-size:9px;color:' + brand + ';text-transform:uppercase;padding:6px 10px;border:1px solid ' + border + ';width:18%;">' + D(r[0]) + '</td><td style="font-weight:600;font-size:11px;color:' + dark + ';padding:6px 10px;border:1px solid ' + border + ';width:32%;">' + D(r[1]) + '</td><td style="background:' + lightTint + ';font-weight:700;font-size:9px;color:' + brand + ';text-transform:uppercase;padding:6px 10px;border:1px solid ' + border + ';width:18%;">' + D(r[2]) + '</td><td style="font-weight:600;font-size:11px;color:' + dark + ';padding:6px 10px;border:1px solid ' + border + ';width:32%;">' + D(r[3]) + '</td></tr>').join('')

  // ─── Comments (page-break-inside: avoid) ───
  const cm = (data.teacherComment||data.principalComment) ? '<div style="margin-top:12px;border:1px solid ' + border + ';border-radius:4px;overflow:hidden;position:relative;z-index:1;page-break-inside:avoid;"><div style="background:' + brand + ';color:white;padding:6px 10px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Final Remark</div><div style="padding:10px 12px;">' + (data.teacherComment?'<div style="margin-bottom:8px;"><span style="font-size:9px;font-weight:700;color:' + brand + ';text-transform:uppercase;">Class Teacher\'s Comment:</span><br><span style="font-size:11px;color:' + dark + ';font-style:italic;">' + D(data.teacherComment) + '</span></div>':'') + (data.principalComment?'<div><span style="font-size:9px;font-weight:700;color:' + brand + ';text-transform:uppercase;">Principal\'s Comment:</span><br><span style="font-size:11px;color:' + dark + ';font-style:italic;">' + D(data.principalComment) + '</span></div>':'') + '</div></div>' : ''

  // ─── Signatures ───
  const st = data.schoolStampUrl ? '<img src="' + D(data.schoolStampUrl) + '" style="width:70px;height:70px;object-fit:contain;opacity:0.8;" alt="" onerror="this.style.display=\'none\'">' : '<div style="width:70px;height:70px;border:2px dashed #94a3b8;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:7px;color:#94a3b8;text-align:center;">OFFICIAL<br>STAMP</div>'
  const sg = data.principalSignatureUrl ? '<img src="' + D(data.principalSignatureUrl) + '" style="width:90px;height:26px;object-fit:contain;margin-top:2px;" alt="" onerror="this.style.display=\'none\'">' : ''
  const sig = '<div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:24px;padding-top:12px;position:relative;z-index:1;page-break-inside:avoid;"><div style="text-align:center;"><div style="font-size:10px;color:' + grey + ';font-weight:600;text-transform:uppercase;letter-spacing:1px;margin-bottom:28px;">Class Teacher</div><div style="width:140px;height:1.5px;background:' + grey + ';margin:0 auto;"></div><div style="font-size:9px;color:' + grey + ';margin-top:3px;">Signature &amp; Date</div></div><div style="display:flex;align-items:center;justify-content:center;">' + st + '</div><div style="text-align:center;"><div style="font-size:10px;color:' + grey + ';font-weight:600;text-transform:uppercase;letter-spacing:1px;margin-bottom:28px;">Principal</div><div style="width:140px;height:1.5px;background:' + grey + ';margin:0 auto;"></div>' + sg + '<div style="font-size:9px;color:' + grey + ';margin-top:3px;">' + D(data.principalName||'Signature &amp; Date') + '</div></div></div>'

  const html = ['<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>' + D(fileName) + '</title><style>*{box-sizing:border-box;margin:0;padding:0}@page{size:A4;margin:0}body{font-family:"Helvetica Neue",Arial,sans-serif;color:' + dark + ';background:#e5e7eb;line-height:1.4;-webkit-print-color-adjust:exact;print-color-adjust:exact}.page{max-width:800px;margin:20px auto;background:#fff;padding:28px 32px;border-radius:8px;box-shadow:0 10px 40px rgba(0,0,0,0.1);position:relative;overflow:hidden;min-height:1000px}@media print{body{background:#fff}.page{box-shadow:none;margin:0;padding:10mm;max-width:none;border-radius:0}.no-print{display:none!important}tr,td,th{page-break-inside:avoid}}@media screen and (max-width:768px){.page{padding:16px 12px;border-radius:0;margin:0;box-shadow:none;min-height:auto}div[style*="grid-template-columns:1.2fr 0.8fr 1fr"]{grid-template-columns:1fr!important;gap:12px!important}div[style*="display:flex;gap:12px;margin-bottom:10px"]{flex-direction:column!important;gap:8px!important}img{max-width:100%;height:auto}table{font-size:10px}th,td{padding:4px 2px!important}}.toolbar{max-width:800px;margin:20px auto 0;padding:10px 16px;background:#fff;border-radius:6px;box-shadow:0 2px 8px rgba(0,0,0,0.05);display:flex;gap:10px;align-items:center}.toolbar button{padding:8px 16px;border:none;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer}.btn-print{background:' + brand + ';color:#fff}.btn-back{background:#f1f5f9;color:#475569}.toolbar .filename{margin-left:auto;font-size:11px;color:#94a3b8;font-family:monospace}table{border-collapse:collapse;width:100%}</style></head><body><div class="toolbar no-print"><button class="btn-back" onclick="parent.closePrintFrame()">\u2190 Back</button><button class="btn-print" onclick="window.print()">\uD83D\uDDA8 Print / Save as PDF</button><span class="filename">' + D(fileName) + '</span></div><div class="page">' + wm + '<div style="position:relative;z-index:1;"><div style="display:flex;align-items:center;gap:16px;padding-bottom:10px;border-bottom:2px solid ' + brand + ';"><div style="flex:1;text-align:center;"><div style="font-size:20px;font-weight:800;color:' + brand + ';letter-spacing:0.5px;text-transform:uppercase;line-height:1.2;">' + D(data.schoolName) + '</div>' + (data.schoolMotto?'<div style="font-size:11px;color:' + grey + ';font-style:italic;margin-top:3px;">"' + D(data.schoolMotto) + '"</div>':'') + (data.schoolAddress?'<div style="font-size:10px;color:#94a3b8;margin-top:2px;">' + D(data.schoolAddress) + (data.schoolPhone?' \u00b7 Tel: ' + D(data.schoolPhone):'') + '</div>':'') + '</div>' + hl + '</div><div style="text-align:center;margin:10px 0;font-size:13px;font-weight:700;color:' + brand + ';letter-spacing:2px;text-transform:uppercase;">End of ' + D(data.reportTitle) + ' Report Sheet</div><div style="display:flex;gap:12px;margin-bottom:10px;">' + passport + '<div style="flex:1;"><table>' + ir + '</table></div></div><div style="background:' + brand + ';color:white;padding:6px 10px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;border-radius:3px 3px 0 0;margin-top:16px;">Academic Scores</div><div style="overflow-x:auto;-webkit-overflow-scrolling:touch;"><table style="border:1px solid ' + border + ';border-top:none;"><thead><tr style="background:' + brand + ';color:white;"><th style="padding:6px 4px;font-size:9px;font-weight:700;text-transform:uppercase;width:24px;">S/N</th><th style="padding:6px 8px;font-size:9px;font-weight:700;text-transform:uppercase;text-align:left;">Subject</th>' + assessmentTh + '<th style="padding:6px 4px;font-size:9px;font-weight:700;text-transform:uppercase;">Total</th><th style="padding:6px 4px;font-size:9px;font-weight:700;text-transform:uppercase;">Grade</th><th style="padding:6px 8px;font-size:9px;font-weight:700;text-transform:uppercase;text-align:left;">Remark</th></tr></thead><tbody>' + scoreRowsHtml + '</tbody></table></div><div style="display:grid;grid-template-columns:1.2fr 0.8fr 1fr;gap:12px;margin-top:20px;"><div style="border:1px solid ' + border + ';border-radius:4px;overflow:hidden;"><div style="background:' + brand + ';color:white;padding:6px 8px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;text-align:center;">Behavioral Ratings</div><table style="font-size:11px;"><tbody>' + behavHtml + '</tbody></table></div><div style="border:1px solid ' + border + ';border-radius:4px;overflow:hidden;"><div style="background:' + brand + ';color:white;padding:6px 8px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;text-align:center;">Ratings Key</div><table style="font-size:11px;"><tbody>' + rkHtml + '</tbody></table></div><div style="border:1px solid ' + border + ';border-radius:4px;overflow:hidden;"><div style="background:' + brand + ';color:white;padding:6px 8px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;text-align:center;">Grading System</div><table style="font-size:11px;"><thead><tr style="background:' + brand + ';color:white;"><th style="font-size:8px;padding:5px 6px;text-align:center;">Grade</th><th style="font-size:8px;padding:5px 6px;text-align:center;">Range</th><th style="font-size:8px;padding:5px 6px;text-align:left;">Remark</th></tr></thead><tbody>' + gsHtml + '</tbody></table></div></div>' + cm + sig + '<div style="text-align:center;font-size:9px;color:#94a3b8;margin-top:16px;padding-top:8px;border-top:1px solid #e2e8f0;position:relative;z-index:1;">' + D(data.schoolName) + ' \u00b7 ' + new Date().toLocaleDateString() + ' \u00b7 This report is computer-generated and valid only with school stamp.</div></div></div></body></html>'].join('')

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
