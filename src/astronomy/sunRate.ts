import { getSunPosition } from './sunPosition'
import type { Location, SunRate } from './types'

const HALF_MINUTE_MS = 30_000

export function shortestAngularDifference(fromDeg: number, toDeg: number): number {
  return ((toDeg - fromDeg + 540) % 360) - 180
}

export function getSunRate(location: Location, instant: Date): SunRate {
  const before = getSunPosition(location, new Date(instant.getTime() - HALF_MINUTE_MS))
  const after = getSunPosition(location, new Date(instant.getTime() + HALF_MINUTE_MS))

  return {
    altitudeDegPerMinute: after.altitudeDeg - before.altitudeDeg,
    azimuthDegPerMinute: shortestAngularDifference(before.azimuthDeg, after.azimuthDeg),
  }
}
