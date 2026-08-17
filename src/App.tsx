import { useEffect, useMemo, useState } from 'react'
import { DateTime } from 'luxon'
import { getAltitudeCrossings } from './astronomy/altitudeCrossings'
import { clampCivilTimelineInspectionInstant, createCivilDayTimeline } from './astronomy/civilTimeline'
import { getCompareData } from './astronomy/compareData'
import { getDayProfile, getHourlySummary } from './astronomy/dayProfile'
import { formatClock, formatDegrees, formatDuration, formatSignedDegrees, formatSignedDuration, formatSignedRate } from './astronomy/formatting'
import { getSolarMaximum } from './astronomy/dayStatistics'
import { getSunEvents } from './astronomy/sunEvents'
import { getSunPosition } from './astronomy/sunPosition'
import { getSunRate } from './astronomy/sunRate'
import type { Location } from './astronomy/types'
import { getYearSolarStatistics } from './astronomy/yearStatistics'
import { AltitudeChart } from './components/AltitudeChart'
import { AltitudeMilestones } from './components/AltitudeMilestones'
import { CompareView } from './components/CompareView'
import { SunPath } from './components/SunPath'
import { TimeExplorer } from './components/TimeExplorer'
import { YearView } from './components/YearView'
import './App.css'

const location: Location = { name: 'Ústí nad Labem', latitude: 50.6724, longitude: 14.0706, elevationMeters: 0, timezone: 'Europe/Prague' }
const altitudeMilestones = [40, 30, 20, 15, 10, 5, 0]
const compassPoints = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
const compassDirection = (azimuth: number) => compassPoints[Math.round(azimuth / 22.5) % 16]
const formatRate = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(3)}°/min`
type ViewMode = 'today' | 'year' | 'compare'
type TimeMode = 'live' | 'inspect'

function App() {
  const initialNow = DateTime.now().setZone(location.timezone)
  const initialDate = initialNow.toISODate() ?? ''
  const [now, setNow] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState(initialDate)
  const [timeMode, setTimeMode] = useState<TimeMode>('live')
  const [inspectedInstant, setInspectedInstant] = useState(() => new Date())
  const [view, setView] = useState<ViewMode>('today')
  const [compareDates, setCompareDates] = useState([initialDate, initialNow.minus({ months: 1 }).toISODate() ?? initialDate])

  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 1_000); return () => window.clearInterval(timer) }, [])

  const localNow = DateTime.fromJSDate(now, { zone: location.timezone })
  const today = localNow.toISODate()!
  const isLive = timeMode === 'live'
  const effectiveInstant = isLive ? now : inspectedInstant

  useEffect(() => {
    if (timeMode === 'live' && selectedDate !== today) setSelectedDate(today)
  }, [timeMode, selectedDate, today])
  const events = useMemo(() => getSunEvents(location, selectedDate), [selectedDate])
  const timeline = useMemo(() => createCivilDayTimeline(location, selectedDate), [selectedDate])
  const profile = useMemo(() => getDayProfile(location, selectedDate), [selectedDate])
  const hourly = useMemo(() => getHourlySummary(location, selectedDate), [selectedDate])
  const position = useMemo(() => getSunPosition(location, effectiveInstant), [effectiveInstant])
  const rate = useMemo(() => getSunRate(location, effectiveInstant), [effectiveInstant])
  const maximum = useMemo(() => getSolarMaximum(location, events.solarNoon), [events.solarNoon])
  const selectedYear = Number(selectedDate.slice(0, 4))
  const yearData = useMemo(() => getYearSolarStatistics(location, selectedYear), [selectedYear])
  const selectedYearDay = yearData.days.find((day) => day.date === selectedDate) ?? yearData.days[0]
  const crossings = useMemo(() => altitudeMilestones.map((altitude) => getAltitudeCrossings(location, selectedDate, altitude)), [selectedDate])
  const compareData = useMemo(() => getCompareData(location, compareDates), [compareDates])

  const selectDate = (date: string) => {
    setSelectedDate(date)
    const current = new Date()
    if (date === DateTime.fromJSDate(current, { zone: location.timezone }).toISODate()) {
      setNow(current); setInspectedInstant(current); setTimeMode('live')
    } else {
      const dayEvents = getSunEvents(location, date)
      const dayTimeline = createCivilDayTimeline(location, date)
      setInspectedInstant(dayEvents.solarNoon ?? new Date((dayTimeline.start.getTime() + dayTimeline.end.getTime()) / 2))
      setTimeMode('inspect')
    }
  }
  const inspect = (instant: Date) => { setInspectedInstant(clampCivilTimelineInspectionInstant(timeline, instant)); setTimeMode('inspect') }
  const returnToNow = () => { const current = new Date(); setNow(current); setSelectedDate(DateTime.fromJSDate(current, { zone: location.timezone }).toISODate()!); setInspectedInstant(current); setTimeMode('live') }

  const repeatedHours = new Set(hourly.filter((sample, index) => hourly.findIndex((candidate) => candidate.hour === sample.hour) !== index).map((sample) => sample.hour))
  const formatHourlyLabel = (sample: (typeof hourly)[number]) => repeatedHours.has(sample.hour) ? `${sample.hour} UTC${sample.utcOffset}` : sample.hour
  const tempoRows = hourly.slice(0, -1).map((start, index) => ({ start, end: hourly[index + 1] })).filter(({ start, end }) => start.altitudeDeg > 0 || end.altitudeDeg > 0)
  const effectiveLocal = DateTime.fromJSDate(effectiveInstant, { zone: location.timezone })
  const currentHourStart = effectiveLocal.startOf('hour').toMillis()
  const status = position.altitudeDeg <= 0 ? 'Below horizon' : Math.abs(rate.altitudeDegPerMinute) < 0.01 ? 'Near culmination' : rate.altitudeDegPerMinute > 0 ? 'Rising' : 'Descending'
  const eventRows: Array<[string, Date | null]> = [['Astronomical dawn', events.astronomicalDawn], ['Nautical dawn', events.nauticalDawn], ['Civil dawn', events.civilDawn], ['Sunrise', events.sunrise], ['Solar noon', events.solarNoon], ['Sunset', events.sunset], ['Civil dusk', events.civilDusk], ['Nautical dusk', events.nauticalDusk], ['Astronomical dusk', events.astronomicalDusk]]

  return <main className="dashboard">
    <header className="masthead"><div><div className="eyebrow"><span className="sun-pulse"/> Solar position observatory</div><h1>SUN CENTER</h1></div><label className="date-control"><span>Observation date</span><input type="date" value={selectedDate} onChange={(event) => event.target.value && selectDate(event.target.value)}/></label></header>
    <nav className="mode-nav" aria-label="Sun Center views">{(['today', 'year', 'compare'] as const).map((mode) => <button key={mode} className={view === mode ? 'active' : ''} onClick={() => setView(mode)}>{mode}</button>)}</nav>
    <section className="location-bar"><div><span className="section-kicker">Station 01</span><strong>{location.name}</strong><span>50.6724° N, 14.0706° E · {location.elevationMeters} m</span></div><div className="local-clock"><span>Europe/Prague</span><strong>{localNow.toFormat('HH:mm:ss')}</strong><span>{localNow.toFormat('cccc, dd LLL yyyy · ZZZZ')}</span></div></section>

    {view === 'year' && <YearView location={location} selectedDate={selectedDate} onDateChange={selectDate} data={yearData}/>}
    {view === 'compare' && <CompareView location={location} dates={compareDates} onDatesChange={setCompareDates} data={compareData} seasons={yearData.seasons} today={today}/>}
    {view === 'today' && <div className="mode-view today-view">
      <TimeExplorer timeline={timeline} events={events} instant={effectiveInstant} isLive={isLive} onInspect={inspect} onNow={returnToNow}/>
      <section className="current-grid">
        <article className="panel current-sun"><div className="panel-heading"><div><span className="section-kicker">{isLive ? 'Live telemetry' : 'Time Explorer telemetry'}</span><h2>{isLive ? 'Current Sun' : 'Inspected Sun'}</h2><span className="inspection-datetime">{effectiveLocal.toFormat('cccc, dd LLL yyyy · HH:mm:ss ZZZZ')}</span></div><span className={`status status-${status.toLowerCase().replace(' ', '-')}`}>{status}</span></div><div className="hero-reading"><div><span>Altitude</span><strong>{formatDegrees(position.altitudeDeg)}</strong></div><div><span>Azimuth</span><strong>{formatDegrees(position.azimuthDeg)}</strong><small>{compassDirection(position.azimuthDeg)}</small></div></div><div className="rate-grid"><div><span>Altitude rate</span><strong className={rate.altitudeDegPerMinute >= 0 ? 'positive' : 'negative'}>{formatRate(rate.altitudeDegPerMinute)}</strong></div><div><span>Azimuth rate</span><strong>{formatRate(rate.azimuthDegPerMinute)}</strong></div><div><span>Shadow factor</span><strong>{position.shadowLengthFactor === null ? '—' : `${position.shadowLengthFactor.toFixed(2)}×`}</strong></div><div><span>Shadow bearing</span><strong>{position.shadowAzimuthDeg === null ? '—' : `${formatDegrees(position.shadowAzimuthDeg)} ${compassDirection(position.shadowAzimuthDeg)}`}</strong></div></div></article>
        <article className="panel statistics"><div className="panel-heading"><div><span className="section-kicker">Selected day</span><h2>Day statistics</h2></div></div><dl><div><dt>Day length</dt><dd>{formatDuration(events.dayLengthSeconds)}</dd></div><div><dt>Maximum altitude</dt><dd>{formatDegrees(maximum?.altitudeDeg ?? null)}</dd></div><div><dt>Maximum time</dt><dd>{formatClock(maximum?.timestamp ?? null, location.timezone)}</dd></div><div><dt>Civil timeline</dt><dd>{timeline.durationSeconds / 3600}h</dd></div></dl></article>
      </section>
      <section className="seasonal-readout today-seasonal"><div><span>Daylight vs yesterday</span><strong className={(selectedYearDay.dayLengthChangeSeconds ?? 0) >= 0 ? 'positive' : 'negative'}>{formatSignedDuration(selectedYearDay.dayLengthChangeSeconds)}</strong><small>{formatSignedRate(selectedYearDay.dayLengthChangeSeconds)}</small></div><div><span>Sunrise shift</span><strong>{formatSignedRate(selectedYearDay.sunriseChangeSeconds?.absoluteSolar ?? null)}</strong><small>clock {formatSignedDuration(selectedYearDay.sunriseChangeSeconds?.localClock ?? null)}</small></div><div><span>Sunset shift</span><strong>{formatSignedRate(selectedYearDay.sunsetChangeSeconds?.absoluteSolar ?? null)}</strong><small>clock {formatSignedDuration(selectedYearDay.sunsetChangeSeconds?.localClock ?? null)}</small></div><div><span>Maximum altitude</span><strong>{formatSignedDegrees(selectedYearDay.maximumAltitudeChangeDeg, 2, '°/day')}</strong></div><div><span>From summer solstice</span><strong>{formatSignedDuration(selectedYearDay.seasonalContext.daylightFromSummerSolsticeSeconds)}</strong></div><div><span>From winter solstice</span><strong>{formatSignedDuration(selectedYearDay.seasonalContext.daylightFromWinterSolsticeSeconds)}</strong></div></section>
      <SunPath location={location} date={selectedDate} instant={effectiveInstant} onInspect={inspect}/>
      <section className="panel chart-panel"><div className="panel-heading"><div><span className="section-kicker">Daily arc · click to inspect</span><h2>Solar altitude</h2></div><span className="date-caption">{DateTime.fromISO(selectedDate).toFormat('dd LLL yyyy')}</span></div><AltitudeChart location={location} date={selectedDate} samples={profile} events={events} instant={effectiveInstant} onInspect={inspect}/></section>
      <section className="lower-grid"><article className="panel events-panel"><div className="panel-heading"><div><span className="section-kicker">Light thresholds</span><h2>Day events</h2></div></div><div className="events-list">{eventRows.map(([label, event]) => <div key={label} className={label === 'Solar noon' ? 'solar-noon-row' : ''}><span>{label}</span><strong>{formatClock(event, location.timezone)}</strong></div>)}</div></article><AltitudeMilestones location={location} crossings={crossings} now={effectiveInstant} observationLabel={isLive ? 'Live' : 'Inspected time'} altitudeRateDegPerMinute={rate.altitudeDegPerMinute}/></section>
      <section className="panel tempo-panel hourly-panel"><div className="panel-heading"><div><span className="section-kicker">Hourly movement</span><h2>Tempo</h2></div><span className="tempo-unit">Δ altitude</span></div><div className="table-wrap"><table><thead><tr><th>Interval</th><th>Start</th><th>End</th><th>Change</th><th>Avg / hour</th></tr></thead><tbody>{tempoRows.map(({ start, end }) => { const change = end.altitudeDeg - start.altitudeDeg; const isCurrent = start.timestamp.getTime() === currentHourStart; return <tr key={start.timestamp.toISOString()} className={isCurrent ? 'current-hour' : ''}><td>{formatHourlyLabel(start)} → {formatHourlyLabel(end)}</td><td>{formatDegrees(start.altitudeDeg)}</td><td>{formatDegrees(end.altitudeDeg)}</td><td className={change >= 0 ? 'positive' : 'negative'}>{change >= 0 ? '+' : ''}{change.toFixed(2)}°</td><td>{change >= 0 ? '+' : ''}{change.toFixed(2)}°/h</td></tr> })}</tbody></table></div></section>
    </div>}
    <footer>Calculations: Astronomy Engine · Apparent topocentric coordinates · IANA timezone aware</footer>
  </main>
}
export default App
