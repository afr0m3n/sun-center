import { getCivilDayBounds } from './civilTime'
import { getSunPosition } from './sunPosition'
import type { AltitudeCrossings, Location } from './types'

const BRACKET_STEP_MS = 10 * 60_000
const TARGET_TIME_PRECISION_MS = 500

function apparentAltitude(location: Location, timestamp: number) {
  return getSunPosition(location, new Date(timestamp)).altitudeDeg
}

function altitudeDifference(location: Location, timestamp: number, altitudeDeg: number) {
  return apparentAltitude(location, timestamp) - altitudeDeg
}

function refineMaximum(
  location: Location,
  timestamps: number[],
): number {
  let bestIndex = 0
  let bestAltitude = -Infinity
  timestamps.forEach((timestamp, index) => {
    const altitude = apparentAltitude(location, timestamp)
    if (altitude > bestAltitude) {
      bestAltitude = altitude
      bestIndex = index
    }
  })

  let low = timestamps[Math.max(0, bestIndex - 1)]
  let high = timestamps[Math.min(timestamps.length - 1, bestIndex + 1)]
  while (high - low > TARGET_TIME_PRECISION_MS / 2) {
    const first = low + (high - low) / 3
    const second = high - (high - low) / 3
    if (apparentAltitude(location, first) < apparentAltitude(location, second)) low = first
    else high = second
  }
  return Math.round((low + high) / 2)
}

function refineCrossing(
  location: Location,
  altitudeDeg: number,
  startMs: number,
  endMs: number,
): Date {
  let low = startMs
  let high = endMs
  let lowValue = altitudeDifference(location, low, altitudeDeg)

  while (high - low > TARGET_TIME_PRECISION_MS) {
    const middle = (low + high) / 2
    const middleValue = altitudeDifference(location, middle, altitudeDeg)
    if ((lowValue <= 0 && middleValue >= 0) || (lowValue >= 0 && middleValue <= 0)) {
      high = middle
    } else {
      low = middle
      lowValue = middleValue
    }
  }

  return new Date(Math.round((low + high) / 2))
}

/**
 * Finds crossings of apparent topocentric solar altitude within one local civil day.
 * Ten-minute samples only bracket roots. The daily altitude maximum is independently
 * refined, inserted into the brackets, and each root is bisected to within 0.5 s.
 */
export function getAltitudeCrossings(
  location: Location,
  date: string,
  altitudeDeg: number,
): AltitudeCrossings {
  if (!Number.isFinite(altitudeDeg) || altitudeDeg < -90 || altitudeDeg > 90) {
    throw new Error('altitudeDeg must be a finite angle from -90 to 90')
  }

  const { start, end } = getCivilDayBounds(location, date)
  const startMs = start.toMillis()
  const endMs = end.toMillis()
  const coarseTimestamps: number[] = []
  for (let time = startMs; time < endMs; time += BRACKET_STEP_MS) coarseTimestamps.push(time)
  coarseTimestamps.push(endMs - 1)
  const maximumMs = refineMaximum(location, coarseTimestamps)
  const timestamps = [...new Set([...coarseTimestamps, maximumMs])].sort((left, right) => left - right)

  let rising: Date | null = null
  let descending: Date | null = null
  let previousMs = timestamps[0]
  let previousValue = altitudeDifference(location, previousMs, altitudeDeg)

  for (const timestamp of timestamps.slice(1)) {
    const value = altitudeDifference(location, timestamp, altitudeDeg)
    const crosses = previousValue === 0 || value === 0 || previousValue * value < 0
    if (crosses) {
      const crossing = refineCrossing(location, altitudeDeg, previousMs, timestamp)
      if (value > previousValue && !rising) rising = crossing
      if (value < previousValue && !descending) descending = crossing
    }
    previousMs = timestamp
    previousValue = value
  }

  if (!rising && !descending) {
    const maximumDifference = Math.abs(altitudeDifference(location, maximumMs, altitudeDeg))
    if (maximumDifference < 0.000_01) {
      rising = new Date(maximumMs)
      descending = new Date(maximumMs)
    }
  }

  return { altitudeDeg, rising, descending }
}
