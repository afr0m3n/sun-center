import { describe, expect, it } from 'vitest'
import type { Location } from '../astronomy/types'
import { DEFAULT_LOCATION } from './location'
import {
  LOCATION_STORAGE_KEY,
  addLocation,
  deleteLocation,
  loadLocationStore,
  saveLocationStore,
  selectLocation,
  updateLocation,
  type LocationStoreState,
  type StorageAdapter,
} from './locationStore'

const tenerife: Location = {
  id: 'loc_tenerife_7f2c',
  name: 'Tenerife',
  latitude: 28.2916,
  longitude: -16.6291,
  timezone: 'Atlantic/Canary',
  elevationMeters: null,
}

class MemoryStorage implements StorageAdapter {
  values = new Map<string, string>()
  getItem(key: string) { return this.values.get(key) ?? null }
  setItem(key: string, value: string) { this.values.set(key, value) }
}

const stateWithBoth = (): LocationStoreState => ({
  version: 1,
  selectedLocationId: tenerife.id,
  locations: [DEFAULT_LOCATION, tenerife],
})

describe('location persistence', () => {
  it('initializes the default when storage is empty', () => {
    expect(loadLocationStore(new MemoryStorage())).toEqual({ version: 1, selectedLocationId: DEFAULT_LOCATION.id, locations: [DEFAULT_LOCATION] })
  })

  it('round-trips locations and selected ID', () => {
    const storage = new MemoryStorage()
    const expected = stateWithBoth()
    saveLocationStore(storage, expected)
    expect(loadLocationStore(storage)).toEqual(expected)
    expect(JSON.parse(storage.getItem(LOCATION_STORAGE_KEY)!)).toEqual(expected)
  })

  it.each(['{bad json', JSON.stringify({ version: 2, selectedLocationId: 'x', locations: [] }), JSON.stringify({ version: 1, locations: 'nope' })])(
    'recovers from malformed or unsupported storage: %s',
    (stored) => {
      const storage = new MemoryStorage()
      storage.setItem(LOCATION_STORAGE_KEY, stored)
      expect(loadLocationStore(storage).locations).toEqual([DEFAULT_LOCATION])
    },
  )

  it('filters invalid and duplicate records while retaining valid locations', () => {
    const storage = new MemoryStorage()
    storage.setItem(LOCATION_STORAGE_KEY, JSON.stringify({
      version: 1,
      selectedLocationId: tenerife.id,
      locations: [
        { ...tenerife, latitude: 999 },
        tenerife,
        { ...tenerife, name: 'duplicate ID' },
        { ...DEFAULT_LOCATION, timezone: 'not/a-zone' },
      ],
    }))
    expect(loadLocationStore(storage)).toEqual({ version: 1, selectedLocationId: tenerife.id, locations: [tenerife] })
  })

  it('repairs an invalid selected ID deterministically', () => {
    const storage = new MemoryStorage()
    storage.setItem(LOCATION_STORAGE_KEY, JSON.stringify({ ...stateWithBoth(), selectedLocationId: 'missing' }))
    expect(loadLocationStore(storage).selectedLocationId).toBe(DEFAULT_LOCATION.id)
  })

  it('restores the default when every stored location is invalid', () => {
    const storage = new MemoryStorage()
    storage.setItem(LOCATION_STORAGE_KEY, JSON.stringify({ version: 1, selectedLocationId: 'bad', locations: [{ ...tenerife, longitude: Number.NaN }] }))
    expect(loadLocationStore(storage)).toEqual({ version: 1, selectedLocationId: DEFAULT_LOCATION.id, locations: [DEFAULT_LOCATION] })
  })
})

describe('location store transitions', () => {
  it('adds and selects a valid location', () => {
    const initial = loadLocationStore(new MemoryStorage())
    expect(selectLocation(addLocation(initial, tenerife), tenerife.id).selectedLocationId).toBe(tenerife.id)
  })

  it('edits fields while retaining identity and selection', () => {
    const updated = updateLocation(stateWithBoth(), tenerife.id, { ...tenerife, id: 'attempted-replacement', name: '  Teide  ', elevationMeters: 2200 })
    expect(updated.selectedLocationId).toBe(tenerife.id)
    expect(updated.locations[1]).toEqual({ ...tenerife, id: tenerife.id, name: 'Teide', elevationMeters: 2200 })
  })

  it('selects the first remaining location when deleting the active one', () => {
    const result = deleteLocation(stateWithBoth(), tenerife.id)
    expect(result.locations).toEqual([DEFAULT_LOCATION])
    expect(result.selectedLocationId).toBe(DEFAULT_LOCATION.id)
  })

  it('keeps selection when deleting an inactive location', () => {
    const result = deleteLocation(stateWithBoth(), DEFAULT_LOCATION.id)
    expect(result.locations).toEqual([tenerife])
    expect(result.selectedLocationId).toBe(tenerife.id)
  })

  it('restores the default rather than leaving zero locations', () => {
    const onlyCustom = { version: 1 as const, selectedLocationId: tenerife.id, locations: [tenerife] }
    expect(deleteLocation(onlyCustom, tenerife.id)).toEqual({ version: 1, selectedLocationId: DEFAULT_LOCATION.id, locations: [DEFAULT_LOCATION] })
  })
})
