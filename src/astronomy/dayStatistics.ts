import { getSunPosition } from './sunPosition'
import type { Location, SunPosition } from './types'

export function getSolarMaximum(
  location: Location,
  solarNoon: Date | null,
): SunPosition | null {
  return solarNoon ? getSunPosition(location, solarNoon) : null
}
