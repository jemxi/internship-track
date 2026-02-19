import { format } from 'date-fns'
import { generateCSV, generatePDF } from '../utils/export'

const parseLocalDate = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export default function ProgressCard({
  totalHours,
  targetHours,
  extraHours,
  daysElapsed,
  totalDaysRequired,
  absenceCount,
  progressPercent,
  isGoalExceeded,
  projectedEndDate,
  entries,
}) {
  const handleExportCSV = () => {
    const csv  = generateCSV(entries)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href  = url
    link.download = 'internship-report.csv'
    link.click()
  }

  const handleExportPDF = () => generatePDF(entries)

  const safePct    = Math.min(Math.max(Number(progressPercent || 0), 0), 100)
  const safeTotal  = Math.round(Number(totalHours  || 0) * 10) / 10
  const safeTarget = Math.round(Number(targetHours || 0))
  const safeExtra  = Math.round(Number(extraHours  || 0) * 10) / 10
  const remaining  = Math.max(0, safeTarget - safeTotal)

  const formattedEnd = projectedEndDate
    ? format(parseLocalDate(projectedEndDate), 'MMM d, yyyy')
    : '—'

  return (
    <div className={`rounded-xl p-6 text-white shadow-md relative overflow-hidden ${
      isGoalExceeded ? 'bg-green-500' : 'bg-green-500'
    }`}>

      <h2 className="text-xl font-bold mb-4">Your Progress</h2>

      {/* Hours */}
      <div className="mb-1">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-5xl font-bold">{safeTotal}</span>
          <span className="text-xl opacity-80">Hrs / {safeTarget} hrs</span>
          {safeExtra > 0 && (
            <span className="text-sm text-yellow-300 font-bold">(+{safeExtra} extra)</span>
          )}
        </div>
        <div className="text-base font-semibold mt-1 opacity-90">{safePct.toFixed(1)}%</div>
      </div>

      {/* Progress bar */}
      <div className="my-3">
        <div className="w-full bg-white/30 rounded-full h-3 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 bg-yellow-300"
            style={{ width: `${safePct}%` }}
          />
        </div>
      </div>

      {/* Days — "25 / 61 days" */}
      <div className="mb-1 text-sm opacity-90">
        <span className="font-bold">{daysElapsed} / {totalDaysRequired} days</span>
        {' '}from start to projected end
      </div>
      {absenceCount > 0 && (
        <div className="text-sm text-red-200 mb-3">Absences: {absenceCount}</div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 my-4">
        <div className="bg-white/20 rounded-lg p-4">
          <div className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1">
            {isGoalExceeded ? 'Extra Hours' : 'Remaining'}
          </div>
          <div className="text-3xl font-bold">
            {isGoalExceeded ? `+${safeExtra}h` : `${remaining}h`}
          </div>
        </div>
        <div className="bg-white/20 rounded-lg p-4">
          <div className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1">Projected End</div>
          <div className="text-lg font-bold leading-snug">
            {remaining === 0 ? '🎓 Complete!' : formattedEnd}
          </div>
        </div>
      </div>

      {/* Export */}
      <div className="flex flex-col gap-2">
        <button
          onClick={handleExportCSV}
          className="w-full bg-white text-green-700 font-bold py-3 rounded-lg text-sm transition hover:bg-gray-100 flex items-center justify-center gap-2"
        >
          📊 Download CSV Report
        </button>
        <button
          onClick={handleExportPDF}
          className="w-full bg-white/20 hover:bg-white/30 text-white font-bold py-2 rounded-lg text-sm transition"
        >
          📄 View Report & PDF
        </button>
      </div>
    </div>
  )
}