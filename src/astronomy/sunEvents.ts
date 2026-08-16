import {
  Body,
  Observer,
  SearchAltitude,
  SearchHourAngle,
  SearchRiseSet,
  type AstroTime,
} from 'astronomy-engine'
import { DateTime } from 'luxon'
import type { Location, SunEvents } from './types'

function civilDay(location: Location, date: string) {
  const start = DateTime.fromISO(date, { zone: location.timezone }).startOf('day')
  if (!start.isValid) {
    throw new Error(`Invalid date or timezone: ${date} / ${location.timezone}`)
  }
  return { start, end: start.plus({ days: 1 }) }
}

function withinDay(event: AstroTime | null, startMs: number, endMs: number): Date | null {
  if (!event) return null
  const date = event.date
  return date.getTime() >= startMs && date.getTime() < endMs ? date : null
}

export function getSunEvents(location: Location, date: string): SunEvents {
  const { start, end } = civilDay(location, date)
  const startDate = start.toJSDate()
  const startMs = start.toMillis()
  const endMs = end.toMillis()
  const limitDays = (endMs - startMs) / 86_400_000 + 0.01
  const observer = new Observer(
    location.latitude,
    location.longitude,
    location.elevationMeters,
  )
  const altitudeEvent = (direction: 1 | -1, altitude: number) =>
    withinDay(
      SearchAltitude(Body.Sun, observer, direction, startDate, limitDays, altitude),
      startMs,
      endMs,
    )
  const riseSetEvent = (direction: 1 | -1) =>
    withinDay(
      SearchRiseSet(Body.Sun, observer, direction, startDate, limitDays, 0),
      startMs,
      endMs,
    )

  const sunrise = riseSetEvent(1)
  const sunset = riseSetEvent(-1)
  const solarNoon = withinDay(
    SearchHourAngle(Body.Sun, observer, 0, startDate, 1).time,
    startMs,
    endMs,
  )

  return {
    astronomicalDawn: altitudeEvent(1, -18),
    nauticalDawn: altitudeEvent(1, -12),
    civilDawn: altitudeEvent(1, -6),
    sunrise,
    solarNoon,
    sunset,
    civilDusk: altitudeEvent(-1, -6),
    nauticalDusk: altitudeEvent(-1, -12),
    astronomicalDusk: altitudeEvent(-1, -18),
    dayLengthSeconds:
      sunrise && sunset ? (sunset.getTime() - sunrise.getTime()) / 1000 : null,
  }
}
