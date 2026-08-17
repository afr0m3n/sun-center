import { DateTime } from 'luxon'
import { describe, expect, it } from 'vitest'
import { createCivilDayTimeline, getCivilTimelineRangeState } from './civilTimeline'
import { createInspectDayTransition, inspectionInstantForDay, yearDateAtIndex, yearDateIndex } from './explorerState'
import type { Location } from './types'

const prague: Location = {
  id: 'test-prague',
  name: 'Prague',
  latitude: 50.0755,
  longitude: 14.4378,
  elevationMeters: 200,
  timezone: 'Europe/Prague',
}

describe('shared TODAY explorer range state', () => {
  it.each([
    ['2026-03-29', 23],
    ['2026-08-16', 24],
    ['2026-10-25', 25],
  ])('maps %s over its true %i-hour civil timeline', (date, hours) => {
    const timeline = createCivilDayTimeline(prague, date)
    const instant = new Date(timeline.start.getTime() + (hours * 3600 * 1000) / 2)

    expect(getCivilTimelineRangeState(timeline, instant)).toEqual({
      min: 0,
      max: hours * 3600 - 1,
      value: (hours * 3600) / 2,
    })
  })

  it('gives repeated autumn wall times distinct slider values', () => {
    const timeline = createCivilDayTimeline(prague, '2026-10-25')
    const first = DateTime.fromISO('2026-10-25T02:30:00+02:00', { setZone: true }).toJSDate()
    const second = DateTime.fromISO('2026-10-25T02:30:00+01:00', { setZone: true }).toJSDate()

    expect(getCivilTimelineRangeState(timeline, first).value).toBe(2.5 * 3600)
    expect(getCivilTimelineRangeState(timeline, second).value).toBe(3.5 * 3600)
  })
})

describe('YEAR selected-date mapping', () => {
  const leapDates = Array.from({ length: 366 }, (_, index) => DateTime.fromISO('2028-01-01').plus({ days: index }).toISODate()!)

  it('maps leap day by ISO local calendar date', () => {
    expect(yearDateIndex(leapDates, '2028-02-29')).toBe(59)
    expect(yearDateAtIndex(leapDates, 59)).toBe('2028-02-29')
    expect(yearDateAtIndex(leapDates, 365)).toBe('2028-12-31')
  })

  it('falls back safely when a selected date is outside the loaded year', () => {
    expect(yearDateIndex(leapDates, '2027-12-31')).toBe(0)
    expect(yearDateAtIndex(leapDates, 999)).toBe('2028-12-31')
  })
})

describe('explicit inspect-day transitions', () => {
  it.each(['YEAR', 'COMPARE'])('%s uses exact solar noon and enters TODAY inspect mode', () => {
    const date = '2026-08-16'
    const solarNoon = new Date('2026-08-16T11:03:17.250Z')

    expect(createInspectDayTransition(prague, date, solarNoon)).toEqual({
      view: 'today',
      timeMode: 'inspect',
      selectedDate: date,
      inspectedInstant: solarNoon,
    })
  })

  it('uses the physical midpoint of a 23-hour civil day when culmination is unavailable', () => {
    const date = '2026-03-29'
    const timeline = createCivilDayTimeline(prague, date)
    const expected = new Date((timeline.start.getTime() + timeline.end.getTime()) / 2)

    expect(inspectionInstantForDay(timeline, null)).toEqual(expected)
    expect(createInspectDayTransition(prague, date, null).inspectedInstant).toEqual(expected)
    expect(DateTime.fromJSDate(expected, { zone: prague.timezone }).toFormat('HH:mm')).toBe('12:30')
  })

  it('rejects an out-of-day culmination and uses the deterministic midpoint', () => {
    const timeline = createCivilDayTimeline(prague, '2026-10-25')
    expect(inspectionInstantForDay(timeline, new Date('2026-10-26T12:00:00Z'))).toEqual(
      new Date((timeline.start.getTime() + timeline.end.getTime()) / 2),
    )
  })
})
