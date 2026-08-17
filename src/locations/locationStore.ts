import type { Location } from '../astronomy/types'
import { DEFAULT_LOCATION, validateLocation } from './location'

export const LOCATION_STORAGE_KEY = 'sun-center.location-store'

export interface LocationStoreState {
  version: 1
  selectedLocationId: string
  locations: Location[]
}

export interface StorageAdapter {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export const createDefaultLocationStore = (): LocationStoreState => ({
  version: 1,
  selectedLocationId: DEFAULT_LOCATION.id,
  locations: [DEFAULT_LOCATION],
})

function normalizeStore(value: unknown): LocationStoreState {
  if (typeof value !== 'object' || value === null) return createDefaultLocationStore()
  const record = value as Record<string, unknown>
  if (record.version !== 1 || !Array.isArray(record.locations)) return createDefaultLocationStore()

  const ids = new Set<string>()
  const locations: Location[] = []
  for (const candidate of record.locations) {
    const result = validateLocation(candidate)
    if ('errors' in result || ids.has(result.id)) continue
    ids.add(result.id)
    locations.push(result)
  }
  if (locations.length === 0) return createDefaultLocationStore()

  const requestedId = typeof record.selectedLocationId === 'string' ? record.selectedLocationId : ''
  return {
    version: 1,
    selectedLocationId: ids.has(requestedId) ? requestedId : locations[0].id,
    locations,
  }
}

export function loadLocationStore(storage?: StorageAdapter): LocationStoreState {
  if (!storage) return createDefaultLocationStore()
  try {
    const stored = storage.getItem(LOCATION_STORAGE_KEY)
    return stored === null ? createDefaultLocationStore() : normalizeStore(JSON.parse(stored))
  } catch {
    return createDefaultLocationStore()
  }
}

export function saveLocationStore(storage: StorageAdapter | undefined, state: LocationStoreState): void {
  if (!storage) return
  try {
    storage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(normalizeStore(state)))
  } catch {
    // Persistence can be unavailable or full; the in-memory store remains usable.
  }
}

export function selectLocation(state: LocationStoreState, id: string): LocationStoreState {
  return state.locations.some((location) => location.id === id) ? { ...state, selectedLocationId: id } : state
}

export function addLocation(state: LocationStoreState, location: Location): LocationStoreState {
  const result = validateLocation(location)
  if ('errors' in result || state.locations.some((item) => item.id === result.id)) return state
  return { ...state, locations: [...state.locations, result] }
}

export function updateLocation(state: LocationStoreState, id: string, location: Location): LocationStoreState {
  const index = state.locations.findIndex((item) => item.id === id)
  if (index < 0) return state
  const result = validateLocation({ ...location, id })
  if ('errors' in result) return state
  const locations = [...state.locations]
  locations[index] = result
  return { ...state, locations }
}

export function deleteLocation(state: LocationStoreState, id: string): LocationStoreState {
  if (!state.locations.some((location) => location.id === id)) return state
  const locations = state.locations.filter((location) => location.id !== id)
  if (locations.length === 0) return createDefaultLocationStore()
  return {
    ...state,
    locations,
    selectedLocationId: state.selectedLocationId === id ? locations[0].id : state.selectedLocationId,
  }
}
