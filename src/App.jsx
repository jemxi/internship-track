import { useState, useEffect } from 'react'
import InternshipTracker from './components/InternshipTracker'

const DEFAULT_CONFIG = {
  targetHours: 486,
  startDate: new Date().toISOString().split('T')[0],
  hoursPerDay: 8,
  excludeHolidays: true,
  workdays: [1, 2, 3, 4, 5],
}

export default function App() {
  const [config, setConfig] = useState(() => {
    const savedConfig = localStorage.getItem('trackerConfig')
    if (!savedConfig) return DEFAULT_CONFIG
    try {
      const parsed = JSON.parse(savedConfig)
      const merged = { ...DEFAULT_CONFIG, ...parsed }
      return {
        targetHours: Number(merged.targetHours) || DEFAULT_CONFIG.targetHours,
        startDate: typeof merged.startDate === 'string' && merged.startDate
          ? merged.startDate
          : DEFAULT_CONFIG.startDate,
        hoursPerDay: Number(merged.hoursPerDay) || DEFAULT_CONFIG.hoursPerDay,
        excludeHolidays: Boolean(merged.excludeHolidays),
        workdays: Array.isArray(merged.workdays) && merged.workdays.length > 0
          ? merged.workdays.filter(d => d >= 0 && d <= 6)
          : DEFAULT_CONFIG.workdays,
      }
    } catch {
      return DEFAULT_CONFIG
    }
  })

  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true'
  })

  const [resetSeed, setResetSeed] = useState(0)

  useEffect(() => {
    localStorage.setItem('trackerConfig', JSON.stringify(config))
  }, [config])

  useEffect(() => {
    localStorage.setItem('darkMode', darkMode)
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  const handleResetAll = () => {
    localStorage.removeItem('trackerConfig')
    localStorage.removeItem('trackerEntries')
    setConfig(DEFAULT_CONFIG)
    setResetSeed(n => n + 1)
  }

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
        <InternshipTracker
          key={resetSeed}
          config={config}
          onConfigChange={setConfig}
          onResetAll={handleResetAll}
          darkMode={darkMode}
          onToggleDark={() => setDarkMode(d => !d)}
        />
      </div>
    </div>
  )
}