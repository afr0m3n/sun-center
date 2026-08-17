import { Seasons } from 'astronomy-engine'
import { DateTime } from 'luxon'
import { beforeAll, describe, expect, it } from 'vitest'
import { getAltitudeCrossings } from './altitudeCrossings'
import { getCompareData } from './compareData'
import { formatSignedDuration, formatSignedRate } from './formatting'
import { getSunEvents } from './sunEvents'
import { getSunPosition } from './sunPosition'
import type { Location, YearSolarStatistics } from './types'
import { getSeasonEvents, getYearSolarStatistics } from './yearStatistics'

const usti: Location = {
  id: 'test-usti',
  name: 'Ústí nad Labem',
  latitude: 50.6724,
  longitude: 14.0706,
  elevationMeters: 0,
  timezone: 'Europe/Prague',
}

const byDate = (year: YearSolarStatistics, date: string) => {
  const day = year.days.find((candidate) => candidate.date === date)
  if (!day) throw new Error(`Missing yearly data for ${date}`)
  return day
}

describe('year solar statistics', () => {
  let year2026: YearSolarStatistics
  let leap2024: YearSolarStatistics

  beforeAll(() => {
    year2026 = getYearSolarStatistics(usti, 2026)
    leap2024 = getYearSolarStatistics(usti, 2024)
  })

  it('contains every local civil date in normal and leap years', () => {
    expect(year2026.days).toHaveLength(365)
    expect(year2026.days[0].date).toBe('2026-01-01')
    expect(year2026.days.at(-1)?.date).toBe('2026-12-31')
    expect(leap2024.days).toHaveLength(366)
    expect(leap2024.days.some((day) => day.date === '2024-02-29')).toBe(true)
  })

  it('shows longer daylight and a higher maximum altitude in June than December', () => {
    const june = byDate(year2026, '2026-06-15')
    const december = byDate(year2026, '2026-12-15')

    expect(june.dayLengthSeconds).toBeGreaterThan(december.dayLengthSeconds!)
    expect(june.maximumSolarAltitudeDeg).toBeGreaterThan(december.maximumSolarAltitudeDeg!)
  })

  it('has the correct daylight-change sign in spring and autumn', () => {
    expect(byDate(year2026, '2026-03-15').dayLengthChangeSeconds).toBeGreaterThan(0)
    expect(byDate(year2026, '2026-10-15').dayLengthChangeSeconds).toBeLessThan(0)
  })

  it('has near-zero daylight change around calculated solstices', () => {
    const summerDate = DateTime.fromJSDate(year2026.seasons.summerSolstice, { zone: usti.timezone }).toISODate()!
    const winterDate = DateTime.fromJSDate(year2026.seasons.winterSolstice, { zone: usti.timezone }).toISODate()!

    expect(Math.abs(byDate(year2026, summerDate).dayLengthChangeSeconds!)).toBeLessThan(20)
    expect(Math.abs(byDate(year2026, winterDate).dayLengthChangeSeconds!)).toBeLessThan(20)
  })

  it('reports local-clock and absolute solar event shifts separately across DST', () => {
    const transition = byDate(year2026, '2026-03-29')

    expect(transition.sunriseChangeSeconds!.localClock).toBeGreaterThan(3_000)
    expect(Math.abs(transition.sunriseChangeSeconds!.absoluteSolar)).toBeLessThan(600)
    expect(transition.sunriseChangeSeconds!.localClock - transition.sunriseChangeSeconds!.absoluteSolar).toBeCloseTo(3_600, 0)
    expect(transition.sunsetChangeSeconds!.localClock - transition.sunsetChangeSeconds!.absoluteSolar).toBeCloseTo(3_600, 0)
  })

  it('uses Astronomy Engine season instants rather than fixed calendar dates', () => {
    const seasons = getSeasonEvents(usti, 2026)
    const engine = Seasons(2026)

    expect(seasons.springEquinox).toEqual(engine.mar_equinox.date)
    expect(seasons.summerSolstice).toEqual(engine.jun_solstice.date)
    expect(seasons.autumnEquinox).toEqual(engine.sep_equinox.date)
    expect(seasons.winterSolstice).toEqual(engine.dec_solstice.date)
  })

  it('exposes seasonal context relative to calculated turning points', () => {
    const august = byDate(year2026, '2026-08-16')

    expect(august.seasonalContext.daylightFromSummerSolsticeSeconds).toBeLessThan(0)
    expect(august.seasonalContext.daylightFromWinterSolsticeSeconds).toBeGreaterThan(0)
    expect(august.seasonalContext.previousEquinox).toBe('spring')
  })

  it('selects the chronologically previous equinox in the southern hemisphere', () => {
    const sydney: Location = { ...usti, name: 'Sydney', latitude: -33.8688, longitude: 151.2093, timezone: 'Australia/Sydney' }
    const year = getYearSolarStatistics(sydney, 2026)

    expect(byDate(year, '2026-02-01').seasonalContext.previousEquinox).toBe('spring')
    expect(byDate(year, '2026-07-01').seasonalContext.previousEquinox).toBe('autumn')
    expect(byDate(year, '2026-10-01').seasonalContext.previousEquinox).toBe('spring')
  })

  it('retains a complete polar year when daylight extrema are unavailable', () => {
    const northPole: Location = { ...usti, name: 'North Pole', latitude: 90, longitude: 0, timezone: 'UTC' }
    const year = getYearSolarStatistics(northPole, 2026)

    expect(year.days).toHaveLength(365)
    expect(year.longestDay).toBeNull()
    expect(year.shortestDay).toBeNull()
  })
})

describe('apparent altitude threshold crossings', () => {
  it('returns a rising crossing before a descending crossing with refined precision', () => {
    const crossings = getAltitudeCrossings(usti, '2026-08-16', 40)

    expect(crossings.rising).not.toBeNull()
    expect(crossings.descending).not.toBeNull()
    expect(crossings.rising!.getTime()).toBeLessThan(crossings.descending!.getTime())
    expect(Math.abs(getSunPosition(usti, crossings.rising!).altitudeDeg - 40)).toBeLessThan(0.002)
    expect(Math.abs(getSunPosition(usti, crossings.descending!).altitudeDeg - 40)).toBeLessThan(0.002)
    expect([
      crossings.rising!.getTime() % 300_000,
      crossings.descending!.getTime() % 300_000,
    ].some((remainder) => remainder > 1_000 && remainder < 299_000)).toBe(true)
  })

  it('returns null crossings for an unreachable altitude', () => {
    expect(getAltitudeCrossings(usti, '2026-08-16', 90)).toEqual({
      altitudeDeg: 90,
      rising: null,
      descending: null,
    })
  })

  it('supports negative thresholds and polar days without crossings', () => {
    const twilight = getAltitudeCrossings(usti, '2026-08-16', -6)
    const tromso: Location = { ...usti, name: 'Tromsø', latitude: 69.6492, longitude: 18.9553, timezone: 'Europe/Oslo' }

    expect(twilight.rising).not.toBeNull()
    expect(twilight.descending).not.toBeNull()
    expect(getAltitudeCrossings(tromso, '2026-06-21', 0)).toEqual({ altitudeDeg: 0, rising: null, descending: null })
    expect(getAltitudeCrossings(tromso, '2026-12-21', 0)).toEqual({ altitudeDeg: 0, rising: null, descending: null })
  })

  it('resolves two close crossings near the daily maximum', () => {
    const crossings = getAltitudeCrossings(usti, '2026-08-16', 52.98)

    expect(crossings.rising).not.toBeNull()
    expect(crossings.descending).not.toBeNull()
    expect(crossings.descending!.getTime() - crossings.rising!.getTime()).toBeLessThan(30 * 60_000)
  })

  it('does not assume meridian transit is the exact apparent-altitude maximum', () => {
    const highLatitude: Location = { ...usti, name: 'High latitude', latitude: 80, longitude: 0, timezone: 'UTC' }
    const transit = getSunEvents(highLatitude, '2026-03-20').solarNoon!
    let maximum = getSunPosition(highLatitude, transit)
    for (let offsetSeconds = -7_200; offsetSeconds <= 7_200; offsetSeconds += 5) {
      const candidate = getSunPosition(highLatitude, new Date(transit.getTime() + offsetSeconds * 1000))
      if (candidate.altitudeDeg > maximum.altitudeDeg) maximum = candidate
    }
    const transitAltitude = getSunPosition(highLatitude, transit).altitudeDeg
    const threshold = (transitAltitude + maximum.altitudeDeg) / 2
    const crossings = getAltitudeCrossings(highLatitude, '2026-03-20', threshold)

    expect(maximum.altitudeDeg).toBeGreaterThan(transitAltitude)
    expect(crossings.rising).not.toBeNull()
    expect(crossings.descending).not.toBeNull()
    expect(crossings.rising!.getTime()).toBeLessThan(crossings.descending!.getTime())
  })
})

describe('signed seasonal formatting', () => {
  it('preserves signs and seconds without rounding away detail', () => {
    expect(formatSignedDuration(-3 * 60 - 18)).toBe('−3m 18s')
    expect(formatSignedDuration(60 * 60 + 42 * 60)).toBe('+1h 42m')
    expect(formatSignedRate(-131)).toBe('−2m 11s/day')
  })
})

describe('compare data', () => {
  it('preserves requested local dates, timezone, and unequal DST day lengths', () => {
    const compared = getCompareData(usti, ['2026-03-29', '2026-10-25'])

    expect(compared.map((day) => day.date)).toEqual(['2026-03-29', '2026-10-25'])
    expect(compared.every((day) => day.timezone === 'Europe/Prague')).toBe(true)
    expect(compared.map((day) => day.civilDayDurationSeconds)).toEqual([23 * 3600, 25 * 3600])
    expect(compared[0].profile).toHaveLength(276)
    expect(compared[1].profile).toHaveLength(300)
  })

  it('rejects compare selections outside the supported 2-to-4 date range', () => {
    expect(() => getCompareData(usti, ['2026-01-01'])).toThrow(/2 to 4/)
    expect(() => getCompareData(usti, ['2026-01-01', '2026-02-01', '2026-03-01', '2026-04-01', '2026-05-01'])).toThrow(/2 to 4/)
  })
})
