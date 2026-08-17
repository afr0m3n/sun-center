import { useState, type PointerEvent } from 'react'

export interface AnnualSeries {
  label: string
  color: string
  values: Array<number | null>
}

export interface AnnualMarker {
  index: number
  label: string
  color: string
}

interface AnnualChartProps {
  title: string
  dates: string[]
  series: AnnualSeries[]
  markers: AnnualMarker[]
  selectedIndex: number
  formatValue: (value: number) => string
  zeroLine?: boolean
  highlightJumps?: boolean
}

const width = 1000
const height = 300
const padding = { top: 25, right: 30, bottom: 42, left: 70 }

export function AnnualChart({
  title,
  dates,
  series,
  markers,
  selectedIndex,
  formatValue,
  zeroLine = false,
  highlightJumps = false,
}: AnnualChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const allValues = series.flatMap((item) => item.values).filter((value): value is number => value !== null)
  const rawMin = Math.min(...allValues)
  const rawMax = Math.max(...allValues)
  const range = Math.max(rawMax - rawMin, 1)
  let minimum = rawMin - range * 0.08
  let maximum = rawMax + range * 0.08
  if (zeroLine) {
    const extent = Math.max(Math.abs(minimum), Math.abs(maximum))
    minimum = -extent
    maximum = extent
  }
  const plotWidth = width - padding.left - padding.right
  const plotHeight = height - padding.top - padding.bottom
  const x = (index: number) => padding.left + (index / Math.max(dates.length - 1, 1)) * plotWidth
  const y = (value: number) => padding.top + ((maximum - value) / (maximum - minimum)) * plotHeight
  const ticks = Array.from({ length: 5 }, (_, index) => minimum + ((maximum - minimum) * index) / 4)
  const activeIndex = hoveredIndex ?? selectedIndex
  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    const viewX = ((event.clientX - bounds.left) / bounds.width) * width
    setHoveredIndex(Math.max(0, Math.min(dates.length - 1, Math.round(((viewX - padding.left) / plotWidth) * (dates.length - 1)))))
  }

  return (
    <div className="annual-chart-wrap">
      <svg
        className="annual-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={title}
        onPointerMove={onPointerMove}
        onPointerLeave={() => setHoveredIndex(null)}
      >
        <title>{title}</title>
        {ticks.map((tick) => (
          <g key={tick}>
            <line className={zeroLine && Math.abs(tick) < (maximum - minimum) / 20 ? 'annual-zero-line' : 'grid-line'} x1={padding.left} x2={width - padding.right} y1={y(tick)} y2={y(tick)} />
            <text className="axis-label" x={padding.left - 10} y={y(tick) + 4} textAnchor="end">{formatValue(tick)}</text>
          </g>
        ))}
        {[0, 3, 6, 9].map((monthIndex) => {
          const prefix = `-${String(monthIndex + 1).padStart(2, '0')}-01`
          const index = dates.findIndex((date) => date.endsWith(prefix))
          return index >= 0 ? (
            <g key={prefix}>
              <line className="grid-line vertical" x1={x(index)} x2={x(index)} y1={padding.top} y2={height - padding.bottom} />
              <text className="axis-label" x={x(index)} y={height - 16} textAnchor="middle">{['JAN', 'APR', 'JUL', 'OCT'][monthIndex / 3]}</text>
            </g>
          ) : null
        })}
        {markers.map((marker) => (
          <g key={`${marker.label}-${marker.index}`}>
            <line className="season-marker" style={{ stroke: marker.color }} x1={x(marker.index)} x2={x(marker.index)} y1={padding.top} y2={height - padding.bottom} />
            <text className="season-label" style={{ fill: marker.color }} x={x(marker.index) + 4} y={padding.top + 11}>{marker.label}</text>
          </g>
        ))}
        {series.map((item) => {
          const points = item.values.map((value, index) => value === null ? null : `${x(index)},${y(value)}`)
          const segments: string[] = []
          let current: string[] = []
          points.forEach((point, index) => {
            const previous = index > 0 ? item.values[index - 1] : null
            const value = item.values[index]
            const jump = highlightJumps && previous !== null && value !== null && Math.abs(value - previous) > 1800
            if (!point || jump) {
              if (current.length > 1) segments.push(current.join(' '))
              current = point ? [point] : []
            } else current.push(point)
          })
          if (current.length > 1) segments.push(current.join(' '))
          return (
            <g key={item.label}>
              {segments.map((pointsValue, index) => <polyline key={index} className="annual-line" style={{ stroke: item.color }} points={pointsValue} />)}
              {highlightJumps && item.values.slice(1).map((value, index) => {
                const previous = item.values[index]
                return value !== null && previous !== null && Math.abs(value - previous) > 1800
                  ? <line key={index} className="dst-connector" style={{ stroke: item.color }} x1={x(index)} x2={x(index + 1)} y1={y(previous)} y2={y(value)} />
                  : null
              })}
            </g>
          )
        })}
        <line className="selected-date-marker" x1={x(activeIndex)} x2={x(activeIndex)} y1={padding.top} y2={height - padding.bottom} />
        {series.map((item) => {
          const value = item.values[activeIndex]
          return value === null ? null : <circle key={item.label} cx={x(activeIndex)} cy={y(value)} r="4" fill={item.color} />
        })}
        <g className="annual-tooltip" transform={`translate(${Math.min(x(activeIndex) + 10, width - 185)} ${padding.top + 12})`}>
          <rect width="175" height={28 + series.length * 18} rx="3" />
          <text x="10" y="17">{dates[activeIndex]}</text>
          {series.map((item, index) => <text key={item.label} x="10" y={36 + index * 18} fill={item.color}>{item.label}: {item.values[activeIndex] === null ? '—' : formatValue(item.values[activeIndex]!)}</text>)}
        </g>
      </svg>
      <div className="chart-legend">{series.map((item) => <span key={item.label}><i style={{ background: item.color }} />{item.label}</span>)}</div>
    </div>
  )
}
