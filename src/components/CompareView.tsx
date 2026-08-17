import { DateTime } from 'luxon'
import { getCivilDayBounds, localClockSeconds } from '../astronomy/civilTime'
import { formatClock, formatDegrees, formatDuration, formatSignedDegrees, formatSignedDuration } from '../astronomy/formatting'
import type { CompareDayData, Location, SeasonEvents } from '../astronomy/types'

const colors = ['#ffcf62', '#7ed9aa', '#91b9e8', '#ff8c74']
const width = 1000
const height = 390
const padding = { top: 28, right: 24, bottom: 48, left: 58 }

interface CompareViewProps {
  location: Location
  dates: string[]
  onDatesChange: (dates: string[]) => void
  onInspectDate: (date: string) => void
  data: CompareDayData[]
  seasons: SeasonEvents
  today: string
}

function CompareChart({ location, data }: { location: Location; data: CompareDayData[] }) {
  const values = data.flatMap((day) => day.profile.map((sample) => sample.altitudeDeg))
  const minimum = Math.floor(Math.min(-20, ...values) / 10) * 10
  const maximum = Math.ceil(Math.max(30, ...values) / 10) * 10
  const x = (fraction: number) => padding.left + fraction * (width - padding.left - padding.right)
  const y = (value: number) => padding.top + ((maximum - value) / (maximum - minimum)) * (height - padding.top - padding.bottom)

  return <div className="chart-scroll"><svg className="compare-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Compared solar altitude profiles">
    <title>Solar altitude through each actual local civil day</title>
    {[minimum, 0, 30, 60].filter((tick) => tick >= minimum && tick <= maximum).map((tick) => <g key={tick}><line className={tick === 0 ? 'horizon-line' : 'grid-line'} x1={padding.left} x2={width - padding.right} y1={y(tick)} y2={y(tick)} /><text className="axis-label" x={padding.left - 10} y={y(tick) + 4} textAnchor="end">{tick}°</text></g>)}
    {[0, .25, .5, .75, 1].map((fraction) => <g key={fraction}><line className="grid-line vertical" x1={x(fraction)} x2={x(fraction)} y1={padding.top} y2={height - padding.bottom} /><text className="axis-label" x={x(fraction)} y={height - 18} textAnchor="middle">{Math.round(fraction * 100)}%</text></g>)}
    {data.map((day, index) => {
      const bounds = getCivilDayBounds(location, day.date)
      const duration = bounds.end.toMillis() - bounds.start.toMillis()
      const points = day.profile.map((sample) => `${x((sample.timestamp.getTime() - bounds.start.toMillis()) / duration)},${y(sample.altitudeDeg)}`).join(' ')
      return <polyline key={day.date} className="compare-line" style={{ stroke: colors[index] }} points={points}><title>{day.date} · {day.civilDayDurationSeconds / 3600} hour civil day</title></polyline>
    })}
  </svg></div>
}

export function CompareView({ location, dates, onDatesChange, onInspectDate, data, seasons, today }: CompareViewProps) {
  const presets: Array<[string, string]> = [
    ['Today', today],
    ['1 month ago', DateTime.fromISO(today, { zone: location.timezone }).minus({ months: 1 }).toISODate()!],
    ['Summer solstice', DateTime.fromJSDate(seasons.summerSolstice, { zone: location.timezone }).toISODate()!],
    ['Winter solstice', DateTime.fromJSDate(seasons.winterSolstice, { zone: location.timezone }).toISODate()!],
    ['Spring equinox', DateTime.fromJSDate(seasons.springEquinox, { zone: location.timezone }).toISODate()!],
    ['Autumn equinox', DateTime.fromJSDate(seasons.autumnEquinox, { zone: location.timezone }).toISODate()!],
  ]
  const primary = data[0]
  const update = (index: number, date: string) => onDatesChange(dates.map((value, itemIndex) => itemIndex === index ? date : value))

  return <div className="mode-view compare-view">
    <section className="compare-controls">
      {dates.map((date, index) => <div className="compare-date" key={index} style={{ borderColor: colors[index] }}><span>Series {index + 1}</span><input type="date" value={date} onChange={(event) => event.target.value && update(index, event.target.value)} /><button className="inspect-compare" onClick={() => onInspectDate(date)} aria-label={`Inspect ${date} in Today`}>Inspect</button><select aria-label={`Preset for series ${index + 1}`} value="" onChange={(event) => event.target.value && update(index, event.target.value)}><option value="">Choose preset…</option>{presets.map(([label, value]) => <option key={label} value={value}>{label}</option>)}</select>{dates.length > 2 && <button onClick={() => onDatesChange(dates.filter((_, itemIndex) => itemIndex !== index))}>Remove</button>}</div>)}
      {dates.length < 4 && <button className="add-date" onClick={() => onDatesChange([...dates, presets.find(([, value]) => !dates.includes(value))?.[1] ?? today])}>+ Add date</button>}
    </section>

    <section className="panel chart-panel compare-panel"><div className="panel-heading"><div><span className="section-kicker">Normalized by actual elapsed civil-day duration</span><h2>Solar altitude overlay</h2></div><span className="chart-note">23h / 24h / 25h days remain distinct</span></div><CompareChart location={location} data={data} /><div className="chart-legend">{data.map((day, index) => <span key={day.date}><i style={{ background: colors[index] }} />{day.date} · {day.civilDayDurationSeconds / 3600}h</span>)}</div></section>

    <section className="panel comparison-table"><div className="panel-heading"><div><span className="section-kicker">Primary baseline · {primary.date}</span><h2>Event comparison</h2></div></div><div className="table-wrap"><table><thead><tr><th>Date</th><th>Astro dawn</th><th>Sunrise</th><th>Solar noon</th><th>Sunset</th><th>Astro dusk</th><th>Daylight</th><th>Max altitude</th><th>Δ vs primary</th></tr></thead><tbody>{data.map((day, index) => <tr key={day.date}><td><i className="series-dot" style={{ background: colors[index] }} />{day.date}</td><td>{formatClock(day.events.astronomicalDawn, location.timezone)}</td><td>{formatClock(day.events.sunrise, location.timezone)}</td><td>{formatClock(day.events.solarNoon, location.timezone)}</td><td>{formatClock(day.events.sunset, location.timezone)}</td><td>{formatClock(day.events.astronomicalDusk, location.timezone)}</td><td>{formatDuration(day.events.dayLengthSeconds)}</td><td>{formatDegrees(day.maximumSolarAltitudeDeg)}</td><td>{index === 0 ? 'baseline' : `${formatSignedDuration(day.events.dayLengthSeconds === null || primary.events.dayLengthSeconds === null ? null : day.events.dayLengthSeconds - primary.events.dayLengthSeconds)} · ${formatSignedDegrees(day.maximumSolarAltitudeDeg === null || primary.maximumSolarAltitudeDeg === null ? null : day.maximumSolarAltitudeDeg - primary.maximumSolarAltitudeDeg)}`}</td></tr>)}</tbody></table></div><p className="method-note">Clock events are shown in {location.timezone}. Profiles use elapsed-time fractions of each civil day, not an assumed 24-hour denominator. Sunrise wall-clock difference from primary: {data.slice(1).map((day) => day.events.sunrise && primary.events.sunrise ? formatSignedDuration(localClockSeconds(day.events.sunrise, location.timezone) - localClockSeconds(primary.events.sunrise, location.timezone)) : '—').join(' · ')}.</p></section>
  </div>
}
