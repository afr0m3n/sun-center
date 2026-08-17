import { describe, expect, it } from 'vitest'
import { DEFAULT_LOCATION, generateLocationId, validateLocation } from './location'
import type { Location } from '../astronomy/types'

const validLocation: Location = {
  id: 'loc_tenerife_7f2c',
  name: 'Tenerife',
  latitude: 28.2916,
  longitude: -16.6291,
  timezone: 'Atlantic/Canary',
  elevationMeters: null,
}

describe('location validation', () => {
  it('accepts a complete location and trims its name', () => {
    expect(validateLocation({ ...validLocation, name: '  Tenerife  ' })).toEqual(validLocation)
  })

  it.each([
    [{ ...validLocation, latitude: -90.01 }, 'latitude'],
    [{ ...validLocation, latitude: Number.NaN }, 'latitude'],
    [{ ...validLocation, longitude: 180.01 }, 'longitude'],
    [{ ...validLocation, longitude: Number.POSITIVE_INFINITY }, 'longitude'],
    [{ ...validLocation, timezone: 'UTC+1' }, 'timezone'],
    [{ ...validLocation, elevationMeters: Number.NaN }, 'elevation'],
    [{ ...validLocation, elevationMeters: -501 }, 'elevation'],
    [{ ...validLocation, elevationMeters: 100_001 }, 'elevation'],
  ])('rejects invalid numeric ranges and timezone: %s', (candidate, errorKey) => {
    const result = validateLocation(candidate)
    expect(result).toEqual(expect.objectContaining({ errors: expect.objectContaining({ [errorKey]: expect.any(String) }) }))
  })

  it('allows null elevation and finite elevation', () => {
    expect(validateLocation(validLocation)).toEqual(validLocation)
    expect(validateLocation({ ...validLocation, elevationMeters: 3712 })).toEqual({ ...validLocation, elevationMeters: 3712 })
  })

  it('defines the prior station only as the explicit fallback seed', () => {
    expect(DEFAULT_LOCATION).toEqual({
      id: expect.any(String),
      name: 'Ústí nad Labem',
      latitude: 50.6724,
      longitude: 14.0706,
      timezone: 'Europe/Prague',
      elevationMeters: null,
    })
  })
})

describe('custom location IDs', () => {
  it('uses randomUUID when it is available', () => {
    expect(generateLocationId(() => '8f78d0e5-85c6-49c8-91f6-f6e840ad2f23')).toBe('loc_8f78d0e5-85c6-49c8-91f6-f6e840ad2f23')
  })

  it('generates distinct opaque IDs when randomUUID is unavailable', () => {
    const first = generateLocationId(null)
    const second = generateLocationId(null)

    expect(first).toMatch(/^loc_[a-z0-9_-]+$/)
    expect(second).toMatch(/^loc_[a-z0-9_-]+$/)
    expect(first).not.toBe(second)
  })
})
