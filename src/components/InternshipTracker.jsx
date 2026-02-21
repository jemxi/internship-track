import { useState, useEffect } from 'react'
import { format, addDays, startOfWeek } from 'date-fns'
import Calendar from './Calendar'
import DailyLog from './DailyLog'
import ProgressCard from './ProgressCard'
import {
  PH_HOLIDAY_DATES_2026,
  getHolidayName2026,
  calculateProgress
} from '../utils/helpers'

export default function InternshipTracker({ config, onConfigChange, onResetAll }) {

  const [currentDate, setCurrentDate]   = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState(() => new Date())

  const [entries, setEntries] = useState(() => {
    const saved = localStorage.getItem('trackerEntries')
    if (!saved) return {}
    try {
      const parsed = JSON.parse(saved)
      const normalized = {}
      Object.keys(parsed).forEach(dateKey => {
        const entry = parsed[dateKey]
        if (entry) {
          normalized[dateKey] = {
            ...entry,
            hours:     Number(entry.hours) || 0,
            logged:    Boolean(entry.logged),
            isAbsence: Boolean(entry.isAbsence),
          }
        }
      })
      return normalized
    } catch { return {} }
  })

  useEffect(() => {
    localStorage.setItem('trackerEntries', JSON.stringify(entries))
  }, [entries])

  const addEntry = (date, hours) => {
    const dateKey = format(date, 'yyyy-MM-dd')
    setEntries(prev => ({
      ...prev,
      [dateKey]: { hours: Number(hours) || 0, notes: '', logged: true, isAbsence: false }
    }))
  }

  const addAbsence = (date) => {
    const dateKey = format(date, 'yyyy-MM-dd')
    setEntries(prev => ({
      ...prev,
      [dateKey]: { hours: 0, notes: '', logged: false, isAbsence: true }
    }))
  }

  const getEntryForDate = (date) => entries[format(date, 'yyyy-MM-dd')] || null

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 })
  const weekDays  = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const toggleWorkday = (dayOfWeek) => {
    const current = config.workdays || [1, 2, 3, 4, 5]
    if (current.includes(dayOfWeek)) {
      if (current.length <= 1) return
      onConfigChange({ ...config, workdays: current.filter(d => d !== dayOfWeek) })
    } else {
      onConfigChange({ ...config, workdays: [...current, dayOfWeek].sort() })
    }
  }

  // ── Progress ──
  const {
    totalHours,
    extraHours,
    daysElapsed,
    totalDaysRequired,
    absenceCount,
    projectedEndDate,
  } = calculateProgress(
    entries,
    config.targetHours,
    config.hoursPerDay,
    config.startDate,
    config.excludeHolidays ? PH_HOLIDAY_DATES_2026 : [],
    config.workdays || [1, 2, 3, 4, 5],
  )

  const safeTargetHours = Math.max(1, Number(config.targetHours) || 1)
  const safeTotalHours  = Math.max(0, Number(totalHours) || 0)
  const progressPercent = Math.min((safeTotalHours / safeTargetHours) * 100, 100)
  const isGoalExceeded  = safeTotalHours >= safeTargetHours

  const holidayName = config.excludeHolidays
    ? getHolidayName2026(format(selectedDate, 'yyyy-MM-dd'))
    : null

  const resetEntries = () => {
    localStorage.removeItem('trackerEntries')
    setEntries({})
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">

        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-3xl"></span>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Internship Tracker</h1>
          </div>
          <p className="text-gray-600">Monitor your internship hours and achieve your target. Created by Emm. </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* LEFT COLUMN */}
          <div className="lg:col-span-1">

            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-700">SETUP</h3>
                <div className="flex gap-2">
                  <button onClick={resetEntries} className="text-xs px-3 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 transition">Clear Logs</button>
                  <button onClick={onResetAll}   className="text-xs px-3 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 transition">Reset All</button>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-2">TARGET HOURS</label>
                  <input
                    type="number" min="1"
                    value={config.targetHours}
                    onChange={e => onConfigChange({ ...config, targetHours: Math.max(1, parseInt(e.target.value || '0', 10) || 1) })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-2">START DATE</label>
                  <input
                    type="date"
                    value={config.startDate}
                    onChange={e => onConfigChange({ ...config, startDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-3">HOURS PER DAY</label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range" min="1" max="12"
                      value={config.hoursPerDay}
                      onChange={e => onConfigChange({ ...config, hoursPerDay: parseInt(e.target.value || '8', 10) || 8 })}
                      className="flex-1 h-2 bg-purple-100 rounded-lg appearance-none cursor-pointer"
                    />
                    <span className="text-xl font-bold text-purple-600 w-12 text-center">{config.hoursPerDay}h</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Default work hours per day</p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-3">EXCLUDE PH HOLIDAYS (2026)?</label>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => onConfigChange({ ...config, excludeHolidays: true })}
                      className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${config.excludeHolidays ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700'}`}>Yes</button>
                    <button type="button" onClick={() => onConfigChange({ ...config, excludeHolidays: false })}
                      className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${!config.excludeHolidays ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-700'}`}>No</button>
                  </div>
                  <p className="text-xs text-yellow-600 mt-2">⭐ PH holidays won't count as work days</p>
                </div>
              </div>
            </div>

            {/* Weekly Work Days */}
            <div className="mt-8 bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">WEEKLY WORK DAYS</h3>
              <div className="flex gap-2 mb-2">
                {weekDays.map((day, idx) => {
                  const dow       = day.getDay()
                  const isWorkday = (config.workdays || [1,2,3,4,5]).includes(dow)
                  return (
                    <button key={idx} type="button"
                      onClick={e => { e.stopPropagation(); toggleWorkday(dow) }}
                      className={`w-10 h-10 rounded-full font-semibold text-sm transition ${isWorkday ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    >
                      {format(day, 'EEEEEE')[0]}
                    </button>
                  )
                })}
              </div>
              <p className="text-xs text-gray-500">Click days to toggle as workdays</p>
            </div>

            {/* Progress Card */}
            <div className="mt-8">
              <ProgressCard
                totalHours={totalHours}
                targetHours={config.targetHours}
                extraHours={extraHours}
                daysElapsed={daysElapsed}
                totalDaysRequired={totalDaysRequired}
                absenceCount={absenceCount}
                progressPercent={progressPercent}
                isGoalExceeded={isGoalExceeded}
                projectedEndDate={projectedEndDate}
                entries={entries}
              />
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="lg:col-span-2">

            {holidayName && (
              <div className="bg-purple-500 text-white rounded-lg p-4 mb-6 flex items-start gap-3">
                <span className="text-xl">🇵🇭</span>
                <div>
                  <h4 className="font-semibold">PHILIPPINE HOLIDAY</h4>
                  <p className="text-sm">{holidayName}</p>
                </div>
              </div>
            )}

            <Calendar
              currentDate={currentDate}
              entries={entries}
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
              onMonthChange={setCurrentDate}
              startDate={config.startDate}
              projectedEndDate={projectedEndDate}
              holidays={config.excludeHolidays ? PH_HOLIDAY_DATES_2026 : []}
              hoursPerDay={config.hoursPerDay}
              workdays={config.workdays || [1, 2, 3, 4, 5]}
              targetHours={config.targetHours}
              onSave={addEntry}
            />

            <DailyLog
              selectedDate={selectedDate}
              entry={getEntryForDate(selectedDate)}
              onSave={addEntry}
              onAddAbsence={addAbsence}
              hoursPerDay={config.hoursPerDay}
            />
          </div>
        </div>
      </div>
    </div>
  )
}