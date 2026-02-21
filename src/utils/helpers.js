import { differenceInDays } from 'date-fns'

/* ─────────────────────────────────────────────
   PH HOLIDAYS 2026
───────────────────────────────────────────── */

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
  const h = PH_HOLIDAYS_2026.find(x => x.date === dateStr)
  return h ? h.name : null
}

/* ─────────────────────────────────────────────
   DATE HELPERS (NO TIMEZONE ISSUES)
───────────────────────────────────────────── */

const parseLocalDate = (s) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

const toDateStr = (d) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const da = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${da}`
}

/* ─────────────────────────────────────────────
   COUNT WORKDAYS IN RANGE
───────────────────────────────────────────── */

const countWorkdays = (start, end, workdays, holidays) => {
  let count = 0
  const cur = new Date(start)

  while (cur <= end) {
    const dateStr = toDateStr(cur)
    const dow = cur.getDay()
    const isHoliday = holidays.includes(dateStr)

    if (workdays.includes(dow) && !isHoliday) {
      count++
    }

    cur.setDate(cur.getDate() + 1)
  }

  return count
}

/* ─────────────────────────────────────────────
   MAIN PROGRESS CALCULATOR
───────────────────────────────────────────── */

export const calculateProgress = (
  entries,
  targetHours,
  hoursPerDay,
  startDate,
  holidays = [],
  workdays = [1,2,3,4,5]
) => {

  const safeHoursPerDay = Math.max(0.5, Number(hoursPerDay) || 8)
  const safeTargetHours = Math.max(1, Number(targetHours) || 1)
  const safeWorkdays = Array.isArray(workdays)
    ? workdays.filter(d => d >= 0 && d <= 6)
    : [1,2,3,4,5]

  const today = new Date()
  today.setHours(0,0,0,0)

  let start = (startDate && startDate.includes('-'))
    ? parseLocalDate(startDate)
    : new Date(today)

  if (Number.isNaN(start.getTime())) start = new Date(today)

  let totalHours = 0
  let daysLogged = 0
  let absenceCount = 0
  let daysElapsed = 0

  /* ─── WALK FROM START → TODAY ─── */

  if (start <= today) {
    const cur = new Date(start)

    while (cur <= today) {

      const dateStr = toDateStr(cur)
      const dow = cur.getDay()
      const isWorkday = safeWorkdays.includes(dow)
      const isHoliday = holidays.includes(dateStr)
      const entry = entries[dateStr]
      const isAbsent = entry?.isAbsence === true
      const hasManualHours = entry?.hours > 0

      if (isWorkday) {

        // ❌ Skip holiday if no manual hours
        if (isHoliday && !hasManualHours) {
          cur.setDate(cur.getDate() + 1)
          continue
        }

        daysElapsed++

        if (isAbsent) {
          absenceCount++
        } else {
          const hours = hasManualHours
            ? Number(entry.hours)
            : safeHoursPerDay

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

  /* ─── PROJECT END DATE ─── */

  const projectedEnd = new Date(today)

  if (remainingHours > 0 && safeWorkdays.length > 0) {
    let added = 0
    let safety = 3000

    while (added < remainingDays && safety-- > 0) {
      projectedEnd.setDate(projectedEnd.getDate() + 1)

      const dateStr = toDateStr(projectedEnd)
      const dow = projectedEnd.getDay()
      const isHoliday = holidays.includes(dateStr)

      if (safeWorkdays.includes(dow) && !isHoliday) {
        added++
      }
    }
  }

  const projectedEndDate = toDateStr(projectedEnd)

  const totalDaysRequired =
    start <= projectedEnd
      ? countWorkdays(start, projectedEnd, safeWorkdays, holidays)
      : 0

  return {
    totalHours,
    extraHours: Math.round(extraHours * 10) / 10,
    daysLogged,
    daysElapsed,
    totalDaysRequired,
    absenceCount,
    projectedEndDate
  }
}

/* ─────────────────────────────────────────────
   CALENDAR POPOVER CUMULATIVE HOURS
───────────────────────────────────────────── */

export const getCumulativeHoursAt = ({
  entries,
  startDate,
  targetDateStr,
  hoursPerDay,
  workdays,
  holidays
}) => {

  if (!startDate || !targetDateStr) return 0

  const safeHoursPerDay = Math.max(0.5, Number(hoursPerDay) || 8)
  const safeWorkdays = Array.isArray(workdays)
    ? workdays.filter(d => d >= 0 && d <= 6)
    : [1,2,3,4,5]

  const start = parseLocalDate(startDate)
  const target = parseLocalDate(targetDateStr)

  const today = new Date()
  today.setHours(0,0,0,0)

  let total = 0
  const cur = new Date(start)

  while (cur <= target) {

    const dateStr = toDateStr(cur)
    const dow = cur.getDay()
    const isWorkday = safeWorkdays.includes(dow)
    const isHoliday = holidays.includes(dateStr)
    const entry = entries[dateStr]
    const isAbsent = entry?.isAbsence === true
    const hasManualHours = entry?.hours > 0
    const isPast = cur <= today

    if (isWorkday && !isAbsent) {

      // ❌ skip holiday if no manual hours
      if (isHoliday && !hasManualHours) {
        cur.setDate(cur.getDate() + 1)
        continue
      }

      if (isPast) {
        const hours = hasManualHours
          ? Number(entry.hours)
          : safeHoursPerDay

        total += hours
      } else {
        total += safeHoursPerDay
      }
    }

    cur.setDate(cur.getDate() + 1)
  }

  return Math.round(total * 10) / 10
}