import { DateTime } from 'luxon'
import { localClockSeconds } from '../astronomy/civilTime'
import { yearDateAtIndex, yearDateIndex } from '../astronomy/explorerState'
import { formatClock, formatDegrees, formatDuration, formatSignedDegrees, formatSignedDuration, formatSignedRate } from '../astronomy/formatting'
import type { Location, YearSolarStatistics } from '../astronomy/types'
import { AnnualChart, type AnnualMarker } from './AnnualChart'
import { useStickyExplorer } from './useStickyExplorer'

interface YearViewProps {
  location: Location
  selectedDate: string
  onDateChange: (date: string) => void
  onInspectDay: (date: string) => void
  data: YearSolarStatistics
}

export function YearView({ location, selectedDate, onDateChange, onInspectDay, data }: YearViewProps) {
  const dates = data.days.map((day) => day.date)
  const selectedIndex = yearDateIndex(dates, selectedDate)
  const selected = data.days[selectedIndex]
  const { anchorRef, visible: showCompactExplorer } = useStickyExplorer()
  const selectIndex = (index: number) => onDateChange(yearDateAtIndex(dates, index))
  const markerFor = (event: Date, label: string, color: string): AnnualMarker => ({
    index: Math.max(0, dates.indexOf(DateTime.fromJSDate(event, { zone: location.timezone }).toISODate()!)),
    label,
    color,
  })
  const markers = [
    markerFor(data.seasons.springEquinox, 'VE', 'var(--series-summer)'),
    markerFor(data.seasons.summerSolstice, 'SS', 'var(--solar-secondary)'),
    markerFor(data.seasons.autumnEquinox, 'AE', 'var(--series-coral)'),
    markerFor(data.seasons.winterSolstice, 'WS', 'var(--series-winter)'),
  ]
  const seasonRows: Array<[string, Date]> = [
    ['Spring equinox', data.seasons.springEquinox],
    ['Summer solstice', data.seasons.summerSolstice],
    ['Autumn equinox', data.seasons.autumnEquinox],
    ['Winter solstice', data.seasons.winterSolstice],
  ]
  const seasonDate = (event: Date) => DateTime.fromJSDate(event, { zone: location.timezone }).toISODate()!
  const daylightDirection = (selected.dayLengthChangeSeconds ?? 0) >= 0 ? 'lengthening' : 'shortening'
  const sunsetDirection = (selected.sunsetChangeSeconds?.absoluteSolar ?? 0) >= 0 ? 'later' : 'earlier'
  const annualDaylightRange = data.longestDay?.dayLengthSeconds !== null
    && data.longestDay?.dayLengthSeconds !== undefined
    && data.shortestDay?.dayLengthSeconds !== null
    && data.shortestDay?.dayLengthSeconds !== undefined
    ? data.longestDay.dayLengthSeconds - data.shortestDay.dayLengthSeconds
    : null

  return (
    <div className="mode-view year-view">
      <section className="year-hero">
        <div><span className="section-kicker">Annual solar cycle</span><h2>{data.year}</h2></div>
        <div className="year-tempo-copy">
          <strong>Daylight is {daylightDirection} by {formatDuration(Math.abs(selected.dayLengthChangeSeconds ?? 0), true)} per day.</strong>
          <span>Sunset is moving {sunsetDirection} by {formatDuration(Math.abs(selected.sunsetChangeSeconds?.absoluteSolar ?? 0), true)} per day.</span>
        </div>
      </section>

      <section ref={anchorRef} className="panel year-explorer" aria-labelledby="year-explorer-title">
        <div className="year-explorer-readout"><div><span className="section-kicker">Calendar-date timeline</span><h2 id="year-explorer-title">Year Explorer · {data.year}</h2></div><strong>{selectedDate}</strong></div>
        <input aria-label="Selected date in year graphs" aria-valuetext={selectedDate} type="range" min="0" max={dates.length - 1} value={selectedIndex} onChange={(event) => selectIndex(Number(event.target.value))} />
        <div className="year-explorer-context"><span>Daylight {formatDuration(selected.dayLengthSeconds)}</span><span>Maximum {formatDegrees(selected.maximumSolarAltitudeDeg)}</span><button className="inspect-day-action" onClick={() => onInspectDay(selectedDate)}>Inspect day</button></div>
      </section>

      {showCompactExplorer && <aside className="explorer-dock compact-year-explorer" aria-label="Compact Year Explorer">
        <div className="dock-readout"><span>{data.year}</span><strong>{selectedDate.slice(5)}</strong><span>{formatDuration(selected.dayLengthSeconds)} daylight</span></div>
        <div className="dock-slider"><input aria-label="Compact selected date in year" aria-valuetext={selectedDate} type="range" min="0" max={dates.length - 1} value={selectedIndex} onChange={(event) => selectIndex(Number(event.target.value))} /><span>{formatDegrees(selected.maximumSolarAltitudeDeg)} maximum</span></div>
        <button className="inspect-day-action" onClick={() => onInspectDay(selectedDate)}>Inspect day</button>
      </aside>}

      <section className="panel annual-summary">
        <div className="summary-days">
          <div><span>Longest day · {data.longestDay?.date ?? 'unavailable'}</span><strong>{formatDuration(data.longestDay?.dayLengthSeconds ?? null)}</strong></div>
          <div><span>Shortest day · {data.shortestDay?.date ?? 'unavailable'}</span><strong>{formatDuration(data.shortestDay?.dayLengthSeconds ?? null)}</strong></div>
          <div><span>Annual daylight range</span><strong>{formatSignedDuration(annualDaylightRange)}</strong></div>
        </div>
        <div className="season-grid">
          {seasonRows.map(([label, event]) => { const date = seasonDate(event); return <div key={label}><span>{label}</span><button className={`data-target ${date === selectedDate ? 'selected' : ''}`} aria-pressed={date === selectedDate} aria-label={`Select ${label}, ${DateTime.fromISO(date).toFormat('dd LLL yyyy')}`} onClick={() => onDateChange(date)}>{DateTime.fromJSDate(event, { zone: location.timezone }).toFormat('dd LLL · HH:mm:ss')}</button></div> })}
        </div>
      </section>

      <section className="seasonal-readout">
        <div><span>Daylight tempo</span><strong className={(selected.dayLengthChangeSeconds ?? 0) >= 0 ? 'positive' : 'negative'}>{formatSignedRate(selected.dayLengthChangeSeconds)}</strong></div>
        <div><span>Sunrise solar shift</span><strong>{formatSignedRate(selected.sunriseChangeSeconds?.absoluteSolar ?? null)}</strong><small>Local clock {formatSignedDuration(selected.sunriseChangeSeconds?.localClock ?? null)}</small></div>
        <div><span>Sunset solar shift</span><strong>{formatSignedRate(selected.sunsetChangeSeconds?.absoluteSolar ?? null)}</strong><small>Local clock {formatSignedDuration(selected.sunsetChangeSeconds?.localClock ?? null)}</small></div>
        <div><span>Maximum altitude tempo</span><strong>{formatSignedDegrees(selected.maximumAltitudeChangeDeg, 2, '°/day')}</strong></div>
        <div><span>From summer solstice</span><strong>{formatSignedDuration(selected.seasonalContext.daylightFromSummerSolsticeSeconds)}</strong></div>
        <div><span>From winter solstice</span><strong>{formatSignedDuration(selected.seasonalContext.daylightFromWinterSolsticeSeconds)}</strong></div>
        <div><span>From previous {selected.seasonalContext.previousEquinox} equinox</span><strong>{formatSignedDuration(selected.seasonalContext.daylightFromPreviousEquinoxSeconds)}</strong></div>
      </section>

      <section className="panel annual-panel">
        <div className="panel-heading"><div><span className="section-kicker">Photoperiod</span><h2>Daylight duration</h2></div><span className="date-caption">{selectedDate}</span></div>
        <AnnualChart title="Yearly daylight duration" dates={dates} series={[{ label: 'Daylight', color: 'var(--series-solar)', values: data.days.map((day) => day.dayLengthSeconds) }]} markers={markers} selectedIndex={selectedIndex} onSelectedIndexChange={selectIndex} formatValue={(value) => formatDuration(value)} />
      </section>

      <section className="panel annual-panel">
        <div className="panel-heading"><div><span className="section-kicker">Wall-clock events</span><h2>Sunrise / sunset</h2></div><span className="chart-note">DST steps are shown, not smoothed</span></div>
        <AnnualChart title="Local clock sunrise and sunset with DST discontinuities" dates={dates} series={[
          { label: 'Sunrise', color: 'var(--series-sunrise)', values: data.days.map((day) => day.sunrise ? localClockSeconds(day.sunrise, location.timezone) : null) },
          { label: 'Sunset', color: 'var(--series-sunset)', values: data.days.map((day) => day.sunset ? localClockSeconds(day.sunset, location.timezone) : null) },
        ]} markers={markers} selectedIndex={selectedIndex} onSelectedIndexChange={selectIndex} highlightJumps formatValue={(value) => DateTime.fromObject({ hour: Math.floor(value / 3600), minute: Math.floor((value % 3600) / 60) }).toFormat('HH:mm')} />
      </section>

      <div className="annual-pair">
        <section className="panel annual-panel">
          <div className="panel-heading"><div><span className="section-kicker">Culmination</span><h2>Maximum solar altitude</h2></div><span className="date-caption">{formatDegrees(selected.maximumSolarAltitudeDeg)}</span></div>
          <AnnualChart title="Maximum solar altitude by date" dates={dates} series={[{ label: 'Maximum', color: 'var(--series-maximum)', values: data.days.map((day) => day.maximumSolarAltitudeDeg) }]} markers={markers} selectedIndex={selectedIndex} onSelectedIndexChange={selectIndex} formatValue={(value) => `${value.toFixed(1)}°`} />
        </section>
        <section className="panel annual-panel">
          <div className="panel-heading"><div><span className="section-kicker">Seasonal acceleration</span><h2>Daylight tempo</h2></div><span className="date-caption">{formatSignedRate(selected.dayLengthChangeSeconds)}</span></div>
          <AnnualChart title="Daily daylight-duration change" dates={dates} series={[{ label: 'Δ daylight', color: 'var(--series-summer)', values: data.days.map((day) => day.dayLengthChangeSeconds) }]} markers={markers} selectedIndex={selectedIndex} onSelectedIndexChange={selectIndex} formatValue={(value) => `${Math.round(value)}s`} zeroLine />
        </section>
      </div>
      <p className="method-note">Sunrise and sunset tooltip values are local wall-clock times in {location.timezone}. Their dashed jumps expose offset changes; tempo metrics use the absolute solar shift and therefore do not turn a DST change into a one-hour astronomical movement. Selected sunrise: {formatClock(selected.sunrise, location.timezone)}.</p>

    </div>
  )
}
