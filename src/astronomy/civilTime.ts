import { DateTime } from 'luxon'
import type { Location } from './types'

export function getCivilDayBounds(location: Location, date: string) {
  const start = DateTime.fromISO(date, { zone: location.timezone }).startOf('day')
  if (!start.isValid || start.toISODate() !== date) {
    throw new Error(`Invalid date or timezone: ${date} / ${location.timezone}`)
  }
  return { start, end: start.plus({ days: 1 }) }
}

export function localClockSeconds(instant: Date, timezone: string): number {
  const local = DateTime.fromJSDate(instant, { zone: timezone })
  return local.hour * 3600 + local.minute * 60 + local.second + local.millisecond / 1000
}
