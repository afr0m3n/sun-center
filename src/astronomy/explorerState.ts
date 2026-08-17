import { createCivilDayTimeline, type CivilDayTimeline } from './civilTimeline'
import type { Location } from './types'

export type InspectDayTransition = {
  view: 'today'
  timeMode: 'inspect'
  selectedDate: string
  inspectedInstant: Date
}

export function inspectionInstantForDay(timeline: CivilDayTimeline, solarNoon: Date | null): Date {
  if (solarNoon && solarNoon.getTime() >= timeline.start.getTime() && solarNoon.getTime() < timeline.end.getTime()) {
    return solarNoon
  }
  return new Date((timeline.start.getTime() + timeline.end.getTime()) / 2)
}

export function createInspectDayTransition(location: Location, date: string, solarNoon: Date | null): InspectDayTransition {
  const timeline = createCivilDayTimeline(location, date)
  return {
    view: 'today',
    timeMode: 'inspect',
    selectedDate: date,
    inspectedInstant: inspectionInstantForDay(timeline, solarNoon),
  }
}

export function yearDateIndex(dates: string[], selectedDate: string): number {
  return Math.max(0, dates.indexOf(selectedDate))
}

export function yearDateAtIndex(dates: string[], index: number): string {
  return dates[Math.min(Math.max(0, index), dates.length - 1)]
}