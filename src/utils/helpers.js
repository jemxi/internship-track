import { differenceInDays } from 'date-fns'

export const PH_HOLIDAYS_2026 = [
  { date: '2026-01-01', name: "New Year's Day" },
  { date: '2026-02-17', name: "Chinese New Year" },
  { date: '2026-02-25', name: 'EDSA Revolution Day' },
  { date: '2026-04-09', name: 'Araw ng Kagitingan' },
  { date: '2026-04-02', name: 'Maundy Thursday' },
  { date: '2026-04-03', name: 'Good Friday' },
  { date: '2026-04-04', name: 'Black Saturday' },
  { date: '2026-04-05', name: 'Easter Sunday' },
  { date: '2026-06-12', name: 'Independence Day' },
  { date: '2026-08-21', name: 'Ninoy Aquino Day' },
  { date: '2026-11-01', name: "All Saints' Day" },
  { date: '2026-11-30', name: 'Bonifacio Day' },
  { date: '2026-12-08', name: 'Feast of the Immaculate Conception' },
  { date: '2026-12-25', name: 'Christmas Day' },
  { date: '2026-12-30', name: 'Rizal Day' },
]

export const PH_HOLIDAY_DATES_2026 = PH_HOLIDAYS_2026.map(h => h.date)

export const getHolidayName2026 = (dateStr) => {
  const holiday = PH_HOLIDAYS_2026.find(h => h.date === dateStr)
  return holiday ? holiday.name : null
}

// Parse date string without timezone offset — critical for PH timezone
const parseLocalDate = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

const toDateStr = (date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Count workdays in a range [start, end] inclusive
const countWorkdays = (start, end, workdays, holidays) => {
  let count = 0
  const cur = new Date(start)
  while (cur <= end) {
    const dateStr = toDateStr(cur)
    const dayOfWeek = cur.getDay()
    if (workdays.includes(dayOfWeek) && !holidays.includes(dateStr)) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

export const calculateProgress = (
  entries,
  targetHours,
  hoursPerDay,
  startDate,
  holidays = [],
  workdays = [1, 2, 3, 4, 5],
) => {
  const safeHoursPerDay = Math.max(0.5, Number(hoursPerDay) || 8)
  const safeTargetHours = Math.max(1, Number(targetHours) || 1)
  const safeWorkdays = Array.isArray(workdays) ? workdays.filter(d => d >= 0 && d <= 6) : [1, 2, 3, 4, 5]

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let start = (startDate && startDate.includes('-')) ? parseLocalDate(startDate) : new Date(today)
  if (Number.isNaN(start.getTime())) start = new Date(today)

  // Walk from start → today, accumulate hours
  let totalHours = 0
  let daysLogged = 0       // workdays counted (non-absent)
  let absenceCount = 0
  let daysElapsed = 0      // workdays from start to today inclusive

  if (start <= today) {
    const cur = new Date(start)
    while (cur <= today) {
      const dateStr = toDateStr(cur)
      const dayOfWeek = cur.getDay()
      const isWorkday = safeWorkdays.includes(dayOfWeek)
      const isHoliday = holidays.includes(dateStr)
      const entry = entries[dateStr]
      const isAbsent = entry?.isAbsence === true

      if (isWorkday && !isHoliday) {
        daysElapsed++
        if (isAbsent) {
          absenceCount++
        } else {
          const hours = (entry?.hours > 0) ? Number(entry.hours) : safeHoursPerDay
          totalHours += hours
          daysLogged++
        }
      }
      cur.setDate(cur.getDate() + 1)
    }
  }

  totalHours = Math.round(totalHours * 10) / 10

  const extraHours = Math.max(0, totalHours - safeTargetHours)
  const remainingHours = Math.max(0, safeTargetHours - totalHours)
  const remainingDays = Math.ceil(remainingHours / safeHoursPerDay)

  // Project end date: walk forward from today
  const projectedEnd = new Date(today)
  if (remainingHours > 0 && safeWorkdays.length > 0) {
    let added = 0
    let safety = 3000
    while (added < remainingDays && safety-- > 0) {
      projectedEnd.setDate(projectedEnd.getDate() + 1)
      const dateStr = toDateStr(projectedEnd)
      const dayOfWeek = projectedEnd.getDay()
      if (safeWorkdays.includes(dayOfWeek) && !holidays.includes(dateStr)) added++
    }
  }

  const pey = projectedEnd.getFullYear()
  const pem = String(projectedEnd.getMonth() + 1).padStart(2, '0')
  const ped = String(projectedEnd.getDate()).padStart(2, '0')
  const projectedEndDate = `${pey}-${pem}-${ped}`

  // Total workdays from start → projectedEnd (the "61 days" total)
  const totalDaysRequired = start <= projectedEnd
    ? countWorkdays(start, projectedEnd, safeWorkdays, holidays)
    : 0

  return {
    totalHours,
    extraHours: Math.round(extraHours * 10) / 10,
    daysLogged,
    daysElapsed,        // workdays from start to today (the "25" in "25/61")
    totalDaysRequired,  // total workdays from start to projected end (the "61")
    absenceCount,
    projectedEndDate,
  }
}

// ─── Shared cumulative calculator (used by Calendar popover) ───────────────
// For any target date: sum hours from startDate to that date
// Past/today: uses actual entries + auto-project
// Future: projects forward (auto-project only, no absences assumed)
export const getCumulativeHoursAt = ({
  entries,
  startDate,
  targetDateStr,
  hoursPerDay,
  workdays,
  holidays,
}) => {
  if (!startDate || !targetDateStr) return 0

  const safeHoursPerDay = Math.max(0.5, Number(hoursPerDay) || 8)
  const safeWorkdays = Array.isArray(workdays) ? workdays.filter(d => d >= 0 && d <= 6) : [1, 2, 3, 4, 5]

  const start = parseLocalDate(startDate)
  const target = parseLocalDate(targetDateStr)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let total = 0
  const cur = new Date(start)

  while (cur <= target) {
    const dateStr = toDateStr(cur)
    const dayOfWeek = cur.getDay()
    const isWorkday = safeWorkdays.includes(dayOfWeek)
    const isHoliday = holidays.includes(dateStr)
    const entry = entries[dateStr]
    const isAbsent = entry?.isAbsence === true
    const isPast = cur <= today

    if (isWorkday && !isHoliday && !isAbsent) {
      if (isPast) {
        // Past/today: use manual log or auto-project
        const hours = (entry?.hours > 0) ? Number(entry.hours) : safeHoursPerDay
        total += hours
      } else {
        // Future: always project hoursPerDay
        total += safeHoursPerDay
      }
    }

    cur.setDate(cur.getDate() + 1)
  }

  return Math.round(total * 10) / 10
}
