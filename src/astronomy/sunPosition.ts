import { Body, Equator, Horizon, Observer } from 'astronomy-engine'
import type { Location, SunPosition } from './types'

const degreesToRadians = (degrees: number) => (degrees * Math.PI) / 180

/**
 * Returns apparent topocentric solar coordinates. Azimuth is a compass bearing:
 * 0° north, 90° east, 180° south, and 270° west.
 */
export function getSunPosition(location: Location, instant: Date): SunPosition {
  const observer = new Observer(
    location.latitude,
    location.longitude,
    location.elevationMeters,
  )
  const equatorial = Equator(Body.Sun, instant, observer, true, true)
  const horizontal = Horizon(
    instant,
    observer,
    equatorial.ra,
    equatorial.dec,
    'normal',
  )
  const isAboveHorizon = horizontal.altitude > 0

  return {
    timestamp: new Date(instant.getTime()),
    altitudeDeg: horizontal.altitude,
    azimuthDeg: horizontal.azimuth,
    shadowLengthFactor: isAboveHorizon
      ? 1 / Math.tan(degreesToRadians(horizontal.altitude))
      : null,
    shadowAzimuthDeg: isAboveHorizon ? (horizontal.azimuth + 180) % 360 : null,
  }
}
