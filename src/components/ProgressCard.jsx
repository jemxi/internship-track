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
  // New: needed for full report context
  startDate,
  hoursPerDay,
}) {
  const meta = {
    totalHours,
    targetHours,
    extraHours,
    hoursPerDay:       hoursPerDay      || 8,
    startDate:         startDate        || '',
    projectedEndDate:  projectedEndDate || '',
    daysElapsed:       daysElapsed      || 0,
    totalDaysRequired: totalDaysRequired || 0,
    absenceCount:      absenceCount     || 0,
    progressPercent:   progressPercent  || 0,
    isGoalExceeded:    isGoalExceeded   || false,
    extraHours:        extraHours       || 0,
  }

  const handleExportCSV = () => {
    const csv  = generateCSV(entries, meta)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href  = url
    link.download = `internship-report-${format(new Date(), 'yyyy-MM-dd')}.csv`
    link.click()
    window.URL.revokeObjectURL(url)
  }

  const handleExportPDF = () => generatePDF(entries, meta)

  const safePct    = Math.min(Math.max(Number(progressPercent || 0), 0), 100)
  const safeTotal  = Math.round(Number(totalHours  || 0) * 10) / 10
  const safeTarget = Math.round(Number(targetHours || 0))
  const safeExtra  = Math.round(Number(extraHours  || 0) * 10) / 10
  const remaining  = Math.max(0, safeTarget - safeTotal)
  const workedDays = Math.max(0, Number(daysElapsed) - Number(absenceCount))

  const formattedEnd = projectedEndDate
    ? format(parseLocalDate(projectedEndDate), 'MMM d, yyyy')
    : '—'

  return (
    <div className={`rounded-xl p-6 text-white shadow-md relative overflow-hidden ${
      isGoalExceeded ? 'bg-emerald-600' : 'bg-violet-700'
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

      {/* Days worked — absences excluded */}
      <div className="mb-1 text-sm opacity-90">
        <span className="font-bold">{workedDays} / {totalDaysRequired} days</span>
        {' '}worked so far
      </div>
      {absenceCount > 0 && (
        <div className="text-sm text-red-200 mb-3">
          🚫 {absenceCount} absence{absenceCount !== 1 ? 's' : ''} not counted
        </div>
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
          className="w-full bg-white font-bold py-3 rounded-lg text-sm transition hover:bg-gray-100 flex items-center justify-center gap-2"
          style={{ color: isGoalExceeded ? '#065f46' : '#3730a3' }}
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