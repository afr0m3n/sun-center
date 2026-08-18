import { DateTime } from 'luxon'
import { describe, expect, it } from 'vitest'
import { createCivilDayTimeline } from '../astronomy/civilTimeline'
import type { Location } from '../astronomy/types'
import { chartViewWidth, civilInstantFromPlotX, yearIndexFromPlotX } from './useCompactChartLayout'

const prague: Location = { id: 'prague', name: 'Prague', latitude: 50, longitude: 14, elevationMeters: 0, timezone: 'Europe/Prague' }

describe('chartViewWidth', () => {
  it('tracks available mobile width while remaining within readable SVG bounds', () => {
    expect(chartViewWidth(320)).toBe(400)
    expect(chartViewWidth(375)).toBe(400)
    expect(chartViewWidth(620)).toBe(560)
    expect(chartViewWidth(1060)).toBe(1000)
    expect(chartViewWidth(1600)).toBe(1000)
  })
})

describe('interactive chart coordinate mapping', () => {
  it.each([
    ['2026-03-29', 23],
    ['2026-10-25', 25],
  ])('maps plot edges and midpoint over the real %i-hour civil day', (date, hours) => {
    const timeline = createCivilDayTimeline(prague, date)
    expect(civilInstantFromPlotX(timeline, -10, 50, 900)).toEqual(timeline.start)
    expect(civilInstantFromPlotX(timeline, 950, 50, 900).getTime()).toBe(timeline.end.getTime() - 1)
    const midpoint = civilInstantFromPlotX(timeline, 500, 50, 900)
    expect(midpoint.getTime()).toBe(timeline.start.getTime() + hours * 1_800_000)
    expect(DateTime.fromJSDate(midpoint, { zone: prague.timezone }).toISODate()).toBe(date)
  })

  it('maps first, midpoint, and last annual positions including leap-year endpoint', () => {
    expect(yearIndexFromPlotX(0, 50, 900, 366)).toBe(0)
    expect(yearIndexFromPlotX(500, 50, 900, 366)).toBe(183)
    expect(yearIndexFromPlotX(1000, 50, 900, 366)).toBe(365)
  })
})
