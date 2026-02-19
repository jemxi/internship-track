import { useState, useEffect, useRef } from 'react'
import {
  startOfMonth, endOfMonth, eachDayOfInterval, format,
  isSameDay, startOfWeek, endOfWeek, isToday,
  isWithinInterval
} from 'date-fns'
import { getCumulativeHoursAt } from '../utils/helpers'

const parseLocalDate = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

const toDateStr = (date) => format(date, 'yyyy-MM-dd')

export default function Calendar({
  currentDate,
  entries,
  selectedDate,
  onDateSelect,
  onMonthChange,
  startDate,
  projectedEndDate,
  holidays = [],
  hoursPerDay = 8,
  workdays = [1, 2, 3, 4, 5],
  targetHours = 486,
}) {
  const [popover, setPopover] = useState(null)
  const calendarRef           = useRef(null)
  const popoverRef            = useRef(null)

  const monthStart    = startOfMonth(currentDate)
  const monthEnd      = endOfMonth(monthStart)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calendarEnd   = endOfWeek(monthEnd, { weekStartsOn: 0 })
  const days          = eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  const weeks         = []
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7))

  const startDateObj    = startDate       ? parseLocalDate(startDate)       : null
  const projectedEndObj = projectedEndDate ? parseLocalDate(projectedEndDate) : null

  const getDateStatus = (date) => {
    const entry = entries[toDateStr(date)]
    if (!entry) return null
    if (entry.isAbsence) return 'absence'
    if (entry.hours > 0) return 'logged'
    return null
  }

  const isInProjectedRange = (date) => {
    if (!startDateObj || !projectedEndObj) return false
    const dateStr   = toDateStr(date)
    const dayOfWeek = date.getDay()
    if (!workdays.includes(dayOfWeek)) return false
    if (holidays.includes(dateStr)) return false
    return isWithinInterval(date, { start: startDateObj, end: projectedEndObj })
  }

  const isHolidayDate = (date) => holidays.includes(toDateStr(date))
  const isStartDate   = (date) => startDateObj ? isSameDay(date, startDateObj) : false

  useEffect(() => {
    const handler = (e) => {
      if (
        popoverRef.current  && !popoverRef.current.contains(e.target) &&
        calendarRef.current && !calendarRef.current.contains(e.target)
      ) setPopover(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleDayClick = (day, e) => {
    onDateSelect(day)
    const rect    = e.currentTarget.getBoundingClientRect()
    const calRect = calendarRef.current?.getBoundingClientRect()
    setPopover({
      dateStr: toDateStr(day),
      top:  rect.top  - (calRect?.top  || 0),
      left: rect.left - (calRect?.left || 0),
      dayW: rect.width,
      dayH: rect.height,
    })
  }

  const buildPopover = () => {
    if (!popover) return null
    const { dateStr } = popover

    const todayStr  = toDateStr(new Date())
    const entry     = entries[dateStr]
    const isHoliday = holidays.includes(dateStr)
    const isTodays  = dateStr === todayStr
    const isFuture  = dateStr > todayStr
    const isAbsent  = entry?.isAbsence === true

    // ✅ Use the same getCumulativeHoursAt from helpers — synced with ProgressCard
    const cumulative = getCumulativeHoursAt({
      entries,
      startDate,
      targetDateStr: dateStr,
      hoursPerDay,
      workdays,
      holidays,
    })

    const remaining = Math.max(0, Number(targetHours) - cumulative)
    const pct       = Number(targetHours) > 0
      ? Math.min(Math.round((cumulative / Number(targetHours)) * 100), 100)
      : 0

    // Hours for this specific day
    const dayOfWeek    = parseLocalDate(dateStr).getDay()
    const isWorkday    = workdays.includes(dayOfWeek)
    const hoursThisDay = isAbsent || isHoliday || !isWorkday
      ? 0
      : entry?.hours > 0
        ? Number(entry.hours)
        : Number(hoursPerDay)

    return {
      dayLabel: format(parseLocalDate(dateStr), 'EEE, MMM d'),
      entry, isHoliday, cumulative, isTodays, isFuture, remaining, pct, isAbsent, hoursThisDay,
    }
  }

  const pc = buildPopover()

  return (
    <div ref={calendarRef} className="bg-white rounded-lg p-6 shadow-sm relative">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">{format(currentDate, 'MMMM yyyy')}</h2>
        <div className="flex gap-2">
          <button onClick={() => { onMonthChange(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1)); setPopover(null) }} className="px-3 py-1 hover:bg-gray-100 rounded">❮</button>
          <button onClick={() => { onMonthChange(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1)); setPopover(null) }} className="px-3 py-1 hover:bg-gray-100 rounded">❯</button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['S','M','T','W','T','F','S'].map((d, i) => (
          <div key={i} className="text-center text-sm font-semibold text-gray-500">{d}</div>
        ))}
      </div>

      {/* Weeks */}
      <div className="space-y-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1">
            {week.map((day, di) => {
              const status         = getDateStatus(day)
              const isCurrentMonth = day.getMonth() === currentDate.getMonth()
              const isSelected     = isSameDay(day, selectedDate)
              const isTodayDate    = isToday(day)
              const inProjected    = isInProjectedRange(day)
              const isHoliday      = isHolidayDate(day)
              const dateStr        = toDateStr(day)
              const entry          = entries[dateStr]
              const hasLoggedHours = entry?.hours > 0
              const isLogged       = status === 'logged'
              const isAbsence      = status === 'absence'
              const isStart        = isStartDate(day)
              const isPopped       = popover?.dateStr === dateStr && isCurrentMonth

              return (
                <button
                  key={di}
                  onClick={(e) => isCurrentMonth && handleDayClick(day, e)}
                  className={`
                    aspect-square rounded-lg font-semibold text-sm transition relative
                    ${!isCurrentMonth ? 'text-gray-300 pointer-events-none' : ''}
                    ${isCurrentMonth && !status && !inProjected ? 'hover:bg-gray-100 text-gray-700' : ''}
                    ${isCurrentMonth && inProjected && !hasLoggedHours && !isLogged ? 'bg-purple-100 text-purple-700 border border-purple-300' : ''}
                    ${isCurrentMonth && isLogged ? 'bg-blue-100 text-blue-700 border-2 border-blue-400' : ''}
                    ${isCurrentMonth && isAbsence ? 'bg-red-100 text-red-700 border-2 border-red-400' : ''}
                    ${isStart && isCurrentMonth ? 'ring-2 ring-green-500 ring-offset-1' : ''}
                    ${isSelected && isCurrentMonth ? 'border-2 border-purple-500' : ''}
                    ${isTodayDate && isCurrentMonth ? 'ring-2 ring-purple-300' : ''}
                    ${isPopped ? 'scale-110 z-10 shadow-md ring-2 ring-purple-400 ring-offset-1' : ''}
                  `}
                >
                  <div className="w-full h-full flex flex-col items-center justify-center">
                    <span>{format(day, 'd')}</span>
                    {isCurrentMonth && hasLoggedHours && (
                      <span className="text-xs font-semibold">{entry.hours}h</span>
                    )}
                    {isCurrentMonth && inProjected && !hasLoggedHours && !isLogged && status !== 'absence' && (
                      <span className="text-xs text-purple-600">{hoursPerDay}h</span>
                    )}
                    {isCurrentMonth && isAbsence && (
                      <span className="text-xs font-bold text-red-600">A</span>
                    )}
                    {isHoliday && (
                      <span className="absolute top-1 right-1 text-yellow-500 text-xs">★</span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {/* ── Popover ── */}
      {popover && pc && (() => {
        const calW        = calendarRef.current?.offsetWidth || 500
        const popW        = 272
        const rawLeft     = popover.left - (popW / 2) + (popover.dayW / 2)
        const clampedLeft = Math.min(Math.max(rawLeft, 8), calW - popW - 8)
        const arrowLeft   = popover.left + popover.dayW / 2 - clampedLeft - 6

        return (
          <div
            ref={popoverRef}
            className="absolute z-50"
            style={{ top: popover.top + popover.dayH + 8, left: clampedLeft, width: popW }}
          >
            <div className="absolute -top-1.5 w-3 h-3 rotate-45 bg-white border-l border-t border-gray-200"
              style={{ left: Math.min(Math.max(arrowLeft, 10), popW - 20) }} />

            <div className="bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden">

              {/* Header */}
              <div className={`px-4 py-3 border-b border-gray-100 flex items-center justify-between ${
                pc.isAbsent  ? 'bg-red-50'    :
                pc.isHoliday ? 'bg-yellow-50' :
                pc.isFuture  ? 'bg-indigo-50' :
                               'bg-blue-50'
              }`}>
                <div>
                  <div className="font-bold text-gray-900 text-sm">{pc.dayLabel}</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {pc.isHoliday ? '⭐ Philippine Holiday' :
                     pc.isAbsent  ? '🚫 Marked Absent'      :
                     pc.isFuture  ? '📅 Projected'           :
                                    '✅ Hours Counted'}
                  </div>
                </div>
                <button onClick={() => setPopover(null)} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-black/10 text-gray-400 text-xs ml-2 shrink-0">✕</button>
              </div>

              {/* Body */}
              <div className="px-4 py-3 space-y-3">

                {/* Hours this day */}
                {!pc.isHoliday && !pc.isAbsent && pc.hoursThisDay > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {pc.isFuture ? 'Projected hours this day' : 'Hours this day'}
                    </span>
                    <span className="font-bold text-purple-600 text-sm bg-purple-50 px-2 py-0.5 rounded-lg">
                      {pc.hoursThisDay}h
                      {pc.entry?.hours > 0 && !pc.isFuture && <span className="text-[10px] text-gray-400 ml-1">(manual)</span>}
                    </span>
                  </div>
                )}

                {/* Cumulative */}
                {pc.cumulative > 0 && (
                  <>
                    <div className="border-t border-gray-100" />
                    <p className="text-xs text-gray-600 leading-relaxed">
                      {pc.isFuture ? (
                        <>
                          When you reach this date, you'll have{' '}
                          <span className="font-bold text-indigo-600">{pc.cumulative}/{targetHours} hrs</span>.
                          {pc.remaining > 0 ? (
                            <>{' '}<span className="text-gray-400">({pc.remaining} hrs remaining at that point)</span></>
                          ) : (
                            <>{' '}<span className="font-bold text-green-500">Goal achieved by then! 🎉</span></>
                          )}
                        </>
                      ) : pc.isTodays ? (
                        <>
                          From the start, you've reached{' '}
                          <span className="font-bold text-purple-600">{pc.cumulative}/{targetHours} hrs</span>{' '}
                          now.{' '}
                          {pc.remaining > 0 ? (
                            <><span className="font-bold text-orange-500">{pc.remaining} hrs</span> to go! 💪</>
                          ) : (
                            <span className="font-bold text-green-500">Goal achieved! 🎉</span>
                          )}
                        </>
                      ) : (
                        <>
                          From the start, you reached{' '}
                          <span className="font-bold text-purple-600">{pc.cumulative} hrs</span>{' '}
                          by this date.
                          {pc.remaining > 0 && (
                            <span className="text-gray-400"> ({pc.remaining} hrs remaining at this point)</span>
                          )}
                        </>
                      )}
                    </p>

                    {/* Mini progress bar */}
                    <div>
                      <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                        <span>{pc.cumulative}h</span>
                        <span>{targetHours}h target</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${pc.pct}%`,
                            background: pc.cumulative >= Number(targetHours)
                              ? '#10b981'
                              : pc.isFuture
                                ? 'linear-gradient(90deg, #6366f1, #a5b4fc)'
                                : 'linear-gradient(90deg, #7c3aed, #a78bfa)',
                          }}
                        />
                      </div>
                      <div className={`text-right text-[10px] font-bold mt-0.5 ${pc.isFuture ? 'text-indigo-500' : 'text-purple-600'}`}>
                        {pc.pct}%
                      </div>
                    </div>
                  </>
                )}

                {/* Edge cases */}
                {pc.cumulative === 0 && !pc.isAbsent && !pc.isHoliday && (
                  <p className="text-xs text-gray-400 text-center py-1">
                    No hours counted for this date range.
                  </p>
                )}
                {pc.isAbsent && (
                  <p className="text-xs text-red-400 text-center py-1">Marked as absent — no hours counted.</p>
                )}
                {pc.isHoliday && (
                  <p className="text-xs text-yellow-600 text-center py-1">Philippine holiday — not a work day.</p>
                )}
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}