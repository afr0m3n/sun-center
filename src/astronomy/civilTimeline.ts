import { DateTime } from 'luxon'
import { getCivilDayBounds } from './civilTime'
import type { Location } from './types'

export interface CivilDayTimeline {
  date: string
  timezone: string
  start: Date
  end: Date
  durationSeconds: number
}

export function createCivilDayTimeline(location: Location, date: string): CivilDayTimeline {
  const { start, end } = getCivilDayBounds(location, date)
  return {
    date,
    timezone: location.timezone,
    start: start.toJSDate(),
    end: end.toJSDate(),
    durationSeconds: (end.toMillis() - start.toMillis()) / 1000,
  }
}

export function civilTimelineInstant(timeline: CivilDayTimeline, elapsedSeconds: number): Date {
  const clamped = Math.min(timeline.durationSeconds, Math.max(0, elapsedSeconds))
  return new Date(timeline.start.getTime() + clamped * 1000)
}

export function civilTimelineElapsedSeconds(timeline: CivilDayTimeline, instant: Date): number {
  return Math.min(timeline.durationSeconds, Math.max(0, (instant.getTime() - timeline.start.getTime()) / 1000))
}

export function clampCivilTimelineInspectionInstant(timeline: CivilDayTimeline, instant: Date): Date {
  const minimum = timeline.start.getTime()
  const maximum = timeline.end.getTime() - 1_000
  return new Date(Math.min(maximum, Math.max(minimum, instant.getTime())))
}

export function timelineFraction(timeline: CivilDayTimeline, instant: Date): number {
  return civilTimelineElapsedSeconds(timeline, instant) / timeline.durationSeconds
}

function isAmbiguousWallTime(timeline: CivilDayTimeline, instant: Date): boolean {
  const local = DateTime.fromJSDate(instant, { zone: timeline.timezone })
  const signature = local.toFormat('yyyy-LL-dd HH:mm')
  for (const deltaMinutes of [-180, -120, -90, -60, -30, 30, 60, 90, 120, 180]) {
    const candidate = DateTime.fromMillis(instant.getTime() + deltaMinutes * 60_000, { zone: timeline.timezone })
    if (candidate.toFormat('yyyy-LL-dd HH:mm') === signature && candidate.offset !== local.offset) return true
  }
  return false
}

export function formatCivilTimelineInstant(timeline: CivilDayTimeline, instant: Date, includeSeconds = false): string {
  const local = DateTime.fromJSDate(instant, { zone: timeline.timezone })
  const clock = local.toFormat(includeSeconds ? 'HH:mm:ss' : 'HH:mm')
  return isAmbiguousWallTime(timeline, instant) ? `${clock} UTC${local.toFormat('ZZ')}` : clock
}
