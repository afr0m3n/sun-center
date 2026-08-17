import { createContext, useContext } from 'react'
import type { Location } from '../astronomy/types'

export type LocationInput = Omit<Location, 'id'>

export interface LocationsContextValue {
  activeLocation: Location
  locations: Location[]
  selectLocation: (id: string) => void
  addLocation: (location: LocationInput) => void
  updateLocation: (id: string, location: LocationInput) => void
  deleteLocation: (id: string) => void
}

export const LocationsContext = createContext<LocationsContextValue | null>(null)

export function useLocations(): LocationsContextValue {
  const context = useContext(LocationsContext)
  if (!context) throw new Error('useLocations must be used within LocationsProvider')
  return context
}