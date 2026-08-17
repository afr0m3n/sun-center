import { DateTime } from 'luxon'
import { getDayProfile } from './dayProfile'
import { getSunEvents } from './sunEvents'
import { getSunPosition } from './sunPosition'
import type { DaySample, Location } from './types'
import { getSeasonEvents } from './yearStatistics'

export interface SkyPoint { x: number; y: number }
export interface SeasonalPathDates {
  springEquinox: string
  summerSolstice: string
  autumnEquinox: string
  winterSolstice: string
}

export function projectSkyPoint(altitudeDeg: number, azimuthDeg: number, radius: number, centerX: number, centerY: number): SkyPoint {
  const radialDistance = radius * (1 - Math.min(90, Math.max(0, altitudeDeg)) / 90)
  const azimuthRadians = azimuthDeg * Math.PI / 180
  const x = centerX + radialDistance * Math.sin(azimuthRadians)
  const y = centerY - radialDistance * Math.cos(azimuthRadians)
  return {
    x: Math.abs(x) < 1e-12 ? 0 : x,
    y: Math.abs(y) < 1e-12 ? 0 : y,
  }
}

export function createSunPath(location: Location, date: string, stepMinutes = 5): DaySample[] {
  const samples = getDayProfile(location, date, stepMinutes).filter((sample) => sample.altitudeDeg >= 0)
  const solarNoon = getSunEvents(location, date).solarNoon
  if (solarNoon) {
    const position = getSunPosition(location, solarNoon)
    if (position.altitudeDeg >= 0) {
      samples.push({ timestamp: solarNoon, altitudeDeg: position.altitudeDeg, azimuthDeg: position.azimuthDeg, altitudeRateDegPerMinute: 0 })
      samples.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
    }
  }
  return samples
}

export function nearestPathSampleIndex(path: DaySample[], instant: Date): number | null {
  if (path.length === 0) return null
  return path.reduce((best, point, index) => Math.abs(point.timestamp.getTime() - instant.getTime()) < Math.abs(path[best].timestamp.getTime() - instant.getTime()) ? index : best, 0)
}

export function getSeasonalPathDates(location: Location, year: number): SeasonalPathDates {
  const seasons = getSeasonEvents(location, year)
  const date = (instant: Date) => DateTime.fromJSDate(instant, { zone: location.timezone }).toISODate()!
  return {
    springEquinox: date(seasons.springEquinox),
    summerSolstice: date(seasons.summerSolstice),
    autumnEquinox: date(seasons.autumnEquinox),
    winterSolstice: date(seasons.winterSolstice),
  }
}
