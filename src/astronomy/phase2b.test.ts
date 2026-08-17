import { Seasons } from 'astronomy-engine'
import { DateTime } from 'luxon'
import { describe, expect, it } from 'vitest'
import { civilTimelineElapsedSeconds, civilTimelineInstant, clampCivilTimelineInspectionInstant, createCivilDayTimeline, formatCivilTimelineInstant, timelineFraction } from './civilTimeline'
import { getSunEvents } from './sunEvents'
import { getSunPosition } from './sunPosition'
import { createSunPath, getSeasonalPathDates, nearestPathSampleIndex, projectSkyPoint } from './sunPath'
import type { Location } from './types'

const usti: Location = { name: 'Ústí nad Labem', latitude: 50.6724, longitude: 14.0706, elevationMeters: 0, timezone: 'Europe/Prague' }

describe('real civil-day timeline', () => {
  it('uses the elapsed duration between consecutive local midnights', () => {
    expect(createCivilDayTimeline(usti, '2026-03-29').durationSeconds).toBe(23 * 3600)
    expect(createCivilDayTimeline(usti, '2026-10-25').durationSeconds).toBe(25 * 3600)
    expect(createCivilDayTimeline(usti, '2026-08-16').durationSeconds).toBe(24 * 3600)
  })
  it('keeps both occurrences of the autumn repeated hour distinct', () => {
    const timeline = createCivilDayTimeline(usti, '2026-10-25')
    const first = civilTimelineInstant(timeline, 2.5 * 3600)
    const second = civilTimelineInstant(timeline, 3.5 * 3600)
    expect(first.getTime()).not.toBe(second.getTime())
    expect(formatCivilTimelineInstant(timeline, first)).toBe('02:30 UTC+02:00')
    expect(formatCivilTimelineInstant(timeline, second)).toBe('02:30 UTC+01:00')
    expect(civilTimelineElapsedSeconds(timeline, first)).toBe(2.5 * 3600)
    expect(civilTimelineElapsedSeconds(timeline, second)).toBe(3.5 * 3600)
  })
  it('roundtrips elapsed positions across both DST transitions', () => {
    for (const date of ['2026-03-29', '2026-10-25']) {
      const timeline = createCivilDayTimeline(usti, date)
      for (const elapsed of [0, 90 * 60, timeline.durationSeconds / 2, timeline.durationSeconds - 1]) {
        const instant = civilTimelineInstant(timeline, elapsed)
        expect(civilTimelineElapsedSeconds(timeline, instant)).toBeCloseTo(elapsed, 6)
      }
    }
  })
  it('clamps inspection controls inside the selected civil date', () => {
    const timeline = createCivilDayTimeline(usti, '2026-10-25')
    expect(clampCivilTimelineInspectionInstant(timeline, timeline.end).getTime()).toBe(timeline.end.getTime() - 1000)
    expect(clampCivilTimelineInspectionInstant(timeline, new Date(timeline.start.getTime() - 60_000))).toEqual(timeline.start)
  })

  it('maps astronomical events by absolute elapsed position', () => {
    const timeline = createCivilDayTimeline(usti, '2026-03-29')
    const sunrise = getSunEvents(usti, timeline.date).sunrise!
    const expected = (sunrise.getTime() - timeline.start.getTime()) / (timeline.end.getTime() - timeline.start.getTime())
    expect(timelineFraction(timeline, sunrise)).toBeCloseTo(expected, 12)
    expect(civilTimelineInstant(timeline, civilTimelineElapsedSeconds(timeline, sunrise))).toEqual(sunrise)
  })
})

describe('polar sky-dome projection', () => {
  it('orients compass azimuths north, east, south, and west', () => {
    expect(projectSkyPoint(0, 0, 100, 100, 100)).toEqual({ x: 100, y: 0 })
    expect(projectSkyPoint(0, 90, 100, 100, 100)).toEqual({ x: 200, y: 100 })
    expect(projectSkyPoint(0, 180, 100, 100, 100).x).toBeCloseTo(100, 10)
    expect(projectSkyPoint(0, 180, 100, 100, 100).y).toBeCloseTo(200, 10)
    expect(projectSkyPoint(0, 270, 100, 100, 100).x).toBeCloseTo(0, 10)
    expect(projectSkyPoint(0, 270, 100, 100, 100).y).toBeCloseTo(100, 10)
  })
  it('maps the zenith to center and horizon to the outer radius', () => {
    expect(projectSkyPoint(90, 127, 80, 120, 130)).toEqual({ x: 120, y: 130 })
    const horizon = projectSkyPoint(0, 42, 80, 120, 130)
    expect(Math.hypot(horizon.x - 120, horizon.y - 130)).toBeCloseTo(80, 10)
  })
  it('builds a physical path whose solar-noon point is above rise and set', () => {
    const path = createSunPath(usti, '2026-08-16')
    const events = getSunEvents(usti, '2026-08-16')
    const noonAltitude = getSunPosition(usti, events.solarNoon!).altitudeDeg
    const riseAltitude = getSunPosition(usti, events.sunrise!).altitudeDeg
    const setAltitude = getSunPosition(usti, events.sunset!).altitudeDeg
    expect(path.every((point) => point.altitudeDeg >= 0)).toBe(true)
    expect(noonAltitude).toBeGreaterThan(riseAltitude)
    expect(noonAltitude).toBeGreaterThan(setAltitude)
  })
  it('shows a higher summer path than winter at Ústí nad Labem', () => {
    const dates = getSeasonalPathDates(usti, 2026)
    const summerMax = Math.max(...createSunPath(usti, dates.summerSolstice).map((point) => point.altitudeDeg))
    const winterMax = Math.max(...createSunPath(usti, dates.winterSolstice).map((point) => point.altitudeDeg))
    expect(summerMax).toBeGreaterThan(winterMax + 40)
  })
  it('keeps an inspected marker tied to getSunPosition at its exact instant', () => {
    const instant = new Date('2026-08-16T09:37:12.345Z')
    const position = getSunPosition(usti, instant)
    expect(projectSkyPoint(position.altitudeDeg, position.azimuthDeg, 150, 160, 160)).toEqual(projectSkyPoint(getSunPosition(usti, instant).altitudeDeg, getSunPosition(usti, instant).azimuthDeg, 150, 160, 160))
  })
  it('handles keyboard path selection when no visible path exists', () => {
    expect(nearestPathSampleIndex([], new Date())).toBeNull()
  })

  it('derives seasonal overlay dates from Astronomy Engine season instants', () => {
    const dates = getSeasonalPathDates(usti, 2026)
    const seasons = Seasons(2026)
    const localDate = (instant: Date) => DateTime.fromJSDate(instant, { zone: usti.timezone }).toISODate()
    expect(dates).toEqual({ springEquinox: localDate(seasons.mar_equinox.date), summerSolstice: localDate(seasons.jun_solstice.date), autumnEquinox: localDate(seasons.sep_equinox.date), winterSolstice: localDate(seasons.dec_solstice.date) })
  })
})
