import { useState, useEffect } from 'react'
import { format } from 'date-fns'

export default function DailyLog({
  selectedDate,
  entry,
  onSave,
  onAddAbsence,
  hoursPerDay,
}) {
  const [hours, setHours]         = useState(Number(hoursPerDay) || 8)
  const [isOverride, setIsOverride] = useState(false)

  useEffect(() => {
    if (entry?.hours > 0) {
      setHours(Number(entry.hours))
      setIsOverride(true)
    } else {
      setHours(Number(hoursPerDay) || 8)
      setIsOverride(false)
    }
  }, [selectedDate, entry, hoursPerDay])

  const isAbsent    = entry?.isAbsence === true
  const dateLabel   = format(selectedDate, 'EEEE, MMM d')
  const todayStr    = format(new Date(), 'yyyy-MM-dd')
  const selectedStr = format(selectedDate, 'yyyy-MM-dd')
  const isFuture    = selectedStr > todayStr

  const handleSaveOverride = () => {
    onSave(selectedDate, hours)
    setIsOverride(true)
  }

  const handleRemoveOverride = () => {
    onSave(selectedDate, 0)
    setIsOverride(false)
    setHours(Number(hoursPerDay) || 8)
  }

  const handleToggleAbsence = () => {
    if (isAbsent) {
      // remove absence — goes back to auto-projected
      onSave(selectedDate, 0)
    } else {
      onAddAbsence(selectedDate)
    }
  }

  return (
    <div className="mt-6 bg-white rounded-lg p-6 shadow-sm">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-0.5">
            {isFuture ? 'Upcoming' : 'Customizing'}
          </p>
          <h3 className="text-xl font-bold text-gray-900">{dateLabel}</h3>
        </div>
        {isAbsent && (
          <span className="text-xs font-bold bg-red-100 text-red-600 px-3 py-1 rounded-full">🚫 Absent</span>
        )}
        {isOverride && !isAbsent && (
          <span className="text-xs font-bold bg-blue-100 text-blue-600 px-3 py-1 rounded-full">✏️ Manual override</span>
        )}
        {!isAbsent && !isOverride && !isFuture && (
          <span className="text-xs font-bold bg-purple-100 text-purple-600 px-3 py-1 rounded-full">✅ Auto: {hoursPerDay}h</span>
        )}
      </div>

      {/* Info banner — auto projection */}
      {!isAbsent && !isFuture && (
        <div className="bg-purple-50 border border-purple-100 rounded-lg px-4 py-3 mb-4 text-xs text-purple-700">
          {isOverride
            ? `⚡ This day is manually set to ${hours}h. Remove override to use the auto-projected ${hoursPerDay}h.`
            : `⚡ Auto-projected at ${hoursPerDay}h/day. Override below only if your actual hours were different.`
          }
        </div>
      )}

      {/* Hours override section — hidden for future and absent days */}
      {!isFuture && !isAbsent && (
        <div className="mb-4">
          <label className="text-xs font-semibold text-gray-600 block mb-2">
            OVERRIDE HOURS (optional)
          </label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setHours(h => Math.max(0, h - 1))}
              className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 font-bold text-lg flex items-center justify-center transition"
            >−</button>
            <span className="text-3xl font-bold text-gray-900 w-16 text-center">{hours}h</span>
            <button
              onClick={() => setHours(h => Math.min(24, h + 1))}
              className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 font-bold text-lg flex items-center justify-center transition"
            >+</button>

            <button
              onClick={handleSaveOverride}
              className="ml-auto px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-lg transition"
            >
              Set {hours}h
            </button>

            {isOverride && (
              <button
                onClick={handleRemoveOverride}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-semibold rounded-lg transition"
              >
                Remove
              </button>
            )}
          </div>
        </div>
      )}

      {/* Mark Absence button */}
      {!isFuture && (
        <button
          onClick={handleToggleAbsence}
          className={`w-full py-3 rounded-lg font-semibold text-sm transition ${
            isAbsent
              ? 'bg-green-500 hover:bg-green-600 text-white'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }`}
        >
          {isAbsent ? '✅ Remove Absence (restore auto hours)' : '🚫 Mark as Absent'}
        </button>
      )}

      {isFuture && (
        <p className="text-sm text-gray-400 text-center py-4">
          This day hasn't happened yet — hours will auto-project when the day arrives.
        </p>
      )}
    </div>
  )
}