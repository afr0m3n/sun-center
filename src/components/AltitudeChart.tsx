import { DateTime } from 'luxon'
import type { DaySample, Location, SunEvents } from '../astronomy/types'

interface AltitudeChartProps {
  location: Location
  date: string
  samples: DaySample[]
  events: SunEvents
  now: Date
}

const width = 1000
const height = 360
const padding = { top: 28, right: 24, bottom: 48, left: 56 }

export function AltitudeChart({ location, date, samples, events, now }: AltitudeChartProps) {
  const dayStart = DateTime.fromISO(date, { zone: location.timezone }).startOf('day')
  const dayEnd = dayStart.plus({ days: 1 })
  const minAltitude = Math.min(-24, Math.floor(Math.min(...samples.map((sample) => sample.altitudeDeg)) / 10) * 10)
  const maxAltitude = Math.max(30, Math.ceil(Math.max(...samples.map((sample) => sample.altitudeDeg)) / 10) * 10)
  const plotWidth = width - padding.left - padding.right
  const plotHeight = height - padding.top - padding.bottom
  const x = (instant: Date) =>
    padding.left + ((instant.getTime() - dayStart.toMillis()) / (dayEnd.toMillis() - dayStart.toMillis())) * plotWidth
  const y = (altitude: number) =>
    padding.top + ((maxAltitude - altitude) / (maxAltitude - minAltitude)) * plotHeight
  const points = samples.map((sample) => `${x(sample.timestamp)},${y(sample.altitudeDeg)}`).join(' ')
  const selectedIsToday = DateTime.fromJSDate(now, { zone: location.timezone }).toISODate() === date
  const markers = [
    { label: 'Sunrise', time: events.sunrise, color: '#ffb45e' },
    { label: 'Solar noon', time: events.solarNoon, color: '#fff0a5' },
    { label: 'Sunset', time: events.sunset, color: '#ff7b54' },
  ]

  return (
    <div className="chart-scroll" aria-label={`Solar altitude chart for ${date}`}>
      <svg className="altitude-chart" viewBox={`0 0 ${width} ${height}`} role="img">
        <title>Solar altitude throughout the selected local day</title>
        <defs>
          <linearGradient id="sun-line" x1="0" x2="1">
            <stop offset="0" stopColor="#ff7b54" />
            <stop offset="0.5" stopColor="#ffe27a" />
            <stop offset="1" stopColor="#ff7b54" />
          </linearGradient>
        </defs>
        {[minAltitude, 0, 30, 60].filter((tick) => tick <= maxAltitude && tick >= minAltitude).map((tick) => (
          <g key={tick}>
            <line
              className={tick === 0 ? 'horizon-line' : 'grid-line'}
              x1={padding.left}
              x2={width - padding.right}
              y1={y(tick)}
              y2={y(tick)}
            />
            <text className="axis-label" x={padding.left - 12} y={y(tick) + 4} textAnchor="end">
              {tick}°
            </text>
          </g>
        ))}
        {[0, 4, 8, 12, 16, 20, 24].map((hour) => {
          const time = hour === 24 ? dayEnd : dayStart.plus({ hours: hour })
          return (
            <g key={hour}>
              <line className="grid-line vertical" x1={x(time.toJSDate())} x2={x(time.toJSDate())} y1={padding.top} y2={height - padding.bottom} />
              <text className="axis-label" x={x(time.toJSDate())} y={height - 18} textAnchor="middle">
                {hour.toString().padStart(2, '0')}:00
              </text>
            </g>
          )
        })}
        <polyline className="altitude-line-glow" points={points} />
        <polyline className="altitude-line" points={points} />
        {markers.map(({ label, time, color }) => time && (
          <g key={label}>
            <line className="event-marker" style={{ stroke: color }} x1={x(time)} x2={x(time)} y1={padding.top} y2={height - padding.bottom} />
            <text className="marker-label" style={{ fill: color }} x={x(time) + 6} y={padding.top + 12}>{label}</text>
          </g>
        ))}
        {selectedIsToday && (
          <g>
            <line className="now-marker" x1={x(now)} x2={x(now)} y1={padding.top} y2={height - padding.bottom} />
            <circle className="now-dot" cx={x(now)} cy={y(samples.reduce((nearest, sample) =>
              Math.abs(sample.timestamp.getTime() - now.getTime()) < Math.abs(nearest.timestamp.getTime() - now.getTime()) ? sample : nearest,
            ).altitudeDeg)} r="5" />
            <text className="now-label" x={x(now) + 6} y={height - padding.bottom - 8}>Now</text>
          </g>
        )}
      </svg>
    </div>
  )
}
