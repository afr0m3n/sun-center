import { useEffect, useState } from 'react'
import type { CivilDayTimeline } from '../astronomy/civilTimeline'

export function chartViewWidth(viewportWidth: number) {
  return Math.max(400, Math.min(1000, viewportWidth - 60))
}

const plotFraction = (viewX: number, plotLeft: number, plotWidth: number) => Math.min(1, Math.max(0, (viewX - plotLeft) / plotWidth))

export function civilInstantFromPlotX(timeline: CivilDayTimeline, viewX: number, plotLeft: number, plotWidth: number): Date {
  const fraction = plotFraction(viewX, plotLeft, plotWidth)
  const duration = timeline.end.getTime() - timeline.start.getTime()
  return new Date(Math.min(timeline.end.getTime() - 1, timeline.start.getTime() + fraction * duration))
}

export function yearIndexFromPlotX(viewX: number, plotLeft: number, plotWidth: number, dateCount: number): number {
  return Math.round(plotFraction(viewX, plotLeft, plotWidth) * Math.max(0, dateCount - 1))
}

export function useChartViewWidth() {
  const [width, setWidth] = useState(() => chartViewWidth(typeof window === 'undefined' ? 1060 : window.innerWidth))

  useEffect(() => {
    const update = () => setWidth(chartViewWidth(window.innerWidth))
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  return width
}
