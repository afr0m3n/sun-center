import { DateTime } from 'luxon'
import type { Location } from '../astronomy/types'

export const DEFAULT_LOCATION: Location = Object.freeze({
  id: 'loc_default_usti',
  name: 'Ústí nad Labem',
  latitude: 50.6724,
  longitude: 14.0706,
  timezone: 'Europe/Prague',
  elevationMeters: null,
})

let fallbackIdSequence = 0

export function generateLocationId(
  randomUUID: (() => string) | null | undefined = globalThis.crypto?.randomUUID?.bind(globalThis.crypto),
): string {
  const uuid = randomUUID?.()
  if (uuid) return `loc_${uuid}`

  fallbackIdSequence += 1
  return `loc_${Date.now().toString(36)}_${fallbackIdSequence.toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

export interface LocationValidationErrors {
  id?: string
  name?: string
  latitude?: string
  longitude?: string
  timezone?: string
  elevation?: string
}

export interface InvalidLocation {
  errors: LocationValidationErrors
}

export function isValidTimezone(timezone: string): boolean {
  const candidate = timezone.trim()
  if (!candidate || !DateTime.now().setZone(candidate).isValid) return false
  try {
    new Intl.DateTimeFormat('en', { timeZone: candidate }).format()
    return true
  } catch {
    return false
  }
}

export function validateLocation(value: unknown): Location | InvalidLocation {
  const record = typeof value === 'object' && value !== null ? value as Record<string, unknown> : {}
  const id = typeof record.id === 'string' ? record.id.trim() : ''
  const name = typeof record.name === 'string' ? record.name.trim() : ''
  const timezone = typeof record.timezone === 'string' ? record.timezone.trim() : ''
  const latitude = record.latitude
  const longitude = record.longitude
  const elevationMeters = record.elevationMeters
  const errors: LocationValidationErrors = {}

  if (!id) errors.id = 'Location ID is required.'
  if (!name) errors.name = 'Name is required.'
  if (typeof latitude !== 'number' || !Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    errors.latitude = 'Latitude must be a number from −90 to 90.'
  }
  if (typeof longitude !== 'number' || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    errors.longitude = 'Longitude must be a number from −180 to 180.'
  }
  if (!isValidTimezone(timezone)) errors.timezone = 'Enter a valid IANA timezone.'
  if (elevationMeters !== null && (typeof elevationMeters !== 'number' || !Number.isFinite(elevationMeters) || elevationMeters < -500 || elevationMeters > 100_000)) {
    errors.elevation = 'Elevation must be from −500 to 100,000 meters or left empty.'
  }

  if (Object.keys(errors).length > 0) return { errors }
  return { id, name, latitude: latitude as number, longitude: longitude as number, timezone, elevationMeters: elevationMeters as number | null }
}

export function isLocation(value: unknown): value is Location {
  return !('errors' in validateLocation(value))
}