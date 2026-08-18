import { DateTime } from 'luxon'
import type { KeyboardEvent, PointerEvent } from 'react'
import { getSunPosition } from '../astronomy/sunPosition'
import type { DaySample, Location, SunEvents } from '../astronomy/types'
import { useChartViewWidth } from './useCompactChartLayout'

interface AltitudeChartProps { location: Location; date: string; samples: DaySample[]; events: SunEvents; instant: Date; onInspect: (instant: Date) => void }
export function AltitudeChart({ location, date, samples, events, instant, onInspect }: AltitudeChartProps) {
  const width = useChartViewWidth()
  const restrained = width < 600
  const height = Math.round(250 + ((width - 400) / 600) * 110)
  const padding = restrained
    ? { top: 24, right: 16, bottom: 42, left: 50 }
    : { top: 28, right: 24, bottom: 48, left: 56 }
  const dayStart = DateTime.fromISO(date, { zone: location.timezone }).startOf('day')
  const dayEnd = dayStart.plus({ days: 1 })
  const minAltitude = Math.min(-24, Math.floor(Math.min(...samples.map((sample) => sample.altitudeDeg)) / 10) * 10)
  const maxAltitude = Math.max(30, Math.ceil(Math.max(...samples.map((sample) => sample.altitudeDeg)) / 10) * 10)
  const plotWidth = width - padding.left - padding.right
  const plotHeight = height - padding.top - padding.bottom
  const x = (value: Date) => padding.left + ((value.getTime() - dayStart.toMillis()) / (dayEnd.toMillis() - dayStart.toMillis())) * plotWidth
  const y = (altitude: number) => padding.top + ((maxAltitude - altitude) / (maxAltitude - minAltitude)) * plotHeight
  const points = samples.map((sample) => `${x(sample.timestamp)},${y(sample.altitudeDeg)}`).join(' ')
  const inspectedPosition = getSunPosition(location, instant)
  const markers = [{ label: 'Sunrise', time: events.sunrise, color: 'var(--series-sunrise)' }, { label: 'Solar noon', time: events.solarNoon, color: 'var(--series-noon)' }, { label: 'Sunset', time: events.sunset, color: 'var(--series-sunset)' }]
  const inspectFromPointer = (event: PointerEvent<SVGSVGElement>) => {
    const point = event.currentTarget.createSVGPoint(); point.x = event.clientX; point.y = event.clientY
    const matrix = event.currentTarget.getScreenCTM()?.inverse(); if (!matrix) return
    const local = point.matrixTransform(matrix)
    const fraction = Math.min(1, Math.max(0, (local.x - padding.left) / plotWidth))
    onInspect(new Date(dayStart.toMillis() + fraction * (dayEnd.toMillis() - dayStart.toMillis())))
  }
  const inspectFromKeyboard = (event: KeyboardEvent<SVGSVGElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const startMs = dayStart.toMillis()
    const endMs = dayEnd.toMillis() - 1_000
    const target = event.key === 'Home' ? startMs : event.key === 'End' ? endMs : instant.getTime() + (event.key === 'ArrowLeft' ? -600_000 : 600_000)
    onInspect(new Date(Math.min(endMs, Math.max(startMs, target))))
  }
  return <div className="chart-scroll" aria-label={`Solar altitude chart for ${date}`}><svg className="altitude-chart" viewBox={`0 0 ${width} ${height}`} role="button" aria-label="Solar altitude graph; click or use left and right arrows to inspect" tabIndex={0} onPointerDown={inspectFromPointer} onKeyDown={inspectFromKeyboard}>
    <title>Solar altitude throughout the selected local day; click to inspect</title><defs><linearGradient id="sun-line" x1="0" x2="1"><stop offset="0" stopColor="var(--series-sunset)"/><stop offset="0.5" stopColor="var(--series-maximum)"/><stop offset="1" stopColor="var(--series-sunset)"/></linearGradient></defs>
    {[minAltitude, 0, 30, 60].filter((tick) => tick <= maxAltitude && tick >= minAltitude).map((tick) => <g key={tick}><line className={tick === 0 ? 'horizon-line' : 'grid-line'} x1={padding.left} x2={width - padding.right} y1={y(tick)} y2={y(tick)}/><text className="axis-label" x={padding.left - 12} y={y(tick) + 4} textAnchor="end">{tick}°</text></g>)}
    {(restrained ? [0, .5, 1] : [0, .25, .5, .75, 1]).map((fraction) => { const time = DateTime.fromMillis(dayStart.toMillis() + fraction * (dayEnd.toMillis() - dayStart.toMillis()), { zone: location.timezone }); return <g key={fraction}><line className="grid-line vertical" x1={x(time.toJSDate())} x2={x(time.toJSDate())} y1={padding.top} y2={height - padding.bottom}/><text className="axis-label" x={x(time.toJSDate())} y={height - 15} textAnchor="middle">{fraction === 1 ? '24:00' : time.toFormat('HH:mm')}</text></g> })}
    <polyline className="altitude-line-glow" points={points}/><polyline className="altitude-line" points={points}/>
    {markers.map(({ label, time, color }) => time && <g key={label}><line className="event-marker" style={{ stroke: color }} x1={x(time)} x2={x(time)} y1={padding.top} y2={height - padding.bottom}/><text className="marker-label" style={{ fill: color }} x={x(time) + 6} y={padding.top + 12}>{label}</text></g>)}
    <g pointerEvents="none"><line className="now-marker" x1={x(instant)} x2={x(instant)} y1={padding.top} y2={height - padding.bottom}/><circle className="now-dot" cx={x(instant)} cy={y(inspectedPosition.altitudeDeg)} r="5"/><text className="now-label" x={x(instant) + 6} y={height - padding.bottom - 8}>Selected</text></g>
  </svg></div>
}
