import { describe, expect, it } from 'vitest'
import { chartViewWidth } from './useCompactChartLayout'

describe('chartViewWidth', () => {
  it('tracks available mobile width while remaining within readable SVG bounds', () => {
    expect(chartViewWidth(320)).toBe(400)
    expect(chartViewWidth(375)).toBe(400)
    expect(chartViewWidth(620)).toBe(560)
    expect(chartViewWidth(1060)).toBe(1000)
    expect(chartViewWidth(1600)).toBe(1000)
  })
})
