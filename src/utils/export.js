import { format } from 'date-fns'

export const generateCSV = (entries) => {
  const headers = ['Date', 'Day', 'Hours Worked', 'Notes', 'Status']
  const rows = []

  // Sort entries by date
  const sortedDates = Object.keys(entries).sort()

  sortedDates.forEach(dateStr => {
    const entry = entries[dateStr]
    const date = new Date(dateStr)
    const day = format(date, 'EEEE')
    const formattedDate = format(date, 'yyyy-MM-dd')
    const hours = entry.hours || 0
    const notes = entry.notes || ''
    const status = entry.isAbsence ? 'Absence' : entry.logged ? 'Logged' : 'Not Logged'

    rows.push([formattedDate, day, hours, notes, status])
  })

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n')

  return csvContent
}

export const generatePDF = (entries) => {
  // Create a simple PDF using browser's print functionality
  const sortedDates = Object.keys(entries).sort()
  
  let htmlContent = `
    <html>
      <head>
        <title>Internship Tracker Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #1f2937; text-align: center; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          th { background-color: #6366f1; color: white; }
          tr:nth-child(even) { background-color: #f3f4f6; }
          .summary { margin-top: 20px; padding: 10px; background-color: #f0fdf4; }
        </style>
      </head>
      <body>
        <h1>Internship Tracker Report</h1>
        <p>Generated on: ${format(new Date(), 'MMMM d, yyyy')}</p>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Day</th>
              <th>Hours Worked</th>
              <th>Notes</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
  `

  let totalHours = 0
  sortedDates.forEach(dateStr => {
    const entry = entries[dateStr]
    const date = new Date(dateStr)
    const day = format(date, 'EEEE')
    const hours = entry.hours || 0
    const notes = entry.notes || ''
    const status = entry.isAbsence ? 'Absence' : entry.logged ? 'Logged' : 'Not Logged'

    totalHours += hours

    htmlContent += `
      <tr>
        <td>${dateStr}</td>
        <td>${day}</td>
        <td>${hours}h</td>
        <td>${notes}</td>
        <td>${status}</td>
      </tr>
    `
  })

  htmlContent += `
          </tbody>
        </table>
        <div class="summary">
          <h2>Summary</h2>
          <p><strong>Total Hours Logged:</strong> ${totalHours}h</p>
          <p><strong>Total Days Logged:</strong> ${sortedDates.filter(d => entries[d].logged).length}</p>
        </div>
      </body>
    </html>
  `

  const printWindow = window.open('', '_blank')
  printWindow.document.write(htmlContent)
  printWindow.document.close()
  printWindow.print()
}
