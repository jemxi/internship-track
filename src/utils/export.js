/**
 * export.js — Internship Tracker report exports
 * Provides: generateCSV(), generatePDF()
 */

import { format } from 'date-fns'

const parseLocalDate = (s) => {
  if (!s) return null
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

const fmtDate = (str) => {
  const d = parseLocalDate(str)
  return d ? format(d, 'MMMM d, yyyy') : '—'
}

const fmtDateShort = (str) => {
  const d = parseLocalDate(str)
  return d ? format(d, 'MMM d, yyyy') : '—'
}

const today = () => format(new Date(), 'MMMM d, yyyy')

// ─────────────────────────────────────────────────────────────
// CSV  — two sections: Summary on top, then daily log table
// ─────────────────────────────────────────────────────────────
export function generateCSV(entries, meta = {}) {
  const {
    totalHours      = 0,
    targetHours     = 0,
    hoursPerDay     = 8,
    startDate       = '',
    projectedEndDate= '',
    daysElapsed     = 0,
    totalDaysRequired = 0,
    absenceCount    = 0,
    progressPercent = 0,
    isGoalExceeded  = false,
    extraHours      = 0,
  } = meta

  const remaining   = Math.max(0, Number(targetHours) - Number(totalHours))
  const workedDays  = Math.max(0, Number(daysElapsed) - Number(absenceCount))

  const row  = (...cells) => cells.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')
  const blank = () => ''
  const lines = []

  // ── SECTION 1: Summary ──
  lines.push(row('INTERNSHIP HOURS REPORT'))
  lines.push(row('Generated:', today()))
  lines.push(blank())

  lines.push(row('── SUMMARY ──'))
  lines.push(row('Start Date',              fmtDate(startDate)))
  lines.push(row('Projected End Date',      fmtDate(projectedEndDate)))
  lines.push(row('Target Hours',            `${targetHours} hrs`))
  lines.push(row('Hours Per Day (default)', `${hoursPerDay} hrs`))
  lines.push(blank())

  lines.push(row('Total Hours Logged',      `${Number(totalHours).toFixed(1)} hrs`))
  lines.push(row('Progress',               `${Number(progressPercent).toFixed(1)}%`))
  lines.push(row(isGoalExceeded ? 'Extra Hours' : 'Hours Remaining',
                 isGoalExceeded ? `+${Number(extraHours).toFixed(1)} hrs` : `${remaining.toFixed(1)} hrs`))
  lines.push(blank())

  lines.push(row('Work Days Elapsed',       `${workedDays} of ${totalDaysRequired} days`))
  lines.push(row('Days Absent',             absenceCount))
  lines.push(row('Goal Status',             isGoalExceeded ? '✓ GOAL EXCEEDED' : 'In Progress'))
  lines.push(blank())

  // ── SECTION 2: Daily Log ──
  lines.push(row('── DAILY LOG ──'))
  lines.push(row('Date', 'Day', 'Status', 'Hours', 'Type', 'Notes'))

  const sorted = Object.entries(entries)
    .filter(([, e]) => e !== null && e !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))

  if (sorted.length === 0) {
    lines.push(row('No entries logged yet.', '', '', '', '', ''))
  } else {
    for (const [dateStr, entry] of sorted) {
      const d       = parseLocalDate(dateStr)
      const dayName = d ? format(d, 'EEEE') : ''
      const dateDisp= fmtDateShort(dateStr)

      if (entry.isAbsence) {
        lines.push(row(dateDisp, dayName, 'Absent', '0', '—', entry.notes || ''))
      } else if (entry.hours > 0) {
        const type = entry.logged ? 'Manual Entry' : 'Auto-Projected'
        lines.push(row(dateDisp, dayName, 'Worked', entry.hours, type, entry.notes || ''))
      } else {
        lines.push(row(dateDisp, dayName, 'Auto', hoursPerDay, 'Auto-Projected', ''))
      }
    }
  }

  lines.push(blank())
  lines.push(row('End of Report'))

  return lines.join('\r\n')
}

// ─────────────────────────────────────────────────────────────
// PDF  — opens a clean print window with styled HTML report
// ─────────────────────────────────────────────────────────────
export function generatePDF(entries, meta = {}) {
  const {
    totalHours       = 0,
    targetHours      = 0,
    hoursPerDay      = 8,
    startDate        = '',
    projectedEndDate = '',
    daysElapsed      = 0,
    totalDaysRequired= 0,
    absenceCount     = 0,
    progressPercent  = 0,
    isGoalExceeded   = false,
    extraHours       = 0,
  } = meta

  const remaining  = Math.max(0, Number(targetHours) - Number(totalHours))
  const workedDays = Math.max(0, Number(daysElapsed) - Number(absenceCount))
  const pct        = Math.min(Math.max(Number(progressPercent), 0), 100)

  // Sort + split entries into worked vs absent
  const sorted = Object.entries(entries)
    .filter(([, e]) => e)
    .sort(([a], [b]) => a.localeCompare(b))

  const workedEntries  = sorted.filter(([, e]) => !e.isAbsence && e.hours > 0)
  const absentEntries  = sorted.filter(([, e]) => e.isAbsence)
  const autoEntries    = sorted.filter(([, e]) => !e.isAbsence && !e.hours)

  const tableRow = (dateStr, entry) => {
    const d       = parseLocalDate(dateStr)
    const dayName = d ? format(d, 'EEE') : ''
    const dateDisp= fmtDateShort(dateStr)

    if (entry.isAbsence) {
      return `<tr class="absent-row">
        <td>${dateDisp}</td><td>${dayName}</td>
        <td><span class="badge badge-absent">Absent</span></td>
        <td>0h</td><td>—</td>
        <td>${entry.notes || ''}</td>
      </tr>`
    }
    const type = entry.logged ? 'Manual' : 'Auto'
    return `<tr>
      <td>${dateDisp}</td><td>${dayName}</td>
      <td><span class="badge badge-worked">Worked</span></td>
      <td><strong>${entry.hours}h</strong></td>
      <td><span class="type-tag">${type}</span></td>
      <td>${entry.notes || ''}</td>
    </tr>`
  }

  const allRows = sorted.map(([dateStr, entry]) => tableRow(dateStr, entry)).join('')

  const barColor   = isGoalExceeded ? '#059669' : '#7c6af7'
  const statusText = isGoalExceeded
    ? `🏆 Goal Exceeded (+${Number(extraHours).toFixed(1)} extra hrs)`
    : `In Progress — ${remaining.toFixed(1)} hrs remaining`

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Internship Hours Report</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Inter', sans-serif;
      background: #fff;
      color: #1a1a1a;
      font-size: 13px;
      line-height: 1.5;
      padding: 40px 48px;
      max-width: 900px;
      margin: 0 auto;
    }

    /* ── Header ── */
    .report-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 32px;
      padding-bottom: 20px;
      border-bottom: 2px solid #1a1a2e;
    }
    .report-title {
      font-size: 26px;
      font-weight: 900;
      color: #1a1a2e;
      letter-spacing: -0.03em;
      line-height: 1.1;
    }
    .report-subtitle {
      font-size: 12px;
      color: #9ca3af;
      margin-top: 4px;
      font-weight: 500;
    }
    .logo-box {
      width: 42px; height: 42px;
      border-radius: 11px;
      background: linear-gradient(135deg, #7c6af7, #a78bfa);
      display: flex; align-items: center; justify-content: center;
      font-size: 22px;
    }

    /* ── Summary grid ── */
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 28px;
    }
    .stat-card {
      background: #f8f7ff;
      border: 1px solid #e9e7ff;
      border-radius: 12px;
      padding: 14px 16px;
    }
    .stat-card.green {
      background: #f0fdf4;
      border-color: #bbf7d0;
    }
    .stat-label {
      font-size: 9px;
      font-weight: 800;
      color: #9ca3af;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      margin-bottom: 5px;
    }
    .stat-value {
      font-size: 22px;
      font-weight: 900;
      color: #1a1a2e;
      letter-spacing: -0.02em;
      line-height: 1;
    }
    .stat-value.purple { color: #7c6af7; }
    .stat-value.green  { color: #059669; }
    .stat-sub {
      font-size: 11px;
      color: #9ca3af;
      margin-top: 4px;
      font-weight: 500;
    }

    /* ── Progress bar ── */
    .progress-section {
      margin-bottom: 28px;
      background: #f8f7ff;
      border: 1px solid #e9e7ff;
      border-radius: 14px;
      padding: 18px 20px;
    }
    .progress-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    .progress-title {
      font-size: 12px;
      font-weight: 700;
      color: #4b5563;
    }
    .progress-pct {
      font-size: 18px;
      font-weight: 900;
      color: ${barColor};
    }
    .bar-track {
      height: 10px;
      background: #e9e7ff;
      border-radius: 99px;
      overflow: hidden;
      margin-bottom: 8px;
    }
    .bar-fill {
      height: 100%;
      width: ${pct}%;
      background: linear-gradient(90deg, ${barColor}, ${isGoalExceeded ? '#22d3ee' : '#a78bfa'});
      border-radius: 99px;
    }
    .progress-meta {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: #9ca3af;
      font-weight: 500;
    }
    .status-badge {
      display: inline-block;
      font-size: 12px;
      font-weight: 700;
      color: ${barColor};
      background: ${isGoalExceeded ? '#d1fae5' : '#ede9fe'};
      padding: 4px 12px;
      border-radius: 99px;
    }

    /* ── Info rows ── */
    .info-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 28px;
    }
    .info-box {
      background: #fafafa;
      border: 1px solid #f0f0f0;
      border-radius: 10px;
      padding: 14px 16px;
    }
    .info-box h4 {
      font-size: 10px;
      font-weight: 800;
      color: #d1d5db;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 5px 0;
      border-bottom: 1px solid #f5f5f5;
      font-size: 12px;
    }
    .info-row:last-child { border-bottom: none; }
    .info-key { color: #6b7280; font-weight: 500; }
    .info-val { color: #1a1a1a; font-weight: 700; }

    /* ── Table ── */
    .section-title {
      font-size: 13px;
      font-weight: 800;
      color: #1a1a2e;
      letter-spacing: -0.01em;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .section-title::after {
      content: '';
      flex: 1;
      height: 1px;
      background: #e9e7ff;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 32px;
      font-size: 12px;
    }
    thead th {
      background: #1a1a2e;
      color: #fff;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      padding: 9px 12px;
      text-align: left;
    }
    thead th:first-child { border-radius: 8px 0 0 0; }
    thead th:last-child  { border-radius: 0 8px 0 0; }
    tbody tr { border-bottom: 1px solid #f0f0f8; }
    tbody tr:nth-child(even) { background: #fafafe; }
    tbody tr.absent-row { background: #fff5f5; }
    tbody td { padding: 8px 12px; color: #374151; }
    .badge {
      display: inline-block;
      font-size: 10px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 99px;
    }
    .badge-worked { background: #ede9fe; color: #5b21b6; }
    .badge-absent { background: #fee2e2; color: #b91c1c; }
    .type-tag {
      font-size: 10px;
      color: #9ca3af;
      font-weight: 600;
      background: #f3f4f6;
      padding: 2px 7px;
      border-radius: 99px;
    }

    /* ── Absence summary ── */
    .absence-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 28px;
    }
    .absence-chip {
      background: #fee2e2;
      color: #b91c1c;
      font-size: 11px;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 8px;
      border: 1px solid #fecaca;
    }

    /* ── Footer ── */
    .report-footer {
      text-align: center;
      font-size: 11px;
      color: #d1d5db;
      padding-top: 20px;
      border-top: 1px solid #f0f0f0;
    }

    /* ── Print ── */
    @media print {
      body { padding: 24px 32px; }
      .no-print { display: none; }
      table { page-break-inside: auto; }
      tr { page-break-inside: avoid; }
    }
  </style>
</head>
<body>

  <!-- Print button (hidden on print) -->
  <div class="no-print" style="text-align:right;margin-bottom:20px">
    <button onclick="window.print()" style="padding:10px 24px;background:#7c6af7;color:#fff;border:none;border-radius:9px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">
      🖨 Print / Save as PDF
    </button>
  </div>

  <!-- Header -->
  <div class="report-header">
    <div>
      <div class="report-title">Internship Hours Report</div>
      <div class="report-subtitle">Generated on ${today()} &nbsp;·&nbsp; Internship Tracker 2026</div>
    </div>
    <div class="logo-box">🎓</div>
  </div>

  <!-- Big stat cards -->
  <div class="summary-grid">
    <div class="stat-card ${isGoalExceeded ? 'green' : ''}">
      <div class="stat-label">Total Hours</div>
      <div class="stat-value ${isGoalExceeded ? 'green' : 'purple'}">${Number(totalHours).toFixed(1)}</div>
      <div class="stat-sub">out of ${targetHours} hrs target</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">${isGoalExceeded ? 'Extra Hours' : 'Remaining'}</div>
      <div class="stat-value">${isGoalExceeded ? '+' + Number(extraHours).toFixed(1) : remaining.toFixed(1)}</div>
      <div class="stat-sub">hours ${isGoalExceeded ? 'beyond target' : 'to go'}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Days Worked</div>
      <div class="stat-value">${workedDays}</div>
      <div class="stat-sub">of ${totalDaysRequired} total work days</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Days Absent</div>
      <div class="stat-value" style="color:${absenceCount > 0 ? '#dc2626' : '#1a1a2e'}">${absenceCount}</div>
      <div class="stat-sub">${absenceCount > 0 ? 'not counted in progress' : 'no absences recorded'}</div>
    </div>
  </div>

  <!-- Progress bar -->
  <div class="progress-section">
    <div class="progress-header">
      <span class="progress-title">Overall Progress</span>
      <span class="progress-pct">${pct.toFixed(1)}%</span>
    </div>
    <div class="bar-track"><div class="bar-fill"></div></div>
    <div class="progress-meta">
      <span>${Number(totalHours).toFixed(1)} hrs logged</span>
      <span class="status-badge">${statusText}</span>
      <span>${targetHours} hrs target</span>
    </div>
  </div>

  <!-- Info boxes -->
  <div class="info-section">
    <div class="info-box">
      <h4>Schedule Info</h4>
      <div class="info-row"><span class="info-key">Start Date</span><span class="info-val">${fmtDate(startDate)}</span></div>
      <div class="info-row"><span class="info-key">Projected End</span><span class="info-val">${fmtDate(projectedEndDate)}</span></div>
      <div class="info-row"><span class="info-key">Hours Per Day</span><span class="info-val">${hoursPerDay} hrs</span></div>
      <div class="info-row"><span class="info-key">Target Hours</span><span class="info-val">${targetHours} hrs</span></div>
    </div>
    <div class="info-box">
      <h4>Progress Breakdown</h4>
      <div class="info-row"><span class="info-key">Total Logged</span><span class="info-val">${Number(totalHours).toFixed(1)} hrs</span></div>
      <div class="info-row"><span class="info-key">% Complete</span><span class="info-val">${pct.toFixed(1)}%</span></div>
      <div class="info-row"><span class="info-key">Manual Entries</span><span class="info-val">${workedEntries.length} days</span></div>
      <div class="info-row"><span class="info-key">Absent Days</span><span class="info-val">${absenceCount} days</span></div>
    </div>
  </div>

  ${absentEntries.length > 0 ? `
  <!-- Absences -->
  <div class="section-title">Absent Days (${absentEntries.length})</div>
  <div class="absence-list">
    ${absentEntries.map(([dateStr]) => `<span class="absence-chip">🚫 ${fmtDateShort(dateStr)}</span>`).join('')}
  </div>
  ` : ''}

  <!-- Daily log table -->
  <div class="section-title">Daily Log (${sorted.length} entries)</div>
  ${sorted.length === 0
    ? `<p style="color:#9ca3af;font-size:13px;margin-bottom:32px">No entries logged yet. Hours are auto-projected based on your settings.</p>`
    : `<table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Day</th>
          <th>Status</th>
          <th>Hours</th>
          <th>Type</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody>
        ${allRows}
      </tbody>
    </table>`
  }

  <!-- Footer -->
  <div class="report-footer">
    Internship Tracker 2026 &nbsp;·&nbsp; Generated ${today()} &nbsp;·&nbsp; Auto-projected hours based on ${hoursPerDay}h/day schedule
  </div>

</body>
</html>`

  const win = window.open('', '_blank', 'width=1000,height=800')
  if (!win) {
    alert('Please allow popups to view the PDF report.')
    return
  }
  win.document.write(html)
  win.document.close()
}