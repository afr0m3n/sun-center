import { useMemo, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { DateTime } from 'luxon'
import { createSunPath, getSeasonalPathDates, nearestPathSampleIndex, projectSkyPoint } from '../astronomy/sunPath'
import { getSunEvents } from '../astronomy/sunEvents'
import { getSunPosition } from '../astronomy/sunPosition'
import type { DaySample, Location } from '../astronomy/types'

interface SunPathProps { location: Location; date: string; instant: Date; onInspect: (instant: Date) => void }
const size = 460
const center = size / 2
const radius = 190
const colors = { selected: '#ffcf62', summer: '#7ed9aa', winter: '#91b9e8' }

function polyline(points: DaySample[]) {
  return points.map((point) => { const projected = projectSkyPoint(point.altitudeDeg, point.azimuthDeg, radius, center, center); return `${projected.x},${projected.y}` }).join(' ')
}

export function SunPath({ location, date, instant, onInspect }: SunPathProps) {
  const [visible, setVisible] = useState({ selected: true, summer: false, winter: false })
  const [hovered, setHovered] = useState<DaySample | null>(null)
  const year = Number(date.slice(0, 4))
  const seasonalDates = useMemo(() => getSeasonalPathDates(location, year), [location, year])
  const paths = useMemo(() => ({
    selected: createSunPath(location, date),
    summer: createSunPath(location, seasonalDates.summerSolstice),
    winter: createSunPath(location, seasonalDates.winterSolstice),
  }), [location, date, seasonalDates])
  const pathLines = useMemo(() => ({ selected: polyline(paths.selected), summer: polyline(paths.summer), winter: polyline(paths.winter) }), [paths])
  const position = getSunPosition(location, instant)
  const marker = projectSkyPoint(Math.max(0, position.altitudeDeg), position.azimuthDeg, radius, center, center)
  const events = useMemo(() => getSunEvents(location, date), [location, date])
  const eventMarkers = [['Sunrise', events.sunrise], ['Solar noon', events.solarNoon], ['Sunset', events.sunset]] as const

  const nearest = (event: PointerEvent<SVGPolylineElement>) => {
    const svg = event.currentTarget.ownerSVGElement
    if (!svg) return null
    const point = svg.createSVGPoint(); point.x = event.clientX; point.y = event.clientY
    const matrix = svg.getScreenCTM()?.inverse()
    if (!matrix) return null
    const local = point.matrixTransform(matrix)
    return paths.selected.reduce((best, sample) => {
      const projected = projectSkyPoint(sample.altitudeDeg, sample.azimuthDeg, radius, center, center)
      const distance = Math.hypot(projected.x - local.x, projected.y - local.y)
      return !best || distance < best.distance ? { sample, distance } : best
    }, null as { sample: DaySample; distance: number } | null)
  }
  const move = (event: PointerEvent<SVGPolylineElement>) => setHovered(nearest(event)?.sample ?? null)
  const select = (event: PointerEvent<SVGPolylineElement>) => { const item = nearest(event); if (item && item.distance < 28) onInspect(item.sample.timestamp) }
  const keyboardSelect = (event: KeyboardEvent<SVGPolylineElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight' && event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    const closestIndex = nearestPathSampleIndex(paths.selected, instant)
    if (closestIndex === null) return
    const index = event.key === 'ArrowLeft' ? Math.max(0, closestIndex - 1) : event.key === 'ArrowRight' ? Math.min(paths.selected.length - 1, closestIndex + 1) : closestIndex
    onInspect(paths.selected[index].timestamp)
  }
  const tooltipPoint = hovered ? projectSkyPoint(hovered.altitudeDeg, hovered.azimuthDeg, radius, center, center) : null

  return <section className="panel sun-path-panel" aria-labelledby="sun-path-title">
    <div className="panel-heading"><div><span className="section-kicker">Polar visible hemisphere</span><h2 id="sun-path-title">Sun Path</h2></div><span className="chart-note">N ↑ · E →</span></div>
    <div className="path-layout">
      <svg className="sun-path" viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Solar path for ${date}`}>
        <title>Sky dome: horizon at the outer circle and zenith at center</title>
        {[0, 30, 60].map((altitude) => { const ringRadius = radius * (1 - altitude / 90); return <g key={altitude}><circle className="sky-ring" cx={center} cy={center} r={ringRadius} /><text className="sky-ring-label" x={center + 5} y={center - ringRadius + 14}>{altitude}°</text></g> })}
        <circle className="zenith-dot" cx={center} cy={center} r="2" /><text className="sky-ring-label" x={center + 6} y={center - 5}>90°</text>
        {(['N','NE','E','SE','S','SW','W','NW'] as const).map((label, index) => { const point = projectSkyPoint(0, index * 45, radius + 24, center, center); return <text key={label} className="compass-label" x={point.x} y={point.y + 4} textAnchor="middle">{label}</text> })}
        {visible.summer && <polyline className="sky-path reference" style={{ stroke: colors.summer }} points={pathLines.summer} />}
        {visible.winter && <polyline className="sky-path reference" style={{ stroke: colors.winter }} points={pathLines.winter} />}
        {visible.selected && <polyline className="sky-path selected" points={pathLines.selected} tabIndex={0} role="button" aria-label="Selected date solar path; use arrow keys or click to inspect" onPointerMove={move} onPointerLeave={() => setHovered(null)} onClick={select} onKeyDown={keyboardSelect} />}
        {eventMarkers.map(([label, event]) => event && (() => { const p = getSunPosition(location, event); const xy = projectSkyPoint(Math.max(0, p.altitudeDeg), p.azimuthDeg, radius, center, center); return <g key={label}><circle className={`path-event ${label.toLowerCase().replace(' ', '-')}`} cx={xy.x} cy={xy.y} r="4"><title>{label} · {DateTime.fromJSDate(event, { zone: location.timezone }).toFormat('HH:mm:ss')}</title></circle></g> })())}
        {position.altitudeDeg >= 0 ? <circle className="sun-path-marker" cx={marker.x} cy={marker.y} r="7" /> : <g className="below-marker"><circle cx={marker.x} cy={marker.y} r="8" /><path d={`M ${marker.x - 5} ${marker.y} L ${marker.x + 5} ${marker.y}`} /></g>}
        {tooltipPoint && hovered && <g className="path-tooltip" transform={`translate(${Math.min(size - 150, Math.max(8, tooltipPoint.x + 10))} ${Math.min(size - 55, Math.max(8, tooltipPoint.y - 50))})`}><rect width="142" height="45" rx="3"/><text x="7" y="17">{DateTime.fromJSDate(hovered.timestamp, { zone: location.timezone }).toFormat('HH:mm')}</text><text x="7" y="34">alt {hovered.altitudeDeg.toFixed(1)}° · az {hovered.azimuthDeg.toFixed(1)}°</text></g>}
      </svg>
      <div className="path-controls"><span className="section-kicker">Path overlays</span>{([
        ['selected', `Selected · ${date}`], ['summer', `Summer · ${seasonalDates.summerSolstice}`], ['winter', `Winter · ${seasonalDates.winterSolstice}`],
      ] as const).map(([key, label]) => <label key={key}><input type="checkbox" checked={visible[key]} onChange={() => setVisible((current) => ({ ...current, [key]: !current[key] }))} /><i style={{ background: colors[key] }} />{label}</label>)}
      <p>{position.altitudeDeg < 0 ? `Below horizon · azimuth edge indicator at ${position.azimuthDeg.toFixed(1)}°` : `Visible · altitude ${position.altitudeDeg.toFixed(1)}° · azimuth ${position.azimuthDeg.toFixed(1)}°`}</p></div>
    </div>
  </section>
}
