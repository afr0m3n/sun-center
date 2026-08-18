import { DateTime } from 'luxon'
import type { YearSolarStatistics } from '../astronomy/types'
import { YearPositionRange } from './YearPositionRange'

interface CompactTodayYearPositionProps {
  selectedDate: string
  data: YearSolarStatistics
  onDateChange: (date: string) => void
  onScrubStart: () => void
  onScrubEnd: () => void
}

export function CompactTodayYearPosition({ selectedDate, data, onDateChange, onScrubStart, onScrubEnd }: CompactTodayYearPositionProps) {
  const dates = data.days.map((day) => day.date)
  const dateLabel = DateTime.fromISO(selectedDate).toFormat('dd LLL yyyy').toUpperCase()

  return <div className="compact-dock-row compact-today-year-position" aria-label="Compact TODAY Year Position">
    <strong>YEAR POSITION · {dateLabel}</strong>
    <div className="compact-year-track">
      <YearPositionRange
        dates={dates}
        selectedDate={selectedDate}
        ariaLabel={`Compact Year Position, selected date in ${data.year}`}
        onDateChange={onDateChange}
        onScrubStart={onScrubStart}
        onScrubEnd={onScrubEnd}
      />
      <div aria-hidden="true"><span>JAN</span><span>JUL</span><span>DEC</span></div>
    </div>
  </div>
}
