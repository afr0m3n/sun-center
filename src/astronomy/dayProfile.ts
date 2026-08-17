import { DateTime } from 'luxon'
import { getCivilDayBounds } from './civilTime'
import { getSunPosition } from './sunPosition'
import { getSunRate } from './sunRate'
import type { DaySample, HourlySummary, Location } from './types'

export function getDayProfile(
  location: Location,
  date: string,
  stepMinutes = 5,
): DaySample[] {
  if (!Number.isFinite(stepMinutes) || stepMinutes <= 0) {
    throw new Error('stepMinutes must be a positive number')
  }

  const { start, end } = getCivilDayBounds(location, date)
  const samples: DaySample[] = []
  const stepMs = stepMinutes * 60_000

  for (let timestamp = start.toMillis(); timestamp < end.toMillis(); timestamp += stepMs) {
    const instant = new Date(timestamp)
    const position = getSunPosition(location, instant)
    samples.push({
      timestamp: instant,
      altitudeDeg: position.altitudeDeg,
      azimuthDeg: position.azimuthDeg,
      altitudeRateDegPerMinute: getSunRate(location, instant).altitudeDegPerMinute,
    })
  }

  return samples
}

export function getHourlySummary(location: Location, date: string): HourlySummary[] {
  const { start, end } = getCivilDayBounds(location, date)
  const summary: HourlySummary[] = []
  let previousAltitude: number | null = null

  for (let timestamp = start.toMillis(); timestamp < end.toMillis(); timestamp += 3_600_000) {
    const instant = new Date(timestamp)
    const localTime = DateTime.fromMillis(timestamp, { zone: location.timezone })
    const altitudeDeg = getSunPosition(location, instant).altitudeDeg
    const delta = previousAltitude === null ? null : altitudeDeg - previousAltitude
    summary.push({
      timestamp: instant,
      hour: localTime.toFormat('HH:mm'),
      utcOffset: localTime.toFormat('ZZ'),
      altitudeDeg,
      deltaFromPreviousHour: delta,
      averageRateDegPerHour: delta,
    })
    previousAltitude = altitudeDeg
  }

  return summary
}
