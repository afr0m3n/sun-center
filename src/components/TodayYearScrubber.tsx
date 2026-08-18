import { DateTime } from 'luxon'
import { yearDateIndex } from '../astronomy/explorerState'
import type { Location, YearSolarStatistics } from '../astronomy/types'
import { YearPositionRange } from './YearPositionRange'

interface TodayYearScrubberProps {
  location: Location
  selectedDate: string
  currentDate: string
  data: YearSolarStatistics
  onDateChange: (date: string) => void
  onScrubStart: () => void
  onScrubEnd: () => void
}

export function TodayYearScrubber({ location, selectedDate, currentDate, data, onDateChange, onScrubStart, onScrubEnd }: TodayYearScrubberProps) {
  const dates = data.days.map((day) => day.date)
  const seasonTargets = [
    ['Spring equinox', data.seasons.springEquinox, 'VE'],
    ['Summer solstice', data.seasons.summerSolstice, 'SS'],
    ['Autumn equinox', data.seasons.autumnEquinox, 'AE'],
    ['Winter solstice', data.seasons.winterSolstice, 'WS'],
  ] as const
  const dateFor = (instant: Date) => DateTime.fromJSDate(instant, { zone: location.timezone }).toISODate()!

  return <section className="panel today-year-scrubber" aria-labelledby="today-year-scrubber-title">
    <div className="year-scrubber-heading">
      <div><span className="section-kicker">Date × time exploration</span><h2 id="today-year-scrubber-title">Year position · {data.year}</h2></div>
      <strong>{DateTime.fromISO(selectedDate).toFormat('dd LLL yyyy').toUpperCase()}</strong>
      <button className="current-date-action" onClick={() => onDateChange(currentDate)}>CURRENT DATE</button>
    </div>
    <div className="year-scrubber-track">
      <div className="year-scrubber-markers">
        {seasonTargets.map(([label, instant, short]) => {
          const date = dateFor(instant)
          const index = yearDateIndex(dates, date)
          return <button key={label} style={{ left: `${(index / Math.max(1, dates.length - 1)) * 100}%` }} aria-label={`Select ${label}, ${DateTime.fromISO(date).toFormat('dd LLL yyyy')}`} title={`${label} · ${date}`} onClick={() => onDateChange(date)}><i />{short}</button>
        })}
      </div>
      <YearPositionRange dates={dates} selectedDate={selectedDate} ariaLabel={`TODAY Year Position, selected date in ${data.year}`} onDateChange={onDateChange} onScrubStart={onScrubStart} onScrubEnd={onScrubEnd} />
      <div className="year-scrubber-months" aria-hidden="true">{['JAN', 'MAR', 'MAY', 'JUL', 'SEP', 'NOV'].map((month) => <span key={month}>{month}</span>)}</div>
    </div>
  </section>
}
