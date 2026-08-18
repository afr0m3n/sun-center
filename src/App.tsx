import { useEffect, useMemo, useRef, useState } from 'react'
import { DateTime } from 'luxon'
import { getAltitudeCrossings } from './astronomy/altitudeCrossings'
import { clampCivilTimelineInspectionInstant, createCivilDayTimeline } from './astronomy/civilTimeline'
import { getCompareData } from './astronomy/compareData'
import { getDayProfile, getHourlySummary } from './astronomy/dayProfile'
import { createInspectDayTransition, createWallClockScrubSession, preserveWallClockInScrubSession, type WallClockScrubSession } from './astronomy/explorerState'
import { formatClock, formatDegrees, formatDuration, formatSignedDegrees, formatSignedDuration, formatSignedRate } from './astronomy/formatting'
import { getSolarMaximum } from './astronomy/dayStatistics'
import { getSunEvents } from './astronomy/sunEvents'
import { getSunPosition } from './astronomy/sunPosition'
import { getSunRate } from './astronomy/sunRate'
import { getYearSolarStatistics } from './astronomy/yearStatistics'
import { AltitudeChart } from './components/AltitudeChart'
import { AltitudeMilestones } from './components/AltitudeMilestones'
import { CompareView } from './components/CompareView'
import { CompactTodayYearPosition } from './components/CompactTodayYearPosition'
import { CompactTimeExplorer } from './components/CompactTimeExplorer'
import { SunPath } from './components/SunPath'
import { TimeExplorer } from './components/TimeExplorer'
import { TodayYearScrubber } from './components/TodayYearScrubber'
import { useStickyExplorer } from './components/useStickyExplorer'
import { YearView } from './components/YearView'
import { LocationSelector } from './locations/LocationSelector'
import { useLocations } from './locations/useLocations'
import { ThemeControl } from './theme/ThemeControl'
import './App.css'

const altitudeMilestones = [40, 30, 20, 15, 10, 5, 0]
const compassPoints = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
const compassDirection = (azimuth: number) => compassPoints[Math.round(azimuth / 22.5) % 16]
const formatRate = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(3)}°/min`
type ViewMode = 'today' | 'year' | 'compare'
type TimeMode = 'live' | 'inspect'

function App() {
  const { activeLocation: location } = useLocations()
  const initialNow = DateTime.now().setZone(location.timezone)
  const initialDate = initialNow.toISODate() ?? ''
  const [now, setNow] = useState(() => new Date())
  const [todaySelectedDate, setTodaySelectedDate] = useState(initialDate)
  const [yearSelectedDate, setYearSelectedDate] = useState(initialDate)
  const [timeMode, setTimeMode] = useState<TimeMode>('live')
  const [inspectedInstant, setInspectedInstant] = useState(() => new Date())
  const [view, setView] = useState<ViewMode>('today')
  const [compareDates, setCompareDates] = useState([initialDate, initialNow.minus({ months: 1 }).toISODate() ?? initialDate])
  const { anchorRef: todayExplorerAnchorRef, visible: showCompactTodayExplorer } = useStickyExplorer()
  const { anchorRef: todayYearAnchorRef, visible: showCompactTodayYearPosition } = useStickyExplorer()
  const yearScrubSessionRef = useRef<WallClockScrubSession | null>(null)

  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 1_000); return () => window.clearInterval(timer) }, [])
  useEffect(() => { yearScrubSessionRef.current = null }, [location.id, view])

  const localNow = DateTime.fromJSDate(now, { zone: location.timezone })
  const today = localNow.toISODate()!
  const isLive = timeMode === 'live'
  const observationDate = isLive ? today : todaySelectedDate

  useEffect(() => {
    if (timeMode === 'live' && todaySelectedDate !== today) setTodaySelectedDate(today)
  }, [timeMode, todaySelectedDate, today])
  const events = useMemo(() => getSunEvents(location, observationDate), [location, observationDate])
  const timeline = useMemo(() => createCivilDayTimeline(location, observationDate), [location, observationDate])
  const clampedInspectedInstant = useMemo(() => clampCivilTimelineInspectionInstant(timeline, inspectedInstant), [timeline, inspectedInstant])
  const effectiveInstant = isLive ? now : clampedInspectedInstant
  const profile = useMemo(() => getDayProfile(location, observationDate), [location, observationDate])
  const hourly = useMemo(() => getHourlySummary(location, observationDate), [location, observationDate])
  const position = useMemo(() => getSunPosition(location, effectiveInstant), [location, effectiveInstant])
  const rate = useMemo(() => getSunRate(location, effectiveInstant), [location, effectiveInstant])
  const maximum = useMemo(() => getSolarMaximum(location, events.solarNoon), [location, events.solarNoon])
  const todayYear = Number(observationDate.slice(0, 4))
  const todayYearData = useMemo(() => getYearSolarStatistics(location, todayYear), [location, todayYear])
  const year = Number(yearSelectedDate.slice(0, 4))
  const yearData = useMemo(() => year === todayYear ? todayYearData : getYearSolarStatistics(location, year), [location, year, todayYear, todayYearData])
  const selectedYearDay = todayYearData.days.find((day) => day.date === observationDate) ?? todayYearData.days[0]
  const crossings = useMemo(() => altitudeMilestones.map((altitude) => getAltitudeCrossings(location, observationDate, altitude)), [location, observationDate])
  const compareData = useMemo(() => getCompareData(location, compareDates), [location, compareDates])

  useEffect(() => {
    if (timeMode !== 'inspect') return
    setInspectedInstant((current) => {
      const clamped = clampCivilTimelineInspectionInstant(timeline, current)
      return clamped.getTime() === current.getTime() ? current : clamped
    })
  }, [timeline, timeMode])

  const selectTodayDate = (date: string) => {
    setTodaySelectedDate(date)
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
  const beginYearScrub = () => {
    if (!yearScrubSessionRef.current) yearScrubSessionRef.current = createWallClockScrubSession(effectiveInstant)
  }
  const endYearScrub = () => { yearScrubSessionRef.current = null }
  const inspectDatePreservingWallClock = (date: string) => {
    const session = yearScrubSessionRef.current ?? createWallClockScrubSession(effectiveInstant)
    setTodaySelectedDate(date)
    setInspectedInstant(preserveWallClockInScrubSession(location, session, date))
    setTimeMode('inspect')
  }
  const returnToNow = () => { const current = new Date(); setNow(current); setTodaySelectedDate(DateTime.fromJSDate(current, { zone: location.timezone }).toISODate()!); setInspectedInstant(current); setTimeMode('live') }
  const inspectDay = (date: string) => {
    const transition = createInspectDayTransition(location, date, getSunEvents(location, date).solarNoon)
    setTodaySelectedDate(transition.selectedDate)
    setInspectedInstant(transition.inspectedInstant)
    setTimeMode(transition.timeMode)
    setView(transition.view)
  }

  const repeatedHours = new Set(hourly.filter((sample, index) => hourly.findIndex((candidate) => candidate.hour === sample.hour) !== index).map((sample) => sample.hour))
  const formatHourlyLabel = (sample: (typeof hourly)[number]) => repeatedHours.has(sample.hour) ? `${sample.hour} UTC${sample.utcOffset}` : sample.hour
  const tempoRows = hourly.slice(0, -1).map((start, index) => ({ start, end: hourly[index + 1] })).filter(({ start, end }) => start.altitudeDeg > 0 || end.altitudeDeg > 0)
  const effectiveLocal = DateTime.fromJSDate(effectiveInstant, { zone: location.timezone })
  const currentHourStart = effectiveLocal.startOf('hour').toMillis()
  const status = position.altitudeDeg <= 0 ? 'Below horizon' : Math.abs(rate.altitudeDegPerMinute) < 0.01 ? 'Near culmination' : rate.altitudeDegPerMinute > 0 ? 'Rising' : 'Descending'
  const eventRows: Array<[string, Date | null]> = [['Astronomical dawn', events.astronomicalDawn], ['Nautical dawn', events.nauticalDawn], ['Civil dawn', events.civilDawn], ['Sunrise', events.sunrise], ['Solar noon', events.solarNoon], ['Sunset', events.sunset], ['Civil dusk', events.civilDusk], ['Nautical dusk', events.nauticalDusk], ['Astronomical dusk', events.astronomicalDusk]]
  const headerDate = view === 'year' ? yearSelectedDate : observationDate
  const changeHeaderDate = (date: string) => view === 'year' ? setYearSelectedDate(date) : selectTodayDate(date)

  return <main className="dashboard">
    <header className="masthead"><div><div className="eyebrow"><span className="sun-pulse"/> Solar position observatory</div><h1>SUN CENTER</h1></div><div className="masthead-controls"><ThemeControl/><label className="date-control"><span>{view === 'year' ? 'Year selected date' : 'Observation date'}</span><input type="date" value={headerDate} onChange={(event) => event.target.value && changeHeaderDate(event.target.value)}/></label></div></header>
    <nav className="mode-nav" aria-label="Sun Center views">{(['today', 'year', 'compare'] as const).map((mode) => <button key={mode} className={view === mode ? 'active' : ''} aria-pressed={view === mode} onClick={() => setView(mode)}>{mode}</button>)}</nav>
    <section className="location-bar"><div className="station-details"><span className="section-kicker">Active station</span><LocationSelector/><span>{Math.abs(location.latitude).toFixed(4)}° {location.latitude >= 0 ? 'N' : 'S'}, {Math.abs(location.longitude).toFixed(4)}° {location.longitude >= 0 ? 'E' : 'W'} · {location.elevationMeters === null ? 'elevation —' : `${location.elevationMeters} m`}</span></div><div className="local-clock"><span>{location.timezone}</span><strong>{localNow.toFormat('HH:mm:ss')}</strong><span>{localNow.toFormat('cccc, dd LLL yyyy · ZZZZ')}</span></div></section>

    {view === 'year' && <YearView location={location} selectedDate={yearSelectedDate} onDateChange={setYearSelectedDate} onInspectDay={inspectDay} data={yearData}/>}
    {view === 'compare' && <CompareView location={location} dates={compareDates} onDatesChange={setCompareDates} onInspectDate={inspectDay} data={compareData} seasons={todayYearData.seasons} today={today}/>}
    {view === 'today' && <div className="mode-view today-view">
      <div ref={todayExplorerAnchorRef}><TimeExplorer timeline={timeline} events={events} instant={effectiveInstant} isLive={isLive} onInspect={inspect} onNow={returnToNow}/></div>
      <div ref={todayYearAnchorRef}><TodayYearScrubber location={location} selectedDate={observationDate} currentDate={today} data={todayYearData} onDateChange={inspectDatePreservingWallClock} onScrubStart={beginYearScrub} onScrubEnd={endYearScrub}/></div>
      {(showCompactTodayExplorer || showCompactTodayYearPosition) && <aside className="explorer-dock today-observatory-dock" aria-label="Compact TODAY observatory controls">
        {showCompactTodayExplorer && <CompactTimeExplorer timeline={timeline} instant={effectiveInstant} isLive={isLive} onInspect={inspect} onNow={returnToNow}/>}
        {showCompactTodayYearPosition && <CompactTodayYearPosition selectedDate={observationDate} data={todayYearData} onDateChange={inspectDatePreservingWallClock} onScrubStart={beginYearScrub} onScrubEnd={endYearScrub}/>}
      </aside>}
      <div className="wide-observatory">
        <div className="observatory-telemetry">
          <section className="current-grid">
            <article className="panel current-sun"><div className="panel-heading"><div><span className="section-kicker">{isLive ? 'Live telemetry' : 'Time Explorer telemetry'}</span><h2>{isLive ? 'Current Sun' : 'Inspected Sun'}</h2><span className="inspection-datetime">{effectiveLocal.toFormat('cccc, dd LLL yyyy · HH:mm:ss ZZZZ')}</span></div><span className={`status status-${status.toLowerCase().replace(' ', '-')}`}>{status}</span></div><div className="hero-reading"><div><span>Altitude</span><strong>{formatDegrees(position.altitudeDeg)}</strong></div><div><span>Azimuth</span><strong>{formatDegrees(position.azimuthDeg)}</strong><small>{compassDirection(position.azimuthDeg)}</small></div></div><div className="rate-grid"><div><span>Altitude rate</span><strong className={rate.altitudeDegPerMinute >= 0 ? 'positive' : 'negative'}>{formatRate(rate.altitudeDegPerMinute)}</strong></div><div><span>Azimuth rate</span><strong>{formatRate(rate.azimuthDegPerMinute)}</strong></div><div><span>Shadow factor</span><strong>{position.shadowLengthFactor === null ? '—' : `${position.shadowLengthFactor.toFixed(2)}×`}</strong></div><div><span>Shadow bearing</span><strong>{position.shadowAzimuthDeg === null ? '—' : `${formatDegrees(position.shadowAzimuthDeg)} ${compassDirection(position.shadowAzimuthDeg)}`}</strong></div></div></article>
            <article className="panel statistics"><div className="panel-heading"><div><span className="section-kicker">Selected day</span><h2>Day statistics</h2></div></div><dl><div><dt>Day length</dt><dd>{formatDuration(events.dayLengthSeconds)}</dd></div><div><dt>Maximum altitude</dt><dd>{formatDegrees(maximum?.altitudeDeg ?? null)}</dd></div><div><dt>Maximum time</dt><dd>{formatClock(maximum?.timestamp ?? null, location.timezone)}</dd></div><div><dt>Civil timeline</dt><dd>{timeline.durationSeconds / 3600}h</dd></div></dl></article>
          </section>
          <section className="seasonal-readout today-seasonal"><div><span>Daylight vs yesterday</span><strong className={(selectedYearDay.dayLengthChangeSeconds ?? 0) >= 0 ? 'positive' : 'negative'}>{formatSignedDuration(selectedYearDay.dayLengthChangeSeconds)}</strong><small>{formatSignedRate(selectedYearDay.dayLengthChangeSeconds)}</small></div><div><span>Sunrise shift</span><strong>{formatSignedRate(selectedYearDay.sunriseChangeSeconds?.absoluteSolar ?? null)}</strong><small>clock {formatSignedDuration(selectedYearDay.sunriseChangeSeconds?.localClock ?? null)}</small></div><div><span>Sunset shift</span><strong>{formatSignedRate(selectedYearDay.sunsetChangeSeconds?.absoluteSolar ?? null)}</strong><small>clock {formatSignedDuration(selectedYearDay.sunsetChangeSeconds?.localClock ?? null)}</small></div><div><span>Maximum altitude</span><strong>{formatSignedDegrees(selectedYearDay.maximumAltitudeChangeDeg, 2, '°/day')}</strong></div><div><span>From summer solstice</span><strong>{formatSignedDuration(selectedYearDay.seasonalContext.daylightFromSummerSolsticeSeconds)}</strong></div><div><span>From winter solstice</span><strong>{formatSignedDuration(selectedYearDay.seasonalContext.daylightFromWinterSolsticeSeconds)}</strong></div></section>
        </div>
        <SunPath location={location} date={observationDate} instant={effectiveInstant} onInspect={inspect}/>
      </div>
      <section className="panel chart-panel"><div className="panel-heading"><div><span className="section-kicker">Daily arc · drag to inspect</span><h2>Solar altitude</h2></div><span className="date-caption">{DateTime.fromISO(observationDate).toFormat('dd LLL yyyy')}</span></div><AltitudeChart location={location} date={observationDate} samples={profile} events={events} instant={effectiveInstant} onInspect={inspect}/></section>
      <section className="lower-grid"><article className="panel events-panel"><div className="panel-heading"><div><span className="section-kicker">Light thresholds</span><h2>Day events</h2></div></div><div className="events-list">{eventRows.map(([label, event]) => { const selected = Boolean(event && Math.abs(event.getTime() - effectiveInstant.getTime()) <= 1_000); return <div key={label} className={label === 'Solar noon' ? 'solar-noon-row' : ''}><span>{label}</span>{event ? <button className={`data-target ${selected ? 'selected' : ''}`} aria-pressed={selected} aria-label={`Inspect ${label} at ${formatClock(event, location.timezone)}`} onClick={() => inspect(event)}>{formatClock(event, location.timezone)}</button> : <strong>—</strong>}</div> })}</div></article><AltitudeMilestones location={location} crossings={crossings} now={effectiveInstant} observationLabel={isLive ? 'Live' : 'Inspected time'} altitudeRateDegPerMinute={rate.altitudeDegPerMinute} onInspect={inspect}/></section>
      <section className="panel tempo-panel hourly-panel"><div className="panel-heading"><div><span className="section-kicker">Hourly movement</span><h2>Tempo</h2></div><span className="tempo-unit">Δ altitude</span></div><div className="table-wrap"><table><thead><tr><th>Interval</th><th>Start</th><th>End</th><th>Change</th><th>Avg / hour</th></tr></thead><tbody>{tempoRows.map(({ start, end }) => { const change = end.altitudeDeg - start.altitudeDeg; const isCurrent = start.timestamp.getTime() === currentHourStart; return <tr key={start.timestamp.toISOString()} className={isCurrent ? 'current-hour' : ''}><td>{formatHourlyLabel(start)} → {formatHourlyLabel(end)}</td><td>{formatDegrees(start.altitudeDeg)}</td><td>{formatDegrees(end.altitudeDeg)}</td><td className={change >= 0 ? 'positive' : 'negative'}>{change >= 0 ? '+' : ''}{change.toFixed(2)}°</td><td>{change >= 0 ? '+' : ''}{change.toFixed(2)}°/h</td></tr> })}</tbody></table></div></section>
    </div>}
    <footer>Calculations: Astronomy Engine · Apparent topocentric coordinates · IANA timezone aware</footer>
  </main>
}
export default App
