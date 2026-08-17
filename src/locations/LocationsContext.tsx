import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  addLocation as addToStore,
  deleteLocation as deleteFromStore,
  loadLocationStore,
  saveLocationStore,
  selectLocation as selectInStore,
  updateLocation as updateInStore,
  type LocationStoreState,
  type StorageAdapter,
} from './locationStore'
import { generateLocationId } from './location'
import { LocationsContext, type LocationInput } from './useLocations'

const browserStorage = (): StorageAdapter | undefined => {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage
  } catch {
    return undefined
  }
}
export function LocationsProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<LocationStoreState>(() => loadLocationStore(browserStorage()))

  useEffect(() => saveLocationStore(browserStorage(), store), [store])

  const selectLocation = useCallback((id: string) => setStore((current) => selectInStore(current, id)), [])
  const addLocation = useCallback((location: LocationInput) => {
    const id = generateLocationId()
    setStore((current) => selectInStore(addToStore(current, { ...location, id }), id))
  }, [])
  const updateLocation = useCallback((id: string, location: LocationInput) => {
    setStore((current) => updateInStore(current, id, { ...location, id }))
  }, [])
  const deleteLocation = useCallback((id: string) => setStore((current) => deleteFromStore(current, id)), [])
  const activeLocation = store.locations.find((location) => location.id === store.selectedLocationId) ?? store.locations[0]

  const value = useMemo(() => ({
    activeLocation,
    locations: store.locations,
    selectLocation,
    addLocation,
    updateLocation,
    deleteLocation,
  }), [activeLocation, store.locations, selectLocation, addLocation, updateLocation, deleteLocation])

  return <LocationsContext value={value}>{children}</LocationsContext>
}
