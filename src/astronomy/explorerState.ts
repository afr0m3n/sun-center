import { DateTime } from 'luxon'
import { createCivilDayTimeline, type CivilDayTimeline } from './civilTimeline'
import type { Location } from './types'

export type InspectDayTransition = {
  view: 'today'
  timeMode: 'inspect'
  selectedDate: string
  inspectedInstant: Date
}

export type WallClockScrubSession = Readonly<{
  sourceInstant: Date
}>

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

function wallMillis(value: DateTime): number {
  return Date.UTC(value.year, value.month - 1, value.day, value.hour, value.minute, value.second, value.millisecond)
}

/** Maps an inspected local wall clock onto another local date without collapsing DST folds. */
export function preserveWallClockOnDate(location: Location, sourceInstant: Date, targetDate: string, sourceTimezone = location.timezone): Date {
  const source = DateTime.fromJSDate(sourceInstant, { zone: sourceTimezone })
  const targetDay = createCivilDayTimeline(location, targetDate)
  const targetParts = DateTime.fromISO(targetDate, { zone: location.timezone })
  if (!source.isValid || !targetParts.isValid) throw new Error(`Invalid wall-clock mapping: ${targetDate} / ${location.timezone}`)

  const desiredWallMillis = Date.UTC(
    targetParts.year,
    targetParts.month - 1,
    targetParts.day,
    source.hour,
    source.minute,
    source.second,
    source.millisecond,
  )
  const offsets = new Set<number>()
  for (let instant = targetDay.start.getTime() - 43_200_000; instant <= targetDay.end.getTime() + 43_200_000; instant += 3_600_000) {
    offsets.add(DateTime.fromMillis(instant, { zone: location.timezone }).offset)
  }
  const candidates = [...offsets]
    .map((offset) => new Date(desiredWallMillis - offset * 60_000))
    .filter((instant) => {
      const local = DateTime.fromJSDate(instant, { zone: location.timezone })
      return wallMillis(local) === desiredWallMillis && local.toISODate() === targetDate
    })
    .sort((left, right) => left.getTime() - right.getTime())
  if (candidates.length > 0) {
    return candidates.find((instant) => DateTime.fromJSDate(instant, { zone: location.timezone }).offset === source.offset) ?? candidates[0]
  }

  // A missing wall time can only occur in a forward offset transition. Find its
  // exact first valid physical instant and clamp every requested time in the gap.
  let previousTime = targetDay.start.getTime()
  let previousOffset = DateTime.fromMillis(previousTime, { zone: location.timezone }).offset
  for (let probe = previousTime + 900_000; probe <= targetDay.end.getTime(); probe += 900_000) {
    const probeOffset = DateTime.fromMillis(probe, { zone: location.timezone }).offset
    if (probeOffset > previousOffset) {
      let low = previousTime
      let high = probe
      while (high - low > 1) {
        const middle = Math.floor((low + high) / 2)
        if (DateTime.fromMillis(middle, { zone: location.timezone }).offset === previousOffset) low = middle
        else high = middle
      }
      const before = DateTime.fromMillis(high - 1, { zone: location.timezone })
      const after = DateTime.fromMillis(high, { zone: location.timezone })
      if (desiredWallMillis > wallMillis(before) && desiredWallMillis < wallMillis(after)) return new Date(high)
    }
    previousTime = probe
    previousOffset = probeOffset
  }
  throw new Error(`Unable to resolve local wall time on ${targetDate} / ${location.timezone}`)
}

export function createWallClockScrubSession(sourceInstant: Date): WallClockScrubSession {
  return { sourceInstant: new Date(sourceInstant.getTime()) }
}

export function preserveWallClockInScrubSession(location: Location, session: WallClockScrubSession, targetDate: string): Date {
  return preserveWallClockOnDate(location, session.sourceInstant, targetDate)
}